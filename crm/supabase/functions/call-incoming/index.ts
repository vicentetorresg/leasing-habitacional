import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Handles INCOMING calls to the Twilio number.
 * When a client calls back, we look up who last called them
 * (from leads OR manual_calls) and connect to that ejecutiva.
 */

serve(async (req) => {
  try {
    const formText = await req.text();
    const params = new URLSearchParams(formText);

    const callerPhone = params.get("From") || "";
    const calledNumber = params.get("To") || "";
    const callSid = params.get("CallSid") || "";

    console.log(`call-incoming: from=${callerPhone} to=${calledNumber} sid=${callSid}`);

    if (!callerPhone) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-CL" voice="Polly.Mia">Lo sentimos, no pudimos identificar su número.</Say>
  <Hangup/>
</Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Try to find a lead by phone
    const { data: lead } = await serviceClient
      .from("leads")
      .select("id, name, phone")
      .eq("phone", callerPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let ejecutivaUserId: string | null = null;
    let callerName = callerPhone;

    if (lead) {
      callerName = lead.name;
      // Find last ejecutiva who called this lead
      const { data: lastAttempt } = await serviceClient
        .from("call_attempts")
        .select("user_id")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      ejecutivaUserId = lastAttempt?.user_id || null;
    }

    // 2. If no lead found, check manual_calls table
    if (!ejecutivaUserId) {
      const { data: manualCall } = await serviceClient
        .from("manual_calls")
        .select("user_id, phone")
        .eq("phone", callerPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (manualCall) {
        ejecutivaUserId = manualCall.user_id;
        callerName = callerPhone; // No name for manual calls
        console.log(`Found manual call record for ${callerPhone}, routing to user ${ejecutivaUserId}`);
      }
    }

    if (!ejecutivaUserId) {
      console.log(`No lead or manual call found for phone ${callerPhone}`);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-CL" voice="Polly.Mia">Gracias por llamar. En este momento no podemos atenderle. Un ejecutivo se comunicará con usted a la brevedad.</Say>
  <Hangup/>
</Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // 3. Get the ejecutiva's personal phone
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("phone_e164, full_name")
      .eq("user_id", ejecutivaUserId)
      .single();

    if (!profile?.phone_e164) {
      console.log(`Ejecutiva ${ejecutivaUserId} has no phone configured`);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-CL" voice="Polly.Mia">Gracias por llamar. Su ejecutiva no está disponible en este momento. Se comunicará con usted a la brevedad.</Say>
  <Hangup/>
</Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // 4. Insert incoming_calls records for ALL ejecutivas
    const { data: allEjecutivas } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "ejecutiva");

    const ejecutivaIds = allEjecutivas?.map(e => e.user_id) ?? [ejecutivaUserId];
    if (!ejecutivaIds.includes(ejecutivaUserId)) {
      ejecutivaIds.push(ejecutivaUserId);
    }

    const incomingRows = ejecutivaIds.map(uid => ({
      lead_id: lead?.id || null,
      lead_name: callerName,
      lead_phone: callerPhone,
      ejecutiva_user_id: uid,
      twilio_call_sid: callSid,
      status: "ringing",
    }));

    await serviceClient.from("incoming_calls").insert(incomingRows);
    console.log(`Inserted incoming_calls for ${ejecutivaIds.length} ejecutivas`);

    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || calledNumber;

    console.log(`Connecting incoming call from ${callerPhone} (${callerName}) to ejecutiva ${profile.full_name} at ${profile.phone_e164}`);

    // 5. Return TwiML to connect
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-CL" voice="Polly.Mia">Conectando con su ejecutiva, por favor espere.</Say>
  <Dial callerId="${TWILIO_PHONE_NUMBER}" answerOnBridge="true" timeout="25">
    <Number>${profile.phone_e164}</Number>
  </Dial>
  <Say language="es-CL" voice="Polly.Mia">Su ejecutiva no pudo contestar. Se comunicará con usted a la brevedad.</Say>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("call-incoming error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-CL" voice="Polly.Mia">Lo sentimos, ocurrió un error. Intente más tarde.</Say>
  <Hangup/>
</Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
});
