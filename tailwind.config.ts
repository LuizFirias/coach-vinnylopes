import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* New Design Tokens */
        'bg-base': '#070707',
        'bg-surface': '#111111',
        'bg-card': '#1A1A1A',
        'bg-elevated': '#222222',
        
        /* Brand Gold */
        'gold-default': '#B8972A',
        'gold-light': '#D4AF47',
        'gold-highlight': '#EDD06B',
        'gold-bg': 'rgba(184, 151, 42, 0.15)',
        
        /* Text */
        'text-primary': '#F2F2F2',
        'text-secondary': '#A0A0A0',
        'text-disabled': '#555555',
        
        /* Borders & Status */
        'border-subtle': '#2C2C2C',
        'border-default': '#3A3A3A',
        'success': '#27AE60',
        'danger': '#C0392B',
        'warn': '#E67E22',
        'neutral': '#888888',
        
        /* Legacy colors for compatibility */
        'iron-black': '#070707',
        'iron-gray': '#111111',
        'iron-red': '#C0392B',
        'iron-gold': '#B8972A',
        'iron-gold-dark': '#8B7620',
        'brand-purple': '#B8972A',
      },
      fontFamily: {
        sans: ['Sora', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'Courier New', 'monospace'],
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-6': '24px',
        'space-8': '32px',
        'space-12': '48px',
        'space-16': '64px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '14px',
        'lg': '20px',
        'xl': '28px',
      },
    },
  },
  plugins: [],
};
export default config;