'use client';

import { useEffect, useState } from 'react';

export default function LoadingAnimation() {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const steps = [
    'Analyzing building description...',
    'Calculating room dimensions...',
    'Placing walls and openings...',
    'Auto-furnishing rooms...',
    'Finalizing floor plan...',
  ];

  useEffect(() => {
    const totalSteps = steps.length;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return 95;
        return p + Math.random() * 8;
      });
    }, 200);

    const stepInterval = setInterval(() => {
      setStep((s) => (s < totalSteps - 1 ? s + 1 : s));
    }, 1500);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-bg-primary/95 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Animated Blueprint Icon */}
        <div className="mb-8 relative">
          <svg
            className="w-24 h-24 mx-auto animate-pulse"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Blueprint grid lines animating in */}
            <rect x="10" y="10" width="80" height="80" stroke="#00d4ff" strokeWidth="2" opacity="0.3" />
            <line x1="10" y1="40" x2="90" y2="40" stroke="#00d4ff" strokeWidth="1" opacity="0.5">
              <animate attributeName="x2" values="10;90" dur="1s" fill="freeze" />
            </line>
            <line x1="10" y1="65" x2="90" y2="65" stroke="#00d4ff" strokeWidth="1" opacity="0.5">
              <animate attributeName="x2" values="10;90" dur="1.2s" fill="freeze" />
            </line>
            <line x1="40" y1="10" x2="40" y2="90" stroke="#00d4ff" strokeWidth="1" opacity="0.5">
              <animate attributeName="y2" values="10;90" dur="0.8s" fill="freeze" />
            </line>
            <line x1="65" y1="10" x2="65" y2="90" stroke="#00d4ff" strokeWidth="1" opacity="0.5">
              <animate attributeName="y2" values="10;90" dur="1.1s" fill="freeze" />
            </line>
            {/* Room fills */}
            <rect x="12" y="12" width="26" height="26" fill="#00d4ff" opacity="0.1">
              <animate attributeName="opacity" values="0;0.15" dur="1.5s" fill="freeze" />
            </rect>
            <rect x="42" y="12" width="21" height="26" fill="#10b981" opacity="0.1">
              <animate attributeName="opacity" values="0;0.15" dur="1.8s" fill="freeze" />
            </rect>
            <rect x="12" y="42" width="26" height="21" fill="#fbbf24" opacity="0.1">
              <animate attributeName="opacity" values="0;0.15" dur="2s" fill="freeze" />
            </rect>
          </svg>

          {/* Spinning compass */}
          <div className="absolute top-0 right-1/4 w-8 h-8">
            <svg className="w-full h-full animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" stroke="#00d4ff" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M16 4 L18 16 L16 28 L14 16 Z" fill="#00d4ff" opacity="0.6" />
            </svg>
          </div>
        </div>

        <h2 className="font-display text-xl text-accent-primary mb-3">Generating Floor Plan</h2>
        <p className="text-text-secondary text-sm mb-6 font-body">{steps[step]}</p>

        {/* Progress bar */}
        <div className="w-full bg-bg-secondary rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 95)}%` }}
          />
        </div>

        <p className="text-text-secondary/60 text-xs font-mono">
          AI is crafting your architectural blueprint...
        </p>
      </div>
    </div>
  );
}
