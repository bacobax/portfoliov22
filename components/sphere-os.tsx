"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import * as THREE from "three"

export interface SphereNode {
  id: string
  cluster: string
  /** Longitude around the viewer, degrees. */
  yaw: number
  /** Latitude above/below the equator, degrees. */
  pitch: number
  /** Tile size in CSS pixels (before perspective scaling). */
  w: number
  h: number
  content: ReactNode
}

export interface SphereCluster {
  id: string
  yaw: number
  pitch: number
}

interface SphereOSProps {
  nodes: SphereNode[]
  clusters: SphereCluster[]
  activeCluster: string
  onActiveClusterChange: (id: string) => void
  color?: { r: number; g: number; b: number }
  theme?: "dark" | "light"
}

// Radius of the tile sphere (CSS px) and how far focus reaches before a tile
// fades into the wall.
const RADIUS = 720
const FOCUS_RANGE = 54 // degrees of angular distance until a tile fully fades
const PITCH_LIMIT = 58

const shortestAngle = (deg: number) => {
  let a = deg % 360
  if (a > 180) a -= 360
  if (a < -180) a += 360
  return a
}

// Angular distance (deg) between a tile direction and the current look direction,
// weighting longitude by latitude so tiles near the poles don't over-separate.
const angularDistance = (yaw: number, pitch: number, camYaw: number, camPitch: number) => {
  const dYaw = shortestAngle(yaw - camYaw) * Math.cos((((pitch + camPitch) / 2) * Math.PI) / 180)
  const dPitch = pitch - camPitch
  return Math.sqrt(dYaw * dYaw + dPitch * dPitch)
}

/**
 * Spherical computer: scatters console tiles across the inner surface of a
 * sphere at varied latitude and longitude, each lying tangent to the wall and
 * facing the viewer. The user looks around in two axes (drag / arrow keys) and
 * the section nav rotates the view to a cluster. A shared WebGL grid + depth
 * field renders the surrounding console shell so the whole environment turns as
 * one. Tiles stay real, interactive DOM.
 */
export function SphereOS({
  nodes,
  clusters,
  activeCluster,
  onActiveClusterChange,
  color = { r: 45, g: 212, b: 230 },
  theme = "dark",
}: SphereOSProps) {
  const glRef = useRef<HTMLDivElement>(null)
  const rotatorRef = useRef<HTMLDivElement>(null)
  const nodeElsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const [mounted, setMounted] = useState(false)

  const camYawRef = useRef(0)
  const camPitchRef = useRef(0)
  const targetYawRef = useRef(0)
  const targetPitchRef = useRef(0)

  const colorRef = useRef(color)
  const themeRef = useRef(theme)
  const nodesRef = useRef(nodes)
  const clustersRef = useRef(clusters)
  const onChangeRef = useRef(onActiveClusterChange)
  const activeRef = useRef(activeCluster)

  useEffect(() => {
    colorRef.current = color
    themeRef.current = theme
    nodesRef.current = nodes
    clustersRef.current = clusters
    onChangeRef.current = onActiveClusterChange
  }, [color, theme, nodes, clusters, onActiveClusterChange])

  // Aim the view at the active cluster when it changes (tab navigation).
  useEffect(() => {
    activeRef.current = activeCluster
    const cluster = clusters.find((c) => c.id === activeCluster)
    if (cluster) {
      // Choose the wrapped target nearest the current yaw so we take the short way.
      const base = camYawRef.current
      targetYawRef.current = base + shortestAngle(cluster.yaw - base)
      targetPitchRef.current = cluster.pitch
    }
  }, [activeCluster, clusters])

  useEffect(() => {
    const glContainer = glRef.current
    const rotator = rotatorRef.current
    if (!glContainer || !rotator) return

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // ---- WebGL console shell -------------------------------------------
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

      sphereGeometry = new THREE.SphereGeometry(120, 96, 64)
      sphereMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uAccent: { value: accent.clone() },
          uTime: { value: 0 },
          uLat: { value: 30.0 },
          uLon: { value: 60.0 },
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
          float gridLine(vec2 coord, float t) {
            vec2 g = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
            return 1.0 - clamp(min(g.x, g.y) - t, 0.0, 1.0);
          }
          void main() {
            vec2 coord = vec2(vUv.x * uLon, vUv.y * uLat);
            float major = gridLine(coord, 0.0);
            float minor = gridLine(coord * 4.0, 0.0) * 0.16;
            float grid = clamp(major + minor, 0.0, 1.0);
            float band = smoothstep(0.0, 0.5, abs(vUv.y - 0.5)) * 0.35;
            float sweep = smoothstep(0.0, 0.04, abs(fract(vUv.y - uTime * 0.03) - 0.5) - 0.46);
            sweep = (1.0 - sweep) * 0.55;
            float intensity = grid * (0.5 + band) + sweep * grid;
            float base = uIsDark > 0.5 ? 0.012 : 0.04;
            gl_FragColor = vec4(uAccent * (intensity + base), (intensity * 0.9 + base) * uOpacity);
          }
        `,
      })
      scene.add(new THREE.Mesh(sphereGeometry, sphereMaterial))

      const MOTE_COUNT = prefersReducedMotion ? 260 : 620
      const pos = new Float32Array(MOTE_COUNT * 3)
      const size = new Float32Array(MOTE_COUNT)
      for (let i = 0; i < MOTE_COUNT; i++) {
        const r = 14 + Math.random() * 80
        const t = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        pos[i * 3] = r * Math.sin(phi) * Math.cos(t)
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(t)
        pos[i * 3 + 2] = r * Math.cos(phi)
        size[i] = 0.6 + Math.random() * 1.8
      }
      moteGeometry = new THREE.BufferGeometry()
      moteGeometry.setAttribute("position", new THREE.BufferAttribute(pos, 3))
      moteGeometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1))
      moteMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uAccent: { value: accent.clone() },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uOpacity: { value: theme === "dark" ? 0.85 : 0.32 },
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
            gl_FragColor = vec4(uAccent, smoothstep(0.5, 0.0, d) * vFade * uOpacity);
          }
        `,
      })
      motes = new THREE.Points(moteGeometry, moteMaterial)
      scene.add(motes)
    }

    // ---- Look controls (2-axis drag on the background) ------------------
    let dragging = false
    let lastX = 0
    let lastY = 0
    let moved = 0

    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      moved = 0
      lastX = e.clientX
      lastY = e.clientY
      glContainer.style.cursor = "grabbing"
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      camYawRef.current -= dx * 0.16
      camPitchRef.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, camPitchRef.current + dy * 0.16))
      targetYawRef.current = camYawRef.current
      targetPitchRef.current = camPitchRef.current
    }
    const onPointerUp = () => {
      if (!dragging) return
      dragging = false
      glContainer.style.cursor = "grab"
      if (moved < 6) return // a tap, not a drag
      // Highlight the nearest cluster without yanking the camera.
      let best: string | null = null
      let bestDist = Infinity
      for (const c of clustersRef.current) {
        const d = angularDistance(c.yaw, c.pitch, camYawRef.current, camPitchRef.current)
        if (d < bestDist) {
          bestDist = d
          best = c.id
        }
      }
      if (best && best !== activeRef.current) {
        activeRef.current = best
        onChangeRef.current(best)
      }
    }

    glContainer.style.cursor = "grab"
    glContainer.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp)

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return
      const list = clustersRef.current
      const idx = list.findIndex((c) => c.id === activeRef.current)
      if (idx < 0) return
      let next = idx
      if (e.key === "ArrowRight") next = (idx + 1) % list.length
      else if (e.key === "ArrowLeft") next = (idx - 1 + list.length) % list.length
      else return
      activeRef.current = list[next].id
      onChangeRef.current(list[next].id)
    }
    window.addEventListener("keydown", onKeyDown)

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

    const renderFrame = () => {
      const delta = Math.min(clock.getDelta(), 0.05)
      elapsed += delta

      if (!dragging) {
        camYawRef.current += (targetYawRef.current - camYawRef.current) * 0.08
        camPitchRef.current += (targetPitchRef.current - camPitchRef.current) * 0.08
      }
      const camYaw = camYawRef.current
      const camPitch = camPitchRef.current

      // Rotate the CSS tile sphere to the look direction. The camera rotation
      // cancels each tile's own yaw so the focused cluster lands dead-centre.
      rotator.style.transform = `rotateX(${camPitch}deg) rotateY(${-camYaw}deg)`

      // Per-tile focus: spotlight tiles near the centre of the view.
      const list = nodesRef.current
      for (let i = 0; i < list.length; i++) {
        const n = list[i]
        const el = nodeElsRef.current.get(n.id)
        if (!el) continue
        const d = angularDistance(n.yaw, n.pitch, camYaw, camPitch)
        if (d > 96) {
          el.style.opacity = "0"
          el.style.visibility = "hidden"
          const inner0 = el.firstElementChild as HTMLElement | null
          if (inner0) inner0.style.pointerEvents = "none"
          continue
        }
        el.style.visibility = "visible"
        const focus = Math.max(0, 1 - d / FOCUS_RANGE)
        el.style.opacity = String(0.08 + focus * 0.92)
        el.style.filter = d < 16 ? "none" : `blur(${Math.min((d - 16) / 14, 4)}px)`
        el.style.zIndex = String(1000 - Math.round(d))
        const inner = el.firstElementChild as HTMLElement | null
        if (inner) inner.style.pointerEvents = d < 22 ? "auto" : "none"
      }

      if (renderer && scene && camera && sphereMaterial) {
        const c = colorRef.current
        const dark = themeRef.current === "dark"
        sphereMaterial.uniforms.uAccent.value.setRGB(c.r / 255, c.g / 255, c.b / 255)
        sphereMaterial.uniforms.uIsDark.value = dark ? 1 : 0
        sphereMaterial.uniforms.uOpacity.value = dark ? 1.0 : 0.55
        sphereMaterial.uniforms.uTime.value = elapsed
        if (moteMaterial) {
          moteMaterial.uniforms.uAccent.value.setRGB(c.r / 255, c.g / 255, c.b / 255)
          moteMaterial.uniforms.uOpacity.value = dark ? 0.85 : 0.32
        }
        camera.rotation.order = "YXZ"
        camera.rotation.y = THREE.MathUtils.degToRad(-camYaw)
        camera.rotation.x = THREE.MathUtils.degToRad(-camPitch)
        if (motes) motes.rotation.y = elapsed * 0.006
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

  const registerNode = (id: string) => (el: HTMLDivElement | null) => {
    if (el) nodeElsRef.current.set(id, el)
    else nodeElsRef.current.delete(id)
  }

  return (
    <>
      <div ref={glRef} aria-hidden="true" className="fixed inset-0 z-0" style={{ touchAction: "none" }} />
      <div className="sphere-vignette" />

      <div className="sphere-stage">
        <div ref={rotatorRef} className="sphere-rotator">
          {nodes.map((n) => (
            <div
              key={n.id}
              ref={registerNode(n.id)}
              className="sphere-tile"
              style={{
                width: `${n.w}px`,
                height: `${n.h}px`,
                marginLeft: `${-n.w / 2}px`,
                marginTop: `${-n.h / 2}px`,
                transform: `rotateY(${n.yaw}deg) rotateX(${-n.pitch}deg) translateZ(${-RADIUS}px)`,
              }}
            >
              <div className="sphere-tile-inner">{mounted ? n.content : null}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
