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
  const openDocumentHref = project.document
    ? `/api/content/document/open?publicId=${encodeURIComponent(project.document.publicId)}&format=${encodeURIComponent(project.document.format)}&resourceType=${encodeURIComponent(project.document.resourceType)}`
    : null

  return (
    <div className={`min-h-screen bg-background text-foreground grid-pattern ${activeTheme}`}>
      <TechCursor />
      <main className="relative z-10 mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/?theme=${activeTheme}`}
            className="inline-flex items-center gap-2 border border-primary/60 bg-card px-3 py-2 text-xs sm:text-sm font-mono text-primary hover:border-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK_TO_PORTFOLIO
          </Link>
          <p className="text-[10px] sm:text-xs font-mono text-muted-foreground">
            {category.name}_PROJECT / {project.status}
          </p>
        </div>

        <section className="relative border border-primary/30 bg-card/60 p-1.5 sm:p-2.5">
          <div className="relative overflow-hidden border border-primary/20 min-h-[72vh] sm:min-h-[78vh] bg-black">
            {project.image?.secureUrl ? (
              <img
                src={project.image.secureUrl}
                alt={`${project.title} cover`}
                className="h-full min-h-[72vh] sm:min-h-[78vh] w-full object-contain"
              />
            ) : (
              <div className="h-full min-h-[72vh] sm:min-h-[78vh] w-full bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(circle_at_75%_30%,rgba(6,182,212,0.25),transparent_60%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(2,6,23,1))]" />
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/82 to-black/20 px-4 sm:px-8 py-4 sm:py-7 backdrop-blur-[1px]">
              <h1 className="text-lg sm:text-3xl font-bold font-mono text-slate-100 mb-2 tracking-wide">
                {project.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-4xl whitespace-pre-line">
                {project.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-cyan-300/45 bg-black/55 px-3 py-2 text-[11px] sm:text-xs font-mono text-cyan-100 hover:border-cyan-200/80 hover:text-cyan-50"
                  >
                    <Github className="h-4 w-4" />
                    GITHUB
                  </a>
                )}
                {project.projectUrl && (
                  <a
                    href={project.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-cyan-300/45 bg-black/55 px-3 py-2 text-[11px] sm:text-xs font-mono text-cyan-100 hover:border-cyan-200/80 hover:text-cyan-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    LIVE_PROJECT
                  </a>
                )}
                {project.document && (
                  <a
                    href={openDocumentHref ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-cyan-300/45 bg-black/55 px-3 py-2 text-[11px] sm:text-xs font-mono text-cyan-100 hover:border-cyan-200/80 hover:text-cyan-50"
                  >
                    <FileText className="h-4 w-4" />
                    OPEN_PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
