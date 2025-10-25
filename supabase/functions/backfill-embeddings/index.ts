import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const embeddingsUrl = Deno.env.get("EMBEDDINGS_URL");
const embeddingsApiKey = Deno.env.get("EMBEDDINGS_API_KEY");
const embeddingDim = 768;

async function fetchImageAsBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  const base64 = btoa(String.fromCharCode(...buf));
  // Try to infer content type; default to jpeg
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${base64}`;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function computeImageEmbedding(base64Image: string): Promise<number[] | null> {
  if (!embeddingsUrl || !embeddingsApiKey) return null;
  const isHF = embeddingsUrl.includes('huggingface.co');
  const body = isHF ? dataUrlToBytes(base64Image) : JSON.stringify({ image: base64Image });
  const headers: Record<string, string> = { 'Authorization': `Bearer ${embeddingsApiKey}` };
  headers['Content-Type'] = isHF ? 'application/octet-stream' : 'application/json';
  const resp = await fetch(embeddingsUrl, { method: 'POST', headers, body });
  if (!resp.ok) return null;
  const json = await resp.json();
  let raw: unknown = json;
  if (Array.isArray(raw) && Array.isArray((raw as any)[0])) raw = (raw as any)[0];
  const arr = Array.isArray(raw) ? raw : (json?.embedding ?? []);
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const nums = (arr as unknown[]).map(v => Number(v));
  if (nums.some(n => Number.isNaN(n))) return null;
  if (nums.length !== embeddingDim) {
    return nums.length > embeddingDim ? nums.slice(0, embeddingDim) : [...nums, ...new Array(embeddingDim - nums.length).fill(0)];
  }
  return nums;
}

async function backfillBatch(offset: number, limit: number) {
  const { data: rows, error } = await supabase
    .from('dishinfo')
    .select(`id, image_url`)
    .is('image_embedding', null)
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  if (!rows || rows.length === 0) return 0;

  let updated = 0;
  for (const row of rows) {
    try {
      if (!row.image_url) continue;
      const base64 = await fetchImageAsBase64(row.image_url);
      const embedding = await computeImageEmbedding(base64);
      if (!embedding) continue;
      const { error: upErr } = await supabase
        .from('dishinfo')
        .update({ image_embedding: embedding, embedding_version: 1 })
        .eq('id', row.id);
      if (upErr) throw upErr;
      updated++;
    } catch (e) {
      console.error('Backfill error for id', row.id, e);
    }
  }
  return updated;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { batchSize = 25, maxBatches = 100 } = await req.json().catch(() => ({}));
    let totalUpdated = 0;
    for (let b = 0; b < maxBatches; b++) {
      const updated = await backfillBatch(b * batchSize, batchSize);
      totalUpdated += updated;
      if (updated === 0) break;
    }
    return new Response(JSON.stringify({ success: true, updated: totalUpdated }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});


