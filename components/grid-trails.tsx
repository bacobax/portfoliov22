"use client"

import { useEffect, useRef } from "react"

interface Trail {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  progress: number
  speed: number
  opacity: number
}

export function GridTrails({ color }: { color: { r: number; g: number; b: number } }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const trailsRef = useRef<Trail[]>([])
  const nextIdRef = useRef(0)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const createTrail = (): Trail => {
      const side = Math.floor(Math.random() * 4) // 0: top, 1: right, 2: bottom, 3: left
      const width = window.innerWidth
      const height = window.innerHeight

      let x1: number, y1: number, x2: number, y2: number

      switch (side) {
        case 0: // top
          x1 = Math.random() * width
          y1 = 0
          x2 = Math.random() * width
          y2 = height
          break
        case 1: // right
          x1 = width
          y1 = Math.random() * height
          x2 = 0
          y2 = Math.random() * height
          break
        case 2: // bottom
          x1 = Math.random() * width
          y1 = height
          x2 = Math.random() * width
          y2 = 0
          break
        default: // left
          x1 = 0
          y1 = Math.random() * height
          x2 = width
          y2 = Math.random() * height
      }

      return {
        id: nextIdRef.current++,
        x1,
        y1,
        x2,
        y2,
        progress: 0,
        speed: 0.015 + Math.random() * 0.02, // Random speed for variety
        opacity: 0,
      }
    }

    const animate = () => {
      // Randomly spawn new trails (low frequency for minimal effect)
      if (Math.random() < 0.01 && trailsRef.current.length < 3) {
        trailsRef.current.push(createTrail())
      }

      // Update existing trails
      trailsRef.current = trailsRef.current.filter((trail) => {
        trail.progress += trail.speed

        // Fade in at start, fade out at end
        if (trail.progress < 0.1) {
          trail.opacity = trail.progress / 0.1
        } else if (trail.progress > 0.9) {
          trail.opacity = (1 - trail.progress) / 0.1
        } else {
          trail.opacity = 1
        }

        return trail.progress < 1
      })

      // Render trails
      if (svg) {
        svg.innerHTML = trailsRef.current
          .map((trail) => {
            const currentX = trail.x1 + (trail.x2 - trail.x1) * trail.progress
            const currentY = trail.y1 + (trail.y2 - trail.y1) * trail.progress

            // Create a gradient trail effect
            const gradientId = `trail-gradient-${trail.id}`
            const trailLength = 100 // Length of the trail in pixels

            const dx = trail.x2 - trail.x1
            const dy = trail.y2 - trail.y1
            const length = Math.sqrt(dx * dx + dy * dy)
            const ratio = trailLength / length

            const startX = currentX - dx * ratio
            const startY = currentY - dy * ratio

            return `
              <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:rgb(${color.r},${color.g},${color.b});stop-opacity:0" />
                  <stop offset="100%" style="stop-color:rgb(${color.r},${color.g},${color.b});stop-opacity:${trail.opacity * 0.6}" />
                </linearGradient>
              </defs>
              <line
                x1="${startX}"
                y1="${startY}"
                x2="${currentX}"
                y2="${currentY}"
                stroke="url(#${gradientId})"
                strokeWidth="2"
                strokeLinecap="round"
              />
            `
          })
          .join("")
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [color])

  return (
    <svg ref={svgRef} className="fixed inset-0 pointer-events-none z-[5]" style={{ width: "100%", height: "100%" }} />
  )
}
