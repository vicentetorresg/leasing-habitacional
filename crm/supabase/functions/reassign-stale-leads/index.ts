import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Leads en first_call asignados a Susan con más de 6 días de antigüedad
// se reasignan diariamente a Camila.
const SUSAN_ID = "77c9ed99-4976-44a8-b4e5-a2e9e49828b0";
const CAMILA_ID = "cc526f22-fe9e-4d84-abdf-4456780e030c";
const DAYS_THRESHOLD = 6;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_THRESHOLD);
  const cutoffIso = cutoff.toISOString();

  // Buscar leads que cumplan la condición
  const { data: leads, error: fetchError } = await supabase
    .from("leads")
    .select("id")
    .eq("status", "first_call")
    .eq("assigned_to", SUSAN_ID)
    .lt("created_at", cutoffIso);

  if (fetchError) {
    console.error("[reassign-stale-leads] Fetch error:", fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!leads || leads.length === 0) {
    console.log("[reassign-stale-leads] No leads to reassign.");
    return new Response(JSON.stringify({ ok: true, reassigned: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ids = leads.map((l) => l.id);

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      assigned_to: CAMILA_ID,
      transferred_from_susan: true,
      camila_notes_hidden_since: now,
    })
    .in("id", ids);

  if (updateError) {
    console.error("[reassign-stale-leads] Update error:", updateError.message);
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[reassign-stale-leads] Reassigned ${ids.length} leads from Susan to Camila.`);
  return new Response(JSON.stringify({ ok: true, reassigned: ids.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
