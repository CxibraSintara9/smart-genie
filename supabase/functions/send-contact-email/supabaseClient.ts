import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read from environment variables (set in CLI or dashboard)
export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
