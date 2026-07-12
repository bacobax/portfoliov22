import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Github } from "lucide-react";

import { loadPortfolioContent } from "@/lib/portfolio-content";
import { toProjectSlug } from "@/lib/project-path";
import "@/components/portfolio/editorial-portfolio.css";

type ProjectPageParams = {
  categoryId: string;
  projectSlug: string;
};

const findProject = async ({ categoryId, projectSlug }: ProjectPageParams) => {
  const content = await loadPortfolioContent();
  const category = content.projectCategories.find(
    (candidate) => candidate.id === categoryId,
  );

  if (!category) {
    return null;
  }

  const project = category.projects.find(
    (candidate) => toProjectSlug(candidate.title) === projectSlug,
  );

  if (!project) {
    return null;
  }

  return { category, project };
};

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<ProjectPageParams>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const data = await findProject(resolvedParams);

  if (!data) {
    notFound();
  }

  const { category, project } = data;
  const activeTheme = resolvedSearchParams.theme === "light" ? "light" : "dark";
  const metricEntries = Object.entries(project.metrics);
  const openDocumentHref = project.document
    ? `/api/content/document/open?publicId=${encodeURIComponent(project.document.publicId)}&format=${encodeURIComponent(project.document.format)}&resourceType=${encodeURIComponent(project.document.resourceType)}`
    : null;

  return (
    <div
      className={`editorial-site project-detail-site editorial-dark ${activeTheme === "light" ? "editorial-soft" : ""}`}
    >
      <main className="project-detail-main">
        <header className="wrap project-detail-nav">
          <Link href={`/?theme=${activeTheme}`} className="project-back">
            <ArrowLeft /> Back to portfolio
          </Link>
          <span className="mono">
            {category.name} · {project.status}
          </span>
        </header>

        <section className="wrap project-detail-hero">
          <article className="project-detail-copy">
            <span className="mono">( Project spotlight )</span>
            <h1>{project.title}</h1>
            <p>{project.description}</p>
            <div className="project-detail-actions">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github /> Source code
                </a>
              )}
              {project.projectUrl && (
                <a
                  href={project.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink /> Live demo
                </a>
              )}
              {project.document && (
                <a
                  href={openDocumentHref ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText /> Project PDF
                </a>
              )}
            </div>
          </article>

          <aside className="project-detail-media">
            {project.image?.secureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.image.secureUrl}
                alt={`${project.title} cover`}
              />
            ) : (
              <div className="project-detail-fallback">
                <span>{category.name}</span>
                <b>{project.title}</b>
              </div>
            )}
          </aside>
        </section>

        {metricEntries.length > 0 ? (
          <section className="wrap project-detail-metrics">
            <p className="sec-label mono">( Impact metrics )</p>
            <div className="metric-grid">
              {metricEntries.map(([label, value]) => (
                <article key={label} className="metric">
                  <b>{value}</b>
                  <span>{label}</span>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="wrap project-detail-footer">
          <Link href={`/?theme=${activeTheme}#projects`}>← More projects</Link>
        </footer>
      </main>
    </div>
  );
}
