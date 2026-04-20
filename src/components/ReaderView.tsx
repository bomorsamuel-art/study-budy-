import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { BookOpen, ChevronRight, Loader2, BookText, Sparkles, Volume2, Play, Pause, Square, Menu, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ReaderViewProps {
  material: string;
  isKidsMode?: boolean;
}

export default function ReaderView({ material, isKidsMode }: ReaderViewProps) {
  const [toc, setToc] = useState<string[]>([]);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [showSidebar, setShowSidebar] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTOC = async () => {
      if (!material.trim()) return;
      
      setIsLoading(true);
      setToc([]);
      setCurrentChapter(null);
      setChapterContent('');
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = isKidsMode
          ? `You are a fun storyteller. Create a table of contents (3-5 short chapters) for a fun story about: ${material}. Return ONLY a JSON array of strings.`
          : `You are an expert professor. Create a comprehensive table of contents (5-8 chapters) for a textbook or course about: ${material}. Return ONLY a JSON array of strings.`;
          
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        
        if (response.text) {
          // Extract JSON array from the response text, handling potential markdown formatting
          const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
          try {
            setToc(JSON.parse(text));
          } catch (e) {
            console.error("Failed to parse TOC JSON:", e);
            // Fallback: split by newlines if it's a list
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            setToc(lines.map(line => line.replace(/^[\d\.\-\*\s]+/, '').trim()));
          }
        }
      } catch (error) {
        console.error("Failed to generate TOC:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTOC();
  }, [material, isKidsMode]);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0 && contentRef.current?.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Adjust position relative to the container if needed, but fixed to viewport is easier for a floating button
        setSelectedText(selection.toString().trim());
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const pronounceText = () => {
    if (!selectedText) return;
    const utterance = new SpeechSynthesisUtterance(selectedText);
    
    // Try to guess language based on material title
    const lowerMaterial = material.toLowerCase();
    let lang = 'en-US';
    if (lowerMaterial.includes('spanish')) lang = 'es-ES';
    else if (lowerMaterial.includes('french')) lang = 'fr-FR';
    else if (lowerMaterial.includes('japanese')) lang = 'ja-JP';
    else if (lowerMaterial.includes('german')) lang = 'de-DE';
    
    utterance.lang = lang;
    const bestVoice = getBestVoice(lang);
    if (bestVoice) utterance.voice = bestVoice;
    utterance.pitch = 1.05;
    
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    window.speechSynthesis.speak(utterance);
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const getBestVoice = (lang: string = 'en-US') => {
    // Priority: Premium/Enhanced voices > Google voices > System defaults
    const langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
    
    return langVoices.find(v => v.name.includes('Premium') || v.name.includes('Enhanced')) ||
           langVoices.find(v => v.name.includes('Google')) ||
           langVoices.find(v => v.lang === lang) ||
           langVoices[0] || 
           null;
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const toggleReadAloud = () => {
    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      const utterance = new SpeechSynthesisUtterance(chapterContent.replace(/[#*`]/g, ''));
      utterance.rate = playbackSpeed;
      utterance.pitch = 1.05; // Slightly higher pitch for more "human" feel
      utterance.volume = 1;
      
      const lowerMaterial = material.toLowerCase();
      let lang = 'en-US';
      if (lowerMaterial.includes('spanish')) lang = 'es-ES';
      else if (lowerMaterial.includes('french')) lang = 'fr-FR';
      else if (lowerMaterial.includes('japanese')) lang = 'ja-JP';
      
      utterance.lang = lang;
      const bestVoice = getBestVoice(lang);
      if (bestVoice) utterance.voice = bestVoice;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const loadChapter = async (chapter: string) => {
    stopSpeaking();
    setCurrentChapter(chapter);
    setIsGeneratingContent(true);
    setChapterContent('');
    setShowSidebar(false); // Close sidebar on mobile after selection
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = isKidsMode
        ? `Write a fun, engaging, and simple story chapter for kids (ages 3-6) about "${chapter}" from the book "${material}". Use emojis and keep it short.`
        : `Write a comprehensive, academic textbook chapter for "${chapter}" from the course/book "${material}". Include an introduction, detailed explanations, examples, and a brief summary. Format with Markdown.`;
        
      const response = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          setChapterContent(fullText);
        }
      }
    } catch (error) {
      console.error("Failed to generate chapter:", error);
      setChapterContent("Failed to load chapter content. Please try again.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  if (!material.trim()) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4", isKidsMode ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-400")}>
          <BookText className="w-8 h-8" />
        </div>
        <h2 className={cn("text-xl font-semibold mb-2", isKidsMode ? "text-amber-900" : "text-slate-900")}>
          {isKidsMode ? "No Book Selected!" : "No Material Selected"}
        </h2>
        <p className={cn("max-w-md", isKidsMode ? "text-amber-700" : "text-slate-500")}>
          {isKidsMode ? "Go to Storybooks and pick a fun story to read!" : "Go to Courses or Textbooks and select a topic to start reading."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 h-full flex flex-col relative">
      <div className="mb-8 md:mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isKidsMode ? "Story Time 📖" : "Interactive Reader"}
          </h2>
          <p className="mt-2 md:mt-3 text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium truncate max-w-[250px] md:max-w-none">
            {material.split('\n')[0]}
          </p>
        </div>
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden p-3 rounded-2xl bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 shadow-sm border border-black/5 dark:border-white/10"
        >
          {showSidebar ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex flex-1 gap-10 min-h-0 relative">
        {/* Table of Contents Sidebar */}
        <div className={cn(
          "fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-0 lg:w-1/3 lg:flex flex-col apple-card overflow-hidden transition-all duration-500",
          isKidsMode && "border-amber-200 dark:border-amber-900/30",
          showSidebar ? "translate-x-0 opacity-100" : "-translate-x-full lg:translate-x-0 opacity-0 lg:opacity-100",
          "bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl lg:bg-white dark:lg:bg-[#1C1C1E]"
        )}>
          <div className={cn("p-6 border-b font-bold flex items-center justify-between uppercase tracking-widest text-xs", isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-100" : "bg-slate-50/50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-400 dark:text-slate-500")}>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {isKidsMode ? "Chapters" : "Contents"}
            </div>
            <button onClick={() => setShowSidebar(false)} className="lg:hidden p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-bold uppercase tracking-widest">Generating...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {toc.map((chapter, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadChapter(chapter)}
                    className={cn(
                      "w-full text-left px-5 py-4 rounded-2xl text-sm transition-all flex items-center justify-between group",
                      currentChapter === chapter
                        ? (isKidsMode ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 font-bold shadow-sm" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm")
                        : (isKidsMode ? "text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5")
                    )}
                  >
                    <span className="truncate pr-4">{idx + 1}. {chapter}</span>
                    <ChevronRight className={cn(
                      "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
                      currentChapter === chapter && "opacity-100"
                    )} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 apple-card overflow-hidden flex flex-col relative",
          isKidsMode && "border-amber-200 dark:border-amber-900/30"
        )}>
          {currentChapter ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-12" ref={contentRef}>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 md:mb-12 gap-6">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {currentChapter}
                </h1>
                {/* Global Pronounce Button for the whole chapter */}
                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                  <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-2xl p-1 border border-black/5 dark:border-white/10">
                    {[0.5, 1, 1.5, 2].map(speed => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          if (isSpeaking) {
                            stopSpeaking();
                            // Restart with new speed if user was listening
                            setTimeout(toggleReadAloud, 100);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all",
                          playbackSpeed === speed 
                            ? "bg-white dark:bg-white/20 shadow-sm text-indigo-600 dark:text-white" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        )}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={toggleReadAloud}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg hover:scale-105 active:scale-95",
                      isKidsMode 
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 shadow-amber-500/10" 
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20"
                    )}
                  >
                    {isSpeaking ? (isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />) : <Volume2 className="w-4 h-4" />}
                    {isSpeaking ? (isPaused ? "Resume" : "Pause") : "Read Aloud"}
                  </button>
                  {isSpeaking && (
                    <button 
                      onClick={stopSpeaking}
                      className={cn(
                        "p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg",
                        isKidsMode ? "bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 shadow-rose-500/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 shadow-black/5"
                      )}
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {chapterContent ? (
                <div className={cn("prose max-w-none dark:prose-invert prose-slate", isKidsMode && "prose-p:text-2xl prose-p:leading-relaxed prose-headings:text-amber-900 dark:prose-headings:text-amber-100")}>
                  <Markdown>{chapterContent}</Markdown>
                </div>
              ) : isGeneratingContent ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500 space-y-6">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <p className="font-bold uppercase tracking-widest text-xs">Writing chapter...</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl", isKidsMode ? "bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400" : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500")}>
                {isKidsMode ? <Sparkles className="w-10 h-10" /> : <BookOpen className="w-10 h-10" />}
              </div>
              <p className={cn("text-xl font-bold tracking-tight", isKidsMode ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400")}>
                {isKidsMode ? "Pick a chapter to start reading!" : "Select a chapter from the table of contents to begin reading."}
              </p>
              <button 
                onClick={() => setShowSidebar(true)}
                className="lg:hidden mt-8 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
              >
                Open Table of Contents
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Pronunciation Button */}
      <AnimatePresence>
        {selectedText && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed z-50 pointer-events-auto"
            style={{ 
              left: `${selectionPosition.x}px`, 
              top: `${selectionPosition.y - 50}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <button
              onClick={pronounceText}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-xl hover:scale-105 transition-transform"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-sm font-medium">Pronounce</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
