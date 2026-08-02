"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Database,
  FileText,
  LogOut,
  Moon,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";

import profilePicture from "@/app/prof_pic.jpeg";
import { ColorPicker } from "@/components/color-picker";
import { EditableText } from "@/components/editable-text";
import { SemanticSearch, type QuickPrompt } from "@/components/SemanticSearch";
import { AiParticleMorph } from "@/components/portfolio/ai-particle-morph";
import { ParticleMascot } from "@/components/portfolio/particle-mascot";
import type {
  ExperienceEntry,
  PortfolioContent,
  Project,
  SkillsData,
  ThemeColor,
} from "@/lib/default-content";
import { toProjectSlug } from "@/lib/project-path";
import type { ThemeMode } from "@/lib/theme";

import "./editorial-portfolio.css";

const DEFAULT_HEADLINE = "Software engineering. With agents in the loop.";
const DEFAULT_AGENT_SUMMARY =
  "Claude Code and Codex across planning, implementation, debugging, and review.";

const FEATURED_TITLE_FALLBACKS = [
  "prompt engineering thesis",
  "few shots clip adaptation",
  "asn smart buisness landing page",
] as const;

const WORKFLOW_STEPS = [
  { number: "01", title: "Inspect", copy: "Map the codebase, constraints, and risks." },
  { number: "02", title: "Plan", copy: "Compare approaches and define acceptance checks." },
  { number: "03", title: "Build", copy: "Implement in bounded, reviewable changes." },
  { number: "04", title: "Verify", copy: "Run tests, inspect diffs, and challenge the result." },
] as const;

const FULL_STACK_PRIORITY = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "PostgreSQL",
  "Docker",
] as const;

type EditorialPortfolioProps = {
  content: PortfolioContent | null;
  contentError: string | null;
  isContentLoading: boolean;
  theme: ThemeMode;
  isEditorMode: boolean;
  isAuthenticated: boolean;
  onRetry: () => void;
  onToggleTheme: () => void;
  onToggleEditor: () => void;
  onLogout: () => void;
  onOpenContentHub: () => void;
  onAddProject: (categoryIndex: number) => void;
  onEditProject: (categoryIndex: number, projectIndex: number) => void;
  onDeleteProject: (categoryIndex: number, projectIndex: number) => void;
  onAddEducation: () => void;
  onEditEducation: (index: number) => void;
  onDeleteEducation: (index: number) => void;
  onAddExperience: () => void;
  onChangeExperience: (index: number, entry: ExperienceEntry) => void;
  onDeleteExperience: (index: number) => void;
  onUpdateProfileField: (
    field: keyof PortfolioContent["profileData"],
    value: string,
  ) => void;
  onUpdateAboutStat: (
    field: keyof PortfolioContent["aboutStats"],
    value: string,
  ) => void;
  onUpdateSystemStatusValue: (id: string, value: number) => void;
  onUpdateSystemStatusLabel: (id: string, label: string) => void;
  onAddSystemStatus: () => void;
  onRemoveSystemStatus: (id: string) => void;
  onUpdateLastDeployment: (value: string) => void;
  onUpdateSkills: (field: keyof SkillsData, skills: string[]) => void;
  accentColor: ThemeColor;
  onColorChange: (h: number, s: number, l: number) => void;
  onPersistAccentColor: (color: ThemeColor) => void;
};

type ProjectRecord = {
  categoryIndex: number;
  projectIndex: number;
  categoryId: string;
  categoryName: string;
  project: Project;
};

const cleanLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\s+/g, " ").trim();

const normalizedTitle = (value: string) => cleanLabel(value).toLowerCase();

const shortSummary = (record: ProjectRecord) => {
  const words = record.project.description.replace(/\s+/g, " ").trim().split(" ");
  return `${words.slice(0, 26).join(" ")}${words.length > 26 ? "…" : ""}`;
};

const experienceSummary = (entry: ExperienceEntry) => {
  const sentences = entry.description.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  return sentences[0] || entry.description;
};

const experiencePriority = (entry: ExperienceEntry) => {
  const identity = `${entry.title} ${entry.company}`.toLowerCase();
  if (identity.includes("research intern") || identity.includes("echole") || identity.includes("école")) return 0;
  if (identity.includes("s.h.d") || identity.includes("consulent")) return 1;
  return 2;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="sec-label mono">( {children} )</p>;
}

function EditableTagGroup({
  label,
  group,
  items,
  onUpdate,
}: {
  label: string;
  group: keyof SkillsData;
  items: string[];
  onUpdate: (field: keyof SkillsData, skills: string[]) => void;
}) {
  return (
    <div className="capability-editor-group">
      <span className="mono">{label}</span>
      <div className="capability-tags">
        {items.map((item, index) => (
          <span className="capability-tag editing" key={`${group}-${index}`}>
            <EditableText
              as="span"
              value={item}
              onChange={(value) =>
                onUpdate(
                  group,
                  items.map((current, currentIndex) =>
                    currentIndex === index ? value : current,
                  ),
                )
              }
              isEditorMode
              className="editable-field"
            />
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() =>
                onUpdate(
                  group,
                  items.filter((_, currentIndex) => currentIndex !== index),
                )
              }
            >
              <Trash2 size={12} />
            </button>
          </span>
        ))}
        <button
          type="button"
          className="capability-tag add"
          onClick={() => onUpdate(group, [...items, "New skill"])}
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}

export function EditorialPortfolio(props: EditorialPortfolioProps) {
  const { content, theme, isEditorMode, isAuthenticated } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [darkSection, setDarkSection] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState<{ x: number; y: number } | null>(null);

  const projectRecords = useMemo<ProjectRecord[]>(
    () =>
      content?.projectCategories.flatMap((category, categoryIndex) =>
        category.projects
          .map((project, projectIndex) => ({
          categoryIndex,
          projectIndex,
          categoryId: category.id,
          categoryName: category.name,
          project,
          }))
          .filter((record) => isEditorMode || record.project.showcaseVisible !== false),
      ) ?? [],
    [content, isEditorMode],
  );

  const featuredProjects = useMemo(() => {
    const ranked = projectRecords
      .filter((record) => record.project.featuredRank)
      .sort(
        (first, second) =>
          (first.project.featuredRank ?? 4) - (second.project.featuredRank ?? 4),
      );
    const fallbacks = FEATURED_TITLE_FALLBACKS.flatMap((title) => {
      const match = projectRecords.find(
        (record) => normalizedTitle(record.project.title) === title,
      );
      return match ? [match] : [];
    });
    const merged = [...ranked];
    for (const record of fallbacks) {
      if (!merged.includes(record)) merged.push(record);
    }
    for (const record of projectRecords) {
      if (merged.length >= 3) break;
      if (!merged.includes(record)) merged.push(record);
    }
    return merged.slice(0, 3);
  }, [projectRecords]);

  const orderedExperience = useMemo(
    () =>
      (content?.experienceLog ?? [])
        .map((entry, originalIndex) => ({ entry, originalIndex }))
        .filter(({ entry }) => isEditorMode || entry.showcaseVisible !== false)
        .sort(
          (first, second) =>
            experiencePriority(first.entry) - experiencePriority(second.entry),
        ),
    [content?.experienceLog, isEditorMode],
  );

  const visibleEducation = useMemo(
    () =>
      (content?.educationLog ?? [])
        .map((entry, originalIndex) => ({ entry, originalIndex }))
        .filter(({ entry }) => isEditorMode || entry.showcaseVisible !== false)
        .filter(({ entry }) => !entry.degree.toLowerCase().includes("high-school"))
        .slice(0, 2),
    [content?.educationLog, isEditorMode],
  );

  const fullStackSkills = useMemo(() => {
    if (!content) return [...FULL_STACK_PRIORITY];
    const available = [
      ...content.skillsData.frontend,
      ...content.skillsData.backend,
      ...content.skillsData.devops,
    ];
    const normalized = new Set(available.map((skill) => skill.toLowerCase()));
    return FULL_STACK_PRIORITY.filter((skill) => normalized.has(skill.toLowerCase()));
  }, [content]);

  const email = content?.contactData.email ?? "";
  const github = content?.contactData.links.find(
    (link) => link.label.toLowerCase() === "github",
  )?.url ?? "";
  const linkedin = content?.contactData.links.find(
    (link) => link.label.toLowerCase() === "linkedin",
  )?.url ?? "";
  const publicBio = content?.profileData.publicBio || content?.profileData.bio || "";

  const searchQuickPrompts = useMemo<QuickPrompt[]>(
    () => [
      { type: "query", label: "AI-assisted work", query: "AI coding agents prompt engineering" },
      { type: "query", label: "Selected projects", query: "featured projects results" },
      { type: "query", label: "Experience", query: "research internship professional experience" },
      { type: "link", label: "View the CV", href: "/cv" },
      { type: "link", label: "Email Francesco", href: `mailto:${email}` },
    ],
    [email],
  );

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-editorial-theme]"),
    );
    let ticking = false;
    const update = () => {
      ticking = false;
      const middle = window.innerHeight * 0.5;
      const active = sections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= middle && rect.bottom >= middle;
      });
      setDarkSection(active?.dataset.editorialTheme === "dark");
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [content]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const profileName = content?.profileData.name || "FRANCESCO_BASSIGNANA";
  const displayName = cleanLabel(profileName);
  const firstName = displayName.split(" ")[0] || "Francesco";
  const headline = content?.profileData.headline || DEFAULT_HEADLINE;
  const agentSummary = content?.profileData.agentSummary || DEFAULT_AGENT_SUMMARY;
  const projectCount = projectRecords.length;

  const closeMenu = () => setMenuOpen(false);
  const openSearchFrom = (origin: { x: number; y: number } | null) => {
    setSearchOrigin(origin);
    setSearchOpen(true);
  };

  if (!content && props.isContentLoading) {
    return (
      <div className="editorial-site editorial-loading" aria-busy="true">
        <span className="mono">Loading portfolio content</span>
        <div className="loading-rule"><i /></div>
      </div>
    );
  }

  return (
    <div
      className={`editorial-site recruiter-portfolio ${darkSection ? "editorial-dark" : ""} ${theme === "light" ? "editorial-soft" : ""} ${menuOpen ? "menu-open" : ""}`}
    >
      <a className="skip-link" href="#main">Skip to content</a>

      <ParticleMascot
        onActivate={openSearchFrom}
        searchOpen={searchOpen}
        mode="default"
      />
      <SemanticSearch
        theme={theme}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        origin={searchOrigin}
        title={`${firstName.toUpperCase()}* — LIVE SEARCH`}
        quickPrompts={searchQuickPrompts}
      />

      <header className={`nav ${navScrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <a className="brand" href="#top" onClick={closeMenu}>
            {firstName.toLowerCase()}<sup>*</sup>
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#work">Work</a>
            <a href="#ai-workflow">AI workflow</a>
            <a href="#experience">Experience</a>
            <a href="#about">About</a>
            <Link className="btn btn-sm" href="/cv">
              CV <span className="arr">→</span>
            </Link>
          </nav>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      <nav
        className={`mobile-menu ${menuOpen ? "open" : ""}`}
        id="mobile-menu"
        aria-label="Mobile"
      >
        <a href="#work" onClick={closeMenu}>Work</a>
        <a href="#ai-workflow" onClick={closeMenu}>AI workflow</a>
        <a href="#experience" onClick={closeMenu}>Experience</a>
        <a href="#about" onClick={closeMenu}>About</a>
        <button
          type="button"
          className="mobile-search-trigger"
          onClick={() => {
            closeMenu();
            openSearchFrom(null);
          }}
        >
          Semantic search
        </button>
        <Link href="/cv" onClick={closeMenu}>Open CV →</Link>
        <p className="mono">{displayName} — AI + full-stack engineer</p>
      </nav>

      <main id="main">
        {props.contentError && (
          <div className="content-error" role="alert">
            <span>{props.contentError}</span>
            <button type="button" onClick={props.onRetry}>Retry</button>
          </div>
        )}

        <section
          className="hero recruiter-hero"
          id="top"
          data-editorial-theme="light"
          data-mascot='{"x":0.95,"y":0.4,"s":0.08,"w":0.08}'
        >
          <div className="wrap recruiter-hero-grid">
            <div className="hero-positioning">
              <p className="mono eyebrow">
                {isEditorMode ? (
                  <>
                    <EditableText
                      as="span"
                      value={profileName}
                      onChange={(value) => props.onUpdateProfileField("name", value)}
                      isEditorMode
                      className="editable-field"
                    />
                    {" · "}
                    <EditableText
                      as="span"
                      value={content?.profileData.title || "AI + FULL-STACK ENGINEER"}
                      onChange={(value) => props.onUpdateProfileField("title", value)}
                      isEditorMode
                      className="editable-field"
                    />
                  </>
                ) : (
                  `${displayName} · AI + FULL-STACK ENGINEER`
                )}
              </p>
              <h1>
                <EditableText
                  as="span"
                  value={headline}
                  onChange={(value) => props.onUpdateProfileField("headline", value)}
                  isEditorMode={isEditorMode}
                  className="editable-field"
                />
              </h1>
              <div className="hero-agent-copy">
                <EditableText
                  value={agentSummary}
                  onChange={(value) => props.onUpdateProfileField("agentSummary", value)}
                  isEditorMode={isEditorMode}
                  multiline
                  className="editable-field"
                />
              </div>
              <div className="hero-actions">
                <a className="btn" href="#work">View selected work <span className="arr">→</span></a>
                <Link className="btn btn-ghost" href="/cv"><FileText size={17} /> Open CV</Link>
              </div>
            </div>

            <figure
              className="ai-morph-stage hero-morph"
              aria-label="Particle field morphing between Claude Code and Codex"
            >
              <AiParticleMorph />
              <div className="hero-tool-key mono" aria-hidden="true">
                <span>Daily tools</span>
                <b>Claude Code</b>
                <i />
                <b>Codex</b>
              </div>
            </figure>
          </div>

          <div className="hero-proof-rail">
            <div className="wrap">
              <span><b>AI Systems</b> MSc candidate</span>
              <span><b>Research intern</b> ÉTS Montréal</span>
              <span><b>{projectCount}</b> projects</span>
            </div>
          </div>
        </section>

        <section
          className="sec featured-work"
          id="work"
          data-editorial-theme="light"
          data-mascot='{"x":0.9,"y":-0.56,"s":0.08,"w":0.35}'
        >
          <div className="wrap">
            <SectionLabel>Selected work</SectionLabel>
            <div className="section-intro compact">
              <h2 className="h2">Proof before promises.</h2>
              <p>Three projects spanning AI-assisted software engineering, applied research, and production delivery.</p>
            </div>

            <div className="featured-project-grid">
              {featuredProjects.map((record, index) => {
                const detailHref = `/projects/${record.categoryId}/${toProjectSlug(record.project.title)}?theme=${theme}`;
                const harmonicMetric = Object.entries(record.project.metrics).find(([key]) =>
                  key.toLowerCase().includes("harmonic"),
                );
                const imageUrl = record.project.image?.secureUrl ?? record.project.image?.url;

                return (
                  <article className="featured-project" key={`${record.categoryId}-${record.project.title}`}>
                    <div className="featured-project-media">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="" />
                      ) : (
                        <div className="featured-project-mark" aria-hidden="true">
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <i />
                        </div>
                      )}
                      <span className="featured-project-status mono">
                        {cleanLabel(record.categoryName)} · {record.project.status}
                      </span>
                    </div>
                    <div className="featured-project-copy">
                      <span className="mono">0{index + 1} / featured</span>
                      <h3>{cleanLabel(record.project.title)}</h3>
                      <p>{shortSummary(record)}</p>
                      {harmonicMetric && (
                        <div className="featured-metric">
                          <b>{harmonicMetric[1]}</b>
                          <span>{cleanLabel(harmonicMetric[0])}</span>
                        </div>
                      )}
                      <div className="featured-project-links">
                        <Link href={detailHref}>View project <span>↗</span></Link>
                        {record.project.githubUrl && (
                          <a href={record.project.githubUrl} target="_blank" rel="noreferrer">Repository ↗</a>
                        )}
                        {record.project.projectUrl && (
                          <a href={record.project.projectUrl} target="_blank" rel="noreferrer">Live site ↗</a>
                        )}
                      </div>
                      {isEditorMode && (
                        <div className="editor-row-actions">
                          <button type="button" onClick={() => props.onEditProject(record.categoryIndex, record.projectIndex)}>
                            <Edit3 size={13} /> Edit
                          </button>
                          <button type="button" onClick={() => props.onDeleteProject(record.categoryIndex, record.projectIndex)}>
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="browse-projects"
              aria-expanded={showAllProjects}
              aria-controls="all-projects"
              onClick={() => setShowAllProjects((visible) => !visible)}
            >
              <span>{showAllProjects ? "Hide project index" : `Browse all ${projectCount}`}</span>
              <span className="mono">{showAllProjects ? "↑" : "↓"}</span>
            </button>

            {showAllProjects && (
              <div className="project-index" id="all-projects">
                {projectRecords.map((record, index) => (
                  <article key={`${record.categoryId}-${record.project.title}-index`}>
                    <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                    <Link href={`/projects/${record.categoryId}/${toProjectSlug(record.project.title)}?theme=${theme}`}>
                      {cleanLabel(record.project.title)}
                    </Link>
                    <span className="mono">{record.project.status}</span>
                    {isEditorMode && (
                      <div className="project-index-actions">
                        <button type="button" onClick={() => props.onEditProject(record.categoryIndex, record.projectIndex)}>Edit</button>
                        <button type="button" onClick={() => props.onDeleteProject(record.categoryIndex, record.projectIndex)}>Delete</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {isEditorMode && content && (
              <div className="editor-add-projects">
                {content.projectCategories.map((category, index) => (
                  <button type="button" key={category.id} onClick={() => props.onAddProject(index)}>
                    <Plus size={13} /> Add {cleanLabel(category.name)} project
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          className="sec agent-workflow"
          id="ai-workflow"
          data-editorial-theme="dark"
          data-mascot='{"x":0.95,"y":-0.7,"s":0.06,"w":0.18}'
        >
          <div className="wrap">
            <SectionLabel>AI-assisted engineering</SectionLabel>
            <div className="workflow-heading">
              <h2 className="h2">Agents accelerate the loop. <span className="thin">I own the result.</span></h2>
              <div className="workflow-tools mono">
                <span>Daily tools</span>
                <b>Claude Code</b>
                <b>Codex</b>
              </div>
            </div>
            <ol className="workflow-grid">
              {WORKFLOW_STEPS.map((step) => (
                <li key={step.number}>
                  <span className="workflow-number mono">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </li>
              ))}
            </ol>
            <p className="workflow-accountability mono">
              Architecture, validation, and final quality stay mine.
            </p>
          </div>
        </section>

        <section
          className="sec experience-timeline"
          id="experience"
          data-editorial-theme="light"
          data-mascot='{"x":-0.86,"y":-0.56,"s":0.08,"w":0.5}'
        >
          <div className="wrap">
            <SectionLabel>Experience</SectionLabel>
            <div className="section-intro compact">
              <h2 className="h2">Research depth. <span className="thin">Production range.</span></h2>
            </div>

            <div className="experience-list">
              {orderedExperience.map(({ entry, originalIndex }, index) => (
                <article key={`${entry.company}-${originalIndex}`}>
                  <span className="experience-index mono">{String(index + 1).padStart(2, "0")}</span>
                  <div className="experience-role">
                    <span className="mono">
                      {isEditorMode ? (
                        <EditableText
                          as="span"
                          value={entry.year}
                          onChange={(value) => props.onChangeExperience(originalIndex, { ...entry, year: value })}
                          isEditorMode
                          className="editable-field"
                        />
                      ) : entry.year}
                    </span>
                    <h3>
                      <EditableText
                        as="span"
                        value={cleanLabel(entry.title)}
                        onChange={(value) => props.onChangeExperience(originalIndex, { ...entry, title: value })}
                        isEditorMode={isEditorMode}
                        className="editable-field"
                      />
                    </h3>
                    <p className="experience-company">
                      <EditableText
                        as="span"
                        value={cleanLabel(entry.company)}
                        onChange={(value) => props.onChangeExperience(originalIndex, { ...entry, company: value })}
                        isEditorMode={isEditorMode}
                        className="editable-field"
                      />
                    </p>
                  </div>
                  <div className="experience-detail">
                    {isEditorMode ? (
                      <EditableText
                        value={entry.description}
                        onChange={(value) => props.onChangeExperience(originalIndex, { ...entry, description: value })}
                        isEditorMode
                        multiline
                        className="editable-field"
                      />
                    ) : (
                      <p>{experienceSummary(entry)}</p>
                    )}
                    <ul aria-label={`Technologies used at ${cleanLabel(entry.company)}`}>
                      {entry.tags.slice(0, 4).map((tag, tagIndex) => (
                        <li key={`${tag}-${tagIndex}`}>
                          {isEditorMode ? (
                            <>
                              <EditableText
                                as="span"
                                value={tag}
                                onChange={(value) =>
                                  props.onChangeExperience(originalIndex, {
                                    ...entry,
                                    tags: entry.tags.map((current, currentIndex) =>
                                      currentIndex === tagIndex ? value : current,
                                    ),
                                  })
                                }
                                isEditorMode
                                className="editable-field"
                              />
                              <button
                                type="button"
                                aria-label={`Remove ${tag}`}
                                onClick={() =>
                                  props.onChangeExperience(originalIndex, {
                                    ...entry,
                                    tags: entry.tags.filter((_, currentIndex) => currentIndex !== tagIndex),
                                  })
                                }
                              ><Trash2 size={11} /></button>
                            </>
                          ) : cleanLabel(tag)}
                        </li>
                      ))}
                      {isEditorMode && (
                        <li className="add-tag">
                          <button type="button" onClick={() => props.onChangeExperience(originalIndex, { ...entry, tags: [...entry.tags, "New tag"] })}>
                            <Plus size={11} /> Add tag
                          </button>
                        </li>
                      )}
                    </ul>
                    {isEditorMode && (
                      <button className="experience-delete" type="button" onClick={() => props.onDeleteExperience(originalIndex)}>
                        <Trash2 size={13} /> Delete experience
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {isEditorMode && (
              <button className="editor-add-btn" type="button" onClick={props.onAddExperience}>
                <Plus size={14} /> Add experience
              </button>
            )}
          </div>
        </section>

        <section
          className="sec capabilities"
          id="capabilities"
          data-editorial-theme="light"
          data-mascot='{"x":0.88,"y":-0.56,"s":0.08,"w":0.75}'
        >
          <div className="wrap">
            <SectionLabel>Capabilities</SectionLabel>
            <div className="section-intro compact">
              <h2 className="h2">A focused toolkit.</h2>
            </div>

            {isEditorMode && content ? (
              <div className="capability-editor">
                <EditableTagGroup label="AI-assisted engineering" group="aiTools" items={content.skillsData.aiTools} onUpdate={props.onUpdateSkills} />
                <EditableTagGroup label="AI systems" group="aiSystems" items={content.skillsData.aiSystems} onUpdate={props.onUpdateSkills} />
                <EditableTagGroup label="Frontend" group="frontend" items={content.skillsData.frontend} onUpdate={props.onUpdateSkills} />
                <EditableTagGroup label="Backend" group="backend" items={content.skillsData.backend} onUpdate={props.onUpdateSkills} />
                <EditableTagGroup label="Infrastructure" group="devops" items={content.skillsData.devops} onUpdate={props.onUpdateSkills} />
              </div>
            ) : (
              <div className="capability-groups">
                <article>
                  <span className="mono">01</span>
                  <h3>AI-assisted engineering</h3>
                  <div className="capability-tags">
                    {(content?.skillsData.aiTools ?? []).map((skill) => <span className="capability-tag" key={skill}>{skill}</span>)}
                  </div>
                </article>
                <article>
                  <span className="mono">02</span>
                  <h3>AI systems</h3>
                  <div className="capability-tags">
                    {(content?.skillsData.aiSystems ?? []).map((skill) => <span className="capability-tag" key={skill}>{skill}</span>)}
                  </div>
                </article>
                <article>
                  <span className="mono">03</span>
                  <h3>Full stack</h3>
                  <div className="capability-tags">
                    {fullStackSkills.map((skill) => <span className="capability-tag" key={skill}>{skill}</span>)}
                  </div>
                </article>
              </div>
            )}
          </div>
        </section>

        <section
          className="sec compact-about"
          id="about"
          data-editorial-theme="light"
          data-mascot='{"x":-0.86,"y":-0.58,"s":0.08,"w":0.34}'
        >
          <div className="wrap">
            <SectionLabel>About + education</SectionLabel>
            <div className="about-education-grid">
              <div className="about-compact-copy">
                <div className="about-portrait">
                  <Image src={profilePicture} alt={`${displayName} portrait`} sizes="(max-width: 760px) 96px, 144px" />
                </div>
                <div>
                  <span className="mono">{displayName} / 2026</span>
                  <h2>{publicBio}</h2>
                  <div className="about-links">
                    <a href={`mailto:${email}`}>Email ↗</a>
                    {github && <a href={github} target="_blank" rel="noreferrer">GitHub ↗</a>}
                    {linkedin && <a href={linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
                  </div>
                  {isEditorMode && (
                    <div className="profile-source-editor">
                      <span className="mono">CV / search description</span>
                      <EditableText
                        value={content?.profileData.bio || ""}
                        onChange={(value) => props.onUpdateProfileField("bio", value)}
                        isEditorMode
                        multiline
                        className="editable-field"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="education-compact-list">
                {visibleEducation.map(({ entry, originalIndex }, index) => (
                  <article key={`${entry.degree}-${originalIndex}`}>
                    <span className="mono">0{index + 1} · {entry.year}</span>
                    <h3>{cleanLabel(entry.degree)}</h3>
                    <p>{cleanLabel(entry.institution)}</p>
                    {isEditorMode && (
                      <div className="editor-row-actions">
                        <button type="button" onClick={() => props.onEditEducation(originalIndex)}><Edit3 size={13} /> Edit</button>
                        <button type="button" onClick={() => props.onDeleteEducation(originalIndex)}><Trash2 size={13} /> Delete</button>
                      </div>
                    )}
                  </article>
                ))}
                {isEditorMode && (
                  <button className="editor-add-btn" type="button" onClick={props.onAddEducation}>
                    <Plus size={14} /> Add education
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer
          className="contact recruiter-contact"
          id="contact"
          data-editorial-theme="dark"
          data-mascot='{"x":0,"y":0.38,"s":0.24,"w":0.62}'
        >
          <div className="wrap">
            <span className="mono contact-kicker">Available for ambitious engineering teams.</span>
            <h2 className="h2">Let&apos;s build something dependable.</h2>
            <div className="contact-actions">
              <a className="btn" href={`mailto:${email}?subject=Hello Francesco`}>Email me <span className="arr">→</span></a>
              <Link className="btn btn-ghost" href="/cv"><FileText size={17} /> Open CV</Link>
            </div>
            <div className="contact-directory">
              <a href={`mailto:${email}`}>{email}</a>
              {github && <a href={github} target="_blank" rel="noreferrer">GitHub ↗</a>}
              {linkedin && <a href={linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
              <Link href="/cv">CV ↗</Link>
            </div>
            <div className="foot-mark" aria-hidden="true">{firstName.toLowerCase()}*</div>
            <div className="foot-base">
              <p className="mono">© {displayName} {new Date().getFullYear()}</p>
              {isEditorMode && (
                <EditableText
                  as="span"
                  value={content?.lastDeployment || ""}
                  onChange={props.onUpdateLastDeployment}
                  isEditorMode
                  className="editable-field"
                />
              )}
            </div>
          </div>
        </footer>
      </main>

      <div className="utility-dock" aria-label="Portfolio controls">
        <ColorPicker
          defaultH={props.accentColor.h}
          defaultS={props.accentColor.s}
          defaultL={props.accentColor.l}
          onColorChange={props.onColorChange}
          canPersist={isAuthenticated}
          onPersistDefault={props.onPersistAccentColor}
        />
        <button type="button" onClick={props.onToggleTheme} title={`Use ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <Sun /> : <Moon />}<span>Theme</span>
        </button>
        <button type="button" onClick={props.onToggleEditor} title={isEditorMode ? "Leave editor mode" : "Enter editor mode"}>
          <Edit3 /><span>{isEditorMode ? "Editing" : "Edit"}</span>
        </button>
        {isEditorMode && (
          <button type="button" onClick={props.onOpenContentHub} title="Open canonical content hub">
            <Database /><span>Content</span>
          </button>
        )}
        {isAuthenticated && (
          <button type="button" onClick={props.onLogout} title="Log out"><LogOut /><span>Logout</span></button>
        )}
      </div>
    </div>
  );
}
