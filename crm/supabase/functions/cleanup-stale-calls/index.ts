import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Reverts leads stuck in "calling" status for more than 3 minutes.
// Also marks incoming_calls stuck in "ringing" for more than 1 minute as "missed".
// Runs via pg_cron every minute.

serve(async () => {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Clean up stale "calling" leads ---
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const { data: staleLeads, error } = await serviceClient
      .from("leads")
      .select("id, previous_status")
      .eq("status", "calling")
      .lt("last_attempt_at", threeMinAgo);

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    let cleanedLeads = 0;
    if (staleLeads && staleLeads.length > 0) {
      for (const lead of staleLeads) {
        const revertStatus = lead.previous_status || "new";
        await serviceClient
          .from("leads")
          .update({ status: revertStatus })
          .eq("id", lead.id);
        console.log(`Reverted lead ${lead.id} from calling → ${revertStatus}`);
      }
      cleanedLeads = staleLeads.length;
    }

    // --- Clean up stale "ringing" incoming_calls ---
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const { data: staleRinging, error: ringError } = await serviceClient
      .from("incoming_calls")
      .select("id")
      .eq("status", "ringing")
      .lt("created_at", oneMinAgo);

    if (ringError) {
      console.error("Ringing query error:", ringError);
    }

    let cleanedRinging = 0;
    if (staleRinging && staleRinging.length > 0) {
      const ids = staleRinging.map(r => r.id);
      await serviceClient
        .from("incoming_calls")
        .update({ status: "missed" })
        .in("id", ids);
      cleanedRinging = ids.length;
      console.log(`Marked ${cleanedRinging} stale ringing calls as missed`);
    }

    return new Response(JSON.stringify({ cleanedLeads, cleanedRinging }), { status: 200 });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
