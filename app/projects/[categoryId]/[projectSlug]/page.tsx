import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, FileText, Github } from "lucide-react"

import { TechCursor } from "@/components/tech-cursor"
import { loadPortfolioContent } from "@/lib/portfolio-content"
import { toProjectSlug } from "@/lib/project-path"

type ProjectPageParams = {
  categoryId: string
  projectSlug: string
}

const findProject = async ({ categoryId, projectSlug }: ProjectPageParams) => {
  const content = await loadPortfolioContent()
  const category = content.projectCategories.find((candidate) => candidate.id === categoryId)

  if (!category) {
    return null
  }

  const project = category.projects.find((candidate) => toProjectSlug(candidate.title) === projectSlug)

  if (!project) {
    return null
  }

  return { category, project }
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<ProjectPageParams>
  searchParams: Promise<{ theme?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const data = await findProject(resolvedParams)

  if (!data) {
    notFound()
  }

  const { category, project } = data
  const activeTheme = resolvedSearchParams.theme === "light" ? "light" : "dark"
  const metricEntries = Object.entries(project.metrics)
  const openDocumentHref = project.document
    ? `/api/content/document/open?publicId=${encodeURIComponent(project.document.publicId)}&format=${encodeURIComponent(project.document.format)}&resourceType=${encodeURIComponent(project.document.resourceType)}`
    : null

  return (
    <div className={`min-h-screen bg-background text-foreground ${activeTheme}`}>
      <TechCursor />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.52_0.18_195/.07)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.52_0.18_195/.07)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/?theme=${activeTheme}`}
            className="inline-flex items-center gap-2 border border-primary/55 bg-card/80 px-4 py-2.5 text-xs font-mono tracking-wide text-primary transition-colors hover:border-primary hover:bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK TO PORTFOLIO
          </Link>

          <div className="inline-flex items-center gap-2 border border-border/60 bg-card/60 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            <span>{category.name}</span>
            <span className="text-primary/70">/</span>
            <span>{project.status}</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <article className="relative overflow-hidden border border-border/70 bg-card/65 p-5 sm:p-7 backdrop-blur-sm">
            <div className="mb-5 inline-flex items-center border border-primary/50 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-primary">
              Project Spotlight
            </div>

            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              {project.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {project.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-primary/55 bg-primary/10 px-4 py-2.5 text-xs font-mono tracking-wide text-primary transition-colors hover:bg-primary/20"
                >
                  <Github className="h-4 w-4" />
                  SOURCE CODE
                </a>
              )}
              {project.projectUrl && (
                <a
                  href={project.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-xs font-mono tracking-wide text-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  LIVE DEMO
                </a>
              )}
              {project.document && (
                <a
                  href={openDocumentHref ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-xs font-mono tracking-wide text-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  <FileText className="h-4 w-4" />
                  PROJECT PDF
                </a>
              )}
            </div>
          </article>

          <aside className="relative overflow-hidden border border-primary/35 bg-black/90">
            {project.image?.secureUrl ? (
              <img
                src={project.image.secureUrl}
                alt={`${project.title} cover`}
                className="h-full min-h-[300px] w-full object-cover"
              />
            ) : (
              <div className="h-full min-h-[300px] w-full bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.32),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(8,145,178,0.25),transparent_60%),linear-gradient(160deg,rgba(2,6,23,1),rgba(2,20,37,1))]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,.75),rgba(2,6,23,.15)_55%,transparent)]" />
          </aside>
        </section>

        {metricEntries.length > 0 ? (
          <section className="mt-6 border border-border/70 bg-card/60 p-5 sm:p-7 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-mono uppercase tracking-[0.2em] text-primary">Impact Metrics</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metricEntries.map(([label, value]) => (
                <article key={label} className="border border-border/70 bg-background/60 p-4">
                  <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">{value}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 border border-border/70 bg-card/50 p-5 sm:p-7">
          <h2 className="mb-3 text-sm font-mono uppercase tracking-[0.2em] text-primary">Overview</h2>
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {project.description}
          </p>
        </section>
      </main>
    </div>
  )
}
