import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface LeadDocument {
  id: string;
  file_name: string;
  file_size: number | null;
  storage_path: string;
  created_at: string;
}

interface LeadDocumentsProps {
  leadId: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LeadDocuments({ leadId }: LeadDocumentsProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('lead_documents')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (data) setDocuments(data as LeadDocument[]);
  };

  useEffect(() => {
    fetchDocuments();
  }, [leadId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let uploaded = 0;
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = `${leadId}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('lead-documents')
          .upload(storagePath, file);
        if (uploadError) { toast.error(`Error al subir ${file.name}: ${uploadError.message}`); continue; }

        const { error: dbError } = await supabase.from('lead_documents').insert({
          lead_id: leadId,
          file_name: file.name,
          file_size: file.size,
          storage_path: storagePath,
          uploaded_by: user?.id,
        });
        if (dbError) { toast.error(`Error al registrar ${file.name}: ${dbError.message}`); continue; }
        uploaded++;
      }
      if (uploaded > 0) {
        toast.success(`${uploaded} archivo${uploaded > 1 ? 's' : ''} subido${uploaded > 1 ? 's' : ''} correctamente`);
        fetchDocuments();
      }
    } catch (err: any) {
      toast.error(`Error al subir: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: LeadDocument) => {
    const { data, error } = await supabase.storage
      .from('lead-documents')
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      toast.error('No se pudo generar el enlace');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (doc: LeadDocument) => {
    if (!confirm(`¿Eliminar "${doc.file_name}"?`)) return;
    setDeleting(doc.id);
    try {
      await supabase.storage.from('lead-documents').remove([doc.storage_path]);
      await supabase.from('lead_documents').delete().eq('id', doc.id);
      toast.success('Documento eliminado');
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const getFileEmoji = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext ?? '')) return '📄';
    if (['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext ?? '')) return '🖼️';
    if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) return '📊';
    if (['doc', 'docx'].includes(ext ?? '')) return '📝';
    return '📎';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">📁 Documentos</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept="*/*"
            multiple
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs h-7"
          >
            {uploading ? '⏳ Subiendo...' : '⬆️ Subir archivos'}
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Sin documentos. Sube el primero con el botón de arriba.
        </p>
      ) : (
        <div className="space-y-1.5">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border/50 group"
            >
              <span className="text-base">{getFileEmoji(doc.file_name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{doc.file_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('es-CL')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  title="Descargar / Ver"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deleting === doc.id}
                  className="text-xs px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                  title="Eliminar"
                >
                  {deleting === doc.id ? '...' : '×'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
