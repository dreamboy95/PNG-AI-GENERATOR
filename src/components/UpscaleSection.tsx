import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Switch, Label } from './ui/Forms';
import { UploadCloud, Zap, Download } from 'lucide-react';
import { fileToBase64, cn } from '../lib/utils';
import { upscaleImage } from '../lib/upscale';

export function UpscaleSection() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [scale, setScale] = useState<number>(2);
  const [enhance, setEnhance] = useState(true);
  const [reduceNoise, setReduceNoise] = useState(false);
  
  // Slider state
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setSourceImage(base64);
    setResultImage(null);
  };

  const handleUpscale = async () => {
    if (!sourceImage) return;
    setIsProcessing(true);
    try {
      // Simulate slow AI upscaling for UX
      await new Promise(r => setTimeout(r, 1500));
      const result = await upscaleImage(sourceImage, scale, enhance, reduceNoise);
      setResultImage(result);
      setSliderPos(50);
    } catch (e) {
      console.error(e);
      alert("Failed to upscale image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!resultImage || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `upscaled-${scale}x.png`;
    a.click();
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
      {/* Configure Panel */}
      <aside className="w-full md:w-80 lg:w-[350px] border-r border-slate-100 bg-white p-5 overflow-y-auto shrink-0 flex flex-col gap-6">
        
        {/* Upload Section */}
        <section className="space-y-3">
          <Label>Upload Source</Label>
          <div 
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleUpload} />
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
              <UploadCloud className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-sm font-bold text-slate-700">Select Image to Upscale</p>
            <p className="text-xs text-slate-400 mt-1">For best results, upload uncompressed formats</p>
          </div>
        </section>

        {/* Options */}
        <section className="space-y-4">
          <Label>Enhancement Options</Label>
          
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Upscale Factor</div>
            <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {[2, 4, 8].map(s => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                    scale === s 
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 transition-colors">
              <div>
                <Label className="text-slate-700 normal-case tracking-normal">AI Sharpness & Details</Label>
                <p className="text-[10px] text-slate-400 mt-0.5">Enhance faces and text clarity</p>
              </div>
              <Switch checked={enhance} onChange={e => setEnhance(e.target.checked)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 transition-colors">
              <div>
                <Label className="text-slate-700 normal-case tracking-normal">Denoise Image</Label>
                <p className="text-[10px] text-slate-400 mt-0.5">Reduces grain and artifacting</p>
              </div>
              <Switch checked={reduceNoise} onChange={e => setReduceNoise(e.target.checked)} />
            </div>
          </div>
        </section>

        <button 
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-2xl text-white font-black text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-auto disabled:opacity-50 disabled:scale-100 cursor-pointer disabled:cursor-not-allowed"
          onClick={handleUpscale}
          disabled={isProcessing || !sourceImage}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
               <Zap className="w-5 h-5 animate-pulse text-indigo-300" /> PROCESSING...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              START UPSCALE <Zap className="w-5 h-5" />
            </span>
          )}
        </button>
      </aside>

      {/* Comparison Panel */}
      <div className="flex-1 bg-slate-50 p-6 flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">Before / After</h2>
          {resultImage && (
            <Button variant="secondary" onClick={downloadImage} className="flex items-center gap-2 border-slate-200 font-bold">
              <Download className="w-4 h-4 text-indigo-600" /> Save HD Result
            </Button>
          )}
        </div>

        <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-slate-200 rounded-3xl border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative">
          {/* Empty State */}
          {!sourceImage && (
            <div className="text-slate-400 font-bold text-sm bg-white/80 backdrop-blur px-6 py-3 rounded-full shadow-sm">Upload an image to preview enhancement</div>
          )}
          
          {/* Loading State */}
          {isProcessing && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin drop-shadow-md"></div>
              <p className="text-indigo-600 font-black uppercase tracking-wide">Reconstructing details...</p>
            </div>
          )}

          {/* Comparison Slider */}
          {sourceImage && (
            <div 
              ref={sliderRef}
              className="relative w-full h-full cursor-ew-resize select-none touch-none"
              onMouseMove={handleMouseMove}
              onTouchMove={handleMouseMove}
            >
              {/* After (Bottom Layer) */}
              {resultImage ? (
                <div 
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat w-full h-full"
                  style={{ backgroundImage: `url(${resultImage})` }}
                />
              ) : (
                 <div 
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat w-full h-full opacity-40 blur-[2px]"
                  style={{ backgroundImage: `url(${sourceImage})` }}
                />
              )}

              {/* Before (Top Layer) clipped via width */}
              <div 
                className="absolute inset-y-0 left-0 overflow-hidden bg-slate-100"
                style={{ width: `${sliderPos}%` }}
              >
                <div 
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat h-full filter relative"
                  style={{ backgroundImage: `url(${sourceImage})`, width: sliderRef.current?.offsetWidth || '100vw' }}
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-repeat bg-slate-200 -z-10" />
                </div>
              </div>

              {/* Slider Line & Handle */}
              {resultImage && (
                <div 
                  className="absolute top-0 bottom-0 w-[3px] bg-white cursor-ew-resize shadow-[0_0_15px_rgba(0,0,0,0.3)] z-20 transition-all duration-75"
                  style={{ left: `calc(${sliderPos}% - 1.5px)` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
                    <div className="flex gap-1.5">
                      <div className="w-0.5 h-4 bg-slate-300 rounded-full"></div>
                      <div className="w-0.5 h-4 bg-slate-300 rounded-full"></div>
                    </div>
                  </div>
                  {/* Labels */}
                  <div className="absolute top-6 -translate-x-full pr-4 text-[10px] font-black text-slate-700 bg-white/90 backdrop-blur px-3 py-1 rounded-l-full shadow-sm drop-shadow-sm tracking-widest mr-2">BEFORE</div>
                  <div className="absolute top-6 translate-x-1 pl-4 text-[10px] font-black text-indigo-600 bg-white/90 backdrop-blur px-3 py-1 rounded-r-full shadow-sm drop-shadow-sm tracking-widest ml-2">AFTER</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
