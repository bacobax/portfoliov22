"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { ArrowDown, ArrowUp, EyeOff, ListPlus } from "lucide-react"

import { splitList, type CvPath } from "@/lib/cv-tailor"

/**
 * Optional inline-editing hooks for the CV layouts. Without a provider every
 * component here renders plain text (or nothing), so public pages are unchanged.
 */
export interface CvEditApi {
  set(path: CvPath, value: unknown): void
  /** Swap two items of the array at `listPath`. */
  swap(listPath: CvPath, a: number, b: number): void
  /** Insert an empty bullet into the items array at `itemsPath` and focus it. */
  insertBullet(itemsPath: CvPath, index: number): void
  removeBullet(itemsPath: CvPath, index: number): void
  hideEntry(sectionIndex: number, entryIndex: number): void
  hideSection(sectionIndex: number): void
  addBullet(sectionIndex: number, entryIndex: number): void
  focusKey: string | null
  clearFocus(): void
}

const CvEditContext = createContext<CvEditApi | null>(null)

export function CvEditProvider({ api, children }: { api: CvEditApi; children: ReactNode }) {
  return <CvEditContext.Provider value={api}>{children}</CvEditContext.Provider>
}

export const pathKey = (path: CvPath) => path.join(".")

type EditableMode = "line" | "multiline" | "list" | "bullet"

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
  if (!api) return <>{value}</>
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

  // The DOM owns the text while focused; otherwise mirror the committed value.
  useLayoutEffect(() => {
    const element = ref.current
    if (element && document.activeElement !== element && element.textContent !== value) element.textContent = value
  }, [value])

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
    const raw = ref.current?.innerText ?? ""
    return mode === "multiline" ? raw.replace(/\n{3,}/g, "\n\n").trim() : raw.replace(/\s*\n\s*/g, " ").trim()
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
    if (event.key === "Escape") {
      event.preventDefault()
      if (ref.current) ref.current.textContent = value
      ref.current?.blur()
      return
    }
    if (mode === "bullet" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      commit()
      api.insertBullet(path.slice(0, -1), (path[path.length - 1] as number) + 1)
      return
    }
    if (mode === "bullet" && event.key === "Backspace" && read() === "") {
      event.preventDefault()
      api.removeBullet(path.slice(0, -1), path[path.length - 1] as number)
      return
    }
    if (mode !== "multiline" && event.key === "Enter") {
      event.preventDefault()
      ref.current?.blur()
    }
  }

  return (
    <span
      ref={ref}
      className="cv-editable"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={mode === "multiline"}
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
    >
      {initialValue}
    </span>
  )
}

export function EntryControls({ sectionIndex, entryIndex, prevIndex, nextIndex }: { sectionIndex: number; entryIndex: number; prevIndex?: number; nextIndex?: number }) {
  const api = useContext(CvEditContext)
  if (!api) return null
  const list = ["sections", sectionIndex, "content", "entries"]
  return (
    <span className="cv-edit-controls cv-edit-controls--entry" role="toolbar" aria-label="Entry actions">
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
