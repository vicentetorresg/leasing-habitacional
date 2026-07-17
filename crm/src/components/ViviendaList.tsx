import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Vivienda {
  id: string;
  created_at: string;
  nombre: string;
  telefono: string;
  email: string | null;
  tipo_vivienda: string | null;
  valor_pesos: string | null;
  direccion: string | null;
  detalle_depto: string | null;
  comuna: string | null;
  superficie: number | null;
  dormitorios: string | null;
  banos: string | null;
  fuente: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: string;
  linked_lead_id: string | null;
  notes: string | null;
  updated_at: string;
  photo_count: number | null;
  last_mailing_at: string | null;
  archived: boolean;
}

interface LinkedLead {
  id: string;
  name: string;
  phone: string;
}

const STATUSES = [
  { value: 'esperando_ok_propietario', label: 'Esperando OK de propietario para ofrecer su vivienda', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  { value: 'esperando_fotos_tasacion', label: 'Esperando envío de fotos y tasación', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  { value: 'coordinando_visitas', label: 'Coordinando visitas con potenciales compradores', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  { value: 'firma_mandato', label: 'Coordinando firma de mandato de venta con propietario', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  { value: 'eett_tasacion', label: 'EE.TT y tasación en proceso', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-400' },
  { value: 'borrador_escritura', label: 'Borrador de escritura en notaría', color: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-400' },
  { value: 'escritura_firmada', label: 'Escritura firmada, esperando Inscripción', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400' },
  { value: 'inscrito_cbr', label: 'Inscrito CBR. Cobrar comisión propietario', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  { value: 'finalizado', label: 'Negocio finalizado', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  { value: 'propietario_no_interesado', label: 'Propietario no interesado en vender', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
];

const STATUS_MAP: Record<string, typeof STATUSES[0]> = {};
STATUSES.forEach(s => { STATUS_MAP[s.value] = s; });

const UF_LABELS: Record<string, string> = {
  '0_800': '< 800 UF',
  '800_1000': '800 - 1.000 UF',
  '1000_1200': '1.000 - 1.200 UF',
  '1200_1400': '1.200 - 1.400 UF',
  '1400_1600': '1.400 - 1.600 UF',
  '1600_1800': '1.600 - 1.800 UF',
  '1800_2000': '1.800 - 2.000 UF',
};

/* Custom status dropdown */
const StatusDropdown = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const st = STATUS_MAP[value] || STATUSES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md px-2 py-1 border cursor-pointer transition-all hover:shadow-sm ${st.color}`}
      >
        <span className={`w-2 h-2 rounded-full ${st.dot}`} />
        {st.label}
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-border/60 py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-100">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => { onChange(s.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${value === s.value ? 'bg-muted/60 font-bold' : 'hover:bg-muted/40'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span>{s.label}</span>
              {value === s.value && <svg className="w-3.5 h-3.5 ml-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* Lead search dropdown for table rows */
const LeadPicker = ({ vivId, currentLead, linkedLeads, setLinkedLeads, onPick }: {
  vivId: string;
  currentLead: LinkedLead | null;
  linkedLeads: Record<string, LinkedLead>;
  setLinkedLeads: React.Dispatch<React.SetStateAction<Record<string, LinkedLead>>>;
  onPick: (vivId: string, leadId: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LinkedLead[]>([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); setResults([]); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from('leads').select('id, name, phone').ilike('name', `%${q}%`).eq('is_demo', false).limit(8);
    setResults((data || []) as LinkedLead[]);
    setSearching(false);
  };

  if (currentLead) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-semibold max-w-[130px] truncate">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="truncate">{currentLead.name}</span>
        </span>
        <button
          onClick={() => onPick(vivId, null)}
          className="text-gray-400 hover:text-destructive transition-colors"
          title="Quitar lead"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md px-2 py-1 transition-colors hover:border-primary/40"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Asignar lead
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-border/60 w-[240px] animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-border/40">
            <div className="relative">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                ref={inputRef}
                value={search}
                onChange={e => doSearch(e.target.value)}
                placeholder="Buscar lead..."
                className="w-full pl-7 pr-2 py-1.5 rounded border border-border bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {searching && <div className="px-3 py-2 text-xs text-muted-foreground text-center">Buscando...</div>}
            {!searching && search.length >= 2 && results.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">Sin resultados</div>
            )}
            {!searching && search.length < 2 && (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">Escribe 2+ letras</div>
            )}
            {results.map(l => (
              <button
                key={l.id}
                onClick={() => {
                  onPick(vivId, l.id);
                  setLinkedLeads(prev => ({ ...prev, [l.id]: l }));
                  setOpen(false);
                  setSearch('');
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-blue-50/60 transition-colors border-b border-border/20 last:border-0"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {l.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{l.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{l.phone}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface VivFile {
  name: string;
  url: string;
}

const BUCKET = 'vivienda-files';
const SUPA_STORAGE_URL = 'https://evuxdhvvarfxredghvpu.supabase.co/storage/v1/object/public/vivienda-files';

const ViviendaList = () => {
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [editViv, setEditViv] = useState<Vivienda | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editLeadSearch, setEditLeadSearch] = useState('');
  const [editLeadResults, setEditLeadResults] = useState<LinkedLead[]>([]);
  const [linkedLeads, setLinkedLeads] = useState<Record<string, LinkedLead>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editFiles, setEditFiles] = useState<VivFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [photoViewViv, setPhotoViewViv] = useState<Vivienda | null>(null);
  const [photoViewFiles, setPhotoViewFiles] = useState<VivFile[]>([]);
  const [photoViewLoading, setPhotoViewLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchViviendas = useCallback(async () => {
    const { data, error } = await (supabase.from('viviendas' as any).select('*') as any)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setViviendas(data || []);
    setLoading(false);

    const leadIds = (data || []).map((v: Vivienda) => v.linked_lead_id).filter(Boolean) as string[];
    if (leadIds.length > 0) {
      const { data: leads } = await supabase.from('leads').select('id, name, phone').in('id', leadIds);
      const map: Record<string, LinkedLead> = {};
      (leads || []).forEach((l: any) => { map[l.id] = l; });
      setLinkedLeads(map);
    }
  }, []);

  useEffect(() => { fetchViviendas(); }, [fetchViviendas]);

  // Auto-open photo viewer if ?fotos=ID is in URL or saved from pre-login redirect
  useEffect(() => {
    if (loading || viviendas.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const fotosId = params.get('fotos') || sessionStorage.getItem('pending_fotos');
    if (fotosId) {
      sessionStorage.removeItem('pending_fotos');
      const viv = viviendas.find(v => v.id === fotosId);
      if (viv) openPhotoView(viv);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loading, viviendas]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await (supabase.from('viviendas' as any) as any).update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    toast.success('Estado actualizado');
    fetchViviendas();
  };

  const handleLeadPick = async (vivId: string, leadId: string | null) => {
    await (supabase.from('viviendas' as any) as any).update({ linked_lead_id: leadId, updated_at: new Date().toISOString() }).eq('id', vivId);
    toast.success(leadId ? 'Lead asignado' : 'Lead removido');
    fetchViviendas();
  };

  const handleSendMatchEmail = async (v: Vivienda) => {
    const lead = v.linked_lead_id ? linkedLeads[v.linked_lead_id] : null;
    if (!lead) { toast.error('Primero asigna un lead interesado'); return; }
    // Get lead email from DB
    const { data: leadData } = await supabase.from('leads').select('email').eq('id', lead.id).single();
    const leadEmail = leadData?.email;
    if (!leadEmail) { toast.error(`${lead.name} no tiene email registrado`); return; }

    setSendingEmailId(v.id);
    try {
      const res = await fetch('/api/send-vivienda-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_name: lead.name,
          lead_email: leadEmail,
          tipo_vivienda: v.tipo_vivienda,
          direccion: v.direccion,
          detalle_depto: v.detalle_depto,
          comuna: v.comuna,
          superficie: v.superficie,
          dormitorios: v.dormitorios,
          banos: v.banos,
          valor_pesos: v.valor_pesos,
        }),
      });
      if (res.ok) {
        toast.success(`Email enviado a ${lead.name} (${leadEmail})`);
      } else {
        const err = await res.json();
        console.error('Email error:', err);
        toast.error('Error enviando email');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de red');
    }
    setSendingEmailId(null);
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    await (supabase.from('viviendas' as any) as any).update({ archived: true, updated_at: new Date().toISOString() }).eq('id', archiveId);
    toast.success('Vivienda archivada');
    setArchiveId(null);
    fetchViviendas();
  };

  const handleUnarchive = async (id: string) => {
    await (supabase.from('viviendas' as any) as any).update({ archived: false, updated_at: new Date().toISOString() }).eq('id', id);
    toast.success('Vivienda desarchivada');
    fetchViviendas();
  };

  const handleSaveEdit = async () => {
    if (!editViv) return;
    const { id, created_at, ...rest } = editViv;
    await (supabase.from('viviendas' as any) as any).update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
    toast.success('Vivienda actualizada');
    setEditViv(null);
    setEditLeadSearch('');
    setEditLeadResults([]);
    fetchViviendas();
  };

  const fetchFiles = async (vivId: string) => {
    const { data } = await supabase.storage.from(BUCKET).list(vivId, { limit: 100 });
    if (!data) { setEditFiles([]); return; }
    setEditFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({
      name: f.name,
      url: `${SUPA_STORAGE_URL}/${vivId}/${f.name}`,
    })));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editViv || !e.target.files?.length) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    for (const file of files) {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `${editViv.id}/${safeName}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) {
        console.error('Upload error:', error);
        toast.error(`Error subiendo ${file.name}`);
      }
    }
    await fetchFiles(editViv.id);
    // Sync photo_count after upload
    const { data: allFiles } = await supabase.storage.from(BUCKET).list(editViv.id, { limit: 100 });
    if (allFiles) {
      const imgCount = allFiles.filter(f => f.name !== '.emptyFolderPlaceholder' && /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(f.name)).length;
      await (supabase.from('viviendas' as any) as any).update({ photo_count: imgCount, updated_at: new Date().toISOString() }).eq('id', editViv.id);
      setViviendas(prev => prev.map(v => v.id === editViv.id ? { ...v, photo_count: imgCount } : v));
    }
    setUploading(false);
    toast.success(`${files.length} archivo${files.length > 1 ? 's' : ''} subido${files.length > 1 ? 's' : ''}`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileDelete = async (fileName: string) => {
    if (!editViv) return;
    const { error } = await supabase.storage.from(BUCKET).remove([`${editViv.id}/${fileName}`]);
    if (error) { toast.error('Error eliminando archivo'); return; }
    const remaining = editFiles.filter(f => f.name !== fileName);
    setEditFiles(remaining);
    // Update photo_count (count only images)
    const imgCount = remaining.filter(f => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(f.name)).length;
    await (supabase.from('viviendas' as any) as any).update({ photo_count: imgCount, updated_at: new Date().toISOString() }).eq('id', editViv.id);
    setViviendas(prev => prev.map(v => v.id === editViv.id ? { ...v, photo_count: imgCount } : v));
    toast.success('Archivo eliminado');
  };

  const openPhotoView = async (v: Vivienda) => {
    setPhotoViewViv(v);
    setPhotoViewLoading(true);
    setPhotoViewFiles([]);
    setCarouselIndex(0);
    const { data } = await supabase.storage.from(BUCKET).list(v.id, { limit: 100 });
    if (data) {
      const imgs = data.filter(f => f.name !== '.emptyFolderPlaceholder' && /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(f.name));
      setPhotoViewFiles(imgs.map(f => ({ name: f.name, url: `${SUPA_STORAGE_URL}/${v.id}/${f.name}` })));
    }
    setPhotoViewLoading(false);
  };

  const downloadAllPhotos = async () => {
    if (!photoViewViv || photoViewFiles.length === 0) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < photoViewFiles.length; i++) {
        const f = photoViewFiles[i];
        const ext = f.name.split('.').pop() || 'jpg';
        const res = await fetch(f.url);
        const blob = await res.blob();
        zip.file(`foto_${i + 1}.${ext}`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const tipo = photoViewViv.tipo_vivienda === 'departamento' ? 'Depto' : 'Casa';
      const comuna = (photoViewViv.comuna || 'sin-comuna').replace(/\s+/g, '-');
      const nombre = (photoViewViv.nombre || 'propietario').split(' ').slice(0, 2).join('-').replace(/\s+/g, '-');
      const fileName = `${tipo}-${comuna}-${nombre}.zip`;
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${photoViewFiles.length} fotos descargadas`);
    } catch (e) {
      console.error(e);
      toast.error('Error descargando fotos');
    }
    setDownloadingZip(false);
  };

  const downloadExcel = () => {
    const rows = filtered.map(v => ({
      'ID': v.id.substring(0, 6).toUpperCase(),
      'Estado': STATUS_MAP[v.status]?.label || v.status,
      'Nombre': v.nombre,
      'Teléfono': v.telefono,
      'Email': v.email || '',
      'Tipo': v.tipo_vivienda || '',
      'Dirección': v.direccion || '',
      'Detalle Depto': v.detalle_depto || '',
      'Comuna': v.comuna || '',
      'Valor UF': v.valor_pesos ? (UF_LABELS[v.valor_pesos] || v.valor_pesos) : '',
      'Superficie m2': v.superficie || '',
      'Dormitorios': v.dormitorios || '',
      'Baños': v.banos || '',
      'Fotos': v.photo_count || 0,
      'Lead Interesado': v.linked_lead_id && linkedLeads[v.linked_lead_id] ? linkedLeads[v.linked_lead_id].name : '',
      'Notas': v.notes || '',
      'Fuente': v.fuente || '',
      'Fecha Creación': new Date(v.created_at).toLocaleDateString('es-CL'),
      'Última Actualización': new Date(v.updated_at).toLocaleDateString('es-CL'),
      'Archivada': v.archived ? 'Sí' : 'No',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Viviendas');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Viviendas-LlavePropia-${today}.xlsx`);
    toast.success(`${rows.length} viviendas exportadas`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(v => v.id)));
    }
  };

  const BLOCKED_STATUSES = ['firma_mandato','eett_tasacion','borrador_escritura','escritura_firmada','inscrito_cbr','finalizado','propietario_no_interesado'];

  const bulkRequestPhotos = async () => {
    const targets = filtered.filter(v => selectedIds.has(v.id) && v.email && (v.photo_count || 0) === 0 && !v.archived && !BLOCKED_STATUSES.includes(v.status));
    if (targets.length === 0) {
      toast.error('Ninguna vivienda seleccionada tiene email y 0 fotos');
      return;
    }
    setBulkSending(true);
    let sent = 0;
    let noEmail = 0;
    let failed = 0;
    for (const v of targets) {
      try {
        const res = await fetch('/api/request-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vivienda_id: v.id }),
        });
        const data = await res.json();
        if (data.sent) sent++;
        else noEmail++;
      } catch {
        failed++;
      }
    }
    setBulkSending(false);
    setSelectedIds(new Set());
    const skipped = selectedIds.size - targets.length;
    let msg = `${sent} email${sent !== 1 ? 's' : ''} enviado${sent !== 1 ? 's' : ''}`;
    if (skipped > 0) msg += ` · ${skipped} omitidas (ya tienen fotos o sin email)`;
    if (failed > 0) msg += ` · ${failed} fallaron`;
    toast.success(msg);
  };

  const openEdit = (v: Vivienda) => {
    setEditViv({ ...v });
    setEditLeadSearch('');
    setEditLeadResults([]);
    fetchFiles(v.id);
  };

  const searchEditLeads = async (q: string) => {
    setEditLeadSearch(q);
    if (q.length < 2) { setEditLeadResults([]); return; }
    const { data } = await supabase.from('leads').select('id, name, phone').ilike('name', `%${q}%`).eq('is_demo', false).limit(8);
    setEditLeadResults((data || []) as LinkedLead[]);
  };

  const filtered = viviendas.filter(v => {
    if (showArchived) {
      if (!v.archived) return false;
    } else {
      if (v.archived) return false;
    }
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const linked = v.linked_lead_id ? linkedLeads[v.linked_lead_id] : null;
      const haystack = [v.nombre, v.telefono, v.email, v.tipo_vivienda, v.direccion, v.detalle_depto, v.comuna, v.notes, linked?.name].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (loading) return <div className="p-6 text-center text-muted-foreground">Cargando viviendas...</div>;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            {showArchived ? 'Archivadas' : 'Viviendas'} ({filtered.length})
          </h3>
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="https://www.llavepropia.cl/marketplace"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all no-underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Marketplace
            </a>
            <button
              onClick={downloadExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Excel
            </button>
            <button
              onClick={() => { setShowArchived(!showArchived); setStatusFilter('all'); setSelectedIds(new Set()); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showArchived ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              {showArchived ? 'Ver activas' : 'Ver archivadas'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setStatusFilter('all'); setSelectedIds(new Set()); }}
            className={`px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${statusFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Todos
          </button>
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setSelectedIds(new Set()); }}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${statusFilter === s.value ? 'bg-primary text-primary-foreground shadow-sm' : `${s.color} hover:shadow-sm`}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusFilter === s.value ? 'bg-white' : s.dot}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider sticky top-0 z-10" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <th style={{ background: '#ffffff' }} className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-blue-600"
                />
              </th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">ID</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Estado</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Propietario</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Tipo</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Dirección</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Comuna</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Valor</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">m2</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Dorm</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Baños</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Fotos</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Lead Interesado</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Notas</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2">Fecha</th>
              <th style={{ background: '#ffffff' }} className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => {
              const linked = v.linked_lead_id ? linkedLeads[v.linked_lead_id] : null;
              return (
                <tr key={v.id} className={`border-b border-border/40 transition-colors ${selectedIds.has(v.id) ? 'bg-blue-50/60' : 'hover:bg-muted/20'}`}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelect(v.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded select-all cursor-pointer" title={v.id} onClick={() => { navigator.clipboard.writeText(v.id.substring(0, 6).toUpperCase()); toast.success('ID copiado'); }}>
                      {v.id.substring(0, 6).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusDropdown value={v.status} onChange={s => handleStatusChange(v.id, s)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-bold text-foreground">{v.nombre}</div>
                    <div className="text-xs text-muted-foreground">{v.telefono}</div>
                    {v.email && <div className="text-xs text-muted-foreground">{v.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs capitalize">{v.tipo_vivienda || '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {v.direccion || '—'}
                    {v.detalle_depto && <div className="text-muted-foreground">Depto: {v.detalle_depto}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">{v.comuna || '—'}</td>
                  <td className="px-3 py-2 text-xs font-medium">{v.valor_pesos ? (UF_LABELS[v.valor_pesos] || v.valor_pesos) : '—'}</td>
                  <td className="px-3 py-2 text-xs text-center">{v.superficie ? `${v.superficie}` : '—'}</td>
                  <td className="px-3 py-2 text-xs text-center">{v.dormitorios || '—'}</td>
                  <td className="px-3 py-2 text-xs text-center">{v.banos || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {(() => {
                      const count = v.photo_count || 0;
                      return count > 0 ? (
                        <button
                          onClick={() => openPhotoView(v)}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                          title={`Ver ${count} foto${count > 1 ? 's' : ''}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {count}
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 bg-muted/30 text-muted-foreground/40 border border-border/30 px-2 py-1 rounded-md text-[11px] font-medium"
                          title="Sin fotos"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          0
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <LeadPicker
                        vivId={v.id}
                        currentLead={linked || null}
                        linkedLeads={linkedLeads}
                        setLinkedLeads={setLinkedLeads}
                        onPick={handleLeadPick}
                      />
                      <button
                        onClick={() => linked && handleSendMatchEmail(v)}
                        disabled={!linked || sendingEmailId === v.id}
                        title={linked ? "Enviar email con la propiedad al lead" : "Asigna un lead primero"}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors flex-shrink-0 ${linked ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-muted/30 text-muted-foreground/30 border-border/40 cursor-not-allowed'} disabled:opacity-50`}
                      >
                        {sendingEmailId === v.id ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[150px] truncate" title={v.notes || ''}>
                    {v.notes || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(v.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                    {v.updated_at !== v.created_at && (
                      <div className="text-[10px]">act. {new Date(v.updated_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {showArchived ? (
                        <button onClick={() => handleUnarchive(v.id)} className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-bold">Desarchivar</button>
                      ) : (
                        <>
                          <button onClick={() => openEdit(v)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent transition-colors font-bold">Editar</button>
                          <button onClick={() => setArchiveId(v.id)} className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Archivar">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={16} className="px-3 py-8 text-center text-muted-foreground">Sin viviendas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-20 bg-white border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">{selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}</span>
          <button
            onClick={bulkRequestPhotos}
            disabled={bulkSending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all disabled:opacity-50 shadow-sm"
          >
            {bulkSending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )}
            {bulkSending ? 'Enviando...' : 'Pedir fotos'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editViv} onOpenChange={open => { if (!open) { setEditViv(null); setEditLeadSearch(''); setEditLeadResults([]); setEditFiles([]); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Vivienda</DialogTitle>
          </DialogHeader>
          {editViv && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Nombre</label>
                  <input value={editViv.nombre} onChange={e => setEditViv({ ...editViv, nombre: e.target.value })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Teléfono</label>
                  <input value={editViv.telefono} onChange={e => setEditViv({ ...editViv, telefono: e.target.value })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Email</label>
                <input value={editViv.email || ''} onChange={e => setEditViv({ ...editViv, email: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Tipo</label>
                  <select value={editViv.tipo_vivienda || ''} onChange={e => setEditViv({ ...editViv, tipo_vivienda: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm">
                    <option value="">—</option>
                    <option value="casa">Casa</option>
                    <option value="departamento">Departamento</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Valor (UF)</label>
                  <select value={editViv.valor_pesos || ''} onChange={e => setEditViv({ ...editViv, valor_pesos: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm">
                    <option value="">—</option>
                    {Object.entries(UF_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Dirección</label>
                <input value={editViv.direccion || ''} onChange={e => setEditViv({ ...editViv, direccion: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              </div>
              {editViv.tipo_vivienda === 'departamento' && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Detalle depto</label>
                  <input value={editViv.detalle_depto || ''} onChange={e => setEditViv({ ...editViv, detalle_depto: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Comuna</label>
                  <input value={editViv.comuna || ''} onChange={e => setEditViv({ ...editViv, comuna: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Superficie m2</label>
                  <input type="number" value={editViv.superficie || ''} onChange={e => setEditViv({ ...editViv, superficie: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Dorm</label>
                    <input value={editViv.dormitorios || ''} onChange={e => setEditViv({ ...editViv, dormitorios: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Baños</label>
                    <input value={editViv.banos || ''} onChange={e => setEditViv({ ...editViv, banos: e.target.value || null })} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Estado</label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setEditViv({ ...editViv, status: s.value })}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-2.5 py-1.5 border transition-all ${editViv.status === s.value ? `${s.color} ring-2 ring-offset-1 ring-primary/30 shadow-sm` : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/60'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${editViv.status === s.value ? s.dot : 'bg-muted-foreground/30'}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Lead Interesado</label>
                {editViv.linked_lead_id && linkedLeads[editViv.linked_lead_id] ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                      <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[9px] font-bold">
                        {linkedLeads[editViv.linked_lead_id].name.charAt(0).toUpperCase()}
                      </div>
                      {linkedLeads[editViv.linked_lead_id].name} — {linkedLeads[editViv.linked_lead_id].phone}
                    </span>
                    <button onClick={() => setEditViv({ ...editViv, linked_lead_id: null })} className="text-xs text-destructive hover:underline">Quitar</button>
                  </div>
                ) : null}
                <div className="relative">
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    value={editLeadSearch}
                    onChange={e => searchEditLeads(e.target.value)}
                    placeholder="Buscar lead por nombre..."
                    className="w-full pl-7 pr-2 py-1.5 rounded border border-border bg-background text-sm"
                  />
                </div>
                {editLeadResults.length > 0 && (
                  <div className="mt-1 border border-border rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto">
                    {editLeadResults.map(l => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setEditViv({ ...editViv, linked_lead_id: l.id });
                          setLinkedLeads(prev => ({ ...prev, [l.id]: l }));
                          setEditLeadSearch('');
                          setEditLeadResults([]);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-blue-50/60 transition-colors border-b border-border/20 last:border-0"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {l.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{l.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{l.phone}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Archivos */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Archivos / Fotos</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-dashed border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors mb-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Subir archivos
                    </>
                  )}
                </button>
                {editFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editFiles.map(f => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(f.name);
                      return (
                        <div key={f.name} className="relative group border border-border rounded-lg overflow-hidden bg-muted/30">
                          {isImage ? (
                            <a href={f.url} target="_blank" rel="noreferrer">
                              <img src={f.url} alt={f.name} className="w-full h-20 object-cover" />
                            </a>
                          ) : (
                            <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center justify-center h-20 p-2">
                              <div className="text-center">
                                <svg className="w-6 h-6 mx-auto text-muted-foreground mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="text-[9px] text-muted-foreground truncate block max-w-full">{f.name.split('-').slice(1).join('-')}</span>
                              </div>
                            </a>
                          )}
                          <button
                            onClick={() => handleFileDelete(f.name)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            title="Eliminar"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {editFiles.length === 0 && !uploading && (
                  <p className="text-[11px] text-muted-foreground">Sin archivos subidos</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Notas</label>
                <textarea
                  value={editViv.notes || ''}
                  onChange={e => setEditViv({ ...editViv, notes: e.target.value || null })}
                  rows={3}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditViv(null); setEditLeadSearch(''); setEditLeadResults([]); setEditFiles([]); }}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog — Carousel */}
      <Dialog open={!!photoViewViv} onOpenChange={open => { if (!open) { setPhotoViewViv(null); setPhotoViewFiles([]); setCarouselIndex(0); } }}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          onKeyDown={(e: React.KeyboardEvent) => {
            if (photoViewFiles.length === 0) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); setCarouselIndex(i => (i - 1 + photoViewFiles.length) % photoViewFiles.length); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setCarouselIndex(i => (i + 1) % photoViewFiles.length); }
          }}
          tabIndex={0}
        >
          <DialogHeader>
            <DialogTitle>
              Fotos — {photoViewViv?.nombre}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {photoViewViv?.tipo_vivienda === 'departamento' ? 'Depto' : 'Casa'} en {photoViewViv?.comuna || '—'}
              </span>
            </DialogTitle>
          </DialogHeader>
          {photoViewLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Cargando fotos...</div>
          ) : photoViewFiles.length > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Main image with arrows */}
              <div className="relative bg-black/5 rounded-lg overflow-hidden flex items-center justify-center w-full" style={{ minHeight: 320 }}>
                <img
                  src={photoViewFiles[carouselIndex]?.url}
                  alt={photoViewFiles[carouselIndex]?.name}
                  className="max-h-[50vh] w-full object-contain"
                />
                {photoViewFiles.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIndex(i => (i - 1 + photoViewFiles.length) % photoViewFiles.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                      aria-label="Anterior"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                      onClick={() => setCarouselIndex(i => (i + 1) % photoViewFiles.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                      aria-label="Siguiente"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </>
                )}
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  {carouselIndex + 1} / {photoViewFiles.length}
                </span>
              </div>
              {/* Thumbnails */}
              {photoViewFiles.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photoViewFiles.map((f, idx) => (
                    <button
                      key={f.name}
                      onClick={() => setCarouselIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${idx === carouselIndex ? 'border-primary ring-1 ring-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">Sin fotos subidas</div>
          )}
          <DialogFooter className="flex-wrap gap-1.5">
            {photoViewFiles.length > 0 && (
              <Button variant="default" size="sm" onClick={downloadAllPhotos} disabled={downloadingZip} className="bg-emerald-600 hover:bg-emerald-700">
                {downloadingZip ? (
                  <><svg className="w-3.5 h-3.5 animate-spin mr-1" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Descargando...</>
                ) : (
                  <><svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Descargar ZIP</>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(`https://www.llavepropia.cl/galeria?id=${photoViewViv?.id}`);
              toast.success('Link copiado');
            }}>
              Link para Interesados
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(`https://www.llavepropia.cl/subir-fotos?id=${photoViewViv?.id}`);
              toast.success('Link de subida copiado');
            }}>
              Link subir fotos
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setPhotoViewViv(null); setPhotoViewFiles([]); setCarouselIndex(0); }}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={!!archiveId} onOpenChange={open => { if (!open) setArchiveId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar vivienda</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">La vivienda se moverá a archivadas. Podrás desarchivarla en cualquier momento.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveId(null)}>Cancelar</Button>
            <Button onClick={handleArchive} className="bg-amber-600 hover:bg-amber-700 text-white">Archivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViviendaList;
