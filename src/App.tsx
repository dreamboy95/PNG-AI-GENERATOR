import React, { useState } from 'react';
import { GenerateSection } from './components/GenerateSection';
import { UpscaleSection } from './components/UpscaleSection';
import { ApiSettings } from './components/ApiSettings';
import { ScissorsLineDashed, Wand2, ArrowUpRight, History, Download, Settings } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'generate' | 'upscale' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');

  return (
    <>
      <div className="flex flex-col h-screen w-full bg-[#FDFCFE] text-slate-900 font-sans overflow-hidden">
        {/* Top Navbar */}
        <nav className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white bg-opacity-80 backdrop-blur-md sticky top-0 z-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <ScissorsLineDashed className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 tracking-tight">
              PNG AI GENERATOR
            </span>
          </div>
          
          <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
            <NavTab label="Generate" active={activeTab === 'generate'} onClick={() => setActiveTab('generate')} />
            <NavTab label="Upscale" active={activeTab === 'upscale'} onClick={() => setActiveTab('upscale')} />
            <NavTab label="API Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
              <span>Export All</span>
              <Download className="w-4 h-4 stroke-2" />
            </button>
          </div>
        </nav>

        {/* Main Area */}
        <main className="flex-1 flex overflow-hidden relative bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              {activeTab === 'generate' && <GenerateSection />}
              {activeTab === 'upscale' && <UpscaleSection />}
              {activeTab === 'settings' && <ApiSettings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}

function NavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2 rounded-full text-sm transition-all",
        active 
          ? "font-bold bg-white shadow-sm text-indigo-600" 
          : "font-medium text-slate-500 hover:text-slate-700"
      )}
    >
      {label}
    </button>
  );
}
