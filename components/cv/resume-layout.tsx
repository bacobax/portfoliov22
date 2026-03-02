import Image, { type StaticImageData } from "next/image"

import type { CvData } from "./cv-types"

export function ResumeLayout({ data, profilePicture }: { data: CvData; profilePicture: StaticImageData }) {
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
            {data.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        </header>

        <div className="r-body">
          {/* ── Left Column ── */}
          <aside className="r-sidebar">
            {/* Profile */}
            <section className="r-section">
              <h2 className="r-section__heading">Profile</h2>
              <p className="r-text">{data.summary}</p>
            </section>

            {/* Skills */}
            <section className="r-section">
              <h2 className="r-section__heading">Skills</h2>
              {Object.entries(data.skills).map(([category, items]) => (
                <div key={category} className="r-skill-group">
                  <h3 className="r-skill-group__title">{category}</h3>
                  <div className="r-skill-tags">
                    {items.map((skill) => (
                      <span key={skill} className="r-skill-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Languages */}
            {data.languages.length > 0 && (
              <section className="r-section">
                <h2 className="r-section__heading">Languages</h2>
                <ul className="r-simple-list">
                  {data.languages.map((lang) => (
                    <li key={lang}>{lang}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Certifications */}
            {data.certs.length > 0 && (
              <section className="r-section">
                <h2 className="r-section__heading">Certifications</h2>
                <ul className="r-simple-list">
                  {data.certs.map((cert) => (
                    <li key={cert}>{cert}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Links */}
            <section className="r-section">
              <h2 className="r-section__heading">Links</h2>
              <ul className="r-simple-list">
                {data.links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          {/* ── Main Column ── */}
          <main className="r-main">
            {/* Experience */}
            <section className="r-section">
              <h2 className="r-section__heading">Experience</h2>
              {data.experience.map((job) => (
                <div key={`${job.company}-${job.role}-${job.dates}`} className="r-entry">
                  <div className="r-entry__header">
                    <div>
                      <h3 className="r-entry__title">{job.role}</h3>
                      <p className="r-entry__sub">{job.company}</p>
                    </div>
                    <span className="r-entry__date">{job.dates}</span>
                  </div>
                  <ul className="r-entry__bullets">
                    {job.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  {job.stack.length > 0 && (
                    <div className="r-entry__stack">
                      {job.stack.map((tech) => (
                        <span key={tech} className="r-stack-tag">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* Projects */}
            {data.projects.length > 0 && (
              <section className="r-section">
                <h2 className="r-section__heading">Projects</h2>
                {data.projects.map((project) => (
                  <div key={`${project.name}-${project.role}`} className="r-entry">
                    <div className="r-entry__header">
                      <div>
                        <h3 className="r-entry__title">
                          {project.name}
                          {project.link && (
                            <a href={project.link} target="_blank" rel="noreferrer" className="r-entry__link">
                              ↗
                            </a>
                          )}
                        </h3>
                        <p className="r-entry__sub">{project.role}</p>
                      </div>
                      <span className="r-entry__date">{project.date}</span>
                    </div>
                    <ul className="r-entry__bullets">
                      {project.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {/* Education */}
            <section className="r-section">
              <h2 className="r-section__heading">Education</h2>
              {data.education.map((item) => (
                <div key={`${item.degree}-${item.school}`} className="r-entry">
                  <div className="r-entry__header">
                    <div>
                      <h3 className="r-entry__title">{item.degree}</h3>
                      <p className="r-entry__sub">{item.school}</p>
                    </div>
                    <span className="r-entry__date">{item.year}</span>
                  </div>
                  {item.details.length > 0 && (
                    <ul className="r-entry__bullets">
                      {item.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>

            {/* Awards */}
            {data.awards.length > 0 && (
              <section className="r-section">
                <h2 className="r-section__heading">Awards</h2>
                <ul className="r-entry__bullets">
                  {data.awards.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Publications */}
            {data.publications.length > 0 && (
              <section className="r-section">
                <h2 className="r-section__heading">Publications</h2>
                <ul className="r-entry__bullets">
                  {data.publications.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
            )}
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
