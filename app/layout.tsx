import './globals.css';
import Sidebar from './components/sidebar';
import MainWrapper from './components/MainWrapper';
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="bg-iron-black text-white overflow-x-hidden min-h-screen">
        <Sidebar />
        {/* Main content wrapper handles internal padding and sidebar offset */}
        <MainWrapper>
          {children}
        </MainWrapper>
      </body>
    </html>
  );
}