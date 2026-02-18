import './globals.css';
import Sidebar from './components/sidebar';
import MainWrapper from './components/MainWrapper';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="bg-gray-50 text-slate-900 overflow-x-hidden">
        <Sidebar />
        {/* Main content wrapper handles internal padding and sidebar offset */}
        <MainWrapper>
          {children}
        </MainWrapper>
      </body>
    </html>
  );
}