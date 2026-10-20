"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { StaticImageData } from "next/image"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2, RotateCcw } from "lucide-react"

import { AtsPrintCvLayout } from "./ats-print-layout"
import { CvEditProvider, pathKey, type CvEditApi } from "./cv-edit-context"
import { CvPrintButton } from "./cv-print-button"
import { CvScaleToFit } from "./cv-scale-to-fit"
import { RegionalCvLayout } from "./regional-layout"
import { cvDesignSchema } from "@/lib/cv-document"
import {
  getAtPath,
  setAtPath,
  swapAtPath,
  tailoredPdfTitle,
  visibleTailoredData,
  type CvPath,
  type TailoredCv,
} from "@/lib/cv-tailor"
import type { CvDescriptionBlock } from "./cv-types"

export interface TailorSource {
  id: string
  name: string
  seed: TailoredCv
}

type SaveState = "idle" | "pending" | "saving" | "saved" | "error"

const SAVE_DELAY_MS = 700

export function CvTailorBuilder({
  initialDraft,
  sources,
  profilePicture,
}: {
  initialDraft: TailoredCv | null
  sources: TailorSource[]
  profilePicture: StaticImageData
}) {
  const [draft, setDraft] = useState<TailoredCv | null>(initialDraft ?? sources[0]?.seed ?? null)
  const [isStoredDraft, setIsStoredDraft] = useState(Boolean(initialDraft))
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(initialDraft?.updatedAt)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [resetSourceId, setResetSourceId] = useState(initialDraft?.sourcePresetId ?? sources[0]?.id ?? "")
  const [confirmReset, setConfirmReset] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<TailoredCv | null>(null)

  const flush = useCallback(async (keepalive = false) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const body = pendingRef.current
    pendingRef.current = null
    if (!body) return
    setSaveState("saving")
    try {
      const response = await fetch("/api/cv/tailor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, updatedAt: undefined }),
        keepalive,
      })
      const payload = await response.json().catch(() => null) as { updatedAt?: string; error?: string } | null
      if (!response.ok) throw new Error(payload?.error ?? `Save failed (${response.status})`)
      setUpdatedAt(payload?.updatedAt)
      setIsStoredDraft(true)
      setSaveState(pendingRef.current ? "pending" : "saved")
    } catch (error) {
      console.error(error)
      // Keep the unsaved body so the next edit (or retry) sends it again.
      pendingRef.current ??= body
      setSaveState("error")
    }
  }, [])

  const draftRef = useRef(draft)
  const update = useCallback((updater: (current: TailoredCv) => TailoredCv) => {
    const current = draftRef.current
    if (!current) return
    const next = updater(current)
    if (next === current) return
    draftRef.current = next
    setDraft(next)
    pendingRef.current = next
    setSaveState("pending")
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void flush(), SAVE_DELAY_MS)
  }, [flush])

  // Never lose the last keystrokes when the tab is closed or navigated away.
  useEffect(() => {
    const onHide = () => { if (pendingRef.current) void flush(true) }
    window.addEventListener("pagehide", onHide)
    return () => window.removeEventListener("pagehide", onHide)
  }, [flush])

  // The browser uses the document title as the suggested PDF filename.
  const pdfTitle = draft ? tailoredPdfTitle(draft) : "Curriculum Vitae"
  useEffect(() => {
    const previous = document.title
    document.title = pdfTitle
    return () => { document.title = previous }
  }, [pdfTitle])

  const setData = useCallback((path: CvPath, value: unknown) => {
    update((current) => ({ ...current, data: setAtPath(current.data, path, value) }))
  }, [update])

  const api = useMemo<CvEditApi>(() => ({
    set: setData,
    swap: (listPath, a, b) => update((current) => ({ ...current, data: swapAtPath(current.data, listPath, a, b) })),
    insertBullet: (itemsPath, index) => {
      update((current) => {
        const items = getAtPath(current.data, itemsPath)
        if (!Array.isArray(items)) return current
        return { ...current, data: setAtPath(current.data, itemsPath, [...items.slice(0, index), "", ...items.slice(index)]) }
      })
      setFocusKey(pathKey([...itemsPath, index]))
    },
    removeBullet: (itemsPath, index) => {
      let focusPrevious: string | null = null
      update((current) => {
        const items = getAtPath(current.data, itemsPath)
        if (!Array.isArray(items)) return current
        const remaining = items.filter((_, itemIndex) => itemIndex !== index)
        if (remaining.length > 0) {
          focusPrevious = pathKey([...itemsPath, Math.max(0, index - 1)])
          return { ...current, data: setAtPath(current.data, itemsPath, remaining) }
        }
        // Last bullet removed: drop the whole (now empty) bullet block.
        const blocksPath = itemsPath.slice(0, -2)
        const blockIndex = itemsPath[itemsPath.length - 2] as number
        const blocks = getAtPath(current.data, blocksPath) as CvDescriptionBlock[]
        return { ...current, data: setAtPath(current.data, blocksPath, blocks.filter((_, i) => i !== blockIndex)) }
      })
      if (focusPrevious) setFocusKey(focusPrevious)
    },
    addBullet: (sectionIndex, entryIndex) => {
      const blocksPath = ["sections", sectionIndex, "content", "entries", entryIndex, "description"]
      let focus: string | null = null
      update((current) => {
        const blocks = (getAtPath(current.data, blocksPath) as CvDescriptionBlock[] | undefined) ?? []
        const last = blocks.length - 1
        if (blocks[last]?.type === "bullets") {
          focus = pathKey([...blocksPath, last, "items", blocks[last].items.length])
          return { ...current, data: setAtPath(current.data, [...blocksPath, last, "items"], [...blocks[last].items, ""]) }
        }
        focus = pathKey([...blocksPath, blocks.length, "items", 0])
        return { ...current, data: setAtPath(current.data, blocksPath, [...blocks, { type: "bullets", items: [""] }]) }
      })
      setFocusKey(focus)
    },
    hideEntry: (sectionIndex, entryIndex) => setData(["sections", sectionIndex, "content", "entries", entryIndex, "hidden"], true),
    hideSection: (sectionIndex) => setData(["sections", sectionIndex, "visible"], false),
    focusKey,
    clearFocus: () => setFocusKey(null),
  }), [focusKey, setData, update])

  const resetFrom = (sourceId: string) => {
    const source = sources.find((item) => item.id === sourceId)
    if (!source) return
    update((current) => ({ ...source.seed, label: current.label }))
    setConfirmReset(false)
  }

  if (!draft) {
    return <main className="cv-tailor-empty"><p>No CV is available to start from. Create one in the CV editor first.</p></main>
  }

  const design = cvDesignSchema.parse(draft.data.design ?? {})
  const printData = visibleTailoredData(draft.data)
  const hiddenCount = draft.data.sections.reduce((count, section) => count + (section.visible ? 0 : 1)
    + (section.content.type === "log" ? section.content.entries.filter((entry) => entry.hidden).length : 0), 0)

  return (
    <div className="cv-tailor">
      <style>{tailorStyles}</style>
      <style>{`@page { size: ${design.page}; margin: ${Math.max(12, design.marginMm)}mm; }`}</style>

      <aside className="cv-tailor-panel" aria-label="Tailored CV controls">
        <div className="cv-tailor-panel__head">
          <Link href="/cv" className="cv-tailor-back"><ArrowLeft size={14} /> CVs</Link>
          <span className={`cv-tailor-status cv-tailor-status--${saveState}`} aria-live="polite">
            {saveState === "saving" && <><Loader2 size={12} className="animate-spin" /> Saving…</>}
            {saveState === "pending" && <>Unsaved changes</>}
            {saveState === "error" && <><AlertCircle size={12} /> Not saved, <button type="button" onClick={() => void flush()}>retry</button></>}
            {(saveState === "idle" || saveState === "saved") && (isStoredDraft
              ? <><Check size={12} /> Saved{updatedAt ? ` ${formatTime(updatedAt)}` : ""}</>
              : <>Not saved yet</>)}
          </span>
        </div>

        <div className="cv-tailor-panel__intro">
          <span>Private · only visible to you</span>
          <h1>CV builder</h1>
          <p>Click any text on the page to edit it. Hover an entry or heading to reorder or hide it. In a bullet, <kbd>Enter</kbd> adds the next one and <kbd>Backspace</kbd> on an empty bullet removes it.</p>
        </div>

        <label className="cv-tailor-field">
          <span>Applying for</span>
          <input
            value={draft.label}
            placeholder="e.g. Acme – Senior GenAI Engineer"
            maxLength={200}
            onChange={(event) => { const label = event.target.value; update((current) => ({ ...current, label })) }}
          />
          <small>Added to the PDF filename: <em>{pdfTitle}.pdf</em></small>
        </label>

        <div className="cv-tailor-download">
          <CvPrintButton className="cv-tailor-btn cv-tailor-btn--primary" />
        </div>

        <section className="cv-tailor-outline" aria-labelledby="cv-tailor-outline-title">
          <h2 id="cv-tailor-outline-title">Outline {hiddenCount > 0 && <small>{hiddenCount} hidden</small>}</h2>
          <ul>
            {draft.data.sections.map((section, sectionIndex) => (
              <li key={section.id} className={section.visible ? "" : "is-hidden"}>
                <VisibilityToggle
                  label={section.title || "Untitled section"}
                  visible={section.visible}
                  strong
                  onToggle={() => setData(["sections", sectionIndex, "visible"], !section.visible)}
                />
                {section.content.type === "log" && section.content.entries.length > 0 && (
                  <ul>
                    {section.content.entries.map((entry, entryIndex) => (
                      <li key={entryIndex} className={entry.hidden ? "is-hidden" : ""}>
                        <VisibilityToggle
                          label={entry.title || "Untitled entry"}
                          visible={!entry.hidden}
                          disabled={!section.visible}
                          onToggle={() => setData(["sections", sectionIndex, "content", "entries", entryIndex, "hidden"], !entry.hidden)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="cv-tailor-reset" aria-labelledby="cv-tailor-reset-title">
          <h2 id="cv-tailor-reset-title">Start over</h2>
          <p>Based on <strong>{draft.sourcePresetName}</strong>. Restarting replaces every edit with a fresh copy of the chosen CV.</p>
          <div className="cv-tailor-reset__row">
            <select value={resetSourceId} onChange={(event) => { setResetSourceId(event.target.value); setConfirmReset(false) }} aria-label="CV to start from">
              {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
            </select>
            {confirmReset ? (
              <>
                <button type="button" className="cv-tailor-btn cv-tailor-btn--danger" onClick={() => resetFrom(resetSourceId)}>Replace edits</button>
                <button type="button" className="cv-tailor-btn" onClick={() => setConfirmReset(false)}>Cancel</button>
              </>
            ) : (
              <button type="button" className="cv-tailor-btn" onClick={() => setConfirmReset(true)}><RotateCcw size={14} /> Restart</button>
            )}
          </div>
        </section>
      </aside>

      <main
        className="cv-tailor-canvas"
        onClickCapture={(event) => {
          // Links inside the document are editable text here, not navigation.
          if ((event.target as HTMLElement).closest(".regional-cv a")) event.preventDefault()
        }}
      >
        <CvScaleToFit page={design.page}>
          <CvEditProvider api={api}>
            <RegionalCvLayout layout={draft.layout} data={draft.data} profilePicture={profilePicture} />
          </CvEditProvider>
        </CvScaleToFit>
        <AtsPrintCvLayout data={printData} />
      </main>
    </div>
  )
}

function VisibilityToggle({ label, visible, onToggle, strong, disabled }: {
  label: string
  visible: boolean
  onToggle: () => void
  strong?: boolean
  disabled?: boolean
}) {
  return (
    <button type="button" className="cv-tailor-toggle" aria-pressed={visible} disabled={disabled} onClick={onToggle} title={visible ? "Hide from this CV" : "Show in this CV"}>
      {visible ? <Eye size={13} /> : <EyeOff size={13} />}
      <span className={strong ? "cv-tailor-toggle__strong" : undefined}>{label}</span>
    </button>
  )
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

const tailorStyles = `
  :root { color-scheme: light; }
  body { background: #e7edef; }
  @media (pointer: fine) { .cv-tailor, .cv-tailor * { cursor: auto !important; } .cv-tailor button, .cv-tailor a { cursor: pointer !important; } .cv-tailor .cv-editable { cursor: text !important; } }
  @media (pointer: coarse) { .tech-cursor { display: none !important; } }

  .cv-tailor { display: grid; grid-template-columns: 320px minmax(0, 1fr); min-height: 100vh; font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #122b35; }
  .cv-tailor-panel { position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; padding: 20px; background: #fff; border-right: 1px solid #d8e1e5; }
  .cv-tailor-panel__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .cv-tailor-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #122b35; text-decoration: none; padding: 6px 8px; margin-left: -8px; border-radius: 6px; }
  .cv-tailor-back:hover { background: #f1f5f6; }
  .cv-tailor-status { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #526574; }
  .cv-tailor-status--error { color: #b42318; }
  .cv-tailor-status button { color: inherit; text-decoration: underline; background: none; border: 0; padding: 0; font: inherit; }
  .cv-tailor-panel__intro span { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #0f766e; font-weight: 600; }
  .cv-tailor-panel__intro h1 { margin: 4px 0 8px; font-size: 22px; letter-spacing: -.03em; }
  .cv-tailor-panel__intro p { margin: 0; font-size: 13px; line-height: 1.55; color: #3d5160; }
  .cv-tailor kbd { font: 600 11px ui-monospace, SFMono-Regular, Menlo, monospace; padding: 1px 5px; border: 1px solid #d8e1e5; border-bottom-width: 2px; border-radius: 4px; background: #f8fafb; }
  .cv-tailor-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .cv-tailor-field > span { font-weight: 600; }
  .cv-tailor-field input, .cv-tailor-reset select { min-height: 40px; padding: 8px 10px; border: 1px solid #c9d5da; border-radius: 8px; font: inherit; color: inherit; background: #fff; min-width: 0; }
  .cv-tailor-field input:focus, .cv-tailor-reset select:focus { outline: 3px solid #99f6e4; border-color: #0d9488; }
  .cv-tailor-field small { font-size: 11.5px; color: #526574; overflow-wrap: anywhere; }
  .cv-tailor-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 8px 14px; border: 1px solid #c9d5da; border-radius: 8px; background: #fff; color: #122b35; font: 600 13px/1 inherit; font-family: inherit; }
  .cv-tailor-btn:hover:not(:disabled) { background: #f1f5f6; }
  .cv-tailor-btn:disabled { opacity: .6; }
  .cv-tailor-btn--primary { width: 100%; background: #122b35; border-color: #122b35; color: #fff; }
  .cv-tailor-btn--primary:hover:not(:disabled) { background: #1d3d4a; }
  .cv-tailor-btn--danger { background: #b42318; border-color: #b42318; color: #fff; }
  .cv-tailor-btn--danger:hover:not(:disabled) { background: #912018; }
  .cv-tailor button:focus-visible, .cv-tailor a:focus-visible { outline: 3px solid #0d9488; outline-offset: 2px; }
  .cv-tailor-download .cv-print-help { max-width: none; margin-top: 8px; }
  .cv-tailor-outline h2, .cv-tailor-reset h2 { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: #526574; }
  .cv-tailor-outline h2 small { text-transform: none; letter-spacing: 0; font-weight: 500; }
  .cv-tailor-outline ul { list-style: none; margin: 0; padding: 0; }
  .cv-tailor-outline ul ul { padding-left: 18px; margin: 2px 0 6px; }
  .cv-tailor-toggle { display: flex; align-items: center; gap: 8px; width: 100%; padding: 5px 6px; border: 0; border-radius: 6px; background: none; text-align: left; font: 13px/1.35 inherit; font-family: inherit; color: inherit; }
  .cv-tailor-toggle:hover:not(:disabled) { background: #f1f5f6; }
  .cv-tailor-toggle svg { flex-shrink: 0; color: #0f766e; }
  .cv-tailor-toggle span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cv-tailor-toggle__strong { font-weight: 600; }
  .cv-tailor-outline .is-hidden > .cv-tailor-toggle { color: #8a9aa5; }
  .cv-tailor-outline .is-hidden > .cv-tailor-toggle span { text-decoration: line-through; }
  .cv-tailor-outline .is-hidden > .cv-tailor-toggle svg { color: #8a9aa5; }
  .cv-tailor-toggle:disabled { opacity: .55; }
  .cv-tailor-reset { margin-top: auto; padding-top: 16px; border-top: 1px solid #e3eaed; }
  .cv-tailor-reset p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.5; color: #3d5160; }
  .cv-tailor-reset__row { display: flex; flex-wrap: wrap; gap: 8px; }
  .cv-tailor-reset__row select { flex: 1 1 140px; }
  .cv-tailor-canvas { padding: 32px 24px 64px 56px; min-width: 0; }
  .cv-tailor-empty { padding: 48px; text-align: center; color: #526574; }

  /* Inline editing affordances, screen only (the PDF uses the ATS layout). */
  .cv-tailor .cv-editable { outline: none; border-radius: 2px; transition: background-color .12s, box-shadow .12s; }
  .cv-tailor .cv-editable:hover { background: rgba(13, 148, 136, .08); box-shadow: 0 0 0 2px rgba(13, 148, 136, .08); }
  .cv-tailor .cv-editable:focus { background: rgba(13, 148, 136, .12); box-shadow: 0 0 0 2px rgba(13, 148, 136, .55); }
  .cv-tailor .cv-editable:empty::before { content: attr(data-placeholder); color: #9aa7b0; font-style: italic; }
  .cv-tailor .regional-cv li .cv-editable:empty { display: inline-block; min-width: 8em; }
  .cv-tailor .region-entry, .cv-tailor .region-section { position: relative; }
  .cv-edit-controls { position: absolute; z-index: 2; display: flex; gap: 2px; padding: 2px; border: 1px solid #c9d5da; border-radius: 7px; background: #fff; box-shadow: 0 4px 12px rgba(18, 43, 53, .12); opacity: 0; pointer-events: none; transition: opacity .12s; font-family: Arial, sans-serif; }
  .cv-edit-controls button { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 5px; background: none; color: #122b35; }
  .cv-edit-controls button:hover:not(:disabled) { background: #e6f4f2; color: #0f766e; }
  .cv-edit-controls button:disabled { opacity: .3; }
  .cv-edit-controls--entry { flex-direction: column; top: 0; right: calc(100% + 6px); }
  .cv-edit-controls--section { top: -4px; right: 0; }
  .region-entry:hover > .cv-edit-controls--entry, .region-entry:focus-within > .cv-edit-controls--entry,
  .region-section > h2:hover + .cv-edit-controls--section, .cv-edit-controls--section:hover, .region-section > h2:focus-within + .cv-edit-controls--section, .cv-edit-controls:focus-within { opacity: 1; pointer-events: auto; }
  @media (hover: none) { .cv-edit-controls { opacity: .85; pointer-events: auto; } }

  @media (max-width: 900px) {
    .cv-tailor { grid-template-columns: 1fr; }
    .cv-tailor-panel { position: static; height: auto; border-right: 0; border-bottom: 1px solid #d8e1e5; padding: 16px; }
    .cv-tailor-reset { margin-top: 0; }
    .cv-tailor-canvas { padding: 16px 8px 48px 36px; }
  }

  @media print {
    body { background: #fff; }
    .cv-tailor { display: block; }
    .cv-tailor-panel, .cv-edit-controls { display: none !important; }
    .cv-tailor-canvas { padding: 0; }
  }
`
