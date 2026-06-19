"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { PortfolioContent, ProjectCategory, ThemeColor } from "@/lib/default-content"
import type { ThemeMode } from "@/lib/theme"
import { createSphereScene, type SphereScene } from "./sphere-scene"
import { SphereHud } from "./sphere-hud"
import type { EditableSphereHandlers, SphereContentSnapshot, SphereHudState } from "./sphere-types"
import { FOCUS_ORDER, type FocusPanelName } from "./panel-layout"

export type SpherePortfolioProps = SphereContentSnapshot & {
  isContentLoading: boolean
  contentError: string | null
  isEditorMode: boolean
  isAuthenticated: boolean
  canPersistAccent: boolean
  activeCategory: ProjectCategory | null
  activeCategoryIndex: number
  onPrevCategory: () => void
  onNextCategory: () => void
  onRetryContent: () => void
  onToggleEditor: () => void
  onToggleTheme: () => void
  onLogout: () => void
  onColorChange: (h: number, s: number, l: number) => void
  onPersistAccentColor: (color: ThemeColor) => void
  editHandlers: EditableSphereHandlers
}

export function SpherePortfolio({
  content,
  isContentLoading,
  contentError,
  time,
  theme,
  accentColor,
  isEditorMode,
  isAuthenticated,
  canPersistAccent,
  activeCategory,
  activeCategoryIndex,
  onPrevCategory,
  onNextCategory,
  onRetryContent,
  onToggleEditor,
  onToggleTheme,
  onLogout,
  onColorChange,
  onPersistAccentColor,
  editHandlers,
}: SpherePortfolioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mobileScrollRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<SphereScene | null>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [hud, setHud] = useState<SphereHudState>({
    focusedPanel: null,
    activePanel: null,
    isReady: false,
    hintHidden: false,
  })

  const snapshot = useMemo(
    () => ({
      content,
      activeCategory,
      activeCategoryIndex,
      time,
      accentColor,
      theme,
    }),
    [content, activeCategory, activeCategoryIndex, time, accentColor, theme],
  )
  const snapshotRef = useRef(snapshot)

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    let cancelled = false
    const loadFonts = async () => {
      try {
        if ("fonts" in document) {
          await document.fonts.load('700 40px "Anonymous Pro"')
          await document.fonts.load('400 40px "Anonymous Pro"')
          await document.fonts.ready
        }
      } finally {
        if (!cancelled) {
          setFontsReady(true)
        }
      }
    }
    void loadFonts()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = "hidden"
    document.body.style.overscrollBehavior = "none"
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [])

  useEffect(() => {
    if (!fontsReady || !canvasRef.current || sceneRef.current) {
      return
    }

    sceneRef.current = createSphereScene({
      canvas: canvasRef.current,
      snapshot: snapshotRef.current,
      onFocusChange: (focusedPanel) => setHud((previous) => ({ ...previous, focusedPanel })),
      onActivePanelChange: (activePanel) => setHud((previous) => ({ ...previous, activePanel })),
      onReady: () => setHud((previous) => ({ ...previous, isReady: true })),
      onHintHidden: () => setHud((previous) => ({ ...previous, hintHidden: true })),
    })

    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [fontsReady])

  useEffect(() => {
    sceneRef.current?.setSnapshot(snapshot)
  }, [snapshot])

  useEffect(() => {
    const scrollElement = mobileScrollRef.current
    if (!scrollElement) {
      return
    }

    let frameId = 0
    let lastScrollTop = -1

    const updateFromScroll = () => {
      const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight
      const progress = maxScroll <= 0 ? 0 : scrollElement.scrollTop / maxScroll
      lastScrollTop = scrollElement.scrollTop
      scrollElement.dataset.progress = progress.toFixed(4)
      const activeIndex = Math.max(0, Math.min(FOCUS_ORDER.length - 1, Math.round(progress * (FOCUS_ORDER.length - 1))))
      setHud((previous) =>
        previous.focusedPanel || previous.activePanel === FOCUS_ORDER[activeIndex]
          ? previous
          : { ...previous, activePanel: FOCUS_ORDER[activeIndex] },
      )
      sceneRef.current?.setMobileScrollProgress(progress)
    }

    const watchScrollPosition = () => {
      if (scrollElement.scrollTop !== lastScrollTop) {
        updateFromScroll()
      }
      frameId = window.requestAnimationFrame(watchScrollPosition)
    }

    updateFromScroll()
    scrollElement.addEventListener("scroll", updateFromScroll, { passive: true })
    frameId = window.requestAnimationFrame(watchScrollPosition)
    return () => {
      scrollElement.removeEventListener("scroll", updateFromScroll)
      window.cancelAnimationFrame(frameId)
    }
  }, [fontsReady])

  const focus = (name: FocusPanelName) => {
    sceneRef.current?.focus(name)
  }

  const exitFocus = () => {
    sceneRef.current?.exitFocus()
  }

  const cycleFocus = (step: number) => {
    sceneRef.current?.cycleFocus(step)
  }

  return (
    <div
      className="sphere-portfolio"
      style={{ "--sphere-hud": `hsl(${accentColor.h} ${accentColor.s}% ${accentColor.l}%)` } as React.CSSProperties}
      data-theme={theme}
    >
      <canvas
        ref={canvasRef}
        className={`sphere-canvas ${hud.focusedPanel ? "focusing" : ""}`}
        aria-label="Interactive spherical portfolio scene"
      />
      <div
        ref={mobileScrollRef}
        className="sphere-mobile-scroll"
        data-focused={hud.focusedPanel ? "true" : "false"}
        data-admin-open={adminOpen ? "true" : "false"}
        role="region"
        aria-label="Mobile sphere navigation"
        tabIndex={0}
      >
        <div className="sphere-mobile-scroll-content" aria-hidden="true" />
      </div>
      <div className={`sphere-mobile-scroll-cue ${hud.hintHidden || hud.focusedPanel ? "opacity-0" : "opacity-100"}`}>
        Scroll to orbit
      </div>
      <div className="sphere-vignette" aria-hidden="true" />
      <SphereHud
        time={time}
        theme={theme}
        accentColor={accentColor}
        isReady={hud.isReady && fontsReady}
        isEditorMode={isEditorMode}
        isAuthenticated={isAuthenticated}
        isContentLoading={isContentLoading}
        contentError={contentError}
        content={content}
        activeCategory={activeCategory}
        activeCategoryIndex={activeCategoryIndex}
        focusedPanel={hud.focusedPanel}
        activePanel={hud.activePanel}
        hintHidden={hud.hintHidden}
        adminOpen={adminOpen}
        onSetAdminOpen={setAdminOpen}
        onFocus={focus}
        onExitFocus={exitFocus}
        onCycleFocus={cycleFocus}
        onPrevCategory={onPrevCategory}
        onNextCategory={onNextCategory}
        onRetryContent={onRetryContent}
        onToggleEditor={onToggleEditor}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
        onColorChange={onColorChange}
        onPersistAccentColor={onPersistAccentColor}
        canPersistAccent={canPersistAccent}
        handlers={editHandlers}
      />
    </div>
  )
}
