import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Loader2, Sparkles, Download, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import VoiceInputButton from './VoiceInputButton';

interface ImageGeneratorViewProps {
  isKidsMode?: boolean;
}

export default function ImageGeneratorView({ isKidsMode }: ImageGeneratorViewProps) {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setImageUrl(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const finalPrompt = isKidsMode 
        ? `A fun, colorful, cute, cartoon-style illustration for kids of: ${prompt}`
        : prompt;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { text: finalPrompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      // Find the image part in the response
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setImageUrl(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `AI_Image_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isKidsMode ? "Magic Art Studio 🎨" : "AI Image Studio"}
          </h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {isKidsMode ? "Tell the magic brush what to paint!" : "Generate high-quality images from text descriptions."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Controls */}
        <div className={cn("lg:col-span-1 space-y-6 p-6 apple-card h-fit", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
          <div>
            <label className={cn("block text-sm font-medium mb-2", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-300")}>
              {isKidsMode ? "What should we draw?" : "Image Description"}
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isKidsMode ? "e.g., A cute dinosaur eating pizza in space" : "e.g., A futuristic city at sunset, cyberpunk style, highly detailed"}
                rows={4}
                className={cn("w-full px-4 py-3 pr-10 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none bg-transparent", isKidsMode ? "border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20 text-amber-900 dark:text-amber-100" : "border-black/10 dark:border-white/10 focus:ring-black/20 dark:focus:ring-white/20 text-slate-900 dark:text-slate-100")}
              />
              <VoiceInputButton 
                onResult={(text) => setPrompt(prev => prev ? `${prev} ${text}` : text)}
                className="absolute right-2 bottom-2"
              />
            </div>
          </div>

          <button
            onClick={generateImage}
            disabled={isGenerating || !prompt.trim()}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isKidsMode ? "bg-amber-500 hover:bg-amber-600" : "bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
            )}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? (isKidsMode ? "Painting..." : "Generating...") : (isKidsMode ? "Paint Magic! ✨" : "Generate Image")}
          </button>
        </div>

        {/* Output */}
        <div className={cn("lg:col-span-2 apple-card flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[400px]", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Loader2 className={cn("w-12 h-12 animate-spin", isKidsMode ? "text-amber-500" : "text-indigo-500")} />
              <p className="font-medium">{isKidsMode ? "Mixing colors..." : "Generating your image..."}</p>
            </div>
          ) : imageUrl ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center group">
              <img 
                src={imageUrl} 
                alt="Generated AI Art" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg shadow-sm hover:scale-105 transition-transform text-slate-700 dark:text-slate-200"
                  title="Download Image"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={generateImage}
                  className="p-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg shadow-sm hover:scale-105 transition-transform text-slate-700 dark:text-slate-200"
                  title="Regenerate"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
              <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="font-medium">
                {isKidsMode ? "Your magic painting will appear here!" : "Your generated image will appear here."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
