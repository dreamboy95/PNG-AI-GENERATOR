import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Sparkles, Upload, Copy, Check, Loader2, Image as ImageIcon, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { describeImage } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';

export function ImageToPromptSection() {
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({
          base64: reader.result as string,
          mimeType: file.type
        });
        setPrompt("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const generatedPrompt = await describeImage(selectedImage.base64, selectedImage.mimeType);
      setPrompt(generatedPrompt);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to generate prompt");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
      {/* Upload & Controls */}
      <aside className="w-full md:w-[400px] border-r border-slate-100 bg-white p-6 overflow-y-auto shrink-0 flex flex-col gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Image to Prompt
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Upload an image to extract a descriptive prompt that you can use to generate similar results.
          </p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4 cursor-pointer transition-all overflow-hidden relative",
            "hover:border-indigo-400 hover:bg-indigo-50/30 group"
          )}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            hidden 
            accept="image/*" 
          />
          
          {selectedImage ? (
            <img 
              src={selectedImage.base64} 
              alt="Preview" 
              className="w-full h-full object-contain drop-shadow-md rounded-lg" 
            />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-indigo-50 mb-3 transition-colors">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
              </div>
              <p className="text-sm font-black text-slate-700">Click to Upload Image</p>
              <p className="text-xs font-medium text-slate-500 mt-1">PNG, JPG or WEBP</p>
            </>
          )}

          {selectedImage && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <p className="text-white text-xs font-black uppercase tracking-widest">Change Image</p>
            </div>
          )}
        </div>

        <Button 
          disabled={!selectedImage || isProcessing}
          onClick={handleGeneratePrompt}
          className="w-full py-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white font-black shadow-xl shadow-indigo-100"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ANALYZING IMAGE...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              DESCRIBE IMAGE
            </>
          )}
        </Button>
      </aside>

      {/* Result Display */}
      <div className="flex-1 bg-[#FDFCFE] p-8 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {prompt ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Generated AI Prompt</h3>
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-indigo-200 transition-all flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span className="text-xs font-bold text-slate-600">{copied ? "Copied!" : "Copy Prompt"}</span>
                </button>
              </div>

              <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-xl shadow-indigo-50/50 relative">
                 <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Wand2 className="w-4 h-4" />
                 </div>
                 <p className="text-lg font-medium text-slate-700 leading-relaxed italic">
                    "{prompt}"
                 </p>
              </div>

              <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-4">
                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-indigo-50">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                 </div>
                 <div>
                    <p className="text-xs font-black text-indigo-900 uppercase mb-1">How to use this</p>
                    <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                      Copy this prompt and paste it into the <b>Single Prompts</b> generator. You can modify parts of it to create variations of this style or subject.
                    </p>
                 </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="w-10 h-10 text-indigo-200" />
              </div>
              <p className="font-bold text-lg text-slate-600">No prompt generated yet</p>
              <p className="text-sm mt-2 max-w-sm text-center">Upload an image and click analyze to see the AI's technical description.</p>
            </div>
          )}
        </AnimatePresence>

        {/* Decorative elements */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
}
