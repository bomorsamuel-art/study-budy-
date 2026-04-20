import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Calendar, Loader2, Sparkles, Save, Download, FileType2, FileDown, Wand2, Bell, BellOff, Clock, Trash2, Plus, List, CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { exportToTxt, exportToPdfText } from '../lib/export';
import VoiceInputButton from './VoiceInputButton';

interface Reminder {
  id: string;
  title: string;
  time: string;
  timestamp: number;
}

interface StudyPlanViewProps {
  isKidsMode?: boolean;
  currentUser: User | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

import { useAppContext } from '../contexts/AppContext';

export default function StudyPlanView({ isKidsMode, currentUser }: StudyPlanViewProps) {
  const { pendingStudyItems, setPendingStudyItems } = useAppContext();
  const [subjects, setSubjects] = useState('');
  const [time, setTime] = useState('');
  const [objectives, setObjectives] = useState('');
  const [plan, setPlan] = useState('');
  const [summary, setSummary] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Calendar Helper: Get days of the current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    const checkReminders = setInterval(() => {
      const now = Date.now();
      setReminders(prev => {
        const due = prev.filter(r => r.timestamp <= now);
        due.forEach(r => {
          if (Notification.permission === 'granted') {
            new Notification('Study Reminder', {
              body: `Time for your study session: ${r.title}`,
              icon: '/favicon.ico'
            });
          }
        });
        return prev.filter(r => r.timestamp > now);
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkReminders);
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  const addReminder = () => {
    if (!reminderTitle || !reminderTime) return;
    
    const timestamp = new Date(reminderTime).getTime();
    if (isNaN(timestamp) || timestamp <= Date.now()) {
      alert("Please select a valid future time.");
      return;
    }

    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      title: reminderTitle,
      time: reminderTime,
      timestamp
    };

    setReminders(prev => [...prev, newReminder].sort((a, b) => a.timestamp - b.timestamp));
    setReminderTitle('');
    setReminderTime('');
  };

  const removeReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  useEffect(() => {
    if (pendingStudyItems.length > 0) {
      const item = pendingStudyItems[0];
      // Try to parse time, if it's just a time string like "2 PM", assume today
      let timestamp = Date.now() + 3600000; // Default 1 hour from now
      try {
        const parsed = new Date(item.time).getTime();
        if (!isNaN(parsed)) timestamp = parsed;
      } catch(e) {}

      const newReminder: Reminder = {
        id: Math.random().toString(36).substr(2, 9),
        title: item.title,
        time: item.time,
        timestamp
      };
      setReminders(prev => [...prev, newReminder].sort((a, b) => a.timestamp - b.timestamp));
      setPendingStudyItems([]);
    }
  }, [pendingStudyItems, setPendingStudyItems]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'user_data', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().studyPlan) {
          const loadedPlan = JSON.parse(docSnap.data().studyPlan);
          setSubjects(loadedPlan.subjects || '');
          setTime(loadedPlan.time || '');
          setObjectives(loadedPlan.objectives || '');
          setPlan(loadedPlan.plan || '');
          setSummary(loadedPlan.summary || '');
          if (loadedPlan.reminders) {
            setReminders(loadedPlan.reminders.filter((r: Reminder) => r.timestamp > Date.now()));
          }
        }
      } catch (error) {
        console.error("Error loading study plan:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlan();
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
    if (!currentUser || !plan) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'user_data', currentUser.uid);
      await setDoc(docRef, { 
        uid: currentUser.uid, 
        studyPlan: JSON.stringify({ subjects, time, objectives, plan, summary, reminders }) 
      }, { merge: true });
    } catch (error) {
      console.error("Error saving study plan:", error);
      alert("Failed to save study plan to cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  const generatePlan = async () => {
    if (!subjects.trim() || !time.trim() || !objectives.trim()) return;
    
    setIsGenerating(true);
    setSummary('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = isKidsMode
        ? `Create a fun, magical daily schedule for a 3-6 year old child based on the following parameters. Use lots of emojis, short sentences, and make it sound like a fun adventure!
        - Fun Activities/Topics: ${subjects}
        - Time Available: ${time}
        - Goals: ${objectives}
        
        Format the output as a clear, structured Markdown document.`
        : `Create a personalized, balanced, and effective study schedule based on the following parameters:
        - Subjects: ${subjects}
        - Time Available: ${time}
        - Learning Objectives: ${objectives}
        
        Format the output as a clear, structured Markdown document. Include a weekly overview, daily breakdown, and tips for success.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (response.text) {
        setPlan(response.text);
      }
    } catch (error) {
      console.error("Failed to generate plan:", error);
      alert("Failed to generate study plan.");
    } finally {
      setIsGenerating(false);
    }
  };

  const summarizePlan = async () => {
    if (!plan) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = isKidsMode
        ? `Summarize this fun schedule into 3 super simple bullet points with emojis for a kid:\n\n${plan}`
        : `Summarize this study plan into a few key bullet points (executive summary):\n\n${plan}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (response.text) {
        setSummary(response.text);
      }
    } catch (error) {
      console.error("Failed to summarize plan:", error);
      alert("Failed to summarize study plan.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExportTxt = () => {
    exportToTxt(plan + (summary ? `\n\nSummary:\n${summary}` : ''), 'Study_Plan');
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    exportToPdfText(plan + (summary ? `\n\nSummary:\n${summary}` : ''), 'Study_Plan');
    setShowExportMenu(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isKidsMode ? "My Fun Schedule 📅" : "Study Plan Generator"}
          </h2>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400 font-medium">
            {isKidsMode ? "Let's plan a fun day of learning and playing!" : "Create a personalized schedule based on your goals and availability."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-2 md:pb-0">
          {plan && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-300"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 dark:border-white/10 py-1 z-50">
                  <button
                    onClick={handleExportTxt}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left text-slate-700 dark:text-slate-300"
                  >
                    <FileType2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    TXT File
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left text-slate-700 dark:text-slate-300"
                  >
                    <FileDown className="w-4 h-4 text-rose-400 dark:text-rose-500" />
                    PDF Document
                  </button>
                </div>
              )}
            </div>
          )}

          {plan && currentUser && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-white dark:text-black rounded-2xl text-sm font-bold transition-all disabled:opacity-50 bg-black dark:bg-white hover:scale-105 active:scale-95 shadow-lg shadow-black/10 dark:shadow-white/10"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save Plan"}</span>
              <span className="sm:hidden">{isSaving ? "..." : "Save"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 min-h-0">
        {/* Form */}
        <div className={cn("lg:col-span-1 space-y-8 p-8 apple-card h-fit", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
          <div>
            <label className={cn("block text-sm font-medium mb-2", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-300")}>
              {isKidsMode ? "What do you want to do?" : "Subjects / Topics"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder={isKidsMode ? "e.g., Dinosaurs, Drawing, Numbers" : "e.g., Calculus, Physics, History"}
                className={cn("w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-transparent", isKidsMode ? "border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20 text-amber-900 dark:text-amber-100" : "border-black/10 dark:border-white/10 focus:ring-black/20 dark:focus:ring-white/20 text-slate-900 dark:text-slate-100")}
              />
              <VoiceInputButton 
                onResult={(text) => setSubjects(prev => prev ? `${prev} ${text}` : text)}
                className="absolute right-1 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>
          
          <div>
            <label className={cn("block text-sm font-medium mb-2", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-300")}>
              {isKidsMode ? "How much time?" : "Time Available"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder={isKidsMode ? "e.g., 1 hour, all afternoon" : "e.g., 2 hours/day, 10 hours/week"}
                className={cn("w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-transparent", isKidsMode ? "border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20 text-amber-900 dark:text-amber-100" : "border-black/10 dark:border-white/10 focus:ring-black/20 dark:focus:ring-white/20 text-slate-900 dark:text-slate-100")}
              />
              <VoiceInputButton 
                onResult={(text) => setTime(prev => prev ? `${prev} ${text}` : text)}
                className="absolute right-1 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>

          <div>
            <label className={cn("block text-sm font-medium mb-2", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-300")}>
              {isKidsMode ? "What's the goal?" : "Learning Objectives"}
            </label>
            <div className="relative">
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder={isKidsMode ? "e.g., Have fun, learn to count to 10" : "e.g., Final exam preparation, deep concept review"}
                rows={3}
                className={cn("w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none bg-transparent", isKidsMode ? "border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20 text-amber-900 dark:text-amber-100" : "border-black/10 dark:border-white/10 focus:ring-black/20 dark:focus:ring-white/20 text-slate-900 dark:text-slate-100")}
              />
              <VoiceInputButton 
                onResult={(text) => setObjectives(prev => prev ? `${prev} ${text}` : text)}
                className="absolute right-2 bottom-2"
              />
            </div>
          </div>

          <button
            onClick={generatePlan}
            disabled={isGenerating || !subjects.trim() || !time.trim() || !objectives.trim()}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isKidsMode ? "bg-amber-500 hover:bg-amber-600" : "bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
            )}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isKidsMode ? "Make My Schedule! ✨" : "Generate Plan"}
          </button>

          {/* Reminders Section */}
          <div className={cn("pt-6 border-t", isKidsMode ? "border-amber-100 dark:border-amber-900/30" : "border-black/5 dark:border-white/10")}>
            <div className="flex items-center justify-between mb-4">
              <h4 className={cn("font-bold flex items-center gap-2", isKidsMode ? "text-amber-900 dark:text-amber-100" : "text-slate-900 dark:text-slate-100")}>
                <Bell className="w-4 h-4" />
                Study Reminders
              </h4>
              {!notificationsEnabled && (
                <button 
                  onClick={requestPermission}
                  className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Enable Notifications
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <input 
                    type="text"
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    placeholder="Reminder title..."
                    className={cn("w-full px-3 py-2 text-xs border rounded-lg focus:outline-none bg-transparent", isKidsMode ? "border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20" : "border-black/10 dark:border-white/10 focus:ring-black/20")}
                  />
                  <input 
                    type="datetime-local"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className={cn("w-full px-3 py-2 text-xs border rounded-lg focus:outline-none bg-transparent", isKidsMode ? "border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20" : "border-black/10 dark:border-white/10 focus:ring-black/20")}
                  />
                </div>
                <button 
                  onClick={addReminder}
                  disabled={!reminderTitle || !reminderTime}
                  className={cn("px-3 rounded-lg transition-colors disabled:opacity-50", isKidsMode ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-white/10 dark:text-white")}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {reminders.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-400 italic">No upcoming reminders</p>
                ) : (
                  reminders.map(reminder => (
                    <div key={reminder.id} className={cn("flex items-center justify-between p-2 rounded-lg border text-xs", isKidsMode ? "bg-amber-50/50 border-amber-100" : "bg-slate-50/50 dark:bg-white/5 border-black/5 dark:border-white/10")}>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate text-slate-900 dark:text-slate-100">{reminder.title}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(reminder.time).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        onClick={() => removeReminder(reminder.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className={cn("lg:col-span-2 apple-card flex flex-col overflow-hidden", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
          <div className={cn("px-4 md:px-6 py-4 border-b flex items-center justify-between", isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30" : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10")}>
            <div className="flex items-center gap-4">
              <div className={cn("flex items-center gap-2 text-sm font-medium", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-300")}>
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">{isKidsMode ? "My Fun Day" : "Your Schedule"}</span>
              </div>
              
              {plan && (
                <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-1">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn("px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1.5", viewMode === 'list' ? "bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white" : "text-slate-500")}
                  >
                    <List className="w-3 h-3" />
                    List
                  </button>
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={cn("px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1.5", viewMode === 'calendar' ? "bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white" : "text-slate-500")}
                  >
                    <CalendarDays className="w-3 h-3" />
                    Calendar
                  </button>
                </div>
              )}
            </div>

            {plan && (
              <button
                onClick={summarizePlan}
                disabled={isSummarizing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300"
              >
                {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                <span className="hidden sm:inline">Summarize</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {viewMode === 'list' ? (
              <>
                {summary && (
                  <div className={cn("mb-6 p-4 rounded-2xl border", isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30" : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30")}>
                    <h4 className={cn("font-semibold mb-2 flex items-center gap-2", isKidsMode ? "text-amber-900 dark:text-amber-100" : "text-indigo-900 dark:text-indigo-300")}>
                      <Sparkles className="w-4 h-4" />
                      Key Takeaways
                    </h4>
                    <div className={cn("prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed", isKidsMode ? "prose-amber" : "prose-indigo")}>
                      <Markdown>{summary}</Markdown>
                    </div>
                  </div>
                )}
                {plan ? (
                  <div className={cn("markdown-body prose dark:prose-invert max-w-none prose-headings:font-semibold", isKidsMode ? "prose-amber" : "prose-slate")}>
                    <Markdown>{plan}</Markdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <Calendar className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm md:text-base">
                      {isKidsMode ? "Fill out the form to plan your day!" : "Fill out the form to generate your study plan."}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-black/5 dark:bg-white/10 rounded-xl overflow-hidden border border-black/5 dark:border-white/10">
                  {DAYS.map(day => (
                    <div key={day} className="bg-slate-50 dark:bg-black/40 p-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                  {monthDays.map((day, idx) => {
                    const isToday = day && day.toDateString() === new Date().toDateString();
                    const dayReminders = day ? reminders.filter(r => new Date(r.time).toDateString() === day.toDateString()) : [];
                    
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "min-h-[80px] md:min-h-[120px] p-1 md:p-2 bg-white dark:bg-[#1C1C1E] transition-colors",
                          !day && "bg-slate-50/50 dark:bg-black/20"
                        )}
                      >
                        {day && (
                          <>
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn(
                                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                isToday ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400"
                              )}>
                                {day.getDate()}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {dayReminders.map(r => (
                                <div key={r.id} className={cn("px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium truncate", isKidsMode ? "bg-amber-100 text-amber-700" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300")}>
                                  {new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {r.title}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
