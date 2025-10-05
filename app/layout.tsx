import type React from "react"
import type { Metadata } from "next"
import { Anonymous_Pro } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"

const anonymousPro = Anonymous_Pro({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-anonymous-pro",
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
      <body className={`font-mono ${anonymousPro.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
