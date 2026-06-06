'use client';

import { useState } from 'react';
import { PRESET_PROMPTS } from '@/lib/constants';

interface PromptViewProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  initialPrompt?: string;
}

export default function PromptView({ onGenerate, isLoading, initialPrompt = '' }: PromptViewProps) {
  const [prompt, setPrompt] = useState(initialPrompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* Animated grid background */}
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
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: '300px 300px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16">
        {/* Hero */}
        <div className="text-center mb-16 animate-fadeInUp">
          <h1 className="font-display text-5xl md:text-7xl text-accent-primary mb-4 tracking-wider">
            BuildAI
          </h1>
          <p className="text-text-secondary text-lg md:text-xl font-body max-w-2xl mx-auto leading-relaxed">
            Describe your dream building. Walk through it in seconds.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-text-secondary/50 text-sm">
            <span className="w-8 h-px bg-accent-primary/30" />
            <span className="font-mono">AI-Powered Floor Plan Generator & 3D Walkthrough</span>
            <span className="w-8 h-px bg-accent-primary/30" />
          </div>
        </div>

        {/* Prompt Input Area */}
        <form onSubmit={handleSubmit} className="mb-12 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="bg-bg-card/80 backdrop-blur-sm border border-border-custom rounded-2xl p-6 shadow-2xl shadow-accent-primary/5">
            <label htmlFor="prompt" className="block text-text-primary font-body font-medium mb-3 text-sm">
              Describe your building
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A 2-storey house with 3 bedrooms, 2 bathrooms, a modern kitchen, living room, dining area, and a balcony on the second floor"
              className="w-full h-32 bg-bg-primary/60 border border-border-custom rounded-xl px-5 py-4 text-text-primary placeholder-text-secondary/40 font-body text-base resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50 transition-all"
              disabled={isLoading}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="px-8 py-3.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-display font-medium tracking-wide rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent-primary/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate Floor Plan'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Preset Prompts */}
        <div className="mb-16 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <p className="text-text-secondary text-sm mb-4 text-center font-body">Or try an example:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESET_PROMPTS.map((preset, i) => (
              <button
                key={i}
                onClick={() => setPrompt(preset)}
                disabled={isLoading}
                className="text-left px-4 py-3 bg-bg-secondary/60 border border-border-custom/50 rounded-xl text-text-secondary text-sm font-body hover:bg-bg-card hover:border-accent-primary/30 hover:text-text-primary transition-all duration-200 disabled:opacity-40"
              >
                <span className="text-accent-primary/60 mr-1.5">→</span>
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
          <h2 className="font-display text-xl text-text-primary text-center mb-8 tracking-wide">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '✍️', title: 'Describe', desc: 'Type a natural language description of your building' },
              { icon: '🏗️', title: 'Generate', desc: 'AI creates a detailed floor plan with rooms and furniture' },
              { icon: '🚶', title: 'Walk Through', desc: 'Explore your building in an immersive 3D walkthrough' },
            ].map((step, i) => (
              <div
                key={i}
                className="bg-bg-card/50 border border-border-custom/50 rounded-xl p-6 text-center hover:border-accent-primary/30 transition-all"
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
    </div>
  );
}
