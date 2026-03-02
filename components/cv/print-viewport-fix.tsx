"use client"
import { useEffect } from "react"

/**
 * On mobile browsers, "print to PDF" renders at the current viewport width
 * (e.g. 375px), ignoring @page declarations. This component swaps the
 * viewport meta tag to a desktop-equivalent width before printing and
 * restores it afterwards, so the desktop CV layout is used for the PDF.
 */
export default function PrintViewportFix() {
  useEffect(() => {
    const getOrCreateViewportMeta = (): HTMLMetaElement => {
      let el = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
      if (!el) {
        el = document.createElement("meta")
        el.name = "viewport"
        document.head.appendChild(el)
      }
      return el
    }

    const beforePrint = () => {
      const meta = getOrCreateViewportMeta()
      meta.dataset.prevContent = meta.content
      // Force the browser to lay out at A4-like desktop width before printing
      meta.content = "width=1240, initial-scale=1"
    }

    const afterPrint = () => {
      const meta = getOrCreateViewportMeta()
      meta.content = meta.dataset.prevContent ?? "width=device-width, initial-scale=1"
      delete meta.dataset.prevContent
    }

    window.addEventListener("beforeprint", beforePrint)
    window.addEventListener("afterprint", afterPrint)

    // matchMedia fallback for Safari iOS which fires matchMedia change
    // instead of beforeprint/afterprint in some versions
    let mql: MediaQueryList | null = null
    try {
      mql = window.matchMedia("print")
      const mqlHandler = (e: MediaQueryListEvent) => {
        if (e.matches) beforePrint()
        else afterPrint()
      }
      mql.addEventListener("change", mqlHandler)
      return () => {
        window.removeEventListener("beforeprint", beforePrint)
        window.removeEventListener("afterprint", afterPrint)
        mql?.removeEventListener("change", mqlHandler)
      }
    } catch {
      return () => {
        window.removeEventListener("beforeprint", beforePrint)
        window.removeEventListener("afterprint", afterPrint)
      }
    }
  }, [])

  return null
}
