import { useState } from 'react';
import { Code, Palette, Calculator, FlaskConical, Music, Globe, Book, Landmark, Play, Rocket, Star, Heart, Smile, Search, Sparkles, Languages } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import VoiceInputButton from './VoiceInputButton';

interface CoursesViewProps {
  onSelectCourse: (courseName: string, description: string) => void;
  isKidsMode?: boolean;
}

const COURSES = [
  {
    category: "Language Learning",
    items: [
      { id: 'lang-spanish', title: 'Spanish for Beginners', icon: Languages, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Learn conversational Spanish, grammar, and vocabulary.' },
      { id: 'lang-french', title: 'French Fundamentals', icon: Languages, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Master basic French communication and culture.' },
      { id: 'lang-japanese', title: 'Japanese N5', icon: Languages, color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Hiragana, Katakana, and basic Kanji for everyday use.' }
    ]
  },
  {
    category: "University Courses",
    items: [
      { id: 'uni-cs', title: 'Computer Science 101', icon: Code, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Data structures, algorithms, and software engineering.' },
      { id: 'uni-physics', title: 'Quantum Mechanics', icon: FlaskConical, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'Advanced physics, wave functions, and quantum states.' },
      { id: 'uni-med', title: 'Human Anatomy & Physiology', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Comprehensive study of the human body systems.' }
    ]
  },
  {
    category: "High School Courses",
    items: [
      { id: 'hs-ap-calc', title: 'AP Calculus AB/BC', icon: Calculator, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Limits, derivatives, integrals, and series.' },
      { id: 'hs-world-hist', title: 'AP World History', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Global historical developments and processes.' },
      { id: 'hs-lit', title: 'English Literature', icon: Book, color: 'text-purple-500', bg: 'bg-purple-50', desc: 'Analyzing classic and modern literary works.' }
    ]
  },
  {
    category: "Middle School Courses",
    items: [
      { id: 'ms-pre-alg', title: 'Pre-Algebra', icon: Calculator, color: 'text-cyan-500', bg: 'bg-cyan-50', desc: 'Fractions, decimals, basic equations, and geometry.' },
      { id: 'ms-earth-sci', title: 'Earth Science', icon: Globe, color: 'text-teal-500', bg: 'bg-teal-50', desc: 'Geology, meteorology, and the solar system.' },
      { id: 'ms-creative-write', title: 'Creative Writing', icon: Palette, color: 'text-pink-500', bg: 'bg-pink-50', desc: 'Developing storytelling and writing skills.' }
    ]
  },
  {
    category: "Elementary School Courses",
    items: [
      { id: 'elem-math', title: 'Basic Math', icon: Calculator, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Addition, subtraction, multiplication, and division.' },
      { id: 'elem-reading', title: 'Reading Comprehension', icon: Book, color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Understanding stories and building vocabulary.' },
      { id: 'elem-science', title: 'Discovering Science', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Fun experiments and learning about nature.' }
    ]
  }
];

const KIDS_COURSES = [
  {
    category: "Languages & Words",
    items: [
      { id: 'kids-spanish', title: 'Hola! Basic Spanish', icon: Languages, color: 'text-orange-500', bg: 'bg-orange-100', desc: 'Learn to say hello, colors, and numbers in Spanish!' },
      { id: 'kids-french', title: 'Bonjour! Basic French', icon: Languages, color: 'text-blue-500', bg: 'bg-blue-100', desc: 'Fun French words and songs.' },
    ]
  },
  {
    category: "Fun with Numbers & Shapes",
    items: [
      { id: 'counting', title: 'Counting 1 to 10', icon: Star, color: 'text-amber-500', bg: 'bg-amber-100', desc: 'Let\'s count apples, stars, and puppies!' },
      { id: 'shapes', title: 'Magic Shapes', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-100', desc: 'Find circles, squares, and triangles everywhere.' },
    ]
  },
  {
    category: "Colors & Art",
    items: [
      { id: 'colors', title: 'Rainbow Colors', icon: Palette, color: 'text-purple-500', bg: 'bg-purple-100', desc: 'Learn all the colors of the rainbow.' },
      { id: 'drawing', title: 'Let\'s Draw', icon: Smile, color: 'text-blue-500', bg: 'bg-blue-100', desc: 'Draw happy faces and funny animals.' },
    ]
  },
  {
    category: "Our World",
    items: [
      { id: 'animals', title: 'Animal Friends', icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-100', desc: 'Learn about dogs, cats, lions, and bears!' },
      { id: 'space', title: 'Space Adventure', icon: Rocket, color: 'text-indigo-500', bg: 'bg-indigo-100', desc: 'Zoom to the moon and stars.' },
    ]
  }
];

export default function CoursesView({ onSelectCourse, isKidsMode }: CoursesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const displayCourses = isKidsMode ? KIDS_COURSES : COURSES;

  const filteredCourses = displayCourses.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto p-8 h-full overflow-y-auto">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-100">
          {isKidsMode ? "Fun Learning Adventures! 🚀" : "Explore Any Course"}
        </h2>
        <p className="text-lg mb-8 text-slate-500 dark:text-slate-400">
          {isKidsMode ? "Pick an adventure or search for something fun!" : "Search for any subject in the world, or choose from our curated list."}
        </p>
        
        <div className="relative max-w-xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "block w-full pl-11 pr-12 py-4 rounded-2xl border-2 outline-none transition-all text-lg shadow-sm",
              isKidsMode 
                ? "bg-white dark:bg-[#2C2C2E] border-amber-200 dark:border-amber-900/30 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 placeholder:text-amber-300 text-amber-900 dark:text-amber-100" 
                : "bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-sm border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 dark:text-slate-200"
            )}
            placeholder={isKidsMode ? "Search for dinosaurs, space, colors..." : "Search for 'Organic Chemistry', 'Machine Learning'..."}
          />
          <VoiceInputButton 
            onResult={(text) => setSearchQuery(prev => prev ? `${prev} ${text}` : text)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          />
        </div>
      </div>

      {searchQuery && filteredCourses.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "max-w-2xl mx-auto p-8 rounded-3xl border-2 text-center cursor-pointer transition-all hover:scale-[1.02]",
            isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 hover:shadow-xl hover:shadow-amber-200/50" : "bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-purple-50 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 hover:shadow-xl hover:shadow-indigo-200/50"
          )}
          onClick={() => onSelectCourse(searchQuery, "Custom AI-generated course based on your search.")}
        >
          <div className={cn("w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4", isKidsMode ? "bg-amber-200 dark:bg-amber-800 text-amber-600 dark:text-amber-200" : "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300")}>
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className={cn("text-2xl font-bold mb-2", isKidsMode ? "text-amber-900 dark:text-amber-100" : "text-indigo-900 dark:text-indigo-100")}>
            {isKidsMode ? `Learn about "${searchQuery}"!` : `Generate Course: "${searchQuery}"`}
          </h3>
          <p className={cn("text-lg", isKidsMode ? "text-amber-700 dark:text-amber-300" : "text-indigo-700/80 dark:text-indigo-300/80")}>
            {isKidsMode ? "Click here to start a magical new adventure!" : "Click to have your AI Tutor instantly generate a comprehensive syllabus and start teaching you."}
          </p>
        </motion.div>
      )}

      <div className="space-y-12">
        {filteredCourses.map((section) => (
          <div key={section.category}>
            <h3 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">
              {section.category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.items.map((course) => {
                const Icon = course.icon;
                return (
                  <motion.div 
                    whileHover={{ y: -4 }}
                    key={course.id}
                    className={cn(
                      "group rounded-3xl border p-6 transition-all cursor-pointer flex flex-col h-full shadow-sm hover:shadow-xl",
                      isKidsMode ? "bg-white dark:bg-[#2C2C2E] border-amber-200 dark:border-amber-900/30 hover:border-amber-400 hover:shadow-amber-200/50" : "apple-card hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-indigo-100 dark:hover:shadow-indigo-900/20"
                    )}
                    onClick={() => onSelectCourse(course.title, course.desc)}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${course.bg} dark:bg-opacity-20 ${course.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                      {course.title}
                    </h4>
                    <p className="text-base flex-1 leading-relaxed text-slate-500 dark:text-slate-400">
                      {course.desc}
                    </p>
                    
                    <div className={cn(
                      "mt-6 pt-4 border-t flex items-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      isKidsMode ? "border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400" : "border-black/5 dark:border-white/10 text-indigo-600 dark:text-indigo-400"
                    )}>
                      <Play className="w-4 h-4 mr-1.5" />
                      {isKidsMode ? "Let's Go!" : "Start Learning"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
