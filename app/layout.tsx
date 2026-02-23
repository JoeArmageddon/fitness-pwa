import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Fitness OS',
  description: 'Your Personal Performance Operating System',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Fitness OS' },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#060608',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[#060608] text-white min-h-screen overflow-x-hidden">
        <main className="max-w-lg mx-auto pb-24">
          {children}
        </main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}