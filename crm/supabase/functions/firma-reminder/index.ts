import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { envelope_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
    const appUrl = "https://www.llavepropia.cl/firma-electronica";

    const { data: envelope } = await supabase
      .from("firma_envelopes")
      .select("*, firma_signers(*)")
      .eq("id", envelope_id)
      .single();

    if (!envelope) throw new Error("Sobre no encontrado");

    const pendingSigners = envelope.firma_signers.filter((s: any) => !s.signed_at);

    if (pendingSigners.length === 0) {
      return new Response(JSON.stringify({ success: true, reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const signer of pendingSigners) {
      const signingUrl = `${appUrl}/firmar/${signer.token}`;
      await resend.emails.send({
        from: "Llave Propia <notificaciones@proppi.cl>",
        to: [signer.email],
        subject: `Recordatorio: Tienes un documento pendiente de firma`,
        html: buildReminderEmail(signer.name, envelope.title, envelope.sender_name, signingUrl),
      });
    }

    return new Response(JSON.stringify({ success: true, reminded: pendingSigners.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

function buildReminderEmail(signerName: string, docTitle: string, senderName: string, signingUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#1B3A6B,#2DB89E);padding:28px 40px;">
        <img src="https://www.llavepropia.cl/logo_llave_propia.jpeg" alt="Llave Propia" style="height:32px;"/>
        <span style="color:#ffffff;font-size:14px;margin-left:16px;opacity:0.8;">Firma Electronica</span>
      </td></tr>
      <tr><td style="padding:40px;">
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:16px 20px;margin-bottom:28px;text-align:center;">
          <p style="margin:0;color:#854d0e;font-weight:700;font-size:15px;">Tienes un documento pendiente de firma</p>
        </div>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Hola <strong>${signerName}</strong>, este es un recordatorio de que <strong>${senderName}</strong>
          aun espera tu firma en el documento:
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
          <p style="margin:0;font-weight:700;color:#111827;font-size:15px;">${docTitle}</p>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${signingUrl}" style="display:inline-block;background:#1B3A6B;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:8px;font-weight:700;font-size:16px;">
            Firmar ahora
          </a>
        </div>
      </td></tr>
      <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">Llave Propia Firma — Si ya firmaste, ignora este correo.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
