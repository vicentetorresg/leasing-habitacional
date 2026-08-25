const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = (process.env.WHATSAPP_PHONE_ID || '').trim();
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

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
        has_property: { type: 'boolean', description: 'Whether they currently own a property' },
        comuna: { type: 'string', description: 'Commune where they want to buy' },
        renta: { type: 'number', description: 'Monthly income in CLP' },
        complement_renta: { type: 'number', description: 'Complement person monthly income in CLP' },
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
    name: 'no_califica',
    description: 'Mark the lead as not interested. Call ONLY when the client clearly states they do not want to continue or asks to be removed.',
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

async function downloadAndStoreMedia(mediaId, phone, filename, mimeType) {
  try {
    // Step 1: Get media URL from WhatsApp
    const metaR = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
    });
    const meta = await metaR.json();
    if (!meta.url) return null;

    // Step 2: Download the file
    const fileR = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
    });
    if (!fileR.ok) return null;
    const buffer = Buffer.from(await fileR.arrayBuffer());

    // Step 3: Upload to Supabase Storage
    const ext = filename ? filename.split('.').pop() : (mimeType || 'bin').split('/').pop();
    const storageName = `${phone}/${Date.now()}_${filename || `file.${ext}`}`;
    const uploadR = await fetch(`${SUPABASE_URL}/storage/v1/object/wa-attachments/${storageName}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': mimeType || 'application/octet-stream',
      },
      body: buffer,
    });
    if (!uploadR.ok) return null;

    return `${SUPABASE_URL}/storage/v1/object/public/wa-attachments/${storageName}`;
  } catch (e) {
    console.error('Media download/upload error:', e);
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
    if (input.has_property !== undefined) updates.has_property = String(input.has_property);
    if (input.comuna) updates.comuna = input.comuna;
    if (input.renta) updates.renta = input.renta;
    if (input.complement_renta) updates.complement_renta = input.complement_renta;

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

  if (toolName === 'no_califica') {
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

      // Download and store media if present
      if (mediaId) {
        mediaUrl = await downloadAndStoreMedia(mediaId, from, filename, mimeType);
      }

      // For audio: attempt transcription with OpenAI Whisper
      if (message.type === 'audio' && mediaUrl) {
        try {
          const audioR = await fetch(mediaUrl);
          const audioBuffer = Buffer.from(await audioR.arrayBuffer());
          const boundary = '----FormBoundary' + Date.now();
          const bodyParts = [
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
            audioBuffer,
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nes\r\n`,
            `--${boundary}--\r\n`,
          ];
          const formBody = Buffer.concat(bodyParts.map(p => typeof p === 'string' ? Buffer.from(p) : p));
          const whisperR = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: formBody,
          });
          if (whisperR.ok) {
            const whisperData = await whisperR.json();
            if (whisperData.text) {
              userText = `[AUDIO transcrito]: ${whisperData.text}`;
            }
          }
        } catch (e) {
          console.error('Whisper transcription error:', e);
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
        // Send email notification for each attachment
        const leadProfile = profile || await ensureLeadProfile(from);
        await sendAttachmentNotificationEmail(from, leadProfile, message.type);

        // Generic response — no analysis (except audio which goes to Claude with transcription)
        if (message.type !== 'audio') {
          const reply = 'OK, recibí ese documento. Favor enviar los pendientes';
          await saveMessage(from, 'assistant', reply);
          await upsertConversation(from, reply, 'assistant');
          await sendWhatsAppMessage(from, reply);
          return res.status(200).send('OK');
        }
      }

      // --- TEXT HANDLING: escalation check, then Claude ---
      const lowerText = userText.toLowerCase();
      const shouldEscalate = ESCALATION_KEYWORDS.some(kw => lowerText.includes(kw));

      if (shouldEscalate) {
        const escalationMsg = 'Entendido, un ejecutivo de Llave Propia te contactará a la brevedad. También puedes escribir directamente al +56 9 5782 3672.';
        await saveMessage(from, 'assistant', escalationMsg);
        await upsertConversation(from, escalationMsg, 'assistant');
        await sendWhatsAppMessage(from, escalationMsg);
        // Disable bot and notify team
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
              html: `<p>El cliente <strong>${leadProfile.name || 'Sin nombre'}</strong> pidió hablar con un ejecutivo humano por WhatsApp.</p>
<p>Teléfono: +${from}</p>
<p>Mensaje: "${userText}"</p>
<p>El bot fue desactivado automáticamente para esta conversación.</p>`,
            }),
          });
        } catch (e) { console.error('Escalation email error:', e); }
        return res.status(200).send('OK');
      }

      // Call Claude with tools for text messages
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
