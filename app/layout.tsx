import type React from "react"
import type { Metadata } from "next"
import { Anonymous_Pro, Open_Sans } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"
import { Toaster } from "sonner"

const anonymousPro = Anonymous_Pro({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-anonymous-pro",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
})

export const metadata: Metadata = {
  title: "Francesco Bassignana - Portfolio",
  description: "Personal portfolio with hyper tech dashboard aesthetic",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-mono ${anonymousPro.variable} ${openSans.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
