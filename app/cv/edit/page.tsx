"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import type { PortfolioContent } from "@/lib/default-content"
import type {
  CvContent,
  CvSection,
  CvSectionType,
  CvSectionData,
  CvLogEntry,
  CvTagGroup,
  CvLinkItem,
} from "@/lib/cv-content"
import { emptyCvContent } from "@/lib/cv-content"
import type { CvPreset, CvLayoutId } from "@/lib/cv-presets"
import { createCvData } from "@/lib/cv-data-transform"
import { ClassicLayout } from "@/components/cv/classic-layout"
import { ResumeLayout } from "@/components/cv/resume-layout"
import profilePicture from "@/app/prof_pic.jpeg"

/* ── helpers ── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const SECTION_TYPE_LABELS: Record<CvSectionType, string> = {
  log: "Timeline",
  tags: "Tag Groups",
  text: "Text",
  links: "Links",
  "simple-list": "List",
}

function emptySectionData(type: CvSectionType): CvSectionData {
  switch (type) {
    case "log": return { type: "log", entries: [] }
    case "tags": return { type: "tags", groups: [] }
    case "text": return { type: "text", content: "" }
    case "links": return { type: "links", items: [] }
    case "simple-list": return { type: "simple-list", items: [] }
  }
}

/* ════════════════════════════════════════════════════
   Main Editor Page
   ════════════════════════════════════════════════════ */
export default function CvEditorPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<PortfolioContent | null>(null)
  const [presets, setPresets] = useState<CvPreset[]>([])
  const [activePresetId, setActivePresetId] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor")
  const [previewZoom, setPreviewZoom] = useState(0.5)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  /* ── show default cursor on CV editor ── */
  useEffect(() => {
    document.body.classList.add("cv-cursor-visible")
    return () => { document.body.classList.remove("cv-cursor-visible") }
  }, [])

  /* ── auth check ── */
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/auth/session")
        const d = (await r.json()) as { authenticated?: boolean }
        if (!d.authenticated) { router.replace("/"); return }
        setIsAuthenticated(true)
      } catch { router.replace("/") }
    })()
  }, [router])

  /* ── load data ── */
  useEffect(() => {
    if (!isAuthenticated) return
    ;(async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch("/api/cv/presets"),
          fetch("/api/content"),
        ])
        const pData = await pRes.json()
        const cData = await cRes.json()
        setPortfolio(cData as PortfolioContent)
        const loaded: CvPreset[] = pData.presets ?? []
        setPresets(loaded)
        if (loaded.length > 0) setActivePresetId(loaded[0].id)
      } catch (e) {
        console.error("Failed to load data", e)
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    })()
  }, [isAuthenticated])

  /* ── debounced persist ── */
  const persist = useCallback((data: CvPreset[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (abortRef.current) abortRef.current.abort()
    setSaving(true)
    setSaved(false)
    setError(null)
    saveTimerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch("/api/cv/presets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presets: data }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          console.error("Save response:", res.status, errBody)
          throw new Error(`Save failed: ${res.status}`)
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return
        console.error(e)
        setError("Failed to save")
      } finally {
        setSaving(false)
      }
    }, 600)
  }, [])

  const updatePresets = useCallback(
    (updater: (prev: CvPreset[]) => CvPreset[]) => {
      setPresets((prev) => { const next = updater(prev); void persist(next); return next })
    },
    [persist],
  )

  /* ── profile fields ── */
  const updateProfile = useCallback(
    (field: keyof CvContent, value: unknown) => {
      updatePresets((prev) =>
        prev.map((p) => (p.id === activePresetId ? { ...p, content: { ...p.content, [field]: value } } : p)),
      )
    },
    [activePresetId, updatePresets],
  )

  /* ── section helpers ── */
  const updateSections = useCallback(
    (updater: (s: CvSection[]) => CvSection[]) => {
      updatePresets((prev) =>
        prev.map((p) =>
          p.id === activePresetId
            ? { ...p, content: { ...p.content, sections: updater(p.content.sections) } }
            : p,
        ),
      )
    },
    [activePresetId, updatePresets],
  )

  const updateSectionById = useCallback(
    (sectionId: string, updater: (s: CvSection) => CvSection) => {
      updateSections((ss) => ss.map((s) => (s.id === sectionId ? updater(s) : s)))
    },
    [updateSections],
  )

  const moveSectionPlacement = useCallback(
    (sectionId: string, placement: "sidebar" | "main") => {
      updateSectionById(sectionId, (s) => ({ ...s, placement }))
    },
    [updateSectionById],
  )

  /** Move a section to a given placement and insert it at a specific
    * position among the sections in that zone. */
  const moveSection = useCallback(
    (sectionId: string, placement: "sidebar" | "main", zoneIndex: number) => {
      updateSections((ss) => {
        const srcIdx = ss.findIndex((s) => s.id === sectionId)
        if (srcIdx === -1) return ss

        // Remove from current position
        const next = [...ss]
        const [moved] = next.splice(srcIdx, 1)
        moved.placement = placement

        // Find the absolute index to insert at based on the zone position
        const zoneItems = next.filter((s) => s.placement === placement)
        if (zoneIndex >= zoneItems.length) {
          // Append at end — find last item of this zone and insert after it
          let lastZoneIdx = -1
          next.forEach((s, i) => { if (s.placement === placement) lastZoneIdx = i })
          next.splice(lastZoneIdx + 1, 0, moved)
        } else {
          // Insert before the item currently at zoneIndex
          const targetId = zoneItems[zoneIndex].id
          const absIdx = next.findIndex((s) => s.id === targetId)
          next.splice(absIdx, 0, moved)
        }
        return next
      })
    },
    [updateSections],
  )

  const swapSection = useCallback(
    (sectionId: string, dir: -1 | 1) => {
      updateSections((ss) => {
        const idx = ss.findIndex((s) => s.id === sectionId)
        const target = idx + dir
        if (idx === -1 || target < 0 || target >= ss.length) return ss
        const next = [...ss]
        ;[next[idx], next[target]] = [next[target], next[idx]]
        return next
      })
    },
    [updateSections],
  )

  const addSection = useCallback(
    (type: CvSectionType, placement: "sidebar" | "main") => {
      updateSections((ss) => [
        ...ss,
        { id: uid(), title: `New ${SECTION_TYPE_LABELS[type]}`, type, placement, visible: true, data: emptySectionData(type) },
      ])
    },
    [updateSections],
  )

  const deleteSection = useCallback(
    (sectionId: string) => { updateSections((ss) => ss.filter((s) => s.id !== sectionId)) },
    [updateSections],
  )

  const toggleSectionVisibility = useCallback(
    (sectionId: string) => { updateSectionById(sectionId, (s) => ({ ...s, visible: !s.visible })) },
    [updateSectionById],
  )

  const renameSection = useCallback(
    (sectionId: string, title: string) => { updateSectionById(sectionId, (s) => ({ ...s, title })) },
    [updateSectionById],
  )

  /* ── preset CRUD ── */
  const createPreset = () => {
    const preset: CvPreset = {
      id: uid(),
      name: `Preset ${presets.length + 1}`,
      layout: "classic",
      visible: true,
      content: emptyCvContent(),
    }
    updatePresets((prev) => [...prev, preset])
    setActivePresetId(preset.id)
  }

  const deletePreset = (id: string) => {
    updatePresets((prev) => {
      const remaining = prev.filter((p) => p.id !== id)
      if (activePresetId === id && remaining.length > 0) setActivePresetId(remaining[0].id)
      return remaining
    })
  }

  const toggleVisibility = (id: string) => {
    updatePresets((prev) => prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)))
  }

  const setPresetLayout = (id: string, layout: CvLayoutId) => {
    updatePresets((prev) => prev.map((p) => (p.id === id ? { ...p, layout } : p)))
  }

  const renamePreset = (id: string, name: string) => {
    updatePresets((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  /* ── derived ── */
  const activePreset = presets.find((p) => p.id === activePresetId)
  const cv = activePreset?.content
  const previewData = activePreset ? createCvData(activePreset.content) : null

  /* ── guards ── */
  if (!isAuthenticated) return null
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <style>{editorStyles}</style>

      {/* ── Top bar ── */}
      <header className="cv-editor-bar">
        <div className="cv-editor-bar__left">
          <button onClick={() => router.push("/cv")} className="cv-editor-bar__back" type="button">
            <ArrowLeft className="w-4 h-4" /> Preview
          </button>
          <h1 className="cv-editor-bar__title">CV Editor</h1>
        </div>
        <div className="cv-editor-bar__right">
          {saving && <span className="cv-editor-bar__status"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
          {saved && <span className="cv-editor-bar__status cv-editor-bar__status--ok"><Check className="w-3 h-3" /> Saved</span>}
          {error && <span className="cv-editor-bar__status cv-editor-bar__status--err">{error}</span>}
          <button onClick={() => router.push("/")} className="cv-editor-bar__btn" type="button">
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
        </div>
      </header>

      {/* ── Preset tabs ── */}
      <div className="cv-preset-bar">
        <div className="cv-preset-bar__tabs">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActivePresetId(preset.id)}
              className={`cv-preset-tab ${activePresetId === preset.id ? "cv-preset-tab--active" : ""} ${!preset.visible ? "cv-preset-tab--hidden" : ""}`}
            >
              {!preset.visible && <EyeOff className="w-3 h-3" />}
              {preset.name}
              <span className="cv-preset-tab__layout">{preset.layout}</span>
            </button>
          ))}
          <button type="button" onClick={createPreset} className="cv-preset-tab cv-preset-tab--add">
            <Plus className="w-3 h-3" /> New Preset
          </button>
        </div>
      </div>

      {/* ── Mobile view toggle ── */}
      {activePreset && (
        <div className="cv-editor-mobile-toggle">
          <button type="button" onClick={() => setMobileView("editor")}
            className={`cv-editor-mobile-toggle__btn ${mobileView === "editor" ? "cv-editor-mobile-toggle__btn--active" : ""}`}>
            Editor
          </button>
          <button type="button" onClick={() => setMobileView("preview")}
            className={`cv-editor-mobile-toggle__btn ${mobileView === "preview" ? "cv-editor-mobile-toggle__btn--active" : ""}`}>
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>
      )}

      {activePreset && cv ? (
        <div className={`cv-editor-split ${mobileView === "preview" ? "cv-editor-split--preview-mode" : ""}`}>
          <div className="cv-editor-split__editor">
            <main className="cv-editor-main">
              {/* ─── Preset Settings ─── */}
              <EditorCard title="Preset Settings" icon={<LayoutTemplate className="w-4 h-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="cv-field">
                    <label className="cv-field__label">Preset Name</label>
                    <input className="cv-field__input" value={activePreset.name}
                      onChange={(e) => renamePreset(activePreset.id, e.target.value)} />
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Layout</label>
                    <select className="cv-field__input" value={activePreset.layout}
                      onChange={(e) => setPresetLayout(activePreset.id, e.target.value as CvLayoutId)}>
                      <option value="classic">Classic</option>
                      <option value="resume">Résumé</option>
                    </select>
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Visible</label>
                    <button type="button" className="cv-field__input text-left"
                      onClick={() => toggleVisibility(activePreset.id)}>
                      {activePreset.visible ? "✓ Visible" : "✗ Hidden"}
                    </button>
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Actions</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button type="button" className="cv-btn cv-btn--danger" onClick={() => deletePreset(activePreset.id)}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </EditorCard>

              {/* ─── Profile ─── */}
              <EditorCard title="Profile / Header">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldWithHint label="Full Name" value={cv.name || ""} onChange={(v) => updateProfile("name", v || undefined)} />
                  <FieldWithHint label="Title / Role" value={cv.title || ""} onChange={(v) => updateProfile("title", v || undefined)} />
                  <FieldWithHint label="Location" value={cv.location || ""} onChange={(v) => updateProfile("location", v || undefined)} />
                  <FieldWithHint label="Email" value={cv.email || ""} onChange={(v) => updateProfile("email", v || undefined)} />
                  <FieldWithHint label="Phone" value={cv.phone || ""} onChange={(v) => updateProfile("phone", v || undefined)} />
                  <FieldWithHint label="P.IVA" value={cv.piva || ""} onChange={(v) => updateProfile("piva", v || undefined)} />
                </div>
              </EditorCard>

              {/* ─── Section Layout Organizer ─── */}
              <EditorCard title="Section Layout" icon={<GripVertical className="w-4 h-4" />}>
                <SectionLayoutOrganizer
                  sections={cv.sections}
                  onMove={moveSection}
                  onSwap={swapSection}
                  onToggleVisibility={toggleSectionVisibility}
                  onDelete={deleteSection}
                  onAdd={addSection}
                />
              </EditorCard>

              {/* ─── Section editors ─── */}
              {cv.sections.map((section) => (
                <EditorCard
                  key={section.id}
                  title={section.title}
                  badge={SECTION_TYPE_LABELS[section.type]}
                  titleEditable
                  onTitleChange={(t) => renameSection(section.id, t)}
                  muted={!section.visible}
                >
                  <SectionDataEditor
                    section={section}
                    onChange={(data) => updateSectionById(section.id, (s) => ({ ...s, data }))}
                  />
                </EditorCard>
              ))}
            </main>
          </div>

          {/* ── Live preview ── */}
          <aside className="cv-editor-split__preview">
            <div className="cv-editor-preview-header">
              <span className="cv-editor-preview-header__title">Live Preview</span>
              <div className="cv-editor-preview-header__controls">
                <button type="button" className="cv-editor-preview-zoom-btn"
                  onClick={() => setPreviewZoom((z) => Math.max(0.2, z - 0.1))}>−</button>
                <span className="cv-editor-preview-zoom-label">{Math.round(previewZoom * 100)}%</span>
                <button type="button" className="cv-editor-preview-zoom-btn"
                  onClick={() => setPreviewZoom((z) => Math.min(1, z + 0.1))}>+</button>
                <span className="cv-editor-preview-header__layout">{activePreset.layout}</span>
              </div>
            </div>
            <div className="cv-editor-preview-scaler" style={{ zoom: previewZoom } as React.CSSProperties}>
              {previewData && activePreset.layout === "classic" && <ClassicLayout data={previewData} profilePicture={profilePicture} />}
              {previewData && activePreset.layout === "resume" && <ResumeLayout data={previewData} profilePicture={profilePicture} />}
            </div>
          </aside>
        </div>
      ) : (
        <main className="cv-editor-main">
          <div className="cv-editor-empty">
            <p>No presets yet.</p>
            <button type="button" className="cv-btn" onClick={createPreset}>
              <Plus className="w-4 h-4" /> Create First Preset
            </button>
          </div>
        </main>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════ */

/* ── EditorCard ── */
function EditorCard({
  title, icon, badge, children, titleEditable, onTitleChange, muted,
}: {
  title: string
  icon?: React.ReactNode
  badge?: string
  children: React.ReactNode
  titleEditable?: boolean
  onTitleChange?: (v: string) => void
  muted?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className={`cv-editor-card ${muted ? "cv-editor-card--muted" : ""}`}>
      <div className="cv-editor-card__header" onClick={() => setOpen(!open)} role="button" tabIndex={0}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {icon}
          {titleEditable ? (
            <input
              className="cv-editor-card__title-input"
              value={title}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onTitleChange?.(e.target.value)}
            />
          ) : (
            <span className="cv-editor-card__title">{title}</span>
          )}
          {badge && <span className="cv-editor-card__badge">{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>
      {open && <div className="cv-editor-card__body">{children}</div>}
    </div>
  )
}

/* ── FieldWithHint ── */
function FieldWithHint({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="cv-field">
      <label className="cv-field__label">{label}</label>
      <input
        className="cv-field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

/* ── TextAreaWithHint ── */
function TextAreaWithHint({
  label, value, onChange, rows = 3, ai = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  ai?: boolean
}) {
  return (
    <div className="cv-field">
      <div className="cv-field__label-row">
        <label className="cv-field__label">{label}</label>
        {ai && value.trim().length > 0 && (
          <AiTextAssistant text={value} onResult={onChange} />
        )}
      </div>
      <textarea
        className="cv-field__input cv-field__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
    </div>
  )
}

/* ── AI text assistant ── */
function AiTextAssistant({ text, onResult }: { text: string; onResult: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const run = async (action: string, prompt?: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, customPrompt: prompt }),
      })
      const data = await res.json()
      if (data.text) onResult(data.text)
      else if (data.error) console.error("AI error:", data.error)
    } catch (e) {
      console.error("AI request failed", e)
    } finally {
      setLoading(false)
      setOpen(false)
      setCustomOpen(false)
      setCustomPrompt("")
    }
  }

  return (
    <div className="ai-assist" ref={menuRef}>
      <button
        type="button"
        className={`ai-assist__trigger ${loading ? "ai-assist__trigger--loading" : ""}`}
        onClick={() => { if (!loading) setOpen(!open) }}
        title="AI Assistant"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        <span>AI</span>
      </button>
      {open && !loading && (
        <div className="ai-assist__menu">
          <button type="button" className="ai-assist__item" onClick={() => run("summarize")}>
            Summarize
          </button>
          <button type="button" className="ai-assist__item" onClick={() => run("formalize")}>
            Formalize
          </button>
          <button type="button" className="ai-assist__item" onClick={() => run("shorten")}>
            Shorten
          </button>
          <button type="button" className="ai-assist__item" onClick={() => run("expand")}>
            Expand
          </button>
          <div className="ai-assist__divider" />
          {!customOpen ? (
            <button type="button" className="ai-assist__item" onClick={() => setCustomOpen(true)}>
              Custom…
            </button>
          ) : (
            <div className="ai-assist__custom">
              <input
                className="ai-assist__custom-input"
                placeholder="Your instruction…"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && customPrompt.trim()) run("custom", customPrompt.trim()) }}
                autoFocus
              />
              <button type="button" className="ai-assist__custom-go"
                disabled={!customPrompt.trim()}
                onClick={() => customPrompt.trim() && run("custom", customPrompt.trim())}>
                Go
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   Section Layout Organizer (drag & drop)
   ═══════════════════════════════════════ */
function SectionLayoutOrganizer({
  sections,
  onMove,
  onSwap,
  onToggleVisibility,
  onDelete,
  onAdd,
}: {
  sections: CvSection[]
  onMove: (id: string, placement: "sidebar" | "main", zoneIndex: number) => void
  onSwap: (id: string, dir: -1 | 1) => void
  onToggleVisibility: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (type: CvSectionType, placement: "sidebar" | "main") => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ zone: "sidebar" | "main"; index: number } | null>(null)
  const [addMenuPlacement, setAddMenuPlacement] = useState<"sidebar" | "main" | null>(null)

  const sidebarSections = sections.filter((s) => s.placement === "sidebar")
  const mainSections = sections.filter((s) => s.placement === "main")

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragEnd = () => { setDragId(null); setDropTarget(null) }

  /** Determine drop index from mouse position relative to chip elements */
  const handleChipDragOver = (e: React.DragEvent, zone: "sidebar" | "main", idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const insertIdx = e.clientY < midY ? idx : idx + 1
    setDropTarget({ zone, index: insertIdx })
  }

  const handleZoneDragOver = (e: React.DragEvent, zone: "sidebar" | "main", count: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    // Only set dropTarget to end if we're not already over a chip
    if (!dropTarget || dropTarget.zone !== zone) {
      setDropTarget({ zone, index: count })
    }
  }

  const handleDrop = (e: React.DragEvent, zone: "sidebar" | "main", fallbackIndex: number) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (!id) return
    const idx = dropTarget && dropTarget.zone === zone ? dropTarget.index : fallbackIndex
    onMove(id, zone, idx)
    setDragId(null)
    setDropTarget(null)
  }

  const renderZone = (label: string, placement: "sidebar" | "main", items: CvSection[]) => {
    const isOver = dropTarget?.zone === placement
    return (
      <div
        className={`section-zone ${isOver ? "section-zone--drag-over" : ""}`}
        onDragOver={(e) => handleZoneDragOver(e, placement, items.length)}
        onDragLeave={(e) => {
          // Only clear if leaving the zone itself
          if (e.currentTarget === e.target) setDropTarget(null)
        }}
        onDrop={(e) => handleDrop(e, placement, items.length)}
      >
        <div className="section-zone__label">{label}</div>
        <div className="section-zone__chips">
          {items.map((s, i) => (
            <div key={s.id} style={{ position: "relative" }}>
              {/* Drop indicator above this chip */}
              {isOver && dropTarget.index === i && dragId !== s.id && (
                <div className="section-drop-indicator" />
              )}
              <div
                className={`section-chip ${dragId === s.id ? "section-chip--dragging" : ""} ${!s.visible ? "section-chip--hidden" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, s.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleChipDragOver(e, placement, i)}
              >
                <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0 cursor-grab" />
                <span className="section-chip__title">{s.title}</span>
                <span className="section-chip__type">{SECTION_TYPE_LABELS[s.type]}</span>
                <div className="section-chip__actions">
                  {i > 0 && (
                    <button type="button" className="section-chip__btn" onClick={() => onSwap(s.id, -1)} title="Move up">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                  {i < items.length - 1 && (
                    <button type="button" className="section-chip__btn" onClick={() => onSwap(s.id, 1)} title="Move down">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  <button type="button" className="section-chip__btn" onClick={() => onToggleVisibility(s.id)}
                    title={s.visible ? "Hide" : "Show"}>
                    {s.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button type="button" className="section-chip__btn section-chip__btn--danger"
                    onClick={() => onDelete(s.id)} title="Delete">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {/* Drop indicator at end */}
          {isOver && dropTarget.index === items.length && (
            <div className="section-drop-indicator" />
          )}
          {items.length === 0 && !isOver && (
            <div className="section-zone__empty">Drop sections here</div>
          )}
        </div>
        <button
          type="button"
          className="section-zone__add"
          onClick={() => setAddMenuPlacement(addMenuPlacement === placement ? null : placement)}
        >
          <Plus className="w-3 h-3" /> Add Section
        </button>
        {addMenuPlacement === placement && (
          <div className="section-zone__menu">
            {(["log", "tags", "text", "links", "simple-list"] as CvSectionType[]).map((t) => (
              <button key={t} type="button" className="section-zone__menu-item"
                onClick={() => { onAdd(t, placement); setAddMenuPlacement(null) }}>
                {SECTION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="section-organizer">
      {renderZone("Sidebar", "sidebar", sidebarSections)}
      {renderZone("Main Content", "main", mainSections)}
    </div>
  )
}

/* ═══════════════════════════════════════
   Section Data Editors (per type)
   ═══════════════════════════════════════ */
function SectionDataEditor({ section, onChange }: { section: CvSection; onChange: (d: CvSectionData) => void }) {
  const d = section.data
  switch (d.type) {
    case "log":
      return <LogSectionEditor entries={d.entries} onChange={(entries) => onChange({ type: "log", entries })} />
    case "tags":
      return <TagsSectionEditor groups={d.groups} onChange={(groups) => onChange({ type: "tags", groups })} />
    case "text":
      return <TextSectionEditor content={d.content} onChange={(content) => onChange({ type: "text", content })} />
    case "links":
      return <LinksSectionEditor items={d.items} onChange={(items) => onChange({ type: "links", items })} />
    case "simple-list":
      return <SimpleListSectionEditor items={d.items} onChange={(items) => onChange({ type: "simple-list", items })} />
  }
}

/* ── Log (timeline) editor ── */
function LogSectionEditor({
  entries, onChange,
}: {
  entries: CvLogEntry[]
  onChange: (e: CvLogEntry[]) => void
}) {
  const update = (idx: number, patch: Partial<CvLogEntry>) =>
    onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)))

  const add = () =>
    onChange([...entries, { id: uid(), title: "", subtitle: "", dateStart: "", dateEnd: "", description: "", tags: [] }])

  const remove = (idx: number) => onChange(entries.filter((_, i) => i !== idx))

  return (
    <div className="cv-section-editor">
      {entries.map((entry, i) => (
        <div key={entry.id} className="cv-entry-card">
          <div className="cv-entry-card__header">
            <span className="cv-entry-card__num">#{i + 1}</span>
            <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" onClick={() => remove(i)}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FieldWithHint label="Title" value={entry.title} onChange={(v) => update(i, { title: v })} />
            <FieldWithHint label="Subtitle" value={entry.subtitle} onChange={(v) => update(i, { subtitle: v })} placeholder="e.g. Company, Institution" />
            <FieldWithHint label="Start Date" value={entry.dateStart} onChange={(v) => update(i, { dateStart: v })} placeholder="e.g. 2022" />
            <FieldWithHint label="End Date" value={entry.dateEnd} onChange={(v) => update(i, { dateEnd: v })} placeholder="e.g. Present" />
            <FieldWithHint label="URL" value={entry.url || ""} onChange={(v) => update(i, { url: v || undefined })} placeholder="Optional link" />
          </div>
          <TextAreaWithHint label="Description" value={entry.description} onChange={(v) => update(i, { description: v })} rows={2} ai />
          <InlineTagsEditor label="Tags" items={entry.tags} onChange={(tags) => update(i, { tags })} />
        </div>
      ))}
      <button type="button" className="cv-btn cv-btn--sm" onClick={add}>
        <Plus className="w-3 h-3" /> Add Entry
      </button>
    </div>
  )
}

/* ── Tags/groups editor ── */
function TagsSectionEditor({
  groups, onChange,
}: {
  groups: CvTagGroup[]
  onChange: (g: CvTagGroup[]) => void
}) {
  const update = (idx: number, patch: Partial<CvTagGroup>) =>
    onChange(groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)))

  const add = () => onChange([...groups, { category: "", items: [] }])
  const remove = (idx: number) => onChange(groups.filter((_, i) => i !== idx))

  return (
    <div className="cv-section-editor">
      {groups.map((group, i) => (
        <div key={i} className="cv-entry-card">
          <div className="cv-entry-card__header">
            <FieldWithHint label="Category" value={group.category} onChange={(v) => update(i, { category: v })} />
            <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" onClick={() => remove(i)}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <InlineTagsEditor label="Items" items={group.items} onChange={(items) => update(i, { items })} />
        </div>
      ))}
      <button type="button" className="cv-btn cv-btn--sm" onClick={add}>
        <Plus className="w-3 h-3" /> Add Group
      </button>
    </div>
  )
}

/* ── Text editor ── */
function TextSectionEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  return <TextAreaWithHint label="Content" value={content} onChange={onChange} rows={4} ai />
}

/* ── Links editor ── */
function LinksSectionEditor({
  items, onChange,
}: {
  items: CvLinkItem[]
  onChange: (items: CvLinkItem[]) => void
}) {
  const update = (idx: number, patch: Partial<CvLinkItem>) =>
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)))

  const add = () => onChange([...items, { label: "", url: "" }])
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="cv-section-editor">
      {items.map((item, i) => (
        <div key={i} className="cv-entry-row">
          <input className="cv-field__input" value={item.label} placeholder="Label"
            onChange={(e) => update(i, { label: e.target.value })} />
          <input className="cv-field__input" value={item.url} placeholder="URL"
            onChange={(e) => update(i, { url: e.target.value })} />
          <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" onClick={() => remove(i)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button type="button" className="cv-btn cv-btn--sm" onClick={add}>
        <Plus className="w-3 h-3" /> Add Link
      </button>
    </div>
  )
}

/* ── Simple list editor ── */
function SimpleListSectionEditor({
  items, onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...items, v])
    setDraft("")
  }

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="cv-section-editor">
      <div className="cv-list-items">
        {items.map((item, i) => (
          <div key={i} className="cv-list-item">
            <input className="cv-field__input" value={item}
              onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))} />
            <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" onClick={() => remove(i)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="cv-entry-row">
        <input className="cv-field__input" value={draft} placeholder="Add item…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
        <button type="button" className="cv-btn cv-btn--sm" onClick={add}>
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

/* ── Inline tags editor (for within log entries) ── */
function InlineTagsEditor({
  label, items, onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const v = draft.trim()
    if (!v || items.includes(v)) return
    onChange([...items, v])
    setDraft("")
  }

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="cv-field">
      <label className="cv-field__label">{label}</label>
      <div className="cv-tags-wrap">
        {items.map((tag, i) => (
          <span key={i} className="cv-tag">
            {tag}
            <button type="button" className="cv-tag__remove" onClick={() => remove(i)}>×</button>
          </span>
        ))}
        <input
          className="cv-tags-input"
          value={draft}
          placeholder="Add tag…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add() }
            if (e.key === "Backspace" && !draft && items.length > 0) remove(items.length - 1)
          }}
        />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════════════ */
const editorStyles = `
  /* ── Top bar ── */
  .cv-editor-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background: #0f172a;
    color: #f8fafc;
    font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .cv-editor-bar__left,
  .cv-editor-bar__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cv-editor-bar__back {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }
  .cv-editor-bar__back:hover { color: #f8fafc; }
  .cv-editor-bar__title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .cv-editor-bar__status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #94a3b8;
  }
  .cv-editor-bar__status--ok { color: #4ade80; }
  .cv-editor-bar__status--err { color: #f87171; }
  .cv-editor-bar__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1e293b;
    border: 1px solid #334155;
    color: #f8fafc;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }
  .cv-editor-bar__btn:hover { background: #334155; }

  /* ── Preset tabs ── */
  .cv-preset-bar {
    position: sticky;
    top: 44px;
    z-index: 49;
    background: #1e293b;
    padding: 0 20px;
    overflow-x: auto;
    border-bottom: 1px solid #334155;
  }
  .cv-preset-bar__tabs {
    display: flex;
    gap: 0;
  }
  .cv-preset-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    color: #94a3b8;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    font-weight: 500;
  }
  .cv-preset-tab:hover { color: #e2e8f0; }
  .cv-preset-tab--active {
    color: #f8fafc;
    border-bottom-color: #3b82f6;
    font-weight: 600;
  }
  .cv-preset-tab--hidden { opacity: 0.5; }
  .cv-preset-tab--add { color: #64748b; }
  .cv-preset-tab--add:hover { color: #94a3b8; }
  .cv-preset-tab__layout {
    font-size: 9px;
    background: #334155;
    color: #94a3b8;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Main editor area ── */
  .cv-editor-main {
    max-width: 860px;
    width: 100%;
    margin: 24px auto;
    padding: 0 16px 48px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .cv-editor-split__editor .cv-editor-main {
    max-width: none;
  }

  /* ── Card ── */
  .cv-editor-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .cv-editor-card--muted { opacity: 0.5; }
  .cv-editor-card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    cursor: pointer;
    user-select: none;
  }
  .cv-editor-card__title {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
  }
  .cv-editor-card__title-input {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    border: 1px solid transparent;
    background: transparent;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: inherit;
    min-width: 0;
  }
  .cv-editor-card__title-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
  }
  .cv-editor-card__badge {
    font-size: 9px;
    background: #e0e7ff;
    color: #4338ca;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    flex-shrink: 0;
  }
  .cv-editor-card__body { padding: 16px; }

  /* ── Fields ── */
  .cv-field { display: flex; flex-direction: column; gap: 4px; }
  .cv-field__label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cv-field__input {
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 13px;
    font-family: inherit;
    color: #0f172a;
    background: #ffffff;
  }
  .cv-field__input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
  }
  .cv-field__textarea { resize: vertical; min-height: 48px; }
  .cv-field__label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  /* ── AI assistant ── */
  .ai-assist { position: relative; }
  .ai-assist__trigger {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    border: 1px solid #c7d2fe;
    border-radius: 4px;
    background: linear-gradient(135deg, #eef2ff, #e0e7ff);
    color: #4338ca;
    font-size: 10px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ai-assist__trigger:hover { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); }
  .ai-assist__trigger--loading {
    opacity: 0.7;
    cursor: wait;
  }
  .ai-assist__menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    z-index: 20;
    overflow: hidden;
    min-width: 160px;
  }
  .ai-assist__item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 14px;
    font-size: 12px;
    font-family: inherit;
    border: none;
    background: none;
    cursor: pointer;
    color: #334155;
  }
  .ai-assist__item:hover { background: #f1f5f9; }
  .ai-assist__divider {
    height: 1px;
    background: #e2e8f0;
    margin: 2px 0;
  }
  .ai-assist__custom {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
  }
  .ai-assist__custom-input {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-family: inherit;
    min-width: 0;
  }
  .ai-assist__custom-input:focus {
    outline: none;
    border-color: #3b82f6;
  }
  .ai-assist__custom-go {
    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    background: #4338ca;
    color: white;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .ai-assist__custom-go:hover { background: #3730a3; }
  .ai-assist__custom-go:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Buttons ── */
  .cv-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    background: #f8fafc;
    color: #334155;
  }
  .cv-btn:hover { background: #e2e8f0; }
  .cv-btn--sm { padding: 4px 8px; font-size: 11px; }
  .cv-btn--danger { color: #dc2626; border-color: #fecaca; }
  .cv-btn--danger:hover { background: #fef2f2; }

  /* ── Section organizer ── */
  .section-organizer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .section-zone {
    border: 2px dashed #e2e8f0;
    border-radius: 8px;
    padding: 12px;
    min-height: 80px;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }
  .section-zone--drag-over {
    border-color: #3b82f6;
    background: #eff6ff;
  }
  .section-zone__label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748b;
    margin-bottom: 8px;
  }
  .section-zone__chips {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .section-zone__empty {
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
    padding: 16px 0;
  }
  .section-zone__add {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    background: none;
    border: 1px dashed #cbd5e1;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    color: #64748b;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    justify-content: center;
  }
  .section-zone__add:hover { border-color: #3b82f6; color: #3b82f6; }
  .section-zone__menu {
    position: absolute;
    bottom: -4px;
    left: 12px;
    transform: translateY(100%);
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 10;
    overflow: hidden;
  }
  .section-zone__menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 16px;
    font-size: 12px;
    font-family: inherit;
    border: none;
    background: none;
    cursor: pointer;
    color: #334155;
  }
  .section-zone__menu-item:hover { background: #f1f5f9; }

  /* ── Section chip ── */
  .section-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-size: 12px;
    cursor: grab;
    transition: opacity 0.15s, box-shadow 0.15s;
  }
  .section-chip:active { cursor: grabbing; }
  .section-chip--dragging { opacity: 0.4; }
  .section-chip--hidden { opacity: 0.45; }
  .section-drop-indicator {
    height: 2px;
    background: #3b82f6;
    border-radius: 1px;
    margin: 2px 0;
  }
  .section-chip__title {
    font-weight: 500;
    color: #0f172a;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .section-chip__type {
    font-size: 9px;
    background: #e0e7ff;
    color: #4338ca;
    padding: 1px 5px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }
  .section-chip__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
  .section-chip__btn {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    border-radius: 3px;
  }
  .section-chip__btn:hover { color: #0f172a; background: #e2e8f0; }
  .section-chip__btn--danger:hover { color: #dc2626; background: #fef2f2; }

  /* ── Entry card (for log/tag editors) ── */
  .cv-section-editor { display: flex; flex-direction: column; gap: 12px; }
  .cv-entry-card {
    border: 1px solid #f1f5f9;
    background: #fafbfc;
    border-radius: 6px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cv-entry-card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cv-entry-card__num {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
  }

  /* ── Entry row (links, list items) ── */
  .cv-entry-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .cv-entry-row .cv-field__input { flex: 1; }
  .cv-list-items { display: flex; flex-direction: column; gap: 4px; }
  .cv-list-item { display: flex; gap: 6px; align-items: center; }
  .cv-list-item .cv-field__input { flex: 1; }

  /* ── Tags inline ── */
  .cv-tags-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 5px 8px;
    background: #ffffff;
    min-height: 36px;
    align-items: center;
  }
  .cv-tag {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: #e0e7ff;
    color: #3730a3;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
  }
  .cv-tag__remove {
    background: none;
    border: none;
    color: #6366f1;
    cursor: pointer;
    font-size: 13px;
    padding: 0 0 0 2px;
    line-height: 1;
  }
  .cv-tag__remove:hover { color: #dc2626; }
  .cv-tags-input {
    border: none;
    outline: none;
    font-size: 12px;
    min-width: 80px;
    flex: 1;
    font-family: inherit;
    background: transparent;
  }

  /* ── Empty state ── */
  .cv-editor-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 80px 0;
    color: #64748b;
    font-size: 14px;
  }

  /* ── Split layout ── */
  .cv-editor-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    min-height: calc(100vh - 90px);
  }
  .cv-editor-split__editor {
    overflow-y: auto;
    height: calc(100vh - 90px);
    min-height: 0;
  }
  .cv-editor-split__preview {
    position: sticky;
    top: 90px;
    height: calc(100vh - 90px);
    overflow-y: auto;
    background: #d1d5db;
    border-left: 1px solid #cbd5e1;
    display: flex;
    flex-direction: column;
  }
  .cv-editor-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #1e293b;
    color: #f8fafc;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .cv-editor-preview-header__title {
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .cv-editor-preview-header__controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cv-editor-preview-header__layout {
    font-size: 10px;
    background: #334155;
    color: #94a3b8;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cv-editor-preview-zoom-btn {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    color: #f8fafc;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }
  .cv-editor-preview-zoom-btn:hover { background: rgba(255,255,255,0.25); }
  .cv-editor-preview-zoom-label {
    font-size: 10px;
    color: #94a3b8;
    min-width: 32px;
    text-align: center;
  }
  .cv-editor-preview-scaler {
    flex: 1;
    overflow: auto;
    padding: 16px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  /* ── Mobile toggle ── */
  .cv-editor-mobile-toggle { display: none; }

  /* ── Responsive ── */
  @media screen and (max-width: 1024px) {
    .cv-editor-split {
      grid-template-columns: 1fr;
    }
    .cv-editor-split__editor {
      display: block;
      height: auto;
    }
    .cv-editor-split__preview { display: none; }
    .cv-editor-split--preview-mode .cv-editor-split__editor { display: none; }
    .cv-editor-split--preview-mode .cv-editor-split__preview {
      display: flex;
      position: static;
      height: auto;
      min-height: calc(100vh - 130px);
    }
    .cv-editor-mobile-toggle {
      display: flex;
      justify-content: center;
      gap: 0;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 0 20px;
    }
    .cv-editor-mobile-toggle__btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 20px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #64748b;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
    }
    .cv-editor-mobile-toggle__btn--active {
      color: #f8fafc;
      border-bottom-color: #3b82f6;
      font-weight: 600;
    }
    .section-organizer { grid-template-columns: 1fr; }
  }
  @media screen and (max-width: 768px) {
    .cv-editor-bar {
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
    }
    .cv-editor-bar__left,
    .cv-editor-bar__right {
      width: 100%;
      justify-content: space-between;
    }
  }
`
