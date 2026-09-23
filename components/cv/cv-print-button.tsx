"use client"

import { useState } from "react"
import { Download } from "lucide-react"

export function CvPrintButton({ className = "toolbar__button" }: { className?: string }) {
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState("")
  const print = async () => {
    setPreparing(true)
    setError("")
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        Promise.all([document.fonts.ready, ...Array.from(document.querySelectorAll<HTMLImageElement>(".cv-document img")).map((img) => img.decode())]),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Fonts or photo are still loading. Try again in a moment.")), 8000) }),
      ])
      window.print()
    } catch { setError("A photo or font could not finish loading. Check the preview and try again.") }
    finally { clearTimeout(timeout); setPreparing(false) }
  }
  return <div className="cv-print-control">
    <button type="button" className={className} disabled={preparing} onClick={() => void print()}><Download size={16} />{preparing ? "Preparing…" : "Save ATS PDF"}</button>
    <p className="cv-print-help">The saved CV uses a standardized single-column layout for reliable ATS reading order. In the print dialog, turn off <strong>Headers and footers</strong>.</p>
    <details className="cv-print-help"><summary>PDF settings</summary><p>Choose Save as PDF, use the document’s paper size, set scale to 100%, and turn off browser “Headers and footers” to remove the date, title, URL, and page numbers.</p><p>The PDF intentionally omits photos, sidebars, and decorative regional styling. Check each page at normal size and verify selectable text, dates, headings, and links before sending.</p></details>
    {error && <p role="alert">{error}</p>}
  </div>
}
