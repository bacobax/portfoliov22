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
    <button type="button" className={className} disabled={preparing} onClick={() => void print()}><Download size={16} />{preparing ? "Preparing…" : "Save as PDF"}</button>
    <details className="cv-print-help"><summary>PDF settings</summary><p>Choose Save as PDF, use the document’s paper size, set scale to 100%, and turn off browser “Headers and footers” to remove the date, title, URL, and page numbers.</p><p>Check each page at normal size. Verify selectable text, dates, headings, and links before sending. Browser print settings control the final pagination.</p></details>
    {error && <p role="alert">{error}</p>}
  </div>
}
