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

    await supabase
      .from("firma_envelopes")
      .update({ status: "sent" })
      .eq("id", envelope_id);

    for (const signer of envelope.firma_signers) {
      const signingUrl = `${appUrl}/firma/firmar/${signer.token}`;
      await resend.emails.send({
        from: "Llave Propia <notificaciones@proppi.cl>",
        to: [signer.email],
        subject: `${envelope.sender_name} solicita tu firma: "${envelope.title}"`,
        html: buildSignerEmail(signer.name, envelope.title, envelope.sender_name, signingUrl, envelope.firma_signers),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

function buildSignerEmail(signerName: string, docTitle: string, senderName: string, signingUrl: string, allSigners: any[]) {
  const otherSigners = allSigners.filter((s) => s.name !== signerName);
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
        <p style="color:#6b7280;font-size:14px;margin:0 0 8px;">Hola, <strong style="color:#111827;">${signerName}</strong></p>
        <h1 style="color:#111827;font-size:22px;margin:0 0 16px;line-height:1.3;">Tienes un documento pendiente de firma</h1>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          <strong>${senderName}</strong> te solicita que firmes el documento:
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
          <p style="margin:0;font-weight:700;color:#111827;font-size:15px;">${docTitle}</p>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Solicitado por ${senderName}</p>
        </div>
        ${otherSigners.length > 0 ? `
        <p style="color:#374151;font-size:14px;margin:0 0 8px;">Tambien firmaran:</p>
        <ul style="margin:0 0 28px;padding-left:20px;color:#6b7280;font-size:14px;">
          ${otherSigners.map(s => `<li>${s.name} &lt;${s.email}&gt;</li>`).join('')}
        </ul>` : ''}
        <div style="text-align:center;margin:32px 0;">
          <a href="${signingUrl}" style="display:inline-block;background:#1B3A6B;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
            Firmar documento
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;">
          O copia este enlace en tu navegador:<br/>
          <a href="${signingUrl}" style="color:#3b82f6;word-break:break-all;">${signingUrl}</a>
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
        <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
          Este correo fue enviado por Llave Propia. La firma electronica de este documento tiene validez legal.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
