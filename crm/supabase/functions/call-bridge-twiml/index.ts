import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// TwiML endpoint: when the LEAD answers, connect to the AGENT's phone.
// This is the reverse flow — lead is called first to save costs.

serve(async (req) => {
  const url = new URL(req.url);
  const agentPhone = url.searchParams.get("agent_phone");
  const twilioNumber = url.searchParams.get("twilio_number") || "";
  const secret = url.searchParams.get("secret") || "";

  // Validate webhook secret
  const expectedSecret = Deno.env.get("TWILIO_WEBHOOK_SECRET") || "";
  if (expectedSecret && secret !== expectedSecret) {
    console.error("Invalid webhook secret");
    return new Response("<Response><Say>Error de autenticación</Say></Response>", {
      status: 403,
      headers: { "Content-Type": "text/xml" },
    });
  }

  if (!agentPhone) {
    return new Response(
      "<Response><Say language='es-CL'>Error: sin número de agente</Say></Response>",
      { status: 400, headers: { "Content-Type": "text/xml" } }
    );
  }

  // TwiML: brief hold message for the lead, then dial the agent
  // answerOnBridge="true" so the lead hears ringing (not silence) while agent's phone rings
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-CL" voice="Polly.Mia">Un momento, lo estamos conectando con un ejecutivo.</Say>
  <Dial callerId="${twilioNumber}" answerOnBridge="true" timeout="30">
    <Number>${agentPhone}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
});
