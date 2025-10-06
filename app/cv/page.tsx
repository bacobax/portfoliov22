import { PrintToolbar } from "@/components/cv/print-toolbar"
import CvCursorVisibility from "@/components/cv-cursor-visibility"
import type { PortfolioContent, Project } from "@/lib/default-content"
import { loadPortfolioContent } from "@/lib/portfolio-content"

const CONTACT_EMAIL = "quicksolver02@gmail.com"
const CONTACT_PHONE = ""
const ADDRESS = "Via Entracque, 10, Cuneo (12100)"
const PIVA = "P.IVA: 04081230049 - QuickSolver"

const LINKS = [
  { label: "Email", url: `${CONTACT_EMAIL}` },
  { label: "GitHub", url: "https://github.com/bacobax" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/francesco-bassignana/" },
]

type CvData = {
  name: string
  title: string
  location: string
  email: string
  phone: string
  links: { label: string; url: string }[]
  summary: string
  skills: Record<string, string[]>
  experience: {
    role: string
    company: string
    location: string
    dates: string
    bullets: string[]
    stack: string[]
  }[]
  additionalExperience: string[]
  projects: {
    name: string
    role: string
    date: string
    bullets: string[]
    link?: string
  }[]
  education: {
    degree: string
    school: string
    year: string
    details: string[]
  }[]
  certs: string[]
  publications: string[]
  languages: string[]
  awards: string[]
}

const splitSentences = (value: string): string[] =>
  value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

const formatLabel = (value: string): string => {
  const normalized = value.replace(/_/g, " ").replace(/\s+/g, " ").trim()

  if (!normalized) {
    return normalized
  }

  const hasLowercase = /[a-z]/.test(normalized)
  const hasUppercase = /[A-Z]/.test(normalized)

  if (hasUppercase && !hasLowercase) {
    const lowerCased = normalized.toLowerCase()
    return lowerCased.replace(/(^|[\s/])([a-z])/g, (_, boundary: string, letter: string) =>
      `${boundary}${letter.toUpperCase()}`,
    )
  }

  return normalized
}

const projectMetricsToBullets = (project: Project): string[] =>
  Object.entries(project.metrics).map(([label, metric]) => `${label.toUpperCase()}: ${metric}`)

function createCvData(content: PortfolioContent): CvData {
  const summary = formatLabel(content.profileData.bio)
  const experience = content.experienceLog.map((entry) => ({
    role: formatLabel(entry.title),
    company: formatLabel(entry.company),
    location: ADDRESS,
    dates: entry.year,
    bullets: splitSentences(entry.description),
    stack: entry.tags.map(formatLabel),
  }))

  const projects = content.projectCategories.flatMap((category) =>
    category.projects
      .filter((project) => project.showInCv ?? true)
      .map((project) => ({
        name: formatLabel(project.title),
        role: formatLabel(category.name),
        date: `STATUS: ${formatLabel(project.status)}`,
        bullets: [formatLabel(project.description), ...projectMetricsToBullets(project)],
        link: project.githubUrl,
      })),
  )

  const education = content.educationLog.map((entry) => ({
    degree: formatLabel(entry.degree),
    school: formatLabel(entry.institution),
    year: entry.year,
    details: splitSentences(entry.description),
  }))

  const additionalExperience = [
    `Completed ${formatLabel(content.aboutStats.projects)} projects across disciplines`,
    `Committed ${formatLabel(content.aboutStats.commits)} code contributions`,
    `Over ${formatLabel(content.aboutStats.experience)} of professional experience`,
    `Maintained ${formatLabel(content.aboutStats.efficiency)} delivery efficiency`,
  ]

  return {
    name: formatLabel(content.profileData.name) || "Francesco Bassignana",
    title: formatLabel(content.profileData.title) || "Full Stack Developer",
    location: ADDRESS,
    email: CONTACT_EMAIL,
    phone: CONTACT_PHONE,
    links: LINKS,
    summary,
    skills: {
      FRONTEND: content.skillsData.frontend.map(formatLabel),
      BACKEND: content.skillsData.backend.map(formatLabel),
      DEVOPS: content.skillsData.devops.map(formatLabel),
    },
    experience,
    additionalExperience,
    projects,
    education,
    certs: ["Certified Cambridge B2 English Level"],
    publications: [],
    languages: ["Italian — Native", "English — Cambridge B2 Certified"],
    awards: [],
  }
}

export default async function CvPage() {
  const content = await loadPortfolioContent()
  const DATA = createCvData(content)

  return (
    <div className="cv-page">
      <CvCursorVisibility />
      <style>{`
        :root {
          color-scheme: light;
        }
        @page {
          size: A4;
          margin: 12mm;
        }
        body {
          background: #e5e7eb;
        }
        @media (pointer: fine) {
          .cv-page,
          .cv-page * {
            cursor: auto !important;
          }
        }

        @media (pointer: coarse) {
          .tech-cursor {
            display: none !important;
          }
        }
        .cv-page {
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          min-height: 100vh;
        }
        .cv-document {
          width: 210mm;
          max-width: 100%;
          min-height: 297mm;
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
          padding: 24mm 22mm;
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .toolbar {
          width: 210mm;
          max-width: 100%;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .toolbar__button {
          border: 1px solid #0f172a;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 16px;
          font-size: 10pt;
          letter-spacing: 0.08em;
          font-weight: 600;
          cursor: pointer;
        }
        .toolbar__button:hover {
          background: #1e293b;
        }
        header.cv-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #cbd5f5;
          padding-bottom: 12px;
          text-transform: uppercase;
        }
        .cv-header h1 {
          font-size: 20pt;
          letter-spacing: 0.08em;
          margin: 0 0 4px;
        }
        .cv-header .title {
          font-size: 11pt;
          font-weight: 600;
          letter-spacing: 0.12em;
          margin-bottom: 8px;
        }
        .cv-header .summary-text {
          font-size: 9.5pt;
          margin: 0;
        }
        .cv-header .contact p,
        .cv-header .contact a {
          font-size: 9.5pt;
          margin: 0;
          color: #0f172a;
          text-decoration: none;
        }
        .cv-header .contact a:hover {
          text-decoration: underline;
        }
        section {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        section > h2 {
          font-size: 11pt;
          letter-spacing: 0.2em;
          font-weight: 700;
          margin-bottom: 8px;
          border-bottom: 1px solid #cbd5f5;
          padding-bottom: 4px;
        }
        .summary {
          font-size: 10pt;
          text-transform: none;
        }
        .summary p {
          margin: 0;
        }
        .grid-two-column {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        .grid-two-column h3 {
          font-size: 10pt;
          letter-spacing: 0.08em;
          margin: 0 0 6px;
        }
        .skills-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .skills-list li {
          font-size: 10pt;
          text-transform: none;
        }
        .experience-item,
        .project-item,
        .education-item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          padding-bottom: 12px;
        }
        .experience-item h3,
        .project-item h3,
        .education-item h3 {
          font-size: 10.5pt;
          margin: 0 0 4px;
          letter-spacing: 0.05em;
        }
        .summary-text {
          font-size: 9.5pt;
          color: #475569;
          margin: 0 0 6px;
        }
        .experience-meta,
        .project-meta,
        .education-meta {
          font-size: 9.5pt;
          color: #475569;
          white-space: nowrap;
        }
        ul.bullets {
          margin: 0;
          padding-left: 16px;
          font-size: 10pt;
        }
        ul.inline-list {
          margin: 4px 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 9.5pt;
        }
        ul.inline-list li {
          border: 1px solid #cbd5f5;
          padding: 2px 6px;
        }
        .links-list {
          list-style: none;
          margin: 0;
          padding: 0;
          
        }
        .links-list li {
          margin-bottom: 4px;
        }
        .links-list a {
          color: #0f172a;
          text-decoration: none;
          font-size: 9.5pt;
          text-transform: none; 
        }
        .links-list a:hover {
          text-decoration: underline;
        }
        @media print {
          body {
            background: #ffffff;
          }
          .cv-page {
            padding: 0;
          }
          .cv-document {
            box-shadow: none;
            width: auto;
            min-height: auto;
            padding: 18mm 16mm;
          }
          .toolbar {
            display: none;
          }
        }
      `}</style>
      <PrintToolbar />
      <article className="cv-document">
        <header className="cv-header">
          <div>
            <h1>{DATA.name}</h1>
            <p className="title">{DATA.title}</p>
            <p className="summary-text">{DATA.location}</p>
            <p className="summary-text">{PIVA}</p>
          </div>
          <div className="contact">
            
            {DATA.phone ? <p>{DATA.phone}</p> : null}
            <ul className="links-list">
              {DATA.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>:
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
          <p>{DATA.summary}</p>
        </section>

        <section>
          <h2>Skills</h2>
          <div className="grid-two-column">
            {Object.entries(DATA.skills).map(([category, items]) => (
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
          {DATA.experience.map((job) => (
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

        {DATA.projects.length > 0 ? (
          <section>
            <h2>Projects</h2>
            {DATA.projects.map((project) => (
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
          {DATA.education.map((item) => (
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


        {DATA.certs.length > 0 ? (
          <section>
            <h2>Certifications</h2>
            <ul className="bullets">
              {DATA.certs.map((cert) => (
                <li key={cert}>{cert}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {DATA.languages.length > 0 ? (
          <section>
            <h2>Languages</h2>
            <ul className="bullets">
              {DATA.languages.map((language) => (
                <li key={language}>{language}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {DATA.awards.length > 0 ? (
          <section>
            <h2>Awards</h2>
            <ul className="bullets">
              {DATA.awards.map((award) => (
                <li key={award}>{award}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {DATA.publications.length > 0 ? (
          <section>
            <h2>Publications</h2>
            <ul className="bullets">
              {DATA.publications.map((publication) => (
                <li key={publication}>{publication}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  )
}
