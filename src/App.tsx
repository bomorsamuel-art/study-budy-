/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BookOpen, FileText, MessageSquare, Sparkles, Calendar, Lightbulb, GraduationCap, ClipboardList, Library, Baby, MessageCircle, LogIn, LogOut, BookText, Palette, Mic, Menu, X, Moon, Sun, Image as ImageIcon, Gamepad2, LayoutDashboard, Timer, FileQuestion, CreditCard, Presentation, School, Video, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import NotesView from './components/NotesView';
import FlashcardsView from './components/FlashcardsView';
import ChatView from './components/ChatView';
import StudyPlanView from './components/StudyPlanView';
import ConceptExplainerView from './components/ConceptExplainerView';
import CoursesView from './components/CoursesView';
import QuizView from './components/QuizView';
import TextbooksView from './components/TextbooksView';
import WhatsAppView from './components/WhatsAppView';
import ReaderView from './components/ReaderView';
import DrawingView from './components/DrawingView';
import LiveTutorView from './components/LiveTutorView';
import ImageGeneratorView from './components/ImageGeneratorView';
import GameGeneratorView from './components/GameGeneratorView';
import DashboardView from './components/DashboardView';
import ExamModeView from './components/ExamModeView';
import PastQuestionsView from './components/PastQuestionsView';
import PricingView from './components/PricingView';
import VideoClassGeneratorView from './components/VideoClassGeneratorView';
import TeacherDashboardView from './components/TeacherDashboardView';
import VeoVideoGeneratorView from './components/VeoVideoGeneratorView';
import NewsView from './components/NewsView';
import LiveAIOverlay from './components/LiveAIOverlay';
import AuthModal from './components/AuthModal';
import Paywall from './components/Paywall';

import { AppProvider, View } from './contexts/AppContext';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [studyMaterial, setStudyMaterial] = useState<string>('');
  const [isKidsMode, setIsKidsMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiName, setAiName] = useState('StudyMind AI');
  const [aiVoice, setAiVoice] = useState<'male' | 'female'>('male');
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [pendingStudyItems, setPendingStudyItems] = useState<{ title: string, time: string }[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const appContextValue = {
    currentView,
    setCurrentView,
    isKidsMode,
    setIsKidsMode,
    isDarkMode,
    setIsDarkMode,
    isSidebarOpen,
    setIsSidebarOpen,
    studyMaterial,
    setStudyMaterial,
    aiName,
    setAiName,
    aiVoice,
    setAiVoice,
    isWakeWordEnabled,
    setIsWakeWordEnabled,
    pendingStudyItems,
    setPendingStudyItems,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isPro,
    setIsPro
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeOnAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Listen for real-time updates to the user document (for subscription state)
        unsubscribeDoc = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setIsPro(!!doc.data().isPro);
          } else {
            // Create user profile if it doesn't exist
            setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || '',
              isOnline: true,
              isPro: false,
              lastSeen: serverTimestamp()
            }).catch(err => console.error("Error creating user profile:", err));
            setIsPro(false);
          }
        }, (err) => {
          console.error("User doc snapshot error:", err);
        });
      } else {
        setIsPro(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOnAuth();
      if (unsubscribeDoc) (unsubscribeDoc as any)();
    };
  }, []);

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'teacher-dashboard', label: 'Teacher Portal', icon: School },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
    { id: 'exam', label: 'WAEC/JAMB Exam Mode', icon: Timer },
    { id: 'past-questions', label: 'Past Questions', icon: FileQuestion },
    { id: 'video-class', label: 'Interactive Lessons', icon: Presentation },
    { id: 'video-gen', label: 'AI Video Studio', icon: Video },
    { id: 'news', label: 'Global News', icon: Globe },
    { id: 'textbooks', label: 'Textbooks', icon: Library },
    { id: 'reader', label: 'Reader', icon: BookText },
    { id: 'notes', label: 'Study Notes', icon: FileText },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
    { id: 'chat', label: 'AI Tutor', icon: MessageSquare },
    { id: 'live', label: 'Live Voice Chat', icon: Mic },
    { id: 'whatsapp', label: 'Messages', icon: MessageCircle },
    { id: 'plan', label: 'Study Plan', icon: Calendar },
    { id: 'concepts', label: 'Concept Explainer', icon: Lightbulb },
    { id: 'quiz', label: 'Quizzes & Exams', icon: ClipboardList },
    { id: 'drawing', label: isKidsMode ? 'Magic Canvas' : 'Drawing Board', icon: Palette },
    { id: 'image-gen', label: 'AI Image Studio', icon: ImageIcon },
    ...(isKidsMode ? [{ id: 'game-gen', label: 'Magic Game Maker', icon: Gamepad2 }] : []),
    { id: 'pricing', label: 'Upgrade to Pro', icon: CreditCard },
  ] as const;

  const handleSelectCourse = (courseName: string, description: string) => {
    setStudyMaterial(`Course: ${courseName}\nDescription: ${description}`);
    setCurrentView('reader');
    setIsSidebarOpen(false);
  };

  const handleSelectTextbook = (title: string, description: string) => {
    setStudyMaterial(`Textbook: ${title}\nDescription: ${description}`);
    setCurrentView('reader');
    setIsSidebarOpen(false);
  };

  return (
    <AppProvider value={appContextValue}>
      <div className={cn(
        "flex h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative p-4 md:p-6", 
        isKidsMode 
          ? "bg-[#fffbeb] dark:bg-[#2d2416] text-amber-900 dark:text-amber-100" 
          : "bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7]"
      )}>
        {/* Background Gradients for depth */}
        {!isKidsMode && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full" />
            <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-500/10 blur-[100px] rounded-full" />
            <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-blue-500/5 dark:bg-blue-500/10 blur-[110px] rounded-full" />
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden absolute top-4 left-4 right-4 h-16 z-40 flex items-center justify-between px-6 floating-dashboard">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", isKidsMode ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-indigo-500 to-purple-600")}>
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">
              {isKidsMode ? "Kids Mode" : "StudyMind"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg text-slate-600 dark:text-slate-300">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg text-slate-600 dark:text-slate-300">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed md:relative inset-y-4 md:inset-y-0 left-4 md:left-0",
          "w-72 md:w-20 lg:w-64",
          "flex flex-col z-50 transition-all duration-300 transform floating-dashboard md:mr-4 lg:mr-6", 
          isSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)] md:translate-x-0",
          isKidsMode ? "bg-amber-50/80 dark:bg-[#3d311e]/80 border-amber-200" : ""
        )}>
          <div className="p-4 lg:p-6 flex items-center justify-between border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0", isKidsMode ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-indigo-500 to-purple-600")}>
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-xl tracking-tight hidden lg:block overflow-hidden whitespace-nowrap">
                {isKidsMode ? "Kids Mode" : "StudyMind"}
              </h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-black/5 dark:hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="flex-1 p-3 lg:p-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  title={item.label}
                  onClick={() => {
                    setCurrentView(item.id as View);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group",
                    isActive 
                      ? (isKidsMode ? "kids-sidebar-item-active" : "sidebar-item-active")
                      : (isKidsMode ? "text-amber-900 dark:text-amber-100 hover:bg-amber-200/50 dark:hover:bg-amber-800/50" : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white")
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 lg:w-4 lg:h-4 shrink-0 transition-transform group-hover:scale-110", 
                    isActive ? (isKidsMode ? "text-white" : "text-white dark:text-black") : (isKidsMode ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500")
                  )} />
                  <span className="hidden lg:block truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 lg:p-4 border-t border-black/5 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between px-3 py-3 lg:py-2.5 bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden">
              <span className="text-sm font-medium hidden lg:block">Dark Mode</span>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 lg:p-1.5 rounded-lg bg-white dark:bg-black shadow-sm text-slate-600 dark:text-slate-300 mx-auto lg:mx-0">
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
            {currentUser ? (
              <div className="flex items-center justify-between px-3 py-3 lg:py-2.5 bg-black/5 dark:bg-white/5 rounded-xl">
                <div className="flex items-center gap-3 overflow-hidden">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center text-xs lg:text-sm font-bold shadow-sm shrink-0">
                      {currentUser.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-semibold truncate hidden lg:block">{currentUser.displayName}</span>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors hidden lg:block" title="Sign Out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 px-3 lg:px-4 py-3 rounded-xl text-sm font-semibold bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#2C2C2E] transition-all shadow-sm"
              >
                <LogIn className="w-5 h-5 lg:w-4 lg:h-4" />
                <span className="hidden lg:block truncate">Sign In</span>
              </button>
            )}
            <button
              onClick={() => setIsKidsMode(!isKidsMode)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 border shadow-sm",
                isKidsMode 
                  ? "bg-white dark:bg-[#1C1C1E] border-amber-400 text-amber-600 dark:text-amber-400" 
                  : "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
              )}
            >
              <Baby className={cn("w-5 h-5", isKidsMode ? "text-amber-500" : "text-indigo-500")} />
              {isKidsMode ? "Exit Kids Mode" : "Kids Mode (3-6 yrs)"}
            </button>
            {isKidsMode && (
              <button
                onClick={() => {
                  alert("To install this app on your device:\n\nOn Mobile (iOS/Android): Tap the Share icon or menu, then select 'Add to Home Screen'.\n\nOn PC (Chrome/Edge): Click the Install icon in the right side of your address bar.");
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 border shadow-sm bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white"
              >
                <Sparkles className="w-5 h-5" />
                Download App
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden bg-transparent pt-20 md:pt-0 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full absolute inset-0 overflow-y-auto floating-dashboard"
            >
              {currentView === 'dashboard' && (
                <DashboardView />
              )}
              {currentView === 'exam' && (
                <Paywall featureName="WAEC & JAMB Exam Mode">
                  <ExamModeView />
                </Paywall>
              )}
              {currentView === 'past-questions' && (
                <Paywall featureName="AI Past Questions">
                  <PastQuestionsView />
                </Paywall>
              )}
              {currentView === 'pricing' && (
                <PricingView />
              )}
              {currentView === 'video-class' && (
                <VideoClassGeneratorView />
              )}
              {currentView === 'video-gen' && (
                <Paywall featureName="AI Video Studio">
                  <VeoVideoGeneratorView />
                </Paywall>
              )}
              {currentView === 'news' && (
                <NewsView />
              )}
              {currentView === 'teacher-dashboard' && (
                <TeacherDashboardView />
              )}
              {currentView === 'notes' && (
                <NotesView material={studyMaterial} setMaterial={setStudyMaterial} isKidsMode={isKidsMode} currentUser={currentUser} />
              )}
              {currentView === 'flashcards' && (
                <FlashcardsView material={studyMaterial} isKidsMode={isKidsMode} currentUser={currentUser} />
              )}
              {currentView === 'chat' && (
                <ChatView material={studyMaterial} isKidsMode={isKidsMode} />
              )}
              {currentView === 'live' && (
                <Paywall featureName="Live AI Voice Tutor">
                  <LiveTutorView isKidsMode={isKidsMode} />
                </Paywall>
              )}
              {currentView === 'whatsapp' && (
                <WhatsAppView />
              )}
              {currentView === 'plan' && (
                <StudyPlanView isKidsMode={isKidsMode} currentUser={currentUser} />
              )}
              {currentView === 'concepts' && (
                <ConceptExplainerView isKidsMode={isKidsMode} />
              )}
              {currentView === 'courses' && (
                <CoursesView onSelectCourse={handleSelectCourse} isKidsMode={isKidsMode} />
              )}
              {currentView === 'textbooks' && (
                <TextbooksView onSelectTextbook={handleSelectTextbook} isKidsMode={isKidsMode} />
              )}
              {currentView === 'quiz' && (
                <QuizView isKidsMode={isKidsMode} />
              )}
              {currentView === 'reader' && (
                <ReaderView material={studyMaterial} isKidsMode={isKidsMode} />
              )}
              {currentView === 'drawing' && (
                <DrawingView isKidsMode={isKidsMode} />
              )}
              {currentView === 'image-gen' && (
                <ImageGeneratorView isKidsMode={isKidsMode} />
              )}
              {currentView === 'game-gen' && (
                <GameGeneratorView isKidsMode={isKidsMode} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Live AI Overlay */}
        <LiveAIOverlay />

        {/* Auth Modal */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />
      </div>
    </AppProvider>
  );
}
