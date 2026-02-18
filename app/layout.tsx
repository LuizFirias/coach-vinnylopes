import './globals.css';
import ResponsiveNav from './components/responsive-nav';
import MainWrapper from './components/MainWrapper';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="bg-coach-black text-white overflow-x-hidden">
        <ResponsiveNav />
        {/* Main content wrapper handles internal padding and sidebar offset */}
        <MainWrapper>
          {children}
        </MainWrapper>
      </body>
    </html>
  );
}