import Image, { type StaticImageData } from "next/image"

import type { CvData, CvDisplaySection, CvDisplayLogEntry } from "./cv-types"
import { CV_TEMPLATE_BY_ID, type CvLayoutId } from "@/lib/cv-templates"

function LogSection({ section }: { section: CvDisplaySection }) {
  if (section.content.type !== "log" || section.content.entries.length === 0) return null
  return (
    <section className="region-section region-log" aria-labelledby={`cv-${section.id}`}>
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
  return (
    <article className="region-entry">
      {entry.dates && <time className="region-entry__date">{entry.dates}</time>}
      <div className="region-entry__content">
        <div className="region-entry__heading">
          <div>
            <h3>{entry.title}</h3>
            {entry.subtitle && <p className="region-entry__subtitle">{entry.subtitle}</p>}
          </div>
          {entry.url && <a href={entry.url} target="_blank" rel="noreferrer" aria-label={`Open ${entry.title}`}>↗</a>}
        </div>
        {entry.bullets.length > 0 && (
          <ul className="region-entry__bullets">
            {entry.bullets.map((bullet, index) => <li key={`${bullet}-${index}`}>{bullet}</li>)}
          </ul>
        )}
        {entry.tags.length > 0 && (
          <ul className="region-tags region-tags--entry" aria-label={`${entry.title} skills`}>
            {entry.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
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
            <h3>{group.category}</h3>
            <ul className="region-tags">{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
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
        <ul>{content.items.map((item) => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.label}</a></li>)}</ul>
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
  const sidebar = data.sections.filter((section) => section.placement === "sidebar")
  const main = data.sections.filter((section) => section.placement === "main")
  const role = data.targetRoleOverride?.trim() || data.title
  const hasSidebar = sidebar.length > 0

  return (
    <>
      <style>{regionalStyles}</style>
      <article
        className={`cv-document regional-cv regional-cv--${layout} ${hasSidebar ? "regional-cv--has-sidebar" : ""}`}
        style={{ "--cv-accent": definition.accent } as React.CSSProperties}
        lang={data.documentLanguage ?? "en"}
      >
        <header className="region-header">
          <Portrait data={data} profilePicture={profilePicture} />
          <div className="region-header__identity">
            <p className="region-header__eyebrow">Curriculum Vitae</p>
            <h1>{data.name}</h1>
            <p className="region-header__role">{role}</p>
          </div>
          <address className="region-contact">
            {data.location && <span>{data.location}</span>}
            {data.email && <a href={`mailto:${data.email}`}>{data.email}</a>}
            {data.phone && <a href={`tel:${data.phone.replace(/\s/g, "")}`}>{data.phone}</a>}
            {data.piva && <span>{data.piva}</span>}
          </address>
        </header>

        <PersonalDetails data={data} />

        <div className="region-body">
          {hasSidebar && (
            <aside className="region-sidebar">
              {sidebar.map((section) => <RenderSection key={section.id} section={section} summaryOverride={data.summaryOverride} />)}
            </aside>
          )}
          <main className="region-main">
            {main.map((section) => <RenderSection key={section.id} section={section} summaryOverride={data.summaryOverride} />)}
          </main>
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
    width: 210mm; max-width: 100%; min-height: 297mm; box-sizing: border-box;
    background: var(--cv-paper); color: var(--cv-ink); padding: 18mm 18mm 16mm;
    box-shadow: 0 22px 55px rgba(15,23,42,.14); font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt; line-height: 1.45; overflow-wrap: anywhere;
  }
  .region-header { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: start; gap: 16px; padding-bottom: 14px; border-bottom: 2px solid var(--cv-accent); }
  .region-header__eyebrow { margin: 0 0 5px; color: var(--cv-accent); font-size: 7pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
  .region-header h1 { margin: 0; font-size: 25pt; line-height: 1; letter-spacing: -.035em; }
  .region-header__role { margin: 7px 0 0; color: var(--cv-muted); font-size: 11pt; font-weight: 600; }
  .region-contact { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; max-width: 65mm; font-style: normal; font-size: 8.5pt; text-align: right; }
  .region-contact a { color: inherit; text-decoration: none; }
  .region-portrait { position: relative; width: 27mm; height: 32mm; overflow: hidden; background: var(--cv-soft); }
  .region-portrait img { width: 100%; height: 100%; object-fit: cover; }
  .region-personal { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 10px 0 0; padding: 8px 0; border-bottom: 1px solid #d9dee2; font-size: 8pt; }
  .region-personal div { display: flex; gap: 5px; } .region-personal dt { color: var(--cv-muted); } .region-personal dd { margin: 0; font-weight: 600; }
  .region-body { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 16px; }
  .regional-cv--has-sidebar .region-body { grid-template-columns: 54mm minmax(0,1fr); }
  .region-sidebar { padding-right: 13px; border-right: 1px solid #d9dee2; }
  .region-main { min-width: 0; }
  .region-sidebar, .region-main { display: flex; flex-direction: column; gap: 15px; }
  .region-section { break-inside: avoid; page-break-inside: avoid; }
  .region-section > h2 { margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid #cbd1d6; color: var(--cv-accent); font-size: 9pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; break-after: avoid; }
  .region-text p { margin: 0; color: #39434c; }
  .region-log__items { display: flex; flex-direction: column; gap: 11px; }
  .region-entry { display: grid; grid-template-columns: minmax(0,1fr); gap: 3px; break-inside: avoid; }
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
  .regional-cv--french_speaking_concise .region-header { margin:-12mm -14mm 0; padding:12mm 14mm 8mm; background:#eef4f7; border:0; }
  .regional-cv--french_speaking_concise .region-body { grid-template-columns:51mm minmax(0,1fr); gap:7mm; }
  .regional-cv--french_speaking_concise .region-sidebar { padding-right:7mm; }
  .regional-cv--french_speaking_concise .region-main, .regional-cv--french_speaking_concise .region-sidebar { gap:10px; }

  .regional-cv--dutch_tailored { --cv-accent:#e05b26; padding:16mm 18mm 16mm 23mm; border-left:5mm solid var(--cv-accent); }
  .regional-cv--dutch_tailored .region-header { border:0; }
  .regional-cv--dutch_tailored .region-header h1 { font-size:28pt; }
  .regional-cv--dutch_tailored .region-section > h2 { border:0; padding:0; }

  .regional-cv--southern_european { --cv-accent:#9a3412; padding:15mm; }
  .regional-cv--southern_european .region-header { margin:-15mm -15mm 0; padding:12mm 15mm 9mm; color:#fff; background:var(--cv-accent); border:0; }
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

  @media screen and (max-width: 720px) {
    .regional-cv { min-height:0; }
  }
  @media print {
    .regional-cv { width:210mm; max-width:none; min-height:0; box-shadow:none; }
    .region-entry, .region-section { break-inside:avoid; page-break-inside:avoid; }
  }
`
