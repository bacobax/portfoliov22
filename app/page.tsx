"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Github,
  Linkedin,
  Mail,
  Terminal,
  Activity,
  Code2,
  Cpu,
  Database,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Lock,
  LogOut,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
} from "lucide-react"
import { ParticleBrain } from "@/components/particle-brain"
import { ParticleSphere } from "@/components/particle-sphere"
import { ParticleEngine } from "@/components/particle-engine"
import { ColorPicker } from "@/components/color-picker"
import { GridTrails } from "@/components/grid-trails"
import { AuthModal } from "@/components/auth-modal"
import { EditableText } from "@/components/editable-text"
import { ProjectForm } from "@/components/project-form"
import { TechCursor } from "@/components/tech-cursor"
import { Skeleton } from "@/components/ui/skeleton"
import {
  cloneDefaultContent,
  type EducationEntry,
  type ExperienceEntry,
  type PortfolioContent,
  type Project,
  type ProjectVisual,
  withDefaultCustomColor,
} from "@/lib/default-content"

const projectVisualComponentMap: Record<
  ProjectVisual,
  React.ComponentType<{ color?: { r: number; g: number; b: number }; theme?: "dark" | "light" }>
> = {
  brain: ParticleBrain,
  sphere: ParticleSphere,
  engine: ParticleEngine,
}

const DEFAULT_THEME_COLORS = {
  dark: { h: 186, s: 100, l: 37 },
  light: { h: 245, s: 100, l: 37 },
} as const

type EditingProjectState = { categoryIndex: number; projectIndex: number } | null

type AuthResult = { success: boolean; error?: string }

export default function TechDashboardPortfolio() {
  const [time, setTime] = useState(new Date())
  const [activeSection, setActiveSection] = useState<
    "ALL" | "ABOUT" | "EXPERIENCE" | "EDUCATION" | "PROJECTS" | "SKILLS"
  >("ALL")
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
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

  const persistContent = useCallback(
    async (data: PortfolioContent) => {
      if (!isAuthenticated) {
        return
      }

      try {
        const { customColor: _ignoredCustomColor, ...persistableContent } = data

        const response = await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(persistableContent),
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
        const updated = updater(previous)
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
        setContent(withDefaultCustomColor(data.content))
      } else {
        setContent(cloneDefaultContent())
      }
    } catch (error) {
      console.error("Failed to load content", error)
      setContentError("Unable to load portfolio content.")
      setContent(cloneDefaultContent())
    } finally {
      setIsContentLoading(false)
    }
  }, [])

  const accentColor = useMemo(() => {
    if (content) {
      const defaultDark = DEFAULT_THEME_COLORS.dark
      const { h, s, l } = content.customColor
      const isDefaultDarkColor = h === defaultDark.h && s === defaultDark.s && l === defaultDark.l

      if (!isDefaultDarkColor) {
        return content.customColor
      }
    }

    return DEFAULT_THEME_COLORS[theme]
  }, [content, theme])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { h, s, l } = accentColor

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.classList.toggle("dark", theme === "dark")

    const root = document.documentElement

    root.style.setProperty("--primary", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--accent", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--ring", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--border", `hsl(${h}, ${s}%, ${Math.max(Math.min(l * 0.4, 100), 0)}%)`)
  }, [theme, h, s, l])

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
    setTheme((previous) => (previous === "dark" ? "light" : "dark"))
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
      githubUrl:
        project.githubUrl && project.githubUrl.trim().length > 0 ? project.githubUrl.trim() : undefined,
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

  const handleColorChange = (h: number, s: number, l: number) => {
    applyContentUpdate(
      (previous) => ({
        ...previous,
        customColor: { h, s, l },
      }),
      false,
    )
  }

  const updateProfileField = (field: keyof PortfolioContent["profileData"], value: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      profileData: { ...previous.profileData, [field]: value },
    }))
  }

  const updateAboutStat = (field: keyof PortfolioContent["aboutStats"], value: string) => {
    applyContentUpdate((previous) => ({
      ...previous,
      aboutStats: { ...previous.aboutStats, [field]: value },
    }))
  }

  const updateSystemStatus = (field: keyof PortfolioContent["systemStatus"], value: number) => {
    applyContentUpdate((previous) => ({
      ...previous,
      systemStatus: { ...previous.systemStatus, [field]: value },
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

  const shouldShowSection = (section: string) => {
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
    s /= 100
    l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
  }

  const [r, g, b] = hslToRgb(accentColor.h, accentColor.s, accentColor.l)

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

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 relative">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-xl font-bold text-foreground truncate">SYSTEM_PORTFOLIO_v2.0</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  STATUS: {isEditorMode ? "EDITOR_MODE" : "ONLINE"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden lg:flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-muted-foreground">UPTIME: 99.9%</span>
              </div>
              <div className="hidden sm:block text-xs sm:text-sm font-mono text-primary">
                {time.toLocaleTimeString("en-US", { hour12: false })}
              </div>
              <button
                onClick={handleToggleEditor}
                className={`p-1.5 sm:p-2 border ${
                  isEditorMode ? "border-primary bg-primary/20" : "border-primary/50 bg-card"
                } hover:border-primary transition-colors cursor-pointer`}
                title={isEditorMode ? "Exit Editor Mode" : "Enter Editor Mode"}
              >
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </button>
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 border border-primary/50 bg-card hover:border-primary transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </button>
              )}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 border border-primary/50 bg-card hover:border-primary transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                )}
              </button>
              {isContentLoading ? (
                <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 border border-primary/50" />
              ) : (
                <ColorPicker
                  key={`${accentColor.h}-${accentColor.s}-${accentColor.l}`}
                  onColorChange={handleColorChange}
                  defaultH={accentColor.h}
                  defaultS={accentColor.s}
                  defaultL={accentColor.l}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {isEditorMode && (
        <div className="bg-primary/20 border-b border-primary py-2 px-4 text-center relative z-10">
          <p className="text-xs sm:text-sm font-mono text-primary">
            ⚡ EDITOR_MODE_ACTIVE | Click on any content to edit
          </p>
        </div>
      )}

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-8 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          {["ALL", "ABOUT", "EXPERIENCE", "EDUCATION", "PROJECTS", "SKILLS"].map((section) => (
            <Button
              key={section}
              variant={activeSection === section ? "default" : "outline"}
              onClick={() => setActiveSection(section as typeof activeSection)}
              className="font-mono text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-4 h-8 sm:h-10 cursor-pointer"
            >
              [{section}]
            </Button>
          ))}
        </div>

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
              <Card className="lg:col-span-2 p-4 sm:p-6 bg-card border border-primary/20">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 border-2 border-primary flex items-center justify-center flex-shrink-0">
                    <Code2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <EditableText
                      value={content.profileData.name}
                      onChange={(value) => updateProfileField("name", value)}
                      isEditorMode={isEditorMode}
                      as="h2"
                      className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 text-foreground"
                    />
                    <EditableText
                      value={`> ${content.profileData.title}`}
                      onChange={(value) => updateProfileField("title", value.replace(/^>\s*/, ""))}
                      isEditorMode={isEditorMode}
                      as="p"
                      className="text-primary font-mono text-xs sm:text-sm mb-1 sm:mb-2"
                    />
                    <EditableText
                      value={content.profileData.bio}
                      onChange={(value) => updateProfileField("bio", value)}
                      isEditorMode={isEditorMode}
                      as="p"
                      multiline
                      className="text-muted-foreground text-xs sm:text-sm leading-relaxed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <StatCard
                    label="PROJECTS"
                    value={content.aboutStats.projects}
                    icon={<Database className="w-4 h-4" />}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateAboutStat("projects", value)}
                  />
                  <StatCard
                    label="COMMITS"
                    value={content.aboutStats.commits}
                    icon={<Github className="w-4 h-4" />}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateAboutStat("commits", value)}
                  />
                  <StatCard
                    label="EXPERIENCE"
                    value={content.aboutStats.experience}
                    icon={<Cpu className="w-4 h-4" />}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateAboutStat("experience", value)}
                  />
                  <StatCard
                    label="EFFICIENCY"
                    value={content.aboutStats.efficiency}
                    icon={<Activity className="w-4 h-4" />}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateAboutStat("efficiency", value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button variant="default" className="font-mono text-xs w-full sm:w-auto cursor-pointer">
                    <Mail className="w-4 h-4 mr-2" />
                    CONTACT
                  </Button>
                  <Button asChild variant="outline" className="font-mono text-xs bg-transparent w-full sm:w-auto cursor-pointer">
                    <a href="https://github.com/bacobax" target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4 mr-2" />
                      GITHUB
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="font-mono text-xs bg-transparent w-full sm:w-auto cursor-pointer">
                    <a href="https://www.linkedin.com/in/francesco-bassignana/" target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4 mr-2" />
                      LINKEDIN
                    </a>
                  </Button>
                </div>
              </Card>

              <Card className="p-4 sm:p-6 bg-card border border-primary/20">
                <h3 className="text-xs sm:text-sm font-mono text-primary mb-3 sm:mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-pulse" />
                  SYSTEM_STATUS
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <StatusBar
                    label="FRONTEND"
                    value={content.systemStatus.frontend}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateSystemStatus("frontend", value)}
                  />
                  <StatusBar
                    label="BACKEND"
                    value={content.systemStatus.backend}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateSystemStatus("backend", value)}
                  />
                  <StatusBar
                    label="DEVOPS"
                    value={content.systemStatus.devops}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateSystemStatus("devops", value)}
                  />
                  <StatusBar
                    label="DATABASE"
                    value={content.systemStatus.database}
                    isEditorMode={isEditorMode}
                    onValueChange={(value) => updateSystemStatus("database", value)}
                  />
                </div>
                <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-primary/10 border border-primary/30 text-[10px] sm:text-xs font-mono">
                  <p className="text-primary mb-1">{">"} LAST_DEPLOYMENT:</p>
                  <EditableText
                    value={content.lastDeployment}
                    onChange={updateLastDeployment}
                    isEditorMode={isEditorMode}
                    className="text-muted-foreground"
                    as="p"
                  />
                  <p className="text-primary mt-2">{">"} BUILD_STATUS:</p>
                  <p className="text-primary">SUCCESS ✓</p>
                </div>
              </Card>
            </div>
          ) : (
            <AboutSectionSkeleton />
          ))}

        {shouldShowSection("EXPERIENCE") &&
          (content ? (
            <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-mono text-primary flex items-center gap-2">
                  <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
                  EXPERIENCE_LOG
                </h3>
                {isEditorMode && (
                  <button
                    onClick={handleAddExperienceEntry}
                    className="flex items-center gap-2 px-3 py-2 border border-primary/50 bg-card hover:border-primary cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono text-primary">NEW_ENTRY</span>
                  </button>
                )}
              </div>
              {content.experienceLog.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {content.experienceLog.map((entry, index) => (
                    <ExperienceItem
                      key={`${entry.title}-${entry.year}-${index}`}
                      entry={entry}
                      isEditorMode={isEditorMode}
                      onChange={(updated) => handleExperienceChange(index, updated)}
                      onDelete={() => handleDeleteExperienceEntry(index)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                  No experience entries yet. Use NEW_ENTRY to add your journey.
                </p>
              )}
            </Card>
          ) : (
            <ExperienceSectionSkeleton />
          ))}

        {shouldShowSection("EDUCATION") &&
          (content ? (
            <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-mono text-primary flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  EDUCATION_TIMELINE
                </h3>
                {isEditorMode && (
                  <button
                    onClick={handleAddEducation}
                    className="flex items-center gap-2 px-3 py-2 border border-primary/50 bg-card hover:border-primary cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono text-primary">NEW_RECORD</span>
                  </button>
                )}
              </div>
              {content.educationLog.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {content.educationLog.map((entry, index) => (
                    <EducationItem
                      key={`${entry.degree}-${entry.year}-${index}`}
                      entry={entry}
                      isEditorMode={isEditorMode}
                      onEdit={() => handleEditEducation(index)}
                      onDelete={() => handleDeleteEducation(index)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                  No education records yet. Use NEW_RECORD to add your academic milestones.
                </p>
              )}
            </Card>
          ) : (
            <EducationSectionSkeleton />
          ))}

        {shouldShowSection("PROJECTS") &&
          (content && activeCategory ? (
            <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h3 className="text-base sm:text-lg font-mono text-primary">{activeCategory.name}_PROJECTS</h3>
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-mono border-primary/50 text-primary">
                    {activeCategory.projects.length} ACTIVE
                  </Badge>
                </div>
                {isEditorMode && (
                  <button
                    onClick={handleAddProject}
                    className="flex items-center gap-2 px-3 py-2 border border-primary/50 bg-card hover:border-primary cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono text-primary">NEW_PROJECT</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-muted-foreground">
                  <span>{activeCategory.id.toUpperCase()}</span>
                  <span className="text-primary">|</span>
                  <span>PROJECT_CLUSTER</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrevCategory}
                    className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent border-primary/50 hover:border-primary cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNextCategory}
                    className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent border-primary/50 hover:border-primary cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  </Button>
                </div>
              </div>

              <div className="w-full h-48 sm:h-64 mb-4 sm:mb-6 bg-black/50 border border-primary/20 rounded overflow-hidden">
                <ParticleComponent color={{ r, g, b }} theme={theme} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {activeCategory.projects.map((project, projectIndex) => (
                  <ProjectCard
                    key={`${project.title}-${projectIndex}`}
                    {...project}
                    isEditorMode={isEditorMode}
                    onEdit={() => handleEditProject(activeCategoryIndex, projectIndex)}
                    onDelete={() => handleDeleteProject(activeCategoryIndex, projectIndex)}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <ProjectsSectionSkeleton />
          ))}

        {shouldShowSection("SKILLS") &&
          (content ? (
            <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
              <h3 className="text-base sm:text-lg font-mono text-primary mb-4 sm:mb-6 flex items-center gap-2">
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
                SKILLS_MATRIX
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <SkillCategory
                  title="FRONTEND"
                  skills={content.skillsData.frontend}
                  isEditorMode={isEditorMode}
                  onSkillsChange={(skills) => updateSkills("frontend", skills)}
                />
                <SkillCategory
                  title="BACKEND"
                  skills={content.skillsData.backend}
                  isEditorMode={isEditorMode}
                  onSkillsChange={(skills) => updateSkills("backend", skills)}
                />
                <SkillCategory
                  title="DEVOPS"
                  skills={content.skillsData.devops}
                  isEditorMode={isEditorMode}
                  onSkillsChange={(skills) => updateSkills("devops", skills)}
                />
              </div>
            </Card>
          ) : (
            <SkillsSectionSkeleton />
          ))}
      </main>

      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-8 sm:mt-16 relative z-10">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <p className="text-[10px] sm:text-xs font-mono text-muted-foreground text-center md:text-left">
              © 2025 SYSTEM_PORTFOLIO | BUILD_v2.0.1 | ALL_RIGHTS_RESERVED
            </p>
            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono text-muted-foreground">
              <span>POWERED_BY: NEXT.JS</span>
              <span className="text-primary">|</span>
              <span>DEPLOYED_ON: VERCEL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  isEditorMode,
  onValueChange,
}: {
  label: string
  value: string
  icon: React.ReactNode
  isEditorMode?: boolean
  onValueChange?: (value: string) => void
}) {
  return (
    <div className="bg-secondary/50 border border-border p-2 sm:p-3">
      <div className="flex items-center gap-1 sm:gap-2 mb-1 text-primary">
        {icon}
        <p className="text-[10px] sm:text-xs font-mono">{label}</p>
      </div>
      {isEditorMode && onValueChange ? (
        <EditableText
          value={value}
          onChange={onValueChange}
          isEditorMode={isEditorMode}
          className="text-lg sm:text-2xl font-bold text-foreground"
        />
      ) : (
        <p className="text-lg sm:text-2xl font-bold text-foreground">{value}</p>
      )}
    </div>
  )
}

function StatusBar({
  label,
  value,
  isEditorMode,
  onValueChange,
}: {
  label: string
  value: number
  isEditorMode?: boolean
  onValueChange?: (value: number) => void
}) {
  const handleChange = (newValue: string) => {
    const num = Number.parseInt(newValue, 10)
    if (!Number.isNaN(num) && num >= 0 && num <= 100 && onValueChange) {
      onValueChange(num)
    }
  }

  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-muted-foreground">{label}</span>
        {isEditorMode && onValueChange ? (
          <EditableText
            value={`${value}%`}
            onChange={(v) => handleChange(v.replace("%", ""))}
            isEditorMode={isEditorMode}
            className="text-primary"
          />
        ) : (
          <span className="text-primary">{value}%</span>
        )}
      </div>
      <div className="h-2 bg-secondary border border-border overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ExperienceItem({
  entry,
  isEditorMode,
  onChange,
  onDelete,
}: {
  entry: ExperienceEntry
  isEditorMode?: boolean
  onChange?: (entry: ExperienceEntry) => void
  onDelete?: () => void
}) {
  const editable = Boolean(isEditorMode && onChange)

  const handleFieldChange = (field: keyof ExperienceEntry, value: string) => {
    if (!onChange) {
      return
    }

    onChange({ ...entry, [field]: value })
  }

  const handleTagChange = (index: number, value: string) => {
    if (!onChange) {
      return
    }

    const newTags = [...entry.tags]
    newTags[index] = value
    onChange({ ...entry, tags: newTags })
  }

  const handleAddTag = () => {
    if (!onChange) {
      return
    }

    onChange({ ...entry, tags: [...entry.tags, "New Tag"] })
  }

  const handleRemoveTag = (index: number) => {
    if (!onChange) {
      return
    }

    onChange({ ...entry, tags: entry.tags.filter((_, idx) => idx !== index) })
  }

  return (
    <div className="border-l-2 border-primary pl-3 sm:pl-4 relative group">
      {editable && onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-2 right-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 bg-card border border-destructive/50 hover:border-destructive cursor-pointer"
          title="Delete Experience"
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      )}
      <EditableText
        value={entry.year}
        onChange={(value) => handleFieldChange("year", value)}
        isEditorMode={editable}
        className="text-[10px] sm:text-xs font-mono text-primary mb-1"
        as="p"
      />
      <EditableText
        value={entry.title}
        onChange={(value) => handleFieldChange("title", value)}
        isEditorMode={editable}
        className="text-base sm:text-lg font-bold text-foreground mb-1"
        as="h4"
      />
      <EditableText
        value={entry.company}
        onChange={(value) => handleFieldChange("company", value)}
        isEditorMode={editable}
        className="text-xs sm:text-sm text-muted-foreground mb-2"
        as="p"
      />
      <EditableText
        value={entry.description}
        onChange={(value) => handleFieldChange("description", value)}
        isEditorMode={editable}
        className="text-xs sm:text-sm text-foreground mb-3 leading-relaxed"
        as="p"
        multiline
      />
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {entry.tags.map((tag, index) =>
          editable ? (
            <Badge
              key={`${tag}-${index}`}
              variant="outline"
              className="text-[10px] sm:text-xs font-mono border-primary/50 text-primary flex items-center gap-1"
            >
              <EditableText
                value={tag}
                onChange={(value) => handleTagChange(index, value)}
                isEditorMode={editable}
                className="text-primary text-[10px] sm:text-xs font-mono"
                as="span"
              />
              <button
                onClick={() => handleRemoveTag(index)}
                className="p-0.5 border border-destructive/50 hover:border-destructive cursor-pointer"
                title="Remove Tag"
              >
                <Trash2 className="w-2.5 h-2.5 text-destructive" />
              </button>
            </Badge>
          ) : (
            <Badge
              key={`${tag}-${index}`}
              variant="outline"
              className="text-[10px] sm:text-xs font-mono border-primary/50 text-primary"
            >
              {tag}
            </Badge>
          ),
        )}
        {editable && (
          <button
            onClick={handleAddTag}
            className="text-[10px] sm:text-xs font-mono px-2 py-1 border border-dashed border-primary/50 text-primary hover:border-primary cursor-pointer bg-transparent flex items-center gap-1"
            title="Add Tag"
          >
            <Plus className="w-3 h-3" />
            TAG
          </button>
        )}
      </div>
    </div>
  )
}

function EducationItem({
  entry,
  isEditorMode,
  onEdit,
  onDelete,
}: {
  entry: EducationEntry
  isEditorMode?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const { year, degree, institution, description, tags } = entry

  return (
    <div className="relative group">
      <div className="flex gap-3 sm:gap-4">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-primary bg-background rounded-full" />
          <div className="w-0.5 flex-1 bg-primary/30 mt-2" />
        </div>

        <div className="flex-1 pb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs font-mono text-primary mb-1">{year}</p>
              <h4 className="text-base sm:text-lg font-bold text-foreground mb-1">{degree}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{institution}</p>
            </div>
            {isEditorMode && (
              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={onEdit}
                  className="p-1.5 bg-card border border-primary/50 hover:border-primary cursor-pointer"
                  title="Edit Education"
                >
                  <Edit className="w-3 h-3 text-primary" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 bg-card border border-destructive/50 hover:border-destructive cursor-pointer"
                  title="Delete Education"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            )}
          </div>
          {description.trim().length > 0 && (
            <p className="text-xs sm:text-sm text-foreground mb-3 leading-relaxed">{description}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] sm:text-xs font-mono border-primary/50 text-primary"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EducationForm({
  education,
  onSave,
  onCancel,
}: {
  education?: EducationEntry
  onSave: (education: EducationEntry) => void
  onCancel: () => void
}) {
  const emptyEducation: EducationEntry = useMemo(
    () => ({
      year: "",
      degree: "",
      institution: "",
      description: "",
      tags: [],
    }),
    [],
  )

  const [formData, setFormData] = useState<EducationEntry>(education ?? emptyEducation)
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    setFormData(education ?? emptyEducation)
    setTagInput("")
  }, [education, emptyEducation])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (formData.year.trim() && formData.degree.trim() && formData.institution.trim()) {
      onSave({
        ...formData,
        year: formData.year.trim(),
        degree: formData.degree.trim(),
        institution: formData.institution.trim(),
        description: formData.description.trim(),
        tags: formData.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
      })
    }
  }

  const handleAddTag = () => {
    const normalized = tagInput.trim()
    if (!normalized || formData.tags.includes(normalized)) {
      return
    }

    setFormData({ ...formData, tags: [...formData.tags, normalized] })
    setTagInput("")
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((existing) => existing !== tag) })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-2 border-primary p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-mono text-primary mb-4 sm:mb-6 flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          {education ? "EDIT_EDUCATION" : "ADD_EDUCATION"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-2">YEAR_RANGE</label>
            <input
              type="text"
              value={formData.year}
              onChange={(event) => setFormData({ ...formData, year: event.target.value })}
              placeholder="e.g., 2018 - 2022"
              className="w-full bg-background border border-primary/50 px-3 py-2 text-sm font-mono text-foreground focus:border-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-2">DEGREE</label>
            <input
              type="text"
              value={formData.degree}
              onChange={(event) => setFormData({ ...formData, degree: event.target.value })}
              placeholder="e.g., B.S. COMPUTER_SCIENCE"
              className="w-full bg-background border border-primary/50 px-3 py-2 text-sm font-mono text-foreground focus:border-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-2">INSTITUTION</label>
            <input
              type="text"
              value={formData.institution}
              onChange={(event) => setFormData({ ...formData, institution: event.target.value })}
              placeholder="e.g., Tech University"
              className="w-full bg-background border border-primary/50 px-3 py-2 text-sm font-mono text-foreground focus:border-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-2">DESCRIPTION</label>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              placeholder="Brief description of your education..."
              className="w-full bg-background border border-primary/50 px-3 py-2 text-sm font-mono text-foreground focus:border-primary outline-none min-h-[100px] resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-2">TAGS</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1 bg-background border border-primary/50 px-3 py-2 text-sm font-mono text-foreground focus:border-primary outline-none"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                className="bg-transparent border-primary/50 hover:border-primary cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs font-mono border-primary/50 text-primary flex items-center gap-1"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="border border-destructive/50 hover:border-destructive px-1 py-0.5 cursor-pointer text-[10px] sm:text-xs leading-none"
                    title="Remove Tag"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 font-mono cursor-pointer">
              SAVE
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1 font-mono bg-transparent cursor-pointer"
            >
              CANCEL
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function ProjectCard({
  title,
  description,
  status,
  metrics,
  githubUrl,
  isEditorMode,
  onEdit,
  onDelete,
}: Project & {
  isEditorMode?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const statusColors = {
    PRODUCTION: "text-primary border-primary",
    BETA: "text-primary/70 border-primary/70",
    DEVELOPMENT: "text-primary/50 border-primary/50",
  } as const

  return (
    <Card className="p-3 sm:p-5 bg-card border border-primary/20 hover:border-primary transition-colors relative group">
      {isEditorMode && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 bg-card border border-primary/50 hover:border-primary cursor-pointer"
            title="Edit Project"
          >
            <Edit className="w-3 h-3 text-primary" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 bg-card border border-destructive/50 hover:border-destructive cursor-pointer"
            title="Delete Project"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      )}
      <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
        <h4 className="text-sm sm:text-base font-bold text-foreground font-mono leading-tight">{title}</h4>
        <Badge
          variant="outline"
          className={`text-[10px] sm:text-xs font-mono flex-shrink-0 ${statusColors[status as keyof typeof statusColors]}`}
        >
          {status}
        </Badge>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key}>
            <span className="text-muted-foreground uppercase">{key}: </span>
            <span className="text-primary">{value}</span>
          </div>
        ))}
      </div>
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-xs sm:text-sm font-mono text-primary hover:text-primary/80 transition-colors"
          title="View GitHub repository"
        >
          <Github className="w-4 h-4" />
          VIEW_REPOSITORY
        </a>
      )}
    </Card>
  )
}

function SkillCategory({
  title,
  skills,
  isEditorMode,
  onSkillsChange,
}: {
  title: string
  skills: string[]
  isEditorMode?: boolean
  onSkillsChange?: (skills: string[]) => void
}) {
  const handleSkillChange = (index: number, newValue: string) => {
    if (onSkillsChange) {
      const newSkills = [...skills]
      newSkills[index] = newValue
      onSkillsChange(newSkills)
    }
  }

  const handleAddSkill = () => {
    if (onSkillsChange) {
      onSkillsChange([...skills, "New Skill"])
    }
  }

  const handleRemoveSkill = (index: number) => {
    if (onSkillsChange) {
      const newSkills = skills.filter((_, i) => i !== index)
      onSkillsChange(newSkills)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 sm:mb-3 border-b border-border pb-2">
        <h4 className="text-xs sm:text-sm font-mono text-primary">{title}</h4>
        {isEditorMode && onSkillsChange && (
          <button
            onClick={handleAddSkill}
            className="p-1 border border-primary/50 hover:border-primary cursor-pointer"
            title="Add Skill"
          >
            <Plus className="w-3 h-3 text-primary" />
          </button>
        )}
      </div>
      <div className="space-y-1.5 sm:space-y-2">
        {skills.map((skill, index) => (
          <div key={`${skill}-${index}`} className="flex items-center gap-2 text-xs sm:text-sm group">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary flex-shrink-0" />
            {isEditorMode && onSkillsChange ? (
              <>
                <EditableText
                  value={skill}
                  onChange={(value) => handleSkillChange(index, value)}
                  isEditorMode={isEditorMode}
                  className="text-foreground flex-1"
                />
                <button
                  onClick={() => handleRemoveSkill(index)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-0.5 border border-destructive/50 hover:border-destructive cursor-pointer"
                  title="Remove Skill"
                >
                  <Trash2 className="w-2.5 h-2.5 text-destructive" />
                </button>
              </>
            ) : (
              <span className="text-foreground">{skill}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AboutSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
      <Card className="lg:col-span-2 p-4 sm:p-6 bg-card border border-primary/20">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary flex items-center justify-center">
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/30" />
          </div>
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-6 sm:h-7 w-40 sm:w-56" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 sm:h-24 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-secondary/50 border border-border p-2 sm:p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 sm:h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
        </div>
      </Card>
      <Card className="p-4 sm:p-6 bg-card border border-primary/20 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-2 p-2 sm:p-3 bg-primary/5 border border-primary/20">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </Card>
    </div>
  )
}

function ExperienceSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Skeleton className="h-6 sm:h-7 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4 sm:space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="border-l-2 border-primary pl-3 sm:pl-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function EducationSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Skeleton className="h-6 sm:h-7 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4 sm:space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-3 sm:gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-16 w-1" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-12 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProjectsSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <Skeleton className="h-48 sm:h-64 w-full border border-primary/20" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="p-4 sm:p-5 bg-secondary/30 border border-primary/10 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    </Card>
  )
}

function SkillsSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <Skeleton className="h-6 w-40 mb-4 sm:mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 3 }).map((_, columnIndex) => (
          <div key={columnIndex} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }).map((__, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full bg-primary/40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}
