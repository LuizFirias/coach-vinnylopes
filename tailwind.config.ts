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
          0: '#08080A',
          1: '#15151A',
          2: '#1F1F25',
          3: '#2A2A32',
          4: '#353540',
        },
        text: {
          primary:   '#F5F5F7',
          secondary: '#B8B8BD',
          tertiary:  '#7A7A82',
          disabled:  '#4A4A50',
          'on-brand': '#1A1A1D',
        },
        brand: {
          DEFAULT: '#D4A437',
          primary: '#D4A437',
          hover:   '#E1B548',
          pressed: '#B88B25',
          subtle:  'rgba(212, 164, 55, 0.12)',
          border:  'rgba(212, 164, 55, 0.32)',
        },
        success: {
          DEFAULT: '#2EB872',
          subtle:  'rgba(46, 184, 114, 0.12)',
          border:  'rgba(46, 184, 114, 0.40)',
        },
        warning: {
          DEFAULT: '#E8A33B',
          subtle:  'rgba(232, 163, 59, 0.12)',
        },
        danger: {
          DEFAULT: '#E5484D',
          subtle:  'rgba(229, 72, 77, 0.12)',
          border:  'rgba(229, 72, 77, 0.40)',
        },
        info: {
          DEFAULT: '#3B82F6',
          subtle:  'rgba(59, 130, 246, 0.12)',
        },
        border: {
          subtle:  'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          strong:  'rgba(255, 255, 255, 0.18)',
        },
        gold: {
          50:  '#FFF8E1',
          300: '#F5D061',
          500: '#E8B339',
          600: '#C9941F',
          700: '#9C7216',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
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
        'glow-brand':   '0 0 24px rgba(212, 164, 55, 0.25)',
        'glow-success': '0 0 24px rgba(46, 184, 114, 0.30)',
        'pr-glow':      '0 0 20px rgba(46, 184, 114, 0.40)',
        'focus-ring':   '0 0 0 2px rgba(212, 164, 55, 0.50)',
        // v3 premium aliases
        'gold-glow':    '0 4px 24px rgba(232, 179, 57, 0.25)',
        'card':         '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
        'elevated':     '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-gold':      'linear-gradient(135deg, #F5D061 0%, #E8B339 45%, #C9941F 100%)',
        'gradient-surface':   'linear-gradient(160deg, #18181C 0%, #0F0F11 100%)',
        'gradient-glow-gold': 'radial-gradient(circle at 30% 20%, rgba(232,179,57,0.18) 0%, rgba(232,179,57,0) 60%)',
        'gradient-success':   'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
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
        'pulse-gentle': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.05)', opacity: '0.85' },
        },
      },
      animation: {
        'shimmer':        'shimmer 1.5s ease-in-out infinite',
        'pulse-success':  'pulse-success 600ms ease-out',
        'pop-spring':     'pop-spring 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-gentle':   'pulse-gentle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
