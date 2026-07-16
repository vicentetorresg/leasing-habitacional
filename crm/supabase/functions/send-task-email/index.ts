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
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { to, user_id, subject, html } = await req.json();

    let recipientEmail = to;

    // If user_id provided, look up email server-side
    if (!recipientEmail && user_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      recipientEmail = userData?.user?.email;
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'No recipient email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Demo mode: redirect emails to fixed demo recipients
    const DEMO_EMAIL = 'demo@demo.cl';
    const DEMO_RECIPIENTS: string[] = [];
    const isDemo = recipientEmail === DEMO_EMAIL;
    const finalRecipients = isDemo ? DEMO_RECIPIENTS : [recipientEmail];

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Llave Propia CRM <notificaciones@proppi.cl>',
        to: finalRecipients,
        subject: isDemo ? `[DEMO] ${subject}` : subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
