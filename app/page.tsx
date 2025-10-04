"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
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
import {
  cloneDefaultContent,
  type PortfolioContent,
  type Project,
  type ProjectVisual,
} from "@/lib/default-content"

const projectVisualComponentMap: Record<ProjectVisual, React.ComponentType<{ color: { r: number; g: number; b: number }; theme: string }>> = {
  brain: ParticleBrain,
  sphere: ParticleSphere,
  engine: ParticleEngine,
}

type EditingProjectState = { categoryIndex: number; projectIndex: number } | null

type AuthResult = { success: boolean; error?: string }

export default function TechDashboardPortfolio() {
  const [time, setTime] = useState(new Date())
  const [activeSection, setActiveSection] = useState<"ALL" | "ABOUT" | "EXPERIENCE" | "PROJECTS" | "SKILLS">("ALL")
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<EditingProjectState>(null)
  const [content, setContent] = useState<PortfolioContent>(() => cloneDefaultContent())

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
    try {
      const response = await fetch("/api/content")
      if (!response.ok) {
        throw new Error(`Failed to load content: ${response.status}`)
      }
      const data = (await response.json()) as { content?: PortfolioContent }
      if (data.content) {
        setContent(data.content)
      }
    } catch (error) {
      console.error("Failed to load content", error)
      setContent(cloneDefaultContent())
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.classList.toggle("dark", theme === "dark")

    const root = document.documentElement
    const { h, s, l } = content.customColor

    root.style.setProperty("--primary", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--accent", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--ring", `hsl(${h}, ${s}%, ${l}%)`)
    root.style.setProperty("--border", `hsl(${h}, ${s}%, ${l * 0.4}%)`)
  }, [theme, content.customColor])

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
    applyContentUpdate((previous) => {
      const updatedCategories = previous.projectCategories.map((category, index) => {
        if (editingProject && index === editingProject.categoryIndex) {
          const projects = [...category.projects]
          projects[editingProject.projectIndex] = project
          return { ...category, projects }
        }

        if (!editingProject && index === activeCategoryIndex) {
          return { ...category, projects: [...category.projects, project] }
        }

        return category
      })

      return { ...previous, projectCategories: updatedCategories }
    })

    setShowProjectForm(false)
    setEditingProject(null)
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

  const updateSkills = (field: keyof PortfolioContent["skillsData"], skills: string[]) => {
    applyContentUpdate((previous) => ({
      ...previous,
      skillsData: { ...previous.skillsData, [field]: skills },
    }))
  }

  const { profileData, aboutStats, systemStatus, skillsData, projectCategories, customColor } = content
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

  const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100
    l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
  }

  const [r, g, b] = hslToRgb(customColor.h, customColor.s, customColor.l)

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
              <ColorPicker
                onColorChange={handleColorChange}
                defaultH={customColor.h}
                defaultS={customColor.s}
                defaultL={customColor.l}
              />
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
          {["ALL", "ABOUT", "EXPERIENCE", "PROJECTS", "SKILLS"].map((section) => (
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

        {shouldShowSection("ABOUT") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
            <Card className="lg:col-span-2 p-4 sm:p-6 bg-card border border-primary/20">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 border-2 border-primary flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <EditableText
                    value={profileData.name}
                    onChange={(value) => updateProfileField("name", value)}
                    isEditorMode={isEditorMode}
                    as="h2"
                    className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 text-foreground"
                  />
                  <EditableText
                    value={`> ${profileData.title}`}
                    onChange={(value) => updateProfileField("title", value.replace(/^>\s*/, ""))}
                    isEditorMode={isEditorMode}
                    as="p"
                    className="text-primary font-mono text-xs sm:text-sm mb-1 sm:mb-2"
                  />
                  <EditableText
                    value={profileData.bio}
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
                  value={aboutStats.projects}
                  icon={<Database className="w-4 h-4" />}
                  isEditorMode={isEditorMode}
                  onValueChange={(value) => updateAboutStat("projects", value)}
                />
                <StatCard
                  label="COMMITS"
                  value={aboutStats.commits}
                  icon={<Github className="w-4 h-4" />}
                  isEditorMode={isEditorMode}
                  onValueChange={(value) => updateAboutStat("commits", value)}
                />
                <StatCard
                  label="EXPERIENCE"
                  value={aboutStats.experience}
                  icon={<Cpu className="w-4 h-4" />}
                  isEditorMode={isEditorMode}
                  onValueChange={(value) => updateAboutStat("experience", value)}
                />
                <StatCard
                  label="EFFICIENCY"
                  value={aboutStats.efficiency}
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
                <Button variant="outline" className="font-mono text-xs bg-transparent w-full sm:w-auto cursor-pointer">
                  <Github className="w-4 h-4 mr-2" />
                  GITHUB
                </Button>
                <Button variant="outline" className="font-mono text-xs bg-transparent w-full sm:w-auto cursor-pointer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LINKEDIN
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
                  value={systemStatus.frontend}
                  isEditorMode={isEditorMode}
                  onValueChange={(value) => updateSystemStatus("frontend", value)}
                />
                <StatusBar
                  label="BACKEND"
                  value={systemStatus.backend}
                  isEditorMode={isEditorMode}
                  onValueChange={(value) => updateSystemStatus("backend", value)}
                />
                <StatusBar
                  label="DEVOPS"
                  value={systemStatus.devops}
                  isEditorMode={isEditorMode}
                  onValueChange={(value) => updateSystemStatus("devops", value)}
                />
                <StatusBar
                  label="DATABASE"
                  value={systemStatus.database}
                  isEditorMode={isEditorMode}
                  onValueChange={(value) => updateSystemStatus("database", value)}
                />
              </div>
              <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-primary/10 border border-primary/30 text-[10px] sm:text-xs font-mono">
                <p className="text-primary mb-1">{">"} LAST_DEPLOYMENT:</p>
                <p className="text-muted-foreground">2024-03-15 14:32:07 UTC</p>
                <p className="text-primary mt-2">{">"} BUILD_STATUS:</p>
                <p className="text-primary">SUCCESS ✓</p>
              </div>
            </Card>
          </div>
        )}

        {shouldShowSection("EXPERIENCE") && (
          <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
            <h3 className="text-base sm:text-lg font-mono text-primary mb-4 sm:mb-6 flex items-center gap-2">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
              EXPERIENCE_LOG
            </h3>
            <div className="space-y-4 sm:space-y-6">
              <ExperienceItem
                year="2021 - PRESENT"
                title="SENIOR_FULL_STACK_ENGINEER"
                company="TechCorp Industries"
                description="Leading development of cloud-native applications. Architected microservices handling 10M+ requests/day."
                tags={["React", "Node.js", "AWS", "Docker"]}
              />
              <ExperienceItem
                year="2019 - 2021"
                title="SOFTWARE_ENGINEER"
                company="StartupXYZ"
                description="Built scalable web applications from ground up. Reduced load times by 60% through optimization."
                tags={["Vue.js", "Python", "PostgreSQL"]}
              />
              <ExperienceItem
                year="2018 - 2019"
                title="JUNIOR_DEVELOPER"
                company="Digital Solutions Inc"
                description="Developed responsive web interfaces and RESTful APIs. Collaborated with cross-functional teams."
                tags={["JavaScript", "Express", "MongoDB"]}
              />
            </div>
          </Card>
        )}

        {shouldShowSection("PROJECTS") && activeCategory && (
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
        )}

        {shouldShowSection("SKILLS") && (
          <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
            <h3 className="text-base sm:text-lg font-mono text-primary mb-4 sm:mb-6 flex items-center gap-2">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
              SKILLS_MATRIX
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <SkillCategory
                title="FRONTEND"
                skills={skillsData.frontend}
                isEditorMode={isEditorMode}
                onSkillsChange={(skills) => updateSkills("frontend", skills)}
              />
              <SkillCategory
                title="BACKEND"
                skills={skillsData.backend}
                isEditorMode={isEditorMode}
                onSkillsChange={(skills) => updateSkills("backend", skills)}
              />
              <SkillCategory
                title="DEVOPS"
                skills={skillsData.devops}
                isEditorMode={isEditorMode}
                onSkillsChange={(skills) => updateSkills("devops", skills)}
              />
            </div>
          </Card>
        )}
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
  year,
  title,
  company,
  description,
  tags,
}: {
  year: string
  title: string
  company: string
  description: string
  tags: string[]
}) {
  return (
    <div className="border-l-2 border-primary pl-3 sm:pl-4">
      <p className="text-[10px] sm:text-xs font-mono text-primary mb-1">{year}</p>
      <h4 className="text-base sm:text-lg font-bold text-foreground mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-muted-foreground mb-2">{company}</p>
      <p className="text-xs sm:text-sm text-foreground mb-3 leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] sm:text-xs font-mono border-primary/50 text-primary">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function ProjectCard({
  title,
  description,
  status,
  metrics,
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
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  className="opacity-0 group-hover:opacity-100 p-0.5 border border-destructive/50 hover:border-destructive cursor-pointer"
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
