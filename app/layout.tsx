import './globals.css';
import Sidebar from './components/sidebar';
import MainWrapper from './components/MainWrapper';
import SessionManager from './components/SessionManager';
import ChromeExtensionFix from './components/ChromeExtensionFix';
import SuppressHydrationWarnings from './components/SuppressHydrationWarnings';
import BottomNav from './components/BottomNav';
import { AuthProvider } from './components/AuthProvider';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'COACH VINNY | High Performance',
  description: 'A Jornada Começa Agora - Ecossistema de Treinamento Exclusivo',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico.jpg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'COACH VINNY',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <head>
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
      <body className="bg-iron-black text-white overflow-x-hidden min-h-screen" suppressHydrationWarning>
        <SuppressHydrationWarnings />
        <ChromeExtensionFix />
        <AuthProvider>
          <SessionManager />
          <Sidebar />
          {/* Main content wrapper handles internal padding and sidebar offset */}
          <MainWrapper>
            {children}
          </MainWrapper>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}