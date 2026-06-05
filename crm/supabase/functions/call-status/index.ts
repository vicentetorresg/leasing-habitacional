import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Twilio Status Callback endpoint
// Now tracks the LEAD's leg (lead is called first).
// Statuses: initiated, ringing, in-progress (lead answered → agent being dialed), completed, busy, no-answer, failed

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get("lead_id");
    const userId = url.searchParams.get("user_id");
    const attemptId = url.searchParams.get("attempt_id");
    const secret = url.searchParams.get("secret") || "";

    // Validate webhook secret
    const expectedSecret = Deno.env.get("TWILIO_WEBHOOK_SECRET") || "";
    if (expectedSecret && secret !== expectedSecret) {
      console.error("Invalid webhook secret on call-status");
      return new Response("Forbidden", { status: 403 });
    }

    const formText = await req.text();
    const params = new URLSearchParams(formText);

    const callSid = params.get("CallSid") || "";
    const callStatus = params.get("CallStatus") || "";
    const callDuration = params.get("CallDuration");
    const timestamp = new Date().toISOString();

    console.log(`call-status: sid=${callSid} status=${callStatus} lead=${leadId} attempt=${attemptId} duration=${callDuration}`);

    if (!leadId) {
      return new Response("OK", { status: 200 });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let leadStatus: string | null = null;
    let attemptOutcome: string | null = null;

    switch (callStatus) {
      case "initiated":
      case "queued":
        // Call to lead just started
        break;

      case "ringing":
        // Lead's phone is ringing
        break;

      case "in-progress":
        // Lead answered! TwiML is now dialing the agent.
        attemptOutcome = "in-progress";
        if (attemptId) {
          await serviceClient
            .from("call_attempts")
            .update({ outcome: "in-progress", provider_call_sid_lead: callSid })
            .eq("id", attemptId);
        }
        break;

      case "completed": {
        const duration = parseInt(callDuration || "0", 10);
        // If duration > 10s, likely a real conversation happened
        if (duration > 10) {
          leadStatus = "answered";
          attemptOutcome = "answered";
        } else {
          // Very short — lead answered but agent didn't pick up, or brief interaction
          leadStatus = "no_answer";
          attemptOutcome = "no_answer";
        }

        if (attemptId) {
          await serviceClient
            .from("call_attempts")
            .update({
              outcome: attemptOutcome,
              duration_seconds: duration,
              provider_call_sid_lead: callSid,
            })
            .eq("id", attemptId);
        }
        break;
      }

      case "busy":
        leadStatus = "busy";
        attemptOutcome = "busy";
        if (attemptId) {
          await serviceClient
            .from("call_attempts")
            .update({ outcome: "busy", provider_call_sid_lead: callSid })
            .eq("id", attemptId);
        }
        break;

      case "no-answer":
        leadStatus = "no_answer";
        attemptOutcome = "no_answer";
        if (attemptId) {
          await serviceClient
            .from("call_attempts")
            .update({ outcome: "no_answer", provider_call_sid_lead: callSid })
            .eq("id", attemptId);
        }
        break;

      case "canceled":
        leadStatus = "no_answer";
        attemptOutcome = "canceled";
        if (attemptId) {
          await serviceClient
            .from("call_attempts")
            .update({ outcome: "canceled", provider_call_sid_lead: callSid })
            .eq("id", attemptId);
        }
        break;

      case "failed":
        leadStatus = "no_answer";
        attemptOutcome = "failed";
        if (attemptId) {
          await serviceClient
            .from("call_attempts")
            .update({
              outcome: "failed",
              provider_call_sid_lead: callSid,
              notes: `Twilio failed: ${params.get("ErrorCode") || "unknown"} - ${params.get("ErrorMessage") || ""}`,
            })
            .eq("id", attemptId);
        }
        break;
    }

    // Update lead status if we have a final determination
    if (leadStatus && leadId) {
      const { data: currentLead } = await serviceClient
        .from("leads")
        .select("status")
        .eq("id", leadId)
        .single();

      if (currentLead?.status === "calling") {
        await serviceClient
          .from("leads")
          .update({
            status: leadStatus,
            last_attempt_at: timestamp,
          })
          .eq("id", leadId);
        console.log(`Lead ${leadId} status updated to ${leadStatus}`);
      } else {
        console.log(`Lead ${leadId} status is ${currentLead?.status}, skipping auto-update`);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("call-status error:", error);
    return new Response("OK", { status: 200 });
  }
});
