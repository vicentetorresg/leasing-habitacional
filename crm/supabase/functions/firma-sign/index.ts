import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, signature_data } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    const { data: signer, error: signerErr } = await supabase
      .from("firma_signers")
      .select("*, firma_envelopes(*)")
      .eq("token", token)
      .single();

    if (signerErr || !signer) {
      return new Response(JSON.stringify({ error: "Token invalido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
      });
    }

    if (signer.signed_at) {
      return new Response(JSON.stringify({ error: "Ya firmaste este documento" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const signature_hash = signer.token.substring(0, 13).toUpperCase();

    await supabase
      .from("firma_signers")
      .update({
        signature_data,
        signature_hash,
        signed_at: new Date().toISOString(),
        ip_address: req.headers.get("x-forwarded-for") || "",
      })
      .eq("id", signer.id);

    const envelope = signer.firma_envelopes;

    const { data: allSigners } = await supabase
      .from("firma_signers")
      .select("id, name, email, job_title, company, signed_at, signature_data, signature_hash")
      .eq("envelope_id", envelope.id);

    const updatedSigners = allSigners!.map(s =>
      s.id === signer.id
        ? { ...s, signed_at: new Date().toISOString(), signature_data, signature_hash }
        : s
    );

    const allSigned = updatedSigners.every(s => s.signed_at);

    const { data: fields } = await supabase
      .from("firma_fields")
      .select("*")
      .eq("envelope_id", envelope.id);

    const pdfResponse = await fetch(envelope.pdf_url);
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const envelopeShortId = envelope.id.replace(/-/g, "").substring(0, 32).toUpperCase();
    const formattedEnvelopeId = `${envelopeShortId.substring(0, 8)}-${envelopeShortId.substring(8, 12)}-${envelopeShortId.substring(12, 16)}-${envelopeShortId.substring(16, 20)}-${envelopeShortId.substring(20, 32)}`;

    for (const page of pages) {
      const { height } = page.getSize();
      page.drawText(`Llave Propia Firma ID: ${formattedEnvelopeId}`, {
        x: 28,
        y: height - 18,
        size: 7,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    for (const field of fields || []) {
      const fieldSigner = updatedSigners.find(s => s.id === field.signer_id);
      if (!fieldSigner?.signature_data || !fieldSigner?.signed_at) continue;

      const page = pages[field.page_index];
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();

      const fieldX = field.x_percent * pageWidth;
      const fieldW = field.width_percent * pageWidth;
      const fieldH = field.height_percent * pageHeight;
      const fieldY = pageHeight - (field.y_percent * pageHeight) - fieldH;

      page.drawRectangle({
        x: fieldX,
        y: fieldY,
        width: fieldW,
        height: fieldH,
        borderColor: rgb(0.11, 0.23, 0.42),
        borderWidth: 1.5,
        color: rgb(0.98, 0.98, 1),
      });

      const labelSize = Math.max(6, fieldH * 0.12);
      page.drawText("Firmado por:", {
        x: fieldX + 6,
        y: fieldY + fieldH - labelSize - 4,
        size: labelSize,
        font: helveticaBold,
        color: rgb(0.11, 0.23, 0.42),
      });

      try {
        const base64Data = fieldSigner.signature_data.split(",")[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const sigImage = await pdfDoc.embedPng(bytes);
        const imgAreaH = fieldH * 0.58;
        const imgAreaY = fieldY + fieldH * 0.2;
        const sigDims = sigImage.scale(1);
        const scale = Math.min((fieldW - 16) / sigDims.width, imgAreaH / sigDims.height);
        const imgW = sigDims.width * scale;
        const imgH = sigDims.height * scale;

        page.drawImage(sigImage, {
          x: fieldX + (fieldW - imgW) / 2,
          y: imgAreaY + (imgAreaH - imgH) / 2,
          width: imgW,
          height: imgH,
        });
      } catch (e) {
        console.error("Error embedding signature image:", e);
      }

      const hashText = `${fieldSigner.signature_hash}...`;
      const hashSize = Math.max(5, fieldH * 0.08);
      page.drawText(hashText, {
        x: fieldX + 6,
        y: fieldY + 5,
        size: hashSize,
        font: helvetica,
        color: rgb(0.11, 0.23, 0.42),
      });

      const nameSize = Math.max(7, fieldH * 0.1);
      let belowY = fieldY - nameSize - 4;

      page.drawText(fieldSigner.name, {
        x: fieldX,
        y: belowY,
        size: nameSize,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (fieldSigner.job_title) {
        belowY -= nameSize + 2;
        page.drawText(fieldSigner.job_title, {
          x: fieldX,
          y: belowY,
          size: nameSize - 1,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      if (fieldSigner.company) {
        belowY -= nameSize + 1;
        page.drawText(fieldSigner.company, {
          x: fieldX,
          y: belowY,
          size: nameSize - 1,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    }

    const signedPdfBytes = await pdfDoc.save();

    const partialPath = `${envelope.id}/partial_signed.pdf`;
    await supabase.storage
      .from("firma-pdfs")
      .upload(partialPath, signedPdfBytes, { contentType: "application/pdf", upsert: true });
    const { data: partialUrlData } = supabase.storage.from("firma-pdfs").getPublicUrl(partialPath);
    const partialPdfUrl = partialUrlData.publicUrl;

    await supabase
      .from("firma_envelopes")
      .update({ partial_pdf_url: partialPdfUrl })
      .eq("id", envelope.id);

    if (!allSigned) {
      return new Response(JSON.stringify({ success: true, allSigned: false, partialPdfUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signedPath = `${envelope.id}/signed.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("firma-pdfs")
      .upload(signedPath, signedPdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from("firma-pdfs").getPublicUrl(signedPath);
    const finalPdfUrl = urlData.publicUrl;

    await supabase
      .from("firma_envelopes")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        final_pdf_url: finalPdfUrl,
        final_pdf_path: signedPath,
        partial_pdf_url: finalPdfUrl,
      })
      .eq("id", envelope.id);

    const completionRecipients = [
      ...updatedSigners.map(s => s.email),
      ...(envelope.sender_email ? [envelope.sender_email] : []),
    ];
    const uniqueRecipients = [...new Set(completionRecipients)];

    for (const email of uniqueRecipients) {
      await resend.emails.send({
        from: "Llave Propia <notificaciones@proppi.cl>",
        to: [email],
        subject: `"${envelope.title}" fue firmado por todos`,
        html: buildCompletionEmail(envelope.title, updatedSigners, finalPdfUrl),
      });
    }

    return new Response(JSON.stringify({ success: true, allSigned: true, finalPdfUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

function buildCompletionEmail(docTitle: string, signers: any[], pdfUrl: string) {
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
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="color:#111827;font-size:22px;margin:0;">Documento firmado por todos</h1>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
          <p style="margin:0 0 4px;font-weight:700;color:#111827;font-size:15px;">${docTitle}</p>
          <p style="margin:0;color:#6b7280;font-size:13px;">${signers.length} firmante(s)</p>
        </div>
        <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px;">Firmantes:</p>
        ${signers.map(s => `
        <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-weight:600;color:#111827;font-size:14px;">${s.name}</p>
          <p style="margin:2px 0 0;color:#9ca3af;font-size:12px;">ID: ${s.signature_hash}...</p>
        </div>`).join('')}
        <div style="text-align:center;margin:32px 0 8px;">
          <a href="${pdfUrl}" style="display:inline-block;background:#1B3A6B;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:8px;font-weight:700;font-size:16px;">
            Descargar PDF firmado
          </a>
        </div>
      </td></tr>
      <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">Llave Propia Firma — Documento con validez legal electronica.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
