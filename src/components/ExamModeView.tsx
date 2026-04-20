import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Timer, CheckCircle, XCircle, ChevronRight, AlertTriangle, Loader2, RotateCcw, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';

import { useAppContext } from '../contexts/AppContext';

const STORAGE_KEY = 'exam_progress';

export default function ExamModeView() {
  const { studyMaterial } = useAppContext();
  const [examType, setExamType] = useState('WAEC');
  const [subject, setSubject] = useState(studyMaterial || 'Mathematics');
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  const subjects = ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Basic Science', 'Business Studies'];
  const examTypes = ['Junior WAEC (BECE)', 'Senior WAEC (WASSCE)', 'JAMB', 'NECO'];

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHasSavedProgress(true);
    }
  }, []);

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isStarted && !isFinished && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, isFinished, timeLeft]);

  // Save progress effect
  useEffect(() => {
    if (isStarted && !isFinished) {
      const progress = {
        examType,
        subject,
        questions,
        currentQuestionIdx,
        answers,
        timeLeft,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [isStarted, isFinished, questions, currentQuestionIdx, answers, timeLeft, examType, subject]);

  const resumeExam = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        setExamType(progress.examType);
        setSubject(progress.subject);
        setQuestions(progress.questions);
        setCurrentQuestionIdx(progress.currentQuestionIdx);
        setAnswers(progress.answers);
        setTimeLeft(progress.timeLeft);
        setIsStarted(true);
        setIsFinished(false);
      } catch (e) {
        console.error("Failed to resume exam:", e);
        localStorage.removeItem(STORAGE_KEY);
        setHasSavedProgress(false);
      }
    }
  };

  const startExam = async () => {
    setIsLoading(true);
    localStorage.removeItem(STORAGE_KEY);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 5 realistic multiple-choice questions for a Nigerian ${examType} ${subject} exam. 
        Return ONLY a JSON array of objects. Each object must have:
        - "question": the question text
        - "options": an array of 4 strings (A, B, C, D)
        - "correctAnswer": the exact string of the correct option
        - "explanation": a brief explanation of why it's correct.
        Do not include markdown formatting like \`\`\`json. Just the raw JSON array.`,
      });

      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedQuestions = JSON.parse(text);
      
      setQuestions(generatedQuestions);
      setIsStarted(true);
      setIsFinished(false);
      setAnswers({});
      setCurrentQuestionIdx(0);
      setTimeLeft(60 * 60);
    } catch (error) {
      console.error("Failed to generate exam:", error);
      alert("Failed to load exam questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIdx]: option }));
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setIsFinished(true);
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedProgress(false);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) score++;
    });
    return Math.round((score / questions.length) * 100);
  };

  if (!isStarted) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-10 h-full flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="apple-card p-10 md:p-14 w-full max-w-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-rose-600" />
          
          <div className="w-24 h-24 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
            <Timer className="w-12 h-12" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">Exam Simulator</h2>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-10 font-medium">
            Practice under real exam conditions. Timed tests tailored for Nigerian curriculums.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Exam Type</label>
              <select 
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none font-bold appearance-none cursor-pointer"
              >
                {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Subject</label>
              <select 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none font-bold appearance-none cursor-pointer"
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl p-6 mb-10 flex items-start gap-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-base">Exam Rules</h4>
              <p className="text-amber-700 dark:text-amber-400/80 text-sm mt-1 font-medium leading-relaxed">
                You will have 60 minutes to complete this mock exam. Once started, the timer cannot be paused.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={startExam}
              disabled={isLoading}
              className="flex-1 py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Start New Exam
                </>
              )}
            </button>

            {hasSavedProgress && !isLoading && (
              <button 
                onClick={resumeExam}
                className="flex-1 py-5 bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-black/5 dark:border-white/10 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-sm hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                Resume Progress
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (isFinished) {
    const score = calculateScore();
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 h-full overflow-y-auto">
        <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-xl text-center mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-slate-50 dark:bg-black/20">
            <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{score}%</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Exam Completed!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            {examType} {subject} Mock Exam
          </p>
          <button 
            onClick={() => setIsStarted(false)}
            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold transition-colors"
          >
            Take Another Exam
          </button>
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Review Answers</h3>
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const isCorrect = answers[idx] === q.correctAnswer;
            return (
              <div key={idx} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-4">{idx + 1}. {q.question}</p>
                <div className="space-y-2 mb-4">
                  {q.options.map((opt: string, i: number) => (
                    <div key={i} className={cn(
                      "p-3 rounded-xl border flex items-center justify-between",
                      opt === q.correctAnswer ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" :
                      opt === answers[idx] && !isCorrect ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800" :
                      "border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20"
                    )}>
                      <span className={cn(
                        opt === q.correctAnswer ? "text-emerald-700 dark:text-emerald-400 font-medium" :
                        opt === answers[idx] && !isCorrect ? "text-rose-700 dark:text-rose-400 font-medium" :
                        "text-slate-600 dark:text-slate-400"
                      )}>{opt}</span>
                      {opt === q.correctAnswer && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {opt === answers[idx] && !isCorrect && <XCircle className="w-5 h-5 text-rose-500" />}
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-400 mb-1">Explanation:</p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-300/80">{q.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIdx];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 h-full flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-10"
      >
        <div className="apple-card p-4 md:p-8 flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">{examType} {subject}</h2>
            <p className="text-[10px] md:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Question {currentQuestionIdx + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-rose-600 dark:text-rose-400 font-mono font-black text-lg md:text-2xl bg-rose-50 dark:bg-rose-900/20 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/30 shrink-0">
            <Timer className="w-4 h-4 md:w-6 md:h-6" />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex gap-0.5">
          {questions.map((_, idx) => (
            <div 
              key={idx}
              className={cn(
                "flex-1 h-full transition-all duration-500",
                idx < currentQuestionIdx ? "bg-emerald-500" :
                idx === currentQuestionIdx ? "bg-indigo-500 animate-pulse" :
                answers[idx] ? "bg-indigo-300 dark:bg-indigo-700" : "bg-transparent"
              )}
            />
          ))}
        </div>
      </motion.div>

      {/* Question */}
      <div className="flex-1 flex flex-col">
        <motion.div 
          key={currentQuestionIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="apple-card p-6 md:p-12 mb-6 md:mb-10 flex-1 flex flex-col"
        >
          <div className="mb-8 md:mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              Question {currentQuestionIdx + 1}
            </span>
            <h3 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">
              {currentQ?.question}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {currentQ?.options.map((opt: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className={cn(
                  "w-full text-left p-4 md:p-6 rounded-2xl border-2 transition-all flex items-center gap-4 md:gap-5 group relative overflow-hidden",
                  answers[currentQuestionIdx] === opt 
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-md ring-4 ring-indigo-500/10" 
                    : "border-black/5 dark:border-white/5 bg-slate-50 dark:bg-black/20 hover:border-indigo-300 dark:hover:border-indigo-500/50 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5"
                )}
              >
                {answers[currentQuestionIdx] === opt && (
                  <motion.div 
                    layoutId="active-option"
                    className="absolute inset-0 bg-indigo-600/5 dark:bg-indigo-400/5 pointer-events-none"
                  />
                )}
                <div className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-sm md:text-lg shrink-0 transition-all",
                  answers[currentQuestionIdx] === opt 
                    ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/40" 
                    : "bg-black/5 dark:bg-white/5 text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600"
                )}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-base md:text-lg font-bold flex-1">{opt}</span>
                {answers[currentQuestionIdx] === opt && (
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 mt-auto pt-4">
        <button
          onClick={() => currentQuestionIdx > 0 && setCurrentQuestionIdx(prev => prev - 1)}
          disabled={currentQuestionIdx === 0}
          className="px-6 md:px-8 py-4 md:py-5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm md:text-lg flex items-center gap-2 disabled:opacity-0 transition-all"
        >
          Previous
        </button>
        <button
          onClick={nextQuestion}
          disabled={!answers[currentQuestionIdx]}
          className="flex-1 md:flex-none px-8 md:px-12 py-4 md:py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm md:text-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10 dark:shadow-white/5"
        >
          {currentQuestionIdx === questions.length - 1 ? "Finish Exam" : "Next Question"}
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>
    </div>
  );
}
