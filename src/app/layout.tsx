import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Disclaimer from '@/components/Disclaimer';

export const metadata: Metadata = {
  title: 'Kaalchakra - W.D. Gann Square of 9 Calculator & NSE Stock Screener',
  description: 'An educational and analytical trading tool combining deterministic Gann Square of 9 math with a rule-based stock screener. No investment advice.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-amber-500/20 selection:text-amber-200">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" />
        
        {/* Global Navbar */}
        <Navbar />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        
        {/* Global Disclaimer Footer */}
        <Disclaimer />
      </body>
    </html>
  );
}
