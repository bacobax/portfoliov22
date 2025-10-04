"use client"

import { useEffect, useRef } from "react"

interface ParticleBrainProps {
  color?: { r: number; g: number; b: number }
  theme?: "dark" | "light"
}

export function ParticleBrain({ color = { r: 255, g: 119, b: 0 }, theme = "dark" }: ParticleBrainProps) {
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

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    updateSize()
    window.addEventListener("resize", updateSize)

    interface Neuron {
      x: number
      y: number
      z: number
      layer: number
      activation: number
      targetActivation: number
    }

    const layers = [4, 6, 6, 4] // Input, Hidden1, Hidden2, Output layers
    const neurons: Neuron[] = []
    const connections: Array<{ from: number; to: number; weight: number }> = []

    const layerSpacing = 120
    const startZ = -180
    const layerStartIndices: number[] = []

    layers.forEach((neuronCount, layerIndex) => {
      const verticalSpacing = 50
      const startY = (-(neuronCount - 1) * verticalSpacing) / 2

      // Track where this layer starts
      layerStartIndices[layerIndex] = neurons.length

      for (let i = 0; i < neuronCount; i++) {
        neurons.push({
          x: 0,
          y: startY + i * verticalSpacing,
          z: startZ + layerIndex * layerSpacing,
          layer: layerIndex,
          activation: Math.random(),
          targetActivation: Math.random(),
        })
      }

      // Create connections to previous layer
      if (layerIndex > 0) {
        const currentLayerStart = layerStartIndices[layerIndex]
        const prevLayerStart = layerStartIndices[layerIndex - 1]
        const prevLayerCount = layers[layerIndex - 1]

        for (let i = 0; i < neuronCount; i++) {
          for (let j = 0; j < prevLayerCount; j++) {
            connections.push({
              from: prevLayerStart + j,
              to: currentLayerStart + i,
              weight: Math.random(),
            })
          }
        }
      }
    })

    let rotation = 0
    let time = 0

    const animate = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      const currentColor = colorRef.current
      const currentTheme = themeRef.current

      ctx.fillStyle = currentTheme === "dark" ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)"
      ctx.fillRect(0, 0, width, height)

      rotation += 0.003
      time += 0.02

      // Update neuron activations with wave effect
      neurons.forEach((neuron, i) => {
        if (Math.random() < 0.02) {
          neuron.targetActivation = Math.random()
        }
        neuron.activation += (neuron.targetActivation - neuron.activation) * 0.1
      })

      // Rotate and project neurons
      const projected = neurons.map((neuron) => {
        const cosR = Math.cos(rotation)
        const sinR = Math.sin(rotation)
        const x = neuron.x * cosR - neuron.z * sinR
        const z = neuron.x * sinR + neuron.z * cosR

        const scale = 400 / (400 + z)
        return {
          x: x * scale + width / 2,
          y: neuron.y * scale + height / 2,
          scale,
          z,
          activation: neuron.activation,
        }
      })

      // Draw connections first (behind neurons)
      connections.forEach((conn) => {
        const from = projected[conn.from]
        const to = projected[conn.to]

        if (!from || !to) return

        // Only draw if both neurons are visible
        if (from.z < 200 && to.z < 200) {
          const avgActivation = (from.activation + to.activation) / 2
          const opacity = 0.1 + avgActivation * 0.3

          ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${opacity})`
          ctx.lineWidth = 0.5 + conn.weight * 1.5
          ctx.beginPath()
          ctx.moveTo(from.x, from.y)
          ctx.lineTo(to.x, to.y)
          ctx.stroke()

          // Animated signal flow
          if (Math.random() < 0.01) {
            const t = Math.random()
            const signalX = from.x + (to.x - from.x) * t
            const signalY = from.y + (to.y - from.y) * t

            ctx.fillStyle = `rgba(${currentColor.r}, ${Math.min(255, currentColor.g + 80)}, ${currentColor.b}, 0.8)`
            ctx.beginPath()
            ctx.arc(signalX, signalY, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })

      // Draw neurons
      neurons.forEach((neuron, i) => {
        const proj = projected[i]

        if (!proj) return

        if (proj.z < 200) {
          const size = 3 + proj.scale * 4 + neuron.activation * 3
          const opacity = 0.5 + neuron.activation * 0.5

          const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size * 2)
          gradient.addColorStop(0, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${opacity})`)
          gradient.addColorStop(0.5, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${opacity * 0.3})`)
          gradient.addColorStop(1, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0)`)

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(proj.x, proj.y, size * 2, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = `rgba(${currentColor.r}, ${Math.min(255, currentColor.g + neuron.activation * 100)}, ${
            currentColor.b
          }, ${0.8 + opacity * 0.2})`
          ctx.beginPath()
          ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2)
          ctx.fill()

          // Highlight
          ctx.fillStyle = `rgba(255, 255, 255, ${neuron.activation * 0.6})`
          ctx.beginPath()
          ctx.arc(proj.x - size * 0.3, proj.y - size * 0.3, size * 0.4, 0, Math.PI * 2)
          ctx.fill()
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
