import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#070B14',
          1: '#0B1020',
          2: '#111827',
          3: '#141B2D',
          4: '#182033',
        },
        text: {
          primary: '#F5F7FA',
          secondary: '#9CA3AF',
          tertiary: '#6B7280',
          disabled: '#4B5563',
          'on-brand': '#FFFFFF',
        },
        brand: {
          DEFAULT: '#2563EB',
          primary: '#2563EB',
          hover: '#1D4ED8',
          pressed: '#1E40AF',
          subtle: 'rgba(37, 99, 235, 0.12)',
          border: 'rgba(37, 99, 235, 0.36)',
        },
        success: {
          DEFAULT: '#22C55E',
          subtle: 'rgba(34, 197, 94, 0.12)',
          border: 'rgba(34, 197, 94, 0.36)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          subtle: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.36)',
        },
        danger: {
          DEFAULT: '#EF4444',
          subtle: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.36)',
        },
        info: {
          DEFAULT: '#38BDF8',
          subtle: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.36)',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          strong: 'rgba(255, 255, 255, 0.18)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Exo 2', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs':  ['11px', { lineHeight: '1.5'  }],
        xs:     ['12px', { lineHeight: '1.5'  }],
        sm:     ['14px', { lineHeight: '1.5'  }],
        base:   ['16px', { lineHeight: '1.5'  }],
        lg:     ['18px', { lineHeight: '1.5'  }],
        xl:     ['20px', { lineHeight: '1.35' }],
        '2xl':  ['24px', { lineHeight: '1.35' }],
        '3xl':  ['30px', { lineHeight: '1.15' }],
        '4xl':  ['36px', { lineHeight: '1.15' }],
        '5xl':  ['48px', { lineHeight: '1.15' }],
      },
      fontWeight: {
        regular:  '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
      },
      letterSpacing: {
        tight:  '-0.02em',
        normal: '0',
        wide:   '0.02em',
        caps:   '0.08em',
      },
      spacing: {
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '8':  '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '14px',
        xl:   '20px',
        full: '9999px',
      },
      boxShadow: {
        'elev-1': '0 1px 2px rgba(0, 0, 0, 0.30)',
        'elev-2': '0 4px 12px rgba(0, 0, 0, 0.45)',
        'elev-3': '0 12px 32px rgba(0, 0, 0, 0.55)',
        'glow-brand': '0 0 24px rgba(37, 99, 235, 0.22)',
        'glow-success': '0 0 24px rgba(34, 197, 94, 0.24)',
        'pr-glow': '0 0 20px rgba(34, 197, 94, 0.32)',
        'focus-ring': '0 0 0 2px rgba(37, 99, 235, 0.50)',
      },
      transitionTimingFunction: {
        'out':     'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out':  'cubic-bezier(0.65, 0, 0.35, 1)',
        'spring':  'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        'instant': '100ms',
        'fast':    '180ms',
        'normal':  '240ms',
        'slow':    '400ms',
      },
      minHeight: {
        'touch': '48px',
      },
      maxWidth: {
        'mobile': '428px',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
        'pulse-success': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%':      { backgroundColor: 'rgba(46, 184, 114, 0.12)' },
        },
        'pop-spring': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'shimmer':        'shimmer 1.5s ease-in-out infinite',
        'pulse-success':  'pulse-success 600ms ease-out',
        'pop-spring':     'pop-spring 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
