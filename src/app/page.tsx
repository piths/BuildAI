'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { FloorPlan, AppMode } from '@/lib/types';
import { generateFloorPlan, generateFloorPlanFromImage, GenProvider } from '@/lib/ai';
import { normalizeFloorPlan } from '@/lib/planNormalizer';
import { saveDesign } from '@/lib/designStorage';
import PromptView from '@/components/PromptView';
import LoadingAnimation from '@/components/LoadingAnimation';

// Heavy, interactive-only views are code-split so the landing page bundle stays
// light (Three.js, jsPDF, the analysis suite load only when actually opened).
const FloorPlanView = dynamic(() => import('@/components/FloorPlanView'), { ssr: false });
const WalkthroughView = dynamic(() => import('@/components/WalkthroughView'), { ssr: false });

export default function Home() {
  const [mode, setMode] = useState<AppMode>('prompt');
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const [provider, setProvider] = useState<GenProvider>('chatgpt');
  const currentDesignId = useRef<string | null>(null);

  const handleGenerate = async (prompt: string, selectedProvider: GenProvider = provider) => {
    setIsLoading(true);
    setError(null);
    setLastPrompt(prompt);
    setProvider(selectedProvider);

    try {
      const plan = await generateFloorPlan(prompt, selectedProvider);
      setFloorPlan(plan);
      // New generation → save as a new design
      currentDesignId.current = saveDesign(plan);
      setMode('floorplan');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate floor plan';
      setError(message);
      console.error('Generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reconstruct a plan from an uploaded image of a drawing (photo / scan / export)
  const handleAnalyzeImage = async (imageBase64: string, selectedProvider: GenProvider = provider) => {
    setIsLoading(true);
    setError(null);
    setProvider(selectedProvider);
    try {
      const plan = await generateFloorPlanFromImage(imageBase64, selectedProvider);
      setFloorPlan(plan);
      currentDesignId.current = saveDesign(plan);
      setMode('floorplan');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyse the drawing';
      setError(message);
      console.error('Image analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the saved design whenever the floor plan changes (edits, chat modifications).
  // The UI state updates immediately; the localStorage write (which renders a
  // thumbnail and serialises every saved design) is debounced so dragging stays smooth.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFloorPlanUpdate = (plan: FloorPlan) => {
    setFloorPlan(plan);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      currentDesignId.current = saveDesign(plan, currentDesignId.current || undefined);
    }, 600);
  };

  const handleLoadDesign = (plan: FloorPlan, id: string) => {
    setFloorPlan(normalizeFloorPlan(plan));
    currentDesignId.current = id;
    setMode('floorplan');
  };

  const handleRegenerate = () => {
    if (lastPrompt) {
      // Regenerate creates a fresh design
      currentDesignId.current = null;
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
          onAnalyzeImage={handleAnalyzeImage}
          isLoading={isLoading}
          initialPrompt={lastPrompt}
          onLoadDesign={handleLoadDesign}
        />
      )}

      {mode === 'floorplan' && floorPlan && (
        <FloorPlanView
          floorPlan={floorPlan}
          provider={provider}
          onFloorPlanUpdate={handleFloorPlanUpdate}
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
