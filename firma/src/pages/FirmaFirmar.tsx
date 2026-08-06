import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";
import PDFViewer, { Field, Signer } from "@/components/firma/PDFViewer";
import SignatureDrawer from "@/components/firma/SignatureDrawer";
import { CheckCircle2, FileText, RefreshCw, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageState = "loading" | "ready" | "signed" | "completed" | "error";

export default function FirmaFirmar() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [signerData, setSignerData] = useState<any>(null);
  const [envelope, setEnvelope] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [allSigners, setAllSigners] = useState<Signer[]>([]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [signedFieldIds, setSignedFieldIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (token) load(); }, [token]);

  async function load() {
    setState("loading");
    try {
      const { data: signer, error } = await supabase
        .from("firma_signers")
        .select("*, firma_envelopes(*, firma_signers(id, name, email, color, signed_at))")
        .eq("token", token!)
        .single();

      if (error || !signer) { setErrorMsg("Este enlace no es valido o ha expirado."); setState("error"); return; }
      if (signer.signed_at) {
        setSignerData(signer); setEnvelope(signer.firma_envelopes);
        setState(signer.firma_envelopes.status === "completed" ? "completed" : "signed"); return;
      }

      const env = signer.firma_envelopes;
      const { data: fieldData } = await supabase.from("firma_fields").select("*").eq("signer_id", signer.id);

      setSignerData(signer);
      setEnvelope(env);
      setFields((fieldData || []).map((f: any) => ({
        id: f.id, signerId: f.signer_id, pageIndex: f.page_index,
        xPercent: f.x_percent, yPercent: f.y_percent, widthPercent: f.width_percent, heightPercent: f.height_percent,
      })));
      setAllSigners((env.firma_signers || []).map((s: any) => ({ id: s.id, name: s.name, color: s.color })));
      setState("ready");
    } catch (e: any) {
      setErrorMsg(e.message || "Error al cargar el documento."); setState("error");
    }
  }

  function handleFieldClick(field: Field) { setActiveField(field); setShowSignatureModal(true); }

  async function handleSignatureConfirm(dataUrl: string) {
    if (!activeField) return;
    setSignedFieldIds((prev) => [...prev, activeField.id]);
    setShowSignatureModal(false);
    const newSigned = [...signedFieldIds, activeField.id];
    if (fields.every((f) => newSigned.includes(f.id))) await submitSignature(dataUrl);
  }

  async function submitSignature(dataUrl: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/firma-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ token, signature_data: dataUrl }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      if (result.allSigned) {
        setState("completed");
        const { data: updatedEnv } = await supabase.from("firma_envelopes").select("*").eq("id", envelope.id).single();
        if (updatedEnv) setEnvelope(updatedEnv);
      } else { setState("signed"); }
    } catch (e: any) { alert("Error al enviar la firma: " + e.message); } finally { setSubmitting(false); }
  }

  if (state === "loading") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#1B3A6B] animate-spin" />
        <p className="text-gray-600">Cargando documento...</p>
      </div>
    </div>
  );

  if (state === "error") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Enlace invalido</h2>
        <p className="text-gray-500 text-sm">{errorMsg}</p>
      </div>
    </div>
  );

  if (state === "signed") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Firmaste correctamente</h2>
        <p className="text-gray-500 text-sm mb-4">Tu firma fue registrada. El documento se completara cuando todos hayan firmado.</p>
        <div className="bg-gray-50 rounded-xl p-4 text-left">
          <p className="text-xs text-gray-400 mb-1">Documento</p>
          <p className="font-medium text-gray-800 text-sm">{envelope?.title}</p>
        </div>
      </div>
    </div>
  );

  if (state === "completed") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Todos firmaron!</h2>
        <p className="text-gray-500 text-sm mb-6">El documento fue firmado por todos.</p>
        {envelope?.final_pdf_url && (
          <a href={envelope.final_pdf_url} target="_blank" rel="noopener noreferrer">
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
              <Download className="w-4 h-4" /> Descargar PDF firmado
            </Button>
          </a>
        )}
      </div>
    </div>
  );

  const unsignedFields = fields.filter((f) => !signedFieldIds.includes(f.id));
  const allFieldsSigned = unsignedFields.length === 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1B3A6B] rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{envelope?.title}</p>
              <p className="text-xs text-gray-400">Solicitado por {envelope?.sender_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">Hola, <strong>{signerData?.name}</strong></span>
            {allFieldsSigned && submitting && <div className="flex items-center gap-2 text-sm text-blue-600"><RefreshCw className="w-4 h-4 animate-spin" /> Procesando...</div>}
            {!allFieldsSigned && <div className="bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">{unsignedFields.length} campo(s) pendiente(s)</div>}
          </div>
        </div>
      </div>
      {!allFieldsSigned && <div className="bg-[#1B3A6B] text-white text-center text-sm py-2.5 px-4 font-medium">Haz clic en el campo resaltado para agregar tu firma</div>}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border px-4 py-2 mb-4"><span className="text-xs text-gray-400 font-mono">Llave Propia Firma ID: {envelope?.id?.replace(/-/g, "").toUpperCase().substring(0, 32)}</span></div>
        <PDFViewer source={envelope?.pdf_url} fields={fields} signers={allSigners} signerMode activeSignerId={signerData?.id} onFieldClick={handleFieldClick} signedFieldIds={signedFieldIds} />
        <div className="mt-6 bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Estado de firmas</p>
          <div className="flex flex-wrap gap-2">
            {(envelope?.firma_signers || []).map((s: any) => (
              <div key={s.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${s.signed_at || (s.id === signerData?.id && allFieldsSigned) ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-xs text-gray-700">{s.name}</span>
                {(s.signed_at || (s.id === signerData?.id && allFieldsSigned)) && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showSignatureModal && <SignatureDrawer signerName={signerData?.name || ""} onConfirm={handleSignatureConfirm} onCancel={() => setShowSignatureModal(false)} />}
    </div>
  );
}
