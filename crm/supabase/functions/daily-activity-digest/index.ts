import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ejecutivas a monitorear
const TRACKED_USERS: Record<string, string> = {
  '6608503b-3cc7-447a-9ffd-f8f94795cd50': 'Karina Valenzuela',
  '9f156deb-c219-4b51-b454-5a4692629332': 'Comercial',
};

const RECIPIENTS = ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'];

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  first_call: 'Primer llamado',
  second_call: 'Segundo llamado',
  contactado: 'Contactado',
  no_contesta: 'No contesta',
  esperando_documentos: 'Esperando documentos',
  docs_recibidos: 'Docs recibidos',
  pre_aprobado: 'Pre-aprobado',
  buscando_vivienda: 'Buscando vivienda',
  reserva: 'Reserva',
  promesa: 'Promesa',
  escritura: 'Escritura',
  rechaza_oferta: 'Rechaza oferta',
  no_califica: 'No califica',
  descartado: 'Descartado',
  asesoria_agendada: 'Asesoria agendada',
  recontactar: 'Recontactar',
  plan_presentado: 'Plan presentado',
  asesoria_agendada_manual: 'Asesoria agendada (manual)',
  no_contesto_manual: 'No contesto (manual)',
  cliente_interesado_manual: 'Cliente interesado (manual)',
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
    // Date range: today in Chile time (UTC-4)
    const now = new Date();
    const clOffset = -4 * 60;
    const clNow = new Date(now.getTime() + clOffset * 60000);
    const dateStr = clNow.toISOString().slice(0, 10);
    const dayStart = dateStr + 'T00:00:00-04:00';
    const dayEnd = dateStr + 'T23:59:59-04:00';

    const userSummaries: Array<{
      userId: string;
      userName: string;
      notasCreadas: number;
      notasDetalle: Array<{ lead: string; nota: string; hora: string }>;
      llamadasHechas: number;
      llamadasContestadas: number;
      llamadasNoContesta: number;
      llamadasDetalle: Array<{ lead: string; outcome: string; hora: string }>;
      cambiosEstado: number;
      cambiosEstadoDetalle: Array<{ lead: string; de: string; a: string; hora: string }>;
      leadsAtendidos: number;
      leadsNuevos: number;
      asesoriasAgendadas: number;
    }> = [];

    for (const [userId, userName] of Object.entries(TRACKED_USERS)) {
      // 1. Notas creadas hoy
      const { data: notas } = await supabase
        .from('lead_notes')
        .select('id, lead_id, note, created_at')
        .eq('user_id', userId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: true });

      // Get lead names for notes
      const noteLeadIds = [...new Set((notas || []).map(n => n.lead_id))];
      let noteLeadNames: Record<string, string> = {};
      if (noteLeadIds.length > 0) {
        const { data: noteLeads } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', noteLeadIds);
        noteLeadNames = Object.fromEntries((noteLeads || []).map(l => [l.id, l.name]));
      }

      // 2. Llamadas (call_attempts) hoy
      const { data: calls } = await supabase
        .from('call_attempts')
        .select('id, lead_id, outcome, created_at, notes')
        .eq('user_id', userId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: true });

      // Get lead names for calls
      const callLeadIds = [...new Set((calls || []).map(c => c.lead_id))];
      let callLeadNames: Record<string, string> = {};
      if (callLeadIds.length > 0) {
        const { data: callLeads } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', callLeadIds);
        callLeadNames = Object.fromEntries((callLeads || []).map(l => [l.id, l.name]));
      }

      // 3. Cambios de estado hoy (leads con status_changed_at hoy, assigned_to = userId)
      const { data: changedLeads } = await supabase
        .from('leads')
        .select('id, name, status, previous_status, status_changed_at')
        .eq('assigned_to', userId)
        .gte('status_changed_at', dayStart)
        .lte('status_changed_at', dayEnd)
        .order('status_changed_at', { ascending: true });

      // 4. Leads nuevos asignados hoy
      const { data: newLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('assigned_to', userId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // 5. Asesorias agendadas hoy
      const agendaStatuses = ['asesoria_agendada', 'asesoria_agendada_manual'];
      const asesoriasCount = (changedLeads || []).filter(l => agendaStatuses.includes(l.status)).length;

      // Unique leads atendidos (union of leads with notes, calls, or status changes)
      const allLeadIds = new Set([
        ...noteLeadIds,
        ...callLeadIds,
        ...(changedLeads || []).map(l => l.id),
      ]);

      const formatHora = (ts: string) => {
        const d = new Date(ts);
        const h = new Date(d.getTime() + clOffset * 60000);
        return h.toTimeString().slice(0, 5);
      };

      const notasDetalle = (notas || []).map(n => ({
        lead: noteLeadNames[n.lead_id] || n.lead_id.slice(0, 8),
        nota: n.note?.slice(0, 200) || '',
        hora: formatHora(n.created_at),
      }));

      const llamadasDetalle = (calls || []).map(c => ({
        lead: callLeadNames[c.lead_id] || c.lead_id.slice(0, 8),
        outcome: c.outcome || 'sin resultado',
        hora: formatHora(c.created_at),
      }));

      const cambiosDetalle = (changedLeads || []).map(l => ({
        lead: l.name,
        de: l.previous_status || '?',
        a: l.status,
        hora: formatHora(l.status_changed_at),
      }));

      const contestadas = (calls || []).filter(c =>
        c.outcome && !['no_contesta', 'no_answer', 'busy', 'failed', 'canceled'].includes(c.outcome)
      ).length;
      const noContesta = (calls || []).filter(c =>
        ['no_contesta', 'no_answer', 'busy'].includes(c.outcome || '')
      ).length;

      const summary = {
        userId,
        userName,
        notasCreadas: (notas || []).length,
        notasDetalle,
        llamadasHechas: (calls || []).length,
        llamadasContestadas: contestadas,
        llamadasNoContesta: noContesta,
        llamadasDetalle,
        cambiosEstado: (changedLeads || []).length,
        cambiosEstadoDetalle: cambiosDetalle,
        leadsAtendidos: allLeadIds.size,
        leadsNuevos: (newLeads || []).length,
        asesoriasAgendadas: asesoriasCount,
      };

      userSummaries.push(summary);

      // Save to daily_activity_log
      await supabase.from('daily_activity_log').upsert({
        date: dateStr,
        user_id: userId,
        user_name: userName,
        leads_atendidos: summary.leadsAtendidos,
        notas_creadas: summary.notasCreadas,
        llamadas_hechas: summary.llamadasHechas,
        llamadas_contestadas: summary.llamadasContestadas,
        llamadas_no_contesta: summary.llamadasNoContesta,
        asesorias_agendadas: summary.asesoriasAgendadas,
        cambios_estado: summary.cambiosEstado,
        notas_detalle: summary.notasDetalle,
        cambios_estado_detalle: summary.cambiosEstadoDetalle,
        llamadas_detalle: summary.llamadasDetalle,
        leads_nuevos_asignados: summary.leadsNuevos,
      }, { onConflict: 'date,user_id' });
    }

    // Build email HTML
    const userBlocks = userSummaries.map(s => {
      const notasRows = s.notasDetalle.length > 0
        ? s.notasDetalle.map(n => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555">${n.hora}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#1B3A6B">${n.lead}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333">${n.nota}</td>
          </tr>`).join('')
        : '<tr><td colspan="3" style="padding:10px;color:#999;font-size:13px">Sin notas hoy</td></tr>';

      const cambiosRows = s.cambiosEstadoDetalle.length > 0
        ? s.cambiosEstadoDetalle.map(c => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555">${c.hora}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#1B3A6B">${c.lead}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#999">${STATUS_LABELS[c.de] || c.de}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;font-weight:600">${STATUS_LABELS[c.a] || c.a}</td>
          </tr>`).join('')
        : '<tr><td colspan="4" style="padding:10px;color:#999;font-size:13px">Sin cambios de estado hoy</td></tr>';

      const llamadasRows = s.llamadasDetalle.length > 0
        ? s.llamadasDetalle.map(l => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555">${l.hora}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#1B3A6B">${l.lead}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333">${l.outcome}</td>
          </tr>`).join('')
        : '<tr><td colspan="3" style="padding:10px;color:#999;font-size:13px">Sin llamadas hoy</td></tr>';

      const hasActivity = s.leadsAtendidos > 0 || s.notasCreadas > 0 || s.llamadasHechas > 0;

      return `
      <!-- ${s.userName} -->
      <div style="margin-bottom:28px">
        <div style="background:linear-gradient(135deg,#1B3A6B 0%,#2d5aa0 100%);padding:16px 24px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;color:#fff;font-size:18px;font-weight:700">${s.userName}</h2>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 24px">

          <!-- KPIs -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
            <tr>
              <td style="text-align:center;padding:12px">
                <div style="font-size:28px;font-weight:800;color:${hasActivity ? '#1B3A6B' : '#ccc'}">${s.leadsAtendidos}</div>
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Leads atendidos</div>
              </td>
              <td style="text-align:center;padding:12px">
                <div style="font-size:28px;font-weight:800;color:${s.llamadasHechas > 0 ? '#2BA89C' : '#ccc'}">${s.llamadasHechas}</div>
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Llamadas</div>
              </td>
              <td style="text-align:center;padding:12px">
                <div style="font-size:28px;font-weight:800;color:${s.notasCreadas > 0 ? '#C9871A' : '#ccc'}">${s.notasCreadas}</div>
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Notas</div>
              </td>
              <td style="text-align:center;padding:12px">
                <div style="font-size:28px;font-weight:800;color:${s.asesoriasAgendadas > 0 ? '#22c55e' : '#ccc'}">${s.asesoriasAgendadas}</div>
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Asesorias</div>
              </td>
            </tr>
          </table>

          <!-- Llamadas sub-breakdown -->
          ${s.llamadasHechas > 0 ? `
          <div style="background:#f0fdf4;border-radius:8px;padding:10px 16px;margin-bottom:16px;font-size:13px;color:#166534">
            Contestadas: <strong>${s.llamadasContestadas}</strong> &nbsp;|&nbsp; No contesta: <strong>${s.llamadasNoContesta}</strong> &nbsp;|&nbsp; Leads nuevos asignados: <strong>${s.leadsNuevos}</strong>
          </div>` : ''}

          <!-- Llamadas detalle -->
          <p style="margin:16px 0 8px;font-size:13px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:0.5px">Llamadas</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Hora</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Lead</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Resultado</th>
            </tr></thead>
            <tbody>${llamadasRows}</tbody>
          </table>

          <!-- Notas detalle -->
          <p style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:0.5px">Notas</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Hora</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Lead</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Nota</th>
            </tr></thead>
            <tbody>${notasRows}</tbody>
          </table>

          <!-- Cambios de estado -->
          <p style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:0.5px">Cambios de estado</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Hora</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Lead</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">De</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">A</th>
            </tr></thead>
            <tbody>${cambiosRows}</tbody>
          </table>

        </div>
      </div>`;
    }).join('');

    // Format date nicely
    const dias = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const diaSem = dias[clNow.getDay()];
    const diaMes = clNow.getDate();
    const mes = meses[clNow.getMonth()];

    const totalLeads = userSummaries.reduce((s, u) => s + u.leadsAtendidos, 0);
    const totalCalls = userSummaries.reduce((s, u) => s + u.llamadasHechas, 0);
    const totalNotas = userSummaries.reduce((s, u) => s + u.notasCreadas, 0);

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Reporte diario CRM</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 16px">
<tr><td align="center">
<table width="100%" style="max-width:640px">

  <!-- Header -->
  <tr><td style="background:#fff;padding:20px 28px;border-radius:12px 12px 0 0;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="120" style="display:block;height:auto">
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:24px 28px">
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Reporte diario CRM</p>
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">${diaSem} ${diaMes} de ${mes}</p>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">${totalLeads} leads atendidos &middot; ${totalCalls} llamadas &middot; ${totalNotas} notas</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#f4f2ee;padding:24px 0">
    ${userBlocks}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 28px;background:#fff;border-radius:0 0 12px 12px;border-top:1px solid #f0ece4">
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">Llave Propia CRM &middot; Reporte automatico diario</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

    // Send email
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Llave Propia CRM <notificaciones@proppi.cl>',
        to: RECIPIENTS,
        subject: `Reporte CRM ${diaSem} ${diaMes}/${mes} — ${totalLeads} leads, ${totalCalls} llamadas`,
        html,
      }),
    });

    const emailResult = await emailRes.json();
    if (!emailRes.ok) {
      console.error('Email send failed:', emailResult);
      return new Response(JSON.stringify({ error: emailResult }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Daily activity digest sent. ${userSummaries.map(s => `${s.userName}: ${s.leadsAtendidos} leads, ${s.llamadasHechas} calls, ${s.notasCreadas} notes`).join(' | ')}`);

    return new Response(JSON.stringify({
      success: true,
      date: dateStr,
      summaries: userSummaries.map(s => ({
        user: s.userName,
        leads: s.leadsAtendidos,
        calls: s.llamadasHechas,
        notes: s.notasCreadas,
        statusChanges: s.cambiosEstado,
      })),
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
