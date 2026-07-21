"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Edit3,
  FileText,
  LogOut,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";

import { SemanticSearch, type QuickPrompt } from "@/components/SemanticSearch";
import profilePicture from "@/app/prof_pic.jpeg";
import { ColorPicker } from "@/components/color-picker";
import { EditableText } from "@/components/editable-text";
import { AboutStory } from "@/components/portfolio/about-story";
import { AiParticleMorph } from "@/components/portfolio/ai-particle-morph";
import {
  GuidedTourHud,
  TOUR_STEPS,
  TourWelcome,
} from "@/components/portfolio/guided-tour";
import { ParticleMascot } from "@/components/portfolio/particle-mascot";
import type {
  ExperienceEntry,
  PortfolioContent,
  Project,
  ThemeColor,
} from "@/lib/default-content";
import { toProjectSlug } from "@/lib/project-path";
import type { ThemeMode } from "@/lib/theme";

import "./editorial-portfolio.css";

const EMAIL = "quicksolver02@gmail.com";
const GITHUB = "https://github.com/bacobax";
const LINKEDIN = "https://www.linkedin.com/in/francesco-bassignana/";

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
  onUpdateSkills: (
    field: keyof PortfolioContent["skillsData"],
    skills: string[],
  ) => void;
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

type ProjectGroup = "ai" | "software-web";

const PROJECT_PREVIEW_LIMIT = 5;
const TOUR_SEEN_SESSION_KEY = "portfolio:mote-tour-seen";
const SCROLL_POSITION_SESSION_KEY = "portfolio:last-scroll-y";
const PROJECT_GROUPS: Array<{ id: ProjectGroup; label: string }> = [
  { id: "ai", label: "AI" },
  { id: "software-web", label: "Software & Web" },
];

const cleanLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\s+/g, " ").trim();
const projectSummary = (value: string) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 260
    ? `${normalized.slice(0, 257).trimEnd()}…`
    : normalized;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="sec-label mono">( {children} )</p>;
}

function ProjectPreview({
  record,
  active,
}: {
  record: ProjectRecord;
  active: boolean;
}) {
  const imageUrl = record.project.image?.secureUrl ?? record.project.image?.url;

  return (
    <div className={`pv pv-lumen ${active ? "active" : ""}`}>
      <span className="pv-tag">
        {cleanLabel(record.categoryName)} · {record.project.status}
      </span>
      {imageUrl ? (
        <div className="pv-inner project-image-preview">
          {/* Remote portfolio images are hydrated by the existing Cloudinary data layer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" />
        </div>
      ) : (
        <div className="pv-inner project-fallback-preview" aria-hidden="true">
          <span>{String(record.projectIndex + 1).padStart(2, "0")}</span>
          <b>{record.project.title}</b>
        </div>
      )}
    </div>
  );
}

function ExperiencePanel({
  entry,
  index,
  isEditorMode = false,
  onChange,
}: {
  entry: ExperienceEntry;
  index: number;
  isEditorMode?: boolean;
  onChange?: (entry: ExperienceEntry) => void;
}) {
  const updateTag = (tagIndex: number, value: string) => {
    onChange?.({
      ...entry,
      tags: entry.tags.map((tag, index) =>
        index === tagIndex ? value : tag,
      ),
    });
  };

  const removeTag = (tagIndex: number) => {
    onChange?.({
      ...entry,
      tags: entry.tags.filter((_, index) => index !== tagIndex),
    });
  };

  return (
    <div
      className="panel editorial-experience-panel"
      aria-label={`Technologies used at ${cleanLabel(entry.company)}`}
    >
      <div className="p-head">
        <span>{cleanLabel(entry.company)}</span>
        <span className="dotrow">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="experience-viz-number">
        {String(index + 1).padStart(2, "0")}
      </div>
      <ul className="experience-viz-grid" aria-label="Experience tags">
        {entry.tags.map((tag, tagIndex) => (
          <li key={`${tag}-${tagIndex}`}>
            {isEditorMode && onChange ? (
              <>
                <EditableText
                  as="span"
                  value={tag}
                  onChange={(value) => updateTag(tagIndex, value)}
                  isEditorMode
                  className="editable-field"
                />
                <button
                  type="button"
                  className="experience-tag-remove"
                  aria-label={`Remove ${cleanLabel(tag)} tag`}
                  onClick={() => removeTag(tagIndex)}
                >
                  <Trash2 size={11} />
                </button>
              </>
            ) : (
              cleanLabel(tag)
            )}
          </li>
        ))}
        {isEditorMode && onChange && (
          <li className="experience-tag-add">
            <button
              type="button"
              onClick={() =>
                onChange({ ...entry, tags: [...entry.tags, "New tag"] })
              }
            >
              <Plus size={11} /> Add tag
            </button>
          </li>
        )}
      </ul>
      <div className="experience-viz-line">
        <i />
      </div>
      <div className="p-foot">
        <span>{entry.year}</span>
        <span>portfolio record</span>
      </div>
    </div>
  );
}

function AiCodingSection() {
  return (
    <section
      className="sec ai-coding"
      id="ai-coding"
      data-editorial-theme="dark"
      data-mascot='{"x":0.92,"y":-0.72,"s":0.12,"w":0.35}'
    >
      <div className="wrap">
        <SectionLabel>AI-assisted engineering</SectionLabel>
        <div className="ai-intro">
          <h2 className="h2">
            Faster loops.
            <br />
            <span className="thin">Same accountability.</span>
          </h2>
          <p>
            I use leading AI coding systems to move from question to working
            evidence faster — exploring approaches, implementing, debugging and
            refining without outsourcing the decisions that make the work
            dependable.
          </p>
        </div>
        <figure
          className="ai-morph-stage"
          aria-label="A particle blob that periodically resolves into the Claude Code and Codex logos"
        >
          <AiParticleMorph />
        </figure>
        <div className="ai-notes">
          <article className="ai-note">
            <span className="ai-tool-index mono">01 · Claude Code</span>
            <h3>
              Long-context collaboration,
              <br />
              inside the codebase.
            </h3>
            <p>
              Claude Code helps me trace systems, test competing approaches and
              carry substantial changes across a project without losing the
              thread. I use that speed to inspect more options — then validate
              the one worth keeping.
            </p>
            <span className="ai-tool-note mono">
              Architecture · constraints · review — still mine.
            </span>
          </article>
          <article className="ai-note">
            <span className="ai-tool-index mono">02 · Codex</span>
            <h3>
              Implementation momentum,
              <br />
              with verification attached.
            </h3>
            <p>
              Codex lets me turn a precise intent into edits, checks and focused
              iterations quickly. It shortens the distance between an idea and
              something I can run, challenge and improve — not the distance
              between a decision and its owner.
            </p>
            <span className="ai-tool-note mono">
              Product judgment · validation · final quality — still mine.
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}

const SKILL_GROUPS = ["frontend", "backend", "devops"] as const;

function SkillValueInput({
  id,
  value,
  onCommit,
}: {
  id: string;
  value: number;
  onCommit: (id: string, value: number) => void;
}) {
  return (
    <input
      key={`${id}-${value}`}
      className="skill-value-input"
      type="number"
      min={0}
      max={100}
      defaultValue={value}
      aria-label="Skill level percentage"
      onBlur={(event) => {
        const next = Number(event.target.value);
        if (!Number.isNaN(next) && next !== value) onCommit(id, next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function EditorialPortfolio(props: EditorialPortfolioProps) {
  const { content, theme, isEditorMode, isAuthenticated } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeExperience, setActiveExperience] = useState(0);
  const [activeProject, setActiveProject] = useState(0);
  const [activeProjectGroup, setActiveProjectGroup] =
    useState<ProjectGroup>("ai");
  const [expandedProjectGroups, setExpandedProjectGroups] = useState<
    Record<ProjectGroup, boolean>
  >({ ai: false, "software-web": false });
  const [darkSection, setDarkSection] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const svcWrapRef = useRef<HTMLDivElement>(null);
  const procGridRef = useRef<HTMLDivElement>(null);
  const procFillRef = useRef<HTMLElement>(null);
  const procStepRefs = useRef<Array<HTMLElement | null>>([]);
  const [tourWelcomeOpen, setTourWelcomeOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const [tourTraveling, setTourTraveling] = useState(false);
  const [tourProgress, setTourProgress] = useState(0);
  const tourStepRef = useRef(0);
  const tourPausedRef = useRef(false);
  const tourTravelingRef = useRef(false);
  const tourElapsedRef = useRef(0);
  const tourManualNavigationRef = useRef(false);
  const scrollRestoredRef = useRef(false);

  const experienceCount = content?.experienceLog.length ?? 0;

  const projectRecords = useMemo<ProjectRecord[]>(
    () =>
      content?.projectCategories.flatMap((category, categoryIndex) =>
        category.projects.map((project, projectIndex) => ({
          categoryIndex,
          projectIndex,
          categoryId: category.id,
          categoryName: category.name,
          project,
        })),
      ) ?? [],
    [content],
  );

  const groupedProjectRecords = useMemo<Record<ProjectGroup, ProjectRecord[]>>(
    () => ({
      ai: projectRecords.filter(
        (record) => record.categoryId.toLowerCase() === "ai",
      ),
      "software-web": projectRecords.filter(
        (record) => record.categoryId.toLowerCase() !== "ai",
      ),
    }),
    [projectRecords],
  );

  const activeProjectRecords = groupedProjectRecords[activeProjectGroup];
  const activeProjectsExpanded = expandedProjectGroups[activeProjectGroup];
  const visibleProjectRecords = activeProjectsExpanded
    ? activeProjectRecords
    : activeProjectRecords.slice(0, PROJECT_PREVIEW_LIMIT);

  const getTourTargetTop = (index: number) => {
    const step = TOUR_STEPS[index];
    const target = document.getElementById(step.target);
    if (!target) return window.scrollY;
    const top = target.getBoundingClientRect().top + window.scrollY;
    return Math.max(
      0,
      top + target.offsetHeight * step.focus - window.innerHeight * 0.5,
    );
  };

  const setTourTravelState = (traveling: boolean) => {
    if (tourTravelingRef.current === traveling) return;
    tourTravelingRef.current = traveling;
    setTourTraveling(traveling);
    window.dispatchEvent(
      new CustomEvent("portfolio:tour-motion", { detail: { traveling } }),
    );
  };

  const goToTourStep = (index: number) => {
    const next = Math.min(TOUR_STEPS.length - 1, Math.max(0, index));
    tourManualNavigationRef.current = true;
    tourElapsedRef.current = 0;
    setTourTravelState(false);
    setTourProgress(0);
    setTourStep(next);
  };

  const startTour = () => {
    try {
      window.sessionStorage.setItem(TOUR_SEEN_SESSION_KEY, "true");
    } catch {
      // The tour still works when storage is unavailable (private/locked mode).
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    tourElapsedRef.current = 0;
    setTourProgress(0);
    setTourStep(0);
    setTourPaused(false);
    setTourTravelState(false);
    setTourWelcomeOpen(false);
    setTourActive(true);
  };

  const skipTourWelcome = () => {
    try {
      window.sessionStorage.setItem(TOUR_SEEN_SESSION_KEY, "true");
    } catch {
      // Dismissing the overlay must never depend on storage access.
    }
    setTourWelcomeOpen(false);
  };

  const exitTour = () => {
    setTourActive(false);
    setTourPaused(false);
    setTourTravelState(false);
    setTourProgress(0);
    document
      .querySelectorAll(".tour-target-active")
      .forEach((element) => element.classList.remove("tour-target-active"));
  };

  useEffect(() => {
    try {
      setTourWelcomeOpen(
        window.sessionStorage.getItem(TOUR_SEEN_SESSION_KEY) !== "true",
      );
    } catch {
      setTourWelcomeOpen(true);
    }
  }, []);

  useEffect(() => {
    tourStepRef.current = tourStep;
    tourPausedRef.current = tourPaused;
  }, [tourPaused, tourStep]);

  useEffect(() => {
    if (!tourWelcomeOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "auto" });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [tourWelcomeOpen]);

  useEffect(() => {
    if (
      scrollRestoredRef.current ||
      props.isContentLoading ||
      !content ||
      tourWelcomeOpen ||
      tourActive
    ) {
      return;
    }

    let savedScrollY = 0;
    try {
      savedScrollY = Number.parseFloat(
        window.sessionStorage.getItem(SCROLL_POSITION_SESSION_KEY) ?? "0",
      );
    } catch {
      // Native scroll restoration remains the fallback without storage.
    }

    const frame = window.requestAnimationFrame(() => {
      if (Number.isFinite(savedScrollY) && savedScrollY > 0) {
        const maximumScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        window.scrollTo({
          top: Math.min(savedScrollY, maximumScroll),
          behavior: "auto",
        });
      }
      scrollRestoredRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [content, props.isContentLoading, tourActive, tourWelcomeOpen]);

  useEffect(() => {
    const rememberScrollPosition = () => {
      if (!scrollRestoredRef.current || tourWelcomeOpen || tourActive) return;
      try {
        window.sessionStorage.setItem(
          SCROLL_POSITION_SESSION_KEY,
          String(Math.max(0, window.scrollY)),
        );
      } catch {
        // Scrolling must remain unaffected if browser storage is unavailable.
      }
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        rememberScrollPosition();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", rememberScrollPosition);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", rememberScrollPosition);
    };
  }, [tourActive, tourWelcomeOpen]);

  useEffect(() => {
    if (!tourActive) return;
    let frame = 0;
    let previousTime = performance.now();
    const reducedTourMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const tick = (time: number) => {
      const delta = Math.min(100, time - previousTime);
      previousTime = time;
      const activeIndex = tourStepRef.current;
      const activeStep = TOUR_STEPS[activeIndex];
      const effectiveTravelDuration = reducedTourMotion
        ? Math.min(350, activeStep.travelDuration)
        : activeStep.travelDuration;
      const totalDuration =
        activeStep.talkDuration + effectiveTravelDuration;
      if (!tourPausedRef.current && totalDuration > 0) {
        tourElapsedRef.current += delta;
        const nextProgress = Math.min(1, tourElapsedRef.current / totalDuration);
        setTourProgress(nextProgress);

        if (
          tourElapsedRef.current > activeStep.talkDuration &&
          activeIndex < TOUR_STEPS.length - 1
        ) {
          setTourTravelState(true);
          const travelProgress = Math.min(
            1,
            (tourElapsedRef.current - activeStep.talkDuration) /
              effectiveTravelDuration,
          );
          const easedTravel = reducedTourMotion
            ? 1
            : travelProgress * travelProgress * (3 - 2 * travelProgress);
          const from = getTourTargetTop(activeIndex);
          const to = getTourTargetTop(activeIndex + 1);
          window.scrollTo({ top: from + (to - from) * easedTravel });
        } else {
          setTourTravelState(false);
        }

        if (nextProgress >= 1) {
          tourElapsedRef.current = 0;
          setTourTravelState(false);
          setTourProgress(0);
          setTourStep((current) =>
            Math.min(TOUR_STEPS.length - 1, current + 1),
          );
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [tourActive]);

  useEffect(() => {
    if (!tourActive) return;
    tourElapsedRef.current = 0;
    setTourProgress(0);
    const step = TOUR_STEPS[tourStep];
    const target = document.getElementById(step.target);
    document
      .querySelectorAll(".tour-target-active")
      .forEach((element) => element.classList.remove("tour-target-active"));
    target?.classList.add("tour-target-active");

    if (target) {
      window.scrollTo({
        top: getTourTargetTop(tourStep),
        behavior:
          tourManualNavigationRef.current &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "smooth"
            : "auto",
      });
    }
    tourManualNavigationRef.current = false;

    let actionTimer: number | undefined;
    if (step.action === "experience" && experienceCount > 1) {
      actionTimer = window.setTimeout(() => setActiveExperience(1), 1100);
    }
    if (step.action === "projects") {
      const group = groupedProjectRecords["software-web"].length
        ? "software-web"
        : "ai";
      selectProjectGroup(group);
      actionTimer = window.setTimeout(() => {
        if (groupedProjectRecords[group].length > 1) setActiveProject(1);
      }, 1700);
    }

    window.dispatchEvent(
      new CustomEvent("portfolio:mascot-burst", {
        detail: { direction: tourStep % 2 === 0 ? 1 : -1 },
      }),
    );

    return () => {
      if (actionTimer) window.clearTimeout(actionTimer);
      target?.classList.remove("tour-target-active");
    };
    // The grouped records are stable for the loaded content; this effect is
    // intentionally driven by the tour stop, not by animation state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourStep]);

  useEffect(() => {
    if (!tourActive) return;
    const pauseForUser = () => setTourPaused(true);
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (event.key === "Escape") exitTour();
      if (event.key === "ArrowRight") goToTourStep(tourStepRef.current + 1);
      if (event.key === "ArrowLeft") goToTourStep(tourStepRef.current - 1);
      if (event.key === " ") {
        event.preventDefault();
        setTourPaused((paused) => !paused);
      }
    };
    window.addEventListener("wheel", pauseForUser, { passive: true });
    window.addEventListener("touchstart", pauseForUser, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", pauseForUser);
      window.removeEventListener("touchstart", pauseForUser);
      window.removeEventListener("keydown", onKeyDown);
    };
    // Keyboard navigation reads the current step through refs; rebinding on
    // every animation render would repeatedly detach the global controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive]);

  useEffect(() => {
    if (activeProject >= visibleProjectRecords.length) setActiveProject(0);
  }, [activeProject, visibleProjectRecords.length]);

  const skillTags = useMemo(
    () =>
      content
        ? [
            ...content.skillsData.frontend,
            ...content.skillsData.backend,
            ...content.skillsData.devops,
          ]
        : [],
    [content],
  );

  const searchQuickPrompts = useMemo<QuickPrompt[]>(() => {
    if (!content) return [];

    const categoryPrompts: QuickPrompt[] = content.projectCategories
      .slice(0, 2)
      .map((category) => ({
        type: "query",
        label: `${cleanLabel(category.name)} work`,
        query: `${category.name} projects`,
      }));

    return [
      { type: "query", label: "Skills & tools", query: "skills tools stack" },
      ...categoryPrompts,
      {
        type: "query",
        label: "Experience & education",
        query: "experience research education",
      },
      { type: "link", label: "View the CV", href: "/cv" },
      { type: "link", label: "Get in touch", href: "#contact" },
    ];
  }, [content]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* dark/light background: driven by whichever themed section sits at the
     viewport centre. The previous IntersectionObserver compared ratios of
     very differently-sized sections and (with sparse thresholds) skipped
     events, leaving transitions between differently sized sections stuck or
     flickery. */
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-editorial-theme]"),
    );
    if (!sections.length) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const middle = window.innerHeight * 0.5;
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= middle && rect.bottom >= middle) {
          setDarkSection(section.dataset.editorialTheme === "dark");
          return;
        }
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [content]);

  /* experience — pinned scroll progression (mock: services engine) */
  useEffect(() => {
    const wrap = svcWrapRef.current;
    if (!wrap || experienceCount === 0) return;
    let ticking = false;
    const frame = () => {
      ticking = false;
      if (window.matchMedia("(max-width:960px)").matches) return;
      const total = wrap.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.min(
        1,
        Math.max(0, -wrap.getBoundingClientRect().top / total),
      );
      setActiveExperience(
        Math.min(experienceCount - 1, Math.floor(progress * experienceCount)),
      );
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(frame);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    frame();
    return () => window.removeEventListener("scroll", onScroll);
  }, [experienceCount]);

  /* education — progress line fill + step lighting (mock: process engine) */
  useEffect(() => {
    const grid = procGridRef.current;
    const fill = procFillRef.current;
    if (!grid || !fill) return;
    const steps = procStepRefs.current.filter((step): step is HTMLElement =>
      Boolean(step),
    );
    const stepCount = Math.max(1, steps.length);
    let ticking = false;
    const frame = () => {
      ticking = false;
      const rect = grid.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(
          0,
          (window.innerHeight * 0.75 - rect.top) /
            (rect.height + window.innerHeight * 0.2),
        ),
      );
      if (window.matchMedia("(max-width:960px)").matches) {
        fill.style.width = "100%";
        fill.style.height = `${progress * 100}%`;
      } else {
        fill.style.height = "100%";
        fill.style.width = `${progress * 100}%`;
      }
      steps.forEach((step, index) =>
        step.classList.toggle("lit", progress > (index + 0.35) / stepCount),
      );
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(frame);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [content]);

  const scrollToExperience = (index: number) => {
    setActiveExperience(index);
    const wrap = svcWrapRef.current;
    if (!wrap || window.matchMedia("(max-width:960px)").matches) return;
    const total = wrap.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const top =
      wrap.getBoundingClientRect().top +
      window.scrollY +
      total * (index / experienceCount + 0.06);
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const openSearchFrom = (origin: { x: number; y: number } | null) => {
    setSearchOrigin(origin);
    setSearchOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);
  const selectProjectGroup = (group: ProjectGroup) => {
    setActiveProjectGroup(group);
    setActiveProject(0);
  };
  const handleProjectTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    group: ProjectGroup,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const currentIndex = PROJECT_GROUPS.findIndex((item) => item.id === group);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? PROJECT_GROUPS.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % PROJECT_GROUPS.length
            : (currentIndex - 1 + PROJECT_GROUPS.length) %
              PROJECT_GROUPS.length;
    const nextGroup = PROJECT_GROUPS[nextIndex].id;
    selectProjectGroup(nextGroup);
    document.getElementById(`project-tab-${nextGroup}`)?.focus();
  };
  const profileName = content?.profileData.name || "Portfolio";
  const displayName = cleanLabel(profileName);
  const nameWords = displayName.split(" ").filter(Boolean);
  const firstName = nameWords[0] || profileName;
  const remainingName = nameWords.slice(1).join(" ");

  if (!content && props.isContentLoading) {
    return (
      <div className="editorial-site editorial-loading" aria-busy="true">
        <span className="mono">Loading portfolio content</span>
        <div className="loading-rule">
          <i />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`editorial-site ${darkSection ? "editorial-dark" : ""} ${theme === "light" ? "editorial-soft" : ""} ${menuOpen ? "menu-open" : ""} ${tourWelcomeOpen ? "tour-welcome-open" : ""} ${tourActive ? "tour-running" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {tourWelcomeOpen && (
        <TourWelcome
          onStart={startTour}
          onSkip={skipTourWelcome}
        />
      )}
      {tourActive && (
        <GuidedTourHud
          stepIndex={tourStep}
          progress={tourProgress}
          paused={tourPaused}
          traveling={tourTraveling}
          onPrevious={() => goToTourStep(tourStep - 1)}
          onNext={() => goToTourStep(tourStep + 1)}
          onTogglePause={() => setTourPaused((paused) => !paused)}
          onExit={exitTour}
          onReplay={() => goToTourStep(0)}
        />
      )}
      <ParticleMascot
        onActivate={tourActive || tourWelcomeOpen ? undefined : openSearchFrom}
        searchOpen={searchOpen}
        mode={tourWelcomeOpen ? "welcome" : tourActive ? "tour" : "default"}
      />
      <SemanticSearch
        theme={theme}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        origin={searchOrigin}
        title={`${firstName.toUpperCase()}* — LIVE SEARCH`}
        quickPrompts={
          searchQuickPrompts.length ? searchQuickPrompts : undefined
        }
      />

      <header
        className={`nav ${navScrolled ? "scrolled" : ""}`}
        aria-hidden={tourWelcomeOpen || undefined}
      >
        <div className="nav-inner">
          <a className="brand" href="#top" onClick={closeMenu}>
            {firstName.toLowerCase()}
            <sup>*</sup>
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#about">About</a>
            <a href="#experience">Experience</a>
            <a href="#education">Education</a>
            <a href="#projects">Projects</a>
            <a className="btn btn-sm" href="#contact">
              Get in touch <span className="arr">→</span>
            </a>
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
        <a href="#about" onClick={closeMenu}>
          About
        </a>
        <a href="#experience" onClick={closeMenu}>
          Experience
        </a>
        <a href="#education" onClick={closeMenu}>
          Education
        </a>
        <a href="#projects" onClick={closeMenu}>
          Projects
        </a>
        <a href="#contact" onClick={closeMenu}>
          Get in touch →
        </a>
        <p className="mono">
          {profileName} — {content?.profileData.title}
        </p>
      </nav>

      <main id="main" aria-hidden={tourWelcomeOpen || undefined}>
        {props.contentError && (
          <div className="content-error" role="alert">
            <span>{props.contentError}</span>
            <button type="button" onClick={props.onRetry}>
              Retry
            </button>
          </div>
        )}

        <section
          className="hero"
          id="top"
          data-editorial-theme="light"
          data-mascot='{"x":0.94,"y":0.52,"s":0.36,"w":0.05}'
        >
          <div className="wrap hero-grid">
            <div>
              <p className="mono eyebrow">
                {isEditorMode ? (
                  <>
                    <EditableText
                      as="span"
                      value={profileName}
                      onChange={(value) =>
                        props.onUpdateProfileField("name", value)
                      }
                      isEditorMode
                      className="editable-field"
                    />
                    {" — "}
                    <EditableText
                      as="span"
                      value={content?.profileData.title || ""}
                      onChange={(value) =>
                        props.onUpdateProfileField("title", value)
                      }
                      isEditorMode
                      className="editable-field"
                    />
                  </>
                ) : (
                  `${profileName} — ${content?.profileData.title ?? ""}`
                )}
              </p>
              <h1>
                <span className="line">
                  <span>{firstName}</span>
                </span>
                {remainingName && (
                  <span className="line">
                    <span>{remainingName}</span>
                  </span>
                )}
                <span className="line">
                  <span className="orbit-word">
                    portfolio.
                    <svg viewBox="0 0 120 60" aria-hidden="true">
                      <ellipse cx="60" cy="30" rx="57" ry="26" />
                    </svg>
                  </span>
                </span>
              </h1>
              <div className="hero-bottom">
                <a className="btn" href="#contact">
                  Get in touch <span className="arr">→</span>
                </a>
              </div>
            </div>
            <div className="hero-spacer" aria-hidden="true" />
          </div>
          <div className="ticker" aria-hidden="true">
            <div className="ticker-track">
              {[...skillTags, ...skillTags].map((tag, index) => (
                <span key={`${tag}-${index}`}>{tag} ✦</span>
              ))}
            </div>
          </div>
        </section>

        <section
          className="sec about"
          id="about"
          data-editorial-theme="light"
          data-mascot='{"x":0.58,"y":-0.6,"s":0.26,"w":0.8}'
        >
          <div className="wrap">
            <SectionLabel>About — in five chapters</SectionLabel>
            <div className="intro-grid">
              <h2 className="h2">
                <EditableText
                  as="span"
                  value={content?.profileData.title || ""}
                  onChange={(value) =>
                    props.onUpdateProfileField("title", value)
                  }
                  isEditorMode={isEditorMode}
                  className="editable-field"
                />
              </h2>
              <div className="intro-side">
                <div className="about-identity">
                  <div className="about-portrait">
                    <Image
                      src={profilePicture}
                      alt={`${displayName} portrait`}
                      sizes="(max-width: 760px) 96px, 144px"
                      priority
                    />
                  </div>
                  <div>
                    <span className="mono">Profile / 2026</span>
                    <p>{displayName}</p>
                  </div>
                </div>
                <div className="about-ctas">
                  <a className="btn" href={`mailto:${EMAIL}`}>
                    Email me <span className="arr">→</span>
                  </a>
                  <a
                    className="btn btn-ghost"
                    href={GITHUB}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub <span className="arr">↗</span>
                  </a>
                  <a
                    className="btn btn-ghost"
                    href={LINKEDIN}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn <span className="arr">↗</span>
                  </a>
                </div>
              </div>
            </div>

            {isEditorMode && (
              <div className="profile-source-editor">
                <span className="mono">
                  CV / search description — hidden from the public portfolio
                </span>
                <EditableText
                  value={content?.profileData.bio || ""}
                  onChange={(value) =>
                    props.onUpdateProfileField("bio", value)
                  }
                  isEditorMode
                  multiline
                  className="editable-field"
                />
              </div>
            )}

            <AboutStory />

            <div className="metric-grid">
              <div className="metric">
                <b>{content?.aboutStats.projects || "0"}</b>
                <span>
                  Projects built
                  {isEditorMode && (
                    <i className="editor-note"> · derived from projects</i>
                  )}
                </span>
              </div>
              <div className="metric">
                <b>
                  <EditableText
                    as="span"
                    value={content?.aboutStats.commits || "0"}
                    onChange={(value) =>
                      props.onUpdateAboutStat("commits", value)
                    }
                    isEditorMode={isEditorMode}
                    className="editable-field"
                  />
                </b>
                <span>Commits pushed</span>
              </div>
              <div className="metric">
                <b>
                  <EditableText
                    as="span"
                    value={content?.aboutStats.experience || "0"}
                    onChange={(value) =>
                      props.onUpdateAboutStat("experience", value)
                    }
                    isEditorMode={isEditorMode}
                    className="editable-field"
                  />
                </b>
                <span>Experience</span>
              </div>
            </div>
            <div className="skills">
              <div className="skills-head">
                <h3>Where I&apos;m strongest</h3>
                <span className="mono">live portfolio data</span>
              </div>
              {content?.systemStatus.map((skill) => (
                <div className="skill lit" key={skill.id}>
                  <div className="srow">
                    <b>
                      {isEditorMode ? (
                        <EditableText
                          as="span"
                          value={skill.label}
                          onChange={(value) =>
                            props.onUpdateSystemStatusLabel(skill.id, value)
                          }
                          isEditorMode
                          className="editable-field"
                        />
                      ) : (
                        cleanLabel(skill.label)
                      )}
                    </b>
                    <span className="skill-meta">
                      {isEditorMode ? (
                        <>
                          <SkillValueInput
                            id={skill.id}
                            value={skill.value}
                            onCommit={props.onUpdateSystemStatusValue}
                          />
                          %
                          <button
                            type="button"
                            className="editor-icon-btn"
                            title="Remove skill bar"
                            onClick={() => props.onRemoveSystemStatus(skill.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        `${skill.value}%`
                      )}
                    </span>
                  </div>
                  <div className="track">
                    <i style={{ width: `${skill.value}%` }} />
                  </div>
                </div>
              ))}
              {isEditorMode && (
                <button
                  type="button"
                  className="editor-add-btn"
                  onClick={props.onAddSystemStatus}
                >
                  <Plus size={14} /> Add skill bar
                </button>
              )}
            </div>
          </div>
        </section>

        <section
          id="experience"
          data-editorial-theme="light"
          data-mascot='{"x":0.72,"y":0.62,"s":0.32,"w":0.5}'
        >
          {content?.experienceLog.length ? (
            <div
              className={`svc-wrap ${isEditorMode ? "editing" : ""}`}
              ref={svcWrapRef}
              style={
                {
                  "--svc-height": `${experienceCount * 100 + 20}vh`,
                } as React.CSSProperties
              }
            >
              <div className="svc-sticky">
                <div className="wrap svc-grid-wrap">
                  <div className="svc-grid">
                    <div>
                      <div
                        className="svc-tabs"
                        role="tablist"
                        aria-label="Experience"
                      >
                        {content.experienceLog.map((entry, index) => (
                          <button
                            key={`${entry.title}-${index}`}
                            type="button"
                            role="tab"
                            aria-selected={activeExperience === index}
                            onClick={() => scrollToExperience(index)}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </button>
                        ))}
                      </div>
                      <div className="svc-copy-stack">
                        {content.experienceLog.map((entry, index) => (
                          <article
                            className={`svc-copy ${activeExperience === index ? "active" : ""}`}
                            key={`${entry.company}-${index}`}
                          >
                            <div className="svc-num">
                              {String(index + 1).padStart(2, "0")}
                            </div>
                            <p className="svc-tag mono">( {entry.year} )</p>
                            <h3>{cleanLabel(entry.title)}</h3>
                            <p>{entry.description}</p>
                            <span className="pill">
                              {cleanLabel(entry.company)}
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                    <div className="svc-viz-stack">
                      {content.experienceLog.map((entry, index) => (
                        <div
                          className={`svc-viz ${activeExperience === index ? "active" : ""}`}
                          key={`${entry.title}-viz`}
                        >
                          <ExperiencePanel
                            entry={entry}
                            index={index}
                            isEditorMode={isEditorMode}
                            onChange={(updatedEntry) =>
                              props.onChangeExperience(index, updatedEntry)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="svc-stack wrap">
                {content.experienceLog.map((entry, index) => (
                  <article
                    className="svc-module"
                    key={`${entry.title}-mobile-${index}`}
                  >
                    <div className="svc-copy active">
                      <div className="svc-num">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      {isEditorMode && (
                        <div className="editor-row-actions">
                          <button
                            type="button"
                            onClick={() => props.onDeleteExperience(index)}
                          >
                            <Trash2 size={13} /> Delete entry
                          </button>
                        </div>
                      )}
                      <p className="svc-tag mono">
                        ({" "}
                        <EditableText
                          as="span"
                          value={entry.year}
                          onChange={(value) =>
                            props.onChangeExperience(index, {
                              ...entry,
                              year: value,
                            })
                          }
                          isEditorMode={Boolean(isEditorMode)}
                          className="editable-field"
                        />{" "}
                        )
                      </p>
                      <h3>
                        {isEditorMode ? (
                          <EditableText
                            as="span"
                            value={entry.title}
                            onChange={(value) =>
                              props.onChangeExperience(index, {
                                ...entry,
                                title: value,
                              })
                            }
                            isEditorMode
                            className="editable-field"
                          />
                        ) : (
                          cleanLabel(entry.title)
                        )}
                      </h3>
                      {isEditorMode ? (
                        <EditableText
                          value={entry.description}
                          onChange={(value) =>
                            props.onChangeExperience(index, {
                              ...entry,
                              description: value,
                            })
                          }
                          isEditorMode
                          multiline
                          className="editable-field"
                        />
                      ) : (
                        <p>{entry.description}</p>
                      )}
                      {isEditorMode && (
                        <div className="editor-cv-desc">
                          <span className="mono">
                            CV description (optional — replaces the main
                            description in the CV)
                          </span>
                          <EditableText
                            value={entry.cvDescription ?? ""}
                            onChange={(value) =>
                              props.onChangeExperience(index, {
                                ...entry,
                                cvDescription: value,
                              })
                            }
                            isEditorMode
                            multiline
                            className="editable-field"
                          />
                        </div>
                      )}
                      <span className="pill">
                        {isEditorMode ? (
                          <EditableText
                            as="span"
                            value={entry.company}
                            onChange={(value) =>
                              props.onChangeExperience(index, {
                                ...entry,
                                company: value,
                              })
                            }
                            isEditorMode
                            className="editable-field"
                          />
                        ) : (
                          cleanLabel(entry.company)
                        )}
                      </span>
                    </div>
                    <ExperiencePanel
                      entry={entry}
                      index={index}
                      isEditorMode={isEditorMode}
                      onChange={(updatedEntry) =>
                        props.onChangeExperience(index, updatedEntry)
                      }
                    />
                  </article>
                ))}
                {isEditorMode && (
                  <button
                    type="button"
                    className="editor-add-btn"
                    onClick={props.onAddExperience}
                  >
                    <Plus size={14} /> Add experience entry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="wrap empty-section">
              <p className="mono">No experience entries yet.</p>
              {isEditorMode && (
                <button
                  type="button"
                  className="editor-add-btn"
                  onClick={props.onAddExperience}
                >
                  <Plus size={14} /> Add experience entry
                </button>
              )}
            </div>
          )}
        </section>

        <section
          className="sec"
          id="education"
          data-editorial-theme="light"
          data-mascot='{"x":-0.7,"y":0.5,"s":0.28,"w":0.6}'
        >
          <div className="wrap">
            <SectionLabel>Education</SectionLabel>
            <h2 className="h2 section-heading">
              The path
              <br />
              <span className="thin">so far.</span>
            </h2>
            {content?.educationLog.length ? (
              <div className="proc-grid" ref={procGridRef}>
                <div className="proc-line" aria-hidden="true">
                  <i ref={procFillRef} />
                </div>
                {content.educationLog.map((entry, index) => (
                  <article
                    className="pstep"
                    data-n={String(index + 1).padStart(2, "0")}
                    key={`${entry.degree}-${index}`}
                    ref={(node) => {
                      procStepRefs.current[index] = node;
                    }}
                  >
                    <span className="mono">{entry.year}</span>
                    <h3>{cleanLabel(entry.degree)}</h3>
                    <p>
                      <b>{cleanLabel(entry.institution)}</b>
                      <br />
                      {entry.description}
                    </p>
                    {isEditorMode && (
                      <div className="editor-row-actions">
                        <button
                          type="button"
                          onClick={() => props.onEditEducation(index)}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onDeleteEducation(index)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy">No education entries yet.</p>
            )}
            {isEditorMode && (
              <button
                type="button"
                className="editor-add-btn"
                onClick={props.onAddEducation}
              >
                <Plus size={14} /> Add education entry
              </button>
            )}
          </div>
        </section>

        <AiCodingSection />

        <section
          className="sec"
          id="projects"
          data-editorial-theme="dark"
          data-mascot='{"x":0.85,"y":0.75,"s":0.18,"w":0.4}'
        >
          <div className="wrap">
            <SectionLabel>Selected projects</SectionLabel>
            <h2 className="h2 section-heading">
              Built, trained,
              <br />
              shipped.
            </h2>
            <div
              className="project-tabs"
              role="tablist"
              aria-label="Project categories"
            >
              {PROJECT_GROUPS.map((group) => (
                <button
                  type="button"
                  role="tab"
                  id={`project-tab-${group.id}`}
                  aria-controls={`project-panel-${group.id}`}
                  aria-selected={activeProjectGroup === group.id}
                  tabIndex={activeProjectGroup === group.id ? 0 : -1}
                  key={group.id}
                  onClick={() => selectProjectGroup(group.id)}
                  onKeyDown={(event) =>
                    handleProjectTabKeyDown(event, group.id)
                  }
                >
                  <span>{group.label}</span>
                  <span className="project-tab-count">
                    {String(groupedProjectRecords[group.id].length).padStart(
                      2,
                      "0",
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`project-panel-${activeProjectGroup}`}
              aria-labelledby={`project-tab-${activeProjectGroup}`}
            >
              {visibleProjectRecords.length ? (
                <div className="work-grid">
                  <ul className="work-list">
                    {visibleProjectRecords.map((record, index) => {
                      const detailHref = `/projects/${record.categoryId}/${toProjectSlug(record.project.title)}?theme=${theme}`;
                      return (
                        <li
                          className={`work-item ${activeProject === index ? "active" : ""}`}
                          key={`${record.categoryId}-${record.project.title}-${record.projectIndex}`}
                          onMouseEnter={() => setActiveProject(index)}
                          onFocus={() => setActiveProject(index)}
                        >
                          <button
                            type="button"
                            className="work-btn"
                            aria-expanded={activeProject === index}
                            onClick={() => setActiveProject(index)}
                          >
                            <span className="idx">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="name">{record.project.title}</span>
                            <span className="cat">
                              {cleanLabel(record.categoryName)}
                            </span>
                            <span className="ext">↗</span>
                          </button>
                          <div className="work-desc">
                            <p>{projectSummary(record.project.description)}</p>
                            <div className="project-actions">
                              <Link href={detailHref}>View project</Link>
                              {record.project.githubUrl && (
                                <a
                                  href={record.project.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Repository
                                </a>
                              )}
                              {record.project.projectUrl && (
                                <a
                                  href={record.project.projectUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Live
                                </a>
                              )}
                              {isEditorMode && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      props.onEditProject(
                                        record.categoryIndex,
                                        record.projectIndex,
                                      )
                                    }
                                  >
                                    <Edit3 size={14} /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      props.onDeleteProject(
                                        record.categoryIndex,
                                        record.projectIndex,
                                      )
                                    }
                                  >
                                    <Trash2 size={14} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mobile-project-preview">
                            <ProjectPreview record={record} active />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="work-view" aria-hidden="true">
                    <div className="pv-frame">
                      {visibleProjectRecords.map((record, index) => (
                        <ProjectPreview
                          record={record}
                          active={activeProject === index}
                          key={`${record.categoryId}-${record.project.title}-preview`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty-copy">
                  No projects are available in this category yet.
                </p>
              )}
              {activeProjectRecords.length > PROJECT_PREVIEW_LIMIT && (
                <button
                  type="button"
                  className="project-reveal"
                  aria-expanded={activeProjectsExpanded}
                  onClick={() => {
                    setExpandedProjectGroups((groups) => ({
                      ...groups,
                      [activeProjectGroup]: !activeProjectsExpanded,
                    }));
                    if (activeProjectsExpanded) setActiveProject(0);
                  }}
                >
                  <span>
                    {activeProjectsExpanded ? "Show fewer" : "Show all"}
                  </span>
                  <span className="mono">
                    {activeProjectsExpanded
                      ? "↑"
                      : `+${activeProjectRecords.length - PROJECT_PREVIEW_LIMIT}`}
                  </span>
                </button>
              )}
            </div>
            {isEditorMode && content && (
              <div className="add-project-row">
                {content.projectCategories.map((category, index) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => props.onAddProject(index)}
                  >
                    <Plus size={15} /> Add to {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          className="sec"
          id="toolkit"
          data-editorial-theme="light"
          data-mascot='{"x":-0.55,"y":-0.55,"s":0.35,"w":1.6}'
        >
          <div className="wrap">
            <SectionLabel>Skill tags</SectionLabel>
            <div className="kit-head">
              <h2 className="h2">
                Everything here has
                <br />
                <span className="thin">shipped somewhere.</span>
              </h2>
            </div>
            {isEditorMode && content ? (
              <div className="kit-editor" aria-label="Edit technology tags">
                {SKILL_GROUPS.map((group) => (
                  <div className="kit-group" key={group}>
                    <h3 className="mono">{group}</h3>
                    <div className="kit-group-tags">
                      {content.skillsData[group].map((skill, index) => (
                        <span className="tag" key={`${group}-${index}`}>
                          <EditableText
                            as="span"
                            value={skill}
                            onChange={(value) =>
                              props.onUpdateSkills(
                                group,
                                content.skillsData[group].map((current, idx) =>
                                  idx === index ? value : current,
                                ),
                              )
                            }
                            isEditorMode
                            className="editable-field"
                          />
                          <button
                            type="button"
                            className="tag-remove"
                            title="Remove skill"
                            onClick={() =>
                              props.onUpdateSkills(
                                group,
                                content.skillsData[group].filter(
                                  (_, idx) => idx !== index,
                                ),
                              )
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        className="tag tag-add"
                        onClick={() =>
                          props.onUpdateSkills(group, [
                            ...content.skillsData[group],
                            "New skill",
                          ])
                        }
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="kit-field static" aria-label="Technology tags">
                {skillTags.length ? (
                  skillTags.map((tag, index) => (
                    <span className="tag" key={`${tag}-${index}`}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <p>No skills are available yet.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section
          className="sec portfolio-tools"
          id="portfolio-tools"
          data-editorial-theme="dark"
          data-mascot='{"x":0.86,"y":-0.5,"s":0.2,"w":0.4}'
        >
          <div className="wrap">
            <SectionLabel>Portfolio tools</SectionLabel>
            <div className="ai-intro">
              <h2 className="h2">
                Explore the work.
                <br />
                <span className="thin">Use the real tools.</span>
              </h2>
              <p>
                Search the portfolio semantically, open the generated CV, switch
                the reading theme, or authenticate to maintain the
                MongoDB-backed content.
              </p>
            </div>
            <div className="tool-grid">
              <article className="tool-card">
                <span className="mono">01 · Semantic search</span>
                <h3>Find work by meaning.</h3>
                <p>
                  Search projects, experience, education, and skills using the
                  portfolio&apos;s existing local embeddings.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => openSearchFrom(null)}
                >
                  <Sparkles size={18} /> Semantic search{" "}
                  <span className="arr">→</span>
                </button>
                <p className="mono search-hint">
                  tip: click the floating puppet, or press ⌘K
                </p>
              </article>
              <article className="tool-card">
                <span className="mono">02 · Curriculum vitae</span>
                <h3>View or download the CV.</h3>
                <p>
                  The dedicated CV route continues to use the same
                  database-backed portfolio content and presets.
                </p>
                <Link className="btn" href="/cv">
                  <FileText size={18} /> Open CV <span className="arr">→</span>
                </Link>
              </article>
            </div>
          </div>
        </section>

        <footer
          className="contact"
          id="contact"
          data-editorial-theme="dark"
          data-mascot='{"x":0,"y":0.42,"s":0.6,"w":0.8}'
        >
          <div className="wrap">
            <h2 className="h2">
              Let&apos;s build
              <br />
              something.
            </h2>
            <div className="contact-cta">
              <a className="btn" href={`mailto:${EMAIL}?subject=Hello`}>
                Email me <span className="arr">→</span>
              </a>
            </div>
            <div className="contact-cols">
              <div>
                <h4>Email</h4>
                <p>
                  <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                </p>
              </div>
              <div>
                <h4>Profile</h4>
                <p>{content?.profileData.title}</p>
              </div>
              <div>
                <h4>Latest deployment</h4>
                <p>
                  {isEditorMode ? (
                    <EditableText
                      as="span"
                      value={content?.lastDeployment || ""}
                      onChange={props.onUpdateLastDeployment}
                      isEditorMode
                      className="editable-field"
                    />
                  ) : (
                    content?.lastDeployment || "Available on request"
                  )}
                </p>
              </div>
            </div>
            <div className="foot-mark" aria-hidden="true">
              {firstName.toLowerCase()}*
            </div>
            <div className="foot-base">
              <p className="mono">
                © {displayName} {new Date().getFullYear()}
              </p>
              <div className="socials">
                <a href={GITHUB} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a href={LINKEDIN} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                <Link href="/cv">CV</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <div
        className="utility-dock"
        aria-label="Portfolio controls"
        aria-hidden={tourWelcomeOpen || undefined}
      >
        <ColorPicker
          defaultH={props.accentColor.h}
          defaultS={props.accentColor.s}
          defaultL={props.accentColor.l}
          onColorChange={props.onColorChange}
          canPersist={isAuthenticated}
          onPersistDefault={props.onPersistAccentColor}
        />
        <button
          type="button"
          onClick={props.onToggleTheme}
          title={`Use ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
          <span>Theme</span>
        </button>
        <button
          type="button"
          onClick={props.onToggleEditor}
          title={isEditorMode ? "Leave editor mode" : "Enter editor mode"}
        >
          <Edit3 />
          <span>{isEditorMode ? "Editing" : "Edit"}</span>
        </button>
        {isAuthenticated && (
          <button type="button" onClick={props.onLogout} title="Log out">
            <LogOut />
            <span>Logout</span>
          </button>
        )}
      </div>
    </div>
  );
}
