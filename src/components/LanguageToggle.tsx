'use client';

import { useLanguage } from '@/lib/i18n';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`flex items-center bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg overflow-hidden ${className}`}
    >
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1.5 text-xs font-body transition-all ${
          lang === 'en' ? 'bg-accent-primary text-bg-primary font-medium' : 'text-text-secondary hover:text-text-primary'
        }`}
        title="English"
      >
        🇬🇧 EN
      </button>
      <button
        onClick={() => setLang('sw')}
        className={`px-2.5 py-1.5 text-xs font-body transition-all ${
          lang === 'sw' ? 'bg-accent-primary text-bg-primary font-medium' : 'text-text-secondary hover:text-text-primary'
        }`}
        title="Kiswahili"
      >
        🇰🇪 SW
      </button>
    </div>
  );
}
