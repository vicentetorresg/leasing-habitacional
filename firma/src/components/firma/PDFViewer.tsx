import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = import.meta.env.BASE_URL + "pdf.worker.min.mjs";

export interface Field {
  id: string;
  signerId: string;
  pageIndex: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface Signer {
  id: string;
  name: string;
  color: string;
}

interface PDFViewerProps {
  source: string | File | ArrayBuffer;
  fields?: Field[];
  signers?: Signer[];
  onFieldAdd?: (field: Omit<Field, "id">) => void;
  onFieldRemove?: (fieldId: string) => void;
  selectedSignerId?: string | null;
  signerMode?: boolean;
  activeSignerId?: string | null;
  onFieldClick?: (field: Field) => void;
  signedFieldIds?: string[];
}

export default function PDFViewer({
  source,
  fields = [],
  signers = [],
  onFieldAdd,
  onFieldRemove,
  selectedSignerId,
  signerMode = false,
  activeSignerId,
  onFieldClick,
  signedFieldIds = [],
}: PDFViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask;
    const load = async () => {
      try {
        if (source instanceof File) {
          const ab = await source.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: ab });
        } else if (source instanceof ArrayBuffer) {
          loadingTask = pdfjsLib.getDocument({ data: source });
        } else {
          loadingTask = pdfjsLib.getDocument({ url: source });
        }
        const doc = await loadingTask.promise;
        setPdf(doc);
        setNumPages(doc.numPages);
      } catch (e) {
        setError("No se pudo cargar el PDF");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => loadingTask?.destroy?.();
  }, [source]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: numPages }, (_, i) => (
        <PDFPage
          key={i}
          pdf={pdf!}
          pageIndex={i}
          fields={fields.filter((f) => f.pageIndex === i)}
          signers={signers}
          onFieldAdd={onFieldAdd}
          onFieldRemove={onFieldRemove}
          selectedSignerId={selectedSignerId}
          signerMode={signerMode}
          activeSignerId={activeSignerId}
          onFieldClick={onFieldClick}
          signedFieldIds={signedFieldIds}
        />
      ))}
    </div>
  );
}

function PDFPage({
  pdf, pageIndex, fields, signers, onFieldAdd, onFieldRemove, selectedSignerId,
  signerMode, activeSignerId, onFieldClick, signedFieldIds = [],
}: {
  pdf: pdfjsLib.PDFDocumentProxy; pageIndex: number; fields: Field[]; signers: Signer[];
  onFieldAdd?: (field: Omit<Field, "id">) => void; onFieldRemove?: (fieldId: string) => void;
  selectedSignerId?: string | null; signerMode?: boolean; activeSignerId?: string | null;
  onFieldClick?: (field: Field) => void; signedFieldIds?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    const render = async () => {
      const page = await pdf.getPage(pageIndex + 1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
      try { await renderTaskRef.current.promise; } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") console.error(e);
      }
    };
    render();
    return () => renderTaskRef.current?.cancel();
  }, [pdf, pageIndex]);

  function getRelPos(e: React.MouseEvent) {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!onFieldAdd || !selectedSignerId) return;
    e.preventDefault();
    const pos = getRelPos(e);
    setDrag({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return;
    e.preventDefault();
    const pos = getRelPos(e);
    setDrag((d) => d ? { ...d, currentX: pos.x, currentY: pos.y } : null);
  }

  function onMouseUp() {
    if (!drag || !onFieldAdd || !selectedSignerId) { setDrag(null); return; }
    const x = Math.min(drag.startX, drag.currentX);
    const y = Math.min(drag.startY, drag.currentY);
    const w = Math.abs(drag.currentX - drag.startX);
    const h = Math.abs(drag.currentY - drag.startY);
    if (w > 0.03 && h > 0.02) {
      onFieldAdd({ signerId: selectedSignerId, pageIndex, xPercent: x, yPercent: y, widthPercent: w, heightPercent: h });
    }
    setDrag(null);
  }

  const signerMap = Object.fromEntries(signers.map((s) => [s.id, s]));
  const isPlacementMode = !!onFieldAdd && !!selectedSignerId;

  return (
    <div className="relative inline-block shadow-md rounded overflow-hidden bg-white mx-auto">
      <div className="absolute top-2 left-2 z-10 bg-black/30 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
        Pag. {pageIndex + 1}
      </div>
      <canvas ref={canvasRef} className="block" />
      <div
        ref={overlayRef}
        className={`absolute inset-0 ${isPlacementMode ? "cursor-crosshair" : ""}`}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        {fields.map((field) => {
          const signer = signerMap[field.signerId];
          const isSigned = signedFieldIds.includes(field.id);
          const isClickable = signerMode && field.signerId === activeSignerId && !isSigned && !!onFieldClick;
          const isActiveSignerField = signerMode && field.signerId === activeSignerId;
          return (
            <div
              key={field.id}
              style={{
                position: "absolute",
                left: `${field.xPercent * 100}%`, top: `${field.yPercent * 100}%`,
                width: `${field.widthPercent * 100}%`, height: `${field.heightPercent * 100}%`,
                backgroundColor: isSigned ? "rgba(34,197,94,0.15)" : isActiveSignerField ? `${signer?.color||"#3b82f6"}25` : `${signer?.color||"#3b82f6"}15`,
                border: isSigned ? "2px solid rgb(34,197,94)" : isActiveSignerField ? `2px solid ${signer?.color||"#3b82f6"}` : `1.5px dashed ${signer?.color||"#3b82f6"}80`,
                borderRadius: "4px", cursor: isClickable ? "pointer" : "default",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", transition: "all 0.2s",
              }}
              onClick={(e) => { e.stopPropagation(); if (isClickable) onFieldClick!(field); }}
              className={isActiveSignerField && !isSigned ? "animate-pulse" : ""}
            >
              {isSigned ? (
                <span className="text-green-600 text-xs font-medium">Firmado</span>
              ) : isActiveSignerField ? (
                <span style={{ color: signer?.color || "#3b82f6" }} className="text-xs font-semibold px-1 text-center">
                  {signerMode ? "Clic para firmar" : signer?.name || ""}
                </span>
              ) : (
                <span style={{ color: `${signer?.color||"#3b82f6"}cc` }} className="text-xs font-medium px-1 text-center truncate w-full">
                  {signer?.name || ""}
                </span>
              )}
              {!signerMode && onFieldRemove && (
                <button className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 z-10"
                  onClick={(e) => { e.stopPropagation(); onFieldRemove(field.id); }}>x</button>
              )}
            </div>
          );
        })}
        {drag && (() => {
          const x = Math.min(drag.startX, drag.currentX);
          const y = Math.min(drag.startY, drag.currentY);
          const w = Math.abs(drag.currentX - drag.startX);
          const h = Math.abs(drag.currentY - drag.startY);
          const signer = signerMap[selectedSignerId!];
          return (
            <div style={{
              position: "absolute", left: `${x*100}%`, top: `${y*100}%`, width: `${w*100}%`, height: `${h*100}%`,
              border: `2px dashed ${signer?.color||"#3b82f6"}`, backgroundColor: `${signer?.color||"#3b82f6"}20`,
              borderRadius: "4px", pointerEvents: "none",
            }} />
          );
        })()}
      </div>
    </div>
  );
}
