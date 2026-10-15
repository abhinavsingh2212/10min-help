import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: '10Min Help — Fast Roadside Assistance for Bikes & Cars in India',
  description:
    'Stranded on the road? 10Min Help connects you with nearby verified mechanics for puncture repair, battery jump start, fuel delivery, towing, and minor repairs in 10 minutes.',
  keywords: 'roadside assistance India, bike puncture repair, car battery jump start, breakdown help, emergency towing Bangalore Delhi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50 text-slate-900 font-sans antialiased selection:bg-amber-200">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
