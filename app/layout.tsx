import type { Metadata } from 'next'
import { Bricolage_Grotesque, Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'AI Money Mentor — Personal Finance AI for Indian Investors',
  description: 'Your AI-powered personal finance advisor. FIRE planning, tax optimization, portfolio analysis, and more — designed for India.',
  keywords: 'personal finance, SIP, FIRE, tax planning, mutual funds, India, AI financial advisor',
  openGraph: {
    title: 'AI Money Mentor',
    description: 'Personal Finance AI for Indian Investors',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${outfit.variable} ${jetbrains.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
