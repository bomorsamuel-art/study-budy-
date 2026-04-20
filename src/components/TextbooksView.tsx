import { useState } from 'react';
import { Book, Library, Play, Sparkles, Star, Heart, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import VoiceInputButton from './VoiceInputButton';

interface TextbooksViewProps {
  onSelectTextbook: (title: string, description: string) => void;
  isKidsMode?: boolean;
}

const TEXTBOOKS = [
  {
    category: "University Textbooks",
    items: [
      { id: 'uni-calc', title: 'Calculus: Early Transcendentals', author: 'James Stewart', desc: 'A comprehensive and rigorous introduction to calculus.' },
      { id: 'uni-bio', title: 'Campbell Biology', author: 'Urry, Cain, Wasserman', desc: 'The definitive college-level biology textbook.' },
      { id: 'uni-algo', title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', desc: 'The standard textbook on algorithms and data structures.' }
    ]
  },
  {
    category: "High School Textbooks",
    items: [
      { id: 'hs-physics', title: 'Conceptual Physics', author: 'Paul G. Hewitt', desc: 'Engaging introduction to physics principles without heavy math.' },
      { id: 'hs-history', title: 'The American Pageant', author: 'David M. Kennedy', desc: 'A comprehensive history of the American republic.' },
      { id: 'hs-lit', title: 'The Norton Anthology of American Literature', author: 'Robert S. Levine', desc: 'Essential collection of American literary works.' }
    ]
  },
  {
    category: "Middle School Textbooks",
    items: [
      { id: 'ms-math', title: 'Math in Focus: Singapore Math', author: 'Marshall Cavendish', desc: 'Problem-solving focused middle school mathematics.' },
      { id: 'ms-science', title: 'Interactive Science', author: 'Don Buckley', desc: 'Hands-on approach to earth, life, and physical sciences.' },
      { id: 'ms-history', title: 'History Alive! The Ancient World', author: 'Wendy Frey', desc: 'Immersive journey through ancient civilizations.' }
    ]
  },
  {
    category: "Elementary School Textbooks",
    items: [
      { id: 'elem-reading', title: 'Journeys: Common Core', author: 'Houghton Mifflin Harcourt', desc: 'Foundational reading and language arts program.' },
      { id: 'elem-math', title: 'Go Math!', author: 'Houghton Mifflin Harcourt', desc: 'Interactive and engaging elementary mathematics.' },
      { id: 'elem-science', title: 'Science Fusion', author: 'Marjorie Frank', desc: 'Inquiry-based science curriculum for young learners.' }
    ]
  }
];

const KIDS_BOOKS = [
  {
    category: "Story Time",
    items: [
      { id: 'bear', title: 'The Sleepy Bear', author: 'Mr. Owl', desc: 'A story about a bear looking for a place to nap.' },
      { id: 'moon', title: 'Goodnight Moon', author: 'Margaret Wise Brown', desc: 'Saying goodnight to everything in the room.' },
      { id: 'caterpillar', title: 'The Hungry Caterpillar', author: 'Eric Carle', desc: 'A little caterpillar eats a lot of food!' }
    ]
  },
  {
    category: "Learning Books",
    items: [
      { id: 'abc', title: 'My First ABCs', author: 'Teacher Jane', desc: 'Learn the alphabet with fun pictures.' },
      { id: '123', title: 'Counting 1, 2, 3', author: 'Teacher John', desc: 'Count the animals and toys.' },
      { id: 'colors', title: 'Colors Everywhere', author: 'Artist Bob', desc: 'Discover all the colors in the world.' }
    ]
  }
];

export default function TextbooksView({ onSelectTextbook, isKidsMode }: TextbooksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const displayBooks = isKidsMode ? KIDS_BOOKS : TEXTBOOKS;

  const filteredBooks = displayBooks.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto p-8 h-full overflow-y-auto">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-100">
          {isKidsMode ? "Magical Storybooks! 📚" : "Global Library"}
        </h2>
        <p className="text-lg mb-8 text-slate-500 dark:text-slate-400">
          {isKidsMode ? "Search for a story or pick one from the shelf!" : "Search for any textbook in the world, or browse our collection."}
        </p>
        
        <div className="relative max-w-xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className={cn("h-5 w-5", isKidsMode ? "text-amber-400" : "text-slate-400 dark:text-slate-500")} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "block w-full pl-11 pr-12 py-4 rounded-2xl border-2 outline-none transition-all text-lg shadow-sm",
              isKidsMode 
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/40 placeholder:text-amber-300 dark:placeholder:text-amber-700 text-amber-900 dark:text-amber-100" 
                : "bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-sm border-black/10 dark:border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
            )}
            placeholder={isKidsMode ? "Search for bears, moons, colors..." : "Search for 'Biology', 'History', 'Calculus'..."}
          />
          <VoiceInputButton 
            onResult={(text) => setSearchQuery(prev => prev ? `${prev} ${text}` : text)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          />
        </div>
      </div>

      {searchQuery && filteredBooks.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "max-w-2xl mx-auto p-8 rounded-3xl border-2 text-center cursor-pointer transition-all hover:scale-[1.02]",
            isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 hover:shadow-xl hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50" : "bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-purple-50 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 hover:shadow-xl hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50"
          )}
          onClick={() => onSelectTextbook(searchQuery, "Custom AI-generated book based on your search.")}
        >
          <div className={cn("w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4", isKidsMode ? "bg-amber-200 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400")}>
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className={cn("text-2xl font-bold mb-2", isKidsMode ? "text-amber-900 dark:text-amber-100" : "text-indigo-900 dark:text-indigo-100")}>
            {isKidsMode ? `Read a story about "${searchQuery}"!` : `Generate Textbook: "${searchQuery}"`}
          </h3>
          <p className={cn("text-lg", isKidsMode ? "text-amber-700 dark:text-amber-300" : "text-indigo-700/80 dark:text-indigo-300/80")}>
            {isKidsMode ? "Click here to create a brand new story!" : "Click to have your AI Tutor instantly generate a comprehensive textbook and start reading."}
          </p>
        </motion.div>
      )}

      <div className="space-y-12">
        {filteredBooks.map((section) => (
          <div key={section.category}>
            <h3 className={cn("text-2xl font-bold mb-6", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-800 dark:text-slate-200")}>
              {section.category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.items.map((book) => (
                <motion.div 
                  whileHover={{ y: -4 }}
                  key={book.id}
                  className={cn(
                    "group apple-card p-6 transition-all cursor-pointer flex flex-col h-full hover:shadow-xl",
                    isKidsMode ? "border-amber-200 dark:border-amber-900/30 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50" : "hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-indigo-100 dark:hover:shadow-indigo-900/20"
                  )}
                  onClick={() => onSelectTextbook(book.title, book.desc)}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300",
                    isKidsMode ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  )}>
                    {isKidsMode ? <Star className="w-7 h-7" /> : <Book className="w-7 h-7" />}
                  </div>
                  <h4 className={cn("text-xl font-bold mb-1", isKidsMode ? "text-amber-900 dark:text-amber-100" : "text-slate-900 dark:text-slate-100")}>
                    {book.title}
                  </h4>
                  <p className={cn("text-sm font-medium mb-3", isKidsMode ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500")}>
                    By {book.author}
                  </p>
                  <p className={cn("text-base flex-1 leading-relaxed", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-500 dark:text-slate-400")}>
                    {book.desc}
                  </p>
                  
                  <div className={cn(
                    "mt-6 pt-4 border-t flex items-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    isKidsMode ? "border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400" : "border-black/5 dark:border-white/10 text-indigo-600 dark:text-indigo-400"
                  )}>
                    {isKidsMode ? <Sparkles className="w-4 h-4 mr-1.5" /> : <Library className="w-4 h-4 mr-1.5" />}
                    {isKidsMode ? "Read Book" : "Open Textbook"}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
