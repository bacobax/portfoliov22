"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { AuthModal } from "@/components/auth-modal"
import { GridTrails } from "@/components/grid-trails"
import { ParticleBrain } from "@/components/particle-brain"
import { ParticleEngine } from "@/components/particle-engine"
import { ParticleSphere } from "@/components/particle-sphere"
import { ProjectForm } from "@/components/project-form"
import { AboutSection } from "@/components/portfolio/about-section"
import { EducationForm } from "@/components/portfolio/education-form"
import { EducationSection } from "@/components/portfolio/education-section"
import { EditorModeBanner } from "@/components/portfolio/editor-mode-banner"
import { ExperienceSection } from "@/components/portfolio/experience-section"
import { PortfolioFooter } from "@/components/portfolio/portfolio-footer"
import { PortfolioHeader } from "@/components/portfolio/portfolio-header"
import { ProjectsSection, type ProjectVisualComponent } from "@/components/portfolio/projects-section"
import {
  AboutSectionSkeleton,
  EducationSectionSkeleton,
  ExperienceSectionSkeleton,
  ProjectsSectionSkeleton,
  SkillsSectionSkeleton,
} from "@/components/portfolio/sections-skeleton"
import { SectionTabs, type SectionKey } from "@/components/portfolio/section-tabs"
import { SkillsSection } from "@/components/portfolio/skills-section"
import { TechCursor } from "@/components/tech-cursor"
import {
  cloneDefaultContent,
  type EducationEntry,
  type ExperienceEntry,
  type PortfolioContent,
  type Project,
  type ProjectCategory,
  type ProjectVisual,
  type SystemStatus,
  type ThemeColor,
  withDefaultCustomColor,
} from "@/lib/default-content"
import { DEFAULT_THEME_COLORS, type ThemeMode } from "@/lib/theme"

const projectVisualComponentMap: Record<ProjectVisual, ProjectVisualComponent> = {
  brain: ParticleBrain,
  sphere: ParticleSphere,
  engine: ParticleEngine,
}

const parseThemeParam = (value: string | null): ThemeMode | null => {
  if (value === "dark" || value === "light") {
    return value
  }

  return null
}

const extractStartYear = (yearRange: string): number => {
  const match = yearRange.match(/\d{4}/)
  return match ? Number.parseInt(match[0], 10) : Number.NEGATIVE_INFINITY
}

const sortEducationEntries = (entries: EducationEntry[] | undefined): EducationEntry[] => {
  if (!entries) {
    return []
  }

  return [...entries].sort((first, second) => extractStartYear(second.year) - extractStartYear(first.year))
}

const calculateProjectCount = (categories: ProjectCategory[]): number =>
  categories.reduce((total, category) => total + category.projects.length, 0)

const ensureProjectCvVisibility = (
  categories: ProjectCategory[] | undefined,
): ProjectCategory[] => {
  if (!categories) {
    return []
  }

  return categories.map((category) => ({
    ...category,
    projects: category.projects.map((project) => ({
      ...project,
      showInCv: project.showInCv ?? true,
    })),
  }))
}

const generateSystemStatusId = (label?: string) => {
  const normalized = label?.toLowerCase().replace(/\s+/g, "-") ?? "status"
  return `status-${normalized}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

const ensureSystemStatusEntries = (entries: SystemStatus | undefined): SystemStatus => {
  if (entries && entries.length > 0) {
    return entries.map((entry) => ({
      ...entry,
      id: entry.id || generateSystemStatusId(entry.label),
    }))
  }

  return cloneDefaultContent().systemStatus
}

const withDerivedContent = (content: PortfolioContent): PortfolioContent => {
  const educationLog = sortEducationEntries(content.educationLog)
  const projectCategories = ensureProjectCvVisibility(content.projectCategories)
  const projectsCount = calculateProjectCount(projectCategories)
  const systemStatus = ensureSystemStatusEntries(content.systemStatus)

  return {
    ...content,
    educationLog,
    projectCategories,
    systemStatus,
    aboutStats: {
      ...content.aboutStats,
      projects: String(projectsCount),
    },
  }
}

type EditingProjectState = { categoryIndex: number; projectIndex: number } | null

type AuthResult = { success: boolean; error?: string }

export default function TechDashboardPortfolio() {
  const [time, setTime] = useState(new Date())
  const [activeSection, setActiveSection] = useState<SectionKey>("ALL")
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [theme, setTheme] = useState<ThemeMode>(() => parseThemeParam(searchParams.get("theme")) ?? "dark")
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [showEducationForm, setShowEducationForm] = useState(false)
  const [editingProject, setEditingProject] = useState<EditingProjectState>(null)
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null)
  const [content, setContent] = useState<PortfolioContent | null>(null)
  const [isContentLoading, setIsContentLoading] = useState(true)
  const [contentError, setContentError] = useState<string | null>(null)
  const [sessionThemeOverrides, setSessionThemeOverrides] = useState<Partial<Record<ThemeMode, ThemeColor>>>({})

  const sections: SectionKey[] = ["ALL", "ABOUT", "EXPERIENCE", "EDUCATION", "PROJECTS", "SKILLS"]

  const persistContent = useCallback(
    async (data: PortfolioContent) => {
      if (!isAuthenticated) {
        return
      }

      try {
        const response = await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          console.error("Failed to persist content", await response.text())
        }
      } catch (error) {
        console.error("Failed to persist content", error)
      }
    },
    [isAuthenticated],
  )

  const applyContentUpdate = useCallback(
    (updater: (previous: PortfolioContent) => PortfolioContent, shouldPersist = true) => {
      setContent((previous) => {
        if (!previous) {
          return previous
        }
        const updated = withDerivedContent(updater(previous))
        if (shouldPersist) {
          void persistContent(updated)
        }
        return updated
      })
    },
    [persistContent],
  )

  const fetchContent = useCallback(async () => {
    setIsContentLoading(true)
    setContentError(null)
    try {
      const response = await fetch("/api/content")
      if (!response.ok) {
        throw new Error(`Failed to load content: ${response.status}`)
      }
      const data = (await response.json()) as { content?: PortfolioContent }
      if (data.content) {
        setContent(withDerivedContent(withDefaultCustomColor(data.content)))
      } else {
        setContent(withDerivedContent(cloneDefaultContent()))
      }
    } catch (error) {
      console.error("Failed to load content", error)
      setContentError("Unable to load portfolio content.")
      setContent(withDerivedContent(cloneDefaultContent()))
    } finally {
      setIsContentLoading(false)
    }
  }, [])

  const accentColor = useMemo(() => {
    const override = sessionThemeOverrides[theme]
    if (override) {
      return override
    }

    if (content) {
      const themeColor = content.themeColors?.[theme]
      if (themeColor) {
        return themeColor
      }
    }

    return DEFAULT_THEME_COLORS[theme]
  }, [content, sessionThemeOverrides, theme])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const paramValue = searchParams.get("theme")
    const paramTheme = parseThemeParam(paramValue)

    if (paramTheme) {
      setTheme((previous) => (previous === paramTheme ? previous : paramTheme))
      return
    }

    if (paramValue) {
      setTheme((previous) => (previous === "dark" ? previous : "dark"))

      const params = new URLSearchParams(searchParams.toString())
      params.set("theme", "dark")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      return
    }

    setTheme((previous) => (previous === "dark" ? previous : "dark"))
  }, [pathname, router, searchParams])

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.classList.toggle("dark", theme === "dark")

    const root = document.documentElement
    const { h, s, l } = accentColor

    root.style.setProperty("--primary", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--accent", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--ring", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--border", `hsl(${h}, ${s}%, ${Math.max(Math.min(l * 0.4, 100), 0)}%)`)
  }, [theme, accentColor])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session")
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as { authenticated?: boolean }
        if (data.authenticated) {
          setIsAuthenticated(true)
          setIsEditorMode(true)
        }
      } catch (error) {
        console.error("Failed to verify session", error)
      }
    }

    void checkSession()
    void fetchContent()
  }, [fetchContent])

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)

    const params = new URLSearchParams(searchParams.toString())
    params.set("theme", nextTheme)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleAuthenticate = async (password: string): Promise<AuthResult> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = (await response.json().catch(() => ({}))) as AuthResult

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Authentication failed" }
      }

      setIsAuthenticated(true)
      setIsEditorMode(true)
      setShowAuthModal(false)
      await fetchContent()

      return { success: true }
    } catch (error) {
      console.error("Authentication error", error)
      return { success: false, error: "Unable to authenticate" }
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Failed to logout", error)
    }

    setIsAuthenticated(false)
    setIsEditorMode(false)
  }

  const handleToggleEditor = () => {
    if (isAuthenticated) {
      setIsEditorMode((previous) => !previous)
    } else {
      setShowAuthModal(true)
    }
  }

  const handleAddProject = () => {
    setEditingProject(null)
    setShowProjectForm(true)
  }

  const handleEditProject = (categoryIndex: number, projectIndex: number) => {
    setEditingProject({ categoryIndex, projectIndex })
    setShowProjectForm(true)
  }

  const handleDeleteProject = (categoryIndex: number, projectIndex: number) => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return
    }

    applyContentUpdate((previous) => {
      const updatedCategories = previous.projectCategories.map((category, index) => {
        if (index !== categoryIndex) {
          return category
        }

        return {
          ...category,
          projects: category.projects.filter((_, idx) => idx !== projectIndex),
        }
      })

      return { ...previous, projectCategories: updatedCategories }
    })
  }

  const handleSaveProject = (project: Project) => {
    const normalizedProject: Project = {
      ...project,
      githubUrl: project.githubUrl && project.githubUrl.trim().length > 0 ? project.githubUrl.trim() : undefined,
      projectUrl: project.projectUrl && project.projectUrl.trim().length > 0 ? project.projectUrl.trim() : undefined,
    }

    applyContentUpdate((previous) => {
      const updatedCategories = previous.projectCategories.map((category, index) => {
        if (editingProject && index === editingProject.categoryIndex) {
          const projects = [...category.projects]
          projects[editingProject.projectIndex] = normalizedProject
          return { ...category, projects }
        }

        if (!editingProject && index === activeCategoryIndex) {
          return { ...category, projects: [...category.projects, normalizedProject] }
        }

        return category
      })

      return { ...previous, projectCategories: updatedCategories }
    })

    setShowProjectForm(false)
    setEditingProject(null)
  }

  const handleAddEducation = () => {
    setEditingEducationIndex(null)
    setShowEducationForm(true)
  }

  const handleEditEducation = (index: number) => {
    setEditingEducationIndex(index)
    setShowEducationForm(true)
  }

  const handleDeleteEducation = (index: number) => {
    if (!window.confirm("Are you sure you want to delete this education entry?")) {
      return
    }

    applyContentUpdate((previous) => ({
      ...previous,
      educationLog: (previous.educationLog ?? []).filter((_, idx) => idx !== index),
    }))
  }

  const handleSaveEducation = (education: EducationEntry) => {
    applyContentUpdate((previous) => {
      const educationLog = [...(previous.educationLog ?? [])]

      if (editingEducationIndex !== null) {
        educationLog[editingEducationIndex] = education
      } else {
        educationLog.push(education)
      }

      return { ...previous, educationLog }
    })

    setShowEducationForm(false)
    setEditingEducationIndex(null)
  }

  const handleColorChange = useCallback(
    (h: number, s: number, l: number) => {
      setSessionThemeOverrides((previous) => ({
        ...previous,
        [theme]: { h, s, l },
      }))
    },
    [theme],
  )

  const handlePersistAccentColor = useCallback(
    (color: ThemeColor) => {
      applyContentUpdate((previous) => ({
        ...previous,
        themeColors: {
          ...previous.themeColors,
          [theme]: color,
        },
      }))

      setSessionThemeOverrides((previous) => {
        const { [theme]: _removed, ...rest } = previous
        return rest
      })

      toast.success(`Saved ${theme.toUpperCase()} theme accent color`)
    },
    [applyContentUpdate, theme],
  )

  const updateProfileField = (field: keyof PortfolioContent["profileData"], value: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      profileData: { ...previous.profileData, [field]: value },
    }))
  }

  const updateAboutStat = (field: keyof PortfolioContent["aboutStats"], value: string) => {
    if (field === "projects") {
      return
    }

    applyContentUpdate((previous) => ({
      ...previous,
      aboutStats: { ...previous.aboutStats, [field]: value },
    }))
  }

  const updateSystemStatusValue = (id: string, value: number) => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: previous.systemStatus.map((entry) =>
        entry.id === id ? { ...entry, value: Math.max(0, Math.min(100, value)) } : entry,
      ),
    }))
  }

  const updateSystemStatusLabel = (id: string, label: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: previous.systemStatus.map((entry) =>
        entry.id === id ? { ...entry, label: label.trim().length > 0 ? label : entry.label } : entry,
      ),
    }))
  }

  const handleAddSystemStatusEntry = () => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: [
        ...previous.systemStatus,
        { id: generateSystemStatusId("new-skill"), label: "NEW_SKILL", value: 50 },
      ],
    }))
  }

  const handleRemoveSystemStatusEntry = (id: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: previous.systemStatus.filter((entry) => entry.id !== id),
    }))
  }

  const updateLastDeployment = (value: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      lastDeployment: value,
    }))
  }

  const updateSkills = (field: keyof PortfolioContent["skillsData"], skills: string[]) => {
    applyContentUpdate((previous) => ({
      ...previous,
      skillsData: { ...previous.skillsData, [field]: skills },
    }))
  }

  const projectCategories = content?.projectCategories ?? []
  const projectCategoryCount = projectCategories.length

  useEffect(() => {
    if (projectCategoryCount === 0) {
      setActiveCategoryIndex(0)
      return
    }

    if (activeCategoryIndex >= projectCategoryCount) {
      setActiveCategoryIndex(projectCategoryCount - 1)
    }
  }, [activeCategoryIndex, projectCategoryCount])

  const activeCategory =
    projectCategoryCount > 0
      ? projectCategories[Math.min(activeCategoryIndex, projectCategoryCount - 1)]
      : null

  const ParticleComponent = activeCategory
    ? projectVisualComponentMap[activeCategory.visual] || ParticleBrain
    : ParticleBrain

  const shouldShowSection = (section: SectionKey) => {
    return activeSection === "ALL" || activeSection === section
  }

  const handlePrevCategory = () => {
    if (projectCategoryCount === 0) {
      return
    }
    setActiveCategoryIndex((previous) => (previous === 0 ? projectCategoryCount - 1 : previous - 1))
  }

  const handleNextCategory = () => {
    if (projectCategoryCount === 0) {
      return
    }
    setActiveCategoryIndex((previous) => (previous === projectCategoryCount - 1 ? 0 : previous + 1))
  }

  const handleAddExperienceEntry = () => {
    const currentYear = new Date().getFullYear()
    const newEntry: ExperienceEntry = {
      year: `${currentYear} - PRESENT`,
      title: "NEW_ROLE_TITLE",
      company: "Company Name",
      description: "Describe your impact and responsibilities.",
      tags: ["Skill"],
    }

    applyContentUpdate((previous) => ({
      ...previous,
      experienceLog: [...previous.experienceLog, newEntry],
    }))
  }

  const handleExperienceChange = (index: number, updatedEntry: ExperienceEntry) => {
    applyContentUpdate((previous) => ({
      ...previous,
      experienceLog: previous.experienceLog.map((entry, idx) => (idx === index ? updatedEntry : entry)),
    }))
  }

  const handleDeleteExperienceEntry = (index: number) => {
    if (!window.confirm("Are you sure you want to delete this experience entry?")) {
      return
    }

    applyContentUpdate((previous) => ({
      ...previous,
      experienceLog: previous.experienceLog.filter((_, idx) => idx !== index),
    }))
  }

  const hslToRgb = (h: number, s: number, l: number) => {
    let saturation = s / 100
    let lightness = l / 100
    const k = (n: number) => (n + h / 30) % 12
    const a = saturation * Math.min(lightness, 1 - lightness)
    const f = (n: number) => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
  }

  const [r, g, b] = hslToRgb(accentColor.h, accentColor.s, accentColor.l)
  const timeString = useMemo(() => time.toLocaleTimeString("en-US", { hour12: false }), [time])

  return (
    <div className="min-h-screen bg-background text-foreground grid-pattern">
      <TechCursor />
      <div className="scan-line" />
      <GridTrails color={{ r, g, b }} />

      {showAuthModal && <AuthModal onAuthenticate={handleAuthenticate} onClose={() => setShowAuthModal(false)} />}
      {showProjectForm && activeCategory && (
        <ProjectForm
          project={
            editingProject
              ? projectCategories[editingProject.categoryIndex].projects[editingProject.projectIndex]
              : undefined
          }
          onSave={handleSaveProject}
          onCancel={() => {
            setShowProjectForm(false)
            setEditingProject(null)
          }}
        />
      )}
      {showEducationForm && content && (
        <EducationForm
          education={editingEducationIndex !== null ? content.educationLog[editingEducationIndex] : undefined}
          onSave={handleSaveEducation}
          onCancel={() => {
            setShowEducationForm(false)
            setEditingEducationIndex(null)
          }}
        />
      )}

      <PortfolioHeader
        timeString={timeString}
        isEditorMode={isEditorMode}
        isAuthenticated={isAuthenticated}
        theme={theme}
        isContentLoading={isContentLoading}
        accentColor={accentColor}
        onToggleEditor={handleToggleEditor}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onColorChange={handleColorChange}
        onPersistAccentColor={handlePersistAccentColor}
      />

      {isEditorMode && <EditorModeBanner />}

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        <SectionTabs sections={sections} activeSection={activeSection} onSectionChange={setActiveSection} />

        {contentError && !isContentLoading && (
          <div className="mb-4 sm:mb-6">
            <div className="border border-destructive/50 bg-destructive/10 text-destructive text-xs sm:text-sm font-mono px-3 py-2 flex items-center justify-between gap-3">
              <span>{contentError}</span>
              <button
                onClick={() => {
                  void fetchContent()
                }}
                className="px-2 py-1 border border-destructive/60 bg-card text-destructive hover:border-destructive cursor-pointer"
              >
                RETRY
              </button>
            </div>
          </div>
        )}

        {shouldShowSection("ABOUT") &&
          (content ? (
            <AboutSection
              content={content}
              isEditorMode={isEditorMode}
              onUpdateProfileField={updateProfileField}
              onUpdateAboutStat={updateAboutStat}
              onUpdateSystemStatusValue={updateSystemStatusValue}
              onUpdateSystemStatusLabel={updateSystemStatusLabel}
              onAddSystemStatus={handleAddSystemStatusEntry}
              onRemoveSystemStatus={handleRemoveSystemStatusEntry}
              onUpdateLastDeployment={updateLastDeployment}
            />
          ) : (
            <AboutSectionSkeleton />
          ))}

        {shouldShowSection("EXPERIENCE") &&
          (content ? (
            <ExperienceSection
              entries={content.experienceLog}
              isEditorMode={isEditorMode}
              onAddEntry={handleAddExperienceEntry}
              onEntryChange={handleExperienceChange}
              onDeleteEntry={handleDeleteExperienceEntry}
            />
          ) : (
            <ExperienceSectionSkeleton />
          ))}

        {shouldShowSection("EDUCATION") &&
          (content ? (
            <EducationSection
              entries={content.educationLog}
              isEditorMode={isEditorMode}
              onAddEntry={handleAddEducation}
              onEditEntry={handleEditEducation}
              onDeleteEntry={handleDeleteEducation}
            />
          ) : (
            <EducationSectionSkeleton />
          ))}

        {shouldShowSection("PROJECTS") &&
          (content && activeCategory ? (
            <ProjectsSection
              activeCategory={activeCategory}
              isEditorMode={isEditorMode}
              theme={theme}
              particleColor={{ r, g, b }}
              onPrevCategory={handlePrevCategory}
              onNextCategory={handleNextCategory}
              onAddProject={handleAddProject}
              onEditProject={(index) => handleEditProject(activeCategoryIndex, index)}
              onDeleteProject={(index) => handleDeleteProject(activeCategoryIndex, index)}
              ParticleComponent={ParticleComponent}
            />
          ) : (
            <ProjectsSectionSkeleton />
          ))}

        {shouldShowSection("SKILLS") &&
          (content ? (
            <SkillsSection
              skills={content.skillsData}
              isEditorMode={isEditorMode}
              onSkillsChange={updateSkills}
            />
          ) : (
            <SkillsSectionSkeleton />
          ))}
      </main>

      <PortfolioFooter />
    </div>
  )
}
