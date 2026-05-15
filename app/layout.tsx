import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Exam Prep Dashboard',
  description: 'Personal exam prep tracker for GATE CS and UGC NET',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}