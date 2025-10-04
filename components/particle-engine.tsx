"use client"

import { useEffect, useRef } from "react"

interface ParticleEngineProps {
  color?: { r: number; g: number; b: number }
  theme?: "dark" | "light"
}

export function ParticleEngine({ color = { r: 255, g: 119, b: 0 }, theme = "dark" }: ParticleEngineProps) {
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

    const particles: Array<{
      x: number
      y: number
      z: number
      type: "pc-case" | "engine" | "fan" | "spark"
      angle: number
      speed: number
      radius?: number
      width?: number
      height?: number
      depth?: number
    }> = []

    // Central PC case
    particles.push({
      x: 0,
      y: 0,
      z: 0,
      type: "pc-case",
      angle: 0,
      speed: 0,
      width: 50,
      height: 80,
      depth: 40,
    })

    // 4 smaller engines positioned around the PC
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const distance = 90
      particles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        z: 0,
        type: "engine",
        angle: 0,
        speed: 0.03 + Math.random() * 0.02,
        radius: 15 + Math.random() * 5,
        depth: 25,
      })
    }

    // Fans inside the PC case
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: -15 + i * 15,
        y: 0,
        z: 20,
        type: "fan",
        angle: 0,
        speed: 0.08 + Math.random() * 0.04,
        radius: 12,
      })
    }

    // Sparks/particles around the system
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 180,
        y: (Math.random() - 0.5) * 180,
        z: (Math.random() - 0.5) * 120,
        type: "spark",
        angle: 0,
        speed: 0.1,
        radius: 1 + Math.random() * 2,
      })
    }

    let rotation = 0

    const animate = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      const currentColor = colorRef.current
      const currentTheme = themeRef.current

      ctx.fillStyle = currentTheme === "dark" ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)"
      ctx.fillRect(0, 0, width, height)

      rotation += 0.006

      particles.forEach((p) => {
        p.angle += p.speed

        const cosR = Math.cos(rotation)
        const sinR = Math.sin(rotation)
        const x = p.x * cosR - p.z * sinR
        const z = p.x * sinR + p.z * cosR

        const scale = 300 / (300 + z)
        const x2d = x * scale + width / 2
        const y2d = p.y * scale + height / 2

        const alpha = 0.4 + scale * 0.6

        if (p.type === "pc-case") {
          // Draw PC case as a 3D box
          ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha})`
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha * 0.1})`
          ctx.lineWidth = 2 * scale

          const w = (p.width || 50) * scale
          const h = (p.height || 80) * scale
          const d = (p.depth || 40) * scale

          // Front face
          ctx.fillRect(x2d - w / 2, y2d - h / 2, w, h)
          ctx.strokeRect(x2d - w / 2, y2d - h / 2, w, h)

          // Side face (3D effect)
          ctx.beginPath()
          ctx.moveTo(x2d + w / 2, y2d - h / 2)
          ctx.lineTo(x2d + w / 2 + d * 0.3, y2d - h / 2 - d * 0.3)
          ctx.lineTo(x2d + w / 2 + d * 0.3, y2d + h / 2 - d * 0.3)
          ctx.lineTo(x2d + w / 2, y2d + h / 2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Top face
          ctx.beginPath()
          ctx.moveTo(x2d - w / 2, y2d - h / 2)
          ctx.lineTo(x2d - w / 2 + d * 0.3, y2d - h / 2 - d * 0.3)
          ctx.lineTo(x2d + w / 2 + d * 0.3, y2d - h / 2 - d * 0.3)
          ctx.lineTo(x2d + w / 2, y2d - h / 2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Draw some details (vents/lights)
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha * 0.8})`
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(x2d - w / 3, y2d - h / 3 + i * 20 * scale, w / 1.5, 3 * scale)
          }
        } else if (p.type === "engine") {
          // Draw engines as cylinders with rotating elements
          ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha})`
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha * 0.2})`
          ctx.lineWidth = 2 * scale

          const r = (p.radius || 15) * scale

          // Cylinder body
          ctx.beginPath()
          ctx.ellipse(x2d, y2d, r, r * 0.4, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          // Rotating blades
          for (let i = 0; i < 6; i++) {
            const bladeAngle = (i / 6) * Math.PI * 2 + p.angle
            const x1 = x2d + Math.cos(bladeAngle) * r * 0.3
            const y1 = y2d + Math.sin(bladeAngle) * r * 0.3 * 0.4
            const x2 = x2d + Math.cos(bladeAngle) * r * 0.9
            const y2 = y2d + Math.sin(bladeAngle) * r * 0.9 * 0.4
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }

          // Center hub
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha})`
          ctx.beginPath()
          ctx.arc(x2d, y2d, r * 0.2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === "fan") {
          // Draw fans inside PC
          ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha * 0.6})`
          ctx.lineWidth = 1.5 * scale

          const r = (p.radius || 12) * scale

          // Fan blades
          for (let i = 0; i < 4; i++) {
            const bladeAngle = (i / 4) * Math.PI * 2 + p.angle
            const x1 = x2d
            const y1 = y2d
            const x2 = x2d + Math.cos(bladeAngle) * r
            const y2 = y2d + Math.sin(bladeAngle) * r
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
        } else if (p.type === "spark") {
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha * 1.5})`
          ctx.beginPath()
          ctx.arc(x2d, y2d, (p.radius || 1) * scale, 0, Math.PI * 2)
          ctx.fill()

          // Random movement
          p.x += (Math.random() - 0.5) * 2
          p.y += (Math.random() - 0.5) * 2
          p.z += (Math.random() - 0.5) * 2

          // Reset if too far
          const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
          if (dist > 180) {
            p.x = (Math.random() - 0.5) * 120
            p.y = (Math.random() - 0.5) * 120
            p.z = (Math.random() - 0.5) * 120
          }
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
