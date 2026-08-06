import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import PDFViewer, { Field, Signer } from "@/components/firma/PDFViewer";
import {
  Plus, Trash2, Send, FileText, Users, MapPin, CheckCircle2,
  ChevronRight, ChevronLeft, Bell, Download, ArrowLeft, RefreshCw,
  FileSignature, Clock, CheckCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const SIGNER_COLORS = ["#1B3A6B", "#2DB89E", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

type Step = 1 | 2 | 3 | 4;

interface SignerForm {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  company: string;
  color: string;
}

function uid() {
  return crypto.randomUUID();
}

export default function FirmaElectronica() {
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "create">("list");

  if (view === "list") return <EnvelopeList onNew={() => setView("create")} />;
  return <CreateEnvelope onDone={() => setView("list")} />;
}

function EnvelopeList({ onNew }: { onNew: () => void }) {
  const { toast } = useToast();

  const { data: envelopes = [], isLoading } = useQuery({
    queryKey: ["firma_envelopes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firma_envelopes")
        .select("*, firma_signers(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  async function sendReminder(envelopeId: string) {
    const CRM_URL = import.meta.env.VITE_SUPABASE_URL;
    const CRM_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${CRM_URL}/functions/v1/firma-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` },
      body: JSON.stringify({ envelope_id: envelopeId }),
    });
    const data = await res.json();
    if (data.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    } else {
      toast({ title: `${data.reminded} recordatorio(s) enviado(s)` });
    }
  }

  const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    draft: { label: "Borrador", class: "bg-gray-100 text-gray-600", icon: <FileText className="w-3 h-3" /> },
    sent: { label: "En progreso", class: "bg-blue-100 text-blue-700", icon: <Clock className="w-3 h-3" /> },
    completed: { label: "Completado", class: "bg-green-100 text-green-700", icon: <CheckCheck className="w-3 h-3" /> },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B3A6B] rounded-lg flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Firma Electronica</h1>
              <p className="text-xs text-gray-500">Llave Propia · Documentos</p>
            </div>
          </div>
          <Button onClick={onNew} className="bg-[#1B3A6B] hover:bg-[#152d4a] gap-2">
            <Plus className="w-4 h-4" /> Nuevo sobre
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : envelopes.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSignature className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-gray-700 font-medium mb-1">Aun no hay sobres</h3>
            <p className="text-gray-400 text-sm mb-6">Crea tu primer sobre para enviar documentos a firmar</p>
            <Button onClick={onNew} className="bg-[#1B3A6B] hover:bg-[#152d4a] gap-2">
              <Plus className="w-4 h-4" /> Crear primer sobre
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {envelopes.map((env: any) => {
              const signers = env.firma_signers || [];
              const signed = signers.filter((s: any) => s.signed_at).length;
              const cfg = statusConfig[env.status] || statusConfig.draft;

              return (
                <div key={env.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{env.title}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        Enviado por <strong>{env.sender_name}</strong> · {new Date(env.created_at).toLocaleDateString("es-CL")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {signers.map((s: any) => (
                          <div key={s.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${s.signed_at ? "bg-green-500" : "bg-gray-300"}`} />
                            <span className="text-xs text-gray-700">{s.name}</span>
                            {s.signed_at && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-gray-500">{signed}/{signers.length} firmaron</span>
                      {env.status === "sent" && signed < signers.length && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sendReminder(env.id)}>
                          <Bell className="w-3.5 h-3.5" /> Recordar
                        </Button>
                      )}
                      {env.status === "completed" && env.final_pdf_url && (
                        <a href={env.final_pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50">
                            <Download className="w-3.5 h-3.5" /> PDF firmado
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateEnvelope({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signers, setSigners] = useState<SignerForm[]>([
    { id: uid(), name: "", email: "", jobTitle: "", company: "", color: SIGNER_COLORS[0] },
  ]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { num: 1, label: "Documento", icon: FileText },
    { num: 2, label: "Firmantes", icon: Users },
    { num: 3, label: "Campos", icon: MapPin },
    { num: 4, label: "Enviar", icon: Send },
  ];

  function addSigner() {
    if (signers.length >= 7) return;
    setSigners((prev) => [
      ...prev,
      { id: uid(), name: "", email: "", jobTitle: "", company: "", color: SIGNER_COLORS[prev.length % SIGNER_COLORS.length] },
    ]);
  }

  function removeSigner(id: string) {
    setSigners((prev) => prev.filter((s) => s.id !== id));
    setFields((prev) => prev.filter((f) => f.signerId !== id));
  }

  function updateSigner(id: string, patch: Partial<SignerForm>) {
    setSigners((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addField(field: Omit<Field, "id">) {
    setFields((prev) => [...prev, { ...field, id: uid() }]);
  }

  function removeField(fieldId: string) {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  }

  function canGoNext() {
    if (step === 1) return title.trim() && senderName.trim() && senderEmail.trim() && !!pdfFile;
    if (step === 2) return signers.every((s) => s.name.trim() && s.email.trim());
    if (step === 3) {
      return signers.every((s) => fields.some((f) => f.signerId === s.id));
    }
    return true;
  }

  async function handleSend() {
    setSending(true);
    try {
      const envelopeId = uid();

      const { error: uploadErr } = await supabase.storage
        .from("firma-pdfs")
        .upload(`${envelopeId}/original.pdf`, pdfFile!, { contentType: "application/pdf" });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("firma-pdfs").getPublicUrl(`${envelopeId}/original.pdf`);
      const pdfUrl = urlData.publicUrl;

      const { error: envErr } = await supabase.from("firma_envelopes").insert({
        id: envelopeId,
        title,
        pdf_url: pdfUrl,
        pdf_path: `${envelopeId}/original.pdf`,
        sender_name: senderName,
        sender_email: senderEmail,
        status: "draft",
      });
      if (envErr) throw envErr;

      const signerInserts = signers.map((s, i) => ({
        id: s.id,
        envelope_id: envelopeId,
        name: s.name,
        email: s.email,
        job_title: s.jobTitle || null,
        company: s.company || null,
        color: s.color,
        order_num: i + 1,
      }));
      const { error: signersErr } = await supabase.from("firma_signers").insert(signerInserts);
      if (signersErr) throw signersErr;

      if (fields.length > 0) {
        const fieldInserts = fields.map((f) => ({
          envelope_id: envelopeId,
          signer_id: f.signerId,
          page_index: f.pageIndex,
          x_percent: f.xPercent,
          y_percent: f.yPercent,
          width_percent: f.widthPercent,
          height_percent: f.heightPercent,
        }));
        const { error: fieldsErr } = await supabase.from("firma_fields").insert(fieldInserts);
        if (fieldsErr) throw fieldsErr;
      }

      const CRM_URL = import.meta.env.VITE_SUPABASE_URL;
      const CRM_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${CRM_URL}/functions/v1/firma-send-envelope`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` },
        body: JSON.stringify({ envelope_id: envelopeId }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      toast({ title: "Sobre enviado", description: `Se enviaron invitaciones a ${signers.length} firmante(s)` });
      onDone();
    } catch (e: any) {
      toast({ title: "Error al enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const pdfSigners: Signer[] = signers.map((s) => ({ id: s.id, name: s.name || "Sin nombre", color: s.color }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4 mb-5">
            <button onClick={onDone} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1B3A6B] rounded-lg flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-bold text-gray-900 text-lg">Nuevo sobre</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive ? "bg-[#1B3A6B] text-white" : isDone ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    {s.label}
                  </div>
                  {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {step === 1 && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Informacion del documento</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Titulo del documento</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Contrato Leasing — Cliente" className="h-11" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tu nombre</label>
                    <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Rodrigo Canas" className="h-11" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tu email</label>
                    <Input type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="rodrigo@llavepropia.cl" className="h-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Documento PDF</label>
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  {pdfFile ? (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{pdfFile.name}</p>
                        <p className="text-xs text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button onClick={() => setPdfFile(null)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#2DB89E] hover:bg-emerald-50 transition-all group"
                    >
                      <FileText className="w-8 h-8 text-gray-300 group-hover:text-[#2DB89E] mx-auto mb-2 transition-colors" />
                      <p className="text-sm font-medium text-gray-600">Haz clic para subir el PDF</p>
                      <p className="text-xs text-gray-400 mt-1">o arrastra el archivo aqui</p>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Firmantes</h2>
                <Button size="sm" variant="outline" onClick={addSigner} disabled={signers.length >= 7} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </Button>
              </div>
              <div className="space-y-5">
                {signers.map((signer, i) => (
                  <div key={signer.id} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: signer.color }} />
                        <span className="text-sm font-semibold text-gray-700">Firmante {i + 1}</span>
                      </div>
                      {signers.length > 1 && (
                        <button onClick={() => removeSigner(signer.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Input placeholder="Nombre completo *" value={signer.name} onChange={(e) => updateSigner(signer.id, { name: e.target.value })} className="h-9 text-sm" />
                      <Input type="email" placeholder="Email *" value={signer.email} onChange={(e) => updateSigner(signer.id, { email: e.target.value })} className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Cargo (opcional)" value={signer.jobTitle} onChange={(e) => updateSigner(signer.id, { jobTitle: e.target.value })} className="h-9 text-sm" />
                      <Input placeholder="Empresa (opcional)" value={signer.company} onChange={(e) => updateSigner(signer.id, { company: e.target.value })} className="h-9 text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex gap-6">
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border p-5 sticky top-6">
                <h3 className="font-semibold text-gray-900 mb-1">Colocar campos</h3>
                <p className="text-xs text-gray-500 mb-4">Selecciona un firmante y arrastra sobre el PDF para definir donde firma.</p>
                <div className="space-y-2 mb-5">
                  {signers.map((s) => {
                    const fieldCount = fields.filter((f) => f.signerId === s.id).length;
                    const isSelected = selectedSignerId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSignerId(isSelected ? null : s.id)}
                        className={`w-full flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${
                          isSelected ? "border-current" : "border-gray-100 hover:border-gray-200"
                        }`}
                        style={isSelected ? { borderColor: s.color, backgroundColor: s.color + "10" } : {}}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{s.name || "Sin nombre"}</p>
                        </div>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${fieldCount > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {fieldCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedSignerId && (
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    <strong>Arrastra</strong> sobre el PDF para colocar el campo de firma del firmante seleccionado.
                  </div>
                )}
                <div className="mt-4 space-y-1">
                  {signers.map((s) => {
                    const hasField = fields.some((f) => f.signerId === s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-1.5 text-xs">
                        {hasField ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                        )}
                        <span className={hasField ? "text-green-700" : "text-gray-400"}>{s.name || "Sin nombre"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <PDFViewer
                source={pdfFile!}
                fields={fields}
                signers={pdfSigners}
                onFieldAdd={addField}
                onFieldRemove={removeField}
                selectedSignerId={selectedSignerId}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Revisar y enviar</h2>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <FileText className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Documento</p>
                    <p className="font-medium text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500">{pdfFile?.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Users className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-gray-400 mb-2">Firmantes ({signers.length})</p>
                    {signers.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.email}{s.jobTitle ? ` · ${s.jobTitle}` : ""}</p>
                        </div>
                        <span className="ml-auto text-xs text-gray-400">
                          {fields.filter((f) => f.signerId === s.id).length} campo(s)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  Al enviar, cada firmante recibira un email con un enlace unico para firmar el documento. Cuando todos hayan firmado, recibiras el PDF final con todas las firmas.
                </div>
              </div>
              <Button
                className="w-full h-12 bg-[#1B3A6B] hover:bg-[#152d4a] text-white gap-2 text-base font-semibold"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Enviar sobre a {signers.length} firmante(s)</>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 max-w-6xl">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1) as Step)} disabled={step === 1} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          {step < 4 && (
            <Button
              className="bg-[#1B3A6B] hover:bg-[#152d4a] gap-2"
              disabled={!canGoNext()}
              onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
