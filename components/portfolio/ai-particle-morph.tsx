"use client"

import { useEffect, useRef, useState } from "react"

/* 128×128 one-bit masks derived from the supplied logo files. Embedding the
   masks keeps the render independent from image-load permissions. */
const CODEX_MASK =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAA//gAAAAAAAAAAAAAAAAAB//+AAAAAAAAAAAAAAAAAA///wAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAf///4AAAAAAAAAAAAAAAAP////AAAAAAAAAAAAAAAAH////4AAAAAAAAAAAAAAAD/////P+AAAAAAAAAAAAAB///////8AAAAAAAAAAAAAf///////wAAAAAAAAAAAAP///////+AAAAAAAAAAAAH////////4AAAAAAAAAAAB/////////AAAAAAAAAAAA/////////4AAAAAAAAAAAP/////////AAAAAAAAAAAH/////////4AAAAAAAAAAB/////////+AAAAAAAAAAAf/////////wAAAAAAAAAAP/////////8AAAAAAAAAAD//////////gAAAAAAAAAA//////////8AAAAAAAAAAf//////////AAAAAAAAAAf//////////wAAAAAAAAAf//////////+AAAAAAAAAP///////////gAAAAAAAAP///////////4AAAAAAAAD////////////AAAAAAAAB////////////wAAAAAAAA////////////8AAAAAAAAf////////////gAAAAAAAP////////////4AAAAAAAD////////////+AAAAAAAB/////////////gAAAAAAAf////////////4AAAAAAAP////////////+AAAAAAAD/////////////gAAAAAAB/////////////4AAAAAAAf////////////+AAAAAAAP///H/////////gAAAAAAD///g/////////4AAAAAAA///4H////////+AAAAAAAP//+B/////////gAAAAAAD///gf////////4AAAAAAB///4D////////+AAAAAAAf///A/////////gAAAAAAH///wH////////8AAAAAAB///+B/////////AAAAAAAf///gP////////4AAAAAAH///4D////////+AAAAAAB////Af////////wAAAAAAf///wH////////8AAAAAAH///+A/////////gAAAAAB////gP////////4AAAAAAf///8D////////+AAAAAAH////Af////////wAAAAAB////4H////////8AAAAAAP///+A/////////AAAAAAD////gP////////wAAAAAA////4D////////+AAAAAAP///+B/////////gAAAAAB////Af////////4AAAAAAf///wP////////+AAAAAAH///4D/////////gAAAAAB///+A/////////4AAAAAAP///Af////////+AAAAAAD///wH/////////gAAAAAAf//4D/////////4AAAAAAD//+A/////////+AAAAAAA///gf/////////gAAAAAAH//wH//4AAH///4AAAAAAB//8D//4AAA///+AAAAAAAf/+A//8AAAH///AAAAAAAH//gf//AAAB///wAAAAAAB//4H//wAAAf//8AAAAAAAf/+D//8AAAH///AAAAAAAH//w///gAAB///wAAAAAAB//+f//8AAA///4AAAAAAAf////////////+AAAAAAAH/////////////AAAAAAAB/////////////wAAAAAAAf////////////8AAAAAAAH////////////+AAAAAAAB/////////////AAAAAAAAf////////////wAAAAAAAH////////////4AAAAAAAA////////////8AAAAAAAAP////////////AAAAAAAAD////////////gAAAAAAAA////////////wAAAAAAAAH///////////4AAAAAAAAB///////////4AAAAAAAAAf//////////8AAAAAAAAAD//////////8AAAAAAAAAA//////////8AAAAAAAAAAH//////////AAAAAAAAAAB//////////gAAAAAAAAAAP/////////4AAAAAAAAAAB/////////+AAAAAAAAAAAf/////////gAAAAAAAAAAD/////////wAAAAAAAAAAAf////////8AAAAAAAAAAAD////////+AAAAAAAAAAAAf////////gAAAAAAAAAAAD////////wAAAAAAAAAAAAP///////8AAAAAAAAAAAAA///////+AAAAAAAAAAAAAD///////AAAAAAAAAAAAAAAAf////gAAAAAAAAAAAAAAAH////wAAAAAAAAAAAAAAAA////4AAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAf//+AAAAAAAAAAAAAAAAAB//+AAAAAAAAAAAAAAAAAAP/+AAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

const CLAUDE_RUNS =
  "Jh5hJx5hKB5hKR5hKh5hKx5hLB5hLR5hLh5hLx5hMB5hMR5hMh4pMi9QMlZhMx4pMy9QM1ZhNB4pNC9QNFZhNR4pNS9QNVZhNh4pNi9QNlZhNx4pNy9QN1ZhOB4pOC9QOFZhOR4pOS9QOVZhOh4pOi9QOlZhOx4pOy9QO1ZhPBNsPRNsPhNsPxNsQBNsQRNsQhNsQxNsRBNsRRNsRhNsRxNsSB5hSR5hSh5hSx5hTB5hTR5hTh5hTx5hUB5hUR5hUh5hUyQpUy80U0tQU1ZbVCQpVC80VEtQVFZbVSQpVS80VUtQVVZbViQpVi80VktQVlZbVyQpVy80V0tQV1ZbWCQpWC80WEtQWFZbWSQpWS80WUtQWVZbWiQpWi80WktQWlZbWyQpWy80W0tQW1ZbXCQpXC80XEtQXFZbXSQpXS80XUtQXVZb"

type Shape = "blob" | "codex" | "claude"

/* The blob is the resting form; it briefly resolves into each logo and dissolves
   back. Keeping the blob between logos makes every transition read as a morph. */
const SEQUENCE: Shape[] = ["blob", "claude", "blob", "codex"]
const HOLD_SECONDS = 3.1
const MORPH_SECONDS = 2
const CYCLE = HOLD_SECONDS + MORPH_SECONDS

const SHAPE_LABEL: Record<Shape, string> = {
  blob: "idle · particle field",
  codex: "◇ Codex",
  claude: "◇ Claude Code",
}

const smoothstep = (value: number) => value * value * (3 - 2 * value)

const decodeRaw = (kind: "codex" | "claude"): Array<[number, number]> => {
  const points: Array<[number, number]> = []
  if (kind === "claude") {
    const raw = window.atob(CLAUDE_RUNS)
    for (let index = 0; index < raw.length; index += 3) {
      const y = raw.charCodeAt(index)
      const start = raw.charCodeAt(index + 1)
      const end = raw.charCodeAt(index + 2)
      for (let x = start; x <= end; x += 1) points.push([x, y])
    }
  } else {
    const raw = window.atob(CODEX_MASK)
    for (let index = 0; index < 128 * 128; index += 1) {
      const byte = raw.charCodeAt(index >> 3) || 0
      if ((byte >> (7 - (index & 7))) & 1) {
        points.push([index % 128, Math.floor(index / 128)])
      }
    }
  }
  return points
}

/* Even-sample a logo point cloud into exactly `count` targets, normalised to a
   ~[-1,1] box (aspect preserved) so it renders at the same scale as the blob. */
const sampleLogo = (raw: Array<[number, number]>, count: number): Float32Array => {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of raw) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const out = new Float32Array(count * 2)
  const length = raw.length || 1
  for (let index = 0; index < count; index += 1) {
    const point = raw[Math.floor((index / count) * length)] ?? [centerX, centerY]
    out[index * 2] = ((point[0] - centerX) / span) * 1.9
    out[index * 2 + 1] = ((point[1] - centerY) / span) * 1.9
  }
  return out
}

/* A filled disc via a Fibonacci spiral — a dense, even, round particle blob. */
const makeBlob = (count: number): Float32Array => {
  const out = new Float32Array(count * 2)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let index = 0; index < count; index += 1) {
    const radius = Math.sqrt((index + 0.5) / count) * 0.94
    const angle = index * golden
    out[index * 2] = Math.cos(angle) * radius
    out[index * 2 + 1] = Math.sin(angle) * radius
  }
  return out
}

type AiParticleMorphProps = {
  onActiveShape?: (shape: Shape) => void
}

export function AiParticleMorph({ onActiveShape }: AiParticleMorphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onActiveShapeRef = useRef(onActiveShape)
  onActiveShapeRef.current = onActiveShape
  const [activeShape, setActiveShape] = useState<Shape>("blob")

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = canvas?.parentElement
    const context = canvas?.getContext("2d")
    if (!canvas || !stage || !context) return

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const mobile = window.matchMedia("(max-width: 760px)").matches
    const count = mobile ? 1900 : 3200

    const shapes: Record<Shape, Float32Array> = {
      blob: makeBlob(count),
      codex: sampleLogo(decodeRaw("codex"), count),
      claude: sampleLogo(decodeRaw("claude"), count),
    }

    /* per-particle personality: size, colour bias and idle phase */
    const random = new Float32Array(count)
    const phase = new Float32Array(count)
    for (let index = 0; index < count; index += 1) {
      random[index] = ((index * 47) % 101) / 100
      phase[index] = ((index * 31) % 360) * (Math.PI / 180)
    }

    let width = 1
    let height = 1
    let dpr = 1
    let visible = true
    let presence = reducedMotion ? 1 : 0
    let pointerX = -9999
    let pointerY = -9999
    let frame = 0
    let startTime = 0
    let reportedShape: Shape | null = null

    const resize = () => {
      const rect = stage.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 1.6)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      pointerX = event.clientX - rect.left
      pointerY = event.clientY - rect.top
    }
    const onPointerLeave = () => {
      pointerX = -9999
      pointerY = -9999
    }

    const draw = (time: number) => {
      if (!startTime) startTime = time
      context.clearRect(0, 0, width, height)
      presence += ((visible ? 1 : 0) - presence) * (reducedMotion ? 1 : 0.06)

      const seconds = reducedMotion ? HOLD_SECONDS : (time - startTime) / 1000

      /* Which two shapes are we between, and how far? */
      const cycleIndex = Math.floor(seconds / CYCLE)
      const local = seconds - cycleIndex * CYCLE
      const fromShape = SEQUENCE[cycleIndex % SEQUENCE.length]
      const toShape = SEQUENCE[(cycleIndex + 1) % SEQUENCE.length]
      const morph =
        local <= HOLD_SECONDS
          ? 0
          : smoothstep((local - HOLD_SECONDS) / MORPH_SECONDS)
      const from = shapes[fromShape]
      const to = shapes[toShape]

      const dominant = morph < 0.5 ? fromShape : toShape
      if (dominant !== reportedShape) {
        reportedShape = dominant
        setActiveShape(dominant)
        onActiveShapeRef.current?.(dominant)
      }

      const side = Math.min(width, height) * 0.92
      const half = side / 2
      const centerX = width / 2
      const centerY = height / 2
      /* gentle breathing while a shape is held */
      const breathe = 1 + Math.sin(seconds * 0.8) * 0.02
      const scatter = (1 - presence) * Math.min(width, height) * 0.3

      for (let index = 0; index < count; index += 1) {
        const nx =
          from[index * 2] + (to[index * 2] - from[index * 2]) * morph
        const ny =
          from[index * 2 + 1] +
          (to[index * 2 + 1] - from[index * 2 + 1]) * morph

        const idleX = Math.sin(seconds * 0.7 + phase[index] + ny * 2) * 0.9
        const idleY = Math.cos(seconds * 0.55 + phase[index] + nx * 2) * 0.9

        let x = centerX + nx * half * breathe + idleX
        let y = centerY + ny * half * breathe + idleY

        /* scatter outward before the blob has faded in */
        if (scatter > 0.5) {
          x += Math.cos(phase[index]) * scatter * random[index]
          y += Math.sin(phase[index]) * scatter * random[index]
        }

        const dx = x - pointerX
        const dy = y - pointerY
        const distance = Math.max(1, Math.hypot(dx, dy))
        const influence = reducedMotion ? 0 : Math.max(0, 1 - distance / 90)
        x += (dx / distance) * influence * 14
        y += (dy / distance) * influence * 14

        const pulse = 0.8 + Math.sin(seconds * 1.1 + phase[index]) * 0.12
        const radius = (0.7 + random[index] * 1.15) * pulse
        context.globalAlpha = presence * (0.42 + random[index] * 0.5)
        context.fillStyle = random[index] > 0.975 ? "#f4ee62" : "#aba6f1"
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }

      context.globalAlpha = 1
      if (!reducedMotion) frame = window.requestAnimationFrame(draw)
    }

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
      },
      { rootMargin: "18% 0px 18% 0px" },
    )

    resizeObserver.observe(stage)
    intersectionObserver.observe(stage)
    stage.addEventListener("pointermove", onPointerMove)
    stage.addEventListener("pointerleave", onPointerLeave)
    resize()
    draw(0)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      stage.removeEventListener("pointermove", onPointerMove)
      stage.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="ai-morph-canvas" aria-hidden="true" />
      <figcaption className="ai-morph-caption mono">
        {SHAPE_LABEL[activeShape]}
      </figcaption>
    </>
  )
}
