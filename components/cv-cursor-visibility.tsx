"use client"
import { useEffect } from "react"

export default function CvCursorVisibility() {
  useEffect(() => {
    document.body.classList.add("cv-cursor-visible")
    return () => {
      document.body.classList.remove("cv-cursor-visible")
    }
  }, [])

  return null
}
