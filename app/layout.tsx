import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { clerkDarkAppearance } from '@/lib/clerk-appearance';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Async Report',
  description: 'Dailies asíncronas para equipos de desarrollo',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={clerkDarkAppearance}>
      <html lang="es" className="dark">
        <body
          className={`${inter.variable} font-sans min-h-screen bg-[#020617] text-white antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
