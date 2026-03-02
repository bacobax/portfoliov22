import Image, { type StaticImageData } from "next/image"

import type { CvData, CvDisplaySection, CvDisplayContent, CvDisplayLogEntry } from "./cv-types"

/* ── Section renderers ── */

function LogSection({ title, entries }: { title: string; entries: CvDisplayLogEntry[] }) {
  if (entries.length === 0) return null
  return (
    <section>
      <h2>{title}</h2>
      {entries.map((entry, i) => (
        <article key={i} className="log-item">
          <div>
            <h3>
              {entry.title}
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noreferrer" className="log-link"> ↗</a>
              )}
            </h3>
            {entry.subtitle && <p className="summary-text">{entry.subtitle}</p>}
            {entry.bullets.length > 0 && (
              <ul className="bullets">
                {entry.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            )}
            {entry.tags.length > 0 && (
              <ul className="inline-list">
                {entry.tags.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
          {entry.dates && <div className="log-meta">{entry.dates}</div>}
        </article>
      ))}
    </section>
  )
}

function TagsSection({ title, groups }: { title: string; groups: { category: string; items: string[] }[] }) {
  if (groups.length === 0) return null
  return (
    <section>
      <h2>{title}</h2>
      <div className="grid-two-column">
        {groups.map((g) => (
          <article key={g.category}>
            <h3>{g.category}</h3>
            <ul className="skills-list">
              {g.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

function TextSection({ title, text }: { title: string; text: string }) {
  if (!text) return null
  return (
    <section className="summary">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  )
}

function LinksSection({ title, items }: { title: string; items: { label: string; url: string }[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2>{title}</h2>
      <ul className="links-list">
        {items.map((link) => (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
            : <a href={link.url} target="_blank" rel="noreferrer">{link.url}</a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SimpleListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2>{title}</h2>
      <ul className="bullets">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  )
}

function RenderSection({ section }: { section: CvDisplaySection }) {
  const c = section.content
  switch (c.type) {
    case "log":        return <LogSection title={section.title} entries={c.entries} />
    case "tags":       return <TagsSection title={section.title} groups={c.groups} />
    case "text":       return <TextSection title={section.title} text={c.text} />
    case "links":      return <LinksSection title={section.title} items={c.items} />
    case "simple-list": return <SimpleListSection title={section.title} items={c.items} />
  }
}

/* ── Main layout ── */

export function ClassicLayout({ data, profilePicture }: { data: CvData; profilePicture: StaticImageData }) {
  // Find a links section for the header contact
  const linksSection = data.sections.find((s) => s.content.type === "links")
  const headerLinks = linksSection?.content.type === "links" ? linksSection.content.items : []

  // All sections except header links (rendered inline in header) — render in array order
  const bodySections = data.sections.filter((s) => s.id !== linksSection?.id || s.content.type !== "links")

  return (
    <>
      <style>{classicStyles}</style>
      <article className="cv-document cv-classic">
        <header className="cv-header">
          <div className="identity">
            <div className="profile-photo">
              <Image src={profilePicture} alt={`${data.name} portrait`} fill sizes="84px" priority />
            </div>
            <div>
              <h1>{data.name}</h1>
              <p className="title">{data.title}</p>
              <p className="summary-text">{data.location}</p>
              <p className="summary-text">{data.piva}</p>
            </div>
          </div>
          <div className="contact">
            {data.phone ? <p>{data.phone}</p> : null}
            {headerLinks.length > 0 && (
              <ul className="links-list">
                {headerLinks.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                    : <a href={link.url} target="_blank" rel="noreferrer"> {link.url}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {bodySections.map((section) => (
          <RenderSection key={section.id} section={section} />
        ))}
      </article>
    </>
  )
}

const classicStyles = `
  .cv-classic {
    width: 210mm;
    max-width: 100%;
    min-height: 297mm;
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
    padding: 24mm 22mm;
    font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .cv-classic header.cv-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    border-bottom: 1px solid #cbd5f5;
    padding-bottom: 12px;
    text-transform: uppercase;
  }
  .cv-classic .identity {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .cv-classic .profile-photo {
    position: relative;
    width: 200px;
    height: 200px;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid #0f172a;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  }
  .cv-classic .profile-photo img {
    object-fit: cover;
  }
  .cv-classic h1 {
    font-size: 20pt;
    letter-spacing: 0.08em;
    margin: 0 0 4px;
  }
  .cv-classic .title {
    font-size: 11pt;
    font-weight: 600;
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }
  .cv-classic .contact p,
  .cv-classic .contact a {
    font-size: 9.5pt;
    margin: 0;
    color: #0f172a;
    text-decoration: none;
  }
  .cv-classic .contact a:hover {
    text-decoration: underline;
  }
  .cv-classic section > h2 {
    font-size: 11pt;
    letter-spacing: 0.2em;
    font-weight: 700;
    margin-bottom: 8px;
    border-bottom: 1px solid #cbd5f5;
    padding-bottom: 4px;
    break-after: avoid;
    page-break-after: avoid;
  }
  .cv-classic .summary {
    font-size: 10pt;
    text-transform: none;
  }
  .cv-classic .summary p {
    margin: 0;
  }
  .cv-classic .grid-two-column {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .cv-classic .grid-two-column h3 {
    font-size: 10pt;
    letter-spacing: 0.08em;
    margin: 0 0 6px;
  }
  .cv-classic .skills-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .cv-classic .skills-list li {
    font-size: 10pt;
    text-transform: none;
  }
  .cv-classic .log-item {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding-bottom: 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .cv-classic .log-item h3 {
    font-size: 10.5pt;
    margin: 0 0 4px;
    letter-spacing: 0.05em;
  }
  .cv-classic .log-link {
    color: #3b82f6;
    text-decoration: none;
    font-size: 9pt;
  }
  .cv-classic .summary-text {
    font-size: 9.5pt;
    color: #475569;
    margin: 0 0 6px;
  }
  .cv-classic .log-meta {
    font-size: 9.5pt;
    color: #475569;
    white-space: nowrap;
  }
  .cv-classic ul.bullets {
    margin: 0;
    padding-left: 0;
    font-size: 10pt;
    list-style: none;
  }
  .cv-classic ul.inline-list {
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 9.5pt;
  }
  .cv-classic ul.inline-list li {
    border: 1px solid #cbd5f5;
    padding: 2px 6px;
  }
  .cv-classic .links-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .cv-classic .links-list li {
    margin-bottom: 4px;
  }
  .cv-classic .links-list a {
    color: #0f172a;
    text-decoration: none;
    font-size: 9.5pt;
    text-transform: none;
  }
  .cv-classic .links-list a:hover {
    text-decoration: underline;
  }
  @media print {
    .cv-classic {
      box-shadow: none;
      width: 210mm;
      min-height: auto;
      display: block;          /* allow natural page-break fragmentation */
      padding: 18mm 16mm;
      font-size: 10pt;
    }
    .cv-classic > * + * {
      margin-top: 18px;        /* replaces gap: 18px for display:block */
    }
    .cv-classic header.cv-header {
      flex-direction: row;
      align-items: flex-start;
      gap: 16px;
    }
    .cv-classic .identity {
      flex-direction: row;
      align-items: center;
      text-align: left;
      gap: 16px;
    }
    .cv-classic .profile-photo {
      width: 200px;
      height: 200px;
    }
    .cv-classic h1 {
      font-size: 20pt;
    }
    .cv-classic .title {
      font-size: 11pt;
    }
    .cv-classic .contact {
      text-align: right;
    }
    .cv-classic .contact p,
    .cv-classic .contact a {
      font-size: 9.5pt;
    }
    .cv-classic section > h2 {
      font-size: 11pt;
    }
    .cv-classic .log-item {
      grid-template-columns: 1fr auto;
      gap: 12px;
    }
    .cv-classic .log-meta {
      white-space: nowrap;
      font-size: 9.5pt;
    }
    .cv-classic .grid-two-column {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }
    .cv-classic ul.inline-list {
      gap: 8px;
      font-size: 9.5pt;
    }
    .cv-classic .links-list a {
      font-size: 9.5pt;
      word-break: normal;
    }
  }
  @media screen and (max-width: 768px) {
    .cv-classic {
      width: 100%;
      min-height: auto;
      padding: 20px 16px;
      font-size: 9.5pt;
      gap: 14px;
    }
    .cv-classic header.cv-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .cv-classic .identity {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .cv-classic .profile-photo {
      width: 120px;
      height: 120px;
    }
    .cv-classic h1 {
      font-size: 16pt;
    }
    .cv-classic .title {
      font-size: 10pt;
    }
    .cv-classic .contact {
      text-align: center;
    }
    .cv-classic .contact p,
    .cv-classic .contact a {
      font-size: 8.5pt;
    }
    .cv-classic section > h2 {
      font-size: 10pt;
    }
    .cv-classic .log-item {
      grid-template-columns: 1fr;
      gap: 4px;
    }
    .cv-classic .log-meta {
      white-space: normal;
      font-size: 8.5pt;
    }
    .cv-classic .grid-two-column {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .cv-classic ul.inline-list {
      gap: 4px;
      font-size: 8.5pt;
    }
    .cv-classic .links-list a {
      font-size: 8.5pt;
      word-break: break-all;
    }
  }
`
