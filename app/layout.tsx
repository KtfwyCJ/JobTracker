import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { StoreProvider } from './_lib/store'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'JobTracker',
  description: 'Track your job applications',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="h-screen overflow-hidden font-sans antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}
