import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext';

const font = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Absensi Karyawan Face Recognition',
  description: 'Sistem absensi modern berbasis wajah.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={font.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}

