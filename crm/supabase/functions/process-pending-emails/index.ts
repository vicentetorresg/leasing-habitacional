import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM = 'Llave Propia <notificaciones@llavepropia.cl>';

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
    // Fetch all pending emails, oldest first
    const { data: pendingEmails, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(90); // Leave some margin under 100/day limit

    if (error) throw error;

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No pending emails' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const item of pendingEmails) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [item.email_to],
          cc: item.cc || [],
          reply_to: item.reply_to || [],
          subject: item.subject,
          html: item.html,
        }),
      });

      if (res.ok) {
        sent++;
        await supabase
          .from('email_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString(), attempts: item.attempts + 1 })
          .eq('id', item.id);
        console.log(`Queued email sent to ${item.email_to}`);
      } else if (res.status === 429 || res.status === 403) {
        // Hit daily limit again — stop processing, leave rest for tomorrow
        console.log(`Hit Resend limit again after ${sent} sends. Stopping.`);
        await supabase
          .from('email_queue')
          .update({ attempts: item.attempts + 1, error_message: 'Rate limit hit again' })
          .eq('id', item.id);
        break;
      } else {
        const errData = await res.json();
        failed++;
        const newAttempts = item.attempts + 1;
        await supabase
          .from('email_queue')
          .update({
            attempts: newAttempts,
            error_message: JSON.stringify(errData),
            status: newAttempts >= 5 ? 'failed' : 'pending',
          })
          .eq('id', item.id);
        console.error(`Failed to send to ${item.email_to}:`, errData);
      }

      // Respect Resend rate limit: ~2 req/s
      await delay(600);
    }

    return new Response(JSON.stringify({ success: true, sent, failed, total: pendingEmails.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
