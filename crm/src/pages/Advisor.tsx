import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LeadDocuments from '@/components/LeadDocuments';
import EmailButtonsComponent from '@/components/EmailButtons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/hooks/useLeads';
import { deleteLead } from '@/hooks/useLeads';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TaskForm from '@/components/TaskForm';
import TaskList from '@/components/TaskList';
import { useTasks } from '@/hooks/useTasks';
import { NavLink } from '@/components/NavLink';
import UserMenu from '@/components/UserMenu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import GuidedTour from '@/components/GuidedTour';
import { useDemoMode } from '@/hooks/useDemoMode';
import DemoCallDialog from '@/components/DemoCallDialog';

function formatSueldoShort(lead: Lead): string {
  if (lead.sueldo_liquido_raw) {
    const raw = lead.sueldo_liquido_raw.trim();
    const nums = raw.match(/[\d.,]+/g);
    if (nums && nums.length >= 1) {
      const formatted = nums.map(n => {
        const clean = n.replace(/\./g, '').replace(',', '.');
        const val = parseFloat(clean);
        if (isNaN(val)) return n;
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1).replace('.0', '')}MM`;
        if (val >= 1000) return `$${Math.round(val / 1000)}K`;
        return n;
      });
      if (formatted.length >= 2) return `${formatted[0]} a ${formatted[1]}`;
      return `${formatted[0]}`;
    }
    return raw;
  }
  if (lead.sueldo_liquido != null) {
    const v = lead.sueldo_liquido;
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1).replace('.0', '')}MM`;
    if (v >= 1000) return `$${Math.round(v / 1000)}K`;
    return `$${v.toLocaleString('es-CL')}`;
  }
  return '—';
}

const ADVISOR_STATUSES = [
  { key: 'solicitando_documentos', label: 'Solicitando Documentos', emoji: '📋', color: 'bg-primary/15 border-primary/30' },
  { key: 'enviado_a_evaluar', label: 'Enviado a Evaluar', emoji: '📤', color: 'bg-yellow-500/15 border-yellow-500/30' },
  { key: 'aprobado', label: 'Aprobado', emoji: '✅', color: 'bg-green-500/15 border-green-500/30' },
  { key: 'buscando_vivienda', label: 'Buscando Vivienda', emoji: '🏠', color: 'bg-blue-500/15 border-blue-500/30' },
  { key: 'set_hipotecario_firmado', label: 'Set Hipotecario Firmado', emoji: '✍️', color: 'bg-violet-500/15 border-violet-500/30' },
  { key: 'escritura_firmada', label: 'Escritura Firmada', emoji: '📜', color: 'bg-indigo-500/15 border-indigo-500/30' },
  { key: 'cbr_listo', label: 'CBR Listo', emoji: '🎉', color: 'bg-emerald-500/15 border-emerald-500/30' },
  { key: 'rechazado', label: 'Rechazado', emoji: '❌', color: 'bg-red-500/15 border-red-500/30' },
  { key: 'archivado', label: 'Archivado', emoji: '📦', color: 'bg-muted border-muted-foreground/20' },
];

const VISIBLE_STATUSES = ADVISOR_STATUSES.filter(s => s.key !== 'archivado');

function downloadXlsx(leads: Lead[], filename: string) {
  const data = leads.map(l => ({
    'Nombre': l.name,
    'Teléfono': l.phone,
    'Email': l.email || '',
    'RUT': l.rut || '',
    'Sueldo Líquido': l.sueldo_liquido || '',
    'DICOM': l.en_dicom ? 'Sí' : 'No',
    'Fuente': l.source,
    'Estado': ADVISOR_STATUSES.find(s => s.key === l.status)?.label || l.status,
    'Proyecto': l.proyecto || '',
    'UF sin BP': l.uf_sin_bp || '',
    'Fecha Reserva': l.fecha_reserva || '',
    'Mes Cierre': l.mes_cierre || '',
    'Prioridad': l.priority || 'media',
    'Fecha Lead': new Date(l.created_at).toLocaleDateString('es-CL'),
    'Fecha Agendamiento': l.scheduled_at ? new Date(l.scheduled_at).toLocaleDateString('es-CL') : '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

interface LeadNote {
  id: string;
  note: string;
  created_at: string;
  user_id: string;
}

interface ProfileData {
  user_id: string;
  full_name: string;
}

const PIE_COLORS = [
  'hsl(220, 70%, 55%)',
  'hsl(145, 70%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(180, 70%, 45%)',
  'hsl(340, 70%, 55%)',
  'hsl(0, 60%, 50%)',
];

const Advisor = () => {
  const { user, role, signOut, fullName } = useAuth();
  const { isDemo } = useDemoMode();
  const demoDisplayName = isDemo ? 'Martín Soto' : fullName;
  const roleLabel = isDemo ? 'Admin' : role === 'admin' ? 'CEO' : role === 'ejecutiva' ? 'Telemarketing' : role === 'asesor' ? 'Asesor Inmobiliario' : '';
  const [showDemoCall, setShowDemoCall] = useState(false);
  const isAdminOrEjecutiva = role === 'admin' || role === 'ejecutiva';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notes, setNotes] = useState<Record<string, LeadNote[]>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState('');
  const [dragLead, setDragLead] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [advisors, setAdvisors] = useState<ProfileData[]>([]);
  const [allProfiles, setAllProfiles] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [priorityOpenId, setPriorityOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterAdvisor, setFilterAdvisor] = useState('all');
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({ name: '', phone: '', email: '', rut: '', sueldo_liquido_raw: '' });

  // Fetch advisors for reassignment + all profiles for note authors
  const DEMO_ADVISOR_NAMES = ['Alejandro Reyes', 'Camila Fuentes', 'Sebastián Mora', 'Daniela Pinto'];
  const DEMO_PROJECTS = ['Edificio Parque Norte', 'Torre Central', 'Mirador del Valle', 'Alto Las Condes', 'Parque Bicentenario'];

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch advisor role user_ids and sort for deterministic demo name mapping
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'asesor');
      const advisorIds = (roleData ?? []).map(r => r.user_id).sort();

      // Build a stable mapping: sorted real advisor user_id -> demo name
      const advisorDemoMap: Record<string, string> = {};
      advisorIds.forEach((id, i) => {
        advisorDemoMap[id] = DEMO_ADVISOR_NAMES[i % DEMO_ADVISOR_NAMES.length];
      });

      // Fetch all profiles for note author names
      const { data: allP } = await supabase.from('profiles').select('user_id, full_name');
      if (allP) {
        const map: Record<string, string> = {};
        allP.forEach(p => {
          map[p.user_id] = isDemo
            ? (advisorDemoMap[p.user_id] || 'Usuario Demo')
            : p.full_name;
        });
        setAllProfiles(map);
      }

      // Set advisors list for the dropdown
      if (isAdminOrEjecutiva && advisorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', advisorIds);
        const list = ((profiles ?? []) as { user_id: string; full_name: string }[])
          .sort((a, b) => a.user_id.localeCompare(b.user_id));
        if (isDemo) {
          setAdvisors(list.map(a => ({ ...a, full_name: advisorDemoMap[a.user_id] || a.full_name })));
        } else {
          setAdvisors(list);
        }
      }
    };
    fetchAll();

    // Fetch projects list
    supabase.from('projects').select('name').order('name').then(({ data }) => {
      if (isDemo) {
        setProjectsList(DEMO_PROJECTS);
      } else if (data) {
        setProjectsList(data.map(p => p.name));
      }
    });
  }, [isAdminOrEjecutiva, isDemo]);

  const allAdvisorStatuses = ADVISOR_STATUSES.map(s => s.key);

  const isDemoUser = user?.email === 'demo@demo.cl';

  const fetchLeads = useCallback(async () => {
    if (!user || role === null) return;
    let query = supabase
      .from('leads')
      .select('*')
      .eq('is_demo', isDemoUser)
      .in('status', allAdvisorStatuses)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Regular advisors only see their own leads
    if (!isAdminOrEjecutiva) {
      query = query.eq('advisor_id', user.id);
    }

    const { data } = await query;
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }, [user, role, isAdminOrEjecutiva, isDemoUser]);

  const fetchNotes = useCallback(async () => {
    if (!user || leads.length === 0) return;
    const { data } = await supabase
      .from('lead_notes')
      .select('*')
      .in('lead_id', leads.map(l => l.id))
      .order('created_at', { ascending: false });
    const grouped: Record<string, LeadNote[]> = {};
    (data ?? []).forEach((n: any) => {
      if (!grouped[n.lead_id]) grouped[n.lead_id] = [];
      grouped[n.lead_id].push(n);
    });
    setNotes(grouped);
  }, [user, leads]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchNotes(); }, [leads]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('advisor-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_notes' }, () => fetchNotes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads, fetchNotes]);

  const updateStatus = async (leadId: string, newStatus: string) => {
    // Optimistic update — move lead instantly in the UI
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    const label = ADVISOR_STATUSES.find(s => s.key === newStatus)?.label || newStatus;
    toast.success(`Estado actualizado: ${label}`);

    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    if (error) {
      console.error('Error updating status:', error);
      toast.error(`Error al cambiar estado: ${error.message}`);
      // Revert on error
      fetchLeads();
    }
  };

  const sendToTelemarketing = async (leadId: string) => {
    // Recicladora: devuelve el lead a 'reciclado' (para que vuelva a SU vista, no a otras ejecutivas)
    // Otros roles: devuelve a 'new' para la cola general de telemarketing
    const revertStatus = role === 'recicladora' ? 'reciclado' : 'new';
    await supabase
      .from('leads')
      .update({ status: revertStatus, advisor_id: null, last_attempt_at: null })
      .eq('id', leadId);
    toast.success(role === 'recicladora' ? 'Lead devuelto a tu cola de reciclados' : 'Lead devuelto a Telemarketing');
    setSelectedLead(null);
    fetchLeads();
  };

  const reassignAdvisor = async (leadId: string, newAdvisorId: string) => {
    // Optimistic update so dialog + grid stay in sync immediately
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, advisor_id: newAdvisorId } : l));
    setSelectedLead(prev => prev && prev.id === leadId ? { ...prev, advisor_id: newAdvisorId } : prev);

    const { error } = await supabase
      .from('leads')
      .update({ advisor_id: newAdvisorId })
      .eq('id', leadId);

    if (error) {
      console.error('Error reassigning advisor:', error);
      toast.error(`Error al reasignar asesor: ${error.message}`);
      fetchLeads();
      return;
    }

    toast.success('Asesor reasignado');
  };

  const updateLeadFields = async (leadId: string, fields: Partial<Lead>) => {
    await supabase.from('leads').update(fields as any).eq('id', leadId);
    toast.success('Datos actualizados');
    fetchLeads();
  };

  const [savingNote, setSavingNote] = useState(false);

  const addNote = async () => {
    if (!selectedLead || !newNote.trim() || !user || savingNote) return;
    setSavingNote(true);
    await supabase.from('lead_notes').insert({
      lead_id: selectedLead.id,
      user_id: user.id,
      note: newNote.trim(),
    });
    setSavingNote(false);
    setNewNote('');
    fetchNotes();
    toast.success('Nota agregada');
  };

  const handleDeleteLead = async (leadId: string) => {
    const { error } = await deleteLead(leadId);
    if (error) {
      toast.error('Error al eliminar lead');
    } else {
      toast.success('Lead eliminado');
      if (selectedLead?.id === leadId) setSelectedLead(null);
      fetchLeads();
    }
    setDeleteConfirmId(null);
  };


  const updatePriority = async (leadId: string, priority: string) => {
    await supabase.from('leads').update({ priority }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, priority } : l));
  };

  const addNewLead = async () => {
    if (!newLeadData.name.trim() || !newLeadData.phone.trim() || !user) return;
    const { error } = await supabase.from('leads').insert({
      name: newLeadData.name.trim(),
      phone: newLeadData.phone.trim(),
      email: newLeadData.email.trim() || null,
      rut: newLeadData.rut.trim() || null,
      sueldo_liquido_raw: newLeadData.sueldo_liquido_raw.trim() || null,
      source: 'manual',
      status: 'solicitando_documentos',
      advisor_id: user.id,
      assigned_to: user.id,
      is_demo: isDemoUser,
      scheduled_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(`Error al crear negocio: ${error.message}`);
      return;
    }
    toast.success('Negocio creado exitosamente');
    setNewLeadData({ name: '', phone: '', email: '', rut: '', sueldo_liquido_raw: '' });
    setShowAddLead(false);
    fetchLeads();
  };

  const handleDragStart = (leadId: string, e: React.DragEvent) => {
    setDragLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnColumn = (status: string) => {
    if (dragLead) {
      const lead = leads.find(l => l.id === dragLead);
      if (lead && lead.status !== status) {
        updateStatus(dragLead, status);
      }
      setDragLead(null);
    }
  };

  const handleDropOnLead = async (targetLeadId: string, status: string) => {
    if (!dragLead || dragLead === targetLeadId) return;
    const sourceLead = leads.find(l => l.id === dragLead);
    if (!sourceLead) return;

    // Optimistic: compute new order and update UI instantly
    const columnLeads = leads
      .filter(l => l.status === status && l.id !== dragLead)
      .sort((a, b) => a.sort_order - b.sort_order);
    const targetIndex = columnLeads.findIndex(l => l.id === targetLeadId);
    columnLeads.splice(targetIndex, 0, { ...sourceLead, status });

    // Apply optimistic state
    const newOrderMap = new Map(columnLeads.map((l, i) => [l.id, i]));
    setLeads(prev => prev.map(l => {
      if (l.id === dragLead) return { ...l, status, sort_order: newOrderMap.get(l.id) ?? l.sort_order };
      if (newOrderMap.has(l.id)) return { ...l, sort_order: newOrderMap.get(l.id)! };
      return l;
    }));
    setDragLead(null);

    // Persist in background
    if (sourceLead.status !== status) {
      await supabase.from('leads').update({ status }).eq('id', dragLead);
    }
    const updates = columnLeads.map((l, i) =>
      supabase.from('leads').update({ sort_order: i }).eq('id', l.id)
    );
    await Promise.all(updates);
  };

  // Filter leads: archived toggle, advisor filter, month filter, then search
  const baseLeads = showArchived ? leads : leads.filter(l => l.status !== 'archivado');
  const advisorFilteredLeads = filterAdvisor === 'all'
    ? baseLeads
    : baseLeads.filter(l => l.advisor_id === filterAdvisor);
  const monthFilteredLeads = filterMonth === 'all'
    ? advisorFilteredLeads
    : advisorFilteredLeads.filter(l => {
        if (!l.scheduled_at) return false;
        const d = new Date(l.scheduled_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === filterMonth;
      });
  const visibleLeads = searchQuery.trim()
    ? monthFilteredLeads.filter(l => {
        const q = searchQuery.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          (l.email && l.email.toLowerCase().includes(q))
        );
      })
    : monthFilteredLeads;
  const kanbanStatuses = showArchived ? ADVISOR_STATUSES : VISIBLE_STATUSES;

  // Available months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    leads.forEach(l => {
      if (l.scheduled_at) {
        const d = new Date(l.scheduled_at);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [leads]);

  const priorityOrder: Record<string, number> = { alta: 0, media: 1, baja: 2 };
  const getLeadsByStatus = (status: string) => visibleLeads
    .filter(l => l.status === status)
    .sort((a, b) => {
      const dateA = a.scheduled_at || a.status_changed_at || a.created_at;
      const dateB = b.scheduled_at || b.status_changed_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  // My leads (for stats - only non-archived, respecting advisor filter)
  const myLeadsBase = isAdminOrEjecutiva
    ? leads.filter(l => l.status !== 'archivado')
    : leads.filter(l => l.advisor_id === user?.id && l.status !== 'archivado');
  const myLeads = filterAdvisor === 'all'
    ? myLeadsBase
    : myLeadsBase.filter(l => l.advisor_id === filterAdvisor);

  // Month-filtered leads for stats
  const myLeadsFiltered = useMemo(() => {
    if (filterMonth === 'all') return myLeads;
    return myLeads.filter(l => {
      // Use scheduled_at or created_at for month matching
      const ref = l.scheduled_at || l.created_at;
      if (!ref) return false;
      const d = new Date(ref);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === filterMonth;
    });
  }, [myLeads, filterMonth]);

  // Stats data
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    myLeadsFiltered.forEach(l => {
      const label = ADVISOR_STATUSES.find(s => s.key === l.status)?.label || l.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [myLeadsFiltered]);

  // Reservas por mes
  const reservasPorMes = useMemo(() => {
    const map: Record<string, { count: number; uf: number }> = {};
    myLeadsFiltered.filter(l => l.fecha_reserva).forEach(l => {
      const mes = format(parseISO(l.fecha_reserva!), 'MMM yyyy', { locale: es });
      if (!map[mes]) map[mes] = { count: 0, uf: 0 };
      map[mes].count++;
      map[mes].uf += (l.uf_sin_bp ?? 0);
    });
    return Object.entries(map).map(([mes, v]) => ({ mes, cantidad: v.count, uf: v.uf }));
  }, [myLeadsFiltered]);

  // Cierres por mes
  const cierresPorMes = useMemo(() => {
    const map: Record<string, { count: number; uf: number }> = {};
    myLeadsFiltered.filter(l => l.status === 'cierres' && l.mes_cierre).forEach(l => {
      const mes = l.mes_cierre!;
      if (!map[mes]) map[mes] = { count: 0, uf: 0 };
      map[mes].count++;
      map[mes].uf += (l.uf_sin_bp ?? 0);
    });
    return Object.entries(map).map(([mes, v]) => ({ mes, cantidad: v.count, uf: v.uf }));
  }, [myLeadsFiltered]);

  const getMonthLabel = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM yyyy', { locale: es });
    } catch { return '—'; }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-bold">Cargando leads...</p>
      </div>
    );
  }

  if (showStats) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar
        role={role}
        signOut={signOut}
        displayName={demoDisplayName}
        email={user?.email ?? ''}
        roleLabel={roleLabel}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        showStats={showStats}
        setShowStats={setShowStats}
        leadsCount={myLeads.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        allLeads={visibleLeads}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
        availableMonths={availableMonths}
        isAdminOrEjecutiva={isAdminOrEjecutiva}
        advisors={advisors}
        filterAdvisor={filterAdvisor}
        setFilterAdvisor={setFilterAdvisor}
        onAddLead={() => setShowAddLead(true)}
      />
        <div className="p-6 space-y-6">
          <h2 className="text-xl font-black text-foreground">📊 Resumen de Asesorías</h2>
          <p className="text-sm text-muted-foreground">{myLeadsFiltered.length} leads {filterAdvisor !== 'all' ? `• Asesor: ${allProfiles[filterAdvisor] || ''}` : ''} {filterMonth !== 'all' ? `• Mes: ${filterMonth}` : ''}</p>

          {/* Pie chart - leads por estado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-foreground">Leads por Estado ({myLeadsFiltered.length} total)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Reservas por mes */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-foreground">Reservas por Mes</h3>
              {reservasPorMes.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">Sin reservas aún</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reservasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis dataKey="mes" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }} />
                    <Bar dataKey="cantidad" fill="hsl(180, 70%, 45%)" radius={[4, 4, 0, 0]} name="Cantidad" />
                    <Bar dataKey="uf" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="UF Totales" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Cierres por mes */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-foreground">Cierres por Mes</h3>
            {cierresPorMes.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Sin cierres aún</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cierresPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                  <XAxis dataKey="mes" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }} />
                  <Bar dataKey="cantidad" fill="hsl(145, 70%, 45%)" radius={[4, 4, 0, 0]} name="Cantidad Cierres" />
                  <Bar dataKey="uf" fill="hsl(340, 70%, 55%)" radius={[4, 4, 0, 0]} name="UF Cerradas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Reservas y Cierres por Proyecto */}
          {(() => {
            const projectReservas: Record<string, { count: number; uf: number }> = {};
            const projectCierres: Record<string, { count: number; uf: number }> = {};
            myLeadsFiltered.filter(l => l.proyecto && (l.status === 'departamento_reservado' || l.status === 'cierres')).forEach(l => {
              const p = l.proyecto!;
              if (l.status === 'departamento_reservado' || l.status === 'cierres') {
                if (!projectReservas[p]) projectReservas[p] = { count: 0, uf: 0 };
                projectReservas[p].count++;
                projectReservas[p].uf += (l.uf_sin_bp ?? 0);
              }
              if (l.status === 'cierres') {
                if (!projectCierres[p]) projectCierres[p] = { count: 0, uf: 0 };
                projectCierres[p].count++;
                projectCierres[p].uf += (l.uf_sin_bp ?? 0);
              }
            });
            const projectData = [...new Set([...Object.keys(projectReservas), ...Object.keys(projectCierres)])].sort().map(p => ({
              proyecto: p,
              reservas: projectReservas[p]?.count ?? 0,
              ufReservas: projectReservas[p]?.uf ?? 0,
              cierres: projectCierres[p]?.count ?? 0,
              ufCierres: projectCierres[p]?.uf ?? 0,
            }));

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 text-foreground">🏗️ Reservas y Cierres por Proyecto</h3>
                  {projectData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">Sin datos por proyecto</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={projectData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                        <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                        <YAxis type="category" dataKey="proyecto" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} width={120} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }} />
                        <Legend />
                        <Bar dataKey="reservas" fill="hsl(220, 70%, 55%)" radius={[0, 4, 4, 0]} name="Reservas" />
                        <Bar dataKey="cierres" fill="hsl(145, 70%, 45%)" radius={[0, 4, 4, 0]} name="Cierres" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 text-foreground">💰 UF por Proyecto</h3>
                  {projectData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">Sin datos por proyecto</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={projectData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                        <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                        <YAxis type="category" dataKey="proyecto" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} width={120} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }} />
                        <Legend />
                        <Bar dataKey="ufReservas" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} name="UF Reservadas" />
                        <Bar dataKey="ufCierres" fill="hsl(340, 70%, 55%)" radius={[0, 4, 4, 0]} name="UF Cerradas" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        role={role}
        signOut={signOut}
        displayName={demoDisplayName}
        email={user?.email ?? ''}
        roleLabel={roleLabel}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        showStats={showStats}
        setShowStats={setShowStats}
        leadsCount={myLeads.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        allLeads={visibleLeads}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
        availableMonths={availableMonths}
        isAdminOrEjecutiva={isAdminOrEjecutiva}
        advisors={advisors}
        filterAdvisor={filterAdvisor}
        setFilterAdvisor={setFilterAdvisor}
        onAddLead={() => setShowAddLead(true)}
      />

      {/* Kanban Board */}
      <div data-tour="kanban-board" className={`grid gap-4 p-4 h-[calc(100vh-60px)]`} style={{ gridTemplateColumns: `repeat(${kanbanStatuses.length}, minmax(0, 1fr))` }}>
        {kanbanStatuses.map(status => (
          <div
            key={status.key}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDropOnColumn(status.key)}
            className={`flex flex-col rounded-xl border-2 ${status.color} overflow-hidden`}
          >
            <div className="p-3 border-b border-border/30 flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">
                {status.emoji} {status.label}
              </h3>
              <div className="flex items-center gap-1.5">
                {getLeadsByStatus(status.key).length > 0 && (
                  <button
                    onClick={() => downloadXlsx(getLeadsByStatus(status.key), `leads-${status.key}`)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                    title={`Descargar ${status.label} en XLSX`}
                  >
                    📥
                  </button>
                )}
                <span className="px-2 py-0.5 rounded-full bg-background text-xs font-bold text-foreground">
                  {getLeadsByStatus(status.key).length}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {getLeadsByStatus(status.key).map(lead => (
                <div
                  key={lead.id}
                  data-tour={getLeadsByStatus(status.key).indexOf(lead) === 0 && status.key === kanbanStatuses[0]?.key ? 'kanban-card' : undefined}
                  draggable
                  onDragStart={(e) => handleDragStart(lead.id, e)}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.stopPropagation(); handleDropOnLead(lead.id, status.key); }}
                  onClick={() => setSelectedLead(lead)}
                  className="p-3 bg-card rounded-lg border border-border cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all space-y-1 relative group"
                >
                  {/* Priority + Name row */}
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground text-sm truncate flex-1">{lead.name}</p>
                    <Popover open={priorityOpenId === lead.id} onOpenChange={(open) => setPriorityOpenId(open ? lead.id : null)}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={e => e.stopPropagation()}
                          title="Clic para cambiar prioridad"
                          className={`group relative w-4 h-4 rounded-full border-2 ml-2 transition-all hover:scale-125 ${
                            lead.priority === 'alta' ? 'bg-green-500 border-green-700' :
                            lead.priority === 'baja' ? 'bg-red-500 border-red-700' :
                            'bg-background border-muted-foreground/40 hover:border-primary'
                          }`}
                        >
                          {lead.priority === 'media' && (
                            <span className="absolute inset-0 flex items-center justify-center text-[7px] text-muted-foreground group-hover:text-primary transition-colors">✎</span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" side="left" align="start" onClick={e => e.stopPropagation()}>
                        <p className="text-xs text-muted-foreground mb-2 px-1">Selecciona prioridad:</p>
                        <div className="flex flex-col gap-1.5">
                          {([
                            { key: 'alta', color: 'bg-green-500', label: '🟢 Alta' },
                            { key: 'media', color: 'bg-background', label: '⚪ Media (sin asignar)' },
                            { key: 'baja', color: 'bg-red-500', label: '🔴 Baja' },
                          ] as const).map(p => (
                            <button
                              key={p.key}
                              onClick={() => { updatePriority(lead.id, p.key); setPriorityOpenId(null); }}
                              className={`text-left text-sm px-3 py-1.5 rounded-md transition-colors hover:bg-accent ${
                                lead.priority === p.key ? 'font-bold bg-accent' : ''
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{lead.phone}</p>
                  {(lead.sueldo_liquido_raw || lead.sueldo_liquido != null) && (
                    <p className="text-xs text-muted-foreground">
                      💰 {formatSueldoShort(lead)}
                    </p>
                  )}
                  {lead.rut && (
                    <p className="text-xs text-muted-foreground">🪪 {lead.rut}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">📣 {lead.source}</p>
                  {lead.scheduled_at && (
                    <p className="text-[10px] text-primary/80 font-semibold">
                      🗓️ Agendado: {new Date(lead.scheduled_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {lead.proyecto && (
                    <p className="text-xs text-muted-foreground truncate">🏗️ {lead.proyecto}</p>
                  )}
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    {lead.fecha_reserva && (
                      <span>📅 Res: {getMonthLabel(lead.fecha_reserva)}</span>
                    )}
                    {lead.mes_cierre && (
                      <span>🎯 Cierre: {lead.mes_cierre}</span>
                    )}
                  </div>
                  {/* Advisor name (admin/ejecutiva only) */}
                  {isAdminOrEjecutiva && lead.advisor_id && allProfiles[lead.advisor_id] && (
                    <p className="text-[10px] text-primary font-semibold truncate">
                      👤 {allProfiles[lead.advisor_id]}
                    </p>
                  )}
                  {/* Days since last status change */}
                  {(() => {
                    const ref = lead.status_changed_at || lead.last_attempt_at || lead.created_at;
                    const days = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
                    const colorClass = days >= 7 ? 'text-red-500 font-bold' : days >= 3 ? 'text-yellow-500 font-semibold' : 'text-muted-foreground';
                    return (
                      <p className={`text-[10px] ${colorClass}`}>
                        ⏱️ {days}d sin movimiento
                      </p>
                    );
                  })()}
                  {(lead as any).no_califica && (
                    <p className="text-[10px] font-bold text-destructive bg-destructive/10 rounded px-1.5 py-0.5 inline-block">
                      🚫 No Califica
                    </p>
                  )}
                  {notes[lead.id]?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      📝 {notes[lead.id].length} nota{notes[lead.id].length > 1 ? 's' : ''}
                    </p>
                  )}
                  {/* Archive / Delete buttons */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(lead.id);
                        }}
                        className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    )}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (lead.status === 'archivado') {
                          // Restore previous status
                          const restoreTo = lead.previous_status || 'asesoria_agendada';
                          await supabase.from('leads').update({ status: restoreTo, previous_status: null }).eq('id', lead.id);
                          toast.success(`Desarchivado → ${ADVISOR_STATUSES.find(s => s.key === restoreTo)?.label || restoreTo}`);
                          fetchLeads();
                        } else {
                          // Archive: save current status
                          await supabase.from('leads').update({ status: 'archivado', previous_status: lead.status }).eq('id', lead.id);
                          toast.success('Archivado');
                          fetchLeads();
                        }
                      }}
                      className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      title={lead.status === 'archivado' ? 'Desarchivar' : 'Archivar'}
                    >
                      {lead.status === 'archivado' ? '📤' : '📦'}
                    </button>
                  </div>
                </div>
              ))}
              {getLeadsByStatus(status.key).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Arrastra leads aquí
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pb-6">
          <DialogHeader>
            <DialogTitle className="text-xl">👤 {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <LeadDetailContent
              lead={selectedLead}
              notes={notes[selectedLead.id] ?? []}
              newNote={newNote}
              setNewNote={setNewNote}
              addNote={addNote}
              savingNote={savingNote}
              updateStatus={updateStatus}
              isAdminOrEjecutiva={isAdminOrEjecutiva}
              advisors={advisors}
              reassignAdvisor={reassignAdvisor}
              updateLeadFields={updateLeadFields}
              setSelectedLead={setSelectedLead}
              allProfiles={allProfiles}
              role={role}
              sendToTelemarketing={sendToTelemarketing}
              projectsList={projectsList}
              onDeleteNote={async (noteId: string) => {
                await supabase.from('lead_notes').delete().eq('id', noteId);
                fetchNotes();
              }}
              onEditNote={async (noteId: string, newText: string) => {
                await supabase.from('lead_notes').update({ note: newText }).eq('id', noteId);
                fetchNotes();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🗑️ ¿Estás seguro que quieres eliminar este lead?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará permanentemente el lead y todos sus datos asociados. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-bold hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button onClick={() => deleteConfirmId && handleDeleteLead(deleteConfirmId)} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors">
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>➕ Nuevo Negocio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase">Nombre *</label>
              <input
                type="text"
                value={newLeadData.name}
                onChange={e => setNewLeadData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del cliente"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">Teléfono *</label>
              <input
                type="tel"
                value={newLeadData.phone}
                onChange={e => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">Email</label>
              <input
                type="email"
                value={newLeadData.email}
                onChange={e => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="correo@ejemplo.cl"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">RUT</label>
              <input
                type="text"
                value={newLeadData.rut}
                onChange={e => setNewLeadData(prev => ({ ...prev, rut: e.target.value }))}
                placeholder="12.345.678-9"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">Sueldo Líquido</label>
              <input
                type="text"
                value={newLeadData.sueldo_liquido_raw}
                onChange={e => setNewLeadData(prev => ({ ...prev, sueldo_liquido_raw: e.target.value }))}
                placeholder="$800.000 a $1.200.000"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddLead(false)}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addNewLead}
                disabled={!newLeadData.name.trim() || !newLeadData.phone.trim()}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                Crear Negocio
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GuidedTour page="advisor" isDemo={isDemo} />
    </div>
  );
};

// ---- Top Bar ----
function TopBar({
  role, signOut, displayName, email, roleLabel, showArchived, setShowArchived, showStats, setShowStats, leadsCount, searchQuery, setSearchQuery, allLeads, filterMonth, setFilterMonth, availableMonths,
  isAdminOrEjecutiva, advisors, filterAdvisor, setFilterAdvisor, onAddLead,
}: {
  role: string | null; signOut: () => void;
  displayName: string; email: string; roleLabel: string;
  showArchived: boolean; setShowArchived: (v: boolean) => void;
  showStats: boolean; setShowStats: (v: boolean) => void;
  leadsCount: number;
  searchQuery?: string; setSearchQuery?: (v: string) => void;
  allLeads?: Lead[];
  filterMonth?: string; setFilterMonth?: (v: string) => void;
  availableMonths?: string[];
  isAdminOrEjecutiva?: boolean;
  advisors?: ProfileData[];
  filterAdvisor?: string; setFilterAdvisor?: (v: string) => void;
  onAddLead?: () => void;
}) {
  return (
    <div className="px-4 py-2 border-b border-border bg-card space-y-2">
      {/* Row 1: Title + Nav + User */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏠</span>
          <h1 className="text-lg font-black text-foreground">ASESORÍAS</h1>
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
            {leadsCount}
          </span>
          {onAddLead && (
            <button
              onClick={onAddLead}
              className="text-xs px-2 py-1 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
            >
              ➕ Nuevo
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            data-tour="stats-toggle"
            onClick={() => setShowStats(!showStats)}
            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${showStats ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            📊 {showStats ? 'Kanban' : 'Stats'}
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${showArchived ? 'bg-muted-foreground/20 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            📦 {showArchived ? 'Ocultar' : 'Archivados'}
          </button>
          {allLeads && allLeads.length > 0 && !showStats && (
            <button
              data-tour="export-button"
              onClick={() => downloadXlsx(allLeads, 'leads-todos')}
              className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors font-bold"
            >
              📥 Excel
            </button>
          )}
          {showStats && (
            <button
              onClick={() => window.print()}
              className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors font-bold"
            >
              📄 PDF
            </button>
          )}
          {(role === 'admin' || role === 'ejecutiva') && (
            <NavLink to="/executive" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ejecutiva
            </NavLink>
          )}
          {role === 'admin' && (
            <>
              <NavLink to="/admin" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </NavLink>
              <NavLink to="/backoffice" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Backoffice
              </NavLink>
            </>
          )}
          <UserMenu fullName={displayName} email={email} roleLabel={roleLabel} onSignOut={signOut} />
        </div>
      </div>
      {/* Row 2: Filters */}
      {!showStats && (
        <div className="flex items-center gap-2 flex-wrap">
          {setSearchQuery && (
            <input
              data-tour="search-filter"
              type="text"
              value={searchQuery ?? ''}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 Buscar..."
              className="px-2 py-1 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-48"
            />
          )}
          {setFilterMonth && availableMonths && (
            <select
              value={filterMonth ?? 'all'}
              onChange={e => setFilterMonth(e.target.value)}
              className="px-2 py-1 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">📅 Todos los meses</option>
              {availableMonths.map(m => {
                const [y, mo] = m.split('-');
                const d = new Date(parseInt(y), parseInt(mo) - 1);
                const label = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
              })}
            </select>
          )}
          {isAdminOrEjecutiva && setFilterAdvisor && advisors && advisors.length > 0 && (
            <select
              value={filterAdvisor ?? 'all'}
              onChange={e => setFilterAdvisor(e.target.value)}
              className="px-2 py-1 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">👤 Todos los asesores</option>
              {advisors.map(a => (
                <option key={a.user_id} value={a.user_id}>{a.full_name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Editable Note for Advisor view ----
function AdvisorEditableNote({ note, authorName, isOwn, canDelete, onDelete, onSave }: {
  note: { id: string; user_id: string; note: string; created_at: string };
  authorName: string;
  isOwn: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onSave: (newText: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.note);

  return (
    <div className="px-3 py-2 bg-muted rounded-lg text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-primary">{authorName}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(note.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && !editing && (
            <button onClick={() => { setEditText(note.note); setEditing(true); }} className="text-[10px] text-muted-foreground hover:text-foreground" title="Editar nota">✏️</button>
          )}
          {canDelete && !editing && (
            <button onClick={onDelete} className="text-[10px] text-destructive hover:text-destructive/80" title="Eliminar nota">🗑️</button>
          )}
        </div>
      </div>
      {editing ? (
        <div className="space-y-1">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            className="w-full px-2 py-1 rounded border border-border bg-background text-sm text-foreground resize-y min-h-[40px]"
            autoFocus
          />
          <div className="flex gap-1 justify-end">
            <button onClick={() => setEditing(false)} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Cancelar</button>
            <button
              onClick={async () => { await onSave(editText.trim()); setEditing(false); }}
              disabled={!editText.trim()}
              className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
            >Guardar</button>
          </div>
        </div>
      ) : (
        <p className={`text-foreground whitespace-pre-wrap break-words ${isOwn ? 'cursor-pointer' : ''}`} onClick={isOwn ? () => { setEditText(note.note); setEditing(true); } : undefined}>{note.note}</p>
      )}
    </div>
  );
}

// ---- Lead Detail Content ----
function LeadDetailContent({
  lead, notes, newNote, setNewNote, addNote, savingNote, updateStatus,
  isAdminOrEjecutiva, advisors, reassignAdvisor, updateLeadFields, setSelectedLead,
  allProfiles, role, sendToTelemarketing, projectsList, onDeleteNote, onEditNote,
}: {
  lead: Lead; notes: LeadNote[]; newNote: string; setNewNote: (v: string) => void;
  addNote: () => void; savingNote: boolean; updateStatus: (id: string, status: string) => void;
  isAdminOrEjecutiva: boolean; advisors: ProfileData[];
  reassignAdvisor: (id: string, advisorId: string) => void;
  updateLeadFields: (id: string, fields: Partial<Lead>) => void;
  setSelectedLead: (l: Lead | null) => void;
  allProfiles: Record<string, string>;
  role: string | null;
  sendToTelemarketing: (id: string) => void;
  projectsList: string[];
  onDeleteNote: (noteId: string) => void;
  onEditNote: (noteId: string, newText: string) => Promise<void>;
}) {
  const canEditAdvisorFields = role === 'admin' || role === 'asesor';
  const [ufSinBp, setUfSinBp] = useState(lead.uf_sin_bp?.toString() ?? '');
  const [proyecto, setProyecto] = useState(lead.proyecto ?? '');
  const [fechaReserva, setFechaReserva] = useState(lead.fecha_reserva ?? '');
  const [mesCierre, setMesCierre] = useState(lead.mes_cierre ?? '');
  const [confirmTelemarketing, setConfirmTelemarketing] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const taskFormAnchorRef = useRef<HTMLDivElement>(null);
  const [noCalifica, setNoCalifica] = useState(lead.no_califica ?? false);
  const [showNoCalificaPopup, setShowNoCalificaPopup] = useState(false);
  const [noCalificaRazon, setNoCalificaRazon] = useState(lead.no_califica_razon ?? '');
  const [noCalificaOtroTexto, setNoCalificaOtroTexto] = useState('');

  const NO_CALIFICA_REASONS = [
    { key: 'dicom', label: 'DICOM', emoji: '🚫' },
    { key: 'renta', label: 'Renta insuficiente', emoji: '💰' },
    { key: 'endeudamiento', label: 'Endeudamiento', emoji: '📊' },
    { key: 'antiguedad_laboral', label: 'Antigüedad laboral', emoji: '🕐' },
    { key: 'sin_empleo', label: 'Sin empleo', emoji: '👤' },
  ];

  const handleSetNoCalifica = async (razon: string) => {
    setNoCalifica(true);
    setNoCalificaRazon(razon);
    setShowNoCalificaPopup(false);
    setNoCalificaOtroTexto('');
    await supabase.from('leads').update({ no_califica: true, no_califica_razon: razon } as any).eq('id', lead.id);
    toast.success('Marcado como No Califica');
  };

  const handleClearNoCalifica = async () => {
    setNoCalifica(false);
    setNoCalificaRazon('');
    await supabase.from('leads').update({ no_califica: false, no_califica_razon: null } as any).eq('id', lead.id);
    toast.success('Calificación restablecida');
  };

  const { user: currentUser, role: currentRole } = useAuth();
  const { isDemo } = useDemoMode();
  const [showDemoCall, setShowDemoCall] = useState(false);
  const { tasks, createTask, completeTask, deleteTask } = useTasks(currentUser?.id);
  const leadTasks = tasks.filter(t => t.lead_id === lead.id);

  const saveFields = () => {
    updateLeadFields(lead.id, {
      uf_sin_bp: ufSinBp ? parseFloat(ufSinBp) : null,
      proyecto: proyecto || null,
      fecha_reserva: fechaReserva || null,
      mes_cierre: mesCierre || null,
    } as any);
  };

  useEffect(() => {
    if (!showTaskForm) return;

    let rafA = 0;
    let rafB = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    rafA = requestAnimationFrame(() => {
      rafB = requestAnimationFrame(() => {
        taskFormAnchorRef.current?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'end',
          inline: 'nearest',
        });
      });
    });

    return () => {
      cancelAnimationFrame(rafA);
      cancelAnimationFrame(rafB);
    };
  }, [showTaskForm]);

  return (
    <div className="space-y-4">
      {/* Email Buttons — prominent at top */}
      {lead.email && (
        <EmailButtonsComponent leadId={lead.id} leadEmail={lead.email} />
      )}

      {/* Lead Info Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-secondary/50 rounded-lg text-sm">
        <DetailItem label="Teléfono" value={lead.phone} />
        <DetailItem label="Email" value={lead.email || '—'} />
        <DetailItem label="RUT" value={lead.rut || '—'} />
        <DetailItem label="Sueldo Líquido" value={formatSueldoShort(lead)} />
        <DetailItem label="DICOM" value={lead.en_dicom ? '⚠️ Sí' : '✅ No'} />
        <DetailItem label="Fuente" value={lead.source} />
        <DetailItem label="Fecha Lead" value={new Date(lead.created_at).toLocaleDateString('es-CL')} />
        <DetailItem label="Estado" value={ADVISOR_STATUSES.find(s => s.key === lead.status)?.label || lead.status} />
      </div>

      {/* No Califica Section */}
      <div className="p-4 rounded-lg border-2 transition-colors relative"
        style={{
          borderColor: noCalifica ? 'hsl(0, 60%, 50%)' : 'hsl(var(--border))',
          backgroundColor: noCalifica ? 'hsl(0, 60%, 50%, 0.06)' : 'transparent',
        }}
      >
        {!noCalifica ? (
          <button
            onClick={() => setShowNoCalificaPopup(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-destructive/30 text-destructive/70 text-sm font-bold hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            ✋ Marcar como No Califica
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🚫</span>
                <span className="text-sm font-bold text-destructive">No Califica</span>
              </div>
              <button
                onClick={handleClearNoCalifica}
                className="text-xs px-2 py-1 rounded-md bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                ↩️ Revertir
              </button>
            </div>
            <p className="text-sm text-foreground/80 bg-background/60 rounded-md px-3 py-2">
              <span className="font-semibold">Razón:</span>{' '}
              {NO_CALIFICA_REASONS.find(r => r.key === noCalificaRazon)?.label || noCalificaRazon}
            </p>
          </div>
        )}

        {/* No Califica Reason Popup */}
        <Dialog open={showNoCalificaPopup} onOpenChange={setShowNoCalificaPopup}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg">🚫 ¿Por qué no califica?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Selecciona el motivo por el cual este lead no califica:</p>
            <div className="space-y-2 mt-2">
              {NO_CALIFICA_REASONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleSetNoCalifica(r.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-background hover:bg-destructive/5 hover:border-destructive/40 text-left transition-all group"
                >
                  <span className="text-lg">{r.emoji}</span>
                  <span className="text-sm font-semibold text-foreground group-hover:text-destructive transition-colors">{r.label}</span>
                </button>
              ))}
              {/* Otro */}
              <div className="border border-border rounded-lg p-3 space-y-2 bg-background">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="text-lg">✏️</span> Otro motivo
                </p>
                <input
                  type="text"
                  value={noCalificaOtroTexto}
                  onChange={e => setNoCalificaOtroTexto(e.target.value)}
                  placeholder="Especifica el motivo..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => noCalificaOtroTexto.trim() && handleSetNoCalifica(noCalificaOtroTexto.trim())}
                  disabled={!noCalificaOtroTexto.trim()}
                  className="w-full py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-bold disabled:opacity-40 hover:bg-destructive/90 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
        <div>
          <label className="text-xs text-muted-foreground uppercase">UF sin BP</label>
          <input type="number" step="0.01" value={ufSinBp} onChange={e => setUfSinBp(e.target.value)}
            disabled={!canEditAdvisorFields}
            className={`w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground ${!canEditAdvisorFields ? 'opacity-50 cursor-not-allowed' : ''}`} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase">Proyecto</label>
          <Select value={proyecto || '__none__'} onValueChange={v => setProyecto(v === '__none__' ? '' : v)}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Seleccionar proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Sin proyecto —</SelectItem>
              {projectsList.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase">Fecha Reserva</label>
          <input type="date" value={fechaReserva} onChange={e => setFechaReserva(e.target.value)}
            disabled={!canEditAdvisorFields}
            className={`w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground ${!canEditAdvisorFields ? 'opacity-50 cursor-not-allowed' : ''}`} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase">Mes Cierre</label>
          <Select value={mesCierre} onValueChange={setMesCierre} disabled={!canEditAdvisorFields}>
            <SelectTrigger className={`w-full mt-1 ${!canEditAdvisorFields ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                const options: { value: string; label: string }[] = [];
                const now = new Date();
                for (let i = 0; i < 18; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                  const value = format(d, 'MMM yyyy', { locale: es });
                  const label = format(d, 'MMMM yyyy', { locale: es });
                  options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
                }
                return options.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <button onClick={saveFields} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
            💾 Guardar campos
          </button>
        </div>
      </div>

      {/* Reassign advisor (admin/ejecutiva only) */}
      {isAdminOrEjecutiva && advisors.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <label className="text-xs text-muted-foreground uppercase mb-2 block">Reasignar asesor</label>
          <Select
            value={lead.advisor_id || ''}
            onValueChange={(val) => reassignAdvisor(lead.id, val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar asesor" />
            </SelectTrigger>
            <SelectContent>
              {advisors.map(a => (
                <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Phone Display */}
      <div className="w-full py-3 rounded-xl text-center text-lg font-black bg-muted border border-border">
        📞 {lead.phone}
      </div>

      {/* Status Change */}
      <div className="grid grid-cols-2 gap-2">
        {ADVISOR_STATUSES.filter(s => s.key !== lead.status).map(s => (
          <button
            key={s.key}
            onClick={() => {
              updateStatus(lead.id, s.key);
              setSelectedLead({ ...lead, status: s.key });
            }}
            className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all hover:scale-105 ${s.color}`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Devolver a Telemarketing */}
      <div className="pt-2 border-t border-border">
        {!confirmTelemarketing ? (
          <button
            onClick={() => setConfirmTelemarketing(true)}
            className="w-full py-2.5 rounded-lg border-2 border-warning/40 bg-warning/10 text-warning text-sm font-bold hover:bg-warning/20 transition-all"
          >
            📞 Devolver a Telemarketing
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-warning font-bold text-center">⚠️ El lead volverá a la cola de la ejecutiva como nuevo. ¿Confirmar?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmTelemarketing(false)}
                className="flex-1 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => sendToTelemarketing(lead.id)}
                className="flex-1 py-2 rounded-lg bg-warning text-warning-foreground text-xs font-bold hover:bg-warning/90 transition-all"
              >
                ✅ Sí, devolver
              </button>
            </div>
          </div>
        )}
      </div>


      <div className="space-y-3">
        <h4 className="font-bold text-foreground text-sm">📝 Notas</h4>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Escribe una nota sobre este lead..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <button
          onClick={addNote}
          disabled={!newNote.trim() || savingNote}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-all"
        >
          {savingNote ? '⏳ Guardando...' : 'Guardar nota'}
        </button>
        <div className="space-y-2 max-h-60 overflow-auto">
          {notes.map(n => {
            const isOwn = n.user_id === currentUser?.id;
            return (
              <AdvisorEditableNote
                key={n.id}
                note={n}
                authorName={allProfiles[n.user_id] || 'Usuario'}
                isOwn={isOwn}
                canDelete={currentRole === 'admin' || currentRole === 'ejecutiva' || isOwn}
                onDelete={() => onDeleteNote(n.id)}
                onSave={(newText) => onEditNote(n.id, newText)}
              />
            );
          })}
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Sin notas aún</p>
          )}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-foreground text-sm">📋 Tareas</h4>
          <button
            onClick={() => setShowTaskForm(prev => !prev)}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
          >
            {showTaskForm ? '✕ Cerrar' : '+ Nueva Tarea'}
          </button>
        </div>
        <div ref={taskFormAnchorRef} className="scroll-mb-10 pb-2">
          {showTaskForm && currentUser && (
            <TaskForm
              leadId={lead.id}
              leadName={lead.name}
              userId={currentUser.id}
              isAdmin={currentRole === 'admin'}
              onSubmit={createTask}
              onCancel={() => setShowTaskForm(false)}
            />
          )}
        </div>
        <TaskList
          tasks={leadTasks}
          onComplete={completeTask}
          onDelete={deleteTask}
          compact
        />
      </div>

      {/* Gestor Documental */}
      <div className="border-t border-border pt-4 mt-4">
        <LeadDocuments leadId={lead.id} />
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

export default Advisor;
