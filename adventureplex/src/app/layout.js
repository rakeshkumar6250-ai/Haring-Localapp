import './globals.css';

export const metadata = {
  title: 'AdventurePlex Loyalty',
  description: 'Earn rewards with every visit!',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
