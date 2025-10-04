"use client"

import { useEffect, useState } from "react"

export function TechCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
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
  }, [])

  if (!isVisible) return null

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
