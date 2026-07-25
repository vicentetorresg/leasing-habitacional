import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface LeadDocument {
  id: string;
  doc_type: string;
  file_name: string;
  file_path: string;
  storage_path?: string;
  file_size: number | null;
  uploaded_at: string;
}

interface LeadDocumentsProps {
  leadId: string;
  docToken?: string | null;
  leadEmail?: string | null;
}

const DOC_LABELS: Record<string, string> = {
  cedula: 'Cédula de identidad',
  liquidaciones: 'Liquidaciones de sueldo',
  cotizaciones_afp: 'Cotizaciones AFP',
  contrato_trabajo: 'Contrato de trabajo',
  deuda_cmf: 'Deuda CMF',
  certificado_matrimonio: 'Cert. matrimonio',
  carpeta_tributaria: 'Carpeta tributaria',
  boletas_honorarios: 'Boletas honorarios',
  comp_cedula: 'Comp. - Cédula',
  comp_liquidaciones: 'Comp. - Liquidaciones',
  comp_cotizaciones_afp: 'Comp. - Cotizaciones AFP',
  comp_contrato_trabajo: 'Comp. - Contrato',
  comp_deuda_cmf: 'Comp. - Deuda CMF',
  comp_certificado_matrimonio: 'Comp. - Cert. matrimonio',
  manual: 'Documento manual',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileEmoji(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext ?? '')) return '🖼️';
  if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) return '📊';
  return '📎';
}

export default function LeadDocuments({ leadId, docToken, leadEmail }: LeadDocumentsProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('lead_documents' as any)
      .select('*')
      .eq('lead_id', leadId)
      .order('uploaded_at', { ascending: true });
    if (data) setDocuments(data as any as LeadDocument[]);
  }, [leadId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${leadId}/manual/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('lead-documents')
        .upload(storagePath, file);
      if (uploadError) { toast.error(`Error: ${uploadError.message}`); continue; }

      await supabase.from('lead_documents' as any).insert({
        lead_id: leadId,
        doc_type: 'manual',
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
      } as any);
      uploaded++;
    }
    if (uploaded > 0) {
      toast.success(`${uploaded} archivo${uploaded > 1 ? 's' : ''} subido${uploaded > 1 ? 's' : ''}`);
      fetchDocuments();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getPath = (doc: LeadDocument) => doc.file_path || doc.storage_path || '';

  const handleDownload = async (doc: LeadDocument) => {
    const { data } = await supabase.storage.from('lead-documents').createSignedUrl(getPath(doc), 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('No se pudo generar el enlace');
  };

  const handleDelete = async (doc: LeadDocument) => {
    setDeleting(doc.id);
    await supabase.storage.from('lead-documents').remove([getPath(doc)]);
    await supabase.from('lead_documents' as any).delete().eq('id', doc.id);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast.success('Eliminado');
    setDeleting(null);
  };

  const requestDocs = async () => {
    if (!leadEmail) { toast.error('Lead no tiene email'); return; }
    setRequesting(true);
    try {
      const res = await fetch('/api/docs?action=request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId })
      });
      if (res.ok) toast.success('Email enviado solicitando documentos');
      else { const d = await res.json(); toast.error(d.error || 'Error'); }
    } catch { toast.error('Error de conexión'); }
    setRequesting(false);
  };

  const copyUploadLink = () => {
    if (!docToken) { toast.error('Sin token'); return; }
    navigator.clipboard.writeText(`https://www.llavepropia.cl/documentos.html?t=${docToken}`);
    toast.success('Link copiado');
  };

  // Group by doc_type
  const grouped = documents.reduce((acc, d) => {
    (acc[d.doc_type] = acc[d.doc_type] || []).push(d);
    return acc;
  }, {} as Record<string, LeadDocument[]>);

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Documentos ({documents.length})</h3>
        <div className="flex gap-1.5 flex-wrap">
          {docToken && (
            <button onClick={copyUploadLink} className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold" title="Copiar link de subida">
              🔗 Link
            </button>
          )}
          <button onClick={requestDocs} disabled={requesting || !leadEmail} className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white font-semibold disabled:opacity-50" title="Enviar email pidiendo documentos">
            {requesting ? '...' : '📧 Pedir docs'}
          </button>
          <div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept="*/*" multiple />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {uploading ? '⏳...' : '⬆️ Subir'}
            </button>
          </div>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3 italic">Sin documentos subidos</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([type, typeDocs]) => (
            <div key={type} className="bg-background rounded-lg p-2.5 border border-border">
              <p className="text-[11px] font-bold text-primary uppercase mb-1">
                {DOC_LABELS[type] || type}
              </p>
              {typeDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 py-1 text-xs group">
                  <span>{getFileEmoji(doc.file_name)}</span>
                  <button onClick={() => handleDownload(doc)} className="text-foreground hover:text-primary truncate flex-1 text-left" title={doc.file_name}>
                    {doc.file_name}
                  </button>
                  <span className="text-muted-foreground text-[10px] shrink-0">{formatBytes(doc.file_size)}</span>
                  <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id} className="text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 text-[10px] shrink-0" title="Eliminar">
                    {deleting === doc.id ? '...' : '×'}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
