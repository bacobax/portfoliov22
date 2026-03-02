import Image, { type StaticImageData } from "next/image"

import type { CvData } from "./cv-types"

export function ClassicLayout({ data, profilePicture }: { data: CvData; profilePicture: StaticImageData }) {
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
            <ul className="links-list">
              {data.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                  :
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {" "}{link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <section className="summary">
          <h2>Professional Summary</h2>
          <p>{data.summary}</p>
        </section>

        <section>
          <h2>Skills</h2>
          <div className="grid-two-column">
            {Object.entries(data.skills).map(([category, items]) => (
              <article key={category}>
                <h3>{category}</h3>
                <ul className="skills-list">
                  {items.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2>Experience</h2>
          {data.experience.map((job) => (
            <article key={`${job.company}-${job.role}-${job.dates}`} className="experience-item">
              <div>
                <h3>{job.role}</h3>
                <p className="summary-text">{job.company} · {job.location}</p>
                <ul className="bullets">
                  {job.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
                {job.stack.length > 0 ? (
                  <ul className="inline-list">
                    {job.stack.map((tech) => (
                      <li key={tech}>{tech}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="experience-meta">{job.dates}</div>
            </article>
          ))}
        </section>

        {data.projects.length > 0 ? (
          <section>
            <h2>Projects</h2>
            {data.projects.map((project) => (
              <article key={`${project.name}-${project.role}`} className="project-item">
                <div>
                  <h3>{project.name}</h3>
                  <p className="summary-text">{project.role}</p>
                  <ul className="bullets">
                    {project.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                  {project.link ? (
                    <p className="summary-text">
                      <a href={project.link} target="_blank" rel="noreferrer">
                        View Project
                      </a>
                    </p>
                  ) : null}
                </div>
                <div className="project-meta">{project.date}</div>
              </article>
            ))}
          </section>
        ) : null}

        <section>
          <h2>Education</h2>
          {data.education.map((item) => (
            <article key={`${item.degree}-${item.school}`} className="education-item">
              <div>
                <h3>{item.degree}</h3>
                <p className="summary-text">{item.school}</p>
                <ul className="bullets">
                  {item.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
              <div className="education-meta">{item.year}</div>
            </article>
          ))}
        </section>

        {data.certs.length > 0 ? (
          <section>
            <h2>Certifications</h2>
            <ul className="bullets">
              {data.certs.map((cert) => (
                <li key={cert}>{cert}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.languages.length > 0 ? (
          <section>
            <h2>Languages</h2>
            <ul className="bullets">
              {data.languages.map((language) => (
                <li key={language}>{language}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.awards.length > 0 ? (
          <section>
            <h2>Awards</h2>
            <ul className="bullets">
              {data.awards.map((award) => (
                <li key={award}>{award}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.publications.length > 0 ? (
          <section>
            <h2>Publications</h2>
            <ul className="bullets">
              {data.publications.map((publication) => (
                <li key={publication}>{publication}</li>
              ))}
            </ul>
          </section>
        ) : null}
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
  .cv-classic .experience-item,
  .cv-classic .project-item,
  .cv-classic .education-item {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding-bottom: 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .cv-classic .experience-item h3,
  .cv-classic .project-item h3,
  .cv-classic .education-item h3 {
    font-size: 10.5pt;
    margin: 0 0 4px;
    letter-spacing: 0.05em;
  }
  .cv-classic .summary-text {
    font-size: 9.5pt;
    color: #475569;
    margin: 0 0 6px;
  }
  .cv-classic .experience-meta,
  .cv-classic .project-meta,
  .cv-classic .education-meta {
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
      width: auto;
      min-height: auto;
      padding: 18mm 16mm;
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
    .cv-classic .experience-item,
    .cv-classic .project-item,
    .cv-classic .education-item {
      grid-template-columns: 1fr;
      gap: 4px;
    }
    .cv-classic .experience-meta,
    .cv-classic .project-meta,
    .cv-classic .education-meta {
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
