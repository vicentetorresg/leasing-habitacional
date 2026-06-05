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

    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get ejecutiva's personal phone (needed for the bridge TwiML)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("phone_e164")
      .eq("user_id", user.id)
      .single();

    const agentPhone = profile?.phone_e164;
    if (!agentPhone) {
      return new Response(
        JSON.stringify({
          error: "No tienes un número personal configurado. Pide al admin que lo configure en Backoffice.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get lead phone
    const { data: lead } = await serviceClient
      .from("leads")
      .select("phone, name")
      .eq("id", lead_id)
      .single();

    if (!lead) {
      return new Response(
        JSON.stringify({ error: "Lead no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if lead is already being called by ANOTHER user (prevent simultaneous calls)
    const { data: currentLead } = await serviceClient
      .from("leads")
      .select("status")
      .eq("id", lead_id)
      .single();

    if (currentLead?.status === "calling") {
      const { data: lastAttempt } = await serviceClient
        .from("call_attempts")
        .select("user_id, created_at")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const isOwnCall = lastAttempt?.user_id === user.id;
      const attemptAge = lastAttempt ? Date.now() - new Date(lastAttempt.created_at).getTime() : Infinity;
      const isStale = attemptAge > 120_000;

      if (!isOwnCall && !isStale) {
        return new Response(
          JSON.stringify({ error: "Este lead ya está siendo llamado por otra ejecutiva. Intenta con otro lead." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Count existing attempts
    const { count } = await serviceClient
      .from("call_attempts")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead_id)
      .eq("user_id", user.id);

    const attemptNumber = (count ?? 0) + 1;

    // Create call_attempt record
    const { data: attempt, error: attemptError } = await serviceClient
      .from("call_attempts")
      .insert({
        lead_id,
        user_id: user.id,
        outcome: "initiated",
        attempt_number: attemptNumber,
        provider: "twilio",
      })
      .select("id")
      .single();

    if (attemptError || !attempt?.id) {
      console.error("Error creating call_attempt:", attemptError);
      return new Response(
        JSON.stringify({ error: "No se pudo registrar el intento de llamada. Intenta de nuevo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build TwiML callback URL — when LEAD answers, connect to AGENT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const twimlParams = new URLSearchParams({
      agent_phone: agentPhone,
      twilio_number: TWILIO_PHONE_NUMBER,
      secret: TWILIO_WEBHOOK_SECRET || "",
    });
    const twimlUrl = `${supabaseUrl}/functions/v1/call-bridge-twiml?${twimlParams.toString()}`;

    // Build status callback URL
    const statusParams = new URLSearchParams({
      lead_id,
      user_id: user.id,
      attempt_id: attempt.id,
      secret: TWILIO_WEBHOOK_SECRET || "",
    });
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status?${statusParams.toString()}`;

    // Step A: Call the LEAD's phone first (saves cost — if lead doesn't answer, no agent minute is billed)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("To", lead.phone);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Url", twimlUrl);
    formData.append("StatusCallback", statusCallbackUrl);
    formData.append("StatusCallbackEvent", "initiated ringing answered completed");
    formData.append("StatusCallbackMethod", "POST");
    formData.append("Timeout", "25");

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
      if (attempt?.id) {
        await serviceClient
          .from("call_attempts")
          .update({ outcome: "failed", notes: JSON.stringify(twilioData) })
          .eq("id", attempt.id);
      }
      return new Response(
        JSON.stringify({ error: "Error al iniciar llamada", details: twilioData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save call_sid (this is the lead's leg)
    if (attempt?.id) {
      await serviceClient
        .from("call_attempts")
        .update({ provider_call_sid_lead: twilioData.sid })
        .eq("id", attempt.id);
    }

    // Update lead status to calling
    await serviceClient
      .from("leads")
      .update({ status: "calling", last_attempt_at: new Date().toISOString() })
      .eq("id", lead_id);

    console.log("Call to LEAD initiated:", twilioData.sid, "attempt:", attempt?.id);

    return new Response(
      JSON.stringify({
        success: true,
        call_sid: twilioData.sid,
        attempt_id: attempt?.id,
        message: `Llamando a ${lead.name}... Si contesta, tu celular sonará para conectarte.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Call bridge error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
