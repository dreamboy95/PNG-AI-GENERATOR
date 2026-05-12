import React, { useState, useEffect } from 'react';
import { Key } from 'lucide-react';

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    // Check if the user has selected an API key
    const checkKey = async () => {
      try {
        if (typeof window !== 'undefined' && 'aistudio' in window) {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } else {
          // If not in AI studio preview, assume we have a key from env
          setHasKey(true);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
        setHasKey(true); // Fallback
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      setIsSelecting(true);
      if (typeof window !== 'undefined' && 'aistudio' in window) {
        await (window as any).aistudio.openSelectKey();
        // Assume success to avoid race conditions
        setHasKey(true);
      }
    } catch (e) {
      console.error("Error selecting key:", e);
    } finally {
      setIsSelecting(false);
    }
  };

  if (hasKey === null) {
    return <div className="flex h-screen items-center justify-center bg-[#FDFCFE] text-slate-800 font-bold">Loading...</div>;
  }

  if (!hasKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFCFE] text-slate-900 p-4">
        <div className="max-w-md w-full bg-white border-2 border-slate-100 rounded-3xl p-10 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 tracking-tight">
              API KEY REQUIRED
            </h2>
            <p className="text-slate-500 mb-6 font-medium leading-relaxed">
              To use the advanced image generation features (Gemini 3.1 Flash Image Output), you need to select a billing-enabled Google Cloud API key.
            </p>
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest mb-8 inline-block hover:underline"
            >
              Learn about API key billing
            </a>
            <button
              onClick={handleSelectKey}
              disabled={isSelecting}
              className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white font-black py-4 px-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-200 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isSelecting ? 'SELECTING...' : 'SELECT API KEY'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
