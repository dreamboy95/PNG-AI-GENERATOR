import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle2, XCircle, AlertCircle, Zap } from 'lucide-react';
import { Input, Label } from './ui/Forms';
import { testGeminiConnection } from '../lib/gemini';
import { cn } from '../lib/utils';

export function ApiSettings() {
  const [apiKey, setApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'missing' | 'connected' | 'invalid'>('missing');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key') || "";
    if (saved) {
      setApiKey(saved);
      // Assume connected if we have it initially, or user can re-test
      setStatus('connected');
    } else {
      setStatus('missing');
    }
  }, []);

  const handleSave = () => {
    const key = String(apiKey || "").trim();
    if (!key) {
      setStatus('missing');
      localStorage.removeItem('gemini_api_key');
      return;
    }
    
    // Save first
    localStorage.setItem('gemini_api_key', key);
    
    // Then test
    handleTest(key);
  };

  const handleTest = async (keyToTest?: string) => {
    const key = String(keyToTest || apiKey || "").trim();
    if (!key) {
      setStatus('missing');
      return;
    }

    setIsTesting(true);
    try {
      const valid = await testGeminiConnection(key);
      if (valid) {
        setStatus('connected');
        localStorage.setItem('gemini_api_key', key);
      } else {
        setStatus('invalid');
      }
    } catch (e) {
      console.error(e);
      setStatus('invalid');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-6 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-lg bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <Key className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 tracking-tight uppercase">
                API Settings
              </h2>
              <p className="text-sm font-bold text-slate-400">Configure your Gemini API access</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="mb-2">Gemini API Key</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-12 text-sm font-mono tracking-wider h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Status Indicator */}
            <div className={cn(
              "p-3 rounded-xl border flex items-center gap-3 text-sm font-bold transition-all",
              status === 'missing' && "bg-slate-50 border-slate-200 text-slate-500",
              status === 'connected' && "bg-emerald-50 border-emerald-200 text-emerald-600",
              status === 'invalid' && "bg-red-50 border-red-200 text-red-600"
            )}>
              {status === 'missing' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              {status === 'connected' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
              {status === 'invalid' && <XCircle className="w-5 h-5 flex-shrink-0" />}
              
              <span>
                {status === 'missing' && "Status: No API Key Configured"}
                {status === 'connected' && "Status: Connected Successfully"}
                {status === 'invalid' && "Status: Invalid API Key"}
              </span>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Key
              </button>
              <button
                onClick={() => handleTest()}
                disabled={isTesting || !apiKey}
                className="flex-1 py-3 bg-white text-indigo-600 border-2 border-slate-100 rounded-xl font-black text-sm shadow-sm hover:border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className={cn("w-4 h-4", isTesting && "animate-pulse")} /> 
                {isTesting ? "Testing..." : "Test Connection"}
              </button>
            </div>
            
            <a
              href="https://ai.google.dev/gemini-api/docs/api-key"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 tracking-widest uppercase block text-center mt-6 transition-colors hover:underline"
            >
              Get your API key from Google AI Studio &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
