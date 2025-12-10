import React, { useState, useCallback } from 'react';
import { generateLuxuryWish } from '../services/geminiService';
import { WishState } from '../types';

interface UIProps {
  onIgnite: () => void;
  onScatter: () => void;
  isFormed: boolean;
}

export const UI: React.FC<UIProps> = ({ onIgnite, onScatter, isFormed }) => {
  const [prompt, setPrompt] = useState('');
  const [wishState, setWishState] = useState<WishState>({
    isLoading: false,
    text: null,
    error: null,
  });

  const handleGenerateWish = useCallback(async () => {
    // If not formed, form the tree immediately for visual feedback
    if (!isFormed) onIgnite();

    if (!prompt.trim()) return;

    setWishState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await generateLuxuryWish(prompt);
      setWishState({ isLoading: false, text: result, error: null });
    } catch (e) {
      setWishState({ isLoading: false, text: null, error: "The stars are misaligned. Try again." });
    }
  }, [prompt, onIgnite, isFormed]);

  const handleReset = () => {
    setWishState({ isLoading: false, text: null, error: null });
    setPrompt('');
    onScatter();
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8 md:p-12">
      
      {/* Header */}
      <header className="flex flex-col items-center md:items-start animate-fade-in pointer-events-auto cursor-pointer" onClick={handleReset} title="Click to Scatter">
        <h1 className="font-[Cinzel] text-4xl md:text-6xl text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)] tracking-widest uppercase transition-colors hover:text-amber-100">
          Arix
        </h1>
        <p className="font-[Playfair_Display] text-emerald-200 text-sm md:text-lg italic tracking-wide mt-2">
          Signature Holiday Collection
        </p>
      </header>

      {/* Main Interaction Area */}
      <main className="flex flex-col items-center justify-center flex-grow pointer-events-auto">
        {wishState.text && (
            <div className="mb-8 p-8 max-w-2xl text-center bg-black/40 backdrop-blur-md border border-amber-500/30 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-700 animate-slide-up">
                 <p className="font-[Playfair_Display] text-2xl md:text-4xl text-amber-100 leading-relaxed italic">
                    "{wishState.text}"
                 </p>
                 <button 
                    onClick={handleReset}
                    className="mt-4 text-xs font-[Cinzel] text-emerald-400 hover:text-amber-300 uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                 >
                    Make Another Wish
                 </button>
            </div>
        )}
      </main>

      {/* Footer / Input */}
      <footer className={`pointer-events-auto flex flex-col items-center w-full max-w-md mx-auto transition-all duration-700 ${wishState.text ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100'}`}>
        <div className="w-full bg-emerald-950/80 backdrop-blur-xl border border-amber-500/40 p-1 rounded-2xl shadow-2xl flex relative overflow-hidden group transition-all hover:border-amber-400">
            {/* Glossy sheen effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] animate-shimmer" />

            <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What brings you joy? (e.g. Snow)"
                className="bg-transparent text-amber-100 placeholder-emerald-400/50 px-6 py-4 flex-grow outline-none font-[Playfair_Display] text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateWish()}
            />
            <button 
                onClick={handleGenerateWish}
                disabled={wishState.isLoading}
                className="bg-gradient-to-br from-amber-300 to-amber-600 text-emerald-950 font-[Cinzel] font-bold py-3 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
                {wishState.isLoading ? 'Crafting...' : 'Ignite'}
            </button>
        </div>
        <p className="mt-4 text-emerald-500/60 text-xs font-[Cinzel] tracking-widest uppercase">
            Powered by Gemini • Arix Interactive
        </p>
      </footer>
      
      {/* Styles for simple animations */}
      <style jsx>{`
        @keyframes shimmer {
            0% { transform: translateX(-150%) skewX(12deg); }
            100% { transform: translateX(150%) skewX(12deg); }
        }
        .animate-shimmer {
            animation: shimmer 3s infinite linear;
        }
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
            animation: slide-up 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};