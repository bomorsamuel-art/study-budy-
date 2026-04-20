import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Video, Play, Loader2, Sparkles, Download, AlertCircle, Key, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../contexts/AppContext';

export default function VeoVideoGeneratorView() {
  const { studyMaterial } = useAppContext();
  const [prompt, setPrompt] = useState(studyMaterial || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      console.error("Error checking API key:", e);
    }
  };

  const handleSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    } catch (e) {
      console.error("Error opening key selector:", e);
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setStatus('Initializing Veo engine...');

    try {
      const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
      const ai = new GoogleGenAI({ apiKey });
      
      setStatus('Submitting video generation request...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setStatus('Generating video (this may take a few minutes)...');
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 10 minutes max (10s intervals)
      
      while (!operation.done && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        attempts++;
        
        // Update status based on progress if available, or just show time
        setStatus(`Generating video... (${attempts * 10}s elapsed)`);
      }

      if (!operation.done) {
        throw new Error("Video generation timed out. Please try again later.");
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error("No video URI returned from the model.");
      }

      setStatus('Fetching video data...');
      
      // Fetch the video with the API key
      const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!videoResponse.ok) {
        if (videoResponse.status === 404) {
          throw new Error("Requested entity was not found. Please try selecting your API key again.");
        }
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }

      const blob = await videoResponse.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus('Video ready!');
    } catch (err: any) {
      console.error("Video generation error:", err);
      setError(err.message || "An unexpected error occurred during video generation.");
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 h-full flex flex-col overflow-y-auto">
      <div className="mb-10">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
          <Video className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          AI Video Studio
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Create cinematic educational videos from your notes using Google Veo.
        </p>
      </div>

      {!hasApiKey ? (
        <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[2rem] border border-black/5 dark:border-white/10 shadow-2xl max-w-2xl mx-auto w-full text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-4">API Key Required</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Veo video generation requires a paid Google Cloud project API key. 
            Please select your key to continue.
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleSelectKey}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              Select API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1"
            >
              <Info className="w-4 h-4" />
              Learn about billing
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Input Section */}
          <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[2rem] border border-black/5 dark:border-white/10 shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Video Prompt
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Describe the video or paste your notes
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A cinematic 3D animation explaining the structure of an atom with glowing electrons orbiting a nucleus..."
                  className="w-full h-48 p-4 rounded-2xl border-2 border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-colors font-medium resize-none"
                />
              </div>
              
              <button 
                onClick={generateVideo}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Generate Video
                  </>
                )}
              </button>

              {isGenerating && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {status}
                  </p>
                  <p className="text-[10px] text-indigo-500 mt-2">
                    Note: Video generation can take 2-5 minutes. Feel free to explore other parts of the app while you wait.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            <div className="bg-black rounded-[2rem] aspect-video overflow-hidden shadow-2xl relative flex items-center justify-center border border-slate-800">
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full h-full object-contain"
                  autoPlay
                />
              ) : (
                <div className="text-center p-10">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                    {isGenerating ? (
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    ) : (
                      <Play className="w-10 h-10 text-slate-700" />
                    )}
                  </div>
                  <p className="text-slate-500 font-medium">
                    {isGenerating ? "Your masterpiece is being created..." : "Generated video will appear here"}
                  </p>
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="flex gap-4">
                <a 
                  href={videoUrl} 
                  download="educational-video.mp4"
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                >
                  <Download className="w-5 h-5" />
                  Download Video
                </a>
                <button 
                  onClick={() => { setVideoUrl(null); setPrompt(''); }}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/20">
              <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Pro Tips for Veo
              </h4>
              <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2 list-disc pl-4">
                <li>Be descriptive: Include lighting, camera angles, and style (e.g., "3D animation", "Cinematic documentary style").</li>
                <li>Summarize first: For long notes, try to summarize the key visual concepts before generating.</li>
                <li>Veo Lite is optimized for speed and supports up to 1080p resolution.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
