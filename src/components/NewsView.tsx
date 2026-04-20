import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Globe, Newspaper, RefreshCw, ExternalLink, Loader2, Search, TrendingUp, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  source: string;
  category: string;
  time: string;
}

export default function NewsView() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState('Global');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const categories = ['Global', 'Technology', 'Science', 'Education', 'Health', 'Business'];

  const fetchNews = async (selectedCategory: string = category, query: string = searchQuery) => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = query.trim() 
        ? `Fetch the absolute latest, real-time, and breaking global news related to the search query: "${query}". 
           Focus on high-impact, verified stories from major international news outlets.`
        : `Fetch the absolute latest, real-time, and breaking global news for the category: "${selectedCategory}". 
           Focus on high-impact, verified stories from major international news outlets.`;
      
      const fullPrompt = `${prompt}
      
      Return ONLY a JSON array of objects. Each object must have:
      - "title": The headline of the news.
      - "summary": A concise 2-sentence summary of the event.
      - "url": A direct link to the news article.
      - "source": The news organization name (e.g., BBC, Reuters, AP).
      - "category": The specific sub-category.
      - "time": How long ago it was published (e.g., "15 minutes ago").
      
      Return exactly 6-8 articles. Do not include markdown formatting like \`\`\`json. Just the raw JSON array.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fullPrompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedNews = JSON.parse(text);
      
      setNews(generatedNews);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            Global News Report
          </h2>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            Real-time updates from across the world.
            {lastUpdated && (
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
                <Clock className="w-3 h-3" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchNews(category, searchQuery)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <button 
            onClick={() => fetchNews()}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { 
              setCategory(cat); 
              setSearchQuery(''); // Clear search when switching categories
              fetchNews(cat, ''); 
            }}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
              category === cat 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-md" 
                : "bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News Grid */}
      {isLoading && news.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Scanning global frequencies...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {news.map((article, idx) => (
              <motion.div
                key={article.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.1 }}
                className="apple-card p-6 flex flex-col h-full group hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                    {article.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.time}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {article.title}
                </h3>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1 line-clamp-3">
                  {article.summary}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5 dark:border-white/5">
                  <span className="text-xs font-bold text-slate-400">{article.source}</span>
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Trending Section */}
      <div className="mt-16 p-8 bg-indigo-600 rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Trending Topics
          </h3>
          <div className="flex flex-wrap gap-3">
            {['AI Regulation', 'Quantum Computing', 'Space Exploration', 'Global Economy', 'Sustainable Energy'].map(topic => (
              <button 
                key={topic}
                onClick={() => { setCategory(topic); fetchNews(topic); }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium transition-all"
              >
                #{topic.replace(' ', '')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
