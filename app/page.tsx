"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AuthModal } from "@/components/auth-modal";
import {
  CONTENT_HUB_CHANNEL,
  ContentHubDrawer,
} from "@/components/content-hub-drawer";
import { ProjectForm } from "@/components/project-form";
import { EducationForm } from "@/components/portfolio/education-form";
import { EditorialPortfolio } from "@/components/portfolio/editorial-portfolio";
import {
  cloneDefaultContent,
  type EducationEntry,
  type ExperienceEntry,
  type PortfolioContent,
  type Project,
  type ProjectCategory,
  type SystemStatus,
  type ThemeColor,
  withDefaultCustomColor,
} from "@/lib/default-content";
import { DEFAULT_THEME_COLORS, type ThemeMode } from "@/lib/theme";

const parseThemeParam = (value: string | null): ThemeMode | null => {
  if (value === "dark" || value === "light") {
    return value;
  }

  return null;
};

const extractStartYear = (yearRange: string): number => {
  const match = yearRange.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : Number.NEGATIVE_INFINITY;
};

const sortEducationEntries = (
  entries: EducationEntry[] | undefined,
): EducationEntry[] => {
  if (!entries) {
    return [];
  }

  return [...entries].sort(
    (first, second) =>
      extractStartYear(second.year) - extractStartYear(first.year),
  );
};

const calculateProjectCount = (categories: ProjectCategory[]): number =>
  categories.reduce((total, category) => total + category.projects.length, 0);

const ensureProjectCvVisibility = (
  categories: ProjectCategory[] | undefined,
): ProjectCategory[] => {
  if (!categories) {
    return [];
  }

  return categories.map((category) => ({
    ...category,
    projects: category.projects.map((project) => ({
      ...project,
      showInCv: project.showInCv ?? true,
    })),
  }));
};

const generateSystemStatusId = (label?: string) => {
  const normalized = label?.toLowerCase().replace(/\s+/g, "-") ?? "status";
  return `status-${normalized}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const ensureSystemStatusEntries = (
  entries: SystemStatus | undefined,
): SystemStatus => {
  if (entries && entries.length > 0) {
    return entries.map((entry) => ({
      ...entry,
      id: entry.id || generateSystemStatusId(entry.label),
    }));
  }

  return cloneDefaultContent().systemStatus;
};

const withDerivedContent = (content: PortfolioContent): PortfolioContent => {
  const educationLog = sortEducationEntries(content.educationLog);
  const projectCategories = ensureProjectCvVisibility(
    content.projectCategories,
  );
  const projectsCount = calculateProjectCount(projectCategories);
  const systemStatus = ensureSystemStatusEntries(content.systemStatus);

  return {
    ...content,
    educationLog,
    projectCategories,
    systemStatus,
    aboutStats: {
      ...content.aboutStats,
      projects: String(projectsCount),
    },
  };
};

type EditingProjectState = {
  categoryIndex: number;
  projectIndex: number;
} | null;

type AuthResult = { success: boolean; error?: string };
type ContentSaveState = "idle" | "saving" | "saved" | "conflict" | "error";
type VisibilityTarget = {
  entityType: "experience" | "education" | "project";
  entityId: string;
  showcase: boolean;
  presetIds: string[];
};

type PendingAddition =
  | { kind: "experience"; value: ExperienceEntry; showcase: boolean; presetIds: string[] }
  | { kind: "education"; value: EducationEntry; showcase: boolean; presetIds: string[] }
  | { kind: "project"; value: Project; categoryIndex: number; showcase: boolean; presetIds: string[] };

const CONTENT_CACHE_KEY = "portfolio:content-cache:v1";
let memoryContentCache: PortfolioContent | null = null;

const cachePortfolioContent = (content: PortfolioContent) => {
  memoryContentCache = content;
  try {
    window.sessionStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(content));
  } catch {
    // The live API remains authoritative when browser storage is unavailable.
  }
};

const readPortfolioContentCache = (): PortfolioContent | null => {
  if (memoryContentCache) return memoryContentCache;
  try {
    const cached = window.sessionStorage.getItem(CONTENT_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as PortfolioContent;
    const normalized = withDerivedContent(withDefaultCustomColor(parsed));
    memoryContentCache = normalized;
    return normalized;
  } catch {
    return null;
  }
};

export default function TechDashboardPortfolio() {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<ThemeMode>(
    () => parseThemeParam(searchParams.get("theme")) ?? "dark",
  );
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [editingProject, setEditingProject] =
    useState<EditingProjectState>(null);
  const [editingEducationIndex, setEditingEducationIndex] = useState<
    number | null
  >(null);
  /* Always render a complete document on the first frame. The live payload is
     layered onto this synchronously from cache and then refreshed from the
     API, so a browser recovery can never expose the full-page loading screen. */
  const [content, setContent] = useState<PortfolioContent | null>(() =>
    withDerivedContent(cloneDefaultContent()),
  );
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [showContentHub, setShowContentHub] = useState(false);
  const [pendingAddition, setPendingAddition] = useState<PendingAddition | null>(null);
  const [presetTargets, setPresetTargets] = useState<Array<{ id: string; name: string }>>([]);
  const [contentSaveState, setContentSaveState] =
    useState<ContentSaveState>("idle");
  const [hubRevision, setHubRevision] = useState<number | null>(null);
  const [saveConflict, setSaveConflict] = useState<{
    draft: PortfolioContent;
    latest: PortfolioContent;
    revision: number;
  } | null>(null);
  const hubRevisionRef = useRef<number | null>(null);
  const pendingContentRef = useRef<{
    content: PortfolioContent;
    visibility?: VisibilityTarget[];
  } | null>(null);
  const contentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const [sessionThemeOverrides, setSessionThemeOverrides] = useState<
    Partial<Record<ThemeMode, ThemeColor>>
  >({});

  const persistContent = useCallback(
    (data: PortfolioContent, visibility?: VisibilityTarget[]) => {
      if (!isAuthenticated) {
        return;
      }
      pendingContentRef.current = { content: data, visibility };
      setContentSaveState("saving");
      if (contentSaveTimerRef.current) clearTimeout(contentSaveTimerRef.current);
      contentSaveTimerRef.current = setTimeout(() => {
        const pending = pendingContentRef.current;
        pendingContentRef.current = null;
        if (!pending) return;
        const draft = pending.content;
        contentSaveChainRef.current = contentSaveChainRef.current.then(async () => {
          const baseRevision = hubRevisionRef.current;
          if (baseRevision === null) {
            setContentSaveState("error");
            return;
          }
          try {
            const response = await fetch("/api/editor/content", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                baseRevision,
                operations: [{
                  type: "replace-portfolio",
                  content: draft,
                  visibility: pending.visibility,
                }],
              }),
            });
            const payload = (await response.json().catch(() => null)) as
              | { revision?: number; content?: PortfolioContent; error?: string }
              | null;
            if (response.status === 409 && payload?.content && typeof payload.revision === "number") {
              setSaveConflict({ draft, latest: payload.content, revision: payload.revision });
              setContentSaveState("conflict");
              return;
            }
            if (!response.ok || typeof payload?.revision !== "number") {
              throw new Error(payload?.error || "Failed to save content");
            }
            hubRevisionRef.current = payload.revision;
            setHubRevision(payload.revision);
            setSaveConflict(null);
            setContentSaveState("saved");
            const channel = new BroadcastChannel(CONTENT_HUB_CHANNEL);
            channel.postMessage({ revision: payload.revision });
            channel.close();
            window.setTimeout(() => setContentSaveState("idle"), 1600);
          } catch (error) {
            console.error("Failed to persist content", error);
            setContentSaveState("error");
          }
        });
      }, 450);
    },
    [isAuthenticated],
  );

  const applyContentUpdate = useCallback(
    (
      updater: (previous: PortfolioContent) => PortfolioContent,
      shouldPersist = true,
      visibility?: VisibilityTarget[],
    ) => {
      setContent((previous) => {
        if (!previous) {
          return previous;
        }
        const updated = withDerivedContent(updater(previous));
        if (shouldPersist) {
          void persistContent(updated, visibility);
        }
        cachePortfolioContent(updated);
        return updated;
      });
    },
    [persistContent],
  );

  const fetchContent = useCallback(async () => {
    setIsContentLoading(true);
    setContentError(null);
    try {
      const response = await fetch("/api/content");
      if (!response.ok) {
        throw new Error(`Failed to load content: ${response.status}`);
      }
      const data = (await response.json()) as {
        content?: PortfolioContent;
        revision?: number | null;
      };
      if (typeof data.revision === "number") {
        hubRevisionRef.current = data.revision;
        setHubRevision(data.revision);
      }
      const nextContent = data.content
        ? withDerivedContent(withDefaultCustomColor(data.content))
        : withDerivedContent(cloneDefaultContent());
      cachePortfolioContent(nextContent);
      setContent(nextContent);
    } catch (error) {
      console.error("Failed to load content", error);
      setContentError("Unable to load portfolio content.");
      const fallbackContent = withDerivedContent(cloneDefaultContent());
      cachePortfolioContent(fallbackContent);
      setContent(fallbackContent);
    } finally {
      setIsContentLoading(false);
    }
  }, []);

  /* Hydrate the last successful public payload before the browser paints. A
     tab recovery or App Router remount can then refresh in the background
     without flashing the full-page loading placeholder. */
  useLayoutEffect(() => {
    const cachedContent = readPortfolioContentCache();
    if (cachedContent) setContent(cachedContent);
  }, []);

  const accentColor = useMemo(() => {
    const override = sessionThemeOverrides[theme];
    if (override) {
      return override;
    }

    if (content) {
      const themeColor = content.themeColors?.[theme];
      if (themeColor) {
        return themeColor;
      }
    }

    return DEFAULT_THEME_COLORS[theme];
  }, [content, sessionThemeOverrides, theme]);

  useEffect(() => {
    const paramValue = searchParams.get("theme");
    const paramTheme = parseThemeParam(paramValue);

    if (paramTheme) {
      setTheme((previous) => (previous === paramTheme ? previous : paramTheme));
      return;
    }

    if (paramValue) {
      setTheme((previous) => (previous === "dark" ? previous : "dark"));

      const params = new URLSearchParams(searchParams.toString());
      params.set("theme", "dark");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      return;
    }

    setTheme((previous) => (previous === "dark" ? previous : "dark"));
  }, [pathname, router, searchParams]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");

    const root = document.documentElement;
    const { h, s, l } = accentColor;

    root.style.setProperty("--primary", `hsl(${h}, ${s}%, ${l}%)`);
    root.style.setProperty("--accent", `hsl(${h}, ${s}%, ${l}%)`);
    root.style.setProperty("--ring", `hsl(${h}, ${s}%, ${l}%)`);
    root.style.setProperty(
      "--border",
      `hsl(${h}, ${s}%, ${Math.max(Math.min(l * 0.4, 100), 0)}%)`,
    );
  }, [theme, accentColor]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { authenticated?: boolean };
        if (data.authenticated) {
          setIsAuthenticated(true);
          setIsEditorMode(true);
        }
      } catch (error) {
        console.error("Failed to verify session", error);
      }
    };

    void checkSession();
    void fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    const refreshIfSafe = () => {
      if (
        contentSaveState === "idle" ||
        contentSaveState === "saved"
      ) {
        void fetchContent();
      }
    };
    const channel = new BroadcastChannel(CONTENT_HUB_CHANNEL);
    channel.onmessage = (event) => {
      const revision = (event.data as { revision?: unknown } | null)?.revision;
      if (typeof revision === "number" && revision > (hubRevisionRef.current ?? -1)) {
        refreshIfSafe();
      }
    };
    window.addEventListener("focus", refreshIfSafe);
    return () => {
      channel.close();
      window.removeEventListener("focus", refreshIfSafe);
    };
  }, [contentSaveState, fetchContent]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    const params = new URLSearchParams(searchParams.toString());
    params.set("theme", nextTheme);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleAuthenticate = async (password: string): Promise<AuthResult> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json().catch(() => ({}))) as AuthResult;

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Authentication failed" };
      }

      setIsAuthenticated(true);
      setIsEditorMode(true);
      setShowAuthModal(false);
      await fetchContent();

      return { success: true };
    } catch (error) {
      console.error("Authentication error", error);
      return { success: false, error: "Unable to authenticate" };
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Failed to logout", error);
    }

    setIsAuthenticated(false);
    setIsEditorMode(false);
  };

  const handleToggleEditor = () => {
    if (isAuthenticated) {
      setIsEditorMode((previous) => !previous);
    } else {
      setShowAuthModal(true);
    }
  };

  const prepareAddition = async (addition: PendingAddition) => {
    try {
      const response = await fetch("/api/editor/content", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as
        | { presets?: Array<{ id: string; name: string }> }
        | null;
      if (response.ok && data?.presets) {
        setPresetTargets(data.presets.map(({ id, name }) => ({ id, name })));
      }
    } catch (error) {
      console.error("Failed to load preset visibility targets", error);
    }
    setPendingAddition(addition);
  };

  const handleAddProject = (categoryIndex = activeCategoryIndex) => {
    setActiveCategoryIndex(categoryIndex);
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (categoryIndex: number, projectIndex: number) => {
    setActiveCategoryIndex(categoryIndex);
    setEditingProject({ categoryIndex, projectIndex });
    setShowProjectForm(true);
  };

  const handleDeleteProject = (categoryIndex: number, projectIndex: number) => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }

    applyContentUpdate((previous) => {
      const updatedCategories = previous.projectCategories.map(
        (category, index) => {
          if (index !== categoryIndex) {
            return category;
          }

          return {
            ...category,
            projects: category.projects.filter(
              (_, idx) => idx !== projectIndex,
            ),
          };
        },
      );

      return { ...previous, projectCategories: updatedCategories };
    });
  };

  const handleSaveProject = (project: Project) => {
    const normalizedProject: Project = {
      ...project,
      githubUrl:
        project.githubUrl && project.githubUrl.trim().length > 0
          ? project.githubUrl.trim()
          : undefined,
      projectUrl:
        project.projectUrl && project.projectUrl.trim().length > 0
          ? project.projectUrl.trim()
          : undefined,
    };

    if (!editingProject) {
      const value = {
        ...normalizedProject,
        id: normalizedProject.id || `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      void prepareAddition({
        kind: "project",
        value,
        categoryIndex: activeCategoryIndex,
        showcase: false,
        presetIds: [],
      });
      setShowProjectForm(false);
      return;
    }

    applyContentUpdate((previous) => {
      const updatedCategories = previous.projectCategories.map(
        (category, index) => {
          const projects = category.projects.map(
            (existingProject, projectIndex) => {
              const isEditedProject =
                editingProject?.categoryIndex === index &&
                editingProject.projectIndex === projectIndex;

              if (
                normalizedProject.featuredRank &&
                existingProject.featuredRank ===
                  normalizedProject.featuredRank &&
                !isEditedProject
              ) {
                return { ...existingProject, featuredRank: undefined };
              }

              return existingProject;
            },
          );

          if (editingProject && index === editingProject.categoryIndex) {
            projects[editingProject.projectIndex] = normalizedProject;
            return { ...category, projects };
          }

          if (!editingProject && index === activeCategoryIndex) {
            return {
              ...category,
              projects: [...projects, normalizedProject],
            };
          }

          return { ...category, projects };
        },
      );

      return { ...previous, projectCategories: updatedCategories };
    });

    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleAddEducation = () => {
    setEditingEducationIndex(null);
    setShowEducationForm(true);
  };

  const handleEditEducation = (index: number) => {
    setEditingEducationIndex(index);
    setShowEducationForm(true);
  };

  const handleDeleteEducation = (index: number) => {
    if (
      !window.confirm("Are you sure you want to delete this education entry?")
    ) {
      return;
    }

    applyContentUpdate((previous) => ({
      ...previous,
      educationLog: (previous.educationLog ?? []).filter(
        (_, idx) => idx !== index,
      ),
    }));
  };

  const handleSaveEducation = (education: EducationEntry) => {
    if (editingEducationIndex === null) {
      const value = {
        ...education,
        id: education.id || `education-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      void prepareAddition({
        kind: "education",
        value,
        showcase: false,
        presetIds: [],
      });
      setShowEducationForm(false);
      return;
    }
    applyContentUpdate((previous) => {
      const educationLog = [...(previous.educationLog ?? [])];

      if (editingEducationIndex !== null) {
        educationLog[editingEducationIndex] = education;
      } else {
        educationLog.push(education);
      }

      return { ...previous, educationLog };
    });

    setShowEducationForm(false);
    setEditingEducationIndex(null);
  };

  const handleColorChange = useCallback(
    (h: number, s: number, l: number) => {
      setSessionThemeOverrides((previous) => ({
        ...previous,
        [theme]: { h, s, l },
      }));
    },
    [theme],
  );

  const handlePersistAccentColor = useCallback(
    (color: ThemeColor) => {
      applyContentUpdate((previous) => ({
        ...previous,
        themeColors: {
          ...previous.themeColors,
          [theme]: color,
        },
      }));

      setSessionThemeOverrides((previous) => {
        const next = { ...previous };
        delete next[theme];
        return next;
      });

      toast.success(`Saved ${theme.toUpperCase()} theme accent color`);
    },
    [applyContentUpdate, theme],
  );

  const updateProfileField = (
    field: keyof PortfolioContent["profileData"],
    value: string,
  ) => {
    applyContentUpdate((previous) => ({
      ...previous,
      profileData: { ...previous.profileData, [field]: value },
    }));
  };

  const updateAboutStat = (
    field: keyof PortfolioContent["aboutStats"],
    value: string,
  ) => {
    if (field === "projects") {
      return;
    }

    applyContentUpdate((previous) => ({
      ...previous,
      aboutStats: { ...previous.aboutStats, [field]: value },
    }));
  };

  const updateSystemStatusValue = (id: string, value: number) => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: previous.systemStatus.map((entry) =>
        entry.id === id
          ? { ...entry, value: Math.max(0, Math.min(100, value)) }
          : entry,
      ),
    }));
  };

  const updateSystemStatusLabel = (id: string, label: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: previous.systemStatus.map((entry) =>
        entry.id === id
          ? { ...entry, label: label.trim().length > 0 ? label : entry.label }
          : entry,
      ),
    }));
  };

  const handleAddSystemStatusEntry = () => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: [
        ...previous.systemStatus,
        {
          id: generateSystemStatusId("new-skill"),
          label: "NEW_SKILL",
          value: 50,
        },
      ],
    }));
  };

  const handleRemoveSystemStatusEntry = (id: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: previous.systemStatus.filter((entry) => entry.id !== id),
    }));
  };

  const updateLastDeployment = (value: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      lastDeployment: value,
    }));
  };

  const updateSkills = (
    field: keyof PortfolioContent["skillsData"],
    skills: string[],
  ) => {
    applyContentUpdate((previous) => ({
      ...previous,
      skillsData: { ...previous.skillsData, [field]: skills },
    }));
  };

  const projectCategories = content?.projectCategories ?? [];
  const projectCategoryCount = projectCategories.length;

  useEffect(() => {
    if (projectCategoryCount === 0) {
      setActiveCategoryIndex(0);
      return;
    }

    if (activeCategoryIndex >= projectCategoryCount) {
      setActiveCategoryIndex(projectCategoryCount - 1);
    }
  }, [activeCategoryIndex, projectCategoryCount]);

  const activeCategory =
    projectCategoryCount > 0
      ? projectCategories[
          Math.min(activeCategoryIndex, projectCategoryCount - 1)
        ]
      : null;

  const handleAddExperienceEntry = () => {
    const currentYear = new Date().getFullYear();
    const newEntry: ExperienceEntry = {
      id: `experience-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      year: `${currentYear} - PRESENT`,
      title: "NEW_ROLE_TITLE",
      company: "Company Name",
      description: "Describe your impact and responsibilities.",
      tags: ["Skill"],
    };

    void prepareAddition({
      kind: "experience",
      value: newEntry,
      showcase: false,
      presetIds: [],
    });
  };

  const handleExperienceChange = (
    index: number,
    updatedEntry: ExperienceEntry,
  ) => {
    applyContentUpdate((previous) => ({
      ...previous,
      experienceLog: previous.experienceLog.map((entry, idx) =>
        idx === index ? updatedEntry : entry,
      ),
    }));
  };

  const handleDeleteExperienceEntry = (index: number) => {
    if (
      !window.confirm("Are you sure you want to delete this experience entry?")
    ) {
      return;
    }

    applyContentUpdate((previous) => ({
      ...previous,
      experienceLog: previous.experienceLog.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <>
      <ContentHubDrawer
        open={showContentHub}
        onClose={() => {
          setShowContentHub(false);
          void fetchContent();
        }}
      />
      {pendingAddition && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 11000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(3,7,18,.76)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-visibility-title"
            style={{
              width: "min(560px, 100%)",
              padding: 24,
              background: "#f6f2e9",
              color: "#111827",
              border: "1px solid #94a3b8",
              boxShadow: "0 28px 80px rgba(0,0,0,.4)",
            }}
          >
            <span style={{ font: "800 10px ui-monospace, monospace", letterSpacing: ".12em", textTransform: "uppercase", color: "#64748b" }}>
              Canonical Atlas destination
            </span>
            <h2 id="portfolio-visibility-title" style={{ margin: "6px 0 8px", fontSize: 30 }}>
              Where should this {pendingAddition.kind} appear?
            </h2>
            <p style={{ margin: "0 0 18px", color: "#475569", fontSize: 13 }}>
              Choose at least one destination. The item is stored once and referenced everywhere else.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "white", border: "1px solid #cbd5e1" }}>
                <input type="checkbox" checked={pendingAddition.showcase} onChange={(event) => setPendingAddition({ ...pendingAddition, showcase: event.target.checked })} style={{ width: 20, height: 20 }} />
                Public showcase
              </label>
              {presetTargets.map((preset) => (
                <label key={preset.id} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "white", border: "1px solid #cbd5e1" }}>
                  <input
                    type="checkbox"
                    checked={pendingAddition.presetIds.includes(preset.id)}
                    onChange={(event) => setPendingAddition({
                      ...pendingAddition,
                      presetIds: event.target.checked
                        ? [...pendingAddition.presetIds, preset.id]
                        : pendingAddition.presetIds.filter((id) => id !== preset.id),
                    })}
                    style={{ width: 20, height: 20 }}
                  />
                  CV · {preset.name}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button type="button" onClick={() => setPendingAddition(null)} style={{ minHeight: 44, padding: "0 16px", border: "1px solid #64748b", background: "transparent" }}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!pendingAddition.showcase && pendingAddition.presetIds.length === 0}
                onClick={() => {
                  const entityId = pendingAddition.value.id || "";
                  const target: VisibilityTarget = {
                    entityType: pendingAddition.kind === "project" ? "project" : pendingAddition.kind,
                    entityId,
                    showcase: pendingAddition.showcase,
                    presetIds: pendingAddition.presetIds,
                  };
                  applyContentUpdate((previous) => {
                    if (pendingAddition.kind === "experience") {
                      return {
                        ...previous,
                        experienceLog: [...previous.experienceLog, { ...pendingAddition.value, showcaseVisible: pendingAddition.showcase }],
                      };
                    }
                    if (pendingAddition.kind === "education") {
                      return {
                        ...previous,
                        educationLog: [...previous.educationLog, { ...pendingAddition.value, showcaseVisible: pendingAddition.showcase }],
                      };
                    }
                    return {
                      ...previous,
                      projectCategories: previous.projectCategories.map((category, index) =>
                        index === pendingAddition.categoryIndex
                          ? {
                              ...category,
                              projects: [
                                ...category.projects,
                                {
                                  ...pendingAddition.value,
                                  showcaseVisible: pendingAddition.showcase,
                                  showInCv: pendingAddition.presetIds.length > 0,
                                },
                              ],
                            }
                          : category,
                      ),
                    };
                  }, true, [target]);
                  setPendingAddition(null);
                }}
                style={{ minHeight: 44, padding: "0 16px", border: 0, background: "#111827", color: "white", opacity: !pendingAddition.showcase && pendingAddition.presetIds.length === 0 ? .45 : 1 }}
              >
                Create canonical item
              </button>
            </div>
          </div>
        </div>
      )}
      {isAuthenticated && contentSaveState !== "idle" && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,.28)",
            background: contentSaveState === "error" || contentSaveState === "conflict" ? "#7f1d1d" : "#111827",
            color: "white",
            font: "700 12px ui-monospace, monospace",
          }}
        >
          {contentSaveState === "saving" && "Saving to Atlas…"}
          {contentSaveState === "saved" && `Saved · revision ${hubRevision ?? "—"}`}
          {contentSaveState === "error" && "Atlas save failed. Your local edit is still visible."}
          {contentSaveState === "conflict" && saveConflict && (
            <>
              <span>Another editor saved first.</span>
              <button
                type="button"
                onClick={() => {
                  hubRevisionRef.current = saveConflict.revision;
                  setHubRevision(saveConflict.revision);
                  const draft = saveConflict.draft;
                  setSaveConflict(null);
                  persistContent(draft);
                }}
                style={{ minHeight: 32, padding: "0 10px", border: 0, background: "white", color: "#7f1d1d" }}
              >
                Keep mine
              </button>
              <button
                type="button"
                onClick={() => {
                  const latest = withDerivedContent(withDefaultCustomColor(saveConflict.latest));
                  hubRevisionRef.current = saveConflict.revision;
                  setHubRevision(saveConflict.revision);
                  setContent(latest);
                  cachePortfolioContent(latest);
                  setSaveConflict(null);
                  setContentSaveState("idle");
                }}
                style={{ minHeight: 32, padding: "0 10px", border: "1px solid white", background: "transparent", color: "white" }}
              >
                Use Atlas
              </button>
            </>
          )}
        </div>
      )}
      {showAuthModal && (
        <AuthModal
          onAuthenticate={handleAuthenticate}
          onClose={() => setShowAuthModal(false)}
        />
      )}
      {showProjectForm && activeCategory && (
        <ProjectForm
          project={
            editingProject
              ? projectCategories[editingProject.categoryIndex].projects[
                  editingProject.projectIndex
                ]
              : undefined
          }
          onSave={handleSaveProject}
          onCancel={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}
        />
      )}
      {showEducationForm && content && (
        <EducationForm
          education={
            editingEducationIndex !== null
              ? content.educationLog[editingEducationIndex]
              : undefined
          }
          onSave={handleSaveEducation}
          onCancel={() => {
            setShowEducationForm(false);
            setEditingEducationIndex(null);
          }}
        />
      )}

      <EditorialPortfolio
        content={content}
        contentError={contentError}
        isContentLoading={isContentLoading}
        theme={theme}
        isEditorMode={isEditorMode}
        isAuthenticated={isAuthenticated}
        onRetry={() => void fetchContent()}
        onToggleTheme={toggleTheme}
        onToggleEditor={handleToggleEditor}
        onLogout={() => void handleLogout()}
        onOpenContentHub={() => setShowContentHub(true)}
        onAddProject={handleAddProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onAddEducation={handleAddEducation}
        onEditEducation={handleEditEducation}
        onDeleteEducation={handleDeleteEducation}
        onAddExperience={handleAddExperienceEntry}
        onChangeExperience={handleExperienceChange}
        onDeleteExperience={handleDeleteExperienceEntry}
        onUpdateProfileField={updateProfileField}
        onUpdateAboutStat={updateAboutStat}
        onUpdateSystemStatusValue={updateSystemStatusValue}
        onUpdateSystemStatusLabel={updateSystemStatusLabel}
        onAddSystemStatus={handleAddSystemStatusEntry}
        onRemoveSystemStatus={handleRemoveSystemStatusEntry}
        onUpdateLastDeployment={updateLastDeployment}
        onUpdateSkills={updateSkills}
        accentColor={accentColor}
        onColorChange={handleColorChange}
        onPersistAccentColor={handlePersistAccentColor}
      />
    </>
  );
}
