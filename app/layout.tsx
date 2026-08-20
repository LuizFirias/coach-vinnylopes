import './globals.css';
import { Inter, JetBrains_Mono, Poppins, Montserrat, DM_Sans, Nunito_Sans } from 'next/font/google';
import Sidebar from './components/sidebar';
import MainWrapper from './components/MainWrapper';
import SessionManager from './components/SessionManager';
import ChromeExtensionFix from './components/ChromeExtensionFix';
import SuppressHydrationWarnings from './components/SuppressHydrationWarnings';
import BottomNav from './components/BottomNav';
import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/ThemeProvider';
import ThemeToggleBar from './components/ThemeToggleBar';
import BootSplash from './components/BootSplash';
import PwaUpdateBanner from './components/PwaUpdateBanner';
import { Metadata, Viewport } from 'next';

const themeInitScript = `
(function() {
  try {
    // Migração única: tema oficial = claro (mesmo quem tinha escuro salvo)
    if (localStorage.getItem('auron-theme-v2-light') !== '1') {
      localStorage.setItem('auron-theme', 'light');
      localStorage.setItem('auron-theme-v2-light', '1');
    }
    // Dark temporariamente desativado no desktop — lógica/preferência continuam
    // salvas normalmente, só a aplicação visual é forçada pra light acima de 1024px.
    var isDesktop = window.innerWidth >= 1024;
    var theme = (!isDesktop && localStorage.getItem('auron-theme') === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#000000');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
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

/** Nome do aluno na listagem (padrão Nutrium: "NunitoSans Regular") */
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
  variable: '--font-nunito-sans',
});

export const metadata: Metadata = {
  title: 'Auronfit | High Performance',
  description: 'A Jornada Começa Agora - Ecossistema de Treinamento',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Auronfit',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'overlays-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${poppins.variable} ${montserrat.variable} ${dmSans.variable} ${nunitoSans.variable} overflow-x-clip`} data-theme="light">
      <head>
        {/* Inline (sem next/script) — evita ChunkLoadError do Script em HMR/restart */}
        <script
          id="auron-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="bg-surface-0 text-text-primary min-h-dvh overflow-x-clip" suppressHydrationWarning>
        <BootSplash />
        <PwaUpdateBanner />
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