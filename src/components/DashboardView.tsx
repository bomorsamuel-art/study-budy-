import { useState, useEffect } from 'react';
import { Trophy, Flame, Target, TrendingUp, BookOpen, AlertCircle, ArrowRight, Sparkles, Globe, Clock, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

export default function DashboardView() {
  const [news, setNews] = useState<any[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  // In a real app, this data would come from Firebase/Firestore based on user activity
  const stats = {
    streak: 5,
    quizzesTaken: 12,
    averageScore: 78,
    hoursStudied: 24,
  };

  const weakAreas = [
    { subject: 'Mathematics', topic: 'Calculus (Integration)', score: 45 },
    { subject: 'Physics', topic: 'Electromagnetism', score: 52 },
  ];

  const recentActivity = [
    { type: 'quiz', title: 'WAEC Biology Mock', score: 85, date: 'Today' },
    { type: 'notes', title: 'Summarized: Organic Chemistry', date: 'Yesterday' },
    { type: 'chat', title: 'Tutor Session: Newton\'s Laws', date: '2 days ago' },
  ];

  useEffect(() => {
    const fetchTopNews = async () => {
      setIsNewsLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Fetch the top 3 most important global news headlines right now. 
        Return ONLY a JSON array of objects with "title", "source", and "time". 
        No markdown, just raw JSON.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] }
        });

        let text = response.text || "[]";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        setNews(JSON.parse(text));
      } catch (error) {
        console.error("Dashboard news fetch failed:", error);
      } finally {
        setIsNewsLoading(false);
      }
    };

    fetchTopNews();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 h-full overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
          Your Study Dashboard 📊
        </h2>
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium">
          Track your progress, fix your weak areas, and keep your streak alive!
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Daily Streak', value: `${stats.streak} Days`, icon: Flame, color: 'orange' },
          { label: 'Quizzes Taken', value: stats.quizzesTaken, icon: Target, color: 'indigo' },
          { label: 'Avg. Score', value: `${stats.averageScore}%`, icon: TrendingUp, color: 'emerald' },
          { label: 'Hours Studied', value: `${stats.hoursStudied}h`, icon: BookOpen, color: 'blue' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="apple-card p-6 flex items-center gap-5 hover:scale-[1.02] transition-transform cursor-default"
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
              stat.color === 'orange' ? "bg-orange-50 dark:bg-orange-500/10 text-orange-500" :
              stat.color === 'indigo' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500" :
              stat.color === 'emerald' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" :
              "bg-blue-50 dark:bg-blue-500/10 text-blue-500"
            )}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        {/* Global News Ticker */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2 apple-card overflow-hidden bg-indigo-600 text-white p-6 flex flex-col md:flex-row items-center gap-6 relative"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Globe className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Globe className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Global Intel</h3>
              <p className="text-[10px] uppercase tracking-widest font-black text-indigo-200">Real-time Briefing</p>
            </div>
          </div>
          
          <div className="flex-1 w-full overflow-hidden">
            <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
              {isNewsLoading ? (
                <div className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                  <Clock className="w-4 h-4 animate-spin" />
                  Updating global frequencies...
                </div>
              ) : (
                news.map((item, idx) => (
                  <div key={idx} className="shrink-0 max-w-[300px] space-y-1">
                    <p className="text-sm font-bold line-clamp-1">{item.title}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button className="shrink-0 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold transition-all flex items-center gap-2">
            Full Report <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>

        {/* Weak Area Fixer */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="apple-card overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-rose-50/30 dark:bg-rose-900/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Weak Area Fixer</h3>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full uppercase tracking-widest">
              AI Detected
            </span>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-5">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Based on your recent performance, the AI suggests focusing on these topics:
            </p>
            {weakAreas.map((area, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 group hover:bg-white dark:hover:bg-white/5 transition-all">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{area.topic}</p>
                  <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{area.subject} • Avg Score: {area.score}%</p>
                </div>
                <button className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-2xl transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                  <Sparkles className="w-4 h-4" />
                  Fix Now
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Daily Challenge & Activity */}
        <div className="flex flex-col gap-10">
          {/* Daily Challenge */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] shadow-xl p-8 text-white relative overflow-hidden group"
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Trophy className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                <Trophy className="w-6 h-6 text-yellow-300" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Daily Challenge</h3>
              <p className="text-indigo-100 mb-8 text-lg font-medium leading-relaxed max-w-[85%]">
                Complete a JAMB Mathematics mock exam and score above 70% to earn 50 bonus points!
              </p>
              <button className="px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95">
                Start Challenge <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="apple-card p-8 flex-1"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-5 group">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                    activity.type === 'quiz' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                    activity.type === 'notes' ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" :
                    "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                  )}>
                    {activity.type === 'quiz' ? <Target className="w-6 h-6" /> :
                     activity.type === 'notes' ? <BookOpen className="w-6 h-6" /> :
                     <Sparkles className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">{activity.title}</p>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{activity.date}</p>
                  </div>
                  {activity.score && (
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {activity.score}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
