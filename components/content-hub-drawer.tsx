"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Database, Loader2, Plus, Trash2, X } from "lucide-react"

import type { EditorOperation } from "@/lib/content-hub"
import type { CvPreset } from "@/lib/cv-presets"
import type { PortfolioContent } from "@/lib/default-content"

type EditorState = {
  revision: number
  content: PortfolioContent
  presets: CvPreset[]
  updatedAt: string
}

type SaveState = "idle" | "saving" | "saved" | "conflict" | "error"

const CHANNEL_NAME = "portfolio-content-hub"
const boundSectionIds = new Set([
  "profile",
  "skills",
  "links",
  "experience",
  "projects",
  "education",
])

const readState = (payload: unknown): EditorState | null => {
  if (!payload || typeof payload !== "object") return null
  const value = payload as Partial<EditorState>
  if (
    typeof value.revision !== "number" ||
    !value.content ||
    !Array.isArray(value.presets)
  ) {
    return null
  }
  return value as EditorState
}

export function ContentHubDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<EditorState | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [activePresetId, setActivePresetId] = useState("")
  const [conflict, setConflict] = useState<{
    operations: EditorOperation[]
    latest: EditorState
  } | null>(null)
  const revisionRef = useRef(0)
  const closeRef = useRef<HTMLButtonElement>(null)
  const portfolioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const presetsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyServerState = (next: EditorState) => {
    revisionRef.current = next.revision
    setState(next)
    if (!activePresetId && next.presets[0]) setActivePresetId(next.presets[0].id)
  }

  const load = async () => {
    setError(null)
    try {
      const response = await fetch("/api/editor/content", { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      const next = readState(payload)
      if (!response.ok || !next) throw new Error(payload?.error || "Failed to load content hub")
      applyServerState(next)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load content hub")
    }
  }

  useEffect(() => {
    if (!open) return
    void load()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    requestAnimationFrame(() => closeRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
    // onClose is intentionally treated as an event callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const send = async (operations: EditorOperation[], baseRevision = revisionRef.current) => {
    setSaveState("saving")
    setError(null)
    try {
      const response = await fetch("/api/editor/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseRevision, operations }),
      })
      const payload = await response.json().catch(() => null)
      const next = readState(payload)
      if (response.status === 409 && next) {
        setConflict({ operations, latest: next })
        setSaveState("conflict")
        return
      }
      if (!response.ok || !next) throw new Error(payload?.error || "Failed to save")
      applyServerState(next)
      setConflict(null)
      setSaveState("saved")
      const channel = new BroadcastChannel(CHANNEL_NAME)
      channel.postMessage({ revision: next.revision })
      channel.close()
      window.setTimeout(() => setSaveState("idle"), 1600)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save")
      setSaveState("error")
    }
  }

  const schedulePortfolio = (content: PortfolioContent) => {
    setState((previous) => (previous ? { ...previous, content } : previous))
    if (portfolioTimerRef.current) clearTimeout(portfolioTimerRef.current)
    portfolioTimerRef.current = setTimeout(() => {
      void send([{ type: "replace-portfolio", content }])
    }, 500)
  }

  const schedulePresets = (presets: CvPreset[], presetId: string) => {
    setState((previous) => (previous ? { ...previous, presets } : previous))
    if (presetsTimerRef.current) clearTimeout(presetsTimerRef.current)
    presetsTimerRef.current = setTimeout(() => {
      void send([{ type: "replace-presets", presets, activePresetId: presetId }])
    }, 500)
  }

  const activePreset = state?.presets.find((preset) => preset.id === activePresetId)
  const cvEntities = useMemo(() => {
    if (!activePreset) return []
    return activePreset.content.sections.flatMap((section) =>
      section.data.type === "log" && ["experience", "education", "projects"].includes(section.id)
        ? section.data.entries.map((entry) => ({ sectionId: section.id, entry }))
        : [],
    )
  }, [activePreset])

  if (!open) return null

  return (
    <div className="hub-drawer-layer">
      <button className="hub-drawer-backdrop" type="button" onClick={onClose} aria-label="Close content hub" />
      <aside className="hub-drawer" role="dialog" aria-modal="true" aria-labelledby="hub-drawer-title">
        <header className="hub-drawer__header">
          <div>
            <span className="hub-drawer__eyebrow"><Database size={14} /> Atlas source of truth</span>
            <h2 id="hub-drawer-title">Content Hub</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="hub-icon-btn" aria-label="Close content hub">
            <X size={20} />
          </button>
        </header>

        <div className={`hub-save-state hub-save-state--${saveState}`} aria-live="polite">
          {saveState === "saving" && <><Loader2 size={14} className="animate-spin" /> Saving to Atlas…</>}
          {saveState === "saved" && <><Check size={14} /> Saved at revision {state?.revision}</>}
          {saveState === "conflict" && <>Another editor saved first. Choose which version to keep.</>}
          {saveState === "error" && <>{error || "Save failed"}</>}
          {saveState === "idle" && state && <>Atlas revision {state.revision}</>}
        </div>

        {conflict && (
          <div className="hub-conflict" role="alert">
            <p>Your local change is safe. Resolve the conflict explicitly.</p>
            <div>
              <button type="button" onClick={() => void send(conflict.operations, conflict.latest.revision)}>Keep mine</button>
              <button type="button" onClick={() => { applyServerState(conflict.latest); setConflict(null); setSaveState("idle") }}>Use Atlas version</button>
            </div>
          </div>
        )}

        {!state && !error && <div className="hub-loading"><Loader2 className="animate-spin" /> Loading canonical content…</div>}
        {!state && error && <div className="hub-loading"><p>{error}</p><button type="button" onClick={() => void load()}>Retry</button></div>}

        {state && (
          <div className="hub-drawer__body">
            <section className="hub-section">
              <div className="hub-section__heading"><span>01</span><h3>Public identity</h3></div>
              <div className="hub-field-grid">
                {([
                  ["name", "Name"],
                  ["title", "Title / role"],
                  ["bio", "Shared profile"],
                  ["publicBio", "Showcase biography"],
                ] as const).map(([field, label]) => (
                  <label className={field.includes("Bio") || field === "bio" ? "hub-field hub-field--wide" : "hub-field"} key={field}>
                    <span>{label}</span>
                    {field.includes("Bio") || field === "bio" ? (
                      <textarea value={state.content.profileData[field] ?? ""} rows={4} onChange={(event) => schedulePortfolio({ ...state.content, profileData: { ...state.content.profileData, [field]: event.target.value } })} />
                    ) : (
                      <input value={state.content.profileData[field] ?? ""} onChange={(event) => schedulePortfolio({ ...state.content, profileData: { ...state.content.profileData, [field]: event.target.value } })} />
                    )}
                  </label>
                ))}
              </div>
            </section>

            <section className="hub-section">
              <div className="hub-section__heading"><span>02</span><h3>Contact and links</h3></div>
              <div className="hub-field-grid">
                {(["location", "email", "phone", "piva"] as const).map((field) => (
                  <label className="hub-field" key={field}>
                    <span>{field === "piva" ? "P.IVA" : field}</span>
                    <input value={state.content.contactData[field]} onChange={(event) => schedulePortfolio({ ...state.content, contactData: { ...state.content.contactData, [field]: event.target.value } })} />
                  </label>
                ))}
              </div>
              <div className="hub-list-editor">
                {state.content.contactData.links.map((link, index) => (
                  <div className="hub-link-row" key={link.id || index}>
                    <input aria-label={`Link ${index + 1} label`} value={link.label} onChange={(event) => schedulePortfolio({ ...state.content, contactData: { ...state.content.contactData, links: state.content.contactData.links.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) } })} />
                    <input aria-label={`Link ${index + 1} URL`} value={link.url} onChange={(event) => schedulePortfolio({ ...state.content, contactData: { ...state.content.contactData, links: state.content.contactData.links.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) } })} />
                    <button type="button" aria-label={`Delete ${link.label}`} onClick={() => schedulePortfolio({ ...state.content, contactData: { ...state.content.contactData, links: state.content.contactData.links.filter((_, itemIndex) => itemIndex !== index) } })}><Trash2 size={15} /></button>
                  </div>
                ))}
                <button type="button" className="hub-add-btn" onClick={() => schedulePortfolio({ ...state.content, contactData: { ...state.content.contactData, links: [...state.content.contactData.links, { id: `link-${Date.now()}`, label: "New link", url: "" }] } })}><Plus size={15} /> Add link</button>
              </div>
            </section>

            <section className="hub-section">
              <div className="hub-section__heading"><span>03</span><h3>Visibility matrix</h3></div>
              <p className="hub-section__intro">Every item is canonical. These switches only decide where it is published.</p>
              <div className="hub-visibility">
                {[...state.content.experienceLog.map((entity) => ({ type: "experience" as const, id: entity.id || "", label: `${entity.title} — ${entity.company}`, showcase: entity.showcaseVisible !== false })), ...state.content.educationLog.map((entity) => ({ type: "education" as const, id: entity.id || "", label: `${entity.degree} — ${entity.institution}`, showcase: entity.showcaseVisible !== false })), ...state.content.projectCategories.flatMap((category) => category.projects.map((entity) => ({ type: "project" as const, id: entity.id || "", label: `${entity.title} — ${category.name}`, showcase: entity.showcaseVisible !== false })))]
                  .map((entity) => {
                    const selectedPresets = state.presets.filter((preset) => preset.content.sections.some((section) => section.id === (entity.type === "project" ? "projects" : entity.type) && section.data.type === "log" && section.data.entries.some((entry) => entry.id === entity.id))).map((preset) => preset.id)
                    const updateVisibility = (showcase: boolean, presetIds: string[]) => void send([{ type: "set-visibility", target: { entityType: entity.type, entityId: entity.id, showcase, presetIds } }])
                    return (
                      <div className="hub-visibility-row" key={`${entity.type}-${entity.id}`}>
                        <strong>{entity.label}</strong>
                        <label><input type="checkbox" checked={entity.showcase} onChange={(event) => updateVisibility(event.target.checked, selectedPresets)} /> Showcase</label>
                        {state.presets.map((preset) => (
                          <label key={preset.id}><input type="checkbox" checked={selectedPresets.includes(preset.id)} onChange={(event) => updateVisibility(entity.showcase, event.target.checked ? [...selectedPresets, preset.id] : selectedPresets.filter((id) => id !== preset.id))} /> {preset.name}</label>
                        ))}
                        <button type="button" className="hub-delete-global" onClick={() => { if (window.confirm(`Delete ${entity.label} everywhere? This removes it from the showcase and every CV preset.`)) void send([{ type: "delete-entity", entityType: entity.type, entityId: entity.id }]) }}><Trash2 size={14} /> Delete everywhere</button>
                      </div>
                    )
                  })}
              </div>
            </section>

            <section className="hub-section">
              <div className="hub-section__heading"><span>04</span><h3>Preset CV wording</h3></div>
              <label className="hub-field">
                <span>Preset</span>
                <select value={activePresetId} onChange={(event) => setActivePresetId(event.target.value)}>
                  {state.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                </select>
              </label>
              <div className="hub-wording-list">
                {cvEntities.map(({ sectionId, entry }) => (
                  <label className="hub-field" key={`${sectionId}-${entry.id}`}>
                    <span>{entry.title} <small>{sectionId}</small></span>
                    <textarea rows={3} value={entry.description} onChange={(event) => {
                      const presets = state.presets.map((preset) => preset.id !== activePresetId ? preset : { ...preset, content: { ...preset.content, sections: preset.content.sections.map((section) => section.id !== sectionId || section.data.type !== "log" ? section : { ...section, data: { type: "log" as const, entries: section.data.entries.map((item) => item.id === entry.id ? { ...item, description: event.target.value } : item) } }) } })
                      schedulePresets(presets, activePresetId)
                    }} />
                  </label>
                ))}
              </div>
            </section>

            {activePreset && activePreset.content.sections.some((section) => !boundSectionIds.has(section.id)) && (
              <section className="hub-section">
                <div className="hub-section__heading"><span>05</span><h3>Shared CV extras</h3></div>
                {activePreset.content.sections.filter((section) => !boundSectionIds.has(section.id)).map((section) => (
                  <label className="hub-field" key={section.id}>
                    <span>{section.title}</span>
                    <textarea rows={4} value={section.data.type === "simple-list" ? section.data.items.join("\n") : section.data.type === "text" ? section.data.content : JSON.stringify(section.data, null, 2)} onChange={(event) => {
                      const nextData = section.data.type === "simple-list" ? { type: "simple-list" as const, items: event.target.value.split("\n") } : section.data.type === "text" ? { type: "text" as const, content: event.target.value } : section.data
                      const presets = state.presets.map((preset) => preset.id !== activePresetId ? preset : { ...preset, content: { ...preset.content, sections: preset.content.sections.map((item) => item.id === section.id ? { ...item, data: nextData } : item) } })
                      schedulePresets(presets, activePresetId)
                    }} />
                  </label>
                ))}
              </section>
            )}
          </div>
        )}
      </aside>
      <style jsx>{`
        .hub-drawer-layer { position: fixed; inset: 0; z-index: 10000; }
        .hub-drawer-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: rgba(3, 7, 18, .72); backdrop-filter: blur(8px); }
        .hub-drawer { position: absolute; inset: 0 0 0 auto; width: min(760px, 94vw); overflow: auto; background: #f6f2e9; color: #111827; box-shadow: -24px 0 70px rgba(0,0,0,.32); font-family: var(--font-open-sans), system-ui, sans-serif; }
        .hub-drawer__header { position: sticky; top: 0; z-index: 4; display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 24px 28px; color: #f8fafc; background: #111827; border-bottom: 1px solid rgba(255,255,255,.16); }
        .hub-drawer__header h2 { margin: 5px 0 0; font-size: clamp(28px, 4vw, 46px); line-height: .95; letter-spacing: -.04em; }
        .hub-drawer__eyebrow { display: flex; align-items: center; gap: 7px; color: #cbd5e1; text-transform: uppercase; letter-spacing: .13em; font-size: 11px; }
        .hub-icon-btn { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid #64748b; background: transparent; color: white; cursor: pointer; }
        .hub-save-state { position: sticky; top: 93px; z-index: 3; min-height: 38px; display: flex; align-items: center; gap: 8px; padding: 9px 28px; background: #e2e8f0; border-bottom: 1px solid #cbd5e1; font-size: 12px; font-weight: 700; }
        .hub-save-state--saved { color: #166534; background: #dcfce7; }
        .hub-save-state--conflict, .hub-save-state--error { color: #991b1b; background: #fee2e2; }
        .hub-conflict { margin: 20px 28px 0; padding: 16px; border: 1px solid #ef4444; background: #fff1f2; }
        .hub-conflict p { margin: 0 0 12px; }
        .hub-conflict div { display: flex; gap: 8px; }
        .hub-conflict button, .hub-loading button { min-height: 44px; padding: 0 14px; border: 1px solid #111827; background: #111827; color: white; }
        .hub-loading { min-height: 50vh; display: grid; place-items: center; align-content: center; gap: 14px; }
        .hub-drawer__body { padding: 8px 28px 48px; }
        .hub-section { padding: 28px 0; border-bottom: 1px solid #cbd5e1; }
        .hub-section__heading { display: flex; gap: 12px; align-items: baseline; margin-bottom: 18px; }
        .hub-section__heading span { font: 700 11px ui-monospace, monospace; color: #64748b; }
        .hub-section__heading h3 { margin: 0; font-size: 22px; letter-spacing: -.025em; }
        .hub-section__intro { margin: -8px 0 18px; color: #475569; font-size: 13px; }
        .hub-field-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
        .hub-field { display: grid; gap: 7px; margin-bottom: 12px; }
        .hub-field--wide { grid-column: 1 / -1; }
        .hub-field span { font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .hub-field small { color: #64748b; }
        .hub-field input, .hub-field textarea, .hub-field select, .hub-link-row input { width: 100%; min-height: 44px; border: 1px solid #94a3b8; border-radius: 0; background: #fff; color: #0f172a; padding: 10px 12px; font: inherit; }
        .hub-field textarea { resize: vertical; }
        input:focus-visible, textarea:focus-visible, select:focus-visible, button:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
        .hub-list-editor, .hub-wording-list, .hub-visibility { display: grid; gap: 10px; }
        .hub-link-row { display: grid; grid-template-columns: .65fr 1.35fr 44px; gap: 8px; }
        .hub-link-row button { min-width: 44px; border: 1px solid #ef4444; background: #fff; color: #b91c1c; }
        .hub-add-btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px dashed #64748b; background: transparent; }
        .hub-visibility-row { display: grid; grid-template-columns: minmax(180px,1fr) repeat(3, auto); align-items: center; gap: 10px; padding: 13px; background: #fff; border: 1px solid #cbd5e1; }
        .hub-visibility-row strong { font-size: 13px; }
        .hub-visibility-row label { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
        .hub-visibility-row input { width: 18px; height: 18px; }
        .hub-delete-global { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 0; background: transparent; color: #b91c1c; font-size: 11px; }
        @media (max-width: 680px) {
          .hub-drawer { width: 100%; }
          .hub-drawer__header { padding: 20px; }
          .hub-save-state { top: 86px; padding-inline: 20px; }
          .hub-drawer__body { padding-inline: 20px; }
          .hub-field-grid { grid-template-columns: 1fr; }
          .hub-field--wide { grid-column: auto; }
          .hub-link-row { grid-template-columns: 1fr 44px; }
          .hub-link-row input:nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
          .hub-visibility-row { grid-template-columns: 1fr 1fr; }
          .hub-visibility-row strong, .hub-delete-global { grid-column: 1 / -1; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .hub-drawer { animation: hub-in .24s ease-out; }
          @keyframes hub-in { from { transform: translateX(32px); opacity: .7; } }
        }
      `}</style>
    </div>
  )
}

export const CONTENT_HUB_CHANNEL = CHANNEL_NAME
