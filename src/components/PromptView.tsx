'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Circle } from 'lucide-react';
import { PRESET_PROMPTS } from '@/lib/constants';
import { isSignedInWithChatGPT, signOutChatGPT, startChatGPTSignIn } from '@/lib/ai';
import { FloorPlan } from '@/lib/types';
import { ElegantShape } from './ui/shape-landing-hero';
import { importDxf } from '@/lib/dxf';
import UsageBadge from './UsageBadge';
import SavedDesigns from './SavedDesigns';
import Showcase from './Showcase';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      delay: 0.3 + i * 0.15,
      ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
    },
  }),
};

interface PromptViewProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  initialPrompt?: string;
  onLoadDesign: (floorPlan: FloorPlan, id: string) => void;
}

export default function PromptView({ onGenerate, isLoading, initialPrompt = '', onLoadDesign }: PromptViewProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [signedIn, setSignedIn] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const dxfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSignedIn(isSignedInWithChatGPT());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      startChatGPTSignIn();
      return;
    }
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  const loadDxfText = (dxfText: string) => {
    const plan = importDxf(dxfText);
    if (!plan || plan.floors[0].rooms.length === 0) {
      setImportError('No rooms found. Use closed polylines for room outlines.');
      return;
    }
    onLoadDesign(plan, `imported_${Date.now()}`);
  };

  const handleDxfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);

    const isDwg = file.name.toLowerCase().endsWith('.dwg');

    if (isDwg) {
      // Convert DWG → DXF server-side, then import
      setImporting(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/convert-dwg', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) {
          setImportError(data.error || 'DWG conversion failed.');
          return;
        }
        loadDxfText(data.dxf);
      } catch {
        setImportError('Could not convert the DWG file.');
      } finally {
        setImporting(false);
      }
      return;
    }

    // Plain DXF
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadDxfText(reader.result as string);
      } catch {
        setImportError('Could not read that DXF file.');
      }
    };
    reader.readAsText(file);
  };

  const handleSignIn = () => {
    startChatGPTSignIn();
  };

  const handleSignOut = async () => {
    await signOutChatGPT();
    setSignedIn(false);
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#0a0a14] relative">
      {/* Ambient gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/[0.05] via-transparent to-accent-secondary/[0.05] blur-3xl pointer-events-none" />

      {/* Animated blueprint grid */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridMove 20s linear infinite',
          }}
        />
      </div>

      {/* Elegant floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-cyan-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[8%] md:top-[12%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-violet-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[68%] md:top-[72%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-indigo-500/[0.15]"
          className="left-[2%] md:left-[8%] bottom-[2%] md:bottom-[8%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-sky-500/[0.15]"
          className="right-[12%] md:right-[18%] top-[6%] md:top-[10%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-purple-500/[0.15]"
          className="left-[18%] md:left-[22%] top-[3%] md:top-[6%]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16">
        {/* Auth Status */}
        <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
          {signedIn ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-accent-success text-xs font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent-success" />
                  ChatGPT Connected
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-text-secondary/60 text-xs hover:text-text-primary transition-colors"
                >
                  Sign out
                </button>
              </div>
              <UsageBadge />
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-text-secondary text-sm hover:text-text-primary hover:border-accent-primary/30 transition-all font-body"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4048-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0974-2.3616l2.603-1.5018 2.6032 1.5018v3.0036l-2.6032 1.5018-2.603-1.5018z" />
              </svg>
              Sign in with ChatGPT
            </button>
          )}
        </div>

        {/* Hero */}
        <div className="text-center mb-14 pt-8">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8"
          >
            <Circle className="h-2 w-2 fill-accent-primary/80 text-accent-primary" />
            <span className="text-xs text-white/60 tracking-wide font-mono">
              AI-Powered Floor Plan Generator & 3D Walkthrough
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-display text-6xl md:text-8xl font-bold mb-6 tracking-tight"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-primary via-white/90 to-accent-secondary">
              BuildAI
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-base sm:text-lg md:text-xl text-white/50 font-body max-w-2xl mx-auto leading-relaxed"
          >
            Describe your dream building. Walk through it in seconds.
          </motion.p>
        </div>

        {/* Prompt Input Area */}
        <motion.form
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="mb-12"
        >
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20">
            <label htmlFor="prompt" className="block text-text-primary font-body font-medium mb-3 text-sm">
              Describe your building
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A 2-storey house with 3 bedrooms, 2 bathrooms, a modern kitchen, living room, dining area, and a balcony on the second floor"
              className="w-full h-32 bg-black/20 border border-white/[0.08] rounded-xl px-5 py-4 text-text-primary placeholder-text-secondary/40 font-body text-base resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50 transition-all"
              disabled={isLoading}
            />
            <div className="mt-4 flex items-center justify-between gap-4">
              {!signedIn && (
                <p className="text-text-secondary/60 text-xs font-body flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-accent-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.5 0L3.16 16.25A2 2 0 005 19z" />
                  </svg>
                  Sign in with ChatGPT to generate
                </p>
              )}
              <button
                type="submit"
                disabled={(signedIn && !prompt.trim()) || isLoading}
                className="ml-auto px-8 py-3.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-display font-medium tracking-wide rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent-primary/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Generating...
                  </span>
                ) : signedIn ? (
                  'Generate Floor Plan'
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4048-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0974-2.3616l2.603-1.5018 2.6032 1.5018v3.0036l-2.6032 1.5018-2.603-1.5018z" />
                    </svg>
                    Sign in to Generate
                  </span>
                )}
              </button>
            </div>
          </div>
        </motion.form>

        {/* Preset Prompts */}
        <div className="mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <p className="text-text-secondary text-sm font-body">Or try an example:</p>
            <span className="text-text-secondary/30">·</span>
            <button
              onClick={() => dxfInputRef.current?.click()}
              disabled={importing}
              className="text-accent-primary/80 hover:text-accent-primary text-sm font-body flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Converting...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import DXF / DWG
                </>
              )}
            </button>
            <input
              ref={dxfInputRef}
              type="file"
              accept=".dxf,.dwg"
              onChange={handleDxfImport}
              className="hidden"
            />
          </div>
          {importError && (
            <p className="text-accent-warning text-xs font-body text-center mb-3">{importError}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESET_PROMPTS.map((preset, i) => (
              <button
                key={i}
                onClick={() => setPrompt(preset)}
                disabled={isLoading}
                className="text-left px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-text-secondary text-sm font-body hover:bg-white/[0.06] hover:border-accent-primary/30 hover:text-text-primary transition-all duration-200 disabled:opacity-40"
              >
                <span className="text-accent-primary/60 mr-1.5">→</span>
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Example plans + inspiration gallery */}
        <Showcase onLoadPlan={onLoadDesign} />

        {/* Saved Designs */}
        <SavedDesigns onLoad={onLoadDesign} />

        {/* How It Works */}
        <div>
          <h2 className="font-display text-xl text-text-primary text-center mb-8 tracking-wide">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '✍️', title: 'Describe', desc: 'Type a natural language description of your building' },
              { icon: '🏗️', title: 'Generate', desc: 'AI creates a detailed floor plan with rooms and furniture' },
              { icon: '🚶', title: 'Walk Through', desc: 'Explore your building in an immersive 3D walkthrough' },
            ].map((step, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 text-center hover:border-accent-primary/30 hover:bg-white/[0.05] transition-all"
              >
                <div className="text-3xl mb-3">{step.icon}</div>
                <h3 className="font-display text-accent-primary text-sm tracking-wide mb-2">{step.title}</h3>
                <p className="text-text-secondary text-sm font-body">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-text-secondary/40 text-xs font-mono">
            Built for TVET Fair 2026 • Building & Civil Engineering • Kenya
          </p>
        </div>
      </div>

      {/* Top & bottom vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-[#0a0a14]/60 pointer-events-none" />
    </div>
  );
}
