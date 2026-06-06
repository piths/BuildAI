import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        'bg-primary': '#0f0f1a',
        'bg-secondary': '#1a1a2e',
        'bg-card': '#16213e',
        'accent-primary': '#00d4ff',
        'accent-secondary': '#7c3aed',
        'accent-success': '#10b981',
        'accent-warning': '#f59e0b',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-accent': '#00d4ff',
        'border-custom': '#2a2a4a',
      },
    },
  },
  plugins: [],
}
export default config
