import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Sparkles, User, MessageSquare, Volume2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import VoiceInputButton from './VoiceInputButton';
import { motion } from 'motion/react';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
}

interface ChatViewProps {
  material: string;
  isKidsMode?: boolean;
}

export default function ChatView({ material, isKidsMode }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const chatRef = useRef<any>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = isKidsMode 
      ? `You are a magical, friendly AI teacher for a 3 to 6 year old child! Use very simple words, short sentences, and lots of fun emojis! 🎈✨🐶 Be super encouraging and playful.
      
      Study Material (adapt this for a toddler/preschooler):
      ${material || "No material provided yet. Just be a fun friend!"}`
      : `You are an expert AI tutor. Your goal is to help the user understand their study material. 
      Be encouraging, clear, and concise. Use the following study material as your primary source of truth.
      
      Study Material:
      ${material || "No material provided yet. Ask the user to provide some."}`;

    chatRef.current = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: { 
        systemInstruction,
        tools: [{ googleSearch: {} }]
      }
    });
    
    if (material && messages.length === 0) {
      setMessages([{
        role: 'model',
        content: isKidsMode ? "Hi there! 🎈 I'm your magical AI teacher! What fun things do you want to learn about today? ✨" : "Hi! I'm your AI tutor. I've read your study notes. What would you like to review or ask questions about?",
        timestamp: getCurrentTime()
      }]);
    }
  }, [material, isKidsMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMsg = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: getCurrentTime() }]);
    setIsLoading(true);

    try {
      const responseStream = await chatRef.current.sendMessageStream({ message: userMsg });
      setIsLoading(false);
      
      setMessages(prev => [...prev, { role: 'model', content: '', timestamp: getCurrentTime() }]);
      
      let fullText = '';
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = fullText;
            return newMsgs;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try asking again.", timestamp: getCurrentTime() }]);
    }
  };

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
    const langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
    return langVoices.find(v => v.name.includes('Premium') || v.name.includes('Enhanced')) ||
           langVoices.find(v => v.name.includes('Google')) ||
           langVoices.find(v => v.lang === lang) ||
           langVoices[0] || 
           null;
  };

  const pronounceMessage = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ''));
    utterance.pitch = 1.05;
    utterance.rate = 1;
    
    const bestVoice = getBestVoice();
    if (bestVoice) utterance.voice = bestVoice;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (!material.trim()) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No Study Material</h2>
        <p className="text-slate-500 max-w-md">
          Please add some notes in the "Study Notes" tab first, or select a course from the "Courses" tab.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col relative", isKidsMode ? "bg-amber-50/50 dark:bg-amber-900/10" : "bg-transparent")}>
      {/* Header */}
      <div className={cn("sticky top-0 z-20 backdrop-blur-2xl border-b px-8 py-5", isKidsMode ? "bg-amber-50/80 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30" : "bg-white/80 dark:bg-[#1C1C1E]/80 border-black/5 dark:border-white/10")}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", isKidsMode ? "bg-amber-100 dark:bg-amber-500/20 text-amber-500" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400")}>
              <Sparkles className="w-5 h-5" />
            </div>
            {isKidsMode ? "Magical Tutor" : "AI Tutor"}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Online</span>
          </div>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto w-full pb-40">
        <div className="max-w-3xl mx-auto w-full px-6 py-10 space-y-10">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-5 w-full",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === 'model' && (
                <div className={cn("w-10 h-10 rounded-2xl text-white flex items-center justify-center shrink-0 mt-1 shadow-md", isKidsMode ? "bg-amber-500" : "bg-indigo-600 dark:bg-indigo-500")}>
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[85%] group relative",
                msg.role === 'user' 
                  ? (isKidsMode ? "bg-amber-200 text-amber-900 px-6 py-4 rounded-[2rem] rounded-tr-lg shadow-sm" : "bg-black text-white dark:bg-white dark:text-black px-6 py-4 rounded-[2rem] rounded-tr-lg shadow-lg")
                  : "text-slate-800 dark:text-slate-200 pt-1"
              )}>
                {msg.role === 'user' ? (
                  <p className={cn("whitespace-pre-wrap leading-relaxed font-medium", isKidsMode ? "text-xl" : "text-lg")}>{msg.content}</p>
                ) : (
                  <div className="relative">
                    <div className={cn("markdown-body prose max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 dark:prose-pre:bg-white/5 prose-pre:text-slate-800 dark:prose-pre:text-slate-200 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-white/10 prose-headings:font-bold dark:prose-invert", isKidsMode ? "prose-amber prose-xl" : "prose-slate prose-lg")}>
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    <button
                      onClick={() => pronounceMessage(msg.content)}
                      className={cn(
                        "absolute -right-12 top-0 p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 shadow-sm",
                        isKidsMode ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-[#2C2C2E] dark:text-slate-400 dark:hover:bg-slate-700 border border-black/5 dark:border-white/10"
                      )}
                      title="Read Aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex gap-5 w-full justify-start">
              <div className={cn("w-10 h-10 rounded-2xl text-white flex items-center justify-center shrink-0 mt-1 shadow-md", isKidsMode ? "bg-amber-500" : "bg-indigo-600 dark:bg-indigo-500")}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="pt-4 flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full animate-bounce", isKidsMode ? "bg-amber-400" : "bg-indigo-400")} style={{ animationDelay: '0ms' }} />
                <div className={cn("w-2.5 h-2.5 rounded-full animate-bounce", isKidsMode ? "bg-amber-400" : "bg-indigo-400")} style={{ animationDelay: '150ms' }} />
                <div className={cn("w-2.5 h-2.5 rounded-full animate-bounce", isKidsMode ? "bg-amber-400" : "bg-indigo-400")} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className={cn("absolute bottom-0 left-0 right-0 bg-gradient-to-t pt-16 pb-8 px-6 z-30", isKidsMode ? "from-amber-50 dark:from-[#1C1C1E] via-amber-50 dark:via-[#1C1C1E] to-transparent" : "from-white dark:from-[#1C1C1E] via-white dark:via-[#1C1C1E] to-transparent")}>
        <div className="max-w-3xl mx-auto relative">
          <div className={cn("relative flex items-end gap-3 rounded-[2.5rem] border p-3 shadow-2xl focus-within:ring-8 transition-all", isKidsMode ? "bg-white dark:bg-[#2C2C2E] border-amber-200 dark:border-amber-900/30 focus-within:border-amber-400 focus-within:ring-amber-500/10" : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/10 focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50 focus-within:ring-indigo-500/5")}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isKidsMode ? "Ask a fun question! 🎈" : "Ask a question..."}
              className={cn("flex-1 max-h-[200px] min-h-[52px] bg-transparent resize-none py-4 pl-6 pr-16 focus:outline-none text-slate-800 dark:text-slate-200 leading-relaxed font-medium", isKidsMode ? "text-xl" : "text-lg")}
              rows={1}
            />
            <div className="flex items-center gap-2 mb-1 mr-1">
              <VoiceInputButton 
                onResult={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn("shrink-0 w-12 h-12 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg hover:scale-105 active:scale-95", isKidsMode ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 shadow-black/10 dark:shadow-white/10")}
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
          </div>
          {!isKidsMode && (
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-4">
              AI can make mistakes. Verify important information.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
