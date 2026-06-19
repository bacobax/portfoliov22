import * as THREE from "three"

import { makePanelCanvas } from "./panel-painter"
import {
  CURVE_SPREAD,
  DEG,
  FOCUS_BOW,
  FOCUS_DIST,
  FOCUS_FILL,
  FOCUS_ORDER,
  FOV,
  hslToRgbUnit,
  PANEL_DEFS,
  PANEL_ORDER,
  PANEL_SEGMENTS,
  PITCH_MAX,
  PITCH_MIN,
  SPHERE_RADIUS,
  YAW_CLAMP,
  type FocusPanelName,
  type PanelName,
} from "./panel-layout"
import type { SphereSceneSnapshot } from "./sphere-types"

type PanelUserData = {
  name: PanelName
  born: number
  delay: number
  yaw0: number
  pitch0: number
  aspect: number
  gridUV: Array<[number, number]>
  spherePos: Float32Array
  axisN: THREE.Vector3
  axisR: THREE.Vector3
  axisU: THREE.Vector3
  morphed?: boolean
}

type PanelMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> & {
  userData: PanelUserData
}

type SphereSceneOptions = {
  canvas: HTMLCanvasElement
  snapshot: SphereSceneSnapshot
  onFocusChange: (name: FocusPanelName | null) => void
  onActivePanelChange: (name: FocusPanelName | null) => void
  onReady: () => void
  onHintHidden: () => void
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const easeIO = (value: number) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2

const dir = (yaw: number, pitch: number) =>
  new THREE.Vector3(
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
    -Math.cos(pitch) * Math.cos(yaw),
  )

const disposeMaterial = (material: THREE.Material) => {
  const maybeMap = (material as THREE.Material & { map?: THREE.Texture | null }).map
  maybeMap?.dispose()
  material.dispose()
}

const panelCenter = (name: PanelName) => {
  const def = PANEL_DEFS[name]
  return {
    yaw: def.yaw * DEG * CURVE_SPREAD,
    pitch: def.pitch * DEG * CURVE_SPREAD,
  }
}

export class SphereScene {
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400)
  private readonly raycaster = new THREE.Raycaster()
  private readonly panelGroup = new THREE.Group()
  private readonly worldUp = new THREE.Vector3(0, 1, 0)
  private readonly sprite: THREE.CanvasTexture
  private readonly onFocusChange: SphereSceneOptions["onFocusChange"]
  private readonly onActivePanelChange: SphereSceneOptions["onActivePanelChange"]
  private readonly onReady: SphereSceneOptions["onReady"]
  private readonly onHintHidden: SphereSceneOptions["onHintHidden"]

  private snapshot: SphereSceneSnapshot
  private maxAniso = 1
  private particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null
  private wire: THREE.LineSegments<THREE.WireframeGeometry, THREE.LineBasicMaterial> | null = null
  private panelMeshes: PanelMesh[] = []
  private animationFrame = 0
  private startTime = performance.now()
  private disposed = false
  private ready = false

  private uYaw = 0
  private uPitch = 5 * DEG
  private pxYaw = 0
  private pxPitch = 5 * DEG
  private camYaw = 0
  private camPitch = 5 * DEG
  private mouseNX = 0
  private mouseNY = 0

  private focusName: PanelName | null = null
  private focusMesh: PanelMesh | null = null
  private focusT = 0
  private focusScroll = 0
  private lastActive: FocusPanelName | null = null
  private lastFocus: FocusPanelName | null = null
  private lastTextureKey = ""
  private lastHeaderTimeKey = ""
  private mobileActivePanel: FocusPanelName | null = null
  private mobileActiveUntil = 0

  private dragging = false
  private downX = 0
  private downY = 0
  private lastX = 0
  private lastY = 0
  private moved = false
  private hintGone = false

  constructor(options: SphereSceneOptions) {
    this.canvas = options.canvas
    this.snapshot = options.snapshot
    this.onFocusChange = options.onFocusChange
    this.onActivePanelChange = options.onActivePanelChange
    this.onReady = options.onReady
    this.onHintHidden = options.onHintHidden

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy()
    this.sprite = this.createCircleSprite()
    this.scene.add(this.panelGroup)

    this.resize()
    this.applyTheme()
    this.buildBackdrop()
    this.buildPanels()
    this.addListeners()
    this.renderStaticBootFrame()
    this.animationFrame = requestAnimationFrame(this.tick)
    window.setTimeout(() => {
      if (!this.disposed && !this.ready) {
        this.panelMeshes.forEach((mesh) => {
          mesh.material.opacity = 1
        })
        this.render()
        this.markReady()
      }
    }, 400)
    window.setTimeout(() => this.markReady(), 350)
  }

  setSnapshot(snapshot: SphereSceneSnapshot) {
    this.snapshot = snapshot
    this.applyTheme()
    this.refreshTextures()
  }

  setMobileScrollProgress(progress: number) {
    if (this.focusName) {
      return
    }

    const clamped = clamp(progress, 0, 1)
    const scaled = clamped * (FOCUS_ORDER.length - 1)
    const index = clamp(Math.round(scaled), 0, FOCUS_ORDER.length - 1)
    const local = clamp(scaled - index, -0.5, 0.5)
    const target = PANEL_DEFS[FOCUS_ORDER[index]]
    const activePanel = FOCUS_ORDER[index]

    this.pxYaw = clamp(target.yaw * DEG * CURVE_SPREAD, -YAW_CLAMP, YAW_CLAMP)
    this.pxPitch = clamp(target.pitch * DEG * CURVE_SPREAD - local * 10 * DEG, PITCH_MIN, PITCH_MAX)
    this.uYaw = this.pxYaw
    this.uPitch = this.pxPitch
    this.mobileActivePanel = activePanel
    this.mobileActiveUntil = performance.now() + 2200
    if (this.lastActive !== activePanel) {
      this.lastActive = activePanel
      this.onActivePanelChange(activePanel)
    }
    this.dismissHint()
  }

  focus(name: PanelName) {
    this.setFocus(name)
  }

  focusAt(clientX: number, clientY: number) {
    const hit = this.pickPanelAt(clientX, clientY)
    if (!hit) {
      return false
    }
    this.setFocus(hit)
    return true
  }

  exitFocus() {
    this.focusName = null
    this.emitFocus()
  }

  cycleFocus(step: number) {
    const index = this.focusName ? FOCUS_ORDER.indexOf(this.focusName) : -1
    const safeIndex = index < 0 ? 0 : index
    this.setFocus(FOCUS_ORDER[(safeIndex + step + FOCUS_ORDER.length) % FOCUS_ORDER.length])
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.animationFrame)
    this.removeListeners()
    this.clearPanels()
    this.disposeBackdrop()
    this.sprite.dispose()
    this.renderer.dispose()
  }

  private markReady() {
    if (this.ready) {
      return
    }
    this.ready = true
    this.onReady()
  }

  private textureKey() {
    const { content, activeCategoryIndex, accentColor, theme } = this.snapshot
    return JSON.stringify({
      content,
      activeCategoryIndex,
      accentColor,
      theme,
    })
  }

  private headerTimeKey() {
    return this.snapshot.time.toUTCString().slice(17, 25)
  }

  private refreshTextures() {
    const key = this.textureKey()
    const headerKey = this.headerTimeKey()
    if (key === this.lastTextureKey && headerKey === this.lastHeaderTimeKey) {
      return
    }

    const shouldRefreshBackdrop = key !== this.lastTextureKey
    const names: PanelName[] = shouldRefreshBackdrop ? PANEL_ORDER : ["header"]
    names.forEach((name) => this.replaceTexture(name))
    this.lastTextureKey = key
    this.lastHeaderTimeKey = headerKey
    if (shouldRefreshBackdrop) {
      this.buildBackdrop()
    }
  }

  private replaceTexture(name: PanelName) {
    const mesh = this.meshOf(name)
    if (!mesh) {
      return
    }
    const oldMap = mesh.material.map
    const texture = this.createPanelTexture(name)
    mesh.material.map = texture
    mesh.material.needsUpdate = true
    oldMap?.dispose()
  }

  private createPanelTexture(name: PanelName) {
    const texture = new THREE.CanvasTexture(makePanelCanvas({ ...this.snapshot, name }))
    texture.anisotropy = this.maxAniso
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    return texture
  }

  private addListeners() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown)
    this.canvas.addEventListener("pointermove", this.handlePointerMove)
    this.canvas.addEventListener("pointerup", this.handlePointerUp)
    this.canvas.addEventListener("pointercancel", this.handlePointerCancel)
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false })
    window.addEventListener("keydown", this.handleKeyDown)
    document.addEventListener("keydown", this.handleKeyDown)
    window.addEventListener("keyup", this.handleKeyDown)
    document.addEventListener("keyup", this.handleKeyDown)
    window.addEventListener("resize", this.resize)
  }

  private removeListeners() {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown)
    this.canvas.removeEventListener("pointermove", this.handlePointerMove)
    this.canvas.removeEventListener("pointerup", this.handlePointerUp)
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel)
    this.canvas.removeEventListener("wheel", this.handleWheel)
    window.removeEventListener("keydown", this.handleKeyDown)
    document.removeEventListener("keydown", this.handleKeyDown)
    window.removeEventListener("keyup", this.handleKeyDown)
    document.removeEventListener("keyup", this.handleKeyDown)
    window.removeEventListener("resize", this.resize)
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.downX = event.clientX
    this.downY = event.clientY
    this.moved = false
    if (!this.focusName) {
      this.dragging = true
      this.lastX = event.clientX
      this.lastY = event.clientY
      this.canvas.classList.add("dragging")
      this.canvas.setPointerCapture(event.pointerId)
    }
  }

  private handlePointerMove = (event: PointerEvent) => {
    this.mouseNX = (event.clientX / window.innerWidth) * 2 - 1
    this.mouseNY = (event.clientY / window.innerHeight) * 2 - 1
    if (Math.abs(event.clientX - this.downX) + Math.abs(event.clientY - this.downY) > 6) {
      this.moved = true
      this.dismissHint()
    }
    if (!this.dragging) {
      return
    }
    const k = 0.0026 * (this.camera.fov / 70)
    this.uYaw = clamp(this.uYaw - (event.clientX - this.lastX) * k, -YAW_CLAMP, YAW_CLAMP)
    this.uPitch = clamp(this.uPitch - (event.clientY - this.lastY) * k, PITCH_MIN, PITCH_MAX)
    this.lastX = event.clientX
    this.lastY = event.clientY
  }

  private handlePointerUp = (event: PointerEvent) => {
    this.dragging = false
    this.canvas.classList.remove("dragging")
    if (!this.moved) {
      this.handleClick(event)
    }
  }

  private handlePointerCancel = () => {
    this.dragging = false
    this.canvas.classList.remove("dragging")
  }

  private handleWheel = (event: WheelEvent) => {
    if (this.focusName) {
      event.preventDefault()
      this.focusScroll += event.deltaY * 0.012
      return
    }
    event.preventDefault()
    this.dismissHint()
    if (event.shiftKey) {
      this.pxPitch = clamp(this.pxPitch + event.deltaY * 0.0012, PITCH_MIN, PITCH_MAX)
    } else {
      this.pxYaw = clamp(this.pxYaw + event.deltaY * 0.0017, -YAW_CLAMP, YAW_CLAMP)
      this.uYaw = this.pxYaw
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key || event.code
    if ((key === "Escape" || key === "Esc") && this.focusName) {
      this.exitFocus()
    } else if (this.focusName && event.key === "ArrowRight") {
      this.cycleFocus(1)
    } else if (this.focusName && event.key === "ArrowLeft") {
      this.cycleFocus(-1)
    }
  }

  private dismissHint() {
    if (this.hintGone) {
      return
    }
    this.hintGone = true
    this.onHintHidden()
  }

  private handleClick(event: PointerEvent) {
    if (!this.focusName) {
      this.focusAt(event.clientX, event.clientY)
      return
    }

    const hit = this.pickPanelAt(event.clientX, event.clientY)
    if (!hit || hit === this.focusName) {
      this.exitFocus()
    } else {
      this.setFocus(hit)
    }
  }

  private pickPanelAt(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null
    }

    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const candidates = this.panelMeshes.filter((mesh) => mesh.material.opacity > 0.12)
    const hits = this.raycaster.intersectObjects(candidates, false)
    return hits.length ? (hits[0].object.userData.name as PanelName) : null
  }

  private aimAtPanel(name: PanelName) {
    const center = panelCenter(name)
    this.pxYaw = clamp(center.yaw, -YAW_CLAMP, YAW_CLAMP)
    this.pxPitch = clamp(center.pitch, PITCH_MIN, PITCH_MAX)
    this.uYaw = this.pxYaw
    this.uPitch = this.pxPitch
    this.mobileActivePanel = null
    this.mobileActiveUntil = 0
  }

  private setFocus(name: PanelName) {
    this.focusName = name
    this.focusMesh = this.meshOf(name)
    this.focusScroll = 0
    this.aimAtPanel(name)
    this.dismissHint()
    this.emitFocus()
  }

  private emitFocus() {
    if (this.lastFocus === this.focusName) {
      return
    }
    this.lastFocus = this.focusName
    this.onFocusChange(this.focusName)
  }

  private buildPanels() {
    this.clearPanels()
    this.lastTextureKey = this.textureKey()
    this.lastHeaderTimeKey = this.headerTimeKey()
    PANEL_ORDER.forEach((name) => {
      const mesh = this.buildPanel(name)
      this.panelMeshes.push(mesh)
      this.panelGroup.add(mesh)
    })
  }

  private buildPanel(name: PanelName): PanelMesh {
    const def = PANEL_DEFS[name]
    const texture = this.createPanelTexture(name)
    const yaw0 = def.yaw * DEG * CURVE_SPREAD
    const pitch0 = def.pitch * DEG * CURVE_SPREAD
    const halfW = (def.angW * DEG) / 2
    const halfH = halfW * (def.h / def.w)
    const rad = SPHERE_RADIUS + PANEL_ORDER.indexOf(name) * 0.012
    const positions: number[] = []
    const uvs: number[] = []
    const gridUV: Array<[number, number]> = []
    const indices: number[] = []

    for (let j = 0; j <= PANEL_SEGMENTS; j += 1) {
      const tv = j / PANEL_SEGMENTS
      const pv = pitch0 + (tv - 0.5) * 2 * halfH
      for (let i = 0; i <= PANEL_SEGMENTS; i += 1) {
        const tu = i / PANEL_SEGMENTS
        const yv = yaw0 + (tu - 0.5) * 2 * halfW
        const point = dir(yv, pv).multiplyScalar(rad)
        positions.push(point.x, point.y, point.z)
        uvs.push(tu, tv)
        gridUV.push([tu, tv])
      }
    }

    for (let j = 0; j < PANEL_SEGMENTS; j += 1) {
      for (let i = 0; i < PANEL_SEGMENTS; i += 1) {
        const a = j * (PANEL_SEGMENTS + 1) + i
        const b = a + 1
        const c = a + PANEL_SEGMENTS + 1
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0 })
    const mesh = new THREE.Mesh(geometry, material) as PanelMesh
    const axisN = dir(yaw0, pitch0)
    let axisR = new THREE.Vector3().crossVectors(axisN, this.worldUp)
    if (axisR.lengthSq() < 1e-6) {
      axisR = new THREE.Vector3(1, 0, 0)
    }
    axisR.normalize()
    const axisU = new THREE.Vector3().crossVectors(axisR, axisN).normalize()
    mesh.userData = {
      name,
      born: performance.now(),
      delay: PANEL_ORDER.indexOf(name) * 110,
      yaw0,
      pitch0,
      aspect: def.w / def.h,
      gridUV,
      spherePos: Float32Array.from(positions),
      axisN,
      axisR,
      axisU,
    }
    return mesh
  }

  private clearPanels() {
    this.panelMeshes.forEach((mesh) => {
      this.panelGroup.remove(mesh)
      mesh.geometry.dispose()
      disposeMaterial(mesh.material)
    })
    this.panelMeshes = []
  }

  private meshOf(name: PanelName) {
    return this.panelMeshes.find((mesh) => mesh.userData.name === name) ?? null
  }

  private focusFit(userData: PanelUserData) {
    const vH = 2 * FOCUS_DIST * Math.tan(this.camera.fov * DEG / 2)
    const vW = vH * this.camera.aspect
    let Wf = vW * FOCUS_FILL
    let Hf = Wf / userData.aspect
    const HMAX = vH * 1.7
    if (Hf > HMAX) {
      Hf = HMAX
      Wf = Hf * userData.aspect
    }
    return { Wf, Hf, maxScroll: Math.max(0, (Hf - vH) / 2) }
  }

  private morphPanel(mesh: PanelMesh, progress: number) {
    const userData = mesh.userData
    const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const spherePos = userData.spherePos
    if (progress < 0.0008) {
      arr.set(spherePos)
      posAttr.needsUpdate = true
      return
    }

    const fit = this.focusFit(userData)
    this.focusScroll = clamp(this.focusScroll, -fit.maxScroll, fit.maxScroll)
    const bow = FOCUS_BOW * fit.Wf
    const normal = userData.axisN
    const right = userData.axisR
    const up = userData.axisU
    userData.gridUV.forEach(([u, v], index) => {
      const x = (u - 0.5) * fit.Wf
      const y = (v - 0.5) * fit.Hf + this.focusScroll
      const r2 = (2 * (u - 0.5)) ** 2 + (2 * (v - 0.5)) ** 2
      const nd = FOCUS_DIST - bow * r2
      const i3 = index * 3
      const fx = normal.x * nd + right.x * x + up.x * y
      const fy = normal.y * nd + right.y * x + up.y * y
      const fz = normal.z * nd + right.z * x + up.z * y
      arr[i3] = spherePos[i3] + (fx - spherePos[i3]) * progress
      arr[i3 + 1] = spherePos[i3 + 1] + (fy - spherePos[i3 + 1]) * progress
      arr[i3 + 2] = spherePos[i3 + 2] + (fz - spherePos[i3 + 2]) * progress
    })
    posAttr.needsUpdate = true
  }

  private createCircleSprite() {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Unable to create particle sprite")
    }
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, "rgba(255,255,255,1)")
    gradient.addColorStop(0.4, "rgba(255,255,255,0.6)")
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }

  private buildBackdrop() {
    this.disposeBackdrop()
    const count = 1400
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const radius = 34 + Math.random() * 16
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const color = new THREE.Color(...hslToRgbUnit(this.snapshot.accentColor))
    this.particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.5,
        map: this.sprite,
        color,
        transparent: true,
        opacity: this.snapshot.theme === "light" ? 0.42 : 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    )
    this.scene.add(this.particles)

    this.wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(30, 22, 14)),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: this.snapshot.theme === "light" ? 0.08 : 0.05,
        depthWrite: false,
      }),
    )
    this.scene.add(this.wire)
  }

  private disposeBackdrop() {
    if (this.particles) {
      this.scene.remove(this.particles)
      this.particles.geometry.dispose()
      disposeMaterial(this.particles.material)
      this.particles = null
    }
    if (this.wire) {
      this.scene.remove(this.wire)
      this.wire.geometry.dispose()
      this.wire.material.dispose()
      this.wire = null
    }
  }

  private applyTheme() {
    this.renderer.setClearColor(this.snapshot.theme === "light" ? 0xf4f7f5 : 0x000000, 1)
  }

  private resize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private updateCompassActive() {
    if (this.focusName) {
      if (this.lastActive !== this.focusName) {
        this.lastActive = this.focusName
        this.onActivePanelChange(this.focusName)
      }
      return
    }
    if (this.mobileActivePanel && performance.now() < this.mobileActiveUntil) {
      if (this.lastActive !== this.mobileActivePanel) {
        this.lastActive = this.mobileActivePanel
        this.onActivePanelChange(this.mobileActivePanel)
      }
      return
    }
    let best: FocusPanelName | null = null
    let bestDistance = Infinity
    FOCUS_ORDER.forEach((name) => {
      const yaw = PANEL_DEFS[name].yaw * DEG * CURVE_SPREAD
      const distance = Math.abs(((yaw - this.camYaw + Math.PI) % (2 * Math.PI)) - Math.PI)
      if (distance < bestDistance) {
        bestDistance = distance
        best = name
      }
    })
    const active = best && bestDistance < 22 * DEG ? best : null
    if (this.lastActive !== active) {
      this.lastActive = active
      this.onActivePanelChange(active)
    }
  }

  private tick = (now: number) => {
    if (this.disposed) {
      return
    }
    const elapsed = now - this.startTime
    this.refreshTextures()
    this.focusT += ((this.focusName ? 1 : 0) - this.focusT) * 0.11
    if (this.focusName) {
      this.focusMesh = this.meshOf(this.focusName)
    }
    const focusEase = easeIO(clamp(this.focusT, 0, 1))

    let targetYaw: number
    let targetPitch: number
    if (this.focusName && this.focusMesh) {
      targetYaw = this.focusMesh.userData.yaw0 + this.mouseNX * 2 * DEG
      targetPitch = clamp(this.focusMesh.userData.pitch0 - this.mouseNY * 2 * DEG, PITCH_MIN, PITCH_MAX)
    } else {
      targetYaw = clamp(this.uYaw + this.mouseNX * 3 * DEG, -YAW_CLAMP, YAW_CLAMP)
      targetPitch = clamp(this.uPitch - this.mouseNY * 2 * DEG, PITCH_MIN, PITCH_MAX)
    }
    const ease = this.focusName ? 0.12 : 0.085
    this.camYaw += (targetYaw - this.camYaw) * ease
    this.camPitch += (targetPitch - this.camPitch) * ease
    this.camera.lookAt(dir(this.camYaw, this.camPitch))

    const backdropDim = 1 - 0.82 * focusEase
    if (this.particles) {
      this.particles.rotation.y = elapsed * 0.000028
      this.particles.material.opacity = (this.snapshot.theme === "light" ? 0.42 : 0.7) * backdropDim
    }
    if (this.wire) {
      this.wire.rotation.y = -elapsed * 0.00002
      this.wire.material.opacity = (this.snapshot.theme === "light" ? 0.08 : 0.05) * backdropDim
    }

    this.panelMeshes.forEach((mesh) => {
      const po = (now - mesh.userData.born - mesh.userData.delay) / 900
      const power = po <= 0 ? 0 : po >= 1 ? 1 : 1 - Math.pow(1 - po, 3)
      if (mesh === this.focusMesh) {
        this.morphPanel(mesh, focusEase)
        mesh.material.opacity = Math.max(power, focusEase)
        mesh.renderOrder = 2
      } else {
        if (mesh.userData.morphed) {
          this.morphPanel(mesh, 0)
        }
        mesh.material.opacity = power * (1 - focusEase)
        mesh.renderOrder = 0
      }
      mesh.userData.morphed = mesh === this.focusMesh && focusEase > 0.0008
    })

    if (!this.focusName && this.focusT < 0.002 && this.focusMesh) {
      this.morphPanel(this.focusMesh, 0)
      this.focusMesh = null
    }

    this.updateCompassActive()
    this.render()
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private renderStaticBootFrame() {
    this.panelMeshes.forEach((mesh) => {
      mesh.material.opacity = 0.01
    })
    this.camera.lookAt(dir(this.camYaw, this.camPitch))
    this.render()
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
  }
}

export const createSphereScene = (options: SphereSceneOptions) => new SphereScene(options)
