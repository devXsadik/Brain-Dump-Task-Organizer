import './globals.css';
import { Inter } from 'next/font/google';
import RootLayoutClient from '@/components/layout/RootLayoutClient';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Brain-Dump — AI Task Organizer',
  description: 'Turn messy thoughts into prioritized tasks. AI brain dumps, Kanban boards, and voice control for productive professionals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}

