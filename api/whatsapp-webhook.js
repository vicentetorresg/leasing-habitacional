import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const WA_TOKEN = (process.env.WHATSAPP_TOKEN || '').trim();
const PHONE_ID = (process.env.WHATSAPP_PHONE_ID || '').trim();
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const RESEND_KEY = (process.env.RESEND_API_KEY || '').trim();

const ADMIN_KEY = 'Bot2026#';
const MAX_HISTORY = 20;
const ESCALATION_KEYWORDS = ['hablar con alguien', 'hablar con persona', 'ejecutivo', 'humano', 'agente real'];

// Follow-up config
const FOLLOWUP_INTERVAL_HOURS = 4;
const MAX_FOLLOWUPS = 5; // max follow-ups within 24h window (24/4 = 6, leave margin)
const FOLLOWUP_MESSAGES = [
  'Hola! Te recuerdo que puedes ir enviando tus documentos por este WhatsApp cuando los tengas disponibles',
  'Quedamos pendientes de tu documentación para avanzar con la evaluación. Me los puedes enviar por acá cuando quieras',
  'Solo un recordatorio, estamos esperando tus antecedentes para poder evaluar tu caso. Los puedes enviar por este chat',
  'Hola! Seguimos disponibles para recibir tu documentación. Si tienes dudas me puedes escribir por acá',
  'Te recuerdo que necesitamos tus documentos para evaluar tu alternativa de leasing. Puedes enviarlos de a poco por este WhatsApp',
];

// Message types that count as file attachments
const ATTACHMENT_TYPES = ['image', 'document', 'video', 'sticker'];

// --- Claude Tools (simplified: no document analysis) ---

const TOOLS = [
  {
    name: 'update_lead_info',
    description: 'Update client information. Call when the client provides personal details like name, employment type, income, etc.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Client full name' },
        employment_type: { type: 'string', enum: ['dependent', 'independent'], description: 'dependent = trabajador dependiente, independent = independiente' },
        complements_income: { type: 'boolean', description: 'Whether they complement income with another person' },
        complement_name: { type: 'string', description: 'Name of the person who complements income' },
        complement_employment_type: { type: 'string', enum: ['dependent', 'independent'] },
        has_property_in_mind: { type: 'boolean', description: 'Whether they already have a property in mind they want to buy (vivienda vista)' },
        comuna: { type: 'string', description: 'Commune where they want to buy' },
      },
      required: [],
    },
  },
  {
    name: 'client_says_all_sent',
    description: 'Call ONLY when the client EXPLICITLY says they have sent ALL documents. Examples: "ya mande todo", "esos son todos", "ya envie todos los documentos", "no me falta nada mas". Do NOT call this just because the client sent several files.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'no_interesado',
    description: 'Mark the lead as not interested. Call ONLY when the client EXPLICITLY says they do not want to continue. Examples: "no me interesa", "no quiero continuar", "sáquenme de la base". Do NOT call if the client just has doubts, asks questions, or says they will send documents later.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', enum: ['not_interested', 'do_not_contact', 'solved_elsewhere', 'no_leasing', 'other'], description: 'Reason' },
      },
      required: ['reason'],
    },
  },
];

// --- WhatsApp API ---

async function markAsRead(messageId) {
  await fetch(`https://graph.facebook.com/v25.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(() => {});
}

async function sendWhatsAppMessage(to, text, phoneId) {
  const pid = phoneId || PHONE_ID;
  const r = await fetch(`https://graph.facebook.com/v25.0/${pid}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
  return r.json();
}

async function sendWhatsAppTemplate(to, templateName, lang, phoneId) {
  const pid = phoneId || PHONE_ID;
  const r = await fetch(`https://graph.facebook.com/v25.0/${pid}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name: templateName, language: { code: lang || 'es' } },
    }),
  });
  return r.json();
}

// --- Media Download & Upload ---

async function downloadMediaBuffer(mediaId, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Media download retry ${attempt}/${retries} for ${mediaId}`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
      const metaR = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${WA_TOKEN}` },
      });
      const meta = await metaR.json();
      if (!meta.url) {
        console.error(`Media meta missing url for ${mediaId}:`, JSON.stringify(meta).substring(0, 200));
        continue;
      }
      const fileR = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${WA_TOKEN}` },
      });
      if (!fileR.ok) {
        console.error(`Media file download failed: ${fileR.status} for ${mediaId}`);
        continue;
      }
      const buf = Buffer.from(await fileR.arrayBuffer());
      console.log(`Media downloaded: ${buf.length} bytes for ${mediaId}`);
      return buf;
    } catch (e) {
      console.error(`Media download error (attempt ${attempt}):`, e.message);
    }
  }
  return null;
}

async function uploadToStorage(buffer, phone, filename, mimeType) {
  try {
    const ext = filename ? filename.split('.').pop() : (mimeType || 'bin').split('/').pop();
    const storageName = `${phone}/${Date.now()}_${filename || `file.${ext}`}`;
    const uploadR = await fetch(`${SUPABASE_URL}/storage/v1/object/wa-attachments/${storageName}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': mimeType || 'application/octet-stream' },
      body: buffer,
    });
    if (!uploadR.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/wa-attachments/${storageName}`;
  } catch (e) {
    console.error('Media upload error:', e);
    return null;
  }
}

async function transcribeAudio(buffer, filename, mimeType) {
  try {
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!openaiKey) { console.log('No OPENAI_API_KEY'); return null; }
    // Whisper needs a recognized extension — use .ogg for WhatsApp audio
    const safeName = 'audio.ogg';
    const safeMime = 'audio/ogg';
    const boundary = '----FormBoundary' + Date.now();
    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeName}"\r\nContent-Type: ${safeMime}\r\n\r\n`,
      buffer,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nes\r\n`,
      `--${boundary}--\r\n`,
    ];
    const formBody = Buffer.concat(bodyParts.map(p => typeof p === 'string' ? Buffer.from(p) : p));
    console.log(`Whisper: sending ${buffer.length} bytes`);
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: formBody,
    });
    const responseText = await r.text();
    console.log(`Whisper response: ${r.status} ${responseText.substring(0, 200)}`);
    if (r.ok) {
      const data = JSON.parse(responseText);
      return data.text || null;
    }
    return null;
  } catch (e) {
    console.error('Whisper transcription error:', e.message);
    return null;
  }
}

// --- Supabase ---

const sbHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  return r.json();
}

async function sbPost(path, data, extra = {}) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...sbHeaders, ...extra },
    body: JSON.stringify(data),
  });
}

async function sbPatch(path, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: sbHeaders,
    body: JSON.stringify(data),
  });
}

async function getHistory(phone) {
  const rows = await sbGet(`whatsapp_messages?phone=eq.${phone}&bot_phone=eq.${PHONE_ID}&order=created_at.desc&limit=${MAX_HISTORY}`);
  return (rows || []).reverse().map(row => ({ role: row.role, content: row.content }));
}

async function saveMessage(phone, role, content, mediaUrl) {
  const data = { phone, role, content, bot_phone: PHONE_ID };
  if (mediaUrl) data.media_url = mediaUrl;
  await sbPost('whatsapp_messages', data);
}

async function upsertConversation(phone, lastMessage, role) {
  const now = new Date().toISOString();
  const data = {
    phone,
    bot_phone: PHONE_ID,
    last_message: (lastMessage || '').substring(0, 200),
    last_message_at: now,
    updated_at: now,
    unread_count: role === 'user' ? 1 : 0,
  };
  // When user writes: track timestamp and reset follow-up counter
  if (role === 'user') {
    data.last_user_message_at = now;
    data.followup_count = 0;
  }
  await sbPost('whatsapp_conversations', data, { Prefer: 'resolution=merge-duplicates' });
}

async function isBotEnabled(phone) {
  const rows = await sbGet(`whatsapp_conversations?phone=eq.${phone}&bot_phone=eq.${PHONE_ID}&select=bot_enabled`);
  if (!rows || rows.length === 0) return true;
  return rows[0].bot_enabled !== false;
}

async function getSystemPrompt() {
  const rows = await sbGet('bot_config?key=eq.system_prompt&select=value');
  if (rows && rows.length > 0) return rows[0].value;
  return 'Eres Carolina, ejecutiva de Llave Propia.';
}

// --- Lead Profile ---

async function ensureLeadProfile(phone) {
  const rows = await sbGet(`lead_profiles?phone=eq.${phone}`);
  if (!rows || rows.length === 0) {
    await sbPost('lead_profiles', { phone }, { Prefer: 'resolution=merge-duplicates' });
    return { phone, employment_type: 'unknown', complements_income: 'unknown', has_property: 'unknown', documents_complete: false, evaluation_status: 'waiting_documents' };
  }
  return rows[0];
}

async function getLeadProfile(phone) {
  const rows = await sbGet(`lead_profiles?phone=eq.${phone}`);
  return rows?.[0] || null;
}

function buildLeadContext(profile) {
  if (!profile) return '';

  let ctx = '\n\n--- INFORMACIÓN DEL LEAD ---\n';
  if (profile.name) ctx += `Nombre: ${profile.name}\n`;
  if (profile.renta) ctx += `Renta: $${Number(profile.renta).toLocaleString('es-CL')}\n`;
  if (profile.employment_type !== 'unknown') ctx += `Tipo trabajador: ${profile.employment_type === 'dependent' ? 'Dependiente' : 'Independiente'}\n`;
  if (profile.complements_income !== 'unknown') ctx += `Complementa renta: ${profile.complements_income === 'true' ? 'Sí' : 'No'}\n`;
  if (profile.complement_name) ctx += `Complementante: ${profile.complement_name}\n`;
  if (profile.complement_employment_type !== 'unknown') ctx += `Tipo trabajador complementante: ${profile.complement_employment_type === 'dependent' ? 'Dependiente' : 'Independiente'}\n`;
  if (profile.complement_renta) ctx += `Renta complementante: $${Number(profile.complement_renta).toLocaleString('es-CL')}\n`;
  if (profile.has_property !== 'unknown') ctx += `Tiene vivienda: ${profile.has_property === 'true' ? 'Sí' : 'No'}\n`;
  if (profile.comuna) ctx += `Comuna donde busca: ${profile.comuna}\n`;
  ctx += `Estado: ${profile.evaluation_status}\n`;
  ctx += '--- FIN INFORMACIÓN DEL LEAD ---';
  return ctx;
}

// --- Tool Execution ---

async function executeTool(toolName, input, phone) {
  if (toolName === 'update_lead_info') {
    const updates = { updated_at: new Date().toISOString() };
    if (input.name) updates.name = input.name;
    if (input.employment_type) updates.employment_type = input.employment_type;
    if (input.complements_income !== undefined) updates.complements_income = String(input.complements_income);
    if (input.complement_name) updates.complement_name = input.complement_name;
    if (input.complement_employment_type) updates.complement_employment_type = input.complement_employment_type;
    if (input.has_property_in_mind !== undefined) updates.has_property_in_mind = String(input.has_property_in_mind);
    if (input.comuna) updates.comuna = input.comuna;

    await sbPatch(`lead_profiles?phone=eq.${phone}`, updates);
    return { success: true };
  }

  if (toolName === 'client_says_all_sent') {
    await sbPatch(`lead_profiles?phone=eq.${phone}`, {
      evaluation_status: 'documents_sent_by_client',
      updated_at: new Date().toISOString(),
    });
    return { success: true, message: 'Status updated to documents_sent_by_client' };
  }

  if (toolName === 'no_interesado') {
    const now = new Date().toISOString();
    await sbPatch(`lead_profiles?phone=eq.${phone}`, {
      not_interested: true,
      not_interested_reason: input.reason,
      not_interested_at: now,
      evaluation_status: 'not_interested',
      updated_at: now,
    });
    await sbPost('whatsapp_conversations', {
      phone, bot_phone: PHONE_ID, bot_enabled: false, updated_at: now,
    }, { Prefer: 'resolution=merge-duplicates' });
    return { success: true };
  }

  return { error: 'Unknown tool' };
}

// --- Resend: notify on each attachment received ---

async function sendAttachmentNotificationEmail(phone, profile, messageType) {
  if (!RESEND_KEY) return;

  const name = profile?.name || 'Sin nombre';
  const now = new Date();
  const dateStr = now.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const compl = profile?.complements_income === 'true' ? 'Sí' : profile?.complements_income === 'false' ? 'No' : 'No informado';

  const body = `El cliente ${name} envió un nuevo archivo por WhatsApp para su evaluación de leasing habitacional.

Nombre: ${name}
Teléfono: +${phone}
Fecha y hora: ${dateStr}
Tipo de archivo: ${messageType}
Complementa renta: ${compl}
Comuna de interés: ${profile?.comuna || 'No informada'}

Se recibió un nuevo archivo adjunto en la conversación.

Favor revisar directamente la documentación recibida.`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: ['vicente@llavepropia.cl', 'rodrigo@llavepropia.cl'],
        subject: `Nuevo documento recibido - ${name}`,
        text: body,
      }),
    });
  } catch (e) {
    console.error('Resend email error:', e);
  }
}

// --- Claude with Tool Use ---

async function callClaude(messages, phone) {
  const profile = await ensureLeadProfile(phone);
  const basePrompt = await getSystemPrompt();
  const context = buildLeadContext(profile);
  const toolInstructions = `

INSTRUCCIONES DE HERRAMIENTAS — OBLIGATORIO:

1. SIEMPRE que el cliente mencione CUALQUIER dato personal (nombre, tipo de trabajo, comuna, renta, si complementa renta, si tiene vivienda), DEBES llamar update_lead_info. No solo responder con texto.

2. Si el cliente dice EXPRESAMENTE que ya envió todos los documentos (ej: ya mandé todo, esos son todos, ya envié todos), DEBES llamar client_says_all_sent.

3. Si el cliente dice que no le interesa o pide no ser contactado, DEBES llamar no_califica.

4. Puedes combinar herramientas con texto en el mismo turno.

5. NUNCA menciones las herramientas al cliente.

IMPORTANTE SOBRE ARCHIVOS: Cuando el mensaje del cliente contiene [IMAGEN], [DOCUMENTO] o similar, el sistema ya notificó al equipo automáticamente. Tu solo debes responder: OK, recibí ese documento. Favor enviar los pendientes. NO analices, NO identifiques, NO comentes el contenido del archivo.`;

  const systemPrompt = basePrompt + toolInstructions + context;

  let currentMessages = [...messages];
  let iterations = 0;

  while (iterations < 3) {
    iterations++;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: currentMessages,
        tools: TOOLS,
      }),
    });

    const data = await r.json();
    console.log(`Claude iteration ${iterations}:`, JSON.stringify(data).substring(0, 500));

    if (!data.content) {
      console.error('Claude error:', JSON.stringify(data));
      console.error('Messages sent:', JSON.stringify(currentMessages).substring(0, 500));
      return 'Disculpa, no pude procesar tu mensaje. Escríbenos al +56 9 5782 3672.';
    }

    const toolCalls = data.content.filter(b => b.type === 'tool_use');
    const textBlock = data.content.find(b => b.type === 'text');

    if (toolCalls.length === 0) {
      return textBlock?.text || 'Disculpa, no pude procesar tu mensaje.';
    }

    // Execute tools
    const toolResultValues = await Promise.all(
      toolCalls.map(tc => executeTool(tc.name, tc.input, phone))
    );

    // If text available on first iteration, return it directly (speed optimization)
    if (textBlock?.text && iterations === 1) {
      return textBlock.text;
    }

    const toolResults = toolCalls.map((tc, i) => ({
      type: 'tool_result',
      tool_use_id: tc.id,
      content: JSON.stringify(toolResultValues[i]),
    }));

    currentMessages.push({ role: 'assistant', content: data.content });
    currentMessages.push({ role: 'user', content: toolResults });
  }

  return 'Disculpa, tuve un problema procesando tu mensaje. Escríbenos al +56 9 5782 3672.';
}

// --- Follow-up Cron ---

async function runFollowups() {
  // Get all active conversations where:
  // - bot is enabled
  // - user wrote something (last_user_message_at exists)
  // - last user message was 4+ hours ago but within 24 hours
  // - follow-up count < MAX_FOLLOWUPS
  // - no follow-up sent in the last FOLLOWUP_INTERVAL_HOURS
  const now = new Date();
  const fourHoursAgo = new Date(now - FOLLOWUP_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const conversations = await sbGet(
    `whatsapp_conversations?bot_enabled=eq.true&bot_phone=eq.${PHONE_ID}&last_user_message_at=lt.${fourHoursAgo}&last_user_message_at=gt.${twentyFourHoursAgo}&followup_count=lt.${MAX_FOLLOWUPS}&select=phone,followup_count,last_followup_at,last_user_message_at`
  );

  if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
    return { sent: 0 };
  }

  let sent = 0;

  for (const conv of conversations) {
    // Skip if last follow-up was less than FOLLOWUP_INTERVAL_HOURS ago
    if (conv.last_followup_at) {
      const lastFollowup = new Date(conv.last_followup_at);
      const hoursSinceFollowup = (now - lastFollowup) / (1000 * 60 * 60);
      if (hoursSinceFollowup < FOLLOWUP_INTERVAL_HOURS) continue;
    }

    // Check lead is not marked as not_interested
    const profile = await getLeadProfile(conv.phone);
    if (profile?.not_interested) continue;
    if (profile?.evaluation_status === 'documents_sent_by_client') continue;

    // Pick a follow-up message based on count
    const msgIndex = (conv.followup_count || 0) % FOLLOWUP_MESSAGES.length;
    const followupMsg = FOLLOWUP_MESSAGES[msgIndex];

    try {
      await sendWhatsAppMessage(conv.phone, followupMsg);
      await saveMessage(conv.phone, 'assistant', followupMsg);

      // Update conversation tracking
      await sbPatch(`whatsapp_conversations?phone=eq.${conv.phone}&bot_phone=eq.${PHONE_ID}`, {
        last_followup_at: now.toISOString(),
        followup_count: (conv.followup_count || 0) + 1,
        last_message: followupMsg.substring(0, 200),
        last_message_at: now.toISOString(),
      });

      sent++;
      console.log(`Follow-up sent to ${conv.phone} (#${(conv.followup_count || 0) + 1})`);
    } catch (e) {
      console.error(`Follow-up failed for ${conv.phone}:`, e);
    }
  }

  return { sent, checked: conversations.length };
}

// --- Admin API ---

async function handleAdmin(req, res) {
  const auth = req.headers['x-admin-key'];
  if (auth !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { action } = req.body;

  if (action === 'send_message') {
    const { to, text, phone_id } = req.body;
    const result = await sendWhatsAppMessage(to, text, phone_id);
    await saveMessage(to, 'assistant', text);
    await upsertConversation(to, text, 'assistant');
    return res.status(200).json({ ok: true, result });
  }

  if (action === 'send_template') {
    const { to, template_name, language, phone_id } = req.body;
    const result = await sendWhatsAppTemplate(to, template_name, language, phone_id);
    await saveMessage(to, 'assistant', `[PLANTILLA: ${template_name}]`);
    await upsertConversation(to, `[PLANTILLA: ${template_name}]`, 'assistant');
    return res.status(200).json({ ok: true, result });
  }

  if (action === 'send_audio') {
    const { to, audio_base64, mime_type, phone_id } = req.body;
    const pid = phone_id || PHONE_ID;
    try {
      const audioBuffer = Buffer.from(audio_base64, 'base64');
      const ts = Date.now();
      const ext = (mime_type || '').includes('mp4') ? 'mp4' : (mime_type || '').includes('ogg') ? 'ogg' : 'webm';
      // Convert to OGG with ffmpeg (WhatsApp only reliably plays OGG/opus)
      const tmpIn = join(tmpdir(), `in_${ts}.${ext}`);
      const tmpOut = join(tmpdir(), `out_${ts}.ogg`);
      writeFileSync(tmpIn, audioBuffer);
      try {
        execSync(`${ffmpegPath} -i ${tmpIn} -c:a libopus -b:a 64k -ar 48000 -ac 1 -map_metadata -1 -fflags +bitexact ${tmpOut} -y`, { timeout: 15000 });
      } catch (e) {
        console.error('ffmpeg conversion error:', e.message);
        unlinkSync(tmpIn);
        return res.status(500).json({ error: 'Audio conversion failed' });
      }
      const oggBuffer = readFileSync(tmpOut);
      unlinkSync(tmpIn);
      unlinkSync(tmpOut);
      // Upload OGG to Supabase
      const storageName = `${to}/${ts}_audio_sent.ogg`;
      await fetch(`${SUPABASE_URL}/storage/v1/object/wa-attachments/${storageName}`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'audio/ogg' },
        body: oggBuffer,
      });
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/wa-attachments/${storageName}`;
      // Send via WhatsApp
      const sendR = await fetch(`https://graph.facebook.com/v25.0/${pid}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'audio', audio: { link: publicUrl } }),
      });
      const sendData = await sendR.json();
      console.log('WA send audio (ogg):', JSON.stringify(sendData));
      await saveMessage(to, 'assistant', '[AUDIO enviado]', publicUrl);
      await upsertConversation(to, '[AUDIO enviado]', 'assistant');
      return res.status(200).json({ ok: true, result: sendData });
    } catch (e) {
      console.error('Send audio error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (action === 'send_media') {
    const { to, media_base64, media_type, filename, phone_id } = req.body;
    const pid = phone_id || PHONE_ID;
    try {
      const buffer = Buffer.from(media_base64, 'base64');
      const ts = Date.now();
      const safeName = filename || `file_${ts}`;
      const storageName = `${to}/${ts}_${safeName}`;
      // Upload to Supabase
      await fetch(`${SUPABASE_URL}/storage/v1/object/wa-attachments/${storageName}`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': media_type || 'application/octet-stream' },
        body: buffer,
      });
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/wa-attachments/${storageName}`;
      // Determine WhatsApp message type
      const isImage = (media_type || '').startsWith('image/');
      const isVideo = (media_type || '').startsWith('video/');
      const waType = isImage ? 'image' : isVideo ? 'video' : 'document';
      const mediaPayload = { link: publicUrl };
      if (waType === 'document') mediaPayload.filename = safeName;
      const sendR = await fetch(`https://graph.facebook.com/v25.0/${pid}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: waType, [waType]: mediaPayload }),
      });
      const sendData = await sendR.json();
      console.log('WA send media:', waType, JSON.stringify(sendData));
      const label = isImage ? '[IMAGEN enviada]' : isVideo ? '[VIDEO enviado]' : `[DOCUMENTO enviado: ${safeName}]`;
      await saveMessage(to, 'assistant', label, publicUrl);
      await upsertConversation(to, label, 'assistant');
      return res.status(200).json({ ok: true, result: sendData });
    } catch (e) {
      console.error('Send media error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (action === 'toggle_bot') {
    const { phone, enabled, phone_id } = req.body;
    const pid = phone_id || PHONE_ID;
    await sbPost('whatsapp_conversations', {
      phone, bot_phone: pid, bot_enabled: enabled, updated_at: new Date().toISOString(),
    }, { Prefer: 'resolution=merge-duplicates' });
    return res.status(200).json({ ok: true });
  }

  if (action === 'mark_read') {
    const { phone } = req.body;
    const pid = req.body.phone_id || PHONE_ID;
    await sbPatch(`whatsapp_conversations?phone=eq.${phone}&bot_phone=eq.${pid}`, { unread_count: 0 });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

// --- Webhook Handler ---

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    // Cron: follow-up reminders
    if (req.query.cron === 'followup') {
      const result = await runFollowups();
      return res.status(200).json({ ok: true, ...result });
    }

    // Meta webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === 'llavepropia_verify_2024') {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    if (req.headers['x-admin-key']) return handleAdmin(req, res);

    const body = req.body;
    if (!body || body.object !== 'whatsapp_business_account') {
      return res.status(200).send('OK');
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses) return res.status(200).send('OK');

    const message = value?.messages?.[0];
    if (!message) return res.status(200).send('OK');

    const from = message.from;
    const messageId = message.id;
    const isAttachment = ATTACHMENT_TYPES.includes(message.type);

    try {
      await markAsRead(messageId);

      // Extract message content + download media
      let userText = '';
      let mediaUrl = null;
      let mediaId = null;
      let filename = null;
      let mimeType = null;

      if (message.type === 'text') {
        userText = message.text.body;
      } else if (message.type === 'audio') {
        mediaId = message.audio?.id;
        mimeType = message.audio?.mime_type || 'audio/ogg';
        filename = `audio_${Date.now()}.ogg`;
        userText = '[AUDIO]';
      } else if (message.type === 'image') {
        mediaId = message.image?.id;
        mimeType = message.image?.mime_type || 'image/jpeg';
        filename = `imagen_${Date.now()}.jpg`;
        userText = '[IMAGEN enviada por el cliente]';
      } else if (message.type === 'document') {
        mediaId = message.document?.id;
        mimeType = message.document?.mime_type || 'application/octet-stream';
        filename = message.document?.filename || `documento_${Date.now()}`;
        userText = filename ? `[DOCUMENTO enviado: ${filename}]` : '[DOCUMENTO enviado por el cliente]';
      } else if (message.type === 'video') {
        mediaId = message.video?.id;
        mimeType = message.video?.mime_type || 'video/mp4';
        filename = `video_${Date.now()}.mp4`;
        userText = '[VIDEO enviado por el cliente]';
      } else {
        userText = '[MENSAJE NO SOPORTADO]';
      }

      // Download media and process
      if (mediaId) {
        const buffer = await downloadMediaBuffer(mediaId);
        if (buffer) {
          if (message.type === 'audio') {
            // Audio: upload + transcribe in parallel (Pro plan = 60s timeout)
            const [url, transcript] = await Promise.all([
              uploadToStorage(buffer, from, filename, mimeType),
              transcribeAudio(buffer, filename, mimeType),
            ]);
            mediaUrl = url;
            if (transcript) userText = `[AUDIO transcrito]: ${transcript}`;
          } else {
            // Non-audio: upload to storage
            mediaUrl = await uploadToStorage(buffer, from, filename, mimeType);
          }
        }
      }

      // Save user message
      await saveMessage(from, 'user', userText, mediaUrl);
      await upsertConversation(from, userText, 'user');

      // Check if bot is enabled
      const botEnabled = await isBotEnabled(from);
      if (!botEnabled) return res.status(200).send('OK');

      // Check lead not_interested status
      const profile = await getLeadProfile(from);
      if (profile?.not_interested) return res.status(200).send('OK');

      // --- ATTACHMENT HANDLING: email notification + generic response ---
      if (isAttachment) {
        const leadProfile = profile || await ensureLeadProfile(from);
        await sendAttachmentNotificationEmail(from, leadProfile, message.type);
        const reply = 'OK, recibí ese documento. Favor enviar los pendientes';
        await saveMessage(from, 'assistant', reply);
        await upsertConversation(from, reply, 'assistant');
        await sendWhatsAppMessage(from, reply);
        return res.status(200).send('OK');
      }

      // --- TEXT & AUDIO: escalation check, then Claude ---
      const lowerText = userText.toLowerCase();
      const shouldEscalate = ESCALATION_KEYWORDS.some(kw => lowerText.includes(kw));

      if (shouldEscalate) {
        const escalationMsg = 'Entendido, un ejecutivo de Llave Propia te contactará a la brevedad. También puedes escribir directamente al +56 9 5782 3672.';
        await saveMessage(from, 'assistant', escalationMsg);
        await upsertConversation(from, escalationMsg, 'assistant');
        await sendWhatsAppMessage(from, escalationMsg);
        await sbPost('whatsapp_conversations', {
          phone: from, bot_phone: PHONE_ID, bot_enabled: false, escalated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { Prefer: 'resolution=merge-duplicates' });
        const leadProfile = profile || await ensureLeadProfile(from);
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Llave Propia <notificaciones@proppi.cl>',
              to: ['vicente@llavepropia.cl', 'rodrigo@llavepropia.cl'],
              subject: `Cliente pide hablar con ejecutivo - ${leadProfile.name || from}`,
              html: `<p>El cliente <strong>${leadProfile.name || 'Sin nombre'}</strong> pidió hablar con un ejecutivo humano por WhatsApp.</p><p>Teléfono: +${from}</p><p>Mensaje: "${userText}"</p><p>El bot fue desactivado automáticamente.</p>`,
            }),
          });
        } catch (e) { console.error('Escalation email error:', e); }
        return res.status(200).send('OK');
      }

      // Call Claude
      const history = await getHistory(from);
      const reply = await callClaude(history, from);
      await saveMessage(from, 'assistant', reply);
      await upsertConversation(from, reply, 'assistant');
      await sendWhatsAppMessage(from, reply);
    } catch (err) {
      console.error('Error processing message:', err);
      try {
        await sendWhatsAppMessage(from, 'Disculpa, tuve un problema. Un ejecutivo te contactará pronto al +56 9 5782 3672.');
      } catch (e2) {}
    }

    return res.status(200).send('OK');
  }
}
