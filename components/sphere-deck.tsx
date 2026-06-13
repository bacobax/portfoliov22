"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import * as THREE from "three"

export interface SphereDeckPanel {
  id: string
}

interface SphereDeckProps {
  /** Stable list of panel ids, in ring order. */
  panels: SphereDeckPanel[]
  /** Renders the content for a given panel id (real, interactive DOM). */
  renderPanel: (id: string) => ReactNode
  /** Currently focused panel id (drives which panel rotates to the front). */
  activeId: string
  /** Fired when the user drags/keys to a different panel so the page can sync. */
  onActiveChange: (id: string) => void
  color?: { r: number; g: number; b: number }
  theme?: "dark" | "light"
}

// Angular spacing between adjacent panels on the ring (degrees). Tuned so the
// neighbours of the focused panel peek in at the screen edges — selling the
// feeling of standing inside a curved wall of consoles.
const STEP_DEG = 52
// Radius of the panel cylinder in CSS pixels.
const RADIUS = 820

/**
 * Places the portfolio sections on the inner surface of a sphere/cylinder that
 * wraps around the viewer. The real section DOM is positioned in 3D with CSS
 * transforms (so everything stays interactive and accessible) while a WebGL
 * grid + depth field renders the surrounding "console wall". Both share a single
 * rotation value, so navigating or dragging turns the whole environment as one.
 */
export function SphereDeck({
  panels,
  renderPanel,
  activeId,
  onActiveChange,
  color = { r: 45, g: 212, b: 230 },
  theme = "dark",
}: SphereDeckProps) {
  const glRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const rotatorRef = useRef<HTMLDivElement>(null)
  const panelElsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  const [mounted, setMounted] = useState(false)

  // Live state shared between React, the pointer handlers and the rAF loop.
  const angleRef = useRef(0) // current rotation, degrees
  const targetRef = useRef(0) // eased target rotation, degrees
  const colorRef = useRef(color)
  const themeRef = useRef(theme)
  const panelsRef = useRef(panels)
  const activeIndexRef = useRef(0)
  const onActiveChangeRef = useRef(onActiveChange)

  useEffect(() => {
    colorRef.current = color
    themeRef.current = theme
    panelsRef.current = panels
    onActiveChangeRef.current = onActiveChange
  }, [color, theme, panels, onActiveChange])

  // When the active panel changes (via tabs or drag-snap), aim the ring at it.
  useEffect(() => {
    const idx = panels.findIndex((p) => p.id === activeId)
    if (idx >= 0) {
      activeIndexRef.current = idx
      targetRef.current = idx * STEP_DEG
    }
  }, [activeId, panels])

  useEffect(() => {
    const glContainer = glRef.current
    const stage = stageRef.current
    const rotator = rotatorRef.current
    if (!glContainer || !stage || !rotator) return

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // ---- WebGL console wall (grid sphere + depth motes) -----------------
    let renderer: THREE.WebGLRenderer | null = null
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    } catch {
      renderer = null
    }

    let scene: THREE.Scene | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let sphereGeometry: THREE.SphereGeometry | null = null
    let sphereMaterial: THREE.ShaderMaterial | null = null
    let moteGeometry: THREE.BufferGeometry | null = null
    let moteMaterial: THREE.ShaderMaterial | null = null
    let motes: THREE.Points | null = null

    const accent = new THREE.Color(color.r / 255, color.g / 255, color.b / 255)

    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(glContainer.clientWidth, glContainer.clientHeight)
      renderer.setClearColor(0x000000, 0)
      glContainer.appendChild(renderer.domElement)

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(72, glContainer.clientWidth / glContainer.clientHeight, 0.1, 400)
      camera.position.set(0, 0, 0)

      const SPHERE_RADIUS = 120
      sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 96, 64)
      sphereMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uAccent: { value: accent.clone() },
          uTime: { value: 0 },
          uLat: { value: 28.0 },
          uLon: { value: 56.0 },
          uIsDark: { value: theme === "dark" ? 1 : 0 },
          uOpacity: { value: theme === "dark" ? 1.0 : 0.55 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec2 vUv;
          uniform vec3 uAccent;
          uniform float uTime;
          uniform float uLat;
          uniform float uLon;
          uniform float uIsDark;
          uniform float uOpacity;

          float gridLine(vec2 coord, float thickness) {
            vec2 g = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
            float line = min(g.x, g.y);
            return 1.0 - clamp(line - thickness, 0.0, 1.0);
          }

          void main() {
            vec2 coord = vec2(vUv.x * uLon, vUv.y * uLat);
            float major = gridLine(coord, 0.0);
            float minor = gridLine(coord * 4.0, 0.0) * 0.18;
            float grid = clamp(major + minor, 0.0, 1.0);
            float band = smoothstep(0.0, 0.5, abs(vUv.y - 0.5)) * 0.35;
            float sweep = smoothstep(0.0, 0.04, abs(fract(vUv.y - uTime * 0.03) - 0.5) - 0.46);
            sweep = (1.0 - sweep) * 0.6;
            float intensity = grid * (0.55 + band) + sweep * grid;
            float base = uIsDark > 0.5 ? 0.015 : 0.04;
            vec3 col = uAccent * (intensity + base);
            float alpha = (intensity * 0.9 + base) * uOpacity;
            gl_FragColor = vec4(col, alpha);
          }
        `,
      })
      scene.add(new THREE.Mesh(sphereGeometry, sphereMaterial))

      const MOTE_COUNT = prefersReducedMotion ? 260 : 640
      const motePositions = new Float32Array(MOTE_COUNT * 3)
      const moteSizes = new Float32Array(MOTE_COUNT)
      for (let i = 0; i < MOTE_COUNT; i++) {
        const r = 14 + Math.random() * 78
        const t = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        motePositions[i * 3] = r * Math.sin(phi) * Math.cos(t)
        motePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(t)
        motePositions[i * 3 + 2] = r * Math.cos(phi)
        moteSizes[i] = 0.6 + Math.random() * 1.8
      }
      moteGeometry = new THREE.BufferGeometry()
      moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3))
      moteGeometry.setAttribute("aSize", new THREE.BufferAttribute(moteSizes, 1))
      moteMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uAccent: { value: accent.clone() },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uOpacity: { value: theme === "dark" ? 0.9 : 0.35 },
        },
        vertexShader: /* glsl */ `
          attribute float aSize;
          uniform float uPixelRatio;
          varying float vFade;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float dist = -mv.z;
            vFade = smoothstep(4.0, 18.0, dist) * (1.0 - smoothstep(70.0, 110.0, dist));
            gl_PointSize = aSize * uPixelRatio * (90.0 / dist);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          uniform vec3 uAccent;
          uniform float uOpacity;
          varying float vFade;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            float glow = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uAccent, glow * vFade * uOpacity);
          }
        `,
      })
      motes = new THREE.Points(moteGeometry, moteMaterial)
      scene.add(motes)
    }

    // ---- Pointer drag to rotate (only when starting on the background) --
    let dragging = false
    let dragStartX = 0
    let dragStartAngle = 0

    const minAngle = 0
    const maxAngle = () => (panelsRef.current.length - 1) * STEP_DEG

    const snapToNearest = () => {
      const idx = Math.round(angleRef.current / STEP_DEG)
      const clamped = Math.max(0, Math.min(panelsRef.current.length - 1, idx))
      targetRef.current = clamped * STEP_DEG
      const panel = panelsRef.current[clamped]
      if (panel && clamped !== activeIndexRef.current) {
        activeIndexRef.current = clamped
        onActiveChangeRef.current(panel.id)
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      dragStartX = e.clientX
      dragStartAngle = angleRef.current
      glContainer.style.cursor = "grabbing"
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - dragStartX
      const next = dragStartAngle - dx * 0.12
      angleRef.current = Math.max(minAngle - STEP_DEG * 0.4, Math.min(maxAngle() + STEP_DEG * 0.4, next))
      targetRef.current = angleRef.current
    }
    const onPointerUp = () => {
      if (!dragging) return
      dragging = false
      glContainer.style.cursor = "grab"
      snapToNearest()
    }

    // Drag starts on the WebGL background layer (panels sit above and keep their
    // own pointer events for buttons, links, editing and scrolling).
    glContainer.style.cursor = "grab"
    glContainer.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp)

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const dir = e.key === "ArrowRight" ? 1 : -1
        const next = Math.max(0, Math.min(panelsRef.current.length - 1, activeIndexRef.current + dir))
        if (next !== activeIndexRef.current) {
          activeIndexRef.current = next
          targetRef.current = next * STEP_DEG
          onActiveChangeRef.current(panelsRef.current[next].id)
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)

    // ---- Resize ---------------------------------------------------------
    const handleResize = () => {
      if (renderer && camera) {
        const w = glContainer.clientWidth
        const h = glContainer.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(glContainer)

    // ---- Render loop ----------------------------------------------------
    const clock = new THREE.Clock()
    let elapsed = 0
    let frameId = 0
    let running = true

    const applyLiveColor = () => {
      const c = colorRef.current
      const dark = themeRef.current === "dark"
      if (sphereMaterial) {
        sphereMaterial.uniforms.uAccent.value.setRGB(c.r / 255, c.g / 255, c.b / 255)
        sphereMaterial.uniforms.uIsDark.value = dark ? 1 : 0
        sphereMaterial.uniforms.uOpacity.value = dark ? 1.0 : 0.55
      }
      if (moteMaterial) {
        moteMaterial.uniforms.uAccent.value.setRGB(c.r / 255, c.g / 255, c.b / 255)
        moteMaterial.uniforms.uOpacity.value = dark ? 0.9 : 0.35
      }
    }

    const renderFrame = () => {
      const delta = Math.min(clock.getDelta(), 0.05)
      elapsed += delta

      // Ease current angle toward target (unless mid-drag, where they're equal).
      if (!dragging) {
        angleRef.current += (targetRef.current - angleRef.current) * 0.1
      }
      const angle = angleRef.current

      // Rotate the CSS panel ring around the viewer.
      if (rotator) {
        rotator.style.transform = `rotateY(${-angle}deg)`
      }

      // Spotlight the focused panel: neighbours fade and blur into the wall, and
      // only the front panel keeps pointer interaction so clicks never land on a
      // hidden console.
      const list = panelsRef.current
      for (let i = 0; i < list.length; i++) {
        const el = panelElsRef.current.get(list[i].id)
        if (!el) continue
        const dist = Math.abs(i * STEP_DEG - angle) / STEP_DEG // 0 = front, 1 = one step away
        const focus = Math.max(0, 1 - dist)
        el.style.opacity = String(0.1 + focus * 0.9)
        el.style.filter = dist < 0.4 ? "none" : `blur(${Math.min(dist * 3.5, 4)}px)`
        const inner = el.firstElementChild as HTMLElement | null
        if (inner) inner.style.pointerEvents = dist < 0.5 ? "auto" : "none"
      }

      // Turn the WebGL wall by the same angle so the environment moves as one,
      // plus a gentle idle drift for life.
      if (renderer && scene && camera && sphereMaterial) {
        applyLiveColor()
        sphereMaterial.uniforms.uTime.value = elapsed
        const idle = prefersReducedMotion ? 0 : elapsed * 0.6
        camera.rotation.order = "YXZ"
        camera.rotation.y = THREE.MathUtils.degToRad(angle) + THREE.MathUtils.degToRad(idle * 0.15)
        if (motes) motes.rotation.y = -THREE.MathUtils.degToRad(angle) * 0.4 - elapsed * 0.01
        renderer.render(scene, camera)
      }
    }

    const loop = () => {
      if (!running) return
      renderFrame()
      frameId = requestAnimationFrame(loop)
    }

    const handleVisibility = () => {
      if (document.hidden) {
        running = false
        if (frameId) cancelAnimationFrame(frameId)
      } else if (!running) {
        running = true
        clock.getDelta()
        loop()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    setMounted(true)
    loop()

    return () => {
      running = false
      if (frameId) cancelAnimationFrame(frameId)
      document.removeEventListener("visibilitychange", handleVisibility)
      glContainer.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("keydown", onKeyDown)
      resizeObserver.disconnect()
      sphereGeometry?.dispose()
      sphereMaterial?.dispose()
      moteGeometry?.dispose()
      moteMaterial?.dispose()
      renderer?.dispose()
      if (renderer && renderer.domElement.parentNode === glContainer) {
        glContainer.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const registerPanel = (id: string) => (el: HTMLDivElement | null) => {
    if (el) panelElsRef.current.set(id, el)
    else panelElsRef.current.delete(id)
  }

  return (
    <>
      {/* WebGL console wall + drag surface (behind the panels). */}
      <div ref={glRef} aria-hidden="true" className="fixed inset-0 z-0" style={{ touchAction: "pan-y" }} />
      <div className="sphere-vignette" />

      {/* CSS 3D stage holding the section panels on the curved surface. */}
      <div ref={stageRef} className="sphere-stage">
        <div ref={rotatorRef} className="sphere-rotator">
          {panels.map((panel, index) => (
            <div
              key={panel.id}
              ref={registerPanel(panel.id)}
              className="sphere-panel"
              style={{ transform: `translate(-50%, -50%) rotateY(${index * STEP_DEG}deg) translateZ(${-RADIUS}px)` }}
            >
              <div className="sphere-panel-inner">{mounted ? renderPanel(panel.id) : null}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
