import './globals.css';
import { Inter, JetBrains_Mono, Poppins, Montserrat } from 'next/font/google';
import Sidebar from './components/sidebar';
import MainWrapper from './components/MainWrapper';
import SessionManager from './components/SessionManager';
import ChromeExtensionFix from './components/ChromeExtensionFix';
import SuppressHydrationWarnings from './components/SuppressHydrationWarnings';
import BottomNav from './components/BottomNav';
import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/ThemeProvider';
import ThemeToggleBar from './components/ThemeToggleBar';
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
    <html lang="pt-br" suppressHydrationWarning className={`dark ${inter.variable} ${jetbrainsMono.variable} ${poppins.variable} ${montserrat.variable}`} data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove Chrome extension attributes immediately before React hydration
              (function() {
                function cleanExtensionAttributes() {
                  const elements = document.querySelectorAll('[__gchrome_uniqueid], [__gchrome_remoteframetoken]');
                  elements.forEach(function(el) {
                    el.removeAttribute('__gchrome_uniqueid');
                    el.removeAttribute('__gchrome_remoteframetoken');
                  });
                }
                
                // Run immediately
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', cleanExtensionAttributes);
                } else {
                  cleanExtensionAttributes();
                }
                
                // Keep running to catch late injections
                setInterval(cleanExtensionAttributes, 100);
              })();
            `,
          }}
        />
      </head>
      <body className="bg-surface-0 text-text-primary overflow-x-hidden min-h-screen" suppressHydrationWarning>
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