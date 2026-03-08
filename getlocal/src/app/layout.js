import './globals.css';
import BottomNav from '@/components/BottomNav';
import ChatWidget from '@/components/ChatWidget';

export const metadata = {
  title: 'GetLocal - Hire Local Talent',
  description: 'Voice-first marketplace for blue-collar hiring',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <main className="min-h-screen">
          {children}
        </main>
        <BottomNav />
        <ChatWidget />
      </body>
    </html>
  );
}