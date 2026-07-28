import './globals.css';
import { Inter, JetBrains_Mono, Poppins, Montserrat, DM_Sans } from 'next/font/google';
import Script from 'next/script';
import Sidebar from './components/sidebar';
import MainWrapper from './components/MainWrapper';
import SessionManager from './components/SessionManager';
import ChromeExtensionFix from './components/ChromeExtensionFix';
import SuppressHydrationWarnings from './components/SuppressHydrationWarnings';
import BottomNav from './components/BottomNav';
import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/ThemeProvider';
import ThemeToggleBar from './components/ThemeToggleBar';
import BootSplashRemover from './components/BootSplashRemover';
import { Metadata, Viewport } from 'next';

const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('auron-theme') === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#FAFAFA' : '#09090B');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600'],
  variable: '--font-accent',
});

/** KPIs / valores monetários — geométrica, moderna (peso 700) */
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['700'],
  variable: '--font-kpi',
});

export const metadata: Metadata = {
  title: 'Auronfit | High Performance',
  description: 'A Jornada Começa Agora - Ecossistema de Treinamento',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Auronfit',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#09090B' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" suppressHydrationWarning className={`dark ${inter.variable} ${jetbrainsMono.variable} ${poppins.variable} ${montserrat.variable} ${dmSans.variable}`} data-theme="dark">
      <body className="bg-surface-0 text-text-primary overflow-x-hidden min-h-screen" suppressHydrationWarning>
        <Script id="auron-theme-init" strategy="beforeInteractive">
          {themeInitScript.trim()}
        </Script>
        {/* Splash CSS-only — gira antes da hidratação do React / framer-motion */}
        <div
          id="auron-boot-splash"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-0, #080c14)',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <div
            className="auron-loader-spin"
            style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="48" height="48" viewBox="0 0 100 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="auronBootGrad" x1="50" y1="0" x2="50" y2="47" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2b7fff" />
                </linearGradient>
              </defs>
              <path d="M 37,0 L 23.5,0 C 10.5,0 0,10.5 0,23.5 C 0,36.5 10.5,47 23.5,47 L 37,47 L 37,36 L 23.5,36 C 16.6,36 11,30.4 11,23.5 C 11,16.6 16.6,11 23.5,11 L 37,11 Z" fill="url(#auronBootGrad)" />
              <path d="M 63,0 L 76.5,0 C 89.5,0 100,10.5 100,23.5 C 100,36.5 89.5,47 76.5,47 L 63,47 L 63,36 L 76.5,36 C 83.4,36 89,30.4 89,23.5 C 89,16.6 83.4,11 76.5,11 L 63,11 Z" fill="url(#auronBootGrad)" />
              <path d="M 30,18.25 L 70,18.25 Q 72,18.25 72,20.25 L 72,26.75 Q 72,28.75 70,28.75 L 30,28.75 Q 28,28.75 28,26.75 L 28,20.25 Q 28,18.25 30,18.25 Z" fill="url(#auronBootGrad)" />
            </svg>
          </div>
        </div>
        <BootSplashRemover />
        <SuppressHydrationWarnings />
        <ChromeExtensionFix />
        <ThemeProvider>
          <AuthProvider>
            <SessionManager />
            <Sidebar />
            <ThemeToggleBar />
            {/* Main content wrapper handles internal padding and sidebar offset */}
            <MainWrapper>
              {children}
            </MainWrapper>
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}