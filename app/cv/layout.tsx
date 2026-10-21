import type React from "react"
import { Source_Sans_3, Source_Serif_4 } from "next/font/google"

import "@/components/cv/cv-proof.css"

const proofSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-proof-sans",
})

const proofSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-proof-serif",
})

/* The CV tools share the "page proof" frame: fonts and chrome styles live here so
   the portfolio never loads them. `display: contents` keeps the DOM and print flow
   identical to the pages rendered without this wrapper. */
export default function CvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${proofSans.variable} ${proofSerif.variable}`} style={{ display: "contents" }}>
      {children}
    </div>
  )
}
