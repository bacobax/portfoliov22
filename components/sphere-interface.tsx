"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

interface SphereInterfaceProps {
  /** Accent color in 0-255 RGB, driven by the active theme accent. */
  color?: { r: number; g: number; b: number }
  theme?: "dark" | "light"
}

/**
 * Immersive WebGL backdrop that places the viewer *inside* a giant spherical
 * computer interface. The camera sits at the centre of an inverted sphere whose
 * inner surface is rendered as a glowing latitude/longitude grid. A depth field
 * of floating "data motes" drifts around the viewer to create parallax, and the
 * whole scene reacts to pointer movement so the user feels like they are looking
 * around the inside of a vast spherical console.
 *
 * Rendered as a fixed, full-viewport, pointer-events-none layer behind the DOM
 * content, so all existing portfolio markup stays interactive and accessible.
 */
export function SphereInterface({ color = { r: 45, g: 212, b: 230 }, theme = "dark" }: SphereInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Live refs so prop changes don't force a full scene rebuild.
  const colorRef = useRef(color)
  const themeRef = useRef(theme)

  useEffect(() => {
    colorRef.current = color
    themeRef.current = theme
  }, [color, theme])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // ---- Renderer -------------------------------------------------------
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    } catch {
      // WebGL unavailable (or blocked) — fail silently, the CSS background remains.
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // ---- Scene & camera (viewer is at the centre of the sphere) ---------
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / container.clientHeight,
      0.1,
      400,
    )
    camera.position.set(0, 0, 0)

    const accent = new THREE.Color(color.r / 255, color.g / 255, color.b / 255)

    // ---- Inner sphere grid (the "console wall" wrapping the viewer) -----
    const SPHERE_RADIUS = 120
    const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 96, 64)
    const sphereMaterial = new THREE.ShaderMaterial({
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
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        varying vec3 vWorld;
        uniform vec3 uAccent;
        uniform float uTime;
        uniform float uLat;
        uniform float uLon;
        uniform float uIsDark;
        uniform float uOpacity;

        // Crisp, resolution-independent grid lines using screen-space derivatives.
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

          // Soft latitude bands so poles glow, equator reads calmer (depth cue).
          float band = smoothstep(0.0, 0.5, abs(vUv.y - 0.5)) * 0.35;

          // A slow vertical sweep, like a refresh scan on a CRT console.
          float sweep = smoothstep(0.0, 0.04, abs(fract(vUv.y - uTime * 0.03) - 0.5) - 0.46);
          sweep = (1.0 - sweep) * 0.6;

          float intensity = grid * (0.55 + band) + sweep * grid;

          // Base fill keeps the wall faintly present even between grid lines.
          float base = uIsDark > 0.5 ? 0.015 : 0.04;
          vec3 col = uAccent * (intensity + base);

          float alpha = (intensity * 0.9 + base) * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    scene.add(sphere)

    // ---- Depth field of floating data motes (parallax) ------------------
    const MOTE_COUNT = prefersReducedMotion ? 280 : 700
    const motePositions = new Float32Array(MOTE_COUNT * 3)
    const moteSizes = new Float32Array(MOTE_COUNT)
    for (let i = 0; i < MOTE_COUNT; i++) {
      // Distribute through a shell between the viewer and the console wall so
      // perspective gives near motes presence and far ones recede into fog.
      const r = 14 + Math.random() * 78
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      motePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      motePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      motePositions[i * 3 + 2] = r * Math.cos(phi)
      moteSizes[i] = 0.6 + Math.random() * 1.8
    }
    const moteGeometry = new THREE.BufferGeometry()
    moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3))
    moteGeometry.setAttribute("aSize", new THREE.BufferAttribute(moteSizes, 1))

    const moteMaterial = new THREE.ShaderMaterial({
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
          // Fade motes that are very close (avoid huge blobs) and very far (fog).
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
    const motes = new THREE.Points(moteGeometry, moteMaterial)
    scene.add(motes)

    // ---- Interaction / motion state ------------------------------------
    const pointer = { x: 0, y: 0 } // target look offset, -1..1
    const look = { x: 0, y: 0 } // eased current look
    let yaw = 0
    let pitch = 0

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return
      pointer.x = THREE.MathUtils.clamp(event.gamma / 30, -1, 1)
      pointer.y = THREE.MathUtils.clamp((event.beta - 45) / 30, -1, 1)
    }
    if (!prefersReducedMotion) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true })
      window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true })
    }

    // ---- Resize ---------------------------------------------------------
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // ---- Render loop ----------------------------------------------------
    const clock = new THREE.Clock()
    let elapsed = 0
    let frameId = 0
    let running = true

    const applyLiveColor = () => {
      const c = colorRef.current
      sphereMaterial.uniforms.uAccent.value.setRGB(c.r / 255, c.g / 255, c.b / 255)
      moteMaterial.uniforms.uAccent.value.setRGB(c.r / 255, c.g / 255, c.b / 255)
      const dark = themeRef.current === "dark"
      sphereMaterial.uniforms.uIsDark.value = dark ? 1 : 0
      sphereMaterial.uniforms.uOpacity.value = dark ? 1.0 : 0.55
      moteMaterial.uniforms.uOpacity.value = dark ? 0.9 : 0.35
    }

    const renderFrame = () => {
      // Single delta source — getElapsedTime() advances the clock internally, so
      // we accumulate our own elapsed value to keep delta and time consistent.
      const delta = Math.min(clock.getDelta(), 0.05)
      elapsed += delta

      applyLiveColor()
      sphereMaterial.uniforms.uTime.value = elapsed

      if (!prefersReducedMotion) {
        // Ease the look toward the pointer for a smooth parallax feel.
        look.x += (pointer.x - look.x) * 0.04
        look.y += (pointer.y - look.y) * 0.04

        // Slow continuous drift so the console feels alive even when idle.
        yaw += delta * 0.02
        pitch = look.y * 0.28
        camera.rotation.order = "YXZ"
        camera.rotation.y = yaw + look.x * 0.4
        camera.rotation.x = -pitch

        // Counter-rotate the depth field a touch for richer parallax.
        motes.rotation.y -= delta * 0.01
        motes.rotation.x = look.y * 0.05
      }

      renderer.render(scene, camera)
    }

    const loop = () => {
      if (!running) return
      renderFrame()
      frameId = requestAnimationFrame(loop)
    }

    // Pause rendering when the tab is hidden to save battery / CPU.
    const handleVisibility = () => {
      if (document.hidden) {
        running = false
        if (frameId) cancelAnimationFrame(frameId)
      } else if (!running) {
        running = true
        clock.getDelta() // discard the long idle delta
        loop()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    if (prefersReducedMotion) {
      // Render a single static frame instead of animating.
      renderFrame()
    } else {
      loop()
    }

    // ---- Cleanup --------------------------------------------------------
    return () => {
      running = false
      if (frameId) cancelAnimationFrame(frameId)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("deviceorientation", handleDeviceOrientation)
      resizeObserver.disconnect()
      sphereGeometry.dispose()
      sphereMaterial.dispose()
      moteGeometry.dispose()
      moteMaterial.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ contain: "strict" }}
    />
  )
}
