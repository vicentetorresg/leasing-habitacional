import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();

    // ── Count-only mode: returns { counts: { status, count, with_email }[] } ──
    if (body.count_only) {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('status, email')
        .eq('is_demo', false)
        .neq('status', 'archived');

      if (error) throw error;

      const map: Record<string, { total: number; with_email: number }> = {};
      for (const lead of leads ?? []) {
        if (!map[lead.status]) map[lead.status] = { total: 0, with_email: 0 };
        map[lead.status].total++;
        if (lead.email) map[lead.status].with_email++;
      }

      const counts = Object.entries(map).map(([status, v]) => ({
        status,
        total: v.total,
        with_email: v.with_email,
      }));

      return new Response(JSON.stringify({ counts }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Send mode ─────────────────────────────────────────────────────────────
    const { subject, html, statuses, test_emails } = body;

    if (!subject || !html) {
      return new Response(JSON.stringify({ error: 'subject and html are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Test mode: send directly to provided addresses ──────────────────────
    if (Array.isArray(test_emails) && test_emails.length > 0) {
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      let sent = 0;
      const errors: string[] = [];
      for (const email of test_emails) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'Llave Propia <notificaciones@proppi.cl>', to: [email.trim()], subject: `[PRUEBA] ${subject}`, html }),
        });
        if (res.ok) { sent++; } else { const e = await res.json(); errors.push(`${email}: ${e.message}`); }
        await delay(400);
      }
      return new Response(JSON.stringify({ success: true, sent, total: test_emails.length, errors: errors.length > 0 ? errors : undefined }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Campaign mode: fetch leads from DB ───────────────────────────────────
    let query = supabase
      .from('leads')
      .select('id, name, email, status')
      .eq('is_demo', false)
      .not('email', 'is', null);

    if (Array.isArray(statuses) && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    const { data: leads, error } = await query;
    if (error) throw error;

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, total: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    let sent = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      if (!lead.email) continue;

      const firstName = lead.name.split(' ')[0];
      const personalizedHtml = html.replace(/\{\{nombre\}\}/g, firstName);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Llave Propia <notificaciones@proppi.cl>',
          to: [lead.email],
          subject,
          html: personalizedHtml,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        const errData = await res.json();
        console.error(`Failed ${lead.email}:`, errData);
        errors.push(`${lead.email}: ${errData.message || JSON.stringify(errData)}`);
      }

      await delay(600);
    }

    return new Response(JSON.stringify({
      success: true,
      sent,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
