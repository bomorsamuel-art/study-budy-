import { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  ClipboardList, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRight, 
  Star,
  Zap,
  Check,
  AlertCircle,
  Trophy,
  History,
  Brain,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import VoiceInputButton from './VoiceInputButton';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  question: string;
  type: 'mcq' | 'tf' | 'short';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizViewProps {
  isKidsMode?: boolean;
}

import { useAppContext } from '../contexts/AppContext';

export default function QuizView({ isKidsMode }: QuizViewProps) {
  const { studyMaterial } = useAppContext();
  const [topic, setTopic] = useState(studyMaterial || '');
  const [quizType, setQuizType] = useState<'short' | 'mock'>('short');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['mcq', 'tf', 'short']);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shortAnswerValue, setShortAnswerValue] = useState('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setShortAnswerValue('');
    setIsAnswerSubmitted(false);

    const numQuestions = isKidsMode ? 3 : (quizType === 'short' ? 5 : 15);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const typesStr = isKidsMode ? 'multiple choice' : selectedQuestionTypes.map(t => {
        if (t === 'mcq') return 'multiple-choice';
        if (t === 'tf') return 'true/false';
        if (t === 'short') return 'short-answer';
        return t;
      }).join(', ');

      const prompt = isKidsMode 
        ? `Generate a fun, super easy ${numQuestions}-question multiple choice game for a 3-6 year old child about: ${topic}. 
           Make the questions very simple, use emojis in the questions and options. The explanation should be encouraging and simple.`
        : `Generate a ${numQuestions}-question quiz about: ${topic}. 
           The difficulty level should be ${difficulty.toUpperCase()}.
           Include these question types: ${typesStr}.
           For short-answer questions, ensure the answer is concise (1-5 words).
           For true/false, include ["True", "False"] in options.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['mcq', 'tf', 'short'] },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }, 
                  description: "Exactly 4 options for mcq, 2 for tf (True/False), null for short" 
                },
                correctAnswer: { type: Type.STRING, description: "Answer for grading" },
                explanation: { type: Type.STRING, description: "Brief explanation" }
              },
              required: ["question", "type", "correctAnswer", "explanation"]
            }
          }
        }
      });
      
      if (response.text) {
        const parsed = JSON.parse(response.text);
        setQuestions(parsed);
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      alert("Failed to generate quiz. Try a simpler topic or fewer question types.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (option: string) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(option);
  };

  const checkShortAnswer = (user: string, correct: string) => {
    const cleanUser = user.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    const cleanCorrect = correct.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    
    // Simple substring match or exact match for short answers
    return cleanUser === cleanCorrect || cleanCorrect.includes(cleanUser) && cleanUser.length > 2;
  };

  const handleSubmitAnswer = () => {
    const currentQ = questions[currentIndex];
    let isCorrect = false;

    if (currentQ.type === 'short') {
      if (!shortAnswerValue.trim()) return;
      isCorrect = checkShortAnswer(shortAnswerValue, currentQ.correctAnswer);
    } else {
      if (!selectedAnswer) return;
      isCorrect = selectedAnswer === currentQ.correctAnswer;
    }
    
    setIsAnswerSubmitted(true);
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShortAnswerValue('');
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-8 h-full flex flex-col items-center justify-center">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", isKidsMode ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400")}>
          {isKidsMode ? <Star className="w-8 h-8" /> : <ClipboardList className="w-8 h-8" />}
        </div>
        <h2 className="text-4xl font-bold tracking-tight mb-2 text-slate-900 dark:text-slate-100">
          {isKidsMode ? "Fun Quiz Game! 🌟" : "AI Quizzes & Exams"}
        </h2>
        <p className="mb-8 text-center max-w-md text-lg text-slate-500 dark:text-slate-400">
          {isKidsMode ? "Let's play a guessing game! What do you want to play about?" : "Test your knowledge on any topic. The AI will generate a custom quiz or mock exam for you."}
        </p>

        <div className={cn("w-full p-8 apple-card", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
          <div className="mb-6">
            <label className={cn("block text-sm font-medium mb-2", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-300")}>
              {isKidsMode ? "What should we play?" : "Topic or Subject"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={isKidsMode ? "e.g., Animals, Colors, Shapes" : "e.g., Cellular Respiration, World War II, Python Basics"}
                className={cn("w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 transition-all text-lg", isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 focus:ring-amber-500/20 focus:border-amber-500 text-amber-900 dark:text-amber-100" : "bg-transparent border-black/10 dark:border-white/10 focus:ring-black/20 dark:focus:ring-white/20")}
              />
              <VoiceInputButton 
                onResult={(text) => setTopic(prev => prev ? `${prev} ${text}` : text)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>

          {!isKidsMode && (
            <>
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Quiz Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setQuizType('short')}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      quizType === 'short' ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Quick Quiz</div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">5 questions for a fast check.</div>
                  </button>
                  <button
                    onClick={() => setQuizType('mock')}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      quizType === 'mock' ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-indigo-500" />
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Full Exam</div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">15 questions for mastery.</div>
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Question Mix</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'mcq', label: 'Multiple Choice' },
                    { id: 'tf', label: 'True / False' },
                    { id: 'short', label: 'Short Answer' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedQuestionTypes(prev => 
                          prev.includes(type.id) 
                            ? prev.filter(t => t !== type.id)
                            : [...prev, type.id]
                        );
                      }}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all",
                        selectedQuestionTypes.includes(type.id)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                {selectedQuestionTypes.length === 0 && (
                  <p className="text-xs text-rose-500 mt-2 font-medium">Please select at least one type.</p>
                )}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-4">
                  <button onClick={() => setDifficulty('easy')} className={cn("p-3 rounded-xl border-2 text-center transition-all font-medium", difficulty === 'easy' ? "border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-600 dark:text-slate-400")}>Easy</button>
                  <button onClick={() => setDifficulty('medium')} className={cn("p-3 rounded-xl border-2 text-center transition-all font-medium", difficulty === 'medium' ? "border-amber-500 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-600 dark:text-slate-400")}>Medium</button>
                  <button onClick={() => setDifficulty('hard')} className={cn("p-3 rounded-xl border-2 text-center transition-all font-medium", difficulty === 'hard' ? "border-rose-500 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300" : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-600 dark:text-slate-400")}>Hard</button>
                </div>
              </div>
            </>
          )}

          <button
            onClick={generateQuiz}
            disabled={isGenerating || !topic.trim() || (!isKidsMode && selectedQuestionTypes.length === 0)}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-4 text-white rounded-xl font-semibold transition-colors disabled:opacity-50",
              isKidsMode ? "bg-amber-500 hover:bg-amber-600" : "bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
            )}
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : (isKidsMode ? <Star className="w-5 h-5" /> : <Brain className="w-5 h-5" />)}
            {isGenerating ? (isKidsMode ? 'Making Game...' : 'Generating Quiz...') : (isKidsMode ? 'Start Game!' : 'Generate AI Quiz')}
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto p-8 h-full flex flex-col items-center justify-center text-center">
        <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mb-6", isKidsMode ? "bg-amber-100 dark:bg-amber-900/30" : "bg-indigo-100 dark:bg-indigo-900/30")}>
          <span className={cn("text-4xl font-bold", isKidsMode ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400")}>
            {isKidsMode ? (score === questions.length ? "🌟" : "👍") : `${percentage}%`}
          </span>
        </div>
        <h2 className="text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
          {isKidsMode ? "All Done! 🎉" : "Quiz Complete!"}
        </h2>
        <p className="mb-8 text-lg text-slate-500 dark:text-slate-400">
          {isKidsMode ? `You got ${score} out of ${questions.length} stars!` : `You scored ${score} out of ${questions.length} on "${topic}".`}
        </p>
        <button
          onClick={() => setQuestions([])}
          className={cn(
            "flex items-center gap-2 px-6 py-3 text-white rounded-xl font-medium transition-colors",
            isKidsMode ? "bg-amber-500 hover:bg-amber-600" : "bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          {isKidsMode ? "Play Again!" : "Take Another Quiz"}
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto p-8 h-full flex flex-col">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {isKidsMode ? `Game: ${topic}` : `Quiz: ${topic}`}
        </h2>
        <div className={cn("text-sm font-medium px-3 py-1 rounded-full", isKidsMode ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : "bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300")}>
          {isKidsMode ? `Star ${currentIndex + 1} of ${questions.length}` : `Question ${currentIndex + 1} of ${questions.length}`}
        </div>
      </div>

      <div className="flex-1">
        <div className={cn("p-8 apple-card mb-6", isKidsMode && "border-amber-200 dark:border-amber-900/30")}>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
              {currentQ.type === 'mcq' ? 'Multiple Choice' : currentQ.type === 'tf' ? 'True / False' : 'Short Answer'}
            </span>
          </div>
          <h3 className="text-2xl font-medium mb-8 leading-snug text-slate-900 dark:text-slate-100">
            {currentQ.question}
          </h3>

          {currentQ.type !== 'short' ? (
            <div className="space-y-3">
              {currentQ.options?.map((option, idx) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQ.correctAnswer;
                
                let optionClass = isKidsMode ? "border-amber-200 dark:border-amber-900/30 hover:border-amber-400 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5";
                if (isSelected && !isAnswerSubmitted) {
                  optionClass = isKidsMode ? "border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100" : "border-black dark:border-white bg-black/5 dark:bg-white/10 text-slate-900 dark:text-slate-100";
                } else if (isAnswerSubmitted) {
                  if (isCorrect) {
                    optionClass = "border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100";
                  } else if (isSelected && !isCorrect) {
                    optionClass = "border-rose-500 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100";
                  } else {
                    optionClass = "border-black/5 dark:border-white/5 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(option)}
                    disabled={isAnswerSubmitted}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between",
                      optionClass
                    )}
                  >
                    <span className={cn("text-lg", isKidsMode && "font-medium")}>{option}</span>
                    {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {isAnswerSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-500" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text"
                  value={shortAnswerValue}
                  onChange={(e) => setShortAnswerValue(e.target.value)}
                  disabled={isAnswerSubmitted}
                  placeholder="Type your answer here..."
                  className={cn(
                    "w-full px-5 py-4 rounded-2xl border-2 bg-transparent text-lg focus:outline-none transition-all",
                    isAnswerSubmitted 
                      ? checkShortAnswer(shortAnswerValue, currentQ.correctAnswer)
                        ? "border-emerald-500 text-emerald-900 dark:text-emerald-100 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-rose-500 text-rose-900 dark:text-rose-100 bg-rose-50 dark:bg-rose-900/20"
                      : "border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white"
                  )}
                />
                {!isAnswerSubmitted && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <VoiceInputButton 
                      onResult={(text) => setShortAnswerValue(text)}
                      className="p-2 h-auto"
                    />
                  </div>
                )}
              </div>
              {isAnswerSubmitted && !checkShortAnswer(shortAnswerValue, currentQ.correctAnswer) && (
                <div className="text-sm font-bold text-rose-500 flex items-center gap-2 bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle className="w-4 h-4" />
                  Correct answer: {currentQ.correctAnswer}
                </div>
              )}
              {isAnswerSubmitted && checkShortAnswer(shortAnswerValue, currentQ.correctAnswer) && (
                <div className="text-sm font-bold text-emerald-500 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <Check className="w-4 h-4" />
                  Spot on! Correct.
                </div>
              )}
            </div>
          )}
        </div>

        {isAnswerSubmitted && (
          <div className={cn("p-6 rounded-2xl border mb-6 animate-in fade-in slide-in-from-bottom-4", isKidsMode ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30" : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30")}>
            <h4 className={cn("font-semibold mb-2", isKidsMode ? "text-amber-900 dark:text-amber-100" : "text-indigo-900 dark:text-indigo-300")}>
              {isKidsMode ? "Did you know?" : "Explanation"}
            </h4>
            <p className={cn("leading-relaxed", isKidsMode ? "text-amber-800 dark:text-amber-200" : "text-indigo-800/80 dark:text-indigo-300/80")}>{currentQ.explanation}</p>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-black/5 dark:border-white/10 flex justify-end">
        {!isAnswerSubmitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={currentQ.type === 'short' ? !shortAnswerValue.trim() : !selectedAnswer}
            className={cn(
              "px-8 py-3 text-white rounded-xl font-medium transition-colors disabled:opacity-50",
              isKidsMode ? "bg-amber-500 hover:bg-amber-600" : "bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
            )}
          >
            {isKidsMode ? "Check Answer!" : "Submit Answer"}
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className={cn(
              "flex items-center gap-2 px-8 py-3 text-white rounded-xl font-medium transition-colors",
              isKidsMode ? "bg-amber-600 hover:bg-amber-700" : "bg-black dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
            )}
          >
            {currentIndex < questions.length - 1 ? (isKidsMode ? 'Next One!' : 'Next Question') : (isKidsMode ? 'See Stars!' : 'View Results')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
