'use client';

import { useRef, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useSmoothScroll } from '@/lib/useSmoothScroll';

interface LandingPageProps {
  onGetStarted: () => void;
}

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
];

const FEATURES = [
  { icon: '✍️', title: 'Describe or speak it', desc: 'Type or talk — natural language or Kiswahili — and the AI drafts a complete, labelled floor plan in seconds.' },
  { icon: '🖼️', title: 'Upload a drawing', desc: 'Snap a photo or scan of an existing plan and the vision model reconstructs it into an editable design.' },
  { icon: '📐', title: '2D blueprint editor', desc: 'A precise blueprint canvas — drag furniture, add walls, doors, windows, columns and beams.' },
  { icon: '🚶', title: '3D walkthrough', desc: 'Step inside your building in a first-person 3D walk-through. WASD to move, mouse to look.' },
  { icon: '📋', title: 'Pro Bill of Quantities', desc: 'A QS-grade 9-element BOQ with real Kenyan rates and full workings on every line item.' },
  { icon: '✅', title: 'Code compliance', desc: 'Automated checks against the Building Code of Kenya — room sizes, lighting, egress and more.' },
  { icon: '🌿', title: 'Green building score', desc: 'A sustainability rating with actionable, SDG-aligned recommendations to improve your design.' },
  { icon: '🏛️', title: 'Structural inspector', desc: 'Change beam and column sections and zoom into any column in 3D to check the junction.' },
  { icon: '📄', title: 'One-click reports', desc: 'Export a professional multi-page PDF — drawings, BOQ, costs, compliance and structural notes.' },
];

const STEPS = [
  { n: '01', title: 'Describe or upload', desc: 'Tell BuildAI what you want, or upload a drawing.' },
  { n: '02', title: 'AI generates', desc: 'A full plan with rooms, furniture and dimensions appears.' },
  { n: '03', title: 'Analyse & refine', desc: 'BOQ, costs, compliance, timeline and green score — instantly.' },
  { n: '04', title: 'Walk through & export', desc: 'Tour it in 3D and download a contractor-ready report.' },
];

const PRICING = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    highlight: false,
    features: ['AI floor-plan generation', '2D editor & 3D walkthrough', 'Save designs', 'Community support'],
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: 'KES 1,500',
    period: '/month',
    highlight: true,
    features: ['Everything in Starter', 'Full BOQ + PDF & CSV export', 'Compliance, timeline & green score', 'Image-to-plan upload', 'Cinematic video generation'],
    cta: 'Start Pro',
  },
  {
    name: 'Studio',
    price: 'KES 4,500',
    period: '/month',
    highlight: false,
    features: ['Everything in Pro', 'AR preview & priority rendering', 'Multi-user team workspace', 'Custom rate libraries', 'Priority support'],
    cta: 'Contact us',
  },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useSmoothScroll(scrollRef);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto overflow-x-hidden bg-black relative">
      {/* Gradient blobs + grain background (FIXED so it composites once) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="flex flex-col items-end absolute -right-60 -top-10 blur-xl">
          <div className="h-[10rem] rounded-full w-[60rem] bg-gradient-to-b blur-[6rem] from-violet-600 to-sky-600" />
          <div className="h-[10rem] rounded-full w-[90rem] bg-gradient-to-b blur-[6rem] from-cyan-700 to-blue-500" />
          <div className="h-[10rem] rounded-full w-[60rem] bg-gradient-to-b blur-[6rem] from-sky-600 to-violet-500" />
        </div>
        <div className="absolute inset-0 bg-noise opacity-[0.25]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="sticky top-0 z-30 backdrop-blur-[2px]">
          <div className="container mx-auto flex items-center justify-between px-4 py-4 mt-2">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-white">
                <span className="font-bold">⚡</span>
              </div>
              <span className="ml-2 text-xl font-display tracking-wide text-white">BuildAI</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-6">
                {NAV_LINKS.map((l) => (
                  <a key={l.href} href={l.href} className="text-sm font-body text-gray-300 hover:text-white transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={onGetStarted} className="text-sm font-body text-gray-300 hover:text-white transition-colors">
                  Sign in
                </button>
                <button
                  onClick={onGetStarted}
                  className="h-11 rounded-full bg-white px-6 text-sm font-medium text-black hover:bg-white/90 transition-colors"
                >
                  Get started
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <span className="sr-only">Open menu</span>
              <Menu className="h-6 w-6 text-white" />
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex flex-col p-4 bg-black/95 md:hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-white">
                    <span className="font-bold">⚡</span>
                  </div>
                  <span className="ml-2 text-xl font-display tracking-wide text-white">BuildAI</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="mt-8 flex flex-col space-y-6">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between border-b border-gray-800 pb-2 text-lg text-white"
                  >
                    <span>{l.label}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </a>
                ))}
                <button
                  onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
                  className="h-12 rounded-full bg-white px-8 text-base font-medium text-black hover:bg-white/90 mt-2"
                >
                  Get Started For Free
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto mt-8 flex max-w-fit items-center justify-center space-x-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-sm font-medium text-white">AI-Powered Architecture for Africa</span>
          <ArrowRight className="h-4 w-4 text-white" />
        </motion.div>

        {/* Hero */}
        <section className="container mx-auto mt-10 px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mx-auto max-w-4xl font-display text-5xl font-bold leading-[1.05] text-white md:text-6xl lg:text-7xl"
          >
            Design buildings by{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-primary via-white to-accent-secondary">
              describing them
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-gray-300 font-body leading-relaxed"
          >
            BuildAI turns a sentence — or a photo of a sketch — into a professional floor plan, an immersive 3D
            walkthrough, a costed Bill of Quantities and a compliance report. Built for Kenyan construction.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
          >
            <button
              onClick={onGetStarted}
              className="h-12 rounded-full bg-white px-8 text-base font-medium text-black hover:bg-white/90 transition-colors"
            >
              Start building free
            </button>
            <a
              href="#features"
              className="h-12 flex items-center rounded-full border border-gray-600 px-8 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              See what it does
            </a>
          </motion.div>

          {/* Hero preview with glow */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.45 }}
            className="relative mx-auto my-20 w-full max-w-5xl"
          >
            <div className="absolute inset-0 rounded bg-accent-primary/40 blur-[10rem] opacity-30" />
            <BlueprintPreview />
          </motion.div>
        </section>

        {/* Stat strip */}
        <section className="max-w-5xl mx-auto px-6 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['9-element', 'professional BOQ'],
              ['2D · 3D · AR', 'visualisation'],
              ['EN · SW', 'bilingual'],
              ['Kenya', 'rates & code'],
            ].map(([big, small]) => (
              <Reveal key={small} className="text-center">
                <p className="font-display text-2xl text-accent-primary">{big}</p>
                <p className="text-text-secondary/70 text-xs font-body mt-1">{small}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20">
          <Reveal className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-3">Everything from idea to site</h2>
            <p className="text-gray-400 font-body max-w-2xl mx-auto">
              One tool that takes a building from a description to a contractor-ready package.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="h-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 hover:border-accent-primary/30 hover:bg-white/[0.05] transition-all">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-display text-white text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm font-body leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-6xl mx-auto px-6 py-20">
          <Reveal className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-3">From sentence to structure</h2>
            <p className="text-gray-400 font-body max-w-2xl mx-auto">Four steps. A few seconds each.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 h-full">
                  <span className="font-display text-4xl text-accent-primary/20">{s.n}</span>
                  <h3 className="font-display text-white text-base mt-2 mb-1.5">{s.title}</h3>
                  <p className="text-gray-400 text-sm font-body leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
          <Reveal className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-3">Simple, honest pricing</h2>
            <p className="text-gray-400 font-body max-w-2xl mx-auto">Start free. Upgrade when you ship real projects.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {PRICING.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div
                  className={`h-full rounded-2xl p-6 flex flex-col border transition-all ${
                    p.highlight
                      ? 'bg-gradient-to-b from-accent-primary/[0.12] to-accent-secondary/[0.06] border-accent-primary/40'
                      : 'bg-white/[0.03] border-white/[0.08]'
                  }`}
                >
                  {p.highlight && (
                    <span className="self-start px-2.5 py-1 rounded-full bg-accent-primary/20 text-accent-primary text-[10px] font-mono uppercase tracking-wider mb-3">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-display text-white text-xl">{p.name}</h3>
                  <div className="mt-3 mb-5">
                    <span className="font-display text-3xl text-white">{p.price}</span>
                    <span className="text-gray-400 text-sm font-body">{p.period}</span>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-gray-300 font-body">
                        <span className="text-accent-success mt-0.5">✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={onGetStarted}
                    className={`mt-6 w-full py-2.5 rounded-full text-sm font-body font-medium transition-all ${
                      p.highlight
                        ? 'bg-white text-black hover:bg-white/90'
                        : 'border border-white/[0.15] text-white hover:bg-white/10'
                    }`}
                  >
                    {p.cta}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="text-center text-text-secondary/40 text-[11px] font-body mt-6">
            Pricing shown is illustrative for launch and may change.
          </p>
        </section>

        {/* Mission / SDG */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <Reveal>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
              <p className="text-gray-300 font-body leading-relaxed">
                Built by a Building &amp; Civil Engineering TVET trainer in Kenya, BuildAI shows how AI can transform
                traditional construction trades — aligned with <span className="text-accent-primary">SDG 9</span> (Innovation &amp;
                Infrastructure) and <span className="text-accent-primary">SDG 11</span> (Sustainable Cities).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                {['SDG 4 · Education', 'SDG 9 · Innovation', 'SDG 11 · Sustainable Cities'].map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-body">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/[0.12] via-white/[0.03] to-accent-secondary/[0.12] p-10 md:p-14 text-center">
              <h2 className="font-display text-3xl md:text-4xl text-white mb-4">Describe your dream building</h2>
              <p className="text-gray-300 font-body mb-8 max-w-xl mx-auto">
                Walk through it in seconds. Free to start — no CAD licence, runs in your browser.
              </p>
              <button
                onClick={onGetStarted}
                className="h-12 rounded-full bg-white px-8 text-base font-medium text-black hover:bg-white/90 transition-colors"
              >
                Get started free
              </button>
            </div>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] mt-10">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-display text-lg bg-clip-text text-transparent bg-gradient-to-r from-accent-primary to-accent-secondary">
              BuildAI
            </span>
            <p className="text-gray-500 text-xs font-body text-center">
              © {new Date().getFullYear()} BuildAI · Built for the WFCP World Congress 2026, Nairobi · Kenya
            </p>
            <button onClick={onGetStarted} className="text-gray-400 text-xs font-body hover:text-accent-primary transition-colors">
              Sign in →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** A pure-CSS blueprint "app preview" so the hero has a visual without assets. */
function BlueprintPreview() {
  const rooms = [
    { l: '6%', t: '12%', w: '40%', h: '46%', label: 'Living', c: 'rgba(100,255,150,0.12)' },
    { l: '48%', t: '12%', w: '46%', h: '46%', label: 'Kitchen', c: 'rgba(255,200,50,0.12)' },
    { l: '6%', t: '60%', w: '26%', h: '30%', label: 'Bed 1', c: 'rgba(100,150,255,0.12)' },
    { l: '34%', t: '60%', w: '26%', h: '30%', label: 'Bath', c: 'rgba(0,200,200,0.12)' },
    { l: '62%', t: '60%', w: '32%', h: '30%', label: 'Bed 2', c: 'rgba(100,150,255,0.12)' },
  ];
  return (
    <div className="relative mx-auto max-w-3xl rounded-2xl border border-white/[0.1] bg-[#0d1326] shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-9 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="w-3 h-3 rounded-full bg-red-400/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <span className="w-3 h-3 rounded-full bg-green-400/70" />
        <span className="ml-3 text-gray-400 text-[11px] font-mono">BuildAI — Ground Floor</span>
      </div>
      <div
        className="relative aspect-[16/9]"
        style={{
          backgroundColor: '#0a1020',
          backgroundImage: `linear-gradient(rgba(0,212,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.06) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      >
        {rooms.map((r) => (
          <div
            key={r.label}
            className="absolute border border-accent-primary/40 rounded-sm flex items-center justify-center"
            style={{ left: r.l, top: r.t, width: r.w, height: r.h, backgroundColor: r.c }}
          >
            <span className="text-accent-primary/80 text-[10px] md:text-xs font-mono">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
