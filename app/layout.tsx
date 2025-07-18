import ThemeProvider from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/globals.css'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'LEAGENT',
  description: 'Le Agent'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="theme-violet" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <div id="root">
              {children}
              <Toaster richColors />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
