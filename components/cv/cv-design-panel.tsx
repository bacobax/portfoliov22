"use client"

import { useEffect, useId, useState } from "react"
import type { CvPreset } from "@/lib/cv-presets"
import { cvDesignSchema, professionalCvDesign, type CvDesign } from "@/lib/cv-document"
import { cvQualityNotes } from "@/lib/cv-quality"

function NumericControl({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void
}) {
  const id = useId()
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return <label className="cv-field" htmlFor={id}><span className="cv-field__label">{label}</span>
    <input id={id} className="cv-field__input" type="number" min={min} max={max} step={step} value={text}
      onChange={(event) => { setText(event.target.value); const n = Number(event.target.value); if (event.target.value && Number.isFinite(n) && n >= min && n <= max) onChange(n) }}
      onBlur={() => setText(String(value))} />
  </label>
}

export function CvDesignPanel({ preset, onChange }: { preset: CvPreset; onChange: (design: CvDesign) => void }) {
  const design = cvDesignSchema.parse(preset.design)
  const update = <K extends keyof CvDesign>(key: K, value: CvDesign[K]) => onChange({ ...design, [key]: value })
  const select = <K extends keyof CvDesign>(label: string, key: K, options: Array<[string, string]>) => <label className="cv-field"><span className="cv-field__label">{label}</span><select className="cv-field__input" value={String(design[key])} onChange={(event) => update(key, event.target.value as CvDesign[K])}>{options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
  const number = (label: string, key: keyof CvDesign, min: number, max: number, step = 1) => <NumericControl key={`${key}-${preset.id}`} label={label} value={Number(design[key])} min={min} max={max} step={step} onChange={(value) => update(key, value as CvDesign[typeof key])} />
  const toggle = (label: string, key: "showTaxId" | "showLocation" | "showProjectStatus") => <label className="cv-option-row"><input type="checkbox" checked={design[key]} onChange={(event) => update(key, event.target.checked)} /><span>{label}</span></label>
  return <section className="cv-design-panel" aria-label="Document design">
    <div className="cv-design-intro"><span>APPLICATION LAYOUT</span><h2>Let the content lead.</h2><p>One flowing document, readable type, and restrained spacing. Page boundaries follow the content.</p>
      <button type="button" className="cv-btn cv-btn--primary" onClick={() => onChange(professionalCvDesign(design))}>Apply professional defaults</button>
      <small>Single column · 10.5 pt · 16 mm margins · automatic page flow. Wording and photo visibility stay as authored.</small>
    </div>
    <fieldset><legend>Page & reading order</legend><div className="cv-design-fields">
      {select("Presentation", "appearance", [["professional", "Professional — minimal"], ["regional", "Regional styling"]])}
      {select("Paper size", "page", [["A4", "A4"], ["Letter", "US Letter"]])}
      {select("Content flow", "columns", [["single", "Single column — recommended"], ["sidebar", "Main column with sidebar"]])}
      {number("Margins on every page (mm)", "marginMm", 6, 30)}
      {design.columns === "sidebar" && <>{select("Sidebar side", "sidebarPosition", [["left", "Left"], ["right", "Right"]])}{number("Sidebar width (mm)", "sidebarWidthMm", 38, 80)}</>}
    </div><p>Single-column order follows Arrange sections. Two-column PDFs can have a less predictable extracted reading order.</p></fieldset>
    <fieldset><legend>Typography & rhythm</legend><div className="cv-design-fields">
      {select("Font family", "fontFamily", [["sans", "Arial — sans serif"], ["humanist", "Trebuchet — humanist"], ["serif", "Georgia — serif"]])}
      {number("Body text (pt) · recommended 10.5–11", "baseFontPt", 7, 13, .5)}
      {number("Line height", "lineHeight", 1.1, 1.9, .05)}
      {number("Between sections (mm)", "sectionGapMm", 1, 16)}
      {number("Between entries (mm)", "entryGapMm", 1, 12)}
      {select("Section headings", "headingStyle", [["divider", "Thin divider"], ["spacing", "Spacing only"]])}
      {select("Date alignment", "datePlacement", [["right", "Right of title"], ["left", "Narrow left column"], ["above", "Above title"]])}
      {(["accent", "ink", "muted"] as const).map((key) => <label className="cv-field" key={key}><span className="cv-field__label">{{ accent: "Accent color", ink: "Body text", muted: "Metadata" }[key]}</span><span className="cv-color-field"><input type="color" value={design[key]} onChange={(event) => update(key, event.target.value)} /><span>{design[key]}</span></span></label>)}
    </div></fieldset>
    <fieldset><legend>Identity & contact details</legend><div className="cv-design-fields">
      {number("Photo size (mm)", "photoSizeMm", 16, 32)}
      {select("Photo crop", "photoShape", [["square", "Square"], ["rounded", "Rounded"], ["circle", "Circle"]])}
      <label className="cv-field"><span className="cv-field__label">CV location label</span><input className="cv-field__input" maxLength={160} value={design.locationLabel} placeholder="City, country — optional override" onChange={(event) => update("locationLabel", event.target.value)} /></label>
    </div><p>Use city and country rather than a street address. Photo visibility is in CV setup; choose a neutral head-and-shoulders crop.</p>
    {toggle("Show location", "showLocation")}{toggle("Include tax ID / P.IVA", "showTaxId")}{toggle("Show project status in the date position", "showProjectStatus")}</fieldset>
    <details className="cv-manual-breaks"><summary>Advanced: manual page breaks</summary><p>Automatic flow keeps headings with content and lets long entries split. Add a break only after checking the PDF.</p>
      {preset.content.sections.map((section) => <label className="cv-option-row" key={section.id}><input type="checkbox" checked={design.pageBreakBefore.includes(section.id)} onChange={(event) => update("pageBreakBefore", event.target.checked ? [...design.pageBreakBefore, section.id] : design.pageBreakBefore.filter((id) => id !== section.id))} /><span>Start {section.title} on a new page</span></label>)}
      {design.pageBreakBefore.length > 0 && <button type="button" className="cv-btn" onClick={() => update("pageBreakBefore", [])}>Use automatic flow everywhere</button>}
    </details>
  </section>
}

export function CvQualityReview({ preset }: { preset: CvPreset }) {
  const notes = cvQualityNotes(preset)
  return <details className="cv-quality-review"><summary>Readability review{notes.length ? ` · ${notes.length} suggestions` : ""}</summary>
    {notes.length > 0 ? <ul>{notes.map((note, index) => <li key={index}>{note}</li>)}</ul> : <p>No density issues flagged. Inspect the exported PDF to confirm page breaks and reading order.</p>}
    <p>If the document is too long: edit content first, then reduce entry and header spacing, then section spacing and margins. Reduce font size last. These are suggestions; content is never truncated.</p>
  </details>
}
