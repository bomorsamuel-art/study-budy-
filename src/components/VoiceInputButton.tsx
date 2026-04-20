import { useState, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  className?: string;
}

export default function VoiceInputButton({ onResult, className }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResultRef.current(transcript);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={cn(
        "p-2 rounded-full transition-colors flex items-center justify-center",
        isListening 
          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 animate-pulse" 
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10",
        className
      )}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
