// supabase/functions/delete-user/index.ts
import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // update this if you want to restrict origin
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers,
    });

  try {
    const { userId } = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { 
        status: 401,
        headers 
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), { 
        status: 400,
        headers 
      });
    }

    // Verify the user is authenticated and can only delete their own account
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), { 
        status: 401,
        headers 
      });
    }

    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized: Can only delete your own account" }), { 
        status: 403,
        headers 
      });
    }

    // Delete related data from all tables first
    const tablesToClean = [
      "health_profiles",
      "meal_logs", 
      "feedback_submissions",
      "user_roles"
    ];

    const cleanupErrors = [];
    
    for (const table of tablesToClean) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", userId);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          cleanupErrors.push(`${table}: ${error.message}`);
        }
      } catch (err) {
        console.error(`Exception deleting from ${table}:`, err);
        cleanupErrors.push(`${table}: ${err.message}`);
      }
    }

    // If there were cleanup errors, log them but continue with user deletion
    if (cleanupErrors.length > 0) {
      console.warn("Some data cleanup failed:", cleanupErrors);
    }

    // Delete the Auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ 
        error: `Failed to delete user: ${deleteError.message}`,
        cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined
      }), {
        status: 400,
        headers,
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "User and all associated data deleted successfully",
      cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined
    }), { headers });
    
  } catch (err: any) {
    console.error("Delete user error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown server error" }),
      { status: 500, headers }
    );
  }
});
