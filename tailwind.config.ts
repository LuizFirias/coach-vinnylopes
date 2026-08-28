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
          0: '#0d0d0d',   // page bg
          1: '#111827',   // card — alinhado ao dash do aluno
          2: '#1e1e1e',   // elevated / input
          3: '#222222',   // overlay / divisor
          4: '#282828',   // borda input
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          tertiary: '#71717A',
          disabled: '#52525B',
          'on-brand': '#FAFAFA',
        },
        brand: {
          DEFAULT: '#9333ea',
          primary: '#9333ea',
          hover: '#a855f7',
          pressed: '#7e22ce',
          subtle: 'rgba(147, 51, 234, 0.10)',
          border: 'rgba(147, 51, 234, 0.20)',
        },
        success: {
          DEFAULT: '#39c75a',
          subtle: 'rgba(57, 199, 90, 0.10)',
          border: 'rgba(57, 199, 90, 0.20)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          subtle: 'rgba(245, 158, 11, 0.10)',
          border: 'rgba(245, 158, 11, 0.20)',
        },
        danger: {
          DEFAULT: '#e05555',
          subtle: 'rgba(224, 85, 85, 0.10)',
          border: 'rgba(224, 85, 85, 0.20)',
        },
        info: {
          DEFAULT: '#38BDF8',
          subtle: 'rgba(56, 189, 248, 0.10)',
          border: 'rgba(56, 189, 248, 0.20)',
        },
        border: {
          subtle: '#27272A',
          DEFAULT: '#3F3F46',
          strong: '#52525B',
          card: 'var(--border-card)',
          'card-hover': 'var(--border-card-hover)',
          input: 'var(--border-input)',
          divider: 'var(--border-divider)',
          accent: 'var(--border-accent)',
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
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        accent: ['var(--font-accent)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'SF Mono', 'Menlo', 'monospace'],
        kpi: ['var(--font-kpi)', 'DM Sans', 'system-ui', 'sans-serif'],
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
        tight:    '-0.02em',
        normal:   '0',
        wide:     '0.02em',
        caps:     '0.08em',
        display:  'var(--tracking-display)',
        headline: 'var(--tracking-headline)',
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
        sm:   '4px',
        md:   '6px',
        lg:   '8px',
        xl:   '10px',
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
        'btn-glow':       '0 4px 20px rgba(212, 164, 55, 0.45)',
        'btn-glow-hover': '0 6px 28px rgba(212, 164, 55, 0.60)',
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
        'btn-primary':        'linear-gradient(135deg, #F5D061 0%, #D4A843 55%, #B8902F 100%)',
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
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
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
        spin:            'spin 1s linear infinite',
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
