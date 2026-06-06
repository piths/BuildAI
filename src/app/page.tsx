'use client';

import { useState } from 'react';
import { FloorPlan, AppMode } from '@/lib/types';
import { generateFloorPlan } from '@/lib/ai';
import PromptView from '@/components/PromptView';
import FloorPlanView from '@/components/FloorPlanView';
import WalkthroughView from '@/components/WalkthroughView';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('prompt');
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setLastPrompt(prompt);

    try {
      const plan = await generateFloorPlan(prompt);
      setFloorPlan(plan);
      setMode('floorplan');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate floor plan';
      setError(message);
      console.error('Generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (lastPrompt) {
      handleGenerate(lastPrompt);
    }
  };

  const handleEditPrompt = () => {
    setMode('prompt');
  };

  const handleWalkthrough = () => {
    setMode('walkthrough');
  };

  const handleBackToFloorPlan = () => {
    setMode('floorplan');
  };

  return (
    <main className="h-screen w-screen overflow-hidden">
      {isLoading && <LoadingAnimation />}

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md">
          <div className="bg-red-900/90 border border-red-500/50 rounded-xl px-5 py-3 backdrop-blur-sm">
            <p className="text-red-200 text-sm font-body">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-300 text-xs underline hover:text-red-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {mode === 'prompt' && (
        <PromptView
          onGenerate={handleGenerate}
          isLoading={isLoading}
          initialPrompt={lastPrompt}
        />
      )}

      {mode === 'floorplan' && floorPlan && (
        <FloorPlanView
          floorPlan={floorPlan}
          onRegenerate={handleRegenerate}
          onEditPrompt={handleEditPrompt}
          onWalkthrough={handleWalkthrough}
        />
      )}

      {mode === 'walkthrough' && floorPlan && (
        <WalkthroughView floorPlan={floorPlan} onBack={handleBackToFloorPlan} />
      )}
    </main>
  );
}
