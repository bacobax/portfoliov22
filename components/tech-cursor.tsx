"use client"

import { useEffect, useState } from "react"

export function TechCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [isPointerFine, setIsPointerFine] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)")

    const updatePointerMode = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = "matches" in event ? event.matches : mediaQuery.matches
      setIsPointerFine(matches)
      if (!matches) {
        setIsVisible(false)
      }
    }

    updatePointerMode(mediaQuery)

    const listener = (event: MediaQueryListEvent) => updatePointerMode(event)

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener)
    } else {
      mediaQuery.addListener(listener)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", listener)
      } else {
        mediaQuery.removeListener(listener)
      }
    }
  }, [])

  useEffect(() => {
    if (!isPointerFine) {
      return undefined
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [isPointerFine])

  if (!isPointerFine || !isVisible) return null

  return (
    <div
      className="tech-cursor"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Horizontal line */}
      <div className="tech-cursor-horizontal" />

      {/* Vertical line */}
      <div className="tech-cursor-vertical" />

      {/* Center dot */}
      <div className="tech-cursor-center" />

      {/* Corner brackets */}
      <div className="tech-cursor-corner tech-cursor-corner-tl" />
      <div className="tech-cursor-corner tech-cursor-corner-tr" />
      <div className="tech-cursor-corner tech-cursor-corner-bl" />
      <div className="tech-cursor-corner tech-cursor-corner-br" />
    </div>
  )
}
