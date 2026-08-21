import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { I18nProvider } from '@/components/I18nProvider';
import { ToastProvider } from '@/components/Toast';
import CopilotWrapper from '@/components/CopilotWrapper';
import BetaBanner from '@/components/BetaBanner';

export const metadata: Metadata = {
  title: 'FreightFlow — Logistics OS (Beta)',
  description: 'Air & Sea freight operations, customs, trucking, WMS — the modern CargoWise alternative.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-[#0b1220] text-slate-900 dark:text-slate-100">
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <ToastProvider>
                <BetaBanner />
                <CopilotWrapper>
                  {children}
                </CopilotWrapper>
              </ToastProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
