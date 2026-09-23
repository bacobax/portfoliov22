"use client"

import { useEffect } from "react"

export function CvDocumentTitle({ name }: { name: string }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = name.trim() ? `${name.trim()} - CV` : "Curriculum Vitae"
    return () => { document.title = previousTitle }
  }, [name])

  return null
}
