import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin','vietnamese'],
  weight: ['400','500','600','700','800','900'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CanteenPN', template: '%s · CanteenPN' },
  description: 'Đặt món trước, nhận món đúng giờ tại căng tin trường.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={beVietnamPro.variable}><Providers>{children}</Providers></body>
    </html>
  );
}

