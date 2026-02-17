import './globals.css';
import ResponsiveNav from './components/responsive-nav';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="bg-coach-black text-white overflow-x-hidden">
        <ResponsiveNav />
        {/* Main content with lg:ml-64 for desktop sidebar, pt-16 for mobile header */}
        <main className="pt-16 lg:pt-0 lg:ml-64">
          {children}
        </main>
      </body>
    </html>
  );
}