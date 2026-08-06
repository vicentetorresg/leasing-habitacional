import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenLine, Type, Trash2 } from "lucide-react";

interface SignatureDrawerProps {
  signerName: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function SignatureDrawer({ signerName, onConfirm, onCancel }: SignatureDrawerProps) {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const autoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [activeTab, setActiveTab] = useState("draw");
  const [autoName, setAutoName] = useState(signerName);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1B3A6B";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    clearCanvas(canvas, ctx);
  }, []);

  useEffect(() => {
    if (activeTab !== "auto") return;
    renderAutoSignature();
  }, [autoName, activeTab]);

  function clearCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    ctx.strokeStyle = "#1B3A6B";
    ctx.lineWidth = 2.5;
  }

  async function renderAutoSignature() {
    const canvas = autoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontFamily = "Great Vibes";
    if (!document.querySelector(`link[data-firma-font]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
      link.setAttribute("data-firma-font", "1");
      document.head.appendChild(link);
    }
    try {
      await document.fonts.load(`48px "${fontFamily}"`);
    } catch (_) {}

    ctx.fillStyle = "#1B3A6B";
    const fontSize = Math.min(72, Math.max(32, (canvas.width - 60) / (autoName.length * 0.52)));
    ctx.font = `${fontSize}px "${fontFamily}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(autoName, canvas.width / 2, canvas.height / 2 - 8);

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 28);
    ctx.lineTo(canvas.width - 40, canvas.height - 28);
    ctx.stroke();
  }

  function getPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1B3A6B";
    ctx.lineWidth = 2.5;
    const pos = getPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function onMouseUp() {
    setIsDrawing(false);
  }

  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1B3A6B";
    ctx.lineWidth = 2.5;
    const pos = getPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function clearDraw() {
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    clearCanvas(canvas, ctx);
    setHasDrawn(false);
  }

  function handleConfirm() {
    const canvas = activeTab === "draw" ? drawCanvasRef.current! : autoCanvasRef.current!;
    onConfirm(canvas.toDataURL("image/png"));
  }

  const canConfirm = activeTab === "draw" ? hasDrawn : autoName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 pt-6 pb-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Agregar firma</h2>
          <p className="text-sm text-gray-500 mt-1">Elige como deseas firmar el documento</p>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-5">
              <TabsTrigger value="draw" className="flex-1 gap-2">
                <PenLine className="w-4 h-4" /> Dibujar
              </TabsTrigger>
              <TabsTrigger value="auto" className="flex-1 gap-2">
                <Type className="w-4 h-4" /> Nombre
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="mt-0">
              <p className="text-sm text-gray-500 mb-3">Dibuja tu firma con el mouse o dedo</p>
              <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden cursor-crosshair bg-white">
                <canvas
                  ref={drawCanvasRef}
                  width={560}
                  height={200}
                  className="w-full touch-none"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onMouseUp}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-300 text-sm">Firma aqui</p>
                  </div>
                )}
              </div>
              {hasDrawn && (
                <button
                  onClick={clearDraw}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 mt-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpiar
                </button>
              )}
            </TabsContent>

            <TabsContent value="auto" className="mt-0">
              <p className="text-sm text-gray-500 mb-3">Tu nombre en estilo firma</p>
              <input
                type="text"
                value={autoName}
                onChange={(e) => setAutoName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                placeholder="Tu nombre completo"
              />
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={autoCanvasRef}
                  width={560}
                  height={200}
                  className="w-full"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            <p className="text-xs text-gray-500">
              Tu firma llevara un ID unico de verificacion para dar validez legal al documento.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-[#1B3A6B] hover:bg-[#152d4a] text-white"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirmar firma
          </Button>
        </div>
      </div>
    </div>
  );
}
