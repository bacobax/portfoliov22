import Image, { type StaticImageData } from "next/image"

import type { CvData, CvDisplaySection, CvDisplayLogEntry } from "./cv-types"
import { CV_TEMPLATE_BY_ID, type CvLayoutId } from "@/lib/cv-templates"
import { cvDesignSchema } from "@/lib/cv-document"
import { cvLinkHref, cvLinkLabel } from "@/lib/cv-quality"

function LogSection({ section }: { section: CvDisplaySection }) {
  if (section.content.type !== "log" || section.content.entries.length === 0) return null
  return (
    <section className={`region-section region-log region-section--${section.id}`} aria-labelledby={`cv-${section.id}`}>
      <h2 id={`cv-${section.id}`}>{section.title}</h2>
      <div className="region-log__items">
        {section.content.entries.map((entry, index) => (
          <LogEntry key={`${entry.title}-${entry.dates}-${index}`} entry={entry} />
        ))}
      </div>
    </section>
  )
}

function LogEntry({ entry }: { entry: CvDisplayLogEntry }) {
  const short = entry.bullets.join(" ").split(/\s+/).length <= 85 && entry.bullets.length <= 3
  const href = entry.url ? cvLinkHref(entry.url) : undefined
  return (
    <article className={`region-entry ${short ? "region-entry--short" : "region-entry--long"}`}>
      <div className="region-entry__content">
        <div className="region-entry__heading">
          <div>
            <h3>{entry.title}</h3>
            {entry.subtitle && <p className="region-entry__subtitle">{entry.subtitle}</p>}
          </div>
          {entry.dates && <span className="region-entry__date">{entry.dates}</span>}
        </div>
        {entry.bullets.length > 0 && (
          <ul className="region-entry__bullets">
            {entry.bullets.map((bullet, index) => <li key={`${bullet}-${index}`}>{bullet}</li>)}
          </ul>
        )}
        {entry.tags.length > 0 && (
          <p className="region-technologies" aria-label={`${entry.title} skills`}>{entry.tags.join(", ")}</p>
        )}
        {href && <p className="region-entry-link"><a href={href} target="_blank" rel="noreferrer">{cvLinkLabel(href)}</a></p>}
      </div>
    </article>
  )
}

function RenderSection({ section, summaryOverride }: { section: CvDisplaySection; summaryOverride?: string }) {
  const content = section.content
  if (content.type === "log") return <LogSection section={section} />
  if (content.type === "text") {
    const text = section.id === "profile" && summaryOverride ? summaryOverride : content.text
    if (!text) return null
    return <section className="region-section region-text"><h2>{section.title}</h2><p>{text}</p></section>
  }
  if (content.type === "tags") {
    if (content.groups.length === 0) return null
    return (
      <section className="region-section region-skills">
        <h2>{section.title}</h2>
        {content.groups.map((group) => (
          <div className="region-skill-group" key={group.category}>
            <p>{group.category && <><strong>{group.category}:</strong>{" "}</>}{group.items.join(", ")}</p>
          </div>
        ))}
      </section>
    )
  }
  if (content.type === "links") {
    if (content.items.length === 0) return null
    return (
      <section className="region-section region-links">
        <h2>{section.title}</h2>
        <ul>{content.items.map((item, index) => <li key={`${item.url}-${index}`}>{cvLinkHref(item.url) ? <a href={cvLinkHref(item.url)} target="_blank" rel="noreferrer">{item.label || cvLinkLabel(item.url)}</a> : <span>{item.label || item.url}</span>}</li>)}</ul>
      </section>
    )
  }
  if (content.items.length === 0) return null
  return (
    <section className="region-section region-list">
      <h2>{section.title}</h2>
      <ul>{content.items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  )
}

const extraLabels: Record<string, string> = {
  dateOfBirth: "Date of birth",
  placeOfBirth: "Place of birth",
  nationality: "Nationality",
  workAuthorization: "Work authorization",
  drivingLicences: "Driving licence",
  references: "References",
}

function PersonalDetails({ data }: { data: CvData }) {
  const extras = data.profileExtras
  const fields = data.regionalOptions?.personalFields ?? []
  if (!extras || fields.length === 0) return null
  const values: Partial<Record<string, string>> = {
    dateOfBirth: extras.dateOfBirth,
    placeOfBirth: extras.placeOfBirth,
    nationality: extras.nationality,
    workAuthorization: extras.workAuthorization,
    drivingLicences: extras.drivingLicences.join(", "),
    references: extras.references.map((reference) =>
      [reference.name, reference.role, reference.organization].filter(Boolean).join(" · "),
    ).join("; "),
  }
  const present = fields.filter((field) => values[field])
  if (present.length === 0) return null
  return (
    <dl className="region-personal">
      {present.map((field) => <div key={field}><dt>{extraLabels[field]}</dt><dd>{values[field]}</dd></div>)}
    </dl>
  )
}

function Portrait({ data, profilePicture }: { data: CvData; profilePicture: StaticImageData }) {
  if (!data.regionalOptions?.showPhoto) return null
  const uploaded = data.profileExtras?.profileImage
  return (
    <div className="region-portrait">
      {uploaded?.url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={uploaded.url} alt={uploaded.alt || `${data.name} portrait`} />
        : <Image src={profilePicture} alt={`${data.name} portrait`} fill sizes="112px" priority />}
    </div>
  )
}

export function RegionalCvLayout({
  layout,
  data,
  profilePicture,
}: {
  layout: CvLayoutId
  data: CvData
  profilePicture: StaticImageData
}) {
  const definition = CV_TEMPLATE_BY_ID[layout]
  const design = cvDesignSchema.parse(data.design ?? { accent: definition.accent })
  const sidebar = design.columns === "single" ? [] : data.sections.filter((section) => section.placement === "sidebar")
  const main = design.columns === "single" ? data.sections : data.sections.filter((section) => section.placement === "main")
  const role = data.targetRoleOverride?.trim() || data.title
  const hasSidebar = sidebar.length > 0
  const pageBreaks = new Set(design?.pageBreakBefore ?? [])
  const renderSection = (section: CvDisplaySection) => (
    <div key={section.id} className={pageBreaks.has(section.id) ? "region-section-break" : undefined}>
      <RenderSection section={section} summaryOverride={data.summaryOverride} />
    </div>
  )
  const fonts = { sans: "Arial, Helvetica, sans-serif", serif: "Georgia, 'Times New Roman', serif", humanist: "'Trebuchet MS', Arial, sans-serif" }
  const pageWidth = design?.page === "Letter" ? "215.9mm" : "210mm"
  const pageHeight = design?.page === "Letter" ? "279.4mm" : "297mm"

  return (
    <>
      <style>{`${regionalStyles}\n@page { size: ${design.page}; margin: ${design.marginMm}mm; }`}</style>
      <article
        data-appearance={design.appearance}
        data-dates={design.datePlacement}
        data-headings={design.headingStyle}
        className={`cv-document regional-cv regional-cv--${layout} ${hasSidebar && design?.columns !== "single" ? "regional-cv--has-sidebar" : ""} ${hasSidebar && design?.columns !== "single" && design?.sidebarPosition === "right" ? "regional-cv--sidebar-right" : ""}`}
        style={{
          "--cv-accent": design?.accent ?? definition.accent,
          "--cv-ink": design?.ink ?? "#17202a", "--cv-muted": design?.muted ?? "#5f6973",
          "--cv-page-width": pageWidth, "--cv-page-height": pageHeight,
          "--cv-margin": `${design?.marginMm ?? 18}mm`, "--cv-sidebar-width": `${design?.sidebarWidthMm ?? 54}mm`,
          "--cv-font": fonts[design?.fontFamily ?? "sans"], "--cv-font-size": `${design?.baseFontPt ?? 9.5}pt`,
          "--cv-line-height": design?.lineHeight ?? 1.45, "--cv-section-gap": `${design?.sectionGapMm ?? 5}mm`,
          "--cv-entry-gap": `${design?.entryGapMm ?? 4}mm`, "--cv-photo-radius": design?.photoShape === "circle" ? "50%" : design?.photoShape === "rounded" ? "4mm" : "0",
          "--cv-photo-size": `${design.photoSizeMm}mm`,
          width: pageWidth, minHeight: pageHeight, padding: `${design?.marginMm ?? 18}mm`,
          fontFamily: fonts[design?.fontFamily ?? "sans"], fontSize: `${design?.baseFontPt ?? 9.5}pt`, lineHeight: design?.lineHeight ?? 1.45,
        } as React.CSSProperties}
        lang={data.documentLanguage ?? "en"}
      >
        <header className="region-header">
          <Portrait data={data} profilePicture={profilePicture} />
          <div className="region-header__identity">
            <h1>{data.name}</h1>
            <p className="region-header__role">{role}</p>
          </div>
          <address className="region-contact">
            {design.showLocation && (design.locationLabel || data.location) && <span>{design.locationLabel || data.location}{" "}</span>}
            {data.email && <a href={`mailto:${data.email}`}>{data.email}</a>}
            {data.phone && <a href={`tel:${data.phone.replace(/\s/g, "")}`}>{data.phone}</a>}
            {design.showTaxId && data.piva && <span>{data.piva}</span>}
          </address>
        </header>

        <PersonalDetails data={data} />

        <div className="region-body">
          {hasSidebar && (
            <aside className="region-sidebar">
              {sidebar.map(renderSection)}
            </aside>
          )}
          <div className="region-main">
            {main.map(renderSection)}
          </div>
        </div>

        {(data.regionalOptions?.showSignature || data.regionalOptions?.customFooter) && (
          <footer className="region-footer">
            {data.regionalOptions.customFooter && <p>{data.regionalOptions.customFooter}</p>}
            {data.regionalOptions.showSignature && (
              <div className="region-signature">
                <span>{data.regionalOptions.documentDate}</span>
                <strong>{data.name}</strong>
              </div>
            )}
          </footer>
        )}
      </article>
    </>
  )
}

const regionalStyles = `
  .regional-cv {
    --cv-ink: #17202a; --cv-muted: #5f6973; --cv-paper: #fff; --cv-soft: #f3f5f6;
    width: var(--cv-page-width, 210mm); max-width: 100%; min-height: var(--cv-page-height, 297mm); box-sizing: border-box;
    background: var(--cv-paper); color: var(--cv-ink); padding: var(--cv-margin, 18mm);
    box-shadow: 0 22px 55px rgba(15,23,42,.14); font-family: var(--cv-font, Arial, Helvetica, sans-serif);
    font-size: var(--cv-font-size, 9.5pt); line-height: var(--cv-line-height, 1.45); overflow-wrap: anywhere;
  }
  .region-header { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: start; gap: 16px; padding-bottom: 14px; border-bottom: 2px solid var(--cv-accent); }
  .region-header__eyebrow { margin: 0 0 5px; color: var(--cv-accent); font-size: 7pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
  .region-header h1 { margin: 0; font-size: 25pt; line-height: 1; letter-spacing: -.035em; }
  .region-header__role { margin: 7px 0 0; color: var(--cv-muted); font-size: 11pt; font-weight: 600; }
  .region-contact { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; max-width: 65mm; font-style: normal; font-size: 8.5pt; text-align: right; }
  .region-contact a { color: inherit; text-decoration: none; }
  .region-portrait { position: relative; width: 27mm; height: 32mm; overflow: hidden; background: var(--cv-soft); border-radius: var(--cv-photo-radius, 0); }
  .region-portrait img { width: 100%; height: 100%; object-fit: cover; }
  .region-personal { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 10px 0 0; padding: 8px 0; border-bottom: 1px solid #d9dee2; font-size: 8pt; }
  .region-personal div { display: flex; gap: 5px; } .region-personal dt { color: var(--cv-muted); } .region-personal dd { margin: 0; font-weight: 600; }
  .region-body { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 16px; }
  .regional-cv--has-sidebar .region-body { grid-template-columns: var(--cv-sidebar-width, 54mm) minmax(0,1fr); }
  .regional-cv--sidebar-right .region-sidebar { grid-column: 2; grid-row: 1; padding-right: 0; padding-left: 13px; border-right: 0; border-left: 1px solid #d9dee2; }
  .regional-cv--sidebar-right .region-main { grid-column: 1; grid-row: 1; }
  .region-sidebar { padding-right: 13px; border-right: 1px solid #d9dee2; }
  .region-main { min-width: 0; }
  .region-sidebar, .region-main { display: flex; flex-direction: column; gap: var(--cv-section-gap, 5mm); }
  .region-section { break-inside: avoid; page-break-inside: avoid; }
  .region-section > h2 { margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid #cbd1d6; color: var(--cv-accent); font-size: 9pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; break-after: avoid; }
  .region-text p { margin: 0; color: #39434c; }
  .region-log__items { display: flex; flex-direction: column; gap: var(--cv-entry-gap, 4mm); }
  .region-entry { display: grid; grid-template-columns: minmax(0,1fr); gap: 3px; break-inside: avoid; page-break-inside: avoid; }
  .region-section-break { break-before: page; page-break-before: always; }
  .region-entry__date { color: var(--cv-muted); font-size: 7.8pt; font-variant-numeric: tabular-nums; }
  .region-entry__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .region-entry__heading h3 { margin: 0; font-size: 10pt; line-height: 1.2; }
  .region-entry__heading > a { color: var(--cv-accent); text-decoration: none; }
  .region-entry__subtitle { margin: 2px 0 0; color: var(--cv-muted); font-size: 8.5pt; font-weight: 600; }
  .region-entry__bullets { margin: 5px 0 0; padding-left: 14px; }
  .region-entry__bullets li { margin: 0 0 2px; }
  .region-skill-group + .region-skill-group { margin-top: 8px; }
  .region-skill-group h3 { margin: 0 0 5px; color: var(--cv-muted); font-size: 7.5pt; letter-spacing: .08em; text-transform: uppercase; }
  .region-tags { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
  .region-tags li { padding: 2px 6px; border: 1px solid #cbd1d6; border-radius: 99px; font-size: 7.5pt; }
  .region-tags--entry { margin-top: 6px; }
  .region-links ul, .region-list ul { margin: 0; padding: 0; list-style: none; }
  .region-links li, .region-list li { margin-bottom: 4px; }
  .region-links a { color: inherit; text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--cv-accent), transparent 55%); }
  .region-footer { margin-top: 18px; padding-top: 9px; border-top: 1px solid #d9dee2; color: var(--cv-muted); font-size: 7.5pt; }
  .region-footer > p { margin: 0; }
  .region-signature { display: flex; justify-content: space-between; gap: 20px; margin-top: 15px; color: var(--cv-ink); }

  .regional-cv--british_irish { --cv-accent:#183153; padding: 17mm 20mm; }
  .regional-cv--british_irish .region-header { grid-template-columns: 1fr auto; }
  .regional-cv--british_irish .region-header__eyebrow, .regional-cv--british_irish .region-portrait { display:none; }
  .regional-cv--british_irish .region-header h1 { font-family: Georgia, serif; font-size: 24pt; font-weight: 500; }
  .regional-cv--british_irish .region-section > h2 { color: var(--cv-ink); border-bottom-width: 2px; }
  .regional-cv--british_irish .region-entry { grid-template-columns: 1fr auto; }
  .regional-cv--british_irish .region-entry__date { grid-column: 2; grid-row: 1; text-align: right; }
  .regional-cv--british_irish .region-entry__content { grid-column: 1; grid-row: 1; }

  .regional-cv--germanic_tabular { --cv-accent:#8a1c24; font-family: Arial, sans-serif; }
  .regional-cv--germanic_tabular .region-header h1 { font-size: 22pt; letter-spacing: .01em; }
  .regional-cv--germanic_tabular .region-entry { grid-template-columns: 31mm minmax(0,1fr); gap: 8mm; }
  .regional-cv--germanic_tabular .region-entry__date { grid-column:1; padding-top:2px; color:var(--cv-ink); font-weight:700; }
  .regional-cv--germanic_tabular .region-entry__content { grid-column:2; }
  .regional-cv--germanic_tabular .region-section > h2 { color:var(--cv-ink); letter-spacing:.04em; text-transform:none; }

  .regional-cv--nordic_concise { --cv-accent:#0f6c72; padding:20mm; }
  .regional-cv--nordic_concise .region-header { border:0; padding-bottom:18px; }
  .regional-cv--nordic_concise .region-header h1 { font-size:28pt; font-weight:400; }
  .regional-cv--nordic_concise .region-section > h2 { border:0; padding:0; letter-spacing:.08em; }
  .regional-cv--nordic_concise .region-body { gap:8mm; }

  .regional-cv--french_speaking_concise { --cv-accent:#22577a; padding:12mm 14mm; font-size:8.6pt; }
  .regional-cv--french_speaking_concise .region-header { margin:calc(-1 * var(--cv-margin)) calc(-1 * var(--cv-margin)) 0; padding:12mm var(--cv-margin) 8mm; background:#eef4f7; border:0; }
  .regional-cv--french_speaking_concise.regional-cv--has-sidebar .region-body { grid-template-columns:var(--cv-sidebar-width, 51mm) minmax(0,1fr); gap:7mm; }
  .regional-cv--french_speaking_concise .region-sidebar { padding-right:7mm; }
  .regional-cv--french_speaking_concise .region-main, .regional-cv--french_speaking_concise .region-sidebar { gap:10px; }

  .regional-cv--dutch_tailored { --cv-accent:#e05b26; padding:16mm 18mm 16mm 23mm; border-left:5mm solid var(--cv-accent); }
  .regional-cv--dutch_tailored .region-header { border:0; }
  .regional-cv--dutch_tailored .region-header h1 { font-size:28pt; }
  .regional-cv--dutch_tailored .region-section > h2 { border:0; padding:0; }

  .regional-cv--southern_european { --cv-accent:#9a3412; padding:15mm; }
  .regional-cv--southern_european .region-header { margin:calc(-1 * var(--cv-margin)) calc(-1 * var(--cv-margin)) 0; padding:12mm var(--cv-margin) 9mm; color:#fff; background:var(--cv-accent); border:0; }
  .regional-cv--southern_european .region-header__eyebrow, .regional-cv--southern_european .region-header__role, .regional-cv--southern_european .region-contact { color:#fff; }
  .regional-cv--southern_european .region-portrait { border:3px solid rgba(255,255,255,.65); }
  .regional-cv--southern_european .region-tags li { border-radius:3px; }

  .regional-cv--europass_friendly_structured { --cv-accent:#0b5cad; padding:16mm 16mm 16mm 34mm; background:linear-gradient(90deg,var(--cv-accent) 0 20mm,#fff 20mm); }
  .regional-cv--europass_friendly_structured .region-header { border:0; }
  .regional-cv--europass_friendly_structured .region-section { display:grid; grid-template-columns:43mm minmax(0,1fr); column-gap:8mm; }
  .regional-cv--europass_friendly_structured .region-section > h2 { margin:0; border:0; text-align:right; }
  .regional-cv--europass_friendly_structured .region-log__items, .regional-cv--europass_friendly_structured .region-section > p, .regional-cv--europass_friendly_structured .region-section > ul, .regional-cv--europass_friendly_structured .region-skill-group { grid-column:2; }

  .regional-cv--post_soviet_local_resume { --cv-accent:#2f4858; padding:13mm 16mm; font-size:8.7pt; }
  .regional-cv--post_soviet_local_resume .region-header { padding:0 0 9mm; }
  .regional-cv--post_soviet_local_resume .region-header__eyebrow { display:none; }
  .regional-cv--post_soviet_local_resume .region-header h1 { font-size:21pt; }
  .regional-cv--post_soviet_local_resume .region-body { gap:6mm; margin-top:10px; }
  .regional-cv--post_soviet_local_resume .region-main, .regional-cv--post_soviet_local_resume .region-sidebar { gap:10px; }

  /* A restrained application layout, independent of the regional content conventions. */
  .regional-cv[data-appearance="professional"] { background: white; border: 0; }
  .regional-cv[data-appearance="professional"] .region-header {
    display:grid; grid-template-columns:minmax(0,1fr) auto; gap:1mm 5mm;
    margin:0; padding:0 0 4mm; color:var(--cv-ink); background:none;
    border:0; border-bottom:.4mm solid var(--cv-accent);
  }
  .regional-cv[data-appearance="professional"] .region-header__identity { grid-column:1; grid-row:1; }
  .regional-cv[data-appearance="professional"] .region-header h1 { font-family:inherit; font-size:2.2em; line-height:1.1; font-weight:700; letter-spacing:-.02em; }
  .regional-cv[data-appearance="professional"] .region-header__role { font-size:1.1em; font-weight:500; line-height:1.3; color:var(--cv-ink); margin:1mm 0 0; }
  .regional-cv[data-appearance="professional"] .region-contact { grid-column:1; grid-row:2; flex-direction:row; flex-wrap:wrap; justify-content:flex-start; text-align:left; gap:1mm 4mm; max-width:none; font-size:.9em; color:var(--cv-muted); }
  .regional-cv .region-portrait { width:var(--cv-photo-size); height:var(--cv-photo-size); flex-shrink:0; }
  .regional-cv[data-appearance="professional"] .region-portrait { display:block; grid-column:2; grid-row:1 / span 2; border:0; }
  .regional-cv[data-appearance="professional"] .region-body { margin-top:var(--cv-section-gap); gap:6mm; }
  .regional-cv[data-appearance="professional"] .region-section { display:block; }
  .regional-cv[data-appearance="professional"] .region-section > h2 { color:var(--cv-accent); font-size:1.05em; letter-spacing:.02em; text-transform:none; text-align:left; border:0; border-bottom:.2mm solid #cbd1d6; padding:0 0 1mm; margin:0 0 2mm; }
  .regional-cv[data-headings="spacing"] .region-section > h2 { border:0; padding:0; }
  .regional-cv .region-body:not(:has(.region-sidebar)) { display:block; }
  .regional-cv.regional-cv--sidebar-right .region-body { grid-template-columns:minmax(0,1fr) var(--cv-sidebar-width); }
  .regional-cv .region-sidebar, .regional-cv .region-main, .regional-cv .region-log__items { display:block; }
  .regional-cv .region-sidebar > div + div, .regional-cv .region-main > div + div { margin-top:var(--cv-section-gap); }
  .regional-cv .region-log__items > article + article { margin-top:var(--cv-entry-gap); }
  .regional-cv .region-section { break-inside:auto; page-break-inside:auto; }
  .regional-cv .region-entry { display:block; break-inside:auto; page-break-inside:auto; }
  .regional-cv .region-entry__heading { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:0 3mm; break-inside:avoid; break-after:avoid; page-break-after:avoid; }
  .regional-cv .region-entry__heading > div { grid-column:1; grid-row:1; }
  .regional-cv .region-entry__heading h3 { font-size:1em; font-weight:700; line-height:1.3; }
  .regional-cv .region-entry__date { display:block; grid-column:2; grid-row:1; max-width:40mm; padding:0; text-align:right; font-size:.9em; font-weight:400; color:var(--cv-muted); }
  .regional-cv[data-dates="left"] .region-entry__heading { grid-template-columns:25mm minmax(0,1fr); }
  .regional-cv[data-dates="left"] .region-entry__date { grid-column:1; text-align:left; }
  .regional-cv[data-dates="left"] .region-entry__heading > div { grid-column:2; }
  .regional-cv[data-dates="above"] .region-entry__heading, .regional-cv .region-sidebar .region-entry__heading { display:flex; flex-direction:column; gap:0; }
  .regional-cv[data-dates="above"] .region-entry__date, .regional-cv .region-sidebar .region-entry__date { order:-1; }
  .regional-cv .region-entry__heading:not(:has(.region-entry__date)) { display:block; }
  .regional-cv[data-dates="above"] .region-entry__date, .regional-cv .region-sidebar .region-entry__date { max-width:none; text-align:left; margin-bottom:1mm; }
  .regional-cv .region-entry__subtitle { font-size:.95em; font-weight:500; margin:1mm 0 0; }
  .regional-cv .region-entry__bullets { padding-left:4mm; margin:1.5mm 0 0; list-style:disc outside; }
  .regional-cv .region-entry__bullets li { margin:0 0 1mm; orphans:2; widows:2; }
  .regional-cv .region-entry__bullets li:first-child { break-before:avoid; }
  .regional-cv .region-entry__bullets li:last-child:not(:first-child) { break-before:avoid; }
  .regional-cv .region-entry--short { break-inside:avoid; page-break-inside:avoid; }
  .regional-cv .region-technologies, .regional-cv .region-entry-link { font-size:.9em; margin:1.5mm 0 0; color:var(--cv-muted); break-before:avoid; }
  .regional-cv .region-skill-group p { margin:0; font-size:1em; }
  .regional-cv .region-skill-group + .region-skill-group { margin-top:1.5mm; }
  .regional-cv .region-text p { color:var(--cv-ink); white-space:pre-line; }
  .regional-cv a { color:inherit; overflow-wrap:anywhere; text-decoration:underline; text-underline-offset:2px; }
  .regional-cv p { orphans:2; widows:2; }
  @media print {
    .regional-cv { width:auto !important; max-width:none !important; min-height:0 !important; padding:0 !important; box-shadow:none; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    .regional-cv .region-section { break-inside:auto; page-break-inside:auto; }
    .regional-cv .region-section > h2 { break-after:avoid; page-break-after:avoid; }
    .regional-cv .region-header { break-inside:avoid; }
    .regional-cv[data-appearance="regional"] .region-header { margin:0; }
    .regional-cv .region-footer { break-inside:avoid; }
  }
`
