import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let phone = raw.replace(/[\s\-\(\)]/g, "");
  // "9XXXXXXXX" (9 digits starting with 9) → "+569XXXXXXXX"
  if (/^9\d{8}$/.test(phone)) {
    phone = "+56" + phone;
  }
  // "569XXXXXXXX" without + → "+569XXXXXXXX"
  if (/^56\d{9}$/.test(phone)) {
    phone = "+" + phone;
  }
  // Ensure it starts with +
  if (!phone.startsWith("+") && phone.length > 0) {
    phone = "+" + phone;
  }
  return phone;
}

function parseSueldo(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const str = String(raw).replace(/[$._ ]/g, "").replace(/,/g, "");
  const nums = str.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const parsed = nums.map(Number).filter(n => n > 0);
  if (parsed.length === 0) return null;
  // Just take the first number found (don't average ranges)
  return parsed[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth via webhook secret
  const secret = req.headers.get("x-webhook-secret");
  const expected = Deno.env.get("MAKE_WEBHOOK_SECRET");
  if (!secret || secret !== expected) {
    console.log("[ingest-lead] 401 – invalid or missing x-webhook-secret");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("[ingest-lead] Incoming lead:", JSON.stringify(body));

    const source = body.source || "facebook";
    const externalId = body.external_id || body.lead_id || null;

    // Dedupe check
    if (externalId) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("source", source)
        .eq("external_id", externalId)
        .maybeSingle();

      if (existing) {
        console.log(`[ingest-lead] Deduped – lead already exists: ${existing.id}`);
        return new Response(
          JSON.stringify({ ok: true, deduped: true, lead_id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Round-robin 1:1 — S, C, S, C, ...
    // Usa una secuencia atómica en Postgres para evitar race conditions
    // cuando varios leads llegan simultáneamente desde Make.
    const SUSAN_ID = "77c9ed99-4976-44a8-b4e5-a2e9e49828b0";
    const CAMILA_ID = "cc526f22-fe9e-4d84-abdf-4456780e030c";

    const { data: rrData, error: rrError } = await supabase.rpc("next_round_robin_position");
    if (rrError) {
      console.error("[ingest-lead] Error obteniendo posición round-robin:", rrError.message);
    }
    const position = rrData ?? 0;
    const assignedTo = position === 0 ? SUSAN_ID : CAMILA_ID;
    console.log(`[ingest-lead] Round-robin posición ${position} → ${assignedTo === SUSAN_ID ? "Susan" : "Camila"}`);

    const lead = {
      name: body.name || body.full_name || "Sin nombre",
      phone: normalizePhone(body.phone || body.phone_number) || "",
      email: body.email || null,
      source,
      external_id: externalId,
      created_time: body.created_time || new Date().toISOString(),
      rut: body.rut || null,
      sueldo_liquido: parseSueldo(body.sueldo_liquido),
      sueldo_liquido_raw: body.sueldo_liquido ? String(body.sueldo_liquido) : null,
      en_dicom: body.en_dicom != null
        ? (typeof body.en_dicom === "string"
            ? body.en_dicom.toLowerCase().trim() === "si" || body.en_dicom.toLowerCase().trim() === "sí" || body.en_dicom.toLowerCase().trim() === "yes"
            : Boolean(body.en_dicom))
        : null,
      proyecto: body.proyecto || null,
      status: "new",
      assigned_to: assignedTo ?? SUSAN_ID,
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(lead)
      .select("id")
      .single();

    if (error) {
      console.error("[ingest-lead] Insert error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ingest-lead] Inserted new lead: ${data.id}`);
    return new Response(
      JSON.stringify({ ok: true, deduped: false, lead_id: data.id }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[ingest-lead] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
