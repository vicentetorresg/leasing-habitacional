import { useState, useEffect } from 'react';
import EmailButtons from '@/components/EmailButtons';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface LeadInfo {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  rut?: string | null;
  sueldo_liquido?: number | null;
  en_dicom?: boolean | null;
  source?: string;
}

interface CallingDialogProps {
  open: boolean;
  lead: LeadInfo;
  onClose: () => void;
  onSaveNote?: (note: string) => void;
  onPhoneUpdate?: (newPhone: string) => Promise<void>;
  onFieldUpdate?: (field: string, value: any) => Promise<void>;
  onRetryCall?: () => void;
  callStatus: 'initiating' | 'ringing' | 'connected' | 'ended' | 'error';
  errorMessage?: string;
}

/** Inline editable text field for calling dialog */
function EditableField({ value, onSave, className, placeholder, inline, displayValue }: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
  inline?: boolean;
  displayValue?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);

  useEffect(() => { setEditVal(value); }, [value]);

  const save = () => {
    if (editVal !== value) onSave(editVal.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <span className={inline ? 'inline-flex items-center gap-1' : 'flex items-center gap-1'}>
        <input
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          onBlur={save}
          autoFocus
          className="px-1 py-0.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[80px] max-w-[180px]"
        />
      </span>
    );
  }

  const show = displayValue || value || placeholder;
  return (
    <span
      className={`${className} cursor-pointer hover:bg-accent/10 rounded px-0.5 transition-colors group`}
      onClick={() => setEditing(true)}
      title="Clic para editar"
    >
      {value ? (displayValue || value) : <span className="text-muted-foreground italic">{placeholder}</span>}
      <span className="opacity-0 group-hover:opacity-100 text-[10px] ml-0.5">✏️</span>
    </span>
  );
}

/** Normalize a Chilean phone to +56XXXXXXXXX format */
function normalizePhone(raw: string): string {
  let phone = raw.replace(/[\s\-\(\)]/g, '');
  // 9XXXXXXXX → +569XXXXXXXX
  if (/^9\d{8}$/.test(phone)) phone = '+56' + phone;
  // 569XXXXXXXX → +569XXXXXXXX
  else if (/^56\d{9}$/.test(phone)) phone = '+' + phone;
  // ensure starts with +
  else if (phone.length > 0 && !phone.startsWith('+')) phone = '+' + phone;
  return phone;
}

function formatDisplay(phone: string): string {
  const n = normalizePhone(phone);
  // Format +56 9 XXXX XXXX
  const m = n.match(/^\+56(\d)(\d{4})(\d{4})$/);
  if (m) return `+56 ${m[1]} ${m[2]} ${m[3]}`;
  return n;
}

function isValidChileanPhone(phone: string): boolean {
  const n = normalizePhone(phone);
  return /^\+56\d{9}$/.test(n);
}

const CallingDialog = ({ open, lead, onClose, onSaveNote, onPhoneUpdate, onFieldUpdate, onRetryCall, callStatus, errorMessage }: CallingDialogProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      setNote('');
      setSaved(false);
      setEditingPhone(false);
      setPhoneInput('');
      return;
    }
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleSaveNote = () => {
    if (!note.trim()) return;
    onSaveNote?.(note.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setNote('');
  };

  const handlePhoneEdit = () => {
    setPhoneInput(lead.phone);
    setEditingPhone(true);
  };

  const handlePhoneSave = async () => {
    const normalized = normalizePhone(phoneInput);
    if (!isValidChileanPhone(normalized)) return;
    setPhoneSaving(true);
    await onPhoneUpdate?.(normalized);
    setPhoneSaving(false);
    setEditingPhone(false);
  };

  const phoneIsValid = isValidChileanPhone(lead.phone);

  const statusConfig = {
    initiating: {
      icon: '📡',
      title: 'Llamando al cliente...',
      subtitle: 'Conectando con el servidor',
      color: 'text-primary',
      pulse: true,
    },
    ringing: {
      icon: '📞',
      title: 'Sonando al cliente...',
      subtitle: 'Si contesta, tu celular sonará para conectarte',
      color: 'text-warning',
      pulse: true,
    },
    connected: {
      icon: '🟢',
      title: 'Llamada en curso',
      subtitle: 'Conectado con el cliente',
      color: 'text-success',
      pulse: false,
    },
    ended: {
      icon: '✅',
      title: 'Llamada finalizada',
      subtitle: 'Guarda tus notas y luego cierra',
      color: 'text-muted-foreground',
      pulse: false,
    },
    error: {
      icon: '❌',
      title: 'Error en la llamada',
      subtitle: errorMessage || 'No se pudo conectar',
      color: 'text-destructive',
      pulse: false,
    },
  };

  const config = statusConfig[callStatus];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 border-primary/20" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        {/* Header gradient */}
        <div className="bg-gradient-to-b from-primary/10 to-transparent px-6 pt-8 pb-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`text-5xl ${config.pulse ? 'animate-pulse' : ''}`}>
              {config.icon}
            </div>
            <div className="space-y-1">
              <h2 className={`text-xl font-black ${config.color}`}>{config.title}</h2>
              <p className="text-sm text-muted-foreground">{config.subtitle}</p>
            </div>
            <div className="font-mono text-3xl font-black text-foreground tabular-nums">
              {formatTime(elapsed)}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Lead info — editable */}
          <div className="bg-secondary rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <div className="flex-1 min-w-0">
                <EditableField
                  value={lead.name}
                  onSave={(v) => onFieldUpdate?.('name', v)}
                  className="font-black text-foreground"
                />
                {/* Phone: editable */}
                {editingPhone ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+56912345678"
                      maxLength={15}
                    />
                    <button
                      onClick={handlePhoneSave}
                      disabled={phoneSaving || !isValidChileanPhone(phoneInput)}
                      className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                    >
                      {phoneSaving ? '...' : '✓'}
                    </button>
                    <button
                      onClick={() => setEditingPhone(false)}
                      className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className={`font-mono text-sm ${phoneIsValid ? 'text-accent' : 'text-destructive'}`}>
                      {formatDisplay(lead.phone)}
                    </p>
                    <button
                      onClick={handlePhoneEdit}
                      className="text-muted-foreground hover:text-foreground text-xs"
                      title="Editar teléfono"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                {!phoneIsValid && !editingPhone && (
                  <p className="text-xs text-destructive font-bold mt-0.5">
                    ⚠️ Teléfono inválido — corrígelo para llamar
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1 border-t border-border/50">
              <div className="col-span-2">
                <span className="text-muted-foreground">📧 </span>
                <EditableField
                  value={lead.email || ''}
                  placeholder="+ Agregar email"
                  onSave={(v) => onFieldUpdate?.('email', v || null)}
                  className="text-foreground text-sm"
                  inline
                />
              </div>
              <div>
                <span className="text-muted-foreground">🪪 RUT: </span>
                <EditableField
                  value={lead.rut || ''}
                  placeholder="+ RUT"
                  onSave={(v) => onFieldUpdate?.('rut', v || null)}
                  className="text-foreground font-medium text-xs"
                  inline
                />
              </div>
              <div>
                <span className="text-muted-foreground">💰 Renta: </span>
                <EditableField
                  value={lead.sueldo_liquido != null ? `${lead.sueldo_liquido}` : ''}
                  placeholder="+ Renta"
                  onSave={(v) => {
                    const num = parseInt((v || '').replace(/\D/g, ''), 10);
                    onFieldUpdate?.('sueldo_liquido', isNaN(num) ? null : num);
                  }}
                  displayValue={lead.sueldo_liquido != null ? `$${lead.sueldo_liquido.toLocaleString('es-CL')}` : undefined}
                  className="text-foreground font-medium text-xs"
                  inline
                />
              </div>
              <div>
                <span className="text-muted-foreground">📋 DICOM: </span>
                <span
                  className={`font-medium cursor-pointer hover:underline ${lead.en_dicom ? 'text-destructive' : 'text-success'}`}
                  onClick={() => onFieldUpdate?.('en_dicom', !lead.en_dicom)}
                  title="Clic para cambiar"
                >
                  {lead.en_dicom == null ? 'S/I' : lead.en_dicom ? 'Sí ✏️' : 'No ✏️'}
                </span>
              </div>
              {lead.source && (
                <div>
                  <span className="text-muted-foreground">📍 Origen: </span>
                  <span className="text-foreground font-medium capitalize">{lead.source}</span>
                </div>
              )}
            </div>
          </div>

          {/* Retry button when error and phone was corrected */}
          {callStatus === 'error' && phoneIsValid && onRetryCall && (
            <button
              onClick={onRetryCall}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              🔄 Reintentar llamada
            </button>
          )}

          {/* Ringing animation */}
          {(callStatus === 'initiating' || callStatus === 'ringing') && (
            <div className="flex justify-center gap-1.5 py-1">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {/* Notes area */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">📝 Notas de la llamada</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Escribe mientras hablas..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y min-h-[60px]"
            />
            {note.trim() && (
              <button
                onClick={handleSaveNote}
                className="w-full py-2 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
              >
                💾 Guardar nota
              </button>
            )}
            {saved && (
              <p className="text-xs text-success font-bold text-center animate-in fade-in">✅ Nota guardada</p>
            )}
          </div>

          {/* Email Buttons */}
          <EmailButtons leadId={lead.id} leadEmail={lead.email} compact />

          {/* Close button */}
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
              callStatus === 'ended'
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            }`}
          >
            {callStatus === 'ended' ? '✕ Cerrar ventana' : '📞 Colgar llamada'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallingDialog;
