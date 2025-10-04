"use client"

import { useEffect, useRef } from "react"

interface ParticleSphereProps {
  color?: { r: number; g: number; b: number }
  theme?: "dark" | "light"
}

export function ParticleSphere({ color = { r: 255, g: 119, b: 0 }, theme = "dark" }: ParticleSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colorRef = useRef(color)
  const themeRef = useRef(theme)

  // Update refs when props change
  useEffect(() => {
    colorRef.current = color
    themeRef.current = theme
  }, [color, theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    updateSize()
    window.addEventListener("resize", updateSize)

    const words = ["HTML", "CSS", "JS", "REACT", "NEXT", "API", "REST", "HTTP", "DOM", "WEB", "UI", "UX"]
    const particles: Array<{
      x: number
      y: number
      z: number
      word: string
      angle: number
      radius: number
    }> = []

    const particleCount = 80
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = 100

      particles.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        word: words[Math.floor(Math.random() * words.length)],
        angle: Math.random() * Math.PI * 2,
        radius: radius,
      })
    }

    let rotation = 0

    const animate = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      const currentColor = colorRef.current
      const currentTheme = themeRef.current

      ctx.fillStyle = currentTheme === "dark" ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)"
      ctx.fillRect(0, 0, width, height)

      rotation += 0.008

      const sortedParticles = [...particles].sort((a, b) => {
        const az = a.x * Math.sin(rotation) + a.z * Math.cos(rotation)
        const bz = b.x * Math.sin(rotation) + b.z * Math.cos(rotation)
        return az - bz
      })

      sortedParticles.forEach((p) => {
        const cosR = Math.cos(rotation)
        const sinR = Math.sin(rotation)
        const x = p.x * cosR - p.z * sinR
        const z = p.x * sinR + p.z * cosR

        const scale = 300 / (300 + z)
        const x2d = x * scale + width / 2
        const y2d = p.y * scale + height / 2

        const alpha = 0.3 + scale * 0.7
        const size = scale * 1.5

        ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha})`
        ctx.beginPath()
        ctx.arc(x2d, y2d, size, 0, Math.PI * 2)
        ctx.fill()

        if (Math.random() > 0.95) {
          ctx.font = `${8 + scale * 4}px "Anonymous Pro", monospace`
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha * 0.6})`
          ctx.fillText(p.word, x2d + 5, y2d)
        }
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", updateSize)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
