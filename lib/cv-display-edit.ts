import type { CvData, CvDescriptionBlock } from "@/components/cv/cv-types"
import type { CvSection } from "@/lib/cv-content"
import type { CvPreset } from "@/lib/cv-presets"
import { getAtPath, setAtPath, type CvPath } from "@/lib/cv-tailor"
import { parseCvDescription, serializeCvDescription } from "@/lib/cv-data-transform"

/**
 * Inline edits on the page arrive as paths into the rendered `CvData`. These map
 * them back to the source `CvPreset`. Sections resolve by id, so hidden sections
 * (absent from `CvData`) can never misroute an edit. Unresolvable paths return
 * the preset unchanged, by reference.
 */

const LOG_FIELDS = new Set(["title", "subtitle", "dateStart", "dateEnd", "tags"])

function updateSection(preset: CvPreset, id: string, update: (section: CvSection) => CvSection | null): CvPreset {
  const index = preset.content.sections.findIndex((section) => section.id === id)
  if (index < 0) return preset
  const next = update(preset.content.sections[index])
  if (!next) return preset
  const sections = [...preset.content.sections]
  sections[index] = next
  return { ...preset, content: { ...preset.content, sections } }
}

/** Rewrite one entry's description through its parsed blocks. */
function updateDescription(preset: CvPreset, sectionId: string, entryIndex: number, update: (blocks: CvDescriptionBlock[]) => CvDescriptionBlock[] | null): CvPreset {
  return updateSection(preset, sectionId, (section) => {
    if (section.data.type !== "log") return null
    const entry = section.data.entries[entryIndex]
    if (!entry) return null
    const blocks = update(parseCvDescription(entry.description))
    if (!blocks) return null
    const entries = [...section.data.entries]
    entries[entryIndex] = { ...entry, description: serializeCvDescription(blocks) }
    return { ...section, data: { ...section.data, entries } }
  })
}

/** Paths shown on the page that cannot be written back (a date range is two fields). */
export function isDisplayPathEditable(path: CvPath): boolean {
  return path[path.length - 1] !== "dates"
}

export function applyDisplayEdit(preset: CvPreset, data: CvData, path: CvPath, value: unknown): CvPreset {
  const [head, sectionIndex, ...rest] = path
  if (path.length === 1 && head === "name") return { ...preset, content: { ...preset.content, name: String(value) } }
  if (path.length === 1 && head === "title") {
    return preset.targetRoleOverride?.trim()
      ? { ...preset, targetRoleOverride: String(value) }
      : { ...preset, content: { ...preset.content, title: String(value) } }
  }
  if (path.length === 1 && head === "targetRoleOverride") return { ...preset, targetRoleOverride: String(value) }
  if (path.length === 1 && head === "summaryOverride") return { ...preset, summaryOverride: String(value) }
  if (path.length === 1 && (head === "location" || head === "email" || head === "phone")) {
    return { ...preset, content: { ...preset.content, [head]: String(value) } }
  }
  if (path.length === 2 && head === "design" && sectionIndex === "locationLabel") {
    return { ...preset, design: { ...preset.design, locationLabel: String(value) } }
  }
  if (path.length === 2 && head === "regionalOptions" && sectionIndex === "customFooter") {
    return { ...preset, regionalOptions: { ...preset.regionalOptions, customFooter: String(value) } }
  }
  if (head !== "sections" || typeof sectionIndex !== "number") return preset
  const id = data.sections[sectionIndex]?.id
  if (!id) return preset

  if (rest.length === 1 && rest[0] === "title") {
    return updateSection(preset, id, (section) => ({ ...section, title: String(value), titleMode: "custom" }))
  }
  if (rest[0] !== "content") return preset
  const [, kind, index, field, ...deeper] = rest

  if (kind === "entries" && typeof index === "number") {
    if (field === "description") {
      return updateDescription(preset, id, index, (blocks) => getAtPath(blocks, deeper.slice(0, -1)) === undefined ? null : setAtPath(blocks, deeper, value))
    }
    if (deeper.length > 0 || typeof field !== "string" || !LOG_FIELDS.has(field)) return preset
    return updateSection(preset, id, (section) => {
      if (section.data.type !== "log" || !section.data.entries[index]) return null
      const entries = [...section.data.entries]
      entries[index] = { ...entries[index], [field]: value }
      return { ...section, data: { ...section.data, entries } }
    })
  }
  if (kind === "text" && rest.length === 2) {
    return updateSection(preset, id, (section) => section.data.type === "text" ? { ...section, data: { ...section.data, content: String(value) } } : null)
  }
  if (kind === "groups" && typeof index === "number" && (field === "category" || field === "items") && deeper.length === 0) {
    return updateSection(preset, id, (section) => {
      if (section.data.type !== "tags" || !section.data.groups[index]) return null
      const groups = [...section.data.groups]
      groups[index] = { ...groups[index], [field]: value }
      return { ...section, data: { ...section.data, groups } }
    })
  }
  if (kind === "items" && typeof index === "number" && field === "label" && deeper.length === 0) {
    return updateSection(preset, id, (section) => {
      if (section.data.type !== "links" || !section.data.items[index]) return null
      const items = [...section.data.items]
      items[index] = { ...items[index], label: String(value) }
      return { ...section, data: { ...section.data, items } }
    })
  }
  if (kind === "items" && typeof index === "number" && field === undefined) {
    return updateSection(preset, id, (section) => {
      if (section.data.type !== "simple-list" || index >= section.data.items.length) return null
      const items = [...section.data.items]
      items[index] = String(value)
      return { ...section, data: { ...section.data, items } }
    })
  }
  return preset
}

/** `itemsPath` points at a bullets block's `items` inside an entry description. */
function bulletTarget(data: CvData, itemsPath: CvPath) {
  const [head, sectionIndex, content, entries, entryIndex, description, blockIndex, items] = itemsPath
  if (itemsPath.length !== 8 || head !== "sections" || content !== "content" || entries !== "entries" || description !== "description" || items !== "items") return null
  if (typeof sectionIndex !== "number" || typeof entryIndex !== "number" || typeof blockIndex !== "number") return null
  const id = data.sections[sectionIndex]?.id
  return id ? { id, entryIndex, blockIndex } : null
}

function updateBullets(preset: CvPreset, data: CvData, itemsPath: CvPath, update: (items: string[]) => string[] | null): CvPreset {
  const target = bulletTarget(data, itemsPath)
  if (!target) return preset
  return updateDescription(preset, target.id, target.entryIndex, (blocks) => {
    const block = blocks[target.blockIndex]
    if (block?.type !== "bullets") return null
    const items = update([...block.items])
    if (!items) return null
    const next = [...blocks]
    if (items.length) next[target.blockIndex] = { ...block, items }
    else next.splice(target.blockIndex, 1)
    return next
  })
}

export function insertDisplayBullet(preset: CvPreset, data: CvData, itemsPath: CvPath, index: number): CvPreset {
  return updateBullets(preset, data, itemsPath, (items) => {
    if (index < 0 || index > items.length) return null
    items.splice(index, 0, "")
    return items
  })
}

export function removeDisplayBullet(preset: CvPreset, data: CvData, itemsPath: CvPath, index: number): CvPreset {
  return updateBullets(preset, data, itemsPath, (items) => {
    if (index < 0 || index >= items.length) return null
    items.splice(index, 1)
    return items
  })
}
