import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

serve(async (req) => {
  // ✅ Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ✅ Check Authorization header for logged-in user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing access token" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized user" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // ✅ Parse request body
    const { name, email, message } = await req.json();

    // ✅ Save message to Supabase table
    await supabase.from("contact_messages").insert([{ user_id: user.id, name, email, message }]);

    // ✅ Send email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const emailTo = Deno.env.get("EMAIL_TO");

    await resend.emails.send({
      from: "SmartGenie Contact Form <no-reply@resend.dev>", // change display name
      to: emailTo!,
      subject: `New contact message from ${name}`,
      html: `
        <h2>📩 New Contact Form Message</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
        <hr>
        <p>Sent via SmartGenie</p>
      `,
    });

    return new Response(JSON.stringify({ success: true, message: "Message sent successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
