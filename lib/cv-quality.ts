import type { CvPreset } from "@/lib/cv-presets"
import { descriptionBulletCount } from "@/lib/cv-data-transform"

export function cvLinkHref(value: string): string | undefined {
  const trimmed = value.trim()
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return `mailto:${trimmed}`
  try {
    const url = new URL(trimmed)
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
}

export function cvLinkLabel(value: string): string {
  try {
    const url = new URL(value)
    if (url.protocol === "mailto:" || url.protocol === "tel:") return url.pathname
    if (url.hostname === "github.com" || url.hostname.endsWith(".github.com")) return "GitHub"
    if (url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com")) return "LinkedIn"
    return url.hostname.replace(/^www\./, "") || "Link"
  } catch { return "Link" }
}

export function cvQualityNotes(preset: CvPreset): string[] {
  const notes: string[] = []
  const design = preset.design
  if (design.baseFontPt < 10.5) notes.push("Body text is below 10.5 pt. Review wording and spacing before shrinking the font.")
  if (design.marginMm < 12) notes.push("Margins below 12 mm can feel crowded. Check the printed page at normal size.")
  if (design.pageBreakBefore.length) notes.push("Manual page breaks are active. Try automatic flow first if a page has a large empty area.")
  if (design.columns === "sidebar") notes.push("A single column gives long descriptions more room and a simpler extracted reading order.")
  if (design.showTaxId) notes.push("Tax identification is usually unnecessary on an employment CV; include it only when relevant.")
  for (const section of preset.content.sections.filter((item) => item.visible)) {
    if (section.data.type === "links") {
      for (const link of section.data.items) {
        if (!cvLinkHref(link.url)) notes.push(`${link.label || section.title}: use a full web address or an email address for a clickable link.`)
      }
    }
    if (section.data.type !== "log") continue
    for (const entry of section.data.entries) {
      const bullets = descriptionBulletCount(entry.description)
      const words = entry.description.trim().split(/\s+/).filter(Boolean).length
      if (words > 90 || bullets > 3) notes.push(`${entry.title || section.title}: consider a shorter paragraph or 2–3 concise bullets covering your contribution and result (${words} words, ${bullets} bullets).`)
      if (entry.url && !cvLinkHref(entry.url)) notes.push(`${entry.title || section.title}: the link needs a valid web address.`)
    }
  }
  return notes
}
