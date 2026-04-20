import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { BookOpen, Search, Loader2, Sparkles, FileQuestion, Maximize2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function PastQuestionsView() {
  const [examType, setExamType] = useState('WAEC');
  const [subject, setSubject] = useState('Mathematics');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState(false);

  const subjects = ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Basic Science', 'Business Studies'];
  const examTypes = ['Junior WAEC (BECE)', 'Senior WAEC (WASSCE)', 'JAMB', 'NECO'];

  const generatePastQuestion = async () => {
    if (!topic.trim()) {
      alert("Please enter a topic.");
      return;
    }
    
    setIsLoading(true);
    setSolution(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Act as an expert Nigerian tutor. Provide a typical past question for the ${examType} ${subject} exam regarding the topic: "${topic}". 
        
        Format your response in Markdown as follows:
        ### Past Question
        [State the question clearly]

        ### Step-by-Step Solution
        [Provide a detailed, easy-to-understand solution]
        
        ### Final Answer
        [State the final answer clearly]`,
      });

      setSolution(response.text || "Could not generate a solution.");
    } catch (error) {
      console.error("Failed to generate past question:", error);
      setSolution("Failed to load past question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
          <FileQuestion className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          Past Questions & Solutions
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Search for specific topics and get AI-generated solutions based on real exam patterns.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Exam</label>
            <select 
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 outline-none"
            >
              {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 outline-none"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Topic</label>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quadratic Equations"
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>
        </div>
        <button 
          onClick={generatePastQuestion}
          disabled={isLoading || !topic.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          Find & Solve
        </button>
      </div>

      {solution && (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1C1C1E] p-6 md:p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm relative group">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">AI Solution</h3>
            </div>
            <button 
              onClick={() => setIsFullView(true)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Full View"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
          <div className="markdown-body prose max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 dark:prose-pre:bg-white/5 prose-pre:text-slate-800 dark:prose-pre:text-slate-200 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-white/10 prose-headings:font-semibold dark:prose-invert prose-indigo">
            <Markdown>{solution}</Markdown>
          </div>
        </div>
      )}

      {/* Full View Modal */}
      <AnimatePresence>
        {isFullView && solution && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#1C1C1E] w-full max-w-5xl h-full max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Full AI Solution</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{examType} • {subject} • {topic}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsFullView(false)}
                  className="p-3 rounded-2xl bg-white dark:bg-white/10 text-slate-500 hover:text-rose-500 transition-colors shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 md:p-12">
                <div className="markdown-body prose max-w-none prose-p:text-lg prose-p:leading-relaxed prose-pre:bg-slate-50 dark:prose-pre:bg-white/5 prose-pre:text-slate-800 dark:prose-pre:text-slate-200 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-white/10 prose-headings:font-bold dark:prose-invert prose-indigo">
                  <Markdown>{solution}</Markdown>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-end">
                <button 
                  onClick={() => setIsFullView(false)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  Done Reading
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
