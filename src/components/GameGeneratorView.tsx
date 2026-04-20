import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Gamepad2, Loader2, Sparkles, RefreshCw, Play, SpellCheck, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import VoiceInputButton from './VoiceInputButton';

interface GameGeneratorViewProps {
  isKidsMode?: boolean;
}

type GameMode = 'general' | 'spelling';
type Difficulty = 'easy' | 'medium' | 'hard';

export default function GameGeneratorView({ isKidsMode }: GameGeneratorViewProps) {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameHtml, setGameHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('general');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const generateGame = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGameHtml(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let prompt = '';
      if (gameMode === 'spelling') {
        const difficultyInstructions = {
          easy: "Use very short, common words (3-4 letters).",
          medium: "Use medium length words (5-7 letters).",
          hard: "Use longer, more complex words (8+ letters)."
        };
        
        prompt = `Create a fun, interactive, and educational SPELLING game for kids about the topic: "${topic}".
        
        Requirements:
        1. Return ONLY valid, complete HTML code containing inline CSS and JavaScript.
        2. Do NOT use markdown code blocks (like \`\`\`html). Just return the raw HTML string starting with <!DOCTYPE html>.
        3. The game should present an image (using emojis or simple CSS shapes) or a clue related to the topic, and ask the user to spell the word.
        4. ${difficultyInstructions[difficulty]}
        5. Provide a text input or clickable letter tiles for spelling.
        6. Include immediate visual and audio (optional) feedback for correct or incorrect spelling.
        7. Keep track of the score.
        8. Make it visually appealing with bright colors, large text, and simple controls suitable for young children.
        9. Ensure the game logic is robust and doesn't crash.`;
      } else {
        prompt = `Create a fun, interactive, and educational web game for kids about: "${topic}".
        
        Requirements:
        1. Return ONLY valid, complete HTML code containing inline CSS and JavaScript.
        2. Do NOT use markdown code blocks (like \`\`\`html). Just return the raw HTML string starting with <!DOCTYPE html>.
        3. The game should be fully playable in an iframe.
        4. Make it visually appealing with bright colors, large text, and simple controls suitable for young children.
        5. Include a clear win state or score.
        6. Ensure the game logic is robust and doesn't crash.
        7. Add simple animations if possible.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      let html = response.text || '';
      // Clean up markdown if the model accidentally included it
      if (html.startsWith('```html')) {
        html = html.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (html.startsWith('```')) {
        html = html.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      setGameHtml(html);
    } catch (err) {
      console.error("Failed to generate game:", err);
      setError("Oops! The magic game machine had a hiccup. Try again!");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 h-full flex flex-col">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <h2 className="text-4xl font-bold tracking-tight mb-4 text-amber-900 dark:text-amber-100">
          Magic Game Maker! 🎮
        </h2>
        <p className="text-lg text-amber-700 dark:text-amber-300 max-w-2xl mx-auto">
          Tell me what you want to learn about, and I'll make a fun game just for you!
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto mb-8">
        
        {/* Game Mode Selector */}
        <div className="flex bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-2xl w-full max-w-md">
          <button
            onClick={() => setGameMode('general')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all",
              gameMode === 'general' 
                ? "bg-white dark:bg-[#1C1C1E] text-amber-600 dark:text-amber-400 shadow-sm" 
                : "text-amber-700/70 dark:text-amber-300/70 hover:text-amber-700 dark:hover:text-amber-300"
            )}
          >
            <Gamepad2 className="w-4 h-4" />
            General Game
          </button>
          <button
            onClick={() => setGameMode('spelling')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all",
              gameMode === 'spelling' 
                ? "bg-white dark:bg-[#1C1C1E] text-amber-600 dark:text-amber-400 shadow-sm" 
                : "text-amber-700/70 dark:text-amber-300/70 hover:text-amber-700 dark:hover:text-amber-300"
            )}
          >
            <SpellCheck className="w-4 h-4" />
            Spelling Bee
          </button>
        </div>

        {/* Difficulty Selector (Only for Spelling Mode) */}
        {gameMode === 'spelling' && (
          <div className="flex items-center gap-3 w-full max-w-md justify-center">
            <Settings2 className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-amber-800 dark:text-amber-200">Difficulty:</span>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-bold capitalize transition-all border-2",
                    difficulty === level
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-transparent border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:border-amber-400"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative w-full">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateGame()}
            placeholder={gameMode === 'spelling' ? "e.g., Animals, Colors, Space..." : "e.g., Dinosaurs, Space, Addition..."}
            className="w-full px-6 py-4 pr-16 text-lg rounded-2xl border-2 border-amber-200 dark:border-amber-900/30 bg-white dark:bg-[#1C1C1E] text-amber-900 dark:text-amber-100 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all shadow-sm"
          />
          <VoiceInputButton 
            onResult={setTopic}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-100 text-amber-600 hover:bg-amber-200"
          />
        </div>

        <button
          onClick={generateGame}
          disabled={isGenerating || !topic.trim()}
          className="flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xl transition-all shadow-lg shadow-amber-500/30 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Making Magic...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              Create Game!
            </>
          )}
        </button>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 text-center w-full font-medium">
            {error}
          </div>
        )}
      </div>

      {/* Game Container */}
      <div className="flex-1 w-full bg-white dark:bg-[#1C1C1E] rounded-3xl border-4 border-amber-200 dark:border-amber-900/30 shadow-xl overflow-hidden relative min-h-[500px]">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50/50 dark:bg-amber-900/10">
            <Loader2 className="w-16 h-16 text-amber-500 animate-spin mb-4" />
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300 animate-pulse">
              Building your game...
            </p>
          </div>
        ) : gameHtml ? (
          <iframe
            srcDoc={gameHtml}
            className="w-full h-full border-none"
            title="Generated Educational Game"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-300 dark:text-amber-700/50">
            <Play className="w-24 h-24 mb-4 opacity-50" />
            <p className="text-2xl font-bold opacity-50">Your game will appear here!</p>
          </div>
        )}
      </div>
    </div>
  );
}
