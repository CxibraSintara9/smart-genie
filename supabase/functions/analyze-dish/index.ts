import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optional embeddings config
const embeddingsUrl = Deno.env.get("EMBEDDINGS_URL");
const embeddingsApiKey = Deno.env.get("EMBEDDINGS_API_KEY");
const embeddingDim = 768; // Must match DB column definition

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple hash function that doesn't use canvas
function getImageHash(imageData: Uint8Array): string {
  // Simple hash based on image data
  let hash = '';
  const step = Math.max(1, Math.floor(imageData.length / 64));
  
  for (let i = 0; i < imageData.length && hash.length < 64; i += step) {
    const byte = imageData[i];
    hash += (byte > 128) ? '1' : '0';
  }
  
  // Pad to 64 characters if needed
  while (hash.length < 64) {
    hash += '0';
  }
  
  return hash.substring(0, 64);
}

// Hamming distance calculation
function hammingDistance(hash1: string, hash2: string): number {
  let dist = 0;
  const minLength = Math.min(hash1.length, hash2.length);
  for (let i = 0; i < minLength; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Compute image embedding via external provider (if configured). Supports Hugging Face Inference API.
async function computeImageEmbedding(base64Image: string): Promise<number[] | null> {
  if (!embeddingsUrl || !embeddingsApiKey) {
    return null;
  }
  try {
    const isHF = embeddingsUrl.includes('huggingface.co');
    const body = isHF ? dataUrlToBytes(base64Image) : JSON.stringify({ image: base64Image });
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${embeddingsApiKey}`,
    };
    if (!isHF) headers['Content-Type'] = 'application/json';
    if (isHF) headers['Content-Type'] = 'application/octet-stream';

    const resp = await fetch(embeddingsUrl, {
      method: 'POST',
      headers,
      body
    });
    if (!resp.ok) {
      console.error('Embeddings provider error status:', resp.status);
      return null;
    }
    const json = await resp.json();
    let raw: unknown = json;
    // HF feature-extraction returns an array (or array of arrays). Normalize.
    if (Array.isArray(raw) && Array.isArray((raw as any)[0])) {
      raw = (raw as any)[0];
    }
    const embArr = Array.isArray(raw) ? raw : (json?.embedding ?? []);
    if (!Array.isArray(embArr) || embArr.length === 0) {
      console.error('Invalid embedding response shape');
      return null;
    }
    const asNumbers = (embArr as unknown[]).map(v => Number(v));
    if (asNumbers.some((v) => Number.isNaN(v))) return null;
    if (embeddingDim && asNumbers.length !== embeddingDim) {
      // Trim or pad with zeros to match DB dimension
      if (asNumbers.length > embeddingDim) {
        return asNumbers.slice(0, embeddingDim);
      } else {
        return [...asNumbers, ...new Array(embeddingDim - asNumbers.length).fill(0)];
      }
    }
    return asNumbers;
  } catch (e) {
    console.error('Failed to compute embedding:', e);
    return null;
  }
}

// Main handler
Deno.serve(async (req) => {
  console.log(`Received ${req.method} request`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Handling POST request');
    
    const { imageData } = await req.json();
    console.log('Request body received, imageData length:', imageData ? imageData.length : 0);
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Try embeddings flow first (if configured)
    const embedding = await computeImageEmbedding(imageData);
    if (embedding && Array.isArray(embedding) && embedding.length > 0) {
      console.log('Embeddings available, querying vector similarity...');
      const { data: results, error: rpcError } = await supabase.rpc('match_dishes', {
        query_embedding: embedding,
        match_threshold: 0,
        match_count: 5,
      });
      if (rpcError) {
        console.error('Vector RPC error, falling back to hash:', rpcError);
      } else if (results && results.length > 0) {
        const vectorMatches = results.map((row: any) => ({
          id: row.id,
          name: row.name,
          image_url: row.image_url,
          calories_value: row.calories_value,
          protein_value: row.protein_value,
          fat_value: row.fat_value,
          carbs_value: row.carbs_value,
          ingredient: row.ingredient,
          store: row.store,
          description: row.description,
          confidence: Math.round((row.similarity ?? 0) * 100),
        }));

        return new Response(
          JSON.stringify({
            success: true,
            matches: vectorMatches,
            bestMatch: vectorMatches[0] || null,
            method: 'embeddings',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log('Embeddings unavailable or failed; using hash fallback.');
    // Convert base64 to Uint8Array for hash fallback
    const binaryString = atob(imageData.split(',')[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Image converted to bytes, length:', bytes.length);

    // Compute hash for uploaded image
    const uploadedHash = getImageHash(bytes);
    console.log('Generated hash for uploaded image:', uploadedHash);

    // Fetch all dishes with their hashes
    console.log('Fetching dishes from database for hash comparison...');
    const { data: dishes, error: fetchError } = await supabase
      .from("dishinfo")
      .select(`
        id,
        name,
        image_url,
        calories_value,
        protein_value,
        fat_value,
        carbs_value,
        ingredient,
        store,
        description,
        image_hash
      `);

    if (fetchError) {
      console.error('Database error:', fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!dishes || dishes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No dishes found in database' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matches: any[] = [];
    for (const dish of dishes) {
      if (!dish.image_hash) continue;
      const hashDistance = hammingDistance(uploadedHash, dish.image_hash);
      const hashScore = (64 - hashDistance) / 64;
      matches.push({ dish, score: hashScore, hashDistance });
    }

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No matching dish found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topMatches = matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(match => ({
        id: match.dish.id,
        name: match.dish.name,
        image_url: match.dish.image_url,
        calories_value: match.dish.calories_value,
        protein_value: match.dish.protein_value,
        fat_value: match.dish.fat_value,
        carbs_value: match.dish.carbs_value,
        ingredient: match.dish.ingredient,
        store: match.dish.store,
        description: match.dish.description,
        confidence: Math.round(match.score * 100),
        hashDistance: match.hashDistance,
      }));

    return new Response(
      JSON.stringify({ success: true, matches: topMatches, bestMatch: topMatches[0] || null, method: 'hash' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-dish function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});