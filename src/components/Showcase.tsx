'use client';

import { FloorPlan } from '@/lib/types';
import { SAMPLE_PLANS, INSPIRATION_IMAGES } from '@/lib/samplePlans';

interface ShowcaseProps {
  onLoadPlan: (plan: FloorPlan, id: string) => void;
}

export default function Showcase({ onLoadPlan }: ShowcaseProps) {
  return (
    <div className="mb-16">
      {/* Example Plans — load instantly */}
      <p className="text-text-secondary text-sm mb-4 text-center font-body">
        Or open an example plan instantly:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {SAMPLE_PLANS.map((sample) => (
          <button
            key={sample.id}
            onClick={() => onLoadPlan(sample.plan, sample.id)}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left hover:border-accent-primary/40 transition-all"
          >
            <div className="aspect-[16/9] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.image}
                alt={sample.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14]/40 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
              <div>
                <p className="font-display text-text-primary text-base tracking-wide">{sample.title}</p>
                <p className="text-text-secondary/70 font-mono text-xs mt-0.5">{sample.subtitle}</p>
              </div>
              <span className="flex items-center gap-1 text-accent-primary text-xs font-body opacity-0 group-hover:opacity-100 transition-opacity">
                Open
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Inspiration gallery */}
      <p className="text-text-secondary text-sm mb-4 text-center font-body">Design inspiration</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {INSPIRATION_IMAGES.map((img, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.label}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14]/90 via-transparent to-transparent" />
            <span className="absolute bottom-2 left-3 text-text-primary/90 text-xs font-body">
              {img.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
