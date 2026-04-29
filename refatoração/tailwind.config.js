/**
 * tailwind.config.js
 * ────────────────────────────────────────────────────────────────
 * Config do Tailwind alinhada com os design tokens.
 * Use ESTE arquivo se o projeto já usa Tailwind.
 * Se não usa Tailwind, ignore e use design-tokens.css direto.
 *
 * Fonte de verdade: DESIGN-SPEC.md §2
 * ────────────────────────────────────────────────────────────────
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Next.js App Router (estrutura recomendada — §13.1 do DESIGN-SPEC.md)
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    // Legacy Pages Router (manter caso o projeto ainda use)
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // app é dark-only — não usar 'media'
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0A0A0B',
          1: '#121214',
          2: '#1A1A1D',
          3: '#232327',
          4: '#2D2D32',
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
        // 8pt grid — Tailwind já tem 1=4px, 2=8px etc., mas reforçando
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
  plugins: [
    // require('@tailwindcss/forms'),    // se precisar de reset de inputs
    // require('@tailwindcss/typography'), // se houver conteúdo prose
  ],
};

/* ────────────────────────────────────────────────────────────────
   Exemplos de uso em JSX/TSX:
   ────────────────────────────────────────────────────────────────

   // Botão primário
   <button className="bg-brand text-text-on-brand font-semibold text-base px-5 py-3.5 rounded-lg min-h-touch transition-all duration-fast ease-out hover:bg-brand-hover hover:shadow-glow-brand active:bg-brand-pressed active:scale-[0.98] disabled:opacity-40">
     Começar treino
   </button>

   // Card padrão
   <div className="bg-surface-1 border border-border rounded-lg p-4">
     ...
   </div>

   // Card primário (destacado)
   <div className="bg-surface-2 border border-brand-border rounded-lg p-4 shadow-glow-brand">
     ...
   </div>

   // Microlabel CAPS
   <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
     PESO ATUAL
   </span>

   // Número em mono
   <span className="font-mono tabular-nums font-medium text-4xl tracking-tight">
     82.0
   </span>

   // Skeleton
   <div className="h-4 w-32 bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 bg-[length:200%_100%] animate-shimmer rounded-md" />

   ────────────────────────────────────────────────────────────────
*/
