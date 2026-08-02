"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AuthModal } from "@/components/auth-modal";
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
  const [sessionThemeOverrides, setSessionThemeOverrides] = useState<
    Partial<Record<ThemeMode, ThemeColor>>
  >({});

  const persistContent = useCallback(
    async (data: PortfolioContent) => {
      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          console.error("Failed to persist content", await response.text());
        }
      } catch (error) {
        console.error("Failed to persist content", error);
      }
    },
    [isAuthenticated],
  );

  const applyContentUpdate = useCallback(
    (
      updater: (previous: PortfolioContent) => PortfolioContent,
      shouldPersist = true,
    ) => {
      setContent((previous) => {
        if (!previous) {
          return previous;
        }
        const updated = withDerivedContent(updater(previous));
        if (shouldPersist) {
          void persistContent(updated);
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
      const data = (await response.json()) as { content?: PortfolioContent };
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
      year: `${currentYear} - PRESENT`,
      title: "NEW_ROLE_TITLE",
      company: "Company Name",
      description: "Describe your impact and responsibilities.",
      tags: ["Skill"],
    };

    applyContentUpdate((previous) => ({
      ...previous,
      experienceLog: [...previous.experienceLog, newEntry],
    }));
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
