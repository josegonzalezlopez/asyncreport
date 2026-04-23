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
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isPlaceholderKey = /^pk_(test|live)_0+$/.test(publishableKey ?? '');
  const disableClerkForCiBuild = process.env.CI === 'true' && isPlaceholderKey;

  const appContent = (
    <html lang="es" className="dark">
      <body
        className={`${inter.variable} font-sans min-h-screen bg-[#020617] text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );

  if (disableClerkForCiBuild) {
    return appContent;
  }

  return (
    <ClerkProvider appearance={clerkDarkAppearance} publishableKey={publishableKey}>
      {appContent}
    </ClerkProvider>
  );
}
