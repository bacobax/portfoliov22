import type { CSSProperties } from "react";

type SkeletonBlockProps = {
  className?: string;
  style?: CSSProperties;
};

function SkeletonBlock({ className = "", style }: SkeletonBlockProps) {
  return <span className={`app-skeleton-block ${className}`} style={style} aria-hidden="true" />;
}

export function PortfolioLoadingSkeleton({ theme = "dark" }: { theme?: "dark" | "light" }) {
  return (
    <div
      className={`portfolio-loading-skeleton ${theme === "light" ? "portfolio-loading-skeleton--light" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading portfolio content"
    >
      <header className="portfolio-skeleton-nav">
        <SkeletonBlock className="portfolio-skeleton-brand" />
        <div className="portfolio-skeleton-links">
          <SkeletonBlock /><SkeletonBlock /><SkeletonBlock /><SkeletonBlock />
        </div>
      </header>
      <main>
        <section className="portfolio-skeleton-hero">
          <div className="portfolio-skeleton-copy">
            <SkeletonBlock className="portfolio-skeleton-eyebrow" />
            <SkeletonBlock className="portfolio-skeleton-title" />
            <SkeletonBlock className="portfolio-skeleton-title portfolio-skeleton-title--short" />
            <SkeletonBlock className="portfolio-skeleton-text" />
            <SkeletonBlock className="portfolio-skeleton-text portfolio-skeleton-text--short" />
            <div className="portfolio-skeleton-actions"><SkeletonBlock /><SkeletonBlock /></div>
          </div>
          <SkeletonBlock className="portfolio-skeleton-visual" />
        </section>
        <div className="portfolio-skeleton-rail"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div>
        <section className="portfolio-skeleton-work">
          <SkeletonBlock className="portfolio-skeleton-section-label" />
          <SkeletonBlock className="portfolio-skeleton-heading" />
          <div className="portfolio-skeleton-grid">
            {[0, 1, 2].map((item) => (
              <article key={item}>
                <SkeletonBlock className="portfolio-skeleton-card-media" />
                <div className="portfolio-skeleton-card-copy">
                  <SkeletonBlock /><SkeletonBlock className="portfolio-skeleton-card-title" />
                  <SkeletonBlock /><SkeletonBlock className="portfolio-skeleton-card-line" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function CvLoadingSkeleton({ editor = false }: { editor?: boolean }) {
  return (
    <div className={`cv-loading-skeleton ${editor ? "cv-loading-skeleton--editor" : ""}`} role="status" aria-live="polite" aria-busy="true" aria-label={editor ? "Loading CV editor" : "Loading CV"}>
      <div className="cv-skeleton-toolbar">
        <div><SkeletonBlock /><SkeletonBlock className="cv-skeleton-toolbar-title" /></div>
        <div className="cv-skeleton-toolbar-actions"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div>
      </div>
      {editor ? (
        <div className="cv-skeleton-editor-grid">
          <aside>{[0, 1, 2, 3, 4, 5].map((item) => <SkeletonBlock key={item} />)}</aside>
          <section><CvPaperSkeleton /></section>
        </div>
      ) : <CvPaperSkeleton />}
    </div>
  );
}

function CvPaperSkeleton() {
  return (
    <div className="cv-skeleton-paper">
      <SkeletonBlock className="cv-skeleton-name" />
      <SkeletonBlock className="cv-skeleton-role" />
      <div className="cv-skeleton-rule" />
      <div className="cv-skeleton-columns">
        <div>{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} />)}</div>
        <div>{[0, 1, 2, 3, 4, 5, 6].map((item) => <SkeletonBlock key={item} />)}</div>
      </div>
    </div>
  );
}

export function ProjectDetailLoadingSkeleton() {
  return (
    <div className="project-loading-skeleton" role="status" aria-live="polite" aria-busy="true" aria-label="Loading project">
      <header><SkeletonBlock /><SkeletonBlock /></header>
      <main>
        <div className="project-skeleton-copy">
          <SkeletonBlock className="project-skeleton-label" />
          <SkeletonBlock className="project-skeleton-title" />
          <SkeletonBlock /><SkeletonBlock /><SkeletonBlock className="project-skeleton-short" />
          <div className="project-skeleton-actions"><SkeletonBlock /><SkeletonBlock /></div>
        </div>
        <SkeletonBlock className="project-skeleton-media" />
      </main>
    </div>
  );
}

export function ContentHubLoadingSkeleton() {
  return (
    <div className="hub-loading-skeleton" role="status" aria-live="polite" aria-busy="true" aria-label="Loading canonical content">
      {[0, 1, 2].map((section) => (
        <section key={section}>
          <SkeletonBlock className="hub-skeleton-heading" />
          <div className="hub-skeleton-fields">
            <SkeletonBlock /><SkeletonBlock /><SkeletonBlock /><SkeletonBlock />
          </div>
        </section>
      ))}
    </div>
  );
}

export function SearchResultsLoadingSkeleton() {
  return (
    <ul className="ss-results ss-results--loading" role="status" aria-live="polite" aria-label="Searching portfolio">
      {[0, 1, 2].map((item) => (
        <li className="ss-bubble ss-result ss-result-skeleton" key={item}>
          <SkeletonBlock className="ss-skeleton-title" />
          <SkeletonBlock /><SkeletonBlock className="ss-skeleton-short" />
        </li>
      ))}
    </ul>
  );
}
