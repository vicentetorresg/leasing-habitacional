import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useAliado,
  validarRut,
  formatRut,
  formatRutLive,
  DOCS_DEPENDIENTE,
  DOCS_INDEPENDIENTE,
} from '@/hooks/useAliado';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Check, X, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const AliadoNuevoCliente = () => {
  const { user } = useAuth();
  const { aliado } = useAliado(user?.id);
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [comuna, setComuna] = useState('');
  const [tipoRenta, setTipoRenta] = useState<'dependiente' | 'independiente'>('dependiente');
  const [complementaRenta, setComplementaRenta] = useState(false);
  const [compNombre, setCompNombre] = useState('');
  const [compRut, setCompRut] = useState('');
  const [compTipoRenta, setCompTipoRenta] = useState<'dependiente' | 'independiente'>('dependiente');
  const [comentarios, setComentarios] = useState('');
  const [declaracion, setDeclaracion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Files indexed by doc key (e.g. 'cedula_frente', 'comp_cedula_frente')
  const [files, setFiles] = useState<Record<string, File>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const docsRequired = tipoRenta === 'dependiente' ? DOCS_DEPENDIENTE : DOCS_INDEPENDIENTE;
  const compDocsRequired = complementaRenta
    ? (compTipoRenta === 'dependiente' ? DOCS_DEPENDIENTE : DOCS_INDEPENDIENTE)
    : [];

  const handleFileSelect = (key: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Archivo muy grande (max 10MB)`);
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Solo PDF, JPG o PNG');
      return;
    }
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const removeFile = (key: string) => {
    setFiles(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliado) return;

    // Validate RUT
    if (!validarRut(rut)) {
      toast.error('RUT invalido');
      return;
    }
    if (complementaRenta && compRut && !validarRut(compRut)) {
      toast.error('RUT del complementante invalido');
      return;
    }
    if (!declaracion) {
      toast.error('Debes aceptar la declaracion de autorizacion');
      return;
    }

    setSubmitting(true);
    try {
      // Check duplicate RUT for this aliado
      const { data: existing } = await supabase
        .from('aliado_clientes')
        .select('id')
        .eq('aliado_id', aliado.id)
        .eq('rut', rut)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error('Ya ingresaste un cliente con este RUT');
        setSubmitting(false);
        return;
      }

      // Check if RUT exists anywhere in leads (preexistente check)
      const { data: existingLead } = await supabase
        .from('aliado_clientes')
        .select('id')
        .eq('rut', rut)
        .neq('aliado_id', aliado.id)
        .limit(1);

      const isPreexistente = (existingLead && existingLead.length > 0);

      // Also check leads table
      let preexistenteInLeads = false;
      const { data: leadsMatch } = await supabase
        .from('leads')
        .select('id')
        .eq('rut', rut)
        .is('aliado_id', null)
        .limit(1);
      if (leadsMatch && leadsMatch.length > 0) {
        preexistenteInLeads = true;
      }

      const hasAllDocs = docsRequired.every(d => files[d.key]) &&
        compDocsRequired.every(d => files[`comp_${d.key}`]);

      const estado = hasAllDocs ? 'ingresado' : 'ingreso_incompleto';

      // Insert client
      const { data: cliente, error: insertError } = await supabase
        .from('aliado_clientes')
        .insert({
          aliado_id: aliado.id,
          nombre,
          rut: rut,
          telefono: telefono || null,
          email: email || null,
          comuna: comuna || null,
          tipo_renta: tipoRenta,
          complementa_renta: complementaRenta,
          comp_nombre: complementaRenta ? compNombre || null : null,
          comp_rut: complementaRenta && compRut ? compRut : null,
          comp_tipo_renta: complementaRenta ? compTipoRenta : null,
          comentarios: comentarios || null,
          estado,
          preexistente: isPreexistente || preexistenteInLeads,
          declaracion_autorizacion: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload files
      const uploadPromises = Object.entries(files).map(async ([key, file]) => {
        const isComp = key.startsWith('comp_');
        const docKey = isComp ? key.replace('comp_', '') : key;
        const ext = file.name.split('.').pop();
        const path = `${cliente.id}/${key}_${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('aliado-documents')
          .upload(path, file);

        if (uploadErr) {
          console.error('Upload error:', key, uploadErr);
          return;
        }

        await supabase.from('aliado_cliente_documentos').insert({
          aliado_cliente_id: cliente.id,
          tipo_documento: docKey,
          es_complementante: isComp,
          storage_path: path,
          filename: file.name,
        });
      });

      await Promise.all(uploadPromises);

      // Insert initial history entry
      await supabase.from('aliado_cliente_historial').insert({
        aliado_cliente_id: cliente.id,
        estado_anterior: null,
        estado_nuevo: estado,
        user_id: user!.id,
      });

      // Send confirmation email via API
      const emailBody = {
        to: [aliado.email_contacto, ...(aliado.emails_internos || [])],
        subject: `[Alianza ${aliado.nombre_comercial}] Nuevo cliente ingresado - ${nombre} - ${rut} - ${new Date().toLocaleDateString('es-CL')}`,
        html: buildConfirmationEmail(aliado, cliente, nombre, rut, estado, Object.keys(files), docsRequired, compDocsRequired, isPreexistente || preexistenteInLeads),
      };

      const emailRes = await fetch(`${window.location.origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailBody),
      });
      const emailError = emailRes.ok ? null : await emailRes.json().catch(() => ({ error: 'unknown' }));

      // Log email
      await supabase.from('aliado_email_log').insert({
        aliado_cliente_id: cliente.id,
        destinatarios: [aliado.email_contacto, ...aliado.emails_internos],
        asunto: emailBody.subject,
        status: emailError ? 'failed' : 'sent',
        error: emailError ? String(emailError) : null,
      });

      toast.success('Cliente ingresado correctamente');
      navigate('/aliado');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? 'Error al ingresar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  if (!aliado) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/aliado')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src="https://www.llavepropia.cl/logo_intermedina.png" alt={aliado.nombre_comercial} className="h-8" />
          <div className="h-5 w-px bg-gray-200" />
          <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" className="h-5 hidden sm:block" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ingresar nuevo cliente</h1>
            <p className="text-xs text-gray-500">Portal de Aliados</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del cliente */}
          <Section title="Datos del cliente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre completo *" required>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} required />
              </Field>
              <Field label="RUT *" required>
                <Input
                  value={rut}
                  onChange={e => setRut(formatRutLive(e.target.value))}
                  placeholder="12.345.678-9"
                  maxLength={12}
                  required
                />
                {rut.length >= 8 && !validarRut(rut) && (
                  <p className="text-xs text-red-500 mt-1">RUT invalido</p>
                )}
              </Field>
              <Field label="Telefono">
                <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 ..." />
              </Field>
              <Field label="Correo">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Comuna">
                <Input value={comuna} onChange={e => setComuna(e.target.value)} />
              </Field>
              <Field label="Tipo de renta *">
                <select
                  value={tipoRenta}
                  onChange={e => setTipoRenta(e.target.value as any)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="dependiente">Dependiente</option>
                  <option value="independiente">Independiente</option>
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={complementaRenta}
                onChange={e => setComplementaRenta(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Complementa renta con otra persona</span>
            </label>
          </Section>

          {/* Complementante */}
          {complementaRenta && (
            <Section title="Datos del complementante">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre completo">
                  <Input value={compNombre} onChange={e => setCompNombre(e.target.value)} />
                </Field>
                <Field label="RUT">
                  <Input value={compRut} onChange={e => setCompRut(formatRutLive(e.target.value))} placeholder="12.345.678-9" maxLength={12} />
                  {compRut.length >= 8 && !validarRut(compRut) && (
                    <p className="text-xs text-red-500 mt-1">RUT invalido</p>
                  )}
                </Field>
                <Field label="Tipo de renta">
                  <select
                    value={compTipoRenta}
                    onChange={e => setCompTipoRenta(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="dependiente">Dependiente</option>
                    <option value="independiente">Independiente</option>
                  </select>
                </Field>
              </div>
            </Section>
          )}

          {/* Documentos del titular */}
          <Section title="Documentos del titular">
            <p className="text-xs text-gray-500 mb-3">
              Puedes enviar con documentos incompletos. El cliente quedara como "Ingreso incompleto" y podras subir los faltantes despues.
            </p>
            <div className="space-y-2">
              {docsRequired.map(doc => (
                <DocRow
                  key={doc.key}
                  docKey={doc.key}
                  label={doc.label}
                  file={files[doc.key]}
                  onSelect={f => handleFileSelect(doc.key, f)}
                  onRemove={() => removeFile(doc.key)}
                  inputRef={el => { fileInputRefs.current[doc.key] = el; }}
                />
              ))}
            </div>
          </Section>

          {/* Documentos del complementante */}
          {complementaRenta && compDocsRequired.length > 0 && (
            <Section title="Documentos del complementante">
              <div className="space-y-2">
                {compDocsRequired.map(doc => {
                  const key = `comp_${doc.key}`;
                  return (
                    <DocRow
                      key={key}
                      docKey={key}
                      label={doc.label}
                      file={files[key]}
                      onSelect={f => handleFileSelect(key, f)}
                      onRemove={() => removeFile(key)}
                      inputRef={el => { fileInputRefs.current[key] = el; }}
                    />
                  );
                })}
              </div>
            </Section>
          )}

          {/* Comentarios */}
          <Section title="Comentarios (opcional)">
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Informacion adicional sobre el cliente..."
            />
          </Section>

          {/* Declaracion */}
          <div className="bg-white rounded-lg border p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={declaracion}
                onChange={e => setDeclaracion(e.target.checked)}
                className="rounded mt-1"
                required
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                Declaro que el cliente ha autorizado el envio de sus datos personales y documentos a Llave Propia
                para la evaluacion de leasing habitacional, y que es un cliente real con contacto efectivo.
              </span>
            </label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting || !nombre || !rut || !declaracion}
            className="w-full h-12 bg-[#2DB89E] hover:bg-[#25a08a] text-white font-bold text-base"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </span>
            ) : (
              'Ingresar cliente'
            )}
          </Button>
        </form>
      </main>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
      <h2 className="font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function DocRow({
  docKey, label, file, onSelect, onRemove, inputRef,
}: {
  docKey: string;
  label: string;
  file?: File;
  onSelect: (f: File | undefined) => void;
  onRemove: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md border border-dashed hover:border-gray-400 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{label}</p>
        {file && <p className="text-xs text-green-600 truncate">{file.name}</p>}
      </div>
      {file ? (
        <div className="flex items-center gap-1">
          <Check className="h-4 w-4 text-green-500" />
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer text-[#2DB89E] hover:text-[#25a08a] flex items-center gap-1 text-sm font-medium shrink-0">
          <Upload className="h-4 w-4" />
          Subir
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => onSelect(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}

// Build HTML email for confirmation
function buildConfirmationEmail(
  aliado: any,
  cliente: any,
  nombre: string,
  rut: string,
  estado: string,
  uploadedKeys: string[],
  docsRequired: { key: string; label: string }[],
  compDocsRequired: { key: string; label: string }[],
  preexistente: boolean,
) {
  const fechaIngreso = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const fechaFin = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CL');

  const docsList = docsRequired.map(d => {
    const uploaded = uploadedKeys.includes(d.key);
    return `<li>${uploaded ? '&#9989;' : '&#10060;'} ${d.label}</li>`;
  }).join('');

  const compDocsList = compDocsRequired.map(d => {
    const uploaded = uploadedKeys.includes(`comp_${d.key}`);
    return `<li>${uploaded ? '&#9989;' : '&#10060;'} ${d.label} (complementante)</li>`;
  }).join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1f2937;">Nuevo cliente ingresado</h2>
      ${preexistente ? '<p style="color:#dc2626;font-weight:bold;">ATENCION: Este RUT ya existe en el sistema (preexistente)</p>' : ''}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 8px;color:#6b7280;">Aliado:</td><td style="padding:4px 8px;font-weight:bold;">${aliado.nombre_comercial}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Cliente:</td><td style="padding:4px 8px;font-weight:bold;">${nombre}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">RUT:</td><td style="padding:4px 8px;">${rut}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Fecha ingreso:</td><td style="padding:4px 8px;">${fechaIngreso}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Bloqueo hasta:</td><td style="padding:4px 8px;">${fechaFin}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Estado:</td><td style="padding:4px 8px;">${estado === 'ingresado' ? 'Ingresado (docs completos)' : 'Ingreso incompleto'}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">ID:</td><td style="padding:4px 8px;font-size:12px;">${cliente.id}</td></tr>
      </table>
      <h3 style="color:#1f2937;">Documentos</h3>
      <ul style="list-style:none;padding:0;">${docsList}${compDocsList}</ul>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;">Correo automático del portal de aliados — Llave Propia.</p>
    </div>
  `;
}

export default AliadoNuevoCliente;
