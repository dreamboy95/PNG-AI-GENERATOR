import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Input, Switch, Label } from './ui/Forms';
import { Sparkles, FileText, Download, Trash2, X, Archive, Play, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateImageFromPrompt, AspectRatio, Quality } from '../lib/gemini';
import { removeBackgroundLocal } from '../lib/backgroundRemoval';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type QueueItem = {
  id: string;
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
  resultUrl?: string;
  error?: string;
};

export function BulkGenerateSection() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("1K");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [makeTransparent, setMakeTransparent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    processTextToQueue(text);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/plain" || file.name.endsWith(".txt"))) {
      const text = await file.text();
      processTextToQueue(text);
    }
  };

  const processTextToQueue = (text: string) => {
    const lines = text.split(/\r?\n/);
    const newItems: QueueItem[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        newItems.push({
          id: Math.random().toString(36).substring(7) + Date.now(),
          prompt: trimmed,
          status: 'pending'
        });
      }
    });

    setQueue(prev => {
      // deduplicate against existing queue
      const existingPrompts = new Set(prev.map(p => p.prompt));
      const filtered = newItems.filter(item => !existingPrompts.has(item.prompt));
      return [...prev, ...filtered];
    });
  };

  const removeQueueItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };
  
  const clearQueue = () => {
    setQueue([]);
    setIsProcessing(false);
  };

  // The Bulk Engine
  const startGeneration = async () => {
    if (queue.length === 0) return;
    setIsProcessing(true);
    setIsPaused(false);
  };
  
  React.useEffect(() => {
    if (isProcessing && !isPaused) {
      const generatingCount = queue.filter(q => q.status === 'generating').length;
      if (generatingCount === 0) {
        processNextInQueue();
      }
    }
  }, [isProcessing, isPaused, queue]);
  
  const processNextInQueue = async () => {
    const nextItemIndex = queue.findIndex(item => item.status === 'pending');
    
    if (nextItemIndex === -1) {
      const isStillGenerating = queue.some(item => item.status === 'generating');
      if (!isStillGenerating) {
        setIsProcessing(false);
      }
      return;
    }
    
    const item = queue[nextItemIndex];
    
    // Mark as generating
    setQueue(prev => prev.map((q, idx) => idx === nextItemIndex ? { ...q, status: 'generating' } : q));
    
    try {
      const basePrompt = item.prompt;
      const finalPrompt = enhancePrompt ? `${basePrompt}, highly detailed, masterpiece, best quality, ultra-detailed` : basePrompt;
      let generatedBase64 = await generateImageFromPrompt(finalPrompt, negativePrompt, aspectRatio, quality);
      
      if (makeTransparent) {
        try {
            const transparentBase64 = await removeBackgroundLocal(generatedBase64);
            generatedBase64 = transparentBase64;
        } catch (e) {
          console.error("Bg removal failed for item:", item.id, e);
        }
      }
      
      // Update as done
      setQueue(prev => prev.map((q) => q.id === item.id ? { ...q, status: 'done', resultUrl: generatedBase64 } : q));
      
    } catch (e: any) {
      console.error("Failed to generate item:", item.id, e);
      setQueue(prev => prev.map((q) => q.id === item.id ? { ...q, status: 'failed', error: e.message || 'Generation failed' } : q));
    }
  };

  const downloadAllZip = async () => {
    const doneItems = queue.filter(q => q.status === 'done' && q.resultUrl);
    if (doneItems.length === 0) return;
    
    const zip = new JSZip();
    doneItems.forEach((item, idx) => {
      if (item.resultUrl) {
        const parts = item.resultUrl.split('base64,');
        if (parts.length === 2) {
          // safe filename
          const safeName = item.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
          zip.file(`${idx + 1}-${safeName}.png`, parts[1], { base64: true });
        }
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `bulk-images-${Date.now()}.zip`);
  };

  const retryFailed = () => {
    setQueue(prev => prev.map(q => q.status === 'failed' ? { ...q, status: 'pending', error: undefined } : q));
    setIsProcessing(true);
    setIsPaused(false);
  };

  const cancelProcessing = () => {
    setIsPaused(true);
    setIsProcessing(false);
    setQueue(prev => prev.map(q => q.status === 'generating' ? { ...q, status: 'pending' } : q));
  };
  
  const downloadSingle = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    const safeName = name.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeName}.png`;
    a.click();
  };

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const generateCount = queue.filter(q => q.status === 'generating').length;
  const doneCount = queue.filter(q => q.status === 'done').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;
  const progressPercent = queue.length > 0 ? (doneCount + failedCount) / queue.length * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
      {/* Configure Panel */}
      <aside className="w-full md:w-[380px] lg:w-[420px] border-r border-slate-100 bg-white p-5 overflow-y-auto shrink-0 flex flex-col gap-6">
        
        {/* Source Section */}
        <section className="space-y-4">
          <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600"/> Batch Prompts</Label>
          
          <div 
            className={cn(
              "border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group",
              isProcessing ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60" : "border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30"
            )}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={isProcessing ? undefined : handleDragOver}
            onDrop={isProcessing ? undefined : handleDrop}
          >
            <input type="file" hidden accept=".txt,text/plain" ref={fileInputRef} onChange={handleFileUpload} disabled={isProcessing} />
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-indigo-50 mb-3 transition-colors border border-slate-100">
              <FileText className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
            </div>
            <p className="text-sm font-black text-slate-700">Upload .TXT File</p>
            <p className="text-xs font-medium text-slate-500 mt-1">1 prompt per line. Drag & drop.</p>
          </div>
          
          {queue.length > 0 && (
             <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-600 uppercase">Queue Stats</span>
                     {!isProcessing && <button onClick={clearQueue} className="text-xs font-bold text-red-500 hover:text-red-700">Clear All</button>}
                 </div>
                 
                 <div className="grid grid-cols-4 gap-2 text-center text-xs">
                     <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                         <div className="font-black text-slate-400 mb-1">TOTAL</div>
                         <div className="font-bold text-slate-700">{queue.length}</div>
                     </div>
                     <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                         <div className="font-black text-slate-400 mb-1">PENDING</div>
                         <div className="font-bold text-amber-600">{pendingCount}</div>
                     </div>
                     <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                         <div className="font-black text-slate-400 mb-1">DONE</div>
                         <div className="font-bold text-emerald-600">{doneCount}</div>
                     </div>
                     <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                         <div className="font-black text-slate-400 mb-1">FAILED</div>
                         <div className="font-bold text-red-600">{failedCount}</div>
                     </div>
                 </div>
                 
                 {queue.length > 0 && (
                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                       <motion.div 
                         className="h-full bg-emerald-500"
                         initial={{ width: 0 }}
                         animate={{ width: `${progressPercent}%` }}
                         transition={{ duration: 0.3 }}
                       />
                   </div>
                 )}
             </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="space-y-4 opacity-100 transition-opacity" style={isProcessing ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
          <Label>Bulk Settings</Label>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Aspect Ratio for All</div>
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
                        "h-8 w-full border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors bg-white",
                        aspectRatio === r.id && "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Quality</div>
                  <select 
                    value={quality} 
                    onChange={e => setQuality(e.target.value as Quality)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="512px">Standard (512px)</option>
                    <option value="1K">HD (1K)</option>
                    <option value="2K">Ultra HD (2K)</option>
                    <option value="4K">Studio (4K)</option>
                  </select>
              </div>
              
              <div>
                 <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Global Negative Prompt</div>
                 <Input 
                  placeholder="e.g. blurry, deformed" 
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  className="bg-white text-xs italic border-slate-200"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl transition-colors">
                  <span className="text-xs font-bold text-slate-600 ml-1">Auto Enhance Prompts</span>
                  <Switch checked={enhancePrompt} onChange={e => setEnhancePrompt(e.target.checked)} />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl transition-colors">
                  <span className="text-xs font-bold text-slate-600 ml-1">Remove Backgrounds</span>
                  <Switch checked={makeTransparent} onChange={e => setMakeTransparent(e.target.checked)} />
                </div>
              </div>
          </div>
        </section>

        <div className="mt-auto pt-4 space-y-3">
            {isProcessing ? (
              <button 
                  className="w-full py-4 bg-slate-800 rounded-2xl text-white font-black text-sm shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                  onClick={cancelProcessing}
              >
                  <Loader2 className="w-5 h-5 animate-spin" /> CANCEL BULK GENERATION
              </button>
            ) : queue.length > 0 && pendingCount > 0 ? (
               <button 
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-2xl text-white font-black text-sm shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  onClick={startGeneration}
              >
                  <Play className="w-5 h-5 fill-current" /> START GENERATING {pendingCount} PROMPTS
              </button>
            ) : failedCount > 0 ? (
               <button 
                  className="w-full py-4 bg-amber-500 rounded-2xl text-white font-black text-sm shadow-lg shadow-amber-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  onClick={retryFailed}
              >
                  <RefreshCw className="w-5 h-5" /> RETRY {failedCount} FAILED PROMPTS
              </button>
            ) : queue.length > 0 && pendingCount === 0 ? (
              <div className="w-full py-4 bg-emerald-500 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2">
                 ALL DONE! ({doneCount} IMAGES)
              </div>
            ) : null}
            
            {doneCount > 0 && !isProcessing && (
               <Button variant="secondary" className="w-full py-6 font-bold" onClick={downloadAllZip}>
                  <Archive className="w-4 h-4 mr-2" /> EXPORT AS ZIP
               </Button>
            )}
        </div>
      </aside>

      {/* Gallery Panel */}
      <div className="flex-1 bg-[#FDFCFE] p-6 flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">Bulk Queue</h2>
        </div>
        
        {queue.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-indigo-200" />
            </div>
            <p className="font-bold text-lg text-slate-600">Upload a TXT file to start</p>
            <p className="text-sm mt-2 max-w-sm text-center">Your file should contain one prompt per line. The system will automatically generate all images.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 xl:grid-cols-2 gap-4 content-start">
             <AnimatePresence>
              {queue.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                      "bg-white rounded-2xl border-2 p-4 shadow-sm flex flex-col sm:flex-row gap-4",
                      item.status === 'generating' ? "border-indigo-400 bg-indigo-50/30 shadow-md shadow-indigo-100" :
                      item.status === 'failed' ? "border-red-200 bg-red-50/30" :
                      item.status === 'done' ? "border-emerald-200 bg-emerald-50/10" :
                      "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="w-full sm:w-1/3 aspect-square bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative shrink-0 flex flex-col items-center justify-center">
                     {item.status === 'pending' && <span className="text-xs font-bold text-slate-300">WAITING</span>}
                     {item.status === 'generating' && (
                         <div className="flex flex-col items-center gap-2">
                             <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                             <span className="text-[10px] font-black text-indigo-600 animate-pulse">GENERATING</span>
                         </div>
                     )}
                     {item.status === 'failed' && (
                         <div className="flex flex-col items-center gap-2 text-center p-2">
                             <AlertTriangle className="w-6 h-6 text-red-400" />
                             <span className="text-[10px] font-bold text-red-500">FAILED</span>
                         </div>
                     )}
                     {item.status === 'done' && item.resultUrl && (
                        <>
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-repeat bg-slate-200 opacity-50 pointer-events-none"></div>
                           <img src={item.resultUrl} className="relative w-full h-full object-contain p-2 drop-shadow-md" alt="Result" />
                        </>
                     )}
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black shrink-0">
                              {idx + 1}
                          </span>
                          {!isProcessing && item.status !== 'done' && (
                              <button onClick={() => removeQueueItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"><X className="w-4 h-4" /></button>
                          )}
                      </div>
                      <p className="text-sm font-medium text-slate-700 line-clamp-4 leading-relaxed mb-4">{item.prompt}</p>
                      
                      {item.error && (
                          <div className="mt-auto text-[10px] font-medium text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                              {item.error}
                          </div>
                      )}
                      
                      {item.status === 'done' && item.resultUrl && (
                          <div className="mt-auto flex items-center gap-2 pt-2 border-t border-slate-100 w-full">
                               <button onClick={() => downloadSingle(item.resultUrl!, item.prompt)} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1">
                                   <Download className="w-3 h-3" /> PNG
                               </button>
                               <button onClick={() => removeQueueItem(item.id)} className="p-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-colors border border-slate-100">
                                   <Trash2 className="w-4 h-4" />
                               </button>
                          </div>
                      )}
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
