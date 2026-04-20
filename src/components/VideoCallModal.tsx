import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Camera, CameraOff, PhoneOff, Sparkles, Loader2, MonitorPlay } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import Markdown from 'react-markdown';

interface VideoCallModalProps {
  chat: any;
  onClose: () => void;
  currentUser: any;
}

export default function VideoCallModal({ chat, onClose, currentUser }: VideoCallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isTutorInvited, setIsTutorInvited] = useState(false);
  const [isTutorConnecting, setIsTutorConnecting] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [tutorScreenContent, setTutorScreenContent] = useState<string>('');

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const videoIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Start user camera
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        mediaStreamRef.current = stream;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error("Failed to get user media", err));

    return () => {
      disconnectTutor();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const inviteTutor = async () => {
    setIsTutorConnecting(true);
    setTutorError(null);

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      nextPlayTimeRef.current = audioContext.currentTime;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = "You are an AI tutor joining a video call between students. Be helpful, concise, and answer their questions. You can see their video feed if they share it. You can use the showExplanationOnScreen tool to write down notes, formulas, or code snippets for the students to see on their screen.";

      const renderExplanationTool = {
        functionDeclarations: [
          {
            name: "showExplanationOnScreen",
            description: "Shows a visual explanation on the call screen. Use this to write down notes, math equations, or code snippets for the students to see.",
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
            setIsTutorInvited(true);
            setIsTutorConnecting(false);

            if (mediaStreamRef.current) {
              const source = audioContext.createMediaStreamSource(mediaStreamRef.current);
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (isMuted) return; // Don't send audio if muted
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
            }

            // Start sending video frames
            if (userVideoRef.current && canvasRef.current) {
              const video = userVideoRef.current;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              
              videoIntervalRef.current = window.setInterval(() => {
                if (isCameraOff) return; // Don't send video if camera off
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
              }, 1000);
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
              setIsTutorSpeaking(true);
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
                  setIsTutorSpeaking(false);
                }
              };
            }

            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = audioContext.currentTime;
              setIsTutorSpeaking(false);
            }
          },
          onclose: () => {
            disconnectTutor();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setTutorError("Tutor connection error.");
            disconnectTutor();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          tools: [renderExplanationTool],
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Failed to connect tutor:", err);
      setTutorError("Failed to invite tutor.");
      setIsTutorConnecting(false);
    }
  };

  const disconnectTutor = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    setIsTutorInvited(false);
    setIsTutorConnecting(false);
    setIsTutorSpeaking(false);
    setTutorScreenContent('');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle
      });
    }
  };

  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isCameraOff; // Toggle
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between text-white border-b border-white/10">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-lg">Call with {chat.otherUser?.displayName || 'Friend'}</h2>
          <div className="px-2 py-1 rounded bg-white/10 text-xs font-medium">00:00</div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        {/* Video Grid */}
        <div className={cn("flex-1 grid gap-4", tutorScreenContent ? "grid-cols-1" : "grid-cols-2")}>
          {/* Friend Video (Mock) */}
          <div className="relative bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
            {chat.otherUser?.photoURL ? (
              <img src={chat.otherUser.photoURL} alt="Friend" className="w-32 h-32 rounded-full opacity-50" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center text-4xl text-slate-500">
                {chat.otherUser?.displayName?.charAt(0) || 'F'}
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-white text-sm backdrop-blur-sm">
              {chat.otherUser?.displayName || 'Friend'}
            </div>
          </div>

          {/* My Video */}
          <div className="relative bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
            <video 
              ref={userVideoRef}
              autoPlay
              playsInline
              muted
              className={cn("w-full h-full object-cover", isCameraOff && "hidden")}
            />
            <canvas ref={canvasRef} className="hidden" />
            {isCameraOff && (
              <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center text-4xl text-slate-500">
                {currentUser?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-white text-sm backdrop-blur-sm">
              You
            </div>
          </div>

          {/* AI Tutor Video (if invited and no screen shared) */}
          {isTutorInvited && !tutorScreenContent && (
            <div className="relative bg-indigo-900/50 rounded-2xl overflow-hidden flex items-center justify-center col-span-full md:col-span-1">
              <div className={cn("w-32 h-32 rounded-full flex items-center justify-center transition-all", isTutorSpeaking ? "bg-indigo-500 scale-110 shadow-[0_0_30px_rgba(99,102,241,0.5)]" : "bg-indigo-600")}>
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-white text-sm backdrop-blur-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Tutor {isTutorSpeaking && "(Speaking...)"}
              </div>
            </div>
          )}
        </div>

        {/* Tutor Screen Share Panel */}
        {tutorScreenContent && (
          <div className="w-1/2 bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">AI Tutor's Screen</h3>
                <p className="text-xs text-indigo-600">Live explanation</p>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto prose prose-slate max-w-none">
              <Markdown>{tutorScreenContent}</Markdown>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-24 flex items-center justify-center gap-6 pb-4">
        <button 
          onClick={toggleMute}
          className={cn("p-4 rounded-full transition-colors", isMuted ? "bg-rose-500 text-white" : "bg-slate-700 text-white hover:bg-slate-600")}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button 
          onClick={toggleCamera}
          className={cn("p-4 rounded-full transition-colors", isCameraOff ? "bg-rose-500 text-white" : "bg-slate-700 text-white hover:bg-slate-600")}
        >
          {isCameraOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
        </button>
        
        {!isTutorInvited ? (
          <button 
            onClick={inviteTutor}
            disabled={isTutorConnecting}
            className="px-6 py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isTutorConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Invite AI Tutor
          </button>
        ) : (
          <button 
            onClick={disconnectTutor}
            className="px-6 py-4 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-medium flex items-center gap-2 transition-colors"
          >
            <X className="w-5 h-5" />
            Remove Tutor
          </button>
        )}

        <button 
          onClick={onClose}
          className="p-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition-colors"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
      
      {tutorError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {tutorError}
        </div>
      )}
    </div>
  );
}
