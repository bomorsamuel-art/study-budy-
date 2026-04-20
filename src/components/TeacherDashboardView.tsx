import { useState, useRef, useEffect } from 'react';
import { 
  Users, BookOpen, BarChart3, Upload, Plus, Settings, TrendingUp, Search, 
  FileText, AlertCircle, CheckCircle2, Lock, ShieldCheck, UploadCloud, 
  Video, Mic, MicOff, VideoOff, PhoneOff, Copy, Check, PlayCircle, 
  StopCircle, X, Loader2, Sparkles, MonitorUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';

export default function TeacherDashboardView() {
  // Auth State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard State
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'students' | 'virtual-class' | 'live-exams'>('overview');
  const [isUploading, setIsUploading] = useState(false);

  // Invite State
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const inviteCode = "WAEC-2026-XJ9";

  // Generate State
  const [generateType, setGenerateType] = useState<'exam' | 'notes' | null>(null);
  const [generateTopic, setGenerateTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Virtual Class State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Live Exam State
  const [activeLiveExam, setActiveLiveExam] = useState(false);
  const [examProgress, setExamProgress] = useState<{id: number, name: string, progress: number, score: number}[]>([
    { id: 1, name: 'Adebayo Johnson', progress: 0, score: 0 },
    { id: 2, name: 'Chiamaka Eze', progress: 0, score: 0 },
    { id: 3, name: 'Musa Ibrahim', progress: 0, score: 0 },
    { id: 4, name: 'Oluwaseun Ojo', progress: 0, score: 0 },
    { id: 5, name: 'Ngozi Okafor', progress: 0, score: 0 },
  ]);

  // Handle Live Exam Simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeLiveExam) {
      interval = setInterval(() => {
        setExamProgress(prev => prev.map(student => {
          if (student.progress >= 100) return student;
          const jump = Math.floor(Math.random() * 15);
          const newProgress = Math.min(100, student.progress + jump);
          const newScore = newProgress === 100 ? Math.floor(Math.random() * 40) + 60 : student.score;
          return { ...student, progress: newProgress, score: newScore };
        }));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeLiveExam]);

  // Handle Video Stream
  useEffect(() => {
    if (isVideoOn && videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [isVideoOn, localStream]);

  // Cleanup media on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  const toggleVideo = async () => {
    if (isVideoOn) {
      if (localStream) {
        localStream.getVideoTracks().forEach(track => track.stop());
      }
      setIsVideoOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
        setLocalStream(stream);
        setIsVideoOn(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please check permissions.");
      }
    }
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = false);
      }
      setIsMicOn(false);
    } else {
      if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = true);
        setIsMicOn(true);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoOn, audio: true });
          setLocalStream(stream);
          setIsMicOn(true);
        } catch (err) {
          console.error("Error accessing mic:", err);
          alert("Could not access microphone.");
        }
      }
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsVideoOn(false);
    setIsMicOn(false);
    setActiveTab('overview');
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== 'admin123') {
      setError('Incorrect password. (Hint: use admin123)');
      return;
    }
    if (!proofFile) {
      setError('Please upload your Proof of Work (Teacher ID or Letter).');
      return;
    }
    setError('');
    setIsUnlocked(true);
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(`Join my class on the AI Tutor App! Code: ${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    setGeneratedContent('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = generateType === 'exam'
        ? `Act as an expert Nigerian teacher. Generate a 5-question multiple choice mock exam for high school students on the topic: "${generateTopic}". Include the correct answers and brief explanations at the bottom. Format strictly in clean Markdown.`
        : `Act as an expert Nigerian teacher. Generate comprehensive, easy-to-understand lesson notes for high school students on the topic: "${generateTopic}". Include key definitions, formulas (if applicable), and 3 quick practice questions. Format strictly in clean Markdown.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });
      
      setGeneratedContent(response.text || 'Failed to generate content.');
    } catch (error) {
      console.error("Generation error:", error);
      setGeneratedContent("An error occurred while generating the content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#09090B]">
        <div className="max-w-md w-full bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-xl border border-black/5 dark:border-white/10 p-8">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-2">Teacher Portal Access</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm">
            Please verify your identity to access student analytics and curriculum settings.
          </p>

          <form onSubmit={handleUnlock} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium text-center border border-rose-100 dark:border-rose-500/20">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Portal Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Demo password: admin123</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Proof of Work (ID/Letter)</label>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="hidden" 
                accept="image/*,.pdf"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition-colors text-sm font-bold",
                  proofFile 
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "border-slate-200 dark:border-white/10 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-500 dark:text-slate-400"
                )}
              >
                {proofFile ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                {proofFile ? proofFile.name : "Upload Document"}
              </button>
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/30 mt-4"
            >
              Verify & Access Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Students', value: '142', icon: Users, trend: '+12% this month', positive: true },
    { label: 'Average Score', value: '76%', icon: BarChart3, trend: '+4% this month', positive: true },
    { label: 'Active Curriculums', value: '3', icon: BookOpen, trend: 'Updated 2 days ago', positive: true },
  ];

  const students = [
    { id: 1, name: 'Adebayo Johnson', grade: 'JSS 3', score: 85, weakArea: 'Algebra', lastActive: '2 hours ago' },
    { id: 2, name: 'Chiamaka Eze', grade: 'SS 2', score: 92, weakArea: 'None', lastActive: '10 mins ago' },
    { id: 3, name: 'Musa Ibrahim', grade: 'SS 1', score: 64, weakArea: 'Physics (Motion)', lastActive: '1 day ago' },
    { id: 4, name: 'Oluwaseun Ojo', grade: 'JSS 2', score: 78, weakArea: 'Basic Science', lastActive: '5 hours ago' },
    { id: 5, name: 'Ngozi Okafor', grade: 'SS 3', score: 88, weakArea: 'Organic Chemistry', lastActive: 'Just now' },
  ];

  const curriculums = [
    { id: 1, title: 'JSS 3 Basic Science - Term 1', status: 'Active', students: 45 },
    { id: 2, title: 'SS 2 Mathematics (WAEC Prep)', status: 'Active', students: 62 },
    { id: 3, title: 'JAMB Physics Crash Course', status: 'Draft', students: 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 h-full flex flex-col overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Teacher Dashboard
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Manage curriculums, track student progress, and host live sessions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowInvite(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Invite Students
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100/50 dark:bg-white/5 rounded-[1.25rem] mb-10 w-fit border border-black/5 dark:border-white/5">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'virtual-class', label: 'Virtual Class', icon: Video },
          { id: 'live-exams', label: 'Live Exams', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 md:px-6 py-2.5 text-sm font-bold capitalize transition-all relative whitespace-nowrap rounded-[0.9rem] flex items-center gap-2.5 z-10",
              activeTab === tab.id 
                ? "text-indigo-600 dark:text-indigo-400" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-white dark:bg-[#1C1C1E] rounded-[0.9rem] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] -z-10 border border-black/5 dark:border-white/10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1"
      >
        {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1",
                      stat.positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                    )}>
                      <TrendingUp className="w-3 h-3" />
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#1C1C1E] p-6 md:p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Quick Actions</h3>
              <div className="space-y-4">
                <button 
                  onClick={() => setGenerateType('exam')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Generate Mock Exam</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Create a test for your class using AI</p>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </button>
                <button 
                  onClick={() => setGenerateType('notes')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Generate Lesson Notes</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Create comprehensive notes instantly</p>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                </button>
                <button 
                  onClick={() => setActiveTab('virtual-class')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-500/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Start Virtual Class</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Host a live video session with students</p>
                    </div>
                  </div>
                  <PlayCircle className="w-5 h-5 text-slate-400 group-hover:text-purple-500" />
                </button>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white dark:bg-[#1C1C1E] p-6 md:p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">AI Insights</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-900 dark:text-rose-300 text-sm">Intervention Needed</p>
                    <p className="text-sm text-rose-700 dark:text-rose-400/80 mt-1">12 students in SS1 are consistently failing Physics (Motion). Consider generating a targeted Video Class.</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-start gap-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">Great Progress</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400/80 mt-1">JSS3 Basic Science average score increased by 8% after the last AI Mock Exam.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="space-y-8">
          {/* Upload Section */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <BookOpen className="w-48 h-48" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Custom Curriculum Integration</h3>
              <p className="text-indigo-100 mb-8 text-lg">
                Upload your school's syllabus, lesson plans, or specific textbooks. The AI Tutor will instantly adapt to teach strictly within your curriculum boundaries.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    setIsUploading(true);
                    setTimeout(() => { setIsUploading(false); alert("Curriculum successfully parsed and integrated into the AI Tutor!"); }, 2000);
                  }}
                  disabled={isUploading}
                  className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-80"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  {isUploading ? "Processing PDF..." : "Upload Syllabus (PDF/Doc)"}
                </button>
              </div>
            </div>
          </div>

          {/* Active Curriculums */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-black/5 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Active Curriculums</h3>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {curriculums.map((curr) => (
                <div key={curr.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">{curr.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{curr.students} Students Enrolled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "px-3 py-1 text-xs font-bold rounded-full",
                      curr.status === 'Active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    )}>
                      {curr.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-6 border-b border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Student Analytics</h3>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search students..." 
                className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-sm outline-none focus:border-indigo-500 w-full sm:w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-black/20 border-b border-black/5 dark:border-white/10">
                  <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Student Name</th>
                  <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Class/Grade</th>
                  <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Avg Score</th>
                  <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">AI Identified Weakness</th>
                  <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{student.name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{student.grade}</td>
                    <td className="p-4">
                      <span className={cn(
                        "font-bold",
                        student.score >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                        student.score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {student.score}%
                      </span>
                    </td>
                    <td className="p-4">
                      {student.weakArea === 'None' ? (
                        <span className="text-slate-400 text-sm italic">On track</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-500/20">
                          <AlertCircle className="w-3 h-3" />
                          {student.weakArea}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{student.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'virtual-class' && (
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col h-[600px]">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="text-white font-bold">Live Virtual Classroom: SS2 Physics</h3>
            </div>
            <div className="text-slate-400 text-sm font-medium">
              12 Students Present
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 p-4 grid grid-cols-4 gap-4 overflow-y-auto">
            {/* Teacher Main Video */}
            <div className="col-span-4 md:col-span-3 row-span-2 bg-black rounded-2xl overflow-hidden relative border border-slate-800">
              {isVideoOn ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <VideoOff className="w-16 h-16 mb-4 opacity-50" />
                  <p>Camera is off</p>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                You (Teacher)
                {!isMicOn && <MicOff className="w-4 h-4 text-rose-400" />}
              </div>
            </div>

            {/* Mock Students */}
            {students.slice(0, 4).map((student, idx) => (
              <div key={idx} className="bg-slate-800 rounded-2xl overflow-hidden relative aspect-video border border-slate-700 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-white text-xs font-medium">
                  {student.name.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="p-6 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-6">
            <button 
              onClick={toggleMic}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                isMicOn ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-rose-500 text-white hover:bg-rose-600"
              )}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            <button 
              onClick={toggleVideo}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                isVideoOn ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-rose-500 text-white hover:bg-rose-600"
              )}
            >
              {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            <button className="w-14 h-14 rounded-full bg-slate-800 text-white hover:bg-slate-700 flex items-center justify-center transition-all">
              <MonitorUp className="w-6 h-6" />
            </button>
            <button 
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center transition-all shadow-lg shadow-rose-600/20"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'live-exams' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1C1C1E] p-6 md:p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Live Group Exams</h3>
              <p className="text-slate-500 dark:text-slate-400">Host a synchronized exam session and monitor student progress in real-time.</p>
            </div>
            {!activeLiveExam ? (
              <button 
                onClick={() => setActiveLiveExam(true)}
                className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-rose-600/20 whitespace-nowrap"
              >
                <PlayCircle className="w-6 h-6" />
                Start Live Exam Session
              </button>
            ) : (
              <button 
                onClick={() => setActiveLiveExam(false)}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-colors flex items-center gap-2 shadow-lg whitespace-nowrap"
              >
                <StopCircle className="w-6 h-6" />
                End Session
              </button>
            )}
          </div>

          {activeLiveExam ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-black/5 dark:border-white/10 shadow-sm p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                  Live Monitoring: SS2 Physics Mock Exam
                </h4>
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold">
                  Time Remaining: 45:20
                </span>
              </div>
              
              <div className="space-y-6">
                {examProgress.map(student => (
                  <div key={student.id} className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-700 dark:text-slate-300">{student.name}</span>
                      <span className={student.progress === 100 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400"}>
                        {student.progress === 100 ? `Finished (Score: ${student.score}%)` : `${student.progress}% Completed`}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          student.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
                        )}
                        style={{ width: `${student.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-black/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No Active Sessions</h4>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Click "Start Live Exam Session" above to begin a synchronized test for your students. You will be able to monitor their progress in real-time.
              </p>
            </div>
          )}
        </div>
      )}
      </motion.div>

      {/* Modals */}
      
      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowInvite(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-2">Invite Students</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
              Share this class code with your students so they can join your curriculum.
            </p>
            
            <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-6 text-center">
              <p className="text-3xl font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                {inviteCode}
              </p>
            </div>

            <button 
              onClick={copyInvite}
              className={cn(
                "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                copied 
                  ? "bg-emerald-500 text-white" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30"
              )}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? "Copied to Clipboard!" : "Copy Invite Code"}
            </button>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {generateType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setGenerateType(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Generate {generateType === 'exam' ? 'Mock Exam' : 'Lesson Notes'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Enter a topic and let AI instantly create high-quality educational materials for your class.
            </p>

            {!generatedContent ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic / Subject</label>
                  <input 
                    type="text" 
                    value={generateTopic}
                    onChange={(e) => setGenerateTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws of Motion, Quadratic Equations..." 
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !generateTopic.trim()}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isGenerating ? "Generating Content..." : `Generate ${generateType === 'exam' ? 'Exam' : 'Notes'}`}
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-6 prose prose-indigo dark:prose-invert max-w-none">
                  <Markdown>{generatedContent}</Markdown>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setGeneratedContent(''); setGenerateTopic(''); }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Create Another
                  </button>
                  <button 
                    onClick={() => { alert("Saved to your Active Curriculums!"); setGenerateType(null); }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/30"
                  >
                    Save & Publish to Class
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
