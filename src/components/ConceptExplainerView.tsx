import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Lightbulb, Loader2, Sparkles, Target, Layers, Baby } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import VoiceInputButton from './VoiceInputButton';

interface ConceptExplainerViewProps {
  isKidsMode?: boolean;
}

export default function ConceptExplainerView({ isKidsMode }: ConceptExplainerViewProps) {
  const [concept, setConcept] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const explainConcept = async (mode: 'simple' | 'analogy' | 'steps') => {
    if (!concept.trim()) return;
    
    setIsGenerating(true);
    setActiveMode(mode);
    
    let promptModifier = '';
    if (isKidsMode) {
      promptModifier = 'Explain this concept to a 3-6 year old child. Make it super fun, use lots of emojis, and tell a little story! Keep it very short and simple.';
    } else {
      if (mode === 'simple') {
        promptModifier = 'Explain this concept as simply as possible, like I am 5 years old. Avoid jargon.';
      } else if (mode === 'analogy') {
        promptModifier = 'Explain this concept using a clear, relatable real-world analogy.';
      } else if (mode === 'steps') {
        promptModifier = 'Break this concept down into small, logical, step-by-step components.';
      }
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Topic/Concept: ${concept}\n\n${promptModifier}\n\nFormat the output in clear Markdown.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      if (response.text) {
        setExplanation(response.text);
      }
    } catch (error) {
      console.error("Failed to explain concept:", error);
      alert("Failed to generate explanation.");
    } finally {
      setIsGenerating(false);
      setActiveMode(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isKidsMode ? "What is it? 🤔" : "Concept Explainer"}
        </h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          {isKidsMode ? "Ask about anything and get a fun story!" : "Struggling with a topic? Get it explained in a way that makes sense to you."}
        </p>
      </div>

      <div className={cn("p-6 apple-card mb-8", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
        <div className="mb-6">
          <label className={cn("block text-sm font-medium mb-2", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-300")}>
            {isKidsMode ? "What do you want to learn about?" : "What do you want to learn?"}
          </label>
          <div className="relative">
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder={isKidsMode ? "e.g., Stars, Dinosaurs, Rain" : "e.g., Quantum Entanglement, The French Revolution, React Hooks"}
              className={cn("w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 transition-all text-lg", isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20 focus:border-amber-500 text-amber-900 dark:text-amber-100" : "bg-transparent border-black/10 dark:border-white/10 focus:ring-black/20 dark:focus:ring-white/20")}
            />
            <VoiceInputButton 
              onResult={(text) => setConcept(prev => prev ? `${prev} ${text}` : text)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => explainConcept('simple')}
            disabled={isGenerating || !concept.trim()}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
              activeMode === 'simple' 
                ? (isKidsMode ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200" : "bg-black text-white dark:bg-white dark:text-black border-transparent") 
                : (isKidsMode ? "bg-white dark:bg-[#1C1C1E] border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"),
              (isGenerating && activeMode !== 'simple') && "opacity-50 cursor-not-allowed"
            )}
          >
            {activeMode === 'simple' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Baby className={cn("w-4 h-4", isKidsMode ? "text-amber-500" : "text-blue-500")} />}
            {isKidsMode ? "Tell me a story!" : "Explain Simply"}
          </button>
          
          {!isKidsMode && (
            <>
              <button
                onClick={() => explainConcept('analogy')}
                disabled={isGenerating || !concept.trim()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                  activeMode === 'analogy' ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
                  (isGenerating && activeMode !== 'analogy') && "opacity-50 cursor-not-allowed"
                )}
              >
                {activeMode === 'analogy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4 text-amber-500" />}
                Use an Analogy
              </button>

              <button
                onClick={() => explainConcept('steps')}
                disabled={isGenerating || !concept.trim()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                  activeMode === 'steps' ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
                  (isGenerating && activeMode !== 'steps') && "opacity-50 cursor-not-allowed"
                )}
              >
                {activeMode === 'steps' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4 text-emerald-500" />}
                Step-by-Step
              </button>
            </>
          )}
        </div>
      </div>

      <div className={cn("flex-1 apple-card overflow-hidden flex flex-col min-h-0", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
        <div className={cn("px-6 py-4 border-b flex items-center gap-2 text-sm font-medium", isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-200" : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300")}>
          <Sparkles className="w-4 h-4" />
          {isKidsMode ? "The Magic Answer" : "Explanation"}
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {explanation ? (
            <div className={cn("markdown-body prose max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed", isKidsMode ? "prose-amber prose-lg" : "prose-slate")}>
              <Markdown>{explanation}</Markdown>
            </div>
          ) : (
            <div className={cn("h-full flex flex-col items-center justify-center", isKidsMode ? "text-amber-300 dark:text-amber-700" : "text-slate-400 dark:text-slate-500")}>
              <Target className="w-12 h-12 mb-4 opacity-20" />
              <p className={isKidsMode ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                {isKidsMode ? "Ask me something fun!" : "Enter a concept and choose an explanation style above."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
