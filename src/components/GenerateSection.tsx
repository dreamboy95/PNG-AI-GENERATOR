import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Input, Textarea, Switch, Label } from './ui/Forms';
import { Sparkles, ImagePlus, Download, Trash2, X, Archive } from 'lucide-react';
import { cn, fileToBase64 } from '../lib/utils';
import { generateImageFromPrompt, editImageFromPrompt, AspectRatio, Quality, ImageStyle } from '../lib/gemini';
import { removeBackgroundLocal } from '../lib/backgroundRemoval';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function GenerateSection() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  
  const [sourceImage, setSourceImage] = useState<{ url: string; file: File; base64: string; mimeType: string } | null>(null);
  
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("1K");
  const [count, setCount] = useState<number>(1);
  const [makeTransparent, setMakeTransparent] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{ id: string; url: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const base64 = await fileToBase64(file);
    setSourceImage({ url, file, base64, mimeType: file.type });
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      setSourceImage({ url, file, base64, mimeType: file.type });
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !sourceImage) return;
    setIsGenerating(true);
    
    try {
      let basePrompt = prompt;
      const finalPrompt = enhancePrompt ? `${basePrompt}, highly detailed, masterpiece, best quality, ultra-detailed` : basePrompt;
      
      const promises = Array.from({ length: count }).map(async () => {
        let generatedBase64 = "";
        
        if (sourceImage) {
          generatedBase64 = await editImageFromPrompt(finalPrompt, sourceImage.base64, sourceImage.mimeType, aspectRatio, quality);
        } else {
          generatedBase64 = await generateImageFromPrompt(finalPrompt, negativePrompt, aspectRatio, quality);
        }

        if (makeTransparent) {
          try {
             const transparentBase64 = await removeBackgroundLocal(generatedBase64);
             return transparentBase64;
          } catch (e) {
            console.error("Bg removal failed:", e);
            // Fallback to original
            return generatedBase64;
          }
        }
        
        return generatedBase64;
      });

      const generatedImages = await Promise.all(promises);
      setResults(prev => [
        ...generatedImages.map(img => ({ id: Math.random().toString(36).substring(7), url: img })),
        ...prev
      ]);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, format: 'png' | 'webp' = 'png') => {
    // Basic download, convert base64 to blob if needed, but anchor with download works for base64
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${Date.now()}.${format}`;
    a.click();
  };

  const downloadAllZip = async () => {
    if (results.length === 0) return;
    const zip = new JSZip();
    results.forEach((img, idx) => {
      // Split "data:image/png;base64,..."
      const parts = img.url.split('base64,');
      if (parts.length === 2) {
        zip.file(`image-${idx + 1}.png`, parts[1], { base64: true });
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `images-${Date.now()}.zip`);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
      {/* Configure Panel */}
      <aside className="w-full md:w-80 lg:w-[350px] border-r border-slate-100 bg-white p-5 overflow-y-auto shrink-0 flex flex-col gap-6">
        
        {/* Source Section */}
        <section className="space-y-3">
          <Label>Prompt Settings</Label>
          
          <div className="space-y-3">
            <Textarea
              placeholder="Describe your image... (e.g., 'Cute fat cat as a high-quality sticker, 3D render')"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="resize-none h-24 bg-slate-50 border border-slate-200 rounded-xl"
            />
            {sourceImage ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-50 flex items-center justify-center">
                <img src={sourceImage.url} className="max-w-full max-h-full object-contain" alt="Source" />
                <button 
                  onClick={() => setSourceImage(null)}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-red-500 hover:text-white backdrop-blur-sm rounded-lg shadow-sm transition-colors text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/80 backdrop-blur-sm rounded shadow-sm text-[10px] font-bold text-slate-700 uppercase">
                  SOURCE IMAGE
                </div>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group bg-slate-50"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-indigo-50 mb-2 transition-colors">
                  <ImagePlus className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <p className="text-xs font-bold text-slate-600">Upload Image Reference</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Drag & drop JPG, PNG, WEBP</p>
              </div>
            )}
            <Input 
              placeholder="Negative prompt (e.g. blurry, deformed)" 
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              className="bg-slate-50 text-xs italic"
            />
          </div>
        </section>

        {/* Settings Section */}
        <section className="space-y-4">
          <Label>Styling & Config</Label>
          
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aspect Ratio</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "1:1", label: "1:1" },
                  { id: "16:9", label: "16:9" },
                  { id: "9:16", label: "9:16" },
                  { id: "4:5", label: "4:5" },
                  { id: "5:7", label: "5x7" },
                  { id: "8.5:11", label: "Letter" },
                  { id: "A4", label: "A4" }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setAspectRatio(r.id as AspectRatio)}
                    className={cn(
                      "h-8 w-full border-2 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors",
                      aspectRatio === r.id 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quality</div>
                <select 
                  value={quality} 
                  onChange={e => setQuality(e.target.value as Quality)}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="512px">Standard (512px)</option>
                  <option value="1K">HD (1K)</option>
                  <option value="2K">Ultra HD (2K)</option>
                  <option value="4K">Studio (4K)</option>
                </select>
              </div>
              <div className="w-16">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Count</div>
                <Input 
                  type="number" 
                  min={1} 
                  max={10} 
                  value={count} 
                  onChange={e => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} 
                  className="h-9 text-center text-xs font-bold"
                />
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-2 border border-slate-100 hover:border-slate-200 rounded-xl transition-colors">
                <span className="text-xs font-bold text-slate-600 ml-2">Auto Enhance Prompt</span>
                <Switch checked={enhancePrompt} onChange={e => setEnhancePrompt(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
                <span className="text-xs font-bold ml-2 tracking-wide">Transparent Result</span>
                <Switch checked={makeTransparent} onChange={e => setMakeTransparent(e.target.checked)} />
              </div>
            </div>
          </div>
        </section>

        <button 
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-2xl text-white font-black text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-auto disabled:opacity-50 disabled:scale-100 cursor-pointer disabled:cursor-not-allowed"
          onClick={handleGenerate}
          disabled={isGenerating || (!prompt && !sourceImage)}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-spin" /> GENERATING...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              GENERATE PNG <Sparkles className="w-5 h-5" />
            </span>
          )}
        </button>
      </aside>

      {/* Gallery Panel */}
      <div className="flex-1 bg-slate-50 p-6 flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">Studio Gallery</h2>
          {results.length > 0 && (
            <Button variant="secondary" size="sm" onClick={downloadAllZip} className="flex items-center gap-2 border-slate-200 font-bold">
              <Archive className="w-4 h-4 text-indigo-600" /> Export ZIP
            </Button>
          )}
        </div>
        
        {results.length === 0 && !isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-3xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-indigo-300" />
            </div>
            <p className="font-bold">Your generated masterpieces will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pb-10 content-start">
             <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl border-4 border-white shadow-xl bg-slate-100/50 flex flex-col items-center justify-center aspect-square gap-4 backdrop-blur-sm"
                >
                   <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg"></div>
                   <p className="text-sm font-black text-indigo-600 animate-pulse tracking-wide uppercase">Crafting pixels...</p>
                </motion.div>
              )}
              {results.map((res) => (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="group rounded-3xl border-4 border-white shadow-xl bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-repeat bg-slate-200 overflow-hidden relative aspect-square"
                >
                  <img src={res.url} alt="Generated" className="relative w-full h-full object-contain p-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]" />
                  
                  <div className="absolute top-4 left-4">
                    <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg"> 
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> UNIQUE PNG
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-4 p-4 flex flex-col items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white">
                       <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-600" onClick={() => downloadImage(res.url, 'png')} title="Download PNG">
                         <span className="text-[10px] font-black uppercase">PNG</span>
                       </Button>
                       <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-fuchsia-50 text-fuchsia-600" onClick={() => downloadImage(res.url, 'webp')} title="Download WEBP">
                         <span className="text-[10px] font-black uppercase">WEBP</span>
                       </Button>
                       <div className="w-px h-6 bg-slate-200 my-auto mx-1" />
                       <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-red-50 text-red-500" 
                        onClick={() => setResults(results.filter(r => r.id !== res.id))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
