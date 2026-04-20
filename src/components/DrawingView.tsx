import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Eraser, Wand2, Download, Trash2, Palette, Loader2, PenTool, Highlighter, SprayCan, Pencil, Minus, Square, Circle } from 'lucide-react';
import { cn } from '../lib/utils';

interface DrawingViewProps {
  isKidsMode?: boolean;
}

type Tool = 'pen' | 'marker' | 'spray' | 'charcoal' | 'line' | 'rectangle' | 'circle' | 'eraser';

export default function DrawingView({ isKidsMode }: DrawingViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);
  const startPointRef = useRef<{ x: number, y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set white background initially
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Handle resize
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    startPointRef.current = { x, y };
    lastPointRef.current = { x, y };
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    const lastPoint = lastPointRef.current;
    const startPoint = startPointRef.current;

    if (['line', 'rectangle', 'circle'].includes(activeTool)) {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (activeTool === 'line') {
        ctx.moveTo(startPoint!.x, startPoint!.y);
        ctx.lineTo(x, y);
      } else if (activeTool === 'rectangle') {
        ctx.rect(startPoint!.x, startPoint!.y, x - startPoint!.x, y - startPoint!.y);
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPoint!.x, 2) + Math.pow(y - startPoint!.y, 2));
        ctx.arc(startPoint!.x, startPoint!.y, radius, 0, 2 * Math.PI);
      }
      ctx.stroke();
    } else {
      if (activeTool === 'pen' || activeTool === 'eraser') {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (activeTool === 'marker') {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (activeTool === 'spray') {
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        const density = brushSize * 2;
        for (let i = 0; i < density; i++) {
          const offsetX = (Math.random() * brushSize * 2) - brushSize;
          const offsetY = (Math.random() * brushSize * 2) - brushSize;
          ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
      } else if (activeTool === 'charcoal') {
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (lastPoint) {
          ctx.moveTo(lastPoint.x - (Math.random() * 2), lastPoint.y - (Math.random() * 2));
          ctx.lineTo(x + (Math.random() * 2), y + (Math.random() * 2));
          ctx.stroke();
        }
      }
    }

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
    startPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setEnhancedImage(null);
  };

  const handleEnhance = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsEnhancing(true);
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const base64Data = dataUrl.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = isKidsMode 
        ? "Transform this kid's drawing into a beautiful, vibrant, professional illustration. Keep the original subject and fun vibe, but make it look like a high-quality children's book illustration."
        : "Enhance this sketch into a polished, professional illustration while keeping the original intent and composition.";

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          setEnhancedImage(imageUrl);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to enhance drawing:", error);
      alert("Failed to enhance drawing. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.download = 'my-drawing.png';
    link.href = enhancedImage || canvasRef.current?.toDataURL('image/png') || '';
    link.click();
  };

  const colors = [
    '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'
  ];

  const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: 'pen', icon: PenTool, label: 'Pen' },
    { id: 'marker', icon: Highlighter, label: 'Marker' },
    { id: 'spray', icon: SprayCan, label: 'Spray Paint' },
    { id: 'charcoal', icon: Pencil, label: 'Charcoal' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isKidsMode ? "Magic Canvas 🎨" : "Drawing Board"}
          </h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {isKidsMode ? "Draw something and watch it come to life!" : "Sketch your ideas and enhance them with AI."}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          
          <button
            onClick={downloadImage}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
          >
            <Download className="w-4 h-4" />
            Save
          </button>

          <button
            onClick={handleEnhance}
            disabled={isEnhancing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          >
            {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {isEnhancing ? "Making Magic..." : (isKidsMode ? "Magic Enhance ✨" : "Enhance with AI")}
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Tools Sidebar */}
        <div className={cn(
          "w-20 md:w-24 apple-card flex flex-col items-center py-6 gap-6 overflow-y-auto shrink-0",
          isKidsMode && "border-amber-200 dark:border-amber-900/30"
        )}>
          {/* Brushes */}
          <div className="flex flex-col gap-3 md:gap-4 items-center">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  title={tool.label}
                  className={cn(
                    "w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-all",
                    activeTool === tool.id
                      ? (isKidsMode ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shadow-inner" : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shadow-inner")
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                  )}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              );
            })}
          </div>

          <div className="w-12 h-px bg-black/5 dark:bg-white/10 shrink-0" />

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (activeTool === 'eraser') setActiveTool('pen');
                }}
                className={cn(
                  "w-8 h-8 md:w-9 md:h-9 rounded-full border-2 transition-transform hover:scale-110",
                  color === c && activeTool !== 'eraser' ? "border-slate-400 dark:border-slate-500 scale-110 shadow-md" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-12 h-px bg-black/5 dark:bg-white/10 shrink-0" />

          {/* Sizes */}
          <div className="flex flex-col gap-3 items-center">
            {[3, 8, 15].map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  brushSize === size 
                    ? (isKidsMode ? "bg-amber-100 dark:bg-amber-900/40" : "bg-slate-100 dark:bg-white/10") 
                    : "hover:bg-slate-50 dark:hover:bg-white/5"
                )}
              >
                <div 
                  className={cn("rounded-full", activeTool === 'eraser' ? "bg-slate-400 dark:bg-slate-500" : "bg-slate-800 dark:bg-slate-200")} 
                  style={{ width: size, height: size, backgroundColor: activeTool === 'eraser' ? '#94a3b8' : color }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className={cn(
          "flex-1 apple-card overflow-hidden relative",
          isKidsMode && "border-amber-200 dark:border-amber-900/30"
        )}>
          {enhancedImage ? (
            <div className="absolute inset-0 bg-white dark:bg-[#1C1C1E] z-10 flex flex-col">
              <img 
                src={enhancedImage} 
                alt="Enhanced drawing" 
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setEnhancedImage(null)}
                className="absolute top-4 right-4 px-4 py-2 bg-white/90 dark:bg-[#2C2C2E]/90 backdrop-blur border border-black/5 dark:border-white/10 rounded-xl shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Back to Drawing
              </button>
            </div>
          ) : null}
          
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full touch-none cursor-crosshair bg-white"
          />
        </div>
      </div>
    </div>
  );
}
