"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  X,
  Briefcase,
  Globe,
  Award,
  BookOpen,
  Languages,
  Terminal,
  EyeOff,
  LayoutTemplate,
} from "lucide-react"

import type { PortfolioContent } from "@/lib/default-content"
import type {
  CvContent,
  CvExperienceEntry,
  CvEducationEntry,
  CvProjectEntry,
} from "@/lib/cv-content"
import { emptyCvContent } from "@/lib/cv-content"
import type { CvPreset, CvLayoutId } from "@/lib/cv-presets"
import { createCvData } from "@/lib/cv-data-transform"
import { ClassicLayout } from "@/components/cv/classic-layout"
import { ResumeLayout } from "@/components/cv/resume-layout"
import profilePicture from "@/app/prof_pic.jpeg"

/* ── tiny id helper ── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/* ================================================================
   Main editor page component
   ================================================================ */
export default function CvEditorPage() {
  const router = useRouter()

  /* auth state */
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)

  /* data */
  const [portfolio, setPortfolio] = useState<PortfolioContent | null>(null)
  const [presets, setPresets] = useState<CvPreset[]>([])
  const [activePresetId, setActivePresetId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor")
  const [previewZoom, setPreviewZoom] = useState(0.5)

  /* debounce / abort refs */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  /* ── cursor visibility (must run before any early returns) ── */
  useEffect(() => {
    document.body.classList.add("cv-cursor-visible")
    return () => {
      document.body.classList.remove("cv-cursor-visible")
    }
  }, [])

  /* ── auth check ── */
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/session")
        const data = (await res.json()) as { authenticated?: boolean }
        if (data.authenticated) {
          setIsAuthenticated(true)
        } else {
          router.replace("/")
        }
      } catch {
        router.replace("/")
      } finally {
        setAuthChecking(false)
      }
    })()
  }, [router])

  /* ── load data ── */
  useEffect(() => {
    if (!isAuthenticated) return
    ;(async () => {
      setLoading(true)
      try {
        const [pRes, cRes] = await Promise.all([
          fetch("/api/content"),
          fetch("/api/cv/presets"),
        ])
        const pData = (await pRes.json()) as { content?: PortfolioContent }
        if (pData.content) setPortfolio(pData.content)

        if (cRes.ok) {
          const cData = (await cRes.json()) as { presets?: CvPreset[] }
          if (cData.presets && cData.presets.length > 0) {
            setPresets(cData.presets)
            setActivePresetId(cData.presets[0].id)
          }
        }
      } catch (e) {
        setError("Failed to load data")
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [isAuthenticated])

  /* ── persist all presets (debounced 600ms, with abort) ── */
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
      setPresets((prev) => {
        const next = updater(prev)
        void persist(next)
        return next
      })
    },
    [persist],
  )

  /* Helper: update the active preset's content */
  const updateContent = useCallback(
    (updater: (prev: CvContent) => CvContent) => {
      updatePresets((prev) =>
        prev.map((p) => (p.id === activePresetId ? { ...p, content: updater(p.content) } : p)),
      )
    },
    [updatePresets, activePresetId],
  )

  /* Active preset */
  const activePreset = presets.find((p) => p.id === activePresetId)
  const cv = activePreset?.content ?? emptyCvContent()

  /* Live preview data — recomputed on every change */
  const previewData = activePreset ? createCvData(activePreset.content) : null

  /* ── import helpers ── */
  const importAllExperience = () => {
    if (!portfolio) return
    updateContent((prev) => ({
      ...prev,
      experience: portfolio.experienceLog.map((e, i) => ({
        id: uid(),
        year: e.year,
        title: e.title,
        company: e.company,
        description: e.cvDescription?.trim() || e.description,
        tags: [...e.tags],
        source: "portfolio" as const,
        portfolioIndex: i,
      })),
    }))
  }

  const importAllEducation = () => {
    if (!portfolio) return
    updateContent((prev) => ({
      ...prev,
      education: portfolio.educationLog.map((e, i) => ({
        id: uid(),
        year: e.year,
        degree: e.degree,
        institution: e.institution,
        description: e.cvDescription?.trim() || e.description,
        tags: [...e.tags],
        source: "portfolio" as const,
        portfolioIndex: i,
      })),
    }))
  }

  const importAllProjects = () => {
    if (!portfolio) return
    updateContent((prev) => ({
      ...prev,
      projects: portfolio.projectCategories.flatMap((cat) =>
        cat.projects
          .filter((p) => p.showInCv !== false)
          .map((p, pi) => ({
            id: uid(),
            title: p.title,
            category: cat.name,
            description: p.cvDescription?.trim() || p.description,
            status: p.status,
            metrics: { ...p.metrics },
            githubUrl: p.githubUrl,
            showInCv: true,
            source: "portfolio" as const,
            portfolioCategoryId: cat.id,
            portfolioProjectIndex: pi,
          })),
      ),
    }))
  }

  /* ── preset CRUD ── */
  const createPreset = () => {
    const name = `Preset ${presets.length + 1}`
    const newPreset: CvPreset = {
      id: uid(),
      name,
      layout: "classic",
      visible: true,
      content: emptyCvContent(),
    }
    updatePresets((prev) => [...prev, newPreset])
    setActivePresetId(newPreset.id)
  }

  const deletePreset = (id: string) => {
    updatePresets((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (activePresetId === id && next.length > 0) {
        setActivePresetId(next[0].id)
      }
      return next
    })
  }

  const toggleVisibility = (id: string) => {
    updatePresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)),
    )
  }

  const setPresetLayout = (id: string, layout: CvLayoutId) => {
    updatePresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, layout } : p)),
    )
  }

  const renamePreset = (id: string, name: string) => {
    updatePresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p)),
    )
  }

  /* ── loading / auth guards ── */
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500 font-mono">Loading CV data…</p>
        </div>
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
          {saving && (
            <span className="cv-editor-bar__status">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </span>
          )}
          {saved && (
            <span className="cv-editor-bar__status cv-editor-bar__status--ok">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {error && (
            <span className="cv-editor-bar__status cv-editor-bar__status--err">{error}</span>
          )}
          <button
            onClick={() => router.push("/")}
            className="cv-editor-bar__btn"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
        </div>
      </header>

      {/* ── Preset tabs bar ── */}
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
          <button
            type="button"
            onClick={() => setMobileView("editor")}
            className={`cv-editor-mobile-toggle__btn ${mobileView === "editor" ? "cv-editor-mobile-toggle__btn--active" : ""}`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={`cv-editor-mobile-toggle__btn ${mobileView === "preview" ? "cv-editor-mobile-toggle__btn--active" : ""}`}
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>
      )}

      {activePreset ? (
        <div className={`cv-editor-split ${mobileView === "preview" ? "cv-editor-split--preview-mode" : ""}`}>
        <div className="cv-editor-split__editor">
        <main className="cv-editor-main">
          {/* ─────────── Preset Settings ─────────── */}
          <EditorCard title="Preset Settings" icon={<LayoutTemplate className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="cv-field">
                <label className="cv-field__label">Preset Name</label>
                <input
                  className="cv-field__input"
                  value={activePreset.name}
                  onChange={(e) => renamePreset(activePreset.id, e.target.value)}
                />
              </div>
              <div className="cv-field">
                <label className="cv-field__label">Layout</label>
                <select
                  className="cv-field__input"
                  value={activePreset.layout}
                  onChange={(e) => setPresetLayout(activePreset.id, e.target.value as CvLayoutId)}
                >
                  <option value="classic">Classic</option>
                  <option value="resume">Résumé</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePreset.visible}
                  onChange={() => toggleVisibility(activePreset.id)}
                  className="accent-slate-700 w-4 h-4"
                />
                Visible in CV preview
              </label>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete preset "${activePreset.name}"?`)) {
                    deletePreset(activePreset.id)
                  }
                }}
                className="cv-editor-delete-btn"
              >
                <Trash2 className="w-3 h-3" /> Delete Preset
              </button>
            </div>
          </EditorCard>

          {/* ─────────── Profile ─────────── */}
          <EditorCard title="Profile" icon={<Globe className="w-4 h-4" />}>
            <FieldWithHint
              label="Full Name"
              value={cv.name ?? ""}
              hint={portfolio?.profileData.name}
              onChange={(v) => updateContent((p) => ({ ...p, name: v || undefined }))}
            />
            <FieldWithHint
              label="Professional Title"
              value={cv.title ?? ""}
              hint={portfolio?.profileData.title}
              onChange={(v) => updateContent((p) => ({ ...p, title: v || undefined }))}
            />
            <TextAreaWithHint
              label="Summary / Bio"
              value={cv.summary ?? ""}
              hint={portfolio?.profileData.bio}
              onChange={(v) => updateContent((p) => ({ ...p, summary: v || undefined }))}
            />
            <FieldWithHint
              label="Location"
              value={cv.location ?? ""}
              hint="Via Entracque, 10, Cuneo (12100)"
              onChange={(v) => updateContent((p) => ({ ...p, location: v || undefined }))}
            />
            <FieldWithHint
              label="Email"
              value={cv.email ?? ""}
              hint="quicksolver02@gmail.com"
              onChange={(v) => updateContent((p) => ({ ...p, email: v || undefined }))}
            />
            <FieldWithHint
              label="Phone"
              value={cv.phone ?? ""}
              hint=""
              onChange={(v) => updateContent((p) => ({ ...p, phone: v || undefined }))}
            />
            <FieldWithHint
              label="P.IVA"
              value={cv.piva ?? ""}
              hint="P.IVA: 04081230049 - QuickSolver"
              onChange={(v) => updateContent((p) => ({ ...p, piva: v || undefined }))}
            />
          </EditorCard>

          {/* ─────────── Links ─────────── */}
          <EditorCard title="Links" icon={<Globe className="w-4 h-4" />}>
            <LinksEditor
              links={cv.links ?? []}
              onChange={(links) => updateContent((p) => ({ ...p, links: links.length > 0 ? links : undefined }))}
            />
          </EditorCard>

          {/* ─────────── Skills ─────────── */}
          <EditorCard title="Skills" icon={<Terminal className="w-4 h-4" />}>
            <SkillsEditor
              skills={cv.skills ?? {}}
              portfolioSkills={portfolio?.skillsData}
              onChange={(skills) => updateContent((p) => ({ ...p, skills: Object.keys(skills).length > 0 ? skills : undefined }))}
            />
          </EditorCard>

          {/* ─────────── Experience ─────────── */}
          <EditorCard
            title="Experience"
            icon={<Briefcase className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                {portfolio && (
                  <button type="button" onClick={importAllExperience} className="cv-editor-action-btn">
                    <Copy className="w-3 h-3" /> Import from Portfolio
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateContent((p) => ({
                      ...p,
                      experience: [
                        ...p.experience,
                        { id: uid(), year: "", title: "", company: "", description: "", tags: [], source: "custom" },
                      ],
                    }))
                  }
                  className="cv-editor-action-btn cv-editor-action-btn--primary"
                >
                  <Plus className="w-3 h-3" /> Add Custom
                </button>
              </div>
            }
          >
            {cv.experience.length === 0 && (
              <p className="text-sm text-slate-400 italic">
                No experience entries yet. Import from portfolio or add custom entries.
              </p>
            )}
            {cv.experience.map((entry, idx) => (
              <ExperienceEditor
                key={entry.id}
                entry={entry}
                portfolioHint={
                  entry.source === "portfolio" && entry.portfolioIndex !== undefined
                    ? portfolio?.experienceLog[entry.portfolioIndex]
                    : undefined
                }
                onChange={(e) =>
                  updateContent((p) => ({
                    ...p,
                    experience: p.experience.map((x, i) => (i === idx ? e : x)),
                  }))
                }
                onDelete={() =>
                  updateContent((p) => ({
                    ...p,
                    experience: p.experience.filter((_, i) => i !== idx),
                  }))
                }
              />
            ))}
          </EditorCard>

          {/* ─────────── Education ─────────── */}
          <EditorCard
            title="Education"
            icon={<GraduationCap className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                {portfolio && (
                  <button type="button" onClick={importAllEducation} className="cv-editor-action-btn">
                    <Copy className="w-3 h-3" /> Import from Portfolio
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateContent((p) => ({
                      ...p,
                      education: [
                        ...p.education,
                        { id: uid(), year: "", degree: "", institution: "", description: "", tags: [], source: "custom" },
                      ],
                    }))
                  }
                  className="cv-editor-action-btn cv-editor-action-btn--primary"
                >
                  <Plus className="w-3 h-3" /> Add Custom
                </button>
              </div>
            }
          >
            {cv.education.length === 0 && (
              <p className="text-sm text-slate-400 italic">
                No education entries yet. Import from portfolio or add custom entries.
              </p>
            )}
            {cv.education.map((entry, idx) => (
              <EducationEditor
                key={entry.id}
                entry={entry}
                portfolioHint={
                  entry.source === "portfolio" && entry.portfolioIndex !== undefined
                    ? portfolio?.educationLog[entry.portfolioIndex]
                    : undefined
                }
                onChange={(e) =>
                  updateContent((p) => ({
                    ...p,
                    education: p.education.map((x, i) => (i === idx ? e : x)),
                  }))
                }
                onDelete={() =>
                  updateContent((p) => ({
                    ...p,
                    education: p.education.filter((_, i) => i !== idx),
                  }))
                }
              />
            ))}
          </EditorCard>

          {/* ─────────── Projects ─────────── */}
          <EditorCard
            title="Projects"
            icon={<Terminal className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                {portfolio && (
                  <button type="button" onClick={importAllProjects} className="cv-editor-action-btn">
                    <Copy className="w-3 h-3" /> Import from Portfolio
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateContent((p) => ({
                      ...p,
                      projects: [
                        ...p.projects,
                        {
                          id: uid(),
                          title: "",
                          category: "",
                          description: "",
                          status: "DEVELOPMENT",
                          metrics: {},
                          showInCv: true,
                          source: "custom",
                        },
                      ],
                    }))
                  }
                  className="cv-editor-action-btn cv-editor-action-btn--primary"
                >
                  <Plus className="w-3 h-3" /> Add Custom
                </button>
              </div>
            }
          >
            {cv.projects.length === 0 && (
              <p className="text-sm text-slate-400 italic">
                No projects yet. Import from portfolio or add custom entries.
              </p>
            )}
            {cv.projects.map((entry, idx) => (
              <ProjectEditor
                key={entry.id}
                entry={entry}
                onChange={(e) =>
                  updateContent((p) => ({
                    ...p,
                    projects: p.projects.map((x, i) => (i === idx ? e : x)),
                  }))
                }
                onDelete={() =>
                  updateContent((p) => ({
                    ...p,
                    projects: p.projects.filter((_, i) => i !== idx),
                  }))
                }
              />
            ))}
          </EditorCard>

          {/* ─────────── Simple lists ─────────── */}
          <EditorCard title="Certifications" icon={<Award className="w-4 h-4" />}>
            <StringListEditor
              items={cv.certs}
              onChange={(certs) => updateContent((p) => ({ ...p, certs }))}
              placeholder="e.g. AWS Solutions Architect"
            />
          </EditorCard>

          <EditorCard title="Languages" icon={<Languages className="w-4 h-4" />}>
            <StringListEditor
              items={cv.languages}
              onChange={(languages) => updateContent((p) => ({ ...p, languages }))}
              placeholder="e.g. Italian — Native"
            />
          </EditorCard>

          <EditorCard title="Awards" icon={<Award className="w-4 h-4" />}>
            <StringListEditor
              items={cv.awards}
              onChange={(awards) => updateContent((p) => ({ ...p, awards }))}
              placeholder="e.g. Best Innovation 2024"
            />
          </EditorCard>

          <EditorCard title="Publications" icon={<BookOpen className="w-4 h-4" />}>
            <StringListEditor
              items={cv.publications}
              onChange={(publications) => updateContent((p) => ({ ...p, publications }))}
              placeholder="e.g. Paper title — Journal, Year"
            />
          </EditorCard>
        </main>
        </div>

        {/* ── Live preview panel ── */}
        <aside className="cv-editor-split__preview">
          <div className="cv-editor-preview-header">
            <span className="cv-editor-preview-header__title">Live Preview</span>
            <div className="cv-editor-preview-header__controls">
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.max(0.2, z - 0.1))}
                className="cv-editor-preview-zoom-btn"
                title="Zoom out"
              >
                −
              </button>
              <span className="cv-editor-preview-zoom-label">{Math.round(previewZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.min(1, z + 0.1))}
                className="cv-editor-preview-zoom-btn"
                title="Zoom in"
              >
                +
              </button>
              <span className="cv-editor-preview-header__layout">{activePreset.layout}</span>
            </div>
          </div>
          <div className="cv-editor-preview-scaler" style={{ zoom: previewZoom } as React.CSSProperties}>
            {previewData && activePreset.layout === "classic" && (
              <ClassicLayout data={previewData} profilePicture={profilePicture} />
            )}
            {previewData && activePreset.layout === "resume" && (
              <ResumeLayout data={previewData} profilePicture={profilePicture} />
            )}
          </div>
        </aside>
        </div>
      ) : (
        <main className="cv-editor-main">
          <div className="text-center py-16 text-slate-400">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No presets yet</p>
            <p className="text-sm mt-1">Create your first CV preset to get started.</p>
            <button type="button" onClick={createPreset} className="cv-editor-action-btn cv-editor-action-btn--primary mt-4">
              <Plus className="w-3 h-3" /> Create Preset
            </button>
          </div>
        </main>
      )}
    </div>
  )
}

/* ================================================================
   Sub-components
   ================================================================ */

function EditorCard({
  title,
  icon,
  actions,
  children,
}: {
  title: string
  icon: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="cv-editor-card">
      <div className="cv-editor-card__header">
        <h2 className="cv-editor-card__title">
          {icon} {title}
        </h2>
        {actions}
      </div>
      <div className="cv-editor-card__body">{children}</div>
    </section>
  )
}

/* ── Field with portfolio hint ── */
function FieldWithHint({
  label,
  value,
  hint,
  onChange,
}: {
  label: string
  value: string
  hint?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="cv-field">
      <label className="cv-field__label">{label}</label>
      <input
        className="cv-field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint ? `Portfolio: ${hint}` : `Enter ${label.toLowerCase()}…`}
      />
      {hint && value !== hint && (
        <button
          type="button"
          className="cv-field__hint-btn"
          onClick={() => onChange(hint)}
          title="Use portfolio value"
        >
          <Copy className="w-3 h-3" /> Use portfolio value
        </button>
      )}
    </div>
  )
}

function TextAreaWithHint({
  label,
  value,
  hint,
  onChange,
}: {
  label: string
  value: string
  hint?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="cv-field">
      <label className="cv-field__label">{label}</label>
      <textarea
        className="cv-field__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint ? `Portfolio: ${hint}` : `Enter ${label.toLowerCase()}…`}
        rows={3}
      />
      {hint && value !== hint && (
        <button
          type="button"
          className="cv-field__hint-btn"
          onClick={() => onChange(hint)}
          title="Use portfolio value"
        >
          <Copy className="w-3 h-3" /> Use portfolio value
        </button>
      )}
    </div>
  )
}

/* ── Links editor ── */
function LinksEditor({
  links,
  onChange,
}: {
  links: { label: string; url: string }[]
  onChange: (links: { label: string; url: string }[]) => void
}) {
  return (
    <div className="space-y-2">
      {links.map((link, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="cv-field__input flex-1"
            value={link.label}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], label: e.target.value }
              onChange(updated)
            }}
            placeholder="Label"
          />
          <input
            className="cv-field__input flex-[2]"
            value={link.url}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], url: e.target.value }
              onChange(updated)
            }}
            placeholder="URL"
          />
          <button
            type="button"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
            className="cv-editor-delete-btn"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...links, { label: "", url: "" }])}
        className="cv-editor-action-btn"
      >
        <Plus className="w-3 h-3" /> Add Link
      </button>
    </div>
  )
}

/* ── Skills editor ── */
function SkillsEditor({
  skills,
  portfolioSkills,
  onChange,
}: {
  skills: Record<string, string[]>
  portfolioSkills?: { frontend: string[]; backend: string[]; devops: string[] }
  onChange: (skills: Record<string, string[]>) => void
}) {
  const [newCat, setNewCat] = useState("")
  const categories = Object.keys(skills).length > 0 ? Object.keys(skills) : []

  const importPortfolioSkills = () => {
    if (!portfolioSkills) return
    onChange({
      FRONTEND: [...portfolioSkills.frontend],
      BACKEND: [...portfolioSkills.backend],
      DEVOPS: [...portfolioSkills.devops],
    })
  }

  return (
    <div className="space-y-4">
      {portfolioSkills && Object.keys(skills).length === 0 && (
        <button type="button" onClick={importPortfolioSkills} className="cv-editor-action-btn">
          <Copy className="w-3 h-3" /> Import Skills from Portfolio
        </button>
      )}
      {categories.map((cat) => (
        <div key={cat} className="border border-slate-200 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{cat}</span>
            <button
              type="button"
              onClick={() => {
                const updated = { ...skills }
                delete updated[cat]
                onChange(updated)
              }}
              className="cv-editor-delete-btn"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {skills[cat].map((skill, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs rounded">
                {skill}
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...skills, [cat]: skills[cat].filter((_, j) => j !== i) }
                    onChange(updated)
                  }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          <AddInlineInput
            placeholder="Add skill…"
            onAdd={(v) => onChange({ ...skills, [cat]: [...skills[cat], v] })}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className="cv-field__input flex-1"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New category name…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newCat.trim()) {
              onChange({ ...skills, [newCat.trim().toUpperCase()]: [] })
              setNewCat("")
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (newCat.trim()) {
              onChange({ ...skills, [newCat.trim().toUpperCase()]: [] })
              setNewCat("")
            }
          }}
          className="cv-editor-action-btn"
        >
          <Plus className="w-3 h-3" /> Add Category
        </button>
      </div>
    </div>
  )
}

/* ── Experience editor ── */
function ExperienceEditor({
  entry,
  portfolioHint,
  onChange,
  onDelete,
}: {
  entry: CvExperienceEntry
  portfolioHint?: { year: string; title: string; company: string; description: string; tags: string[] }
  onChange: (e: CvExperienceEntry) => void
  onDelete: () => void
}) {
  return (
    <div className="cv-editor-entry">
      <div className="cv-editor-entry__header">
        <span className={`cv-editor-entry__badge ${entry.source === "portfolio" ? "cv-editor-entry__badge--portfolio" : "cv-editor-entry__badge--custom"}`}>
          {entry.source === "portfolio" ? "From Portfolio" : "Custom"}
        </span>
        <button type="button" onClick={onDelete} className="cv-editor-delete-btn">
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldWithHint label="Job Title" value={entry.title} hint={portfolioHint?.title} onChange={(v) => onChange({ ...entry, title: v })} />
        <FieldWithHint label="Company" value={entry.company} hint={portfolioHint?.company} onChange={(v) => onChange({ ...entry, company: v })} />
      </div>
      <FieldWithHint label="Period" value={entry.year} hint={portfolioHint?.year} onChange={(v) => onChange({ ...entry, year: v })} />
      <TextAreaWithHint
        label="Description"
        value={entry.description}
        hint={portfolioHint?.description}
        onChange={(v) => onChange({ ...entry, description: v })}
      />
      <TagsEditor tags={entry.tags} hintTags={portfolioHint?.tags} onChange={(tags) => onChange({ ...entry, tags })} />
    </div>
  )
}

/* ── Education editor ── */
function EducationEditor({
  entry,
  portfolioHint,
  onChange,
  onDelete,
}: {
  entry: CvEducationEntry
  portfolioHint?: { year: string; degree: string; institution: string; description: string; tags: string[] }
  onChange: (e: CvEducationEntry) => void
  onDelete: () => void
}) {
  return (
    <div className="cv-editor-entry">
      <div className="cv-editor-entry__header">
        <span className={`cv-editor-entry__badge ${entry.source === "portfolio" ? "cv-editor-entry__badge--portfolio" : "cv-editor-entry__badge--custom"}`}>
          {entry.source === "portfolio" ? "From Portfolio" : "Custom"}
        </span>
        <button type="button" onClick={onDelete} className="cv-editor-delete-btn">
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      </div>
      <FieldWithHint label="Degree" value={entry.degree} hint={portfolioHint?.degree} onChange={(v) => onChange({ ...entry, degree: v })} />
      <FieldWithHint label="Institution" value={entry.institution} hint={portfolioHint?.institution} onChange={(v) => onChange({ ...entry, institution: v })} />
      <FieldWithHint label="Period" value={entry.year} hint={portfolioHint?.year} onChange={(v) => onChange({ ...entry, year: v })} />
      <TextAreaWithHint
        label="Description"
        value={entry.description}
        hint={portfolioHint?.description}
        onChange={(v) => onChange({ ...entry, description: v })}
      />
      <TagsEditor tags={entry.tags} hintTags={portfolioHint?.tags} onChange={(tags) => onChange({ ...entry, tags })} />
    </div>
  )
}

/* ── Project editor ── */
function ProjectEditor({
  entry,
  onChange,
  onDelete,
}: {
  entry: CvProjectEntry
  onChange: (e: CvProjectEntry) => void
  onDelete: () => void
}) {
  const [mKey, setMKey] = useState("")
  const [mVal, setMVal] = useState("")

  return (
    <div className="cv-editor-entry">
      <div className="cv-editor-entry__header">
        <span className={`cv-editor-entry__badge ${entry.source === "portfolio" ? "cv-editor-entry__badge--portfolio" : "cv-editor-entry__badge--custom"}`}>
          {entry.source === "portfolio" ? "From Portfolio" : "Custom"}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={entry.showInCv}
              onChange={(e) => onChange({ ...entry, showInCv: e.target.checked })}
              className="accent-slate-700"
            />
            Show in CV
          </label>
          <button type="button" onClick={onDelete} className="cv-editor-delete-btn">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="cv-field">
          <label className="cv-field__label">Title</label>
          <input className="cv-field__input" value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} />
        </div>
        <div className="cv-field">
          <label className="cv-field__label">Category</label>
          <input className="cv-field__input" value={entry.category} onChange={(e) => onChange({ ...entry, category: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="cv-field">
          <label className="cv-field__label">Status</label>
          <select
            className="cv-field__input"
            value={entry.status}
            onChange={(e) => onChange({ ...entry, status: e.target.value })}
          >
            <option>PRODUCTION</option>
            <option>BETA</option>
            <option>DEVELOPMENT</option>
            <option>ONGOING</option>
            <option>TERMINED</option>
          </select>
        </div>
        <div className="cv-field">
          <label className="cv-field__label">GitHub URL</label>
          <input
            className="cv-field__input"
            value={entry.githubUrl ?? ""}
            onChange={(e) => onChange({ ...entry, githubUrl: e.target.value || undefined })}
            placeholder="https://github.com/…"
          />
        </div>
      </div>
      <div className="cv-field">
        <label className="cv-field__label">Description</label>
        <textarea
          className="cv-field__textarea"
          value={entry.description}
          onChange={(e) => onChange({ ...entry, description: e.target.value })}
          rows={2}
        />
      </div>
      {/* Metrics */}
      <div className="cv-field">
        <label className="cv-field__label">Metrics</label>
        <div className="flex flex-wrap gap-1 mb-2">
          {Object.entries(entry.metrics).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs rounded">
              {k}: {v}
              <button
                type="button"
                onClick={() => {
                  const m = { ...entry.metrics }
                  delete m[k]
                  onChange({ ...entry, metrics: m })
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="cv-field__input flex-1" value={mKey} onChange={(e) => setMKey(e.target.value)} placeholder="Key" />
          <input className="cv-field__input flex-1" value={mVal} onChange={(e) => setMVal(e.target.value)} placeholder="Value" />
          <button
            type="button"
            className="cv-editor-action-btn"
            onClick={() => {
              if (mKey.trim() && mVal.trim()) {
                onChange({ ...entry, metrics: { ...entry.metrics, [mKey.trim()]: mVal.trim() } })
                setMKey("")
                setMVal("")
              }
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Tags editor ── */
function TagsEditor({
  tags,
  hintTags,
  onChange,
}: {
  tags: string[]
  hintTags?: string[]
  onChange: (tags: string[]) => void
}) {
  return (
    <div className="cv-field">
      <label className="cv-field__label">Tags</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs rounded">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
              className="text-slate-400 hover:text-red-500"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <AddInlineInput placeholder="Add tag…" onAdd={(v) => onChange([...tags, v])} />
        {hintTags && hintTags.length > 0 && tags.length === 0 && (
          <button type="button" className="cv-field__hint-btn" onClick={() => onChange([...hintTags])}>
            <Copy className="w-3 h-3" /> Use portfolio tags
          </button>
        )}
      </div>
    </div>
  )
}

/* ── String list editor (certs, languages, awards, publications) ── */
function StringListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="cv-field__input flex-1"
            value={item}
            onChange={(e) => {
              const updated = [...items]
              updated[i] = e.target.value
              onChange(updated)
            }}
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="cv-editor-delete-btn">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <AddInlineInput placeholder={placeholder} onAdd={(v) => onChange([...items, v])} />
    </div>
  )
}

/* ── Tiny add-inline input ── */
function AddInlineInput({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [val, setVal] = useState("")
  return (
    <div className="flex gap-2">
      <input
        className="cv-field__input flex-1"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onAdd(val.trim())
            setVal("")
          }
        }}
      />
      <button
        type="button"
        className="cv-editor-action-btn"
        onClick={() => {
          if (val.trim()) {
            onAdd(val.trim())
            setVal("")
          }
        }}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}

/* ================================================================
   Styles
   ================================================================ */
const editorStyles = `
  .cv-editor-bar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f172a;
    color: #f8fafc;
    padding: 12px 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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
    border: 1px solid rgba(255,255,255,0.2);
    color: #cbd5e1;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 4px;
  }
  .cv-editor-bar__back:hover { background: rgba(255,255,255,0.1); }
  .cv-editor-bar__title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .cv-editor-bar__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 4px;
  }
  .cv-editor-bar__btn:hover { background: #2563eb; }
  .cv-editor-bar__status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #94a3b8;
  }
  .cv-editor-bar__status--ok { color: #4ade80; }
  .cv-editor-bar__status--err { color: #f87171; }

  /* ── Preset bar ── */
  .cv-preset-bar {
    position: sticky;
    top: 49px;
    z-index: 39;
    background: #1e293b;
    padding: 0 24px;
    border-bottom: 1px solid #334155;
    font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .cv-preset-bar__tabs {
    display: flex;
    gap: 0;
    overflow-x: auto;
  }
  .cv-preset-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
  }
  .cv-preset-tab:hover {
    color: #e2e8f0;
  }
  .cv-preset-tab--active {
    color: #f8fafc;
    border-bottom-color: #3b82f6;
    font-weight: 600;
  }
  .cv-preset-tab--hidden {
    opacity: 0.5;
  }
  .cv-preset-tab--add {
    color: #64748b;
    font-style: italic;
  }
  .cv-preset-tab--add:hover {
    color: #3b82f6;
  }
  .cv-preset-tab__layout {
    font-size: 10px;
    background: rgba(255,255,255,0.1);
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

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

  .cv-editor-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .cv-editor-card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .cv-editor-card__title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.02em;
  }
  .cv-editor-card__body {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cv-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cv-field__label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .cv-field__input {
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 13px;
    color: #1e293b;
    background: #fff;
    outline: none;
    transition: border-color 0.15s;
  }
  .cv-field__input:focus { border-color: #3b82f6; }
  .cv-field__input::placeholder { color: #94a3b8; }
  .cv-field__textarea {
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 13px;
    color: #1e293b;
    background: #fff;
    outline: none;
    resize: vertical;
    min-height: 60px;
    transition: border-color 0.15s;
  }
  .cv-field__textarea:focus { border-color: #3b82f6; }
  .cv-field__textarea::placeholder { color: #94a3b8; }
  .cv-field__hint-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: 1px dashed #cbd5e1;
    color: #64748b;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 3px;
    cursor: pointer;
    align-self: flex-start;
    margin-top: 2px;
  }
  .cv-field__hint-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .cv-editor-entry {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #fafbfc;
  }
  .cv-editor-entry__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cv-editor-entry__badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cv-editor-entry__badge--portfolio {
    background: #dbeafe;
    color: #2563eb;
  }
  .cv-editor-entry__badge--custom {
    background: #f0fdf4;
    color: #16a34a;
  }

  .cv-editor-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #cbd5e1;
    background: white;
    color: #475569;
    font-size: 11px;
    font-weight: 500;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  .cv-editor-action-btn:hover {
    border-color: #94a3b8;
    background: #f8fafc;
  }
  .cv-editor-action-btn--primary {
    background: #0f172a;
    color: white;
    border-color: #0f172a;
  }
  .cv-editor-action-btn--primary:hover {
    background: #1e293b;
  }

  .cv-editor-delete-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: none;
    border: 1px solid #fecaca;
    color: #ef4444;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 3px;
    cursor: pointer;
  }
  .cv-editor-delete-btn:hover {
    background: #fef2f2;
    border-color: #ef4444;
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
  .cv-editor-preview-header__layout {
    font-size: 10px;
    background: rgba(255,255,255,0.15);
    padding: 2px 8px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .cv-editor-preview-scaler {
    flex: 1;
    overflow: auto;
    padding: 16px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .cv-editor-preview-header__controls {
    display: flex;
    align-items: center;
    gap: 6px;
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
  .cv-editor-preview-zoom-btn:hover {
    background: rgba(255,255,255,0.25);
  }
  .cv-editor-preview-zoom-label {
    font-size: 10px;
    color: #94a3b8;
    min-width: 32px;
    text-align: center;
  }

  /* ── Mobile toggle ── */
  .cv-editor-mobile-toggle {
    display: none;
  }

  /* ── Mobile responsive ── */
  @media screen and (max-width: 1024px) {
    .cv-editor-split {
      grid-template-columns: 1fr;
    }
    .cv-editor-split__editor {
      max-height: none;
    }
    .cv-editor-split__preview {
      display: none;
      position: relative;
      top: 0;
      height: auto;
      min-height: calc(100vh - 140px);
    }
    .cv-editor-split--preview-mode .cv-editor-split__editor {
      display: none;
    }
    .cv-editor-split--preview-mode .cv-editor-split__preview {
      display: flex;
    }
    .cv-editor-mobile-toggle {
      display: flex;
      justify-content: center;
      gap: 0;
      padding: 0 16px;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    }
    .cv-editor-mobile-toggle__btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 24px;
      font-size: 12px;
      font-weight: 500;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #94a3b8;
      cursor: pointer;
    }
    .cv-editor-mobile-toggle__btn--active {
      color: #f8fafc;
      border-bottom-color: #3b82f6;
      font-weight: 600;
    }
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
    .cv-editor-bar__title {
      font-size: 14px;
    }
    .cv-preset-bar {
      top: auto;
      position: relative;
      padding: 0 8px;
    }
    .cv-preset-bar__tabs {
      -webkit-overflow-scrolling: touch;
    }
    .cv-preset-tab {
      padding: 8px 12px;
      font-size: 11px;
    }
    .cv-editor-main {
      padding: 0 8px 32px;
      margin: 16px auto;
      gap: 14px;
    }
    .cv-editor-card__header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
    }
    .cv-editor-card__body {
      padding: 12px;
    }
    .cv-editor-entry {
      padding: 10px;
    }
    .cv-editor-entry__header {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
  }
`
