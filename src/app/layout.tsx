import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Reveal Planner',
  description: 'Real-time availability planner for Counter-Strike team',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background h-full antialiased`}
      >
        <ThemeProvider
          enableSystem={true}
          defaultTheme="system"
          attribute="data-theme"
          storageKey="cs-team-planner-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
