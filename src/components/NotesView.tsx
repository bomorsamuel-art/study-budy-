import { useState, useEffect, useRef } from 'react';
import { Save, FileText, Wand2, Loader2, Download, FileDown, FileType2, Bold, Italic, List, Upload } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { exportToTxt, exportToPdfText } from '../lib/export';
import VoiceInputButton from './VoiceInputButton';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface NotesViewProps {
  material: string;
  setMaterial: (content: string) => void;
  isKidsMode?: boolean;
  currentUser: User | null;
}

export default function NotesView({ material, setMaterial, isKidsMode, currentUser }: NotesViewProps) {
  const [localText, setLocalText] = useState(material);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: isKidsMode ? "Type or paste something fun here! 🎈" : "Paste your lecture notes, textbook excerpts, or articles here...",
      }),
    ],
    content: material,
    onUpdate: ({ editor }) => {
      setLocalText(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-6 h-full',
      },
    },
  });

  useEffect(() => {
    const loadNotes = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'user_data', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().notes) {
          const loadedNotes = docSnap.data().notes;
          setLocalText(loadedNotes);
          setMaterial(loadedNotes);
          if (editor) {
            editor.commands.setContent(loadedNotes);
          }
        }
      } catch (error) {
        console.error("Error loading notes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadNotes();
  }, [currentUser, setMaterial, editor]);

  // Sync local state if material changes from outside (e.g., selecting a course)
  useEffect(() => {
    if (material && material !== localText) {
      setLocalText(material);
      if (editor && editor.getHTML() !== material) {
        editor.commands.setContent(material);
      }
    }
  }, [material, editor, localText]);

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
    setMaterial(localText);
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'user_data', currentUser.uid);
      await setDoc(docRef, { uid: currentUser.uid, notes: localText }, { merge: true });
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes to cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSummarize = async () => {
    if (!localText.trim() || localText === '<p></p>') return;
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const lengthInstructions = {
        short: "Make it very brief and concise (around 2-3 sentences or bullet points).",
        medium: "Make it a standard summary with key concepts and bullet points.",
        long: "Make it a detailed summary covering all important aspects and sub-topics."
      };

      const prompt = isKidsMode
        ? `Please summarize the following notes for a 3-6 year old child. ${lengthInstructions[summaryLength]} Make it super simple, fun, use emojis! Format it in HTML.\n\nNotes:\n${localText}`
        : `Please summarize the following study notes. ${lengthInstructions[summaryLength]} Use bullet points and highlight key concepts. Format it in HTML.\n\nNotes:\n${localText}`;
        
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (response.text) {
        // Strip markdown code blocks if the model wrapped the HTML
        const cleanHtml = response.text.replace(/```html\n?/g, '').replace(/```\n?/g, '');
        setLocalText(cleanHtml);
        setMaterial(cleanHtml);
        if (editor) {
          editor.commands.setContent(cleanHtml);
        }
      }
    } catch (error) {
      console.error("Failed to summarize:", error);
      alert("Failed to summarize notes. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportTxt = () => {
    const textToExport = editor ? editor.getText() : localText.replace(/<[^>]+>/g, '');
    exportToTxt(textToExport, 'Study_Notes');
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    const textToExport = editor ? editor.getText() : localText.replace(/<[^>]+>/g, '');
    exportToPdfText(textToExport, 'Study_Notes');
    setShowExportMenu(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      alert("PDF parsing is simulated in this demo. In a production app, we would extract the text from the PDF here.");
      const mockText = `<p><strong>Extracted from ${file.name}</strong></p><p>This is simulated text extracted from your PDF file. You can now summarize it or chat with the AI Tutor about it.</p>`;
      if (editor) editor.commands.setContent(mockText);
      setLocalText(mockText);
      setMaterial(mockText);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const htmlText = text.split('\n').map(line => `<p>${line}</p>`).join('');
        if (editor) editor.commands.setContent(htmlText);
        setLocalText(htmlText);
        setMaterial(htmlText);
      };
      reader.readAsText(file);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isKidsMode ? "My Fun Notes 🖍️" : "Study Notes"}
          </h2>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400 font-medium">
            {isKidsMode ? "Put your fun stories and ideas here!" : "Paste your study material here to get started."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".txt,.md,.csv,.pdf" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!localText.trim() || localText === '<p></p>'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 dark:border-white/10 py-1 z-50">
                <button
                  onClick={handleExportTxt}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left"
                >
                  <FileType2 className="w-4 h-4 text-slate-400" />
                  TXT File
                </button>
                <button
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left"
                >
                  <FileDown className="w-4 h-4 text-rose-400" />
                  PDF Document
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-2xl p-1 border border-black/5 dark:border-white/10">
            {(['short', 'medium', 'long'] as const).map((len) => (
              <button
                key={len}
                onClick={() => setSummaryLength(len)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize",
                  summaryLength === len 
                    ? "bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {len}
              </button>
            ))}
          </div>

          <button
            onClick={handleSummarize}
            disabled={isGenerating || !localText.trim() || localText === '<p></p>'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
          >
            <Wand2 className="w-4 h-4" />
            {isGenerating ? (isKidsMode ? 'Magic...' : 'Summarizing...') : (isKidsMode ? 'Magic Summary ✨' : 'Summarize')}
          </button>
          <button
            onClick={handleSave}
            disabled={localText === material && !isSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-white dark:text-black rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-black dark:bg-white hover:scale-105 active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : (isKidsMode ? "Save!" : "Save")}
          </button>
        </div>
      </div>

      <div className="flex-1 apple-card overflow-hidden flex flex-col relative">
        <div className="px-8 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <FileText className="w-4 h-4" />
            {isKidsMode ? "My Story" : "Editor"}
          </div>
          {editor && (
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-all", editor.isActive('bold') && "bg-white dark:bg-white/20 shadow-sm")}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-all", editor.isActive('italic') && "bg-white dark:bg-white/20 shadow-sm")}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-all", editor.isActive('bulletList') && "bg-white dark:bg-white/20 shadow-sm")}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto relative bg-white dark:bg-transparent">
          <EditorContent editor={editor} className="h-full" />
          <VoiceInputButton 
            onResult={(text) => {
              if (editor) {
                editor.commands.insertContent(text + ' ');
              }
            }}
            className="absolute bottom-6 right-6 bg-white dark:bg-[#2C2C2E] shadow-xl border border-black/5 dark:border-white/10 w-14 h-14 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
