import React, { createContext, useContext, ReactNode } from 'react';

export type View = 'notes' | 'flashcards' | 'chat' | 'live' | 'plan' | 'concepts' | 'courses' | 'quiz' | 'textbooks' | 'whatsapp' | 'reader' | 'drawing' | 'image-gen' | 'game-gen' | 'dashboard' | 'exam' | 'past-questions' | 'pricing' | 'video-class' | 'teacher-dashboard' | 'video-gen' | 'news';

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  isKidsMode: boolean;
  setIsKidsMode: (enabled: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (enabled: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  studyMaterial: string;
  setStudyMaterial: (material: string) => void;
  aiName: string;
  setAiName: (name: string) => void;
  aiVoice: 'male' | 'female';
  setAiVoice: (voice: 'male' | 'female') => void;
  isWakeWordEnabled: boolean;
  setIsWakeWordEnabled: (enabled: boolean) => void;
  pendingStudyItems: { title: string, time: string }[];
  setPendingStudyItems: (items: { title: string, time: string }[]) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isPro: boolean;
  setIsPro: (isPro: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, value }: { children: ReactNode, value: AppContextType }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
