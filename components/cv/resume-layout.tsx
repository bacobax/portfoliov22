import Image, { type StaticImageData } from "next/image"

import type { CvData, CvDisplaySection, CvDisplayContent, CvDisplayLogEntry } from "./cv-types"

/* ── Section renderers (résumé-style) ── */

function RLogSection({ title, entries }: { title: string; entries: CvDisplayLogEntry[] }) {
  if (entries.length === 0) return null
  return (
    <section className="r-section">
      <h2 className="r-section__heading">{title}</h2>
      {entries.map((entry, i) => (
        <div key={i} className="r-entry">
          <div className="r-entry__header">
            <div>
              <h3 className="r-entry__title">
                {entry.title}
                {entry.url && (
                  <a href={entry.url} target="_blank" rel="noreferrer" className="r-entry__link"> ↗</a>
                )}
              </h3>
              {entry.subtitle && <p className="r-entry__sub">{entry.subtitle}</p>}
            </div>
            {entry.dates && <span className="r-entry__date">{entry.dates}</span>}
          </div>
          {entry.bullets.length > 0 && (
            <ul className="r-entry__bullets">
              {entry.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          )}
          {entry.tags.length > 0 && (
            <div className="r-entry__stack">
              {entry.tags.map((t) => <span key={t} className="r-stack-tag">{t}</span>)}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

function RTagsSection({ title, groups }: { title: string; groups: { category: string; items: string[] }[] }) {
  if (groups.length === 0) return null
  return (
    <section className="r-section">
      <h2 className="r-section__heading">{title}</h2>
      {groups.map((g) => (
        <div key={g.category} className="r-skill-group">
          <h3 className="r-skill-group__title">{g.category}</h3>
          <div className="r-skill-tags">
            {g.items.map((item) => <span key={item} className="r-skill-tag">{item}</span>)}
          </div>
        </div>
      ))}
    </section>
  )
}

function RTextSection({ title, text }: { title: string; text: string }) {
  if (!text) return null
  return (
    <section className="r-section">
      <h2 className="r-section__heading">{title}</h2>
      <p className="r-text">{text}</p>
    </section>
  )
}

function RLinksSection({ title, items }: { title: string; items: { label: string; url: string }[] }) {
  if (items.length === 0) return null
  return (
    <section className="r-section">
      <h2 className="r-section__heading">{title}</h2>
      <ul className="r-simple-list">
        {items.map((link) => (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RSimpleListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="r-section">
      <h2 className="r-section__heading">{title}</h2>
      <ul className="r-simple-list">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  )
}

function RenderResumeSection({ section }: { section: CvDisplaySection }) {
  const c = section.content
  switch (c.type) {
    case "log":        return <RLogSection title={section.title} entries={c.entries} />
    case "tags":       return <RTagsSection title={section.title} groups={c.groups} />
    case "text":       return <RTextSection title={section.title} text={c.text} />
    case "links":      return <RLinksSection title={section.title} items={c.items} />
    case "simple-list": return <RSimpleListSection title={section.title} items={c.items} />
  }
}

/* ── Main resume layout ── */

export function ResumeLayout({ data, profilePicture }: { data: CvData; profilePicture: StaticImageData }) {
  const sidebarSections = data.sections.filter((s) => s.placement === "sidebar")
  const mainSections = data.sections.filter((s) => s.placement === "main")

  // For header contact: extract links section
  const linksSection = data.sections.find((s) => s.content.type === "links")
  const headerLinks = linksSection?.content.type === "links" ? linksSection.content.items : []

  return (
    <>
      <style>{resumeStyles}</style>
      <article className="cv-document cv-resume">
        {/* ── Header ── */}
        <header className="r-header">
          <div className="r-header__photo">
            <Image src={profilePicture} alt={`${data.name} portrait`} fill sizes="96px" priority />
          </div>

          <div className="r-header__info">
            <h1 className="r-header__name">{data.name}</h1>
            <p className="r-header__title">{data.title}</p>
          </div>

          <div className="r-header__contact">
            {data.email && <span>{data.email}</span>}
            {data.phone && <span>{data.phone}</span>}
            <span>{data.location}</span>
            {headerLinks.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
            ))}
          </div>
        </header>

        <div className="r-body">
          {/* ── Left Column ── */}
          <aside className="r-sidebar">
            {sidebarSections.map((section) => (
              <RenderResumeSection key={section.id} section={section} />
            ))}
          </aside>

          {/* ── Main Column ── */}
          <main className="r-main">
            {mainSections.map((section) => (
              <RenderResumeSection key={section.id} section={section} />
            ))}
          </main>
        </div>
      </article>
    </>
  )
}


/* ---------- Résumé-specific styles ---------- */
const resumeStyles = `
  .cv-resume {
    width: 210mm;
    max-width: 100%;
    min-height: 297mm;
    background: #ffffff;
    color: #1e293b;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.4;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Header ── */
  .r-header {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #0f172a;
    color: #f8fafc;
    padding: 16px 24px;
  }
  .r-header__photo {
    position: relative;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #38bdf8;
    flex-shrink: 0;
  }
  .r-header__photo img {
    object-fit: cover;
  }
  .r-header__info {
    flex: 1;
  }
  .r-header__name {
    font-size: 18pt;
    font-weight: 800;
    letter-spacing: 0.04em;
    margin: 0;
    line-height: 1.1;
  }
  .r-header__title {
    font-size: 9.5pt;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin: 2px 0 0;
    text-transform: uppercase;
  }
  .r-header__contact {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    font-size: 8pt;
    color: #cbd5e1;
    white-space: nowrap;
  }
  .r-header__contact a {
    color: #38bdf8;
    text-decoration: none;
  }
  .r-header__contact a:hover {
    text-decoration: underline;
  }

  /* ── Body layout ── */
  .r-body {
    display: grid;
    grid-template-columns: 190px 1fr;
    flex: 1;
  }

  /* ── Sidebar ── */
  .r-sidebar {
    background: #f1f5f9;
    padding: 14px 14px;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ── Main ── */
  .r-main {
    padding: 14px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ── Section headings ── */
  .r-section__heading {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #0f172a;
    margin: 0 0 6px;
    padding-bottom: 3px;
    border-bottom: 2px solid #0f172a;
  }
  .r-sidebar .r-section__heading {
    border-bottom-color: #94a3b8;
    color: #334155;
  }

  /* ── Text blocks ── */
  .r-text {
    margin: 0;
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.45;
  }

  /* ── Skill groups ── */
  .r-skill-group {
    margin-bottom: 6px;
  }
  .r-skill-group__title {
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #334155;
    margin: 0 0 3px;
  }
  .r-skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .r-skill-tag {
    font-size: 7.5pt;
    background: #e2e8f0;
    color: #334155;
    padding: 1px 5px;
    border-radius: 3px;
  }

  /* ── Simple list (languages, certs, links) ── */
  .r-simple-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .r-simple-list li {
    font-size: 8.5pt;
    color: #475569;
    padding: 1px 0;
  }
  .r-simple-list a {
    color: #0f172a;
    text-decoration: none;
    font-weight: 500;
  }
  .r-simple-list a:hover {
    text-decoration: underline;
  }

  /* ── Timeline entries (experience, projects, education) ── */
  .r-entry {
    padding-bottom: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .r-entry + .r-entry {
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }
  .r-entry__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 2px;
  }
  .r-entry__title {
    font-size: 9.5pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    line-height: 1.2;
  }
  .r-entry__link {
    color: #38bdf8;
    text-decoration: none;
    margin-left: 4px;
    font-size: 8.5pt;
  }
  .r-entry__sub {
    font-size: 8.5pt;
    color: #64748b;
    margin: 1px 0 0;
  }
  .r-entry__date {
    font-size: 8pt;
    color: #64748b;
    white-space: nowrap;
    flex-shrink: 0;
    padding-top: 1px;
  }
  .r-entry__bullets {
    margin: 3px 0 0;
    padding-left: 0;
    font-size: 8.5pt;
    color: #334155;
    list-style: none;
  }
  .r-entry__bullets li {
    margin-bottom: 1px;
  }
  .r-entry__stack {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 3px;
  }
  .r-stack-tag {
    font-size: 7pt;
    border: 1px solid #cbd5e1;
    color: #475569;
    padding: 1px 5px;
    border-radius: 3px;
  }

  @media print {
    .cv-resume {
      box-shadow: none;
      width: auto;
      min-height: auto;
    }
    .r-header {
      flex-direction: row;
      align-items: flex-start;
      text-align: left;
      gap: 0;
      padding: 16px 22px;
    }
    .r-header__info {
      align-items: flex-start;
    }
    .r-header__name {
      font-size: 18pt;
    }
    .r-header__title {
      font-size: 9pt;
    }
    .r-header__contact {
      align-items: flex-end;
      white-space: nowrap;
      text-align: right;
    }
    .r-body {
      grid-template-columns: 190px 1fr;
    }
    .r-sidebar {
      border-right: 1px solid #e2e8f0;
      border-bottom: none;
      padding: 14px;
    }
    .r-main {
      padding: 14px 22px;
    }
    .r-section__heading {
      font-size: 8pt;
    }
    .r-entry {
      padding-bottom: 8px;
    }
    .r-entry__header {
      flex-direction: row;
      gap: 12px;
    }
    .r-entry__date {
      white-space: nowrap;
    }
    .r-tag {
      font-size: 7.5pt;
    }
  }
  @media screen and (max-width: 768px) {
    .cv-resume {
      width: 100%;
      min-height: auto;
    }
    .r-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      padding: 14px 12px;
    }
    .r-header__info {
      align-items: center;
    }
    .r-header__name {
      font-size: 14pt;
    }
    .r-header__title {
      font-size: 8.5pt;
    }
    .r-header__contact {
      align-items: center;
      white-space: normal;
      text-align: center;
    }
    .r-body {
      grid-template-columns: 1fr;
    }
    .r-sidebar {
      border-right: none;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px;
    }
    .r-main {
      padding: 12px;
    }
    .r-section__heading {
      font-size: 8pt;
    }
    .r-entry {
      padding: 6px 0;
    }
    .r-entry__header {
      flex-direction: column;
      gap: 2px;
    }
    .r-entry__date {
      white-space: normal;
    }
    .r-tag {
      font-size: 6.5pt;
    }
  }
`
