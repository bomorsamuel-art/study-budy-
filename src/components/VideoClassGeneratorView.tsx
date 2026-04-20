import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Presentation, Play, Pause, Square, Loader2, Volume2, MonitorPlay, Sparkles, FastForward, Rewind, Maximize, Subtitles } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface Scene {
  speech: string;
  boardText: string;
}

import { useAppContext } from '../contexts/AppContext';

export default function VideoClassGeneratorView() {
  const { studyMaterial } = useAppContext();
  const [topic, setTopic] = useState(studyMaterial || '');
  const [level, setLevel] = useState('Senior WAEC (WASSCE)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const levels = ['Junior WAEC (BECE)', 'Senior WAEC (WASSCE)', 'JAMB', 'Primary School', 'University Level'];
  const quickTopics = ['Photosynthesis', 'Quadratic Equations', 'Newton\'s Laws', 'Demand and Supply'];

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const generateClass = async (selectedTopic: string = topic) => {
    if (!selectedTopic.trim()) {
      alert("Please enter a topic.");
      return;
    }
    
    setTopic(selectedTopic);
    setIsGenerating(true);
    setScenes([]);
    setCurrentSceneIdx(0);
    setIsPlaying(false);
    if (synthRef.current) synthRef.current.cancel();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Using gemini-3-flash-preview for much faster generation
      const prompt = `Act as an expert, high-level Nigerian educator. Create a fast-paced, highly engaging video lesson script for: "${selectedTopic}" at the ${level} level. 
      
      Return ONLY a JSON array of objects. Each object represents a scene.
      Keys MUST be exactly:
      - "speech": The exact words the teacher says (conversational, high-impact, clear).
      - "boardText": Short, punchy bullet points, formulas, or key terms for the blackboard. Use Markdown.
      
      Create exactly 4 high-quality scenes. Do not include markdown formatting like \`\`\`json around the response. Just the raw JSON array.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Faster model
        contents: prompt,
      });

      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedScenes = JSON.parse(text);
      
      setScenes(generatedScenes);
      // Auto-play when ready
      setTimeout(() => playScene(0, generatedScenes), 500);
    } catch (error) {
      console.error("Failed to generate class:", error);
      alert("Failed to generate the video class. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getBestVoice = (lang: string = 'en-US') => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    const langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
    return langVoices.find(v => v.name.includes('Premium') || v.name.includes('Enhanced')) ||
           langVoices.find(v => v.name.includes('Google')) ||
           langVoices.find(v => v.lang === lang) ||
           langVoices[0] || 
           null;
  };

  const playScene = (idx: number, scenesToPlay: Scene[] = scenes) => {
    if (!synthRef.current || !scenesToPlay[idx]) return;
    
    synthRef.current.cancel(); // Stop current speech
    setCurrentSceneIdx(idx);
    setIsPlaying(true);

    const utterance = new SpeechSynthesisUtterance(scenesToPlay[idx].speech);
    utterance.volume = isMuted ? 0 : volume;
    utterance.pitch = 1.05;
    utterance.rate = 0.95;
    
    const bestVoice = getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    
    utterance.onend = () => {
      if (idx < scenesToPlay.length - 1) {
        playScene(idx + 1, scenesToPlay);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const togglePlayPause = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.pause();
      setIsPlaying(false);
    } else {
      if (synthRef.current.paused) {
        synthRef.current.resume();
        setIsPlaying(true);
      } else {
        playScene(currentSceneIdx);
      }
    }
  };

  const stopClass = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setCurrentSceneIdx(0);
  };

  const skipForward = () => {
    if (currentSceneIdx < scenes.length - 1) {
      playScene(currentSceneIdx + 1);
    }
  };

  const skipBackward = () => {
    if (currentSceneIdx > 0) {
      playScene(currentSceneIdx - 1);
    } else {
      playScene(0);
    }
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 0 : newVolume;
    }
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (utteranceRef.current) {
      utteranceRef.current.volume = newMuted ? 0 : volume;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 h-full flex flex-col overflow-y-auto">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <MonitorPlay className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            AI Video Classes
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            High-level, instant video lessons generated by AI.
          </p>
        </div>
        {scenes.length > 0 && (
          <button 
            onClick={() => { stopClass(); setScenes([]); }}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            + New Class
          </button>
        )}
      </div>

      {/* Setup Area */}
      {!scenes.length && (
        <div className="bg-white dark:bg-[#1C1C1E] p-8 md:p-12 rounded-[2rem] border border-black/5 dark:border-white/10 shadow-2xl max-w-3xl mx-auto w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Presentation className="w-64 h-64" />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-8 text-slate-900 dark:text-slate-100">What do you want to learn?</h3>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Education Level</label>
                <select 
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-colors font-medium"
                >
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Introduction to Algebra..."
                    className="flex-1 p-4 rounded-2xl border-2 border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-colors font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && generateClass()}
                  />
                  <button 
                    onClick={() => generateClass()}
                    disabled={isGenerating || !topic.trim()}
                    className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-indigo-500/30"
                  >
                    {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Topics</p>
              <div className="flex flex-wrap gap-2">
                {quickTopics.map(qt => (
                  <button
                    key={qt}
                    onClick={() => generateClass(qt)}
                    className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    {qt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Video Player Area */}
      {scenes.length > 0 && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto py-6">
          
          {/* 16:9 Player Container */}
          <div 
            ref={playerRef}
            className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col group border border-slate-800"
          >
            
            {/* Main Content Split */}
            <div className="flex-1 flex flex-col md:flex-row relative">
              {/* Blackboard (Left 70% on desktop, Top on mobile) */}
              <div className="flex-1 md:w-[70%] p-6 md:p-12 flex flex-col justify-center bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                
                <div className="relative z-10">
                  <h3 className="text-indigo-400 font-mono text-[10px] md:text-sm uppercase tracking-widest mb-4 md:mb-6 border-b border-indigo-400/30 pb-2 inline-block">
                    {topic} • {level}
                  </h3>
                  <div className="prose prose-invert prose-indigo max-w-none prose-h1:text-2xl md:prose-h1:text-4xl prose-h2:text-xl md:prose-h2:text-3xl prose-p:text-sm md:prose-p:text-lg font-sans">
                    <Markdown>{scenes[currentSceneIdx]?.boardText || ''}</Markdown>
                  </div>
                </div>
              </div>

              {/* Teacher Avatar (Right 30% on desktop, Bottom on mobile) */}
              <div className="h-1/3 md:h-auto md:w-[30%] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-purple-500/10"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400" 
                      alt="AI Teacher" 
                      className={cn(
                        "w-20 h-20 md:w-48 md:h-48 rounded-full object-cover border-4 border-slate-800 shadow-2xl transition-all duration-300",
                        isPlaying ? "ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-900 scale-105" : ""
                      )}
                      referrerPolicy="no-referrer"
                    />
                    {isPlaying && (
                      <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-indigo-500 text-white p-1.5 md:p-2.5 rounded-full shadow-lg animate-pulse">
                        <Volume2 className="w-3 h-3 md:w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 md:mt-6 px-4 text-center hidden md:block">
                    <span className="bg-slate-800 text-slate-300 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      AI Educator
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtitles Overlay */}
            {showSubtitles && (
              <div className="absolute bottom-20 md:bottom-24 left-0 right-0 flex justify-center px-6 md:px-12 pointer-events-none z-20">
                <div className="bg-black/60 backdrop-blur-xl text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl text-center max-w-3xl border border-white/10 shadow-2xl transform transition-all">
                  <p className="text-xs md:text-xl font-medium leading-relaxed">
                    {scenes[currentSceneIdx]?.speech}
                  </p>
                </div>
              </div>
            )}

            {/* Player Controls (Bottom Bar) */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 pb-6 px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
              
              {/* Progress Bar */}
              <div className="flex gap-1.5 mb-6 h-1.5 cursor-pointer">
                {scenes.map((_, idx) => (
                  <div 
                    key={idx}
                    onClick={() => playScene(idx)}
                    className={cn(
                      "flex-1 rounded-full transition-all",
                      idx < currentSceneIdx ? "bg-indigo-500" :
                      idx === currentSceneIdx ? "bg-indigo-400" : "bg-white/20 hover:bg-white/40"
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4 md:gap-6">
                  <button onClick={skipBackward} className="hover:text-indigo-400 transition-colors p-1">
                    <Rewind className="w-5 h-5 md:w-6 h-6" />
                  </button>
                  <button 
                    onClick={togglePlayPause}
                    className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 md:w-6 h-6" /> : <Play className="w-5 h-5 md:w-6 h-6 ml-1" />}
                  </button>
                  <button onClick={skipForward} className="hover:text-indigo-400 transition-colors p-1">
                    <FastForward className="w-5 h-5 md:w-6 h-6" />
                  </button>
                  
                  <div className="hidden md:flex items-center gap-3 ml-4 group/volume">
                    <button onClick={toggleMute} className="hover:text-indigo-400 transition-colors">
                      {isMuted || volume === 0 ? <Volume2 className="w-5 h-5 opacity-50" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                  <button 
                    onClick={() => setShowSubtitles(!showSubtitles)}
                    className={cn("transition-all p-1", showSubtitles ? "text-indigo-400 scale-110" : "text-slate-400 hover:text-white")}
                    title="Toggle Subtitles"
                  >
                    <Subtitles className="w-5 h-5 md:w-6 h-6" />
                  </button>
                  <button 
                    onClick={toggleFullscreen}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Toggle Fullscreen"
                  >
                    <Maximize className="w-5 h-5 md:w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
