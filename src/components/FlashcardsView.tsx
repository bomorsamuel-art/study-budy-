import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Brain, ChevronLeft, ChevronRight, RefreshCw, Wand2, Save, Loader2, Download, FileType2, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { exportToTxt, exportToPdfText } from '../lib/export';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsViewProps {
  material: string;
  isKidsMode?: boolean;
  currentUser: User | null;
}

export default function FlashcardsView({ material, isKidsMode, currentUser }: FlashcardsViewProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFlashcards = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'user_data', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().flashcards) {
          const loadedCards = JSON.parse(docSnap.data().flashcards);
          setFlashcards(loadedCards);
        }
      } catch (error) {
        console.error("Error loading flashcards:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFlashcards();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (!currentUser || flashcards.length === 0) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'user_data', currentUser.uid);
      await setDoc(docRef, { 
        uid: currentUser.uid, 
        flashcards: JSON.stringify(flashcards) 
      }, { merge: true });
    } catch (error) {
      console.error("Error saving flashcards:", error);
      alert("Failed to save flashcards to cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateFlashcards = async () => {
    if (!material.trim()) return;
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = isKidsMode
        ? `Generate a set of fun, very simple educational flashcards for a 3-6 year old based on the following material. Use emojis! Keep the text very short.\n\nMaterial:\n${material}`
        : `Generate a set of educational flashcards based on the following material. Extract the most important concepts, definitions, and facts.\n\nMaterial:\n${material}`;
        
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: {
                  type: Type.STRING,
                  description: "The question, concept, or term on the front of the card.",
                },
                back: {
                  type: Type.STRING,
                  description: "The answer, definition, or explanation on the back of the card.",
                },
              },
              required: ["front", "back"],
            },
          },
        },
      });
      
      if (response.text) {
        const parsed = JSON.parse(response.text);
        setFlashcards(parsed);
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
      alert("Failed to generate flashcards.");
    } finally {
      setIsGenerating(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 100);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 100);
  };

  const formatFlashcardsForExport = () => {
    return flashcards.map((card, index) => `Card ${index + 1}\nQ: ${card.front}\nA: ${card.back}`).join('\n\n');
  };

  const handleExportTxt = () => {
    exportToTxt(formatFlashcardsForExport(), 'Flashcards');
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    exportToPdfText(formatFlashcardsForExport(), 'Flashcards');
    setShowExportMenu(false);
  };

  if (!material.trim()) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4", isKidsMode ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-400")}>
          <Brain className="w-8 h-8" />
        </div>
        <h2 className={cn("text-xl font-semibold mb-2", isKidsMode ? "text-amber-900" : "text-slate-900")}>
          {isKidsMode ? "No Story Yet!" : "No Study Material"}
        </h2>
        <p className={cn("max-w-md", isKidsMode ? "text-amber-700" : "text-slate-500")}>
          {isKidsMode ? "Please add a fun story in the 'My Fun Notes' tab first! 🎈" : "Please add some notes in the 'Study Notes' tab first, so we can generate flashcards for you."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isKidsMode ? "Fun Cards 🃏" : "Flashcards"}
          </h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {flashcards.length > 0 
              ? `Card ${currentIndex + 1} of ${flashcards.length}`
              : (isKidsMode ? 'Make some fun cards!' : 'Generate flashcards from your notes.')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {flashcards.length > 0 && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg border border-black/5 dark:border-white/10 py-1 z-50">
                  <button
                    onClick={handleExportTxt}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left"
                  >
                    <FileType2 className="w-4 h-4 text-slate-400" />
                    Export as TXT
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left"
                  >
                    <FileDown className="w-4 h-4 text-rose-400" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={generateFlashcards}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {flashcards.length > 0 ? (isKidsMode ? 'Make New Cards!' : 'Regenerate') : (isKidsMode ? 'Make Cards ✨' : 'Generate Cards')}
          </button>
          
          {flashcards.length > 0 && currentUser && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {flashcards.length > 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          {/* Flashcard */}
          <div className="relative w-full aspect-[3/2] perspective-[1000px] cursor-pointer group">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <motion.div
                  className="w-full h-full relative preserve-3d"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden apple-card flex flex-col items-center justify-center p-12 text-center transition-colors">
                    <span className="absolute top-6 left-6 text-xs font-bold tracking-wider uppercase text-slate-400">Front</span>
                    <h3 className="font-medium leading-tight text-3xl text-slate-800 dark:text-slate-100">
                      {flashcards[currentIndex].front}
                    </h3>
                    <p className="absolute bottom-6 text-sm font-medium text-slate-400">Click to flip</p>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 backface-hidden apple-card bg-indigo-50/50 dark:bg-indigo-900/20 flex flex-col items-center justify-center p-12 text-center"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <span className="absolute top-6 left-6 text-xs font-bold tracking-wider uppercase text-indigo-400">Back</span>
                    <p className="leading-relaxed overflow-y-auto text-xl text-indigo-900 dark:text-indigo-100">
                      {flashcards[currentIndex].back}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mt-12">
            <button 
              onClick={prevCard}
              className="p-3 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 transition-colors shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              {flashcards.map((_, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    idx === currentIndex 
                      ? "bg-black dark:bg-white w-6" 
                      : "bg-black/10 dark:bg-white/20"
                  )}
                />
              ))}
            </div>
            <button 
              onClick={nextCard}
              className="p-3 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 transition-colors shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-3xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
          <div className="text-center">
            <Wand2 className="w-10 h-10 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="font-medium text-slate-500 dark:text-slate-400">
              {isKidsMode ? "Click 'Make Cards ✨' to create fun cards!" : "Click 'Generate Cards' to create flashcards from your notes."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
