import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { Mic, MicOff, Loader2, Square, Camera, CameraOff, MonitorPlay, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';

interface LiveTutorViewProps {
  isKidsMode?: boolean;
}

export default function LiveTutorView({ isKidsMode }: LiveTutorViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [tutorScreenContent, setTutorScreenContent] = useState<string>('');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const aiVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (aiVideoRef.current) {
      if (isSpeaking) {
        aiVideoRef.current.play().catch(e => console.log("Video play error", e));
      } else {
        aiVideoRef.current.pause();
      }
    }
  }, [isSpeaking]);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    setTutorScreenContent('');

    try {
      // 1. Setup Audio Context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      nextPlayTimeRef.current = audioContext.currentTime;

      // 2. Get Media Access (Audio + optional Video)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: cameraEnabled ? { width: 640, height: 480 } : false 
      });
      mediaStreamRef.current = stream;

      if (cameraEnabled && videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 3. Setup Gemini Live
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = isKidsMode 
        ? "You are a fun, friendly, and encouraging AI tutor for a young child (3-6 years old). Speak simply, use fun examples, and be very enthusiastic. If you can see the user, comment on what they are showing you! You can also use the showExplanationOnScreen tool to show them fun emojis, big letters, or simple words on the screen."
        : "You are a knowledgeable and patient AI tutor. Help the student understand concepts clearly and concisely. If the user shares their video, you can see them and help them with visual tasks. You can use the showExplanationOnScreen tool to write down notes, formulas, or code snippets for the student to see on their screen.";

      const renderExplanationTool = {
        functionDeclarations: [
          {
            name: "showExplanationOnScreen",
            description: "Shows a visual explanation on the user's screen. Use this to write down notes, math equations, or code snippets for the user to see.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                markdownContent: {
                  type: Type.STRING,
                  description: "The markdown content to display. You can use headings, bullet points, bold text, and code blocks."
                }
              },
              required: ["markdownContent"]
            }
          }
        ]
      };

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);

            // Start sending audio
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

            // Start sending video frames if camera is enabled
            if (cameraEnabled && videoRef.current && canvasRef.current) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              
              videoIntervalRef.current = window.setInterval(() => {
                if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                  
                  sessionPromise.then((session) => {
                    session.sendRealtimeInput({
                      video: { data: base64Data, mimeType: 'image/jpeg' }
                    });
                  });
                }
              }, 1000); // Send frame every 1 second
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls) {
                const responses = functionCalls.map(call => {
                  if (call.name === 'showExplanationOnScreen') {
                    const content = call.args.markdownContent as string;
                    setTutorScreenContent(content);
                    return {
                      name: call.name,
                      id: call.id,
                      response: { result: "Successfully updated the screen." }
                    };
                  }
                  return {
                    name: call.name,
                    id: call.id,
                    response: { error: "Unknown function" }
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
          onclose: () => {
            disconnect();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error. Please try again.");
            disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: isKidsMode ? "Puck" : "Zephyr" } },
          },
          systemInstruction,
          tools: [renderExplanationTool],
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Failed to connect:", err);
      setError("Failed to access microphone/camera or connect to tutor.");
      setIsConnecting(false);
      disconnect();
    }
  };

  const disconnect = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        // Ignore
      }
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setTutorScreenContent('');
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#09090B]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 bg-white dark:bg-[#1C1C1E] flex items-center justify-between z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isKidsMode ? "Magic Video Tutor 🎙️" : "Live Video Tutor"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isKidsMode ? "Learn with your AI friend!" : "Real-time voice and video learning"}
          </p>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            isConnected ? "bg-emerald-500" : isConnecting ? "bg-amber-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
          )} />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
          </span>
        </div>
      </div>

      {error && (
        <div className="m-4 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800 text-center">
          {error}
        </div>
      )}

      {/* Main Video Call Interface */}
      <div className="flex-1 p-4 md:p-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Main Stage (Tutor Screen or Avatar) */}
        <div className="flex-1 bg-slate-900 dark:bg-black rounded-3xl overflow-hidden relative shadow-xl flex flex-col border border-slate-800">
          {tutorScreenContent ? (
            <div className="flex-1 flex flex-col bg-white dark:bg-[#1C1C1E]">
              <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <MonitorPlay className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-100">AI Tutor's Screen</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">Live explanation</p>
                </div>
              </div>
              <div className="flex-1 p-8 overflow-y-auto prose dark:prose-invert max-w-none">
                <Markdown>{tutorScreenContent}</Markdown>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
              {isKidsMode && isConnected ? (
                <>
                  <video 
                    ref={aiVideoRef}
                    src="https://www.w3schools.com/html/mov_bbb.mp4" 
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                      isSpeaking ? "opacity-100" : "opacity-50"
                    )}
                    loop
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-16 text-center w-full z-10">
                    <p className="text-2xl text-white font-bold drop-shadow-lg">
                      {isSpeaking ? "Tutor is speaking..." : "Tutor is listening..."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center z-10">
                  <div className={cn(
                    "w-40 h-40 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
                    isConnected ? (isSpeaking ? "bg-indigo-500 scale-110 shadow-[0_0_50px_rgba(99,102,241,0.6)]" : "bg-indigo-600 shadow-[0_0_30px_rgba(99,102,241,0.3)]") : "bg-slate-800"
                  )}>
                    <Sparkles className={cn("w-16 h-16", isConnected ? "text-white" : "text-slate-600")} />
                  </div>
                  <p className="text-xl text-white font-medium">
                    {isConnected ? (isSpeaking ? "Tutor is speaking..." : "Tutor is listening...") : "Ready to start"}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Tutor Name Tag */}
          <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 border border-white/10">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI Tutor
          </div>
        </div>

        {/* Side Panel (User Camera & Controls) */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* User Camera */}
          <div className="aspect-video lg:aspect-auto lg:flex-1 bg-slate-900 dark:bg-black rounded-3xl overflow-hidden relative shadow-lg border border-slate-800">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={cn("w-full h-full object-cover", !cameraEnabled && "hidden")}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {!cameraEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-800">
                <CameraOff className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm font-medium">Camera is off</p>
              </div>
            )}
            
            {/* User Name Tag */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-xs font-medium border border-white/10">
              You
            </div>
          </div>

          {/* Call Controls */}
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-3xl shadow-lg border border-black/5 dark:border-white/10 flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-4 w-full">
              <button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                disabled={isConnected || isConnecting}
                className={cn(
                  "p-4 rounded-full transition-all duration-300",
                  cameraEnabled 
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                    : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
                  (isConnected || isConnecting) && "opacity-50 cursor-not-allowed"
                )}
                title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {cameraEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

              <button
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                  isConnecting ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" :
                  isConnected 
                    ? "bg-rose-500 text-white hover:bg-rose-600 hover:scale-105 shadow-rose-500/30" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-indigo-600/30"
                )}
              >
                {isConnecting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isConnected ? (
                  <Square className="w-6 h-6 fill-current" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </button>
            </div>
            
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 font-medium">
              {isConnected ? "Click square to end call" : "Click mic to start call"}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
