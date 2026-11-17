"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react"
import { ArrowDown, ArrowUp, EyeOff, GripVertical, ListPlus } from "lucide-react"

import { splitList, type CvPath } from "@/lib/cv-tailor"
import { domToMarks, marksToHtml, parseMarks } from "@/lib/cv-inline-marks"

/**
 * Optional inline-editing hooks for the CV layouts. Without a provider every
 * component here renders plain text (or nothing), so public pages are unchanged.
 */
export interface CvEditApi {
  set(path: CvPath, value: unknown): void
  /** Swap two items of the array at `listPath`. */
  swap(listPath: CvPath, a: number, b: number): void
  /** Move the item at `from` so it ends up at index `to` of the array at `listPath`. */
  move(listPath: CvPath, from: number, to: number): void
  /** Insert an empty bullet into the items array at `itemsPath` and focus it. */
  insertBullet(itemsPath: CvPath, index: number): void
  removeBullet(itemsPath: CvPath, index: number): void
  hideEntry(sectionIndex: number, entryIndex: number): void
  hideSection(sectionIndex: number): void
  addBullet(sectionIndex: number, entryIndex: number): void
  focusKey: string | null
  clearFocus(): void
  /** Paths this provider cannot write back render as plain text. Defaults to all editable. */
  canEdit?(path: CvPath): boolean
}

const CvEditContext = createContext<CvEditApi | null>(null)

export function CvEditProvider({ api, children }: { api: CvEditApi; children: ReactNode }) {
  return <CvEditContext.Provider value={api}>{children}</CvEditContext.Provider>
}

export const pathKey = (path: CvPath) => path.join(".")

/** `rich` and `rich-bullet` keep `**bold**` / `*italic*` marks; the rest are plain text. */
type EditableMode = "line" | "multiline" | "list" | "bullet" | "rich" | "rich-bullet"

const isRich = (mode: EditableMode) => mode === "rich" || mode === "rich-bullet"

/** True inside a `CvEditProvider`, for layouts that render differently while editing. */
export function useCvEditing(): boolean {
  return useContext(CvEditContext) !== null
}

/**
 * Toggle bold or italic on the current selection, when it sits inside a rich
 * editable field. Used by toolbar buttons (which must not steal focus).
 */
export function applyMark(kind: "bold" | "italic"): boolean {
  const anchor = window.getSelection()?.anchorNode
  const element = anchor && (anchor.nodeType === 1 ? anchor as Element : anchor.parentElement)?.closest<HTMLElement>(".cv-editable[data-rich]")
  if (!element) return false
  document.execCommand(kind)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  return true
}

export function Editable({
  path,
  value,
  mode = "line",
  placeholder,
}: {
  path: CvPath
  value: string
  mode?: EditableMode
  placeholder?: string
}) {
  const api = useContext(CvEditContext)
  if (!api || api.canEdit?.(path) === false) return <>{isRich(mode) ? parseMarks(value) : value}</>
  return <EditableField api={api} path={path} value={value} mode={mode} placeholder={placeholder} />
}

function EditableField({ api, path, value, mode, placeholder }: {
  api: CvEditApi
  path: CvPath
  value: string
  mode: EditableMode
  placeholder?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const key = pathKey(path)
  // Children are fixed at mount (so SSR/hydration show real text); afterwards the
  // DOM is synced imperatively, so React never fights the user's caret.
  const [initialValue] = useState(value)
  // React 19 re-applies `dangerouslySetInnerHTML` whenever the object identity changes,
  // which would wipe the user's typing on every render. Create it exactly once.
  const [initialHtml] = useState(() => ({ __html: marksToHtml(value) }))

  const rich = isRich(mode)
  // The DOM owns the text while focused; otherwise mirror the committed value.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || document.activeElement === element) return
    if (rich) { if (domToMarks(element) !== value) element.innerHTML = marksToHtml(value) }
    else if (element.textContent !== value) element.textContent = value
  }, [value, rich])

  useEffect(() => {
    const element = ref.current
    if (!element || api.focusKey !== key) return
    element.focus()
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)
    api.clearFocus()
  }, [api, key])

  const read = () => {
    const raw = rich ? (ref.current ? domToMarks(ref.current) : "") : ref.current?.innerText ?? ""
    return mode === "multiline" || mode === "rich" ? raw.replace(/\n{3,}/g, "\n\n").trim() : raw.replace(/\s*\n\s*/g, " ").trim()
  }

  const commit = () => {
    const next = read()
    if (mode === "list") {
      const items = splitList(next)
      if (items.join(", ") !== value) api.set(path, items)
    } else if (next !== value) {
      api.set(path, next)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (rich && (event.metaKey || event.ctrlKey) && !event.altKey && (event.key === "b" || event.key === "i")) {
      event.preventDefault()
      document.execCommand(event.key === "b" ? "bold" : "italic")
      commit()
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      if (ref.current) { if (rich) ref.current.innerHTML = marksToHtml(value); else ref.current.textContent = value }
      ref.current?.blur()
      return
    }
    const bullet = mode === "bullet" || mode === "rich-bullet"
    if (bullet && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      commit()
      api.insertBullet(path.slice(0, -1), (path[path.length - 1] as number) + 1)
      return
    }
    if (bullet && event.key === "Backspace" && read() === "") {
      event.preventDefault()
      api.removeBullet(path.slice(0, -1), path[path.length - 1] as number)
      return
    }
    if (mode !== "multiline" && mode !== "rich" && event.key === "Enter") {
      event.preventDefault()
      ref.current?.blur()
    }
  }

  return (
    <span
      ref={ref}
      className="cv-editable"
      contentEditable={rich ? "true" : "plaintext-only"}
      suppressContentEditableWarning
      data-rich={rich ? "true" : undefined}
      role="textbox"
      aria-multiline={mode === "multiline" || mode === "rich"}
      aria-label={placeholder ?? "Edit text"}
      data-placeholder={placeholder ?? "Type here"}
      data-cv-path={key}
      spellCheck
      onInput={mode === "list" ? undefined : commit}
      onBlur={() => {
        commit()
        const element = ref.current
        if (element && mode === "list") element.textContent = splitList(read()).join(", ")
      }}
      onKeyDown={onKeyDown}
      onPaste={rich ? (event) => {
        // Formatting from other apps never reaches the CV: paste as plain text.
        event.preventDefault()
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain"))
      } : undefined}
      dangerouslySetInnerHTML={rich ? initialHtml : undefined}
    >
      {rich ? undefined : initialValue}
    </span>
  )
}

/** The entry being dragged. Only one drag exists at a time, so this can live outside React. */
let draggedEntry: { section: number; index: number } | null = null

/**
 * Props that make a CV entry a drop target for entries of the same section.
 * `entryIndex` is the position in the section's full entry list (hidden ones included).
 */
export function useEntryDropTarget(sectionIndex: number, entryIndex: number) {
  const api = useContext(CvEditContext)
  const [drop, setDrop] = useState<"before" | "after" | null>(null)
  if (!api) return {}
  const accepts = () => draggedEntry !== null && draggedEntry.section === sectionIndex
  return {
    "data-drop": drop ?? undefined,
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!accepts()) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      const rect = event.currentTarget.getBoundingClientRect()
      const next = event.clientY < rect.top + rect.height / 2 ? "before" : "after"
      if (next !== drop) setDrop(next)
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null)
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!accepts() || !draggedEntry) return
      event.preventDefault()
      const from = draggedEntry.index
      const slot = drop === "after" ? entryIndex + 1 : entryIndex
      draggedEntry = null
      setDrop(null)
      const to = slot > from ? slot - 1 : slot
      if (to !== from) api.move(["sections", sectionIndex, "content", "entries"], from, to)
    },
  }
}

export function EntryControls({ sectionIndex, entryIndex, prevIndex, nextIndex }: { sectionIndex: number; entryIndex: number; prevIndex?: number; nextIndex?: number }) {
  const api = useContext(CvEditContext)
  if (!api) return null
  const list = ["sections", sectionIndex, "content", "entries"]
  return (
    <span className="cv-edit-controls cv-edit-controls--entry" role="toolbar" aria-label="Entry actions">
      <span
        className="cv-edit-controls__grip"
        title="Drag to reorder"
        aria-hidden="true"
        draggable
        onDragStart={(event) => {
          const entry = event.currentTarget.closest<HTMLElement>(".region-entry")
          draggedEntry = { section: sectionIndex, index: entryIndex }
          event.dataTransfer.effectAllowed = "move"
          event.dataTransfer.setData("text/plain", "cv-entry")
          if (entry) {
            event.dataTransfer.setDragImage(entry, 16, 16)
            entry.dataset.dragging = ""
          }
        }}
        onDragEnd={(event) => {
          draggedEntry = null
          event.currentTarget.closest<HTMLElement>(".region-entry")?.removeAttribute("data-dragging")
        }}
      ><GripVertical size={14} /></span>
      <button type="button" title="Move entry up" aria-label="Move entry up" disabled={prevIndex === undefined} onClick={() => prevIndex !== undefined && api.swap(list, entryIndex, prevIndex)}><ArrowUp size={12} /></button>
      <button type="button" title="Move entry down" aria-label="Move entry down" disabled={nextIndex === undefined} onClick={() => nextIndex !== undefined && api.swap(list, entryIndex, nextIndex)}><ArrowDown size={12} /></button>
      <button type="button" title="Add bullet" aria-label="Add bullet" onClick={() => api.addBullet(sectionIndex, entryIndex)}><ListPlus size={12} /></button>
      <button type="button" title="Hide entry (restore from the outline)" aria-label="Hide entry" onClick={() => api.hideEntry(sectionIndex, entryIndex)}><EyeOff size={12} /></button>
    </span>
  )
}

export function SectionControls({ sectionIndex, prevIndex, nextIndex }: { sectionIndex: number; prevIndex?: number; nextIndex?: number }) {
  const api = useContext(CvEditContext)
  if (!api) return null
  return (
    <span className="cv-edit-controls cv-edit-controls--section" role="toolbar" aria-label="Section actions">
      <button type="button" title="Move section up" aria-label="Move section up" disabled={prevIndex === undefined} onClick={() => prevIndex !== undefined && api.swap(["sections"], sectionIndex, prevIndex)}><ArrowUp size={12} /></button>
      <button type="button" title="Move section down" aria-label="Move section down" disabled={nextIndex === undefined} onClick={() => nextIndex !== undefined && api.swap(["sections"], sectionIndex, nextIndex)}><ArrowDown size={12} /></button>
      <button type="button" title="Hide section (restore from the outline)" aria-label="Hide section" onClick={() => api.hideSection(sectionIndex)}><EyeOff size={12} /></button>
    </span>
  )
}
