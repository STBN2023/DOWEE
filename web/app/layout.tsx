import './globals.css';
import type { Metadata } from 'next';
import FloatingBurger from '@/components/FloatingBurger';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'DoWee',
  description: 'Mini-CRM & Project Management POC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ backgroundColor: '#fbf8e9' }}>
      <body style={{ minHeight: '100vh', backgroundColor: '#fbf8e9', color: '#111' }}>
        <Header />
        <FloatingBurger />
        <main style={{ paddingTop: '64px' }}>{children}</main>
      </body>
    </html>
  );
}
