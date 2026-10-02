import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useAliado,
  useAliadoDocumentos,
  useAliadoHistorial,
  ESTADO_LABELS,
  ESTADO_COLORS,
  DOCS_DEPENDIENTE,
  DOCS_INDEPENDIENTE,
  type AliadoCliente,
} from '@/hooks/useAliado';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Download, Upload, Check, X, Clock, FileText } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ESTADO_ORDER = [
  'ingreso_incompleto',
  'ingresado',
  'en_evaluacion',
  'aprobado_entidad',
  'contrato_firmado',
  'pago_hito_1',
  'pago_hito_2',
  'escriturado',
  'rechazado_entidad',
  'rechazado_preexistente',
  'desistido',
  'bloqueo_vencido',
];

const AliadoClienteFicha = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { aliado } = useAliado(user?.id);
  const { documentos, refetch: refetchDocs } = useAliadoDocumentos(id);
  const { historial, refetch: refetchHistorial } = useAliadoHistorial(id);

  const [cliente, setCliente] = useState<AliadoCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [changingEstado, setChangingEstado] = useState(false);
  const [showEstadoMenu, setShowEstadoMenu] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('aliado_clientes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setCliente(data as AliadoCliente | null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cliente no encontrado</p>
      </div>
    );
  }

  const diasRestantes = Math.max(0, Math.ceil((new Date(cliente.fecha_fin_bloqueo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const docsRequired = cliente.tipo_renta === 'dependiente' ? DOCS_DEPENDIENTE : DOCS_INDEPENDIENTE;
  const compDocsRequired = cliente.complementa_renta
    ? (cliente.comp_tipo_renta === 'dependiente' ? DOCS_DEPENDIENTE : DOCS_INDEPENDIENTE)
    : [];

  const uploadedKeys = new Set(
    documentos
      .filter(d => !d.es_complementante)
      .map(d => d.tipo_documento)
  );
  const compUploadedKeys = new Set(
    documentos
      .filter(d => d.es_complementante)
      .map(d => d.tipo_documento)
  );

  const handleUpload = async (docKey: string, isComp: boolean, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Archivo muy grande (max 10MB)');
      return;
    }
    const uploadKey = isComp ? `comp_${docKey}` : docKey;
    setUploading(uploadKey);
    try {
      const ext = file.name.split('.').pop();
      const path = `${cliente.id}/${uploadKey}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('aliado-documents')
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      await supabase.from('aliado_cliente_documentos').insert({
        aliado_cliente_id: cliente.id,
        tipo_documento: docKey,
        es_complementante: isComp,
        storage_path: path,
        filename: file.name,
      });

      toast.success('Documento subido');
      refetchDocs();

      // Check if all docs are now complete → update estado
      const { data: allDocs } = await supabase
        .from('aliado_cliente_documentos')
        .select('tipo_documento, es_complementante')
        .eq('aliado_cliente_id', cliente.id);

      const titularKeys = new Set((allDocs ?? []).filter(d => !d.es_complementante).map(d => d.tipo_documento));
      const compKeys = new Set((allDocs ?? []).filter(d => d.es_complementante).map(d => d.tipo_documento));
      const allComplete = docsRequired.every(d => titularKeys.has(d.key)) &&
        compDocsRequired.every(d => compKeys.has(d.key));

      if (allComplete && cliente.estado === 'ingreso_incompleto' && aliado) {
        await supabase
          .from('aliado_clientes')
          .update({ estado: 'ingresado' })
          .eq('id', cliente.id);
        await supabase.from('aliado_cliente_historial').insert({
          aliado_cliente_id: cliente.id,
          estado_anterior: 'ingreso_incompleto',
          estado_nuevo: 'ingresado',
          user_id: user!.id,
        });
        setCliente(prev => prev ? { ...prev, estado: 'ingresado' } : null);
        toast.success('Documentacion completa');

        // Send email: docs now complete
        const fechaIngreso = new Date(cliente.fecha_ingreso).toLocaleString('es-CL', { timeZone: 'America/Santiago' });
        fetch(`${window.location.origin}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: [aliado.email_contacto],
            cc: ['rodrigo.canas@llavepropia.cl', 'vicente.torres@proppi.cl'],
            subject: `[Alianza ${aliado.nombre_comercial}] Documentacion completa - ${cliente.nombre} - ${cliente.rut}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#059669;">Documentacion completada</h2>
              <p>El cliente <strong>${cliente.nombre}</strong> (${cliente.rut}) ahora tiene toda su documentacion completa y esta listo para revision.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:4px 8px;color:#6b7280;">Aliado:</td><td style="padding:4px 8px;font-weight:bold;">${aliado.nombre_comercial}</td></tr>
                <tr><td style="padding:4px 8px;color:#6b7280;">Cliente:</td><td style="padding:4px 8px;font-weight:bold;">${cliente.nombre}</td></tr>
                <tr><td style="padding:4px 8px;color:#6b7280;">RUT:</td><td style="padding:4px 8px;">${cliente.rut}</td></tr>
                <tr><td style="padding:4px 8px;color:#6b7280;">Telefono:</td><td style="padding:4px 8px;">${cliente.telefono ?? '-'}</td></tr>
                <tr><td style="padding:4px 8px;color:#6b7280;">Email:</td><td style="padding:4px 8px;">${cliente.email ?? '-'}</td></tr>
                <tr><td style="padding:4px 8px;color:#6b7280;">Comuna:</td><td style="padding:4px 8px;">${cliente.comuna ?? '-'}</td></tr>
                <tr><td style="padding:4px 8px;color:#6b7280;">Fecha ingreso:</td><td style="padding:4px 8px;">${fechaIngreso}</td></tr>
                <tr><td style="padding:4px 8px;color:#6b7280;">Estado:</td><td style="padding:4px 8px;color:#059669;font-weight:bold;">Ingresado (docs completos)</td></tr>
              </table>
              <p style="margin-top:16px;">Puede revisar los documentos en el <a href="https://www.llavepropia.cl/crm" style="color:#2DB89E;font-weight:bold;">CRM de Llave Propia</a>.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
              <p style="color:#9ca3af;font-size:12px;">Correo automatico del portal de aliados de Llave Propia.</p>
            </div>`,
          }),
        }).catch(console.error);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Error al subir');
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (doc: typeof documentos[0]) => {
    try {
      // Log access
      await supabase.from('aliado_doc_access_log').insert({
        documento_id: doc.id,
        user_id: user!.id,
        action: 'download',
      });

      const { data, error } = await supabase.storage
        .from('aliado-documents')
        .createSignedUrl(doc.storage_path, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast.error('Error al descargar');
    }
  };

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (!cliente || nuevoEstado === cliente.estado) return;
    setChangingEstado(true);
    try {
      const estadoAnterior = cliente.estado;
      await supabase
        .from('aliado_clientes')
        .update({ estado: nuevoEstado })
        .eq('id', cliente.id);
      await supabase.from('aliado_cliente_historial').insert({
        aliado_cliente_id: cliente.id,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        user_id: user!.id,
      });
      setCliente(prev => prev ? { ...prev, estado: nuevoEstado } : null);
      refetchHistorial();
      toast.success(`Estado actualizado a "${ESTADO_LABELS[nuevoEstado] ?? nuevoEstado}"`);
    } catch (err: any) {
      toast.error(err.message ?? 'Error al cambiar estado');
    }
    setChangingEstado(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/aliado')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src="https://www.llavepropia.cl/logo_intermedina.png" alt="Intermedina" className="h-7" />
          <div className="h-5 w-px bg-gray-200" />
          <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" className="h-5 hidden sm:block" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{cliente.nombre}</h1>
            <p className="text-xs text-gray-500">{cliente.rut}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowEstadoMenu(!showEstadoMenu)}
              disabled={changingEstado}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${ESTADO_COLORS[cliente.estado] ?? 'bg-gray-100'}`}
            >
              {ESTADO_LABELS[cliente.estado] ?? cliente.estado}
              <svg className="h-3 w-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showEstadoMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEstadoMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-xl border shadow-lg py-1 max-h-80 overflow-y-auto">
                  {ESTADO_ORDER.map(est => (
                    <button
                      key={est}
                      onClick={() => { handleEstadoChange(est); setShowEstadoMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition flex items-center gap-2 ${
                        est === cliente.estado
                          ? 'bg-gray-50 font-bold text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        (ESTADO_COLORS[est] ?? 'bg-gray-100').split(' ')[0]
                      }`} />
                      {ESTADO_LABELS[est] ?? est}
                      {est === cliente.estado && (
                        <svg className="ml-auto h-4 w-4 text-[#2DB89E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Info */}
        <div className="bg-white rounded-lg border p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-4">Informacion del cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <InfoRow label="Nombre" value={cliente.nombre} />
            <InfoRow label="RUT" value={cliente.rut} />
            <InfoRow label="Telefono" value={cliente.telefono ?? '-'} />
            <InfoRow label="Email" value={cliente.email ?? '-'} />
            <InfoRow label="Comuna" value={cliente.comuna ?? '-'} />
            <InfoRow label="Tipo de renta" value={cliente.tipo_renta === 'dependiente' ? 'Dependiente' : 'Independiente'} />
            <InfoRow label="Fecha ingreso" value={new Date(cliente.fecha_ingreso).toLocaleString('es-CL', { timeZone: 'America/Santiago' })} />
            <InfoRow label="Bloqueo hasta" value={new Date(cliente.fecha_fin_bloqueo).toLocaleDateString('es-CL')} />
            <InfoRow
              label="Dias restantes"
              value={String(diasRestantes)}
              valueClass={diasRestantes <= 30 ? 'text-red-600 font-bold' : ''}
            />
            {cliente.complementa_renta && (
              <>
                <InfoRow label="Complementante" value={cliente.comp_nombre ?? '-'} />
                <InfoRow label="RUT complementante" value={cliente.comp_rut ?? '-'} />
              </>
            )}
            {cliente.comentarios && (
              <div className="sm:col-span-2">
                <InfoRow label="Comentarios" value={cliente.comentarios} />
              </div>
            )}
          </div>
        </div>

        {/* Documents - titular */}
        <div className="bg-white rounded-lg border p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-1">Documentos del titular</h2>
          <p className="text-xs text-gray-500 mb-4">
            {uploadedKeys.size}/{docsRequired.length} documentos subidos
          </p>
          <div className="space-y-2">
            {docsRequired.map(doc => {
              const uploaded = documentos.filter(d => !d.es_complementante && d.tipo_documento === doc.key);
              return (
                <DocItem
                  key={doc.key}
                  label={doc.label}
                  uploaded={uploaded}
                  isUploading={uploading === doc.key}
                  onUpload={f => handleUpload(doc.key, false, f)}
                  onDownload={handleDownload}
                />
              );
            })}
          </div>
        </div>

        {/* Documents - complementante */}
        {cliente.complementa_renta && compDocsRequired.length > 0 && (
          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="font-bold text-gray-900 mb-1">Documentos del complementante</h2>
            <p className="text-xs text-gray-500 mb-4">
              {compUploadedKeys.size}/{compDocsRequired.length} documentos subidos
            </p>
            <div className="space-y-2">
              {compDocsRequired.map(doc => {
                const uploaded = documentos.filter(d => d.es_complementante && d.tipo_documento === doc.key);
                return (
                  <DocItem
                    key={`comp_${doc.key}`}
                    label={doc.label}
                    uploaded={uploaded}
                    isUploading={uploading === `comp_${doc.key}`}
                    onUpload={f => handleUpload(doc.key, true, f)}
                    onDownload={handleDownload}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        {historial.length > 0 && (
          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="font-bold text-gray-900 mb-4">Historial de estados</h2>
            <div className="space-y-3">
              {historial.map(h => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-700">
                      {h.estado_anterior ? (
                        <>{ESTADO_LABELS[h.estado_anterior] ?? h.estado_anterior} &rarr; </>
                      ) : null}
                      <span className="font-semibold">{ESTADO_LABELS[h.estado_nuevo] ?? h.estado_nuevo}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-medium text-gray-900 ${valueClass ?? ''}`}>{value}</p>
    </div>
  );
}

function DocItem({
  label, uploaded, isUploading, onUpload, onDownload,
}: {
  label: string;
  uploaded: { id: string; storage_path: string; filename: string; uploaded_at: string }[];
  isUploading: boolean;
  onUpload: (f: File) => void;
  onDownload: (doc: any) => void;
}) {
  const hasFile = uploaded.length > 0;
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-md border ${hasFile ? 'border-green-200 bg-green-50/50' : 'border-dashed'}`}>
      {hasFile ? (
        <Check className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-gray-300 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">{label}</p>
        {hasFile && (
          <p className="text-xs text-gray-400 truncate">{uploaded[uploaded.length - 1].filename}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {hasFile && (
          <button
            type="button"
            onClick={() => onDownload(uploaded[uploaded.length - 1])}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            title="Descargar"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <label className={`cursor-pointer p-1.5 rounded hover:bg-gray-100 ${isUploading ? 'opacity-50 pointer-events-none' : 'text-[#2DB89E]'}`}>
          <Upload className="h-4 w-4" />
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default AliadoClienteFicha;
