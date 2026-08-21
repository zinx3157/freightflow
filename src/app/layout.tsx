import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { I18nProvider } from '@/components/I18nProvider';
import { ToastProvider } from '@/components/Toast';
import CopilotWrapper from '@/components/CopilotWrapper';
import BetaBanner from '@/components/BetaBanner';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'FreightFlow — Logistics OS (Beta 8)',
  description: 'Air & Sea freight operations, customs, trucking, WMS, yard, POD — the modern CargoWise alternative.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'FreightFlow', statusBarStyle: 'black-translucent' },
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#0f4c81',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FreightFlow" />
        <meta name="theme-color" content="#0f4c81" />
      </head>
      <body className="bg-slate-50 dark:bg-[#0b1220] text-slate-900 dark:text-slate-100">
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <ToastProvider>
                <BetaBanner />
                <CopilotWrapper>
                  {children}
                </CopilotWrapper>
                <ServiceWorkerRegister />
              </ToastProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
