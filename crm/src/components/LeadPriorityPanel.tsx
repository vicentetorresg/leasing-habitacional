import { useState, useEffect, useCallback, useRef } from 'react';
import LeadDocuments from '@/components/LeadDocuments';
import type { Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeadNote {
  id: string;
  note: string;
  created_at: string;
  user_id: string;
}

interface NoteWithAuthor extends LeadNote {
  author_name?: string;
}
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TaskForm from '@/components/TaskForm';
import TaskList from '@/components/TaskList';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import DemoCallDialog from '@/components/DemoCallDialog';
import EmailButtons from '@/components/EmailButtons';

/** Call dialog with editable lead fields */
function CallDialogContent({ lead, user, onClose, onLeadUpdated, onNoteSaved }: {
  lead: Lead;
  user: { id: string } | null;
  onClose: (realized: boolean) => void;
  onLeadUpdated?: () => void;
  onNoteSaved?: (note: NoteWithAuthor) => void;
}) {
  const callDialogNotesRef = useRef('');
  const callDialogTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasCallDialogNotes, setHasCallDialogNotes] = useState(false);
  const [editName, setEditName] = useState(lead.name);
  const [editPhone, setEditPhone] = useState(lead.phone);
  const [editEmail, setEditEmail] = useState(lead.email || '');
  const [editRut, setEditRut] = useState(lead.rut || '');
  const [editSueldo, setEditSueldo] = useState(lead.sueldo_liquido_raw || (lead.sueldo_liquido ? String(lead.sueldo_liquido) : ''));
  const [editProyecto, setEditProyecto] = useState(lead.proyecto || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const baselineRef = useRef({
    name: lead.name, phone: lead.phone, email: lead.email || '',
    rut: lead.rut || '', sueldo: lead.sueldo_liquido_raw || (lead.sueldo_liquido ? String(lead.sueldo_liquido) : ''),
    proyecto: lead.proyecto || '',
  });

  const dirty = editName !== baselineRef.current.name || editPhone !== baselineRef.current.phone ||
    editEmail !== baselineRef.current.email || editRut !== baselineRef.current.rut ||
    editSueldo !== baselineRef.current.sueldo || editProyecto !== baselineRef.current.proyecto;

  const handleSaveFields = async () => {
    setSaving(true);
    setSaved(false);
    const updates: Record<string, any> = {
      name: editName.trim(), phone: editPhone.trim(),
      email: editEmail.trim() || null, rut: editRut.trim() || null,
      sueldo_liquido_raw: editSueldo.trim() || null, proyecto: editProyecto.trim() || null,
    };
    const parsedDigits = editSueldo.replace(/\D/g, '');
    const parsed = parseInt(parsedDigits, 10);
    // Only update sueldo_liquido if it's a valid integer (avoid range strings like "entre_$1.800.000_y_$2.100.000")
    if (!isNaN(parsed) && parsed <= 2147483647) updates.sueldo_liquido = parsed;

    const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
    setSaving(false);
    if (error) { toast.error(`Error al guardar: ${error.message}`); return; }

    baselineRef.current = {
      name: editName.trim(), phone: editPhone.trim(), email: editEmail.trim(),
      rut: editRut.trim(), sueldo: editSueldo.trim(), proyecto: editProyecto.trim(),
    };
    setEditName(v => v.trim()); setEditPhone(v => v.trim());
    setEditEmail(v => v.trim()); setEditRut(v => v.trim());
    setEditSueldo(v => v.trim()); setEditProyecto(v => v.trim());
    setSaved(true);
    toast.success('✅ Datos actualizados');
    setTimeout(() => setSaved(false), 2500);
  };

  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNote = async () => {
    const noteText = callDialogNotesRef.current.trim();
    if (!user || !noteText || savingNote) return;
    setSavingNote(true);
    try {
      let error: { message?: string } | null = null;
      let savedNote: LeadNote | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await supabase
          .from('lead_notes')
          .insert({
            lead_id: lead.id,
            user_id: user.id,
            note: noteText,
          })
          .select('id, note, created_at, user_id')
          .single();

        error = result.error;
        savedNote = result.data;

        const isLockTimeout = error?.message?.includes('Navigator LockManager lock') || error?.message?.includes('lock timed out');
        if (!isLockTimeout || !error || attempt === 1) break;

        await new Promise(resolve => window.setTimeout(resolve, 300));
      }

      if (error) {
        toast.error('Error al guardar nota: ' + error.message);
        return;
      }

      if (!savedNote) {
        toast.error('La nota se guardó, pero no se pudo actualizar la vista.');
        return;
      }

      toast.success('✅ Nota guardada');
      callDialogNotesRef.current = '';
      setHasCallDialogNotes(false);
      if (callDialogTextareaRef.current) callDialogTextareaRef.current.value = '';
      setNoteSaved(true);
      window.setTimeout(() => setNoteSaved(false), 2500);
      onNoteSaved?.(savedNote);
    } catch (err: any) {
      console.error('Error saving note:', err);
      toast.error('La nota no se pudo guardar. Intenta de nuevo.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleClose = (realized: boolean) => {
    onLeadUpdated?.();
    onClose(realized);
  };

  return (
    <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 border-primary/20 rounded-2xl max-h-[90vh] flex flex-col" onInteractOutside={e => e.preventDefault()}>
      <div className="bg-gradient-to-b from-primary/10 to-transparent px-6 pt-5 pb-2 shrink-0">
        <div className="flex flex-col items-center text-center space-y-1">
          <div className="text-3xl">📞</div>
          <h2 className="text-lg font-black text-foreground">Llamar manualmente</h2>
          <a href={`tel:${editPhone}`} className="font-mono text-lg font-bold text-primary hover:underline">{editPhone}</a>
        </div>
      </div>
      <div className="px-5 pb-5 space-y-3 overflow-y-auto flex-1">
        <div className="bg-secondary rounded-xl p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wide">Datos del cliente</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground uppercase">Nombre</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm font-bold text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div className="min-w-0">
              <label className="text-[11px] text-muted-foreground uppercase">Email</label>
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="—"
                className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase">RUT</label>
              <input value={editRut} onChange={e => setEditRut(e.target.value)} placeholder="—"
                className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase">Sueldo</label>
              <input value={editSueldo} onChange={e => setEditSueldo(e.target.value)} placeholder="—"
                className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase">Proyecto</label>
              <input value={editProyecto} onChange={e => setEditProyecto(e.target.value)} placeholder="—"
                className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
          </div>
          {dirty ? (
            <button onClick={handleSaveFields} disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all disabled:opacity-50">
              {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
          ) : saved ? (
            <p className="text-center text-xs font-semibold text-success py-1 animate-in fade-in">✅ Cambios guardados</p>
          ) : null}
        </div>

        <div className="space-y-1.5 rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">📧 Emails de seguimiento</p>
          <EmailButtons leadId={lead.id} leadEmail={editEmail || lead.email} compact />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">📝 Notas de la llamada</label>
          <textarea
            ref={callDialogTextareaRef}
            defaultValue=""
            onChange={e => {
              callDialogNotesRef.current = e.target.value;
              const has = e.target.value.trim().length > 0;
              if (has !== hasCallDialogNotes) setHasCallDialogNotes(has);
            }}
            placeholder="Escribe notas sobre la llamada..."
            className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={2}
          />
          {hasCallDialogNotes ? (
            <button onClick={handleSaveNote} disabled={savingNote}
              className="w-full py-2 rounded-xl text-center text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all disabled:opacity-70">
              {savingNote ? '⏳ Guardando...' : '💾 Guardar nota'}
            </button>
          ) : noteSaved ? (
            <p className="text-center text-xs font-semibold text-success py-1 animate-in fade-in">✅ Nota guardada</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={async () => {
            const attemptedAt = new Date().toISOString();
            await supabase.from('leads').update({ last_attempt_at: attemptedAt }).eq('id', lead.id);
            if (user?.id) {
              const { data: attempts } = await supabase
                .from('call_attempts')
                .select('attempt_number')
                .eq('lead_id', lead.id)
                .order('attempt_number', { ascending: false })
                .limit(1);

              const nextAttempt = (attempts && attempts.length > 0 ? attempts[0].attempt_number : 0) + 1;
              await supabase.from('call_attempts').insert({
                lead_id: lead.id,
                user_id: user.id,
                attempt_number: nextAttempt,
                outcome: 'answered',
              });
            }
            handleClose(true);
          }} className="py-3 rounded-xl text-center text-base font-black text-primary-foreground bg-success hover:bg-success/90 transition-all">
            ✅ Realizada
          </button>
          <button onClick={() => handleClose(false)}
            className="py-3 rounded-xl text-center text-base font-black text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-all">
            ❌ No realizada
          </button>
        </div>
      </div>
    </DialogContent>
  );
}

interface LeadPriorityPanelProps {
  lead: Lead | null;
  isFlashing: boolean;
  onAction: (leadId: string, action: string, advisorId?: string, notes?: string) => void | Promise<void>;
  onDelete?: (leadId: string) => void;
  onCallClick?: (leadId: string) => void;
  onLeadUpdated?: () => void;
  onCallDialogOpenChange?: (open: boolean) => void;
  executiveEditorMode?: boolean;
}

interface AdvisorProfile {
  user_id: string;
  full_name: string;
}

/** Editable note component — own notes can be edited inline */
function EditableNote({ note, isOwn, canDelete, onDelete, onSave }: {
  note: NoteWithAuthor;
  isOwn: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onSave: (newText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.note);

  useEffect(() => { setEditText(note.note); }, [note.note]);

  return (
    <div className="text-sm bg-background rounded p-2 border border-border">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex-1 space-y-1">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full px-2 py-1 rounded border border-primary/30 bg-background text-sm text-foreground resize-y min-h-[40px] focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
              autoFocus
            />
            <div className="flex gap-1">
              <button
                onClick={() => { onSave(editText.trim()); setEditing(false); }}
                disabled={!editText.trim()}
                className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold disabled:opacity-50"
              >
                ✓ Guardar
              </button>
              <button
                onClick={() => { setEditText(note.note); setEditing(false); }}
                className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`text-foreground whitespace-pre-wrap break-words flex-1 ${isOwn ? 'cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors' : ''}`}
            onClick={() => isOwn && setEditing(true)}
            title={isOwn ? 'Clic para editar' : undefined}
          >
            {note.note}
          </p>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOwn && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] text-primary hover:text-primary/80"
              title="Editar nota"
            >
              ✏️
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-[10px] text-destructive hover:text-destructive/80"
              title="Eliminar nota"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {note.author_name} · {new Date(note.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} {new Date(note.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return '<1m';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatSource(source: string): string {
  if (source.toLowerCase().includes('facebook') || source.toLowerCase() === 'fb') return '📘 Facebook';
  if (source.toLowerCase().includes('instagram') || source.toLowerCase() === 'ig') return '📸 Instagram';
  return `📋 ${source}`;
}

function formatMoney(amount: number | null): string {
  if (!amount) return '—';
  return `$${amount.toLocaleString('es-CL')}`;
}

function formatSueldo(lead: Lead): React.ReactNode {
  if (lead.sueldo_liquido_raw) {
    return <span className="text-[10px] leading-tight">{lead.sueldo_liquido_raw}</span>;
  }
  return formatMoney(lead.sueldo_liquido);
}

function InlineEditableText({ value, field, leadId, className, prefix, placeholder, canEdit, onSaved }: {
  value: string;
  field: string;
  leadId: string;
  className?: string;
  prefix?: string;
  placeholder?: string;
  canEdit?: boolean;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEditValue(value); }, [value]);

  const save = async () => {
    if (editValue === value) { setEditing(false); return; }
    setSaving(true);
    const updateData: Record<string, any> = { [field]: editValue.trim() || (field === 'email' ? null : value) };
    await supabase.from('leads').update(updateData).eq('id', leadId);
    setSaving(false);
    setEditing(false);
    onSaved?.();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {prefix && <span className={className}>{prefix}</span>}
        <input
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          onBlur={save}
          autoFocus
          className="px-2 py-1 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
        />
      </div>
    );
  }

  const displayValue = value || placeholder;
  if (!displayValue) return null;

  return (
    <span
      className={`${className} ${canEdit ? 'cursor-pointer hover:bg-accent/10 rounded px-1 -mx-1 transition-colors group' : ''}`}
      onClick={() => canEdit && setEditing(true)}
      title={canEdit ? 'Clic para editar' : undefined}
    >
      {prefix}{value || <span className="text-muted-foreground text-sm italic">{placeholder}</span>}
      {canEdit && <span className="opacity-0 group-hover:opacity-100 text-xs ml-1">✏️</span>}
    </span>
  );
}

const CAMILA_ID = "cc526f22-fe9e-4d84-abdf-4456780e030c";

const LeadPriorityPanel = ({ lead, isFlashing, onAction, onDelete, animationKey, onCallClick, onLeadUpdated, onCallDialogOpenChange, executiveEditorMode }: LeadPriorityPanelProps & { animationKey?: string }) => {
  const { user, role, fullName } = useAuth();
  const { isDemo } = useDemoMode();
  const [showDemoCall, setShowDemoCall] = useState(false);
  const [showManualCallInfo, setShowManualCallInfo] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const callNotesRef = useRef('');
  const callNotesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasCallNotes, setHasCallNotes] = useState(false);
  const [showAdvisorDialog, setShowAdvisorDialog] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [ejecutivaName, setEjecutivaName] = useState<string | null>(null);
  const [advisorName, setAdvisorName] = useState<string | null>(null);
  const [ejecutivas, setEjecutivas] = useState<AdvisorProfile[]>([]);
  const [changingEjecutiva, setChangingEjecutiva] = useState(false);
  const [previousNotes, setPreviousNotes] = useState<NoteWithAuthor[]>([]);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const taskFormRef = useRef<HTMLDivElement>(null);
  const { tasks, createTask, completeTask, reopenTask, deleteTask } = useTasks(user?.id);

  // Si el usuario es Camila y el lead fue traspasado, ocultar notas/tareas anteriores al traspaso
  const hideOldContentSince = user?.id === CAMILA_ID && lead?.camila_notes_hidden_since
    ? lead.camila_notes_hidden_since
    : null;

  // Fetch previous notes for this lead
  const fetchNotes = useCallback(async (leadId: string) => {
    const { data: notes } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (!notes || notes.length === 0) {
      setPreviousNotes([]);
      return;
    }
    // Fetch author names in parallel with nothing else to wait on
    const userIds = [...new Set(notes.map(n => n.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    const nameMap = new Map((profiles ?? []).map(p => [p.user_id, p.full_name]));
    setPreviousNotes(notes.map(n => ({ ...n, author_name: nameMap.get(n.user_id) || 'Desconocido' })));
  }, []);

  useEffect(() => {
    if (lead?.id) {
      fetchNotes(lead.id);
      setShowAllNotes(false);
    } else {
      setPreviousNotes([]);
    }
  }, [lead?.id, fetchNotes]);

  useEffect(() => {
    if (!lead) return;
    const update = () => setElapsed(timeAgo(lead.created_at));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [lead]);

  // Reset notes when lead changes
  useEffect(() => {
    callNotesRef.current = '';
    setHasCallNotes(false);
    if (callNotesTextareaRef.current) callNotesTextareaRef.current.value = '';
  }, [lead?.id]);

  // Fetch ejecutiva name from assigned_to
  useEffect(() => {
    if (!lead?.assigned_to) { setEjecutivaName(null); return; }
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', lead.assigned_to)
      .single()
      .then(({ data }) => setEjecutivaName(data?.full_name ?? null));
  }, [lead?.assigned_to]);

  // Fetch advisor name from advisor_id (solo si está agendado)
  useEffect(() => {
    const isScheduled = lead?.status === 'asesoria_agendada' || lead?.status === 'scheduled';
    if (!lead?.advisor_id || !isScheduled) { setAdvisorName(null); return; }
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', lead.advisor_id)
      .single()
      .then(({ data }) => setAdvisorName(data?.full_name ?? null));
  }, [lead?.advisor_id, lead?.status]);

  const DEMO_ADVISOR_NAMES = ['Alejandro Reyes', 'Camila Fuentes', 'Sebastián Mora', 'Daniela Pinto'];

  // Fetch advisors
  useEffect(() => {
    let cancelled = false;
    const fetchAdvisors = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['asesor', 'recicladora']);
      if (cancelled) return;
      if (roleData && roleData.length > 0) {
        const sortedIds = [...new Set(roleData.map(r => r.user_id))].sort();
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', sortedIds);
        if (!cancelled) {
          const list = (profiles ?? []).sort((a, b) => a.user_id.localeCompare(b.user_id)) as AdvisorProfile[];
          if (isDemo) {
            setAdvisors(list.map((a, i) => ({ ...a, full_name: DEMO_ADVISOR_NAMES[i % DEMO_ADVISOR_NAMES.length] })));
          } else {
            setAdvisors(list);
          }
        }
      }
    };
    fetchAdvisors();
    return () => { cancelled = true; };
  }, [isDemo]);

  // Fetch ejecutivas list when editor mode is active
  useEffect(() => {
    if (!executiveEditorMode) return;
    let cancelled = false;
    const fetchEjecutivas = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'ejecutiva');
      if (cancelled || !roleData || roleData.length === 0) return;
      const ids = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      if (!cancelled) setEjecutivas((profiles ?? []) as AdvisorProfile[]);
    };
    fetchEjecutivas();
    return () => { cancelled = true; };
  }, [executiveEditorMode]);

  const handleChangeEjecutiva = async (newUserId: string) => {
    if (!lead) return;
    setChangingEjecutiva(true);
    const { error } = await supabase.from('leads').update({ assigned_to: newUserId }).eq('id', lead.id);
    setChangingEjecutiva(false);
    if (!error) {
      const found = ejecutivas.find(e => e.user_id === newUserId);
      setEjecutivaName(found?.full_name ?? null);
      onLeadUpdated?.();
      toast.success('Ejecutiva actualizada');
    } else {
      toast.error('Error al cambiar ejecutiva');
    }
  };

  const handleAction = async (action: string) => {
    if (!lead) return;
    setShowManualCallInfo(false);
    await onAction(lead.id, action, undefined, callNotesRef.current || undefined);
    callNotesRef.current = '';
    setHasCallNotes(false);
    if (callNotesTextareaRef.current) callNotesTextareaRef.current.value = '';
  };

  const updatePriority = async (leadId: string, priority: string) => {
    await supabase.from('leads').update({ priority }).eq('id', leadId);
  };

  const handleScheduleConfirm = async () => {
    if (!lead || !selectedAdvisor) return;
    await onAction(lead.id, 'scheduled', selectedAdvisor, callNotesRef.current || undefined);
    setShowAdvisorDialog(false);
    setSelectedAdvisor('');
    callNotesRef.current = '';
    setHasCallNotes(false);
    if (callNotesTextareaRef.current) callNotesTextareaRef.current.value = '';
  };

  if (!lead) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl">✅</div>
          <p className="text-2xl font-bold text-muted-foreground">Sin leads pendientes</p>
          <p className="text-muted-foreground">Los nuevos leads aparecerán aquí automáticamente</p>
        </div>
      </div>
    );
  }

  const isNew = lead.status === 'nuevo' && !lead.last_attempt_at;
  const isRetry = lead.status === 'recontactar' || lead.status === 'no_contesta';

  const statusBadge = (() => {
    const map: Record<string, { label: string; style: string }> = {
      nuevo: { label: '🆕 Nuevo', style: 'bg-primary/15 text-primary' },
      contactado: { label: '✅ Contactado', style: 'bg-success/15 text-success' },
      recontactar: { label: '🔄 Recontactar', style: 'bg-warning/15 text-warning' },
      no_contesta: { label: '📵 No Contesta', style: 'bg-accent/15 text-accent' },
      no_califica: { label: '🚫 No Califica', style: 'bg-muted text-muted-foreground' },
      second_call: { label: '2️⃣ Segundo llamado', style: 'bg-accent/15 text-accent' },
      scheduled: { label: '✅ Agendado', style: 'bg-success/15 text-success' },
      asesoria_agendada: { label: '✅ Agendado', style: 'bg-success/15 text-success' },
      disqualified: { label: '🚫 No califica', style: 'bg-muted text-muted-foreground' },
      bad_number: { label: '❌ Nro Malo/No Invierte', style: 'bg-destructive/15 text-destructive' },
      reciclado: { label: '♻️ Reciclado', style: 'bg-emerald-500/15 text-emerald-600' },
      calling: { label: '📞 Llamando', style: 'bg-primary/15 text-primary' },
    };
    const s = map[lead.status] || { label: lead.status, style: 'bg-muted text-muted-foreground' };
    return s;
  })();

  return (
    <>
      <div
        key={animationKey || lead.id}
        className={`rounded-xl p-3 border-2 transition-all animate-fly-to-panel ${
          isFlashing
            ? 'animate-border-pulse glow-red border-primary bg-primary/5'
            : 'border-border bg-card'
        }`}
      >
        {/* Status Badge */}
        <div className="mb-1 flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.style}`}>
            {statusBadge.label}
          </span>
          {lead.status !== 'new' && (
            <button
              onClick={async () => {
                await supabase.from('leads').update({ 
                  status: 'new', 
                  assigned_to: null, 
                  advisor_id: null, 
                  last_attempt_at: null 
                }).eq('id', lead.id);
                toast.success('Lead vuelto a Nuevo');
                onLeadUpdated?.();
              }}
              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
              title="Volver a estado Nuevo"
            >
              🔄 Nuevo
            </button>
          )}
        </div>

        {/* Status Banner - only for retries */}
        {isRetry && (
          <div className="mb-2 px-2 py-1 rounded-lg bg-accent/15 border border-accent/30 text-center">
            <span className="text-accent font-bold text-xs">🔄 No contestó — ¡Volver a llamar!</span>
          </div>
        )}

        {/* Lead Info */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">👤</span>
            <InlineEditableText
              value={lead.name}
              field="name"
              leadId={lead.id}
              className="text-base font-black text-foreground truncate"
              canEdit={role === 'admin' || role === 'ejecutiva' || role === 'recicladora'}
              onSaved={onLeadUpdated}
            />
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground leading-none">Hace</p>
                <p className="text-sm font-black font-mono text-warning leading-tight">{elapsed}</p>
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(lead.id)}
                  className="px-1.5 py-1 rounded text-[10px] font-bold bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors"
                  title="Eliminar lead"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <InlineEditableText
              value={lead.phone}
              field="phone"
              leadId={lead.id}
              className="text-sm font-mono text-accent font-bold"
              prefix="📞 "
              canEdit={role === 'admin' || role === 'ejecutiva' || role === 'recicladora'}
              onSaved={onLeadUpdated}
            />
            <InlineEditableText
              value={lead.email || ''}
              field="email"
              leadId={lead.id}
              className="text-sm text-muted-foreground truncate"
              prefix="✉️ "
              placeholder="+ email"
              canEdit={role === 'admin' || role === 'ejecutiva' || role === 'recicladora'}
              onSaved={onLeadUpdated}
            />
          </div>
          {(ejecutivaName || executiveEditorMode) && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">👩‍💼 Ejecutiva:</span>
              {executiveEditorMode ? (
                <Select
                  value={lead?.assigned_to ?? ''}
                  onValueChange={handleChangeEjecutiva}
                  disabled={changingEjecutiva}
                >
                  <SelectTrigger className="h-5 text-[10px] font-semibold px-1 py-0 border-orange-400 border rounded min-w-[100px] w-auto">
                    <SelectValue placeholder="Sin ejecutiva" />
                  </SelectTrigger>
                  <SelectContent>
                    {ejecutivas.map(e => (
                      <SelectItem key={e.user_id} value={e.user_id} className="text-xs">
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-[10px] font-semibold text-foreground">{isDemo ? 'Javiera Contreras' : ejecutivaName}</span>
              )}
            </div>
          )}
          {advisorName && (
            <div className="mt-0.5 flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">🧑‍💼 Asesor:</span>
              <span className="text-[10px] font-semibold text-foreground">{isDemo ? 'Alejandro Reyes' : advisorName}</span>
            </div>
          )}
        </div>

        {lead.email && (
          <div className="mb-3 rounded-xl border border-border bg-card p-2.5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">📧 Emails de seguimiento</p>
            <EmailButtons leadId={lead.id} leadEmail={lead.email} />
          </div>
        )}

        {/* Detail Grid - Editable */}
        <EditableLeadGrid lead={lead} userRole={role} onSaved={onLeadUpdated} />

        {/* Previous Notes */}
        {(() => {
          const visibleNotes = hideOldContentSince
            ? previousNotes.filter(n => n.created_at >= hideOldContentSince)
            : previousNotes;
          return visibleNotes.length > 0 && (
          <div className="mb-3 p-2 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">📋 Notas anteriores ({visibleNotes.length})</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(showAllNotes ? visibleNotes : visibleNotes.slice(0, 3)).map(n => (
                <EditableNote
                  key={n.id}
                  note={n}
                  isOwn={n.user_id === user?.id}
                  canDelete={role === 'admin' || role === 'ejecutiva' || role === 'recicladora'}
                  onDelete={async () => {
                    await supabase.from('lead_notes').delete().eq('id', n.id);
                    fetchNotes(lead.id);
                  }}
                  onSave={async (newText) => {
                    await supabase.from('lead_notes').update({ note: newText }).eq('id', n.id);
                    fetchNotes(lead.id);
                  }}
                />
              ))}
            </div>
            {visibleNotes.length > 3 && !showAllNotes && (
              <button onClick={() => setShowAllNotes(true)} className="text-xs text-primary font-bold mt-2 hover:underline">
                Ver todas ({visibleNotes.length})
              </button>
            )}
          </div>
          );
        })()}

        {/* Notes during call */}
        <div className="mb-2">
          <textarea
            ref={callNotesTextareaRef}
            defaultValue=""
            onChange={e => {
              callNotesRef.current = e.target.value;
              const has = e.target.value.trim().length > 0;
              if (has !== hasCallNotes) setHasCallNotes(has);
            }}
            placeholder="📝 Notas de la llamada..."
            rows={2}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y min-h-[40px]"
          />
          {hasCallNotes && (
            <button
              onClick={async () => {
                if (!user || !lead) return;
                const note = callNotesRef.current.trim();
                if (!note) return;
                await supabase.from('lead_notes').insert({
                  lead_id: lead.id,
                  user_id: user.id,
                  note,
                });
                callNotesRef.current = '';
                setHasCallNotes(false);
                if (callNotesTextareaRef.current) callNotesTextareaRef.current.value = '';
                fetchNotes(lead.id);
              }}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
            >
              💾 Guardar nota sin calificar
            </button>
          )}
        </div>

        {/* Call Now Button - Opens manual call info popup */}
        <button
          onClick={() => {
            if (isDemo) {
              setShowDemoCall(true);
              onCallClick?.(lead.id);
              return;
            }
            setShowManualCallInfo(true);
            onCallDialogOpenChange?.(true);
            onCallClick?.(lead.id);
          }}
          data-tour="call-button"
          className={`block w-full py-2.5 rounded-xl text-center text-lg font-black text-primary-foreground bg-primary mb-2 transition-all hover:scale-[1.01] cursor-pointer ${
            isFlashing ? 'animate-pulse-glow' : 'glow-red'
          }`}
        >
          {isNew ? '🚨 LLAMAR AHORA' : '🔄 VOLVER A LLAMAR'}
        </button>

        {/* Manual Call Info Dialog */}
        <Dialog open={showManualCallInfo} onOpenChange={(open) => {
          setShowManualCallInfo(open);
          onCallDialogOpenChange?.(open);
        }}>
          <CallDialogContent
            lead={lead}
            user={user}
            onClose={(realized) => {
              setShowManualCallInfo(false);
              onCallDialogOpenChange?.(false);
              if (realized) {
                toast.success('Llamada registrada — califica el resultado');
              } else {
                toast('Llamada no realizada', { icon: '📵' });
              }
              onLeadUpdated?.();
            }}
            onLeadUpdated={onLeadUpdated}
            onNoteSaved={(savedNote) => {
              setPreviousNotes(prev => [
                {
                  ...savedNote,
                  author_name: isDemo ? 'Usuario Demo' : (fullName || 'Desconocido'),
                },
                ...prev,
              ]);
            }}
          />
        </Dialog>

        {isDemo && <DemoCallDialog open={showDemoCall} onClose={() => setShowDemoCall(false)} phone={lead.phone} />}

        {/* Action Buttons */}
        <div data-tour="action-buttons" className="grid grid-cols-3 gap-1.5">
          <ActionButton onClick={() => handleAction('contactado')} emoji="✅" label="Contactado" variant="success" />
          <ActionButton onClick={() => handleAction('recontactar')} emoji="🔄" label="Recontactar" variant="warning" />
          <ActionButton onClick={() => handleAction('no_contesta')} emoji="📵" label="No Contesta" variant="accent" />
          <ActionButton onClick={() => handleAction('no_califica')} emoji="🚫" label="No Califica" variant="muted" />
          <ActionButton onClick={() => handleAction('cliente_interesado')} emoji="⭐" label="Cliente Interesado" variant="success" />
          <ActionButton onClick={() => handleAction('esperando_documentos')} emoji="📄" label="Esperando Docs" variant="warning" />
        </div>

        {/* Tasks Section */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">📋 Mis Tareas</h3>
            <button
              onClick={() => {
                const next = !showTaskForm;
                setShowTaskForm(next);
                if (next) {
                  setTimeout(() => taskFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
            >
              {showTaskForm ? '✕ Cerrar' : '+ Nueva Tarea'}
            </button>
          </div>
          <div ref={taskFormRef}>
            {showTaskForm && user && (
              <TaskForm
                leadId={lead.id}
                leadName={lead.name}
                userId={user.id}
                isAdmin={role === 'admin'}
                onSubmit={createTask}
                onCancel={() => setShowTaskForm(false)}
              />
            )}
          </div>
          <TaskList
            tasks={tasks.filter(t => t.lead_id === lead.id && (!hideOldContentSince || t.created_at >= hideOldContentSince))}
            onComplete={completeTask}
            onReopen={reopenTask}
            onDelete={deleteTask}
            compact
          />
        </div>

        {/* Gestor Documental */}
        <div className="border-t border-border pt-3 mt-3">
          <LeadDocuments leadId={lead.id} />
        </div>
      </div>

      {/* Advisor Selection Dialog */}
      <Dialog open={showAdvisorDialog} onOpenChange={setShowAdvisorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">📅 Agendar con Asesor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-foreground mb-2">Lead: {lead.name}</p>
              {callNotesRef.current && (
                <div className="p-3 bg-muted rounded-lg text-sm mb-3">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Notas de la llamada:</p>
                  <p className="text-foreground">{callNotesRef.current}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">¿A qué asesor se asigna?</label>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar asesor..." />
                </SelectTrigger>
                <SelectContent>
                  {advisors.map(a => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleScheduleConfirm}
              disabled={!selectedAdvisor}
              className="w-full py-3 rounded-xl text-center text-lg font-black text-primary-foreground bg-success hover:bg-success/90 disabled:opacity-50 transition-all"
            >
              ✅ Confirmar Agendamiento
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

function DetailItem({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold break-words ${highlight ? 'text-destructive' : 'text-foreground'}`} title={typeof value === 'string' ? value : undefined}>{value}</p>
    </div>
  );
}

function ActionButton({
  onClick,
  emoji,
  label,
  variant,
}: {
  onClick: () => void;
  emoji: string;
  label: string;
  variant: string;
}) {
  const variantClasses: Record<string, string> = {
    success: 'bg-success/15 hover:bg-success/25 text-success border-success/30',
    muted: 'bg-muted hover:bg-muted/80 text-muted-foreground border-border',
    warning: 'bg-warning/15 hover:bg-warning/25 text-warning border-warning/30',
    destructive: 'bg-destructive/15 hover:bg-destructive/25 text-destructive border-destructive/30',
    accent: 'bg-accent/15 hover:bg-accent/25 text-accent border-accent/30',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-105 ${variantClasses[variant] || ''}`}
    >
      <span className="text-lg">{emoji}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function EditableLeadGrid({ lead, userRole, onSaved }: { lead: Lead; userRole?: string; onSaved?: () => void }) {
  const canEdit = userRole === 'admin' || userRole === 'ejecutiva';
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (field: string, currentValue: string) => {
    if (!canEdit) return;
    setEditing(field);
    // For sueldo, show just the number for easy editing
    if (field === 'sueldo_liquido') {
      setEditValue(lead.sueldo_liquido_raw || (lead.sueldo_liquido != null ? String(lead.sueldo_liquido) : ''));
    } else if (field === 'source') {
      // Always use the raw source value, not the formatted display
      setEditValue(lead.source);
    } else {
      setEditValue(currentValue);
    }
  };

  const saveField = async () => {
    if (!editing) return;
    setSaving(true);
    const updateData: Record<string, any> = {};

    switch (editing) {
      case 'name':
        updateData.name = editValue.trim() || lead.name;
        break;
      case 'phone':
        updateData.phone = editValue.trim();
        break;
      case 'email':
        updateData.email = editValue.trim() || null;
        break;
      case 'rut':
        updateData.rut = editValue.trim() || null;
        break;
      case 'sueldo_liquido': {
        const trimmed = editValue.trim();
        // Try to parse as pure number
        const cleaned = trimmed.replace(/[^\d]/g, '');
        const num = cleaned ? parseInt(cleaned, 10) : null;
        // If it's a clean number, store in sueldo_liquido; otherwise store as raw text
        if (num && String(num) === cleaned && trimmed === cleaned) {
          updateData.sueldo_liquido = num;
          updateData.sueldo_liquido_raw = null;
        } else {
          updateData.sueldo_liquido_raw = trimmed || null;
          updateData.sueldo_liquido = num; // still try to extract a number
        }
        break;
      }
      case 'en_dicom':
        updateData.en_dicom = editValue === 'si';
        break;
      case 'source':
        updateData.source = editValue.trim() || lead.source;
        break;
      case 'proyecto':
        updateData.proyecto = editValue.trim() || null;
        break;
    }

    await supabase.from('leads').update(updateData).eq('id', lead.id);
    setSaving(false);
    setEditing(null);
    onSaved?.();
  };

  const cancelEdit = () => { setEditing(null); setEditValue(''); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveField();
    if (e.key === 'Escape') cancelEdit();
  };

  const renderField = (field: string, label: string, value: string, highlight = false, small = false) => {
    if (editing === field) {
      if (field === 'en_dicom') {
        return (
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <select
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="flex-1 px-2 py-1 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
              <button onClick={saveField} disabled={saving} className="px-1.5 py-1 rounded bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">✓</button>
              <button onClick={cancelEdit} className="px-1.5 py-1 rounded bg-muted text-muted-foreground text-xs font-bold">✕</button>
            </div>
          </div>
        );
      }
      return (
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveField}
              autoFocus
              className="flex-1 min-w-0 px-2 py-1 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={saveField} disabled={saving} className="px-1.5 py-1 rounded bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">✓</button>
            <button onClick={cancelEdit} className="px-1.5 py-1 rounded bg-muted text-muted-foreground text-xs font-bold">✕</button>
          </div>
        </div>
      );
    }
    return (
      <div
        className={`min-w-0 ${canEdit ? 'cursor-pointer group hover:bg-accent/10 rounded px-1 -mx-1 py-0.5' : ''}`}
        onClick={() => startEdit(field, value === '—' ? '' : value)}
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {label}
          {canEdit && <span className="opacity-0 group-hover:opacity-100 text-[10px]">✏️</span>}
        </p>
        <p className={`text-sm font-bold break-words ${highlight ? 'text-destructive' : 'text-foreground'}`} title={typeof value === 'string' ? value : undefined}>{value}</p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 p-3 bg-secondary/50 rounded-lg">
      <DetailItem label="Fecha Lead" value={new Date(lead.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })} />
      <DetailItem label="Hora Lead" value={new Date(lead.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} />
      {renderField('sueldo_liquido', 'Sueldo Líquido', lead.sueldo_liquido_raw || (lead.sueldo_liquido != null ? `$${lead.sueldo_liquido.toLocaleString('es-CL')}` : '—'), false, false)}
      {renderField('rut', 'RUT', lead.rut || '—')}
      {renderField('en_dicom', 'DICOM', lead.en_dicom ? '⚠️ Sí' : '✅ No', lead.en_dicom ?? false)}
      {renderField('source', 'Fuente', formatSource(lead.source))}
      <DetailItem label="Plataforma" value={(() => { const u = (lead.utm_source || '').toLowerCase(); const s = (lead.source || '').toLowerCase(); if (s.startsWith('dm tiktok')) return '💬 DM TikTok'; if (s.startsWith('dm meta')) return '💬 DM Meta'; if (u.includes('facebook') || u.includes('fb') || u.includes('ig') || u.includes('meta')) return '📘 META'; if (u.includes('tiktok') || u.includes('tt')) return '🎵 TikTok'; if (u.includes('google')) return '🔍 Google'; if (u) return u; if (s.startsWith('meta ads')) return '📘 META'; if (s.startsWith('tiktok ads')) return '🎵 TikTok'; return '🌐 Orgánico'; })()} />
      {(lead as any).arriendo && <DetailItem label="Arriendo actual" value={(lead as any).arriendo} />}
      {(lead as any).contrato != null && <DetailItem label="Contrato indefinido" value={(lead as any).contrato === 'si' ? '✅ Sí' : '❌ No'} />}
      {(lead as any).vivienda != null && <DetailItem label="Tiene vivienda" value={(lead as any).vivienda === 'si' ? '⚠️ Sí' : '✅ No'} />}
      {(lead as any).tiene_propiedad_vista && <DetailItem label="Propiedad vista" value={(lead as any).tiene_propiedad_vista === 'si' ? '✅ Sí' : '❌ No'} />}
      {(lead as any).comuna_propiedad && <DetailItem label="Comuna propiedad" value={(lead as any).comuna_propiedad} />}
      {(lead as any).precio_propiedad_ok && <DetailItem label="Valor propiedad" value={(lead as any).precio_propiedad_ok} />}
      {(lead as any).complementa_renta && <DetailItem label="Complementa renta" value={(lead as any).complementa_renta} />}
      {(lead as any).preferencia_contacto && <DetailItem label="Prefiere contacto" value={(lead as any).preferencia_contacto === 'whatsapp' ? '💬 WhatsApp' : '📞 Llamada'} />}
      {(lead as any).horario_contacto && <DetailItem label="Horario contacto" value={(lead as any).horario_contacto} />}
      {renderField('email', 'Email', lead.email || '—')}
      {renderField('phone', 'Teléfono', lead.phone)}
    </div>
  );
}

export default LeadPriorityPanel;
