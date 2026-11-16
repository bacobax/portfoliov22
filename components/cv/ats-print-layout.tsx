import type { CvData, CvDisplayLogEntry, CvDisplaySection } from "./cv-types"
import { cvDesignSchema } from "@/lib/cv-document"
import { cvLinkHref, cvLinkLabel } from "@/lib/cv-quality"
import type { CvLocale } from "@/lib/cv-templates"
import { parseMarks } from "@/lib/cv-inline-marks"

const englishPersonalDetailLabels: Record<string, string> = {
  dateOfBirth: "Date of birth",
  placeOfBirth: "Place of birth",
  nationality: "Nationality",
  workAuthorization: "Work authorization",
  drivingLicences: "Driving licence",
  references: "References",
}

const italianPersonalDetailLabels: Record<string, string> = {
  dateOfBirth: "Data di nascita",
  placeOfBirth: "Luogo di nascita",
  nationality: "Nazionalità",
  workAuthorization: "Autorizzazione al lavoro",
  drivingLicences: "Patente di guida",
  references: "Referenze",
}

function printableLink(value: string): string {
  const href = cvLinkHref(value)
  if (!href) return value.trim()
  try {
    const url = new URL(href)
    if (url.protocol === "mailto:" || url.protocol === "tel:") return url.pathname
    return url.href
  } catch {
    return value.trim()
  }
}

function printableDate(value: string): string {
  return value.replace(/[\u2011\u2012\u2013\u2014]/g, " - ").replace(/\s+-\s+/g, " - ")
}

function AtsLogEntry({ entry, locale }: { entry: CvDisplayLogEntry; locale: CvLocale }) {
  const href = entry.url ? cvLinkHref(entry.url) : undefined
  return (
    <article className="ats-entry">
      <h3>{entry.title}</h3>
      {entry.subtitle && <p className="ats-entry__subtitle">{entry.subtitle}</p>}
      {entry.dates && <p className="ats-entry__date">{printableDate(entry.dates)}</p>}
      {entry.description.map((block, index) => block.type === "paragraph"
        ? <p key={index}>{block.title && <><strong>{block.title}</strong>{" "}</>}{parseMarks(block.text)}</p>
        : <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{parseMarks(item)}</li>)}</ul>)}
      {entry.tags.length > 0 && <p className="ats-entry__skills"><strong>{locale === "it" ? "Competenze" : "Skills"}:</strong> {entry.tags.join(", ")}</p>}
      {entry.url && (
        <p className="ats-entry__link">
          <strong>{cvLinkLabel(entry.url)}:</strong>{" "}
          {href ? <a href={href}>{printableLink(entry.url)}</a> : printableLink(entry.url)}
        </p>
      )}
    </article>
  )
}

function AtsSection({ section, locale }: { section: CvDisplaySection; locale: CvLocale }) {
  const content = section.content
  if (content.type === "log" && content.entries.length === 0) return null
  if (content.type === "text" && !content.text) return null
  if (content.type === "tags" && content.groups.length === 0) return null
  if (content.type === "links" && content.items.length === 0) return null
  if (content.type === "simple-list" && content.items.length === 0) return null

  return (
    <section className="ats-section" aria-labelledby={`ats-cv-${section.id}`}>
      <h2 id={`ats-cv-${section.id}`}>{section.title}</h2>
      {content.type === "log" && content.entries.map((entry, index) => (
        <AtsLogEntry key={`${entry.title}-${entry.dates}-${index}`} entry={entry} locale={locale} />
      ))}
      {content.type === "text" && <p>{parseMarks(content.text)}</p>}
      {content.type === "tags" && content.groups.map((group, index) => (
        <p key={`${group.category}-${index}`}>
          {group.category && <><strong>{group.category}:</strong>{" "}</>}
          {group.items.join(", ")}
        </p>
      ))}
      {content.type === "links" && (
        <ul>
          {content.items.map((item, index) => {
            const href = cvLinkHref(item.url)
            return (
              <li key={`${item.url}-${index}`}>
                <strong>{item.label || cvLinkLabel(item.url)}:</strong>{" "}
                {href ? <a href={href}>{printableLink(item.url)}</a> : printableLink(item.url)}
              </li>
            )
          })}
        </ul>
      )}
      {content.type === "simple-list" && <ul className={section.id === "languages" ? "ats-inline-list" : undefined}>{content.items.map((item) => <li key={item}>{item}</li>)}</ul>}
    </section>
  )
}

function AtsPersonalDetails({ data }: { data: CvData }) {
  const extras = data.profileExtras
  const personalDetailLabels = data.documentLanguage === "it" ? italianPersonalDetailLabels : englishPersonalDetailLabels
  const fields = data.regionalOptions?.personalFields ?? []
  if (!extras || fields.length === 0) return null

  const values: Partial<Record<string, string>> = {
    dateOfBirth: extras.dateOfBirth,
    placeOfBirth: extras.placeOfBirth,
    nationality: extras.nationality,
    workAuthorization: extras.workAuthorization,
    drivingLicences: extras.drivingLicences.join(", "),
    references: extras.references.map((reference) =>
      [reference.name, reference.role, reference.organization].filter(Boolean).join(" - "),
    ).join("; "),
  }
  const present = fields.filter((field) => values[field])
  if (present.length === 0) return null

  return (
    <section className="ats-personal" aria-label={data.documentLanguage === "it" ? "Dati personali" : "Personal details"}>
      {present.map((field) => (
        <p key={field}><strong>{personalDetailLabels[field]}:</strong> {values[field]}</p>
      ))}
    </section>
  )
}

/**
 * The standardized single-column CV that "Save ATS PDF" prints. With `screen`
 * it is also shown on screen (the editor's paged print view); that copy is never
 * printed, so screen-only decoration cannot reach the PDF.
 */
export function AtsPrintCvLayout({ data, screen = false }: { data: CvData; screen?: boolean }) {
  const design = cvDesignSchema.parse(data.design ?? {})
  const role = data.targetRoleOverride?.trim() || data.title
  const fontSize = Math.min(13, Math.max(9, design.baseFontPt))
  const footer = data.regionalOptions
  const hasFooter = Boolean(footer?.customFooter || footer?.showSignature)
  const locale = data.documentLanguage ?? "en"

  return (
    <article
      className={`cv-document ats-print-cv${screen ? " ats-print-cv--screen" : ""}`}
      data-cv-output={screen ? "ats-screen" : "ats-print"}
      lang={data.documentLanguage ?? "en"}
      style={{ "--ats-font-size": `${fontSize}pt` } as React.CSSProperties}
    >
      <style>{atsPrintStyles}</style>
      <header className="ats-header">
        <h1>{data.name}</h1>
        {role && <p className="ats-header__role">{role}</p>}
        <address className="ats-contact">
          {design.showLocation && (design.locationLabel || data.location) && <p>{design.locationLabel || data.location}</p>}
          {data.email && <p><a href={`mailto:${data.email}`}>{data.email}</a></p>}
          {data.contactLinks?.map((link) => <p key={link.url}><a href={link.url}>{link.label}</a></p>)}
          {data.phone && <p><a href={`tel:${data.phone.replace(/\s/g, "")}`}>{data.phone}</a></p>}
          {design.showTaxId && data.piva && <p>{data.piva}</p>}
        </address>
        <AtsPersonalDetails data={data} />
      </header>

      <main>
        {data.sections.map((section) => <AtsSection key={section.id} section={section} locale={locale} />)}
      </main>

      {hasFooter && (
        <footer className="ats-footer">
          {footer?.customFooter && <p>{footer.customFooter}</p>}
          {footer?.showSignature && <p>{[footer.documentDate, data.name].filter(Boolean).join(" - ")}</p>}
        </footer>
      )}
    </article>
  )
}

/** Shared ATS rules, scoped to `root`: emitted once for print and once for the screen copy. */
const atsRules = (root: string) => `
    ${root} {
      display:block !important; width:auto !important; max-width:none !important; min-height:0 !important;
      margin:0 !important; padding:0 !important; border:0 !important; box-shadow:none !important;
      background:#fff !important; color:#000 !important; font-family:Arial, Helvetica, sans-serif !important;
      font-size:var(--ats-font-size, 10.5pt) !important; line-height:1.42 !important;
      overflow:visible !important; overflow-wrap:break-word; print-color-adjust:economy; -webkit-print-color-adjust:economy;
    }
    ${root} * { box-sizing:border-box; color:#000 !important; background:transparent !important; }
    ${root} .ats-header { margin:0 0 5mm; padding:0 0 3mm; border-bottom:.3mm solid #000; break-inside:avoid; }
    ${root} h1 { margin:0; font-size:1.9048em; line-height:1.15; font-weight:700; }
    ${root} .ats-header__role { margin:1mm 0 2mm; font-size:1.1429em; font-weight:700; }
    ${root} .ats-contact { margin:0; font-style:normal; }
    ${root} .ats-contact p, ${root} .ats-personal p { margin:.5mm 0; }
    ${root} .ats-personal { margin-top:2mm; }
    ${root} main { display:block; }
    ${root} .ats-section { display:block; margin:0 0 4mm; padding:0; }
    ${root} .ats-section:last-child { margin-bottom:0; }
    ${root} h2 { margin:0 0 2mm; padding:0 0 1mm; border-bottom:.2mm solid #000; font-size:1.2381em; line-height:1.2; break-after:avoid; page-break-after:avoid; }
    ${root} .ats-entry { display:block; margin:0 0 3mm; break-inside:auto; page-break-inside:auto; }
    ${root} h3 { margin:0; font-size:1.0476em; line-height:1.3; break-after:avoid; page-break-after:avoid; }
    ${root} p { margin:1mm 0 0; }
    ${root} p, ${root} li { break-inside:avoid; page-break-inside:avoid; }
    ${root} .ats-entry__subtitle { margin-top:.5mm; font-weight:700; break-after:avoid; page-break-after:avoid; }
    ${root} .ats-entry__date { margin-top:.5mm; break-after:avoid; page-break-after:avoid; }
    ${root} ul { margin:1mm 0 0; padding-left:5mm; list-style:disc outside; }
    ${root} li { margin:0 0 .8mm; }
    ${root} .ats-inline-list { display:flex; flex-wrap:wrap; padding-left:0; list-style:none; }
    ${root} .ats-inline-list li { margin:0; }
    ${root} .ats-inline-list li + li::before { content:"·"; margin:0 1.5mm; }
    ${root} a { color:#000 !important; text-decoration:underline; overflow-wrap:anywhere; }
    ${root} .ats-footer { margin-top:5mm; padding-top:2mm; border-top:.2mm solid #000; break-inside:avoid; }
`

const atsPrintStyles = `
  .ats-print-cv { display:none; }
  @media print {
    .cv-document--visual { display:none !important; }
    .ats-print-cv--screen { display:none !important; }
${atsRules(".ats-print-cv:not(.ats-print-cv--screen)")}
  }
  @media screen {
${atsRules(".ats-print-cv--screen")}
    .ats-print-cv--screen [data-cv-page-start] { padding-top:var(--cv-spacer, 0px); }
  }
`
