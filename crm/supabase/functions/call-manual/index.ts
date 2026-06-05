import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    const TWILIO_WEBHOOK_SECRET = Deno.env.get("TWILIO_WEBHOOK_SECRET");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get ejecutiva's personal phone
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("phone_e164")
      .eq("user_id", user.id)
      .single();

    const agentPhone = profile?.phone_e164;
    if (!agentPhone) {
      return new Response(
        JSON.stringify({ error: "No tienes un número personal configurado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build TwiML callback URL - directly dials the target phone
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const twimlParams = new URLSearchParams({
      lead_phone: phone,
      twilio_number: TWILIO_PHONE_NUMBER,
      secret: TWILIO_WEBHOOK_SECRET || "",
    });
    const twimlUrl = `${supabaseUrl}/functions/v1/call-bridge-twiml?${twimlParams.toString()}`;

    // Call the ejecutiva's personal phone
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("To", agentPhone);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Url", twimlUrl);

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio error:", twilioData);
      return new Response(
        JSON.stringify({ error: "Error al iniciar llamada", details: twilioData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the manual call
    await serviceClient.from("manual_calls").insert({
      user_id: user.id,
      phone,
      twilio_call_sid: twilioData.sid,
      status: "initiated",
    });

    console.log("Manual call initiated:", twilioData.sid, "to:", phone);

    return new Response(
      JSON.stringify({
        success: true,
        call_sid: twilioData.sid,
        message: `Llamando a tu celular... Cuando contestes, se conectará con ${phone}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Manual call error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
