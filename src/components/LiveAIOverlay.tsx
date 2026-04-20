import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { Mic, MicOff, Loader2, Square, Sparkles, X, MessageSquare, MonitorPlay, ChevronRight, ChevronLeft, Settings, User as UserIcon, Volume2, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useAppContext, View } from '../contexts/AppContext';

export default function LiveAIOverlay() {
  const { 
    currentView, setCurrentView, 
    isKidsMode, setIsKidsMode, 
    isDarkMode, setIsDarkMode, 
    setStudyMaterial, setIsSidebarOpen,
    aiName, setAiName,
    aiVoice, setAiVoice,
    isWakeWordEnabled, setIsWakeWordEnabled,
    setPendingStudyItems,
    isPro
  } = useAppContext();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [tutorScreenContent, setTutorScreenContent] = useState<string>('');
  const [showTutorScreen, setShowTutorScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);

  // Wake Word Detection
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && isWakeWordEnabled && !isConnected) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('')
          .toLowerCase();

        if (transcript.includes(aiName.toLowerCase())) {
          setIsOpen(true);
          if (!isConnected && !isConnecting) {
            connect();
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech') return;
        recognition.stop();
      };

      recognition.onend = () => {
        if (isWakeWordEnabled && !isConnected) {
          recognition.start();
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isWakeWordEnabled, aiName, isConnected]);

  const connect = async () => {
    setIsConnecting(true);
    setTutorScreenContent('');

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      nextPlayTimeRef.current = audioContext.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `You are "${aiName}", a highly advanced and professional AI study assistant and Global Information Hub. 
      Your tone is helpful, efficient, and sophisticated.
      
      CORE DIRECTIVES:
      1. Global News Reporter: You are a real-time global news reporter. You have access to the entire world's information via Google Search. When asked for news or when relevant to the study topic, adopt a professional "News Anchor" persona, providing an up-to-the-minute, structured briefing.
      2. Visual Integration: When reporting news or explaining complex global events, ALWAYS use 'showExplanationOnScreen' to display headlines, summaries, and key facts so the user can follow along visually.
      3. Proactive Updates: If you detect a major global event related to the user's field of study, proactively mention it.
      4. Navigation: You have full control over the StudyMind systems. You can navigate, toggle modes, and directly modify study plans.
      
      SECTION LIST:
      - dashboard, teacher-dashboard, courses, exam, past-questions, video-class, video-gen, news, textbooks, reader, notes, flashcards, chat, live, whatsapp, plan, concepts, quiz, drawing, image-gen, pricing.
      
      You can directly modify the user's study plan using 'addStudyPlanItem'.
      You can also use 'showExplanationOnScreen' to display data on the holographic interface.
      You can generate cinematic educational videos using 'generateVideo'.
      
      Example: "I've added the Physics session to your schedule and displayed the relevant notes on your screen."`;

      const tools = [
        {
          functionDeclarations: [
            {
              name: "navigateTo",
              description: "Navigate the user to a specific section of the app.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  view: { type: Type.STRING, description: "The ID of the view to navigate to." }
                },
                required: ["view"]
              }
            },
            {
              name: "toggleKidsMode",
              description: "Turn Kids Mode on or off.",
              parameters: {
                type: Type.OBJECT,
                properties: { enabled: { type: Type.BOOLEAN } },
                required: ["enabled"]
              }
            },
            {
              name: "toggleDarkMode",
              description: "Turn Dark Mode on or off.",
              parameters: {
                type: Type.OBJECT,
                properties: { enabled: { type: Type.BOOLEAN } },
                required: ["enabled"]
              }
            },
            {
              name: "setStudyMaterial",
              description: "Set the current study material/topic for the app.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING, description: "The topic or content to set as study material." }
                },
                required: ["content"]
              }
            },
            {
              name: "addStudyPlanItem",
              description: "Directly add an item to the user's study plan.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "The title of the study task." },
                  time: { type: Type.STRING, description: "The time or duration (e.g., '2 PM', '1 hour')." }
                },
                required: ["title", "time"]
              }
            },
            {
              name: "showExplanationOnScreen",
              description: "Shows a visual explanation on the tutor's screen overlay.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  markdownContent: { type: Type.STRING, description: "The markdown content to display." }
                },
                required: ["markdownContent"]
              }
            },
            {
              name: "generateVideo",
              description: "Generate a cinematic educational video from a prompt or notes.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  prompt: { type: Type.STRING, description: "The description of the video to generate." }
                },
                required: ["prompt"]
              }
            }
          ]
        }
      ];

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            if (recognitionRef.current) recognitionRef.current.stop();

            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              const bytes = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64 = btoa(binary);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls) {
                const responses = functionCalls.map(call => {
                  let result = "Success";
                  try {
                    switch (call.name) {
                      case 'navigateTo':
                        setCurrentView(call.args.view as View);
                        break;
                      case 'toggleKidsMode':
                        setIsKidsMode(call.args.enabled as boolean);
                        break;
                      case 'toggleDarkMode':
                        setIsDarkMode(call.args.enabled as boolean);
                        break;
                      case 'setStudyMaterial':
                        setStudyMaterial(call.args.content as string);
                        break;
                      case 'addStudyPlanItem':
                        setPendingStudyItems([{ title: call.args.title as string, time: call.args.time as string }]);
                        result = `Added ${call.args.title} at ${call.args.time} to the schedule.`;
                        break;
                      case 'showExplanationOnScreen':
                        setTutorScreenContent(call.args.markdownContent as string);
                        setShowTutorScreen(true);
                        break;
                      case 'generateVideo':
                        setStudyMaterial(call.args.prompt as string);
                        setCurrentView('video-gen');
                        result = "Initializing Video Studio with your request.";
                        break;
                      default:
                        result = "Unknown function";
                    }
                  } catch (e) {
                    result = "Error executing function";
                  }
                  
                  return {
                    name: call.name,
                    id: call.id,
                    response: { result }
                  };
                });
                
                sessionPromise.then(session => {
                  session.sendToolResponse({ functionResponses: responses });
                });
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const buffer = new Int16Array(bytes.buffer);
              
              const audioBuffer = audioContext.createBuffer(1, buffer.length, 24000);
              const channelData = audioBuffer.getChannelData(0);
              for (let i = 0; i < buffer.length; i++) {
                channelData[i] = buffer[i] / 32768.0;
              }

              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              
              const playTime = Math.max(audioContext.currentTime, nextPlayTimeRef.current);
              source.start(playTime);
              nextPlayTimeRef.current = playTime + audioBuffer.duration;

              source.onended = () => {
                if (audioContext.currentTime >= nextPlayTimeRef.current - 0.1) {
                  setIsSpeaking(false);
                }
              };
            }

            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = audioContext.currentTime;
              setIsSpeaking(false);
            }
          },
          onclose: () => disconnect(),
          onerror: () => disconnect()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { 
              prebuiltVoiceConfig: { 
                voiceName: aiVoice === 'male' ? "Zephyr" : "Kore" 
              } 
            },
          },
          systemInstruction,
          tools: [
            { googleSearch: {} },
            ...tools
          ],
        },
      });

      sessionRef.current = await sessionPromise;
      
      if (pendingAction) {
        sessionRef.current.sendRealtimeInput({ text: pendingAction });
        setPendingAction(null);
      }

    } catch (err) {
      console.error("Failed to connect:", err);
      setIsConnecting(false);
      disconnect();
    }
  };

  const disconnect = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    if (isWakeWordEnabled && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch(e) {}
    }
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="w-80 md:w-96 apple-card overflow-hidden flex flex-col shadow-2xl border border-indigo-500/20 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl"
            >
              {/* Header */}
              <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-indigo-500/5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-500",
                    isConnected ? (isSpeaking ? "bg-indigo-500 scale-110 shadow-indigo-500/40" : "bg-indigo-600 shadow-indigo-500/20") : "bg-slate-400"
                  )}>
                    <Sparkles className={cn("w-5 h-5", isConnected && "animate-pulse")} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{aiName}</h3>
                    <p className="text-[10px] uppercase tracking-widest font-black text-indigo-500">Advanced AI Interface</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col items-center gap-6">
                {showSettings ? (
                  <div className="w-full space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assistant Name</label>
                      <input 
                        type="text" 
                        value={aiName}
                        onChange={(e) => setAiName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voice Protocol</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setAiVoice('male')}
                          className={cn("px-3 py-2 rounded-lg text-xs font-bold transition-all", aiVoice === 'male' ? "bg-indigo-600 text-white" : "bg-black/5 dark:bg-white/5 text-slate-500")}
                        >
                          Male Voice
                        </button>
                        <button 
                          onClick={() => setAiVoice('female')}
                          className={cn("px-3 py-2 rounded-lg text-xs font-bold transition-all", aiVoice === 'female' ? "bg-indigo-600 text-white" : "bg-black/5 dark:bg-white/5 text-slate-500")}
                        >
                          Female Voice
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wake Word Activation</label>
                      <button 
                        onClick={() => setIsWakeWordEnabled(!isWakeWordEnabled)}
                        className={cn("w-10 h-5 rounded-full relative transition-all", isWakeWordEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700")}
                      >
                        <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", isWakeWordEnabled ? "left-6" : "left-1")} />
                      </button>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold mt-2">Save Protocols</button>
                  </div>
                ) : showTutorScreen && tutorScreenContent ? (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <MonitorPlay className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Holographic Data</span>
                      </div>
                      <button onClick={() => setShowTutorScreen(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">Hide</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-4 bg-black/5 dark:bg-white/5 rounded-2xl prose dark:prose-invert prose-sm max-w-none relative overflow-hidden">
                      {/* Scanline Effect */}
                      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,0,0.03))] bg-[length:100%_2px,3px_100%] z-10" />
                      <Markdown>{tutorScreenContent}</Markdown>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {isConnected 
                        ? (isSpeaking ? "Processing..." : `I'm online and ready to help.`) 
                        : isWakeWordEnabled ? `Say "${aiName}" to activate.` : "Initiate connection to start."}
                    </p>
                  </div>
                )}

                <button
                  onClick={isConnected ? disconnect : connect}
                  disabled={isConnecting}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl relative group",
                    isConnecting ? "bg-slate-100 dark:bg-slate-800" :
                    isConnected 
                      ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/30" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/40"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  ) : isConnected ? (
                    <Square className="w-8 h-8 fill-current" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                  
                  {/* Pulse effect when speaking */}
                  {isSpeaking && (
                    <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20" />
                  )}
                </button>

                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500" : "bg-slate-300")} />
                  {isConnected ? "Online" : isConnecting ? "Connecting..." : "Offline"}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-black/5 dark:border-white/10">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button 
                    onClick={() => {
                      if (!isPro) {
                        setCurrentView('pricing');
                        setIsOpen(false);
                        return;
                      }
                      const action = "Give me a real-time global news briefing and show the headlines on my screen.";
                      if (!isConnected) {
                        setPendingAction(action);
                        connect();
                      } else {
                        sessionRef.current?.sendRealtimeInput({ text: action });
                      }
                    }} 
                    className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-all group"
                  >
                    <Globe className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Global Briefing</span>
                  </button>
                  <button 
                    onClick={() => setCurrentView('news')} 
                    className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-all group"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">News Feed</span>
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['Dashboard', 'Exam Mode', 'Quiz', 'Reader', 'Video Studio'].map(action => (
                    <button
                      key={action}
                      onClick={() => setCurrentView(action.toLowerCase().replace(' ', '-') as View)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 text-[10px] font-bold whitespace-nowrap hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 relative overflow-hidden group",
            isOpen 
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 rotate-90" 
              : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
          )}
        >
          {isOpen ? <X className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
          
          {/* Animated glow */}
          {!isOpen && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          )}
        </button>
      </div>
    </>
  );
}
