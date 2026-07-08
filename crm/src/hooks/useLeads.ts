import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEMO_EMAIL = 'demo@demo.cl';

export interface Lead {
  id: string;
  source: string;
  external_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  created_time: string | null;
  created_at: string;
  status: string;
  assigned_to: string | null;
  last_attempt_at: string | null;
  rut: string | null;
  sueldo_liquido: number | null;
  sueldo_liquido_raw: string | null;
  en_dicom: boolean | null;
  advisor_id: string | null;
  uf_sin_bp: number | null;
  valor_vivienda_uf: number | null;
  valor_financiamiento_uf: number | null;
  proyecto: string | null;
  direccion_vivienda: string | null;
  fecha_reserva: string | null;
  mes_cierre: string | null;
  priority: string;
  sort_order: number;
  previous_status: string | null;
  scheduled_at: string | null;
  status_changed_at: string | null;
  is_demo: boolean;
  sms_sent: boolean;
  no_califica: boolean;
  no_califica_razon: string | null;
  transferred_from_susan: boolean;
  camila_notes_hidden_since: string | null;
  arriendo: string | null;
  contrato: string | null;
  vivienda: string | null;
  tiene_propiedad_vista: string | null;
  comuna_propiedad: string | null;
  precio_propiedad_ok: string | null;
  complementa_renta: string | null;
  preferencia_contacto: string | null;
  horario_contacto: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

// Statuses that mean the lead is still pending (ejecutiva view)
const PENDING_STATUSES = ['nuevo', 'recontactar', 'no_contesta'];

export function useLeads(userId?: string, isAdmin?: boolean, userEmail?: string, isRecicladora?: boolean) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const isDemo = userEmail === DEMO_EMAIL;

  const fetchLeads = useCallback(async () => {
    // No cargar hasta saber quién es el usuario (evita flash de todos los leads)
    if (!isAdmin && !userId && !isRecicladora) return;

    let query = supabase
      .from('leads')
      .select('*')
      .eq('is_demo', isDemo)
      .order('created_at', { ascending: false });

    // All users see all leads (no assigned_to filter)
    const EJECUTIVA_STATUSES = ['nuevo', 'contactado', 'recontactar', 'no_contesta', 'no_califica', 'calling'];

    if (isAdmin || userId) {
      query = query.in('status', EJECUTIVA_STATUSES);
    }

    const { data } = await query;
    if (data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  }, [isDemo, isAdmin, userId, isRecicladora]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, refetch: fetchLeads };
}

/**
 * Get all pending leads for a user - these carry over across days until
 * answered, done, failed, or max attempts reached.
 */
export function getPendingLeads(leads: Lead[], userId?: string): Lead[] {
  return leads.filter(l => {
    return PENDING_STATUSES.includes(l.status);
  });
}

export function useRealtimeLeads(onNewLead: (lead: Lead) => void, isDemo = false, userId?: string) {
  // Use a ref so the channel subscription doesn't re-create on every callback change
  const callbackRef = useRef(onNewLead);
  useEffect(() => {
    callbackRef.current = onNewLead;
  }, [onNewLead]);

  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const lead = payload.new as Lead;
          if (lead.is_demo !== isDemo) return; // Filter by demo flag
          // Only notify if the lead is assigned to this user (or unassigned)
          if (userId && lead.assigned_to !== null && lead.assigned_to !== userId) return;
          console.log('[Realtime] New lead INSERT received:', lead);
          callbackRef.current(lead);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const updated = payload.new as Lead;
          if (updated.is_demo !== isDemo) return; // Filter by demo flag
          // Only notify if the lead is assigned to this user (or unassigned)
          if (userId && updated.assigned_to !== null && updated.assigned_to !== userId) return;
          if (updated.status === 'new') {
            console.log('[Realtime] Lead UPDATE to new:', updated);
            callbackRef.current(updated);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemo, userId]);
}

export async function updateLeadStatus(leadId: string, status: string) {
  const updateData: Record<string, any> = { status, last_attempt_at: new Date().toISOString() };

  // When transitioning to 'calling', save the current status so we can revert if the call times out
  if (status === 'calling') {
    const { data: current } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single();
    if (current && current.status !== 'calling') {
      updateData.previous_status = current.status;
    }
  }

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId);
  return { error };
}

export async function deleteLead(leadId: string) {
  // Delete related records first, then the lead
  await supabase.from('lead_notes').delete().eq('lead_id', leadId);
  await supabase.from('call_attempts').delete().eq('lead_id', leadId);
  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  return { error };
}

export async function assignLead(leadId: string, userId: string) {
  const { error } = await supabase
    .from('leads')
    .update({ assigned_to: userId })
    .eq('id', leadId);
  return { error };
}

export async function createCallAttempt(
  leadId: string,
  userId: string,
  attemptNumber: number,
  outcome: string,
  notes?: string
) {
  const { error } = await supabase
    .from('call_attempts')
    .insert({
      lead_id: leadId,
      user_id: userId,
      attempt_number: attemptNumber,
      outcome,
      notes,
    });
  return { error };
}

export async function getCallAttempts(leadId: string) {
  const { data } = await supabase
    .from('call_attempts')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getAttemptCount(leadId: string): Promise<number> {
  const { count } = await supabase
    .from('call_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId);
  return count ?? 0;
}

export async function getTodayLeadsForUser(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data } = await supabase
    .from('leads')
    .select('*')
    .or(`assigned_to.eq.${userId},assigned_to.is.null`)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  return (data ?? []) as Lead[];
}
