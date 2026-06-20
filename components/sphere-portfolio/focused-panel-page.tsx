"use client"

import { Activity, FileDown, Github, Linkedin, Mail, Terminal } from "lucide-react"

import { ParticleBrain } from "@/components/particle-brain"
import { ParticleEngine } from "@/components/particle-engine"
import { ParticleSphere } from "@/components/particle-sphere"
import { AboutSection } from "@/components/portfolio/about-section"
import { EducationSection } from "@/components/portfolio/education-section"
import { ExperienceSection } from "@/components/portfolio/experience-section"
import { ProjectsSection, type ProjectVisualComponent } from "@/components/portfolio/projects-section"
import { SkillsSection } from "@/components/portfolio/skills-section"
import { Button } from "@/components/ui/button"
import type { PortfolioContent, ProjectCategory, ProjectVisual, ThemeColor } from "@/lib/default-content"
import type { ThemeMode } from "@/lib/theme"
import { panelLabel, type FocusPanelName } from "./panel-layout"
import type { EditableSphereHandlers } from "./sphere-types"

const projectVisualComponentMap: Record<ProjectVisual, ProjectVisualComponent> = {
  brain: ParticleBrain,
  sphere: ParticleSphere,
  engine: ParticleEngine,
}

const toRgb = ({ h, s, l }: ThemeColor) => {
  const saturation = s / 100
  const lightness = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = saturation * Math.min(lightness, 1 - lightness)
  const f = (n: number) =>
    lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  }
}

type FocusedPanelPageProps = {
  focusedPanel: FocusPanelName | null
  content: PortfolioContent | null
  activeCategory: ProjectCategory | null
  activeCategoryIndex: number
  theme: ThemeMode
  accentColor: ThemeColor
  isEditorMode: boolean
  isContentLoading: boolean
  onPrevCategory: () => void
  onNextCategory: () => void
  handlers: EditableSphereHandlers
}

export function FocusedPanelPage({
  focusedPanel,
  content,
  activeCategory,
  activeCategoryIndex,
  theme,
  accentColor,
  isEditorMode,
  isContentLoading,
  onPrevCategory,
  onNextCategory,
  handlers,
}: FocusedPanelPageProps) {
  if (!focusedPanel) {
    return null
  }

  const title = panelLabel(focusedPanel)
  const particleColor = toRgb(accentColor)

  return (
    <main className="sphere-focus-page" data-panel={focusedPanel} aria-label={`${title} focused section`}>
      <div className="sphere-focus-page-head">
        <div>
          <p className="sphere-focus-kicker">FOCUSED_SECTION</p>
          <h1>{title}</h1>
        </div>
        <div className="sphere-focus-actions">
          <Button asChild variant="outline" className="sphere-page-button bg-transparent">
            <a href="/cv">
              <FileDown className="h-4 w-4" />
              CV
            </a>
          </Button>
          <Button asChild variant="outline" className="sphere-page-button bg-transparent">
            <a href="mailto:quicksolver02@gmail.com">
              <Mail className="h-4 w-4" />
              CONTACT
            </a>
          </Button>
        </div>
      </div>

      <div className="sphere-focus-page-body">
        {isContentLoading || !content ? (
          <div className="sphere-page-empty">
            <Activity className="h-5 w-5 animate-pulse" />
            <span>LOADING_CONTENT</span>
          </div>
        ) : focusedPanel === "header" ? (
          <section className="sphere-focus-hero" aria-label="Portfolio launch panel">
            <div>
              <p className="sphere-focus-kicker">SYSTEM_PORTFOLIO_v2.0</p>
              <h2>{content.profileData.name}</h2>
              <p className="sphere-focus-hero-title">&gt; {content.profileData.title}</p>
              <p className="sphere-focus-hero-copy">{content.profileData.bio}</p>
            </div>
            <div className="sphere-focus-hero-actions">
              <a href="mailto:quicksolver02@gmail.com">
                <Mail className="h-4 w-4" />
                CONTACT
              </a>
              <a href="/cv">
                <FileDown className="h-4 w-4" />
                VIEW CV
              </a>
              <a href="https://github.com/bacobax" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                GITHUB
              </a>
              <a href="https://www.linkedin.com/in/francesco-bassignana/" target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-4 w-4" />
                LINKEDIN
              </a>
            </div>
          </section>
        ) : focusedPanel === "about" ? (
          <AboutSection
            content={content}
            isEditorMode={isEditorMode}
            onUpdateProfileField={handlers.onUpdateProfileField}
            onUpdateAboutStat={handlers.onUpdateAboutStat}
            onUpdateSystemStatusValue={handlers.onUpdateSystemStatusValue}
            onUpdateSystemStatusLabel={handlers.onUpdateSystemStatusLabel}
            onAddSystemStatus={handlers.onAddSystemStatus}
            onRemoveSystemStatus={handlers.onRemoveSystemStatus}
            onUpdateLastDeployment={handlers.onUpdateLastDeployment}
          />
        ) : focusedPanel === "projects" && activeCategory ? (
          <ProjectsSection
            activeCategory={activeCategory}
            isEditorMode={isEditorMode}
            theme={theme}
            particleColor={particleColor}
            onPrevCategory={onPrevCategory}
            onNextCategory={onNextCategory}
            onAddProject={handlers.onAddProject}
            onEditProject={(projectIndex) => handlers.onEditProject(activeCategoryIndex, projectIndex)}
            onDeleteProject={(projectIndex) => handlers.onDeleteProject(activeCategoryIndex, projectIndex)}
            ParticleComponent={projectVisualComponentMap[activeCategory.visual]}
          />
        ) : focusedPanel === "skills" ? (
          <SkillsSection
            skills={content.skillsData}
            isEditorMode={isEditorMode}
            onSkillsChange={handlers.onUpdateSkills}
          />
        ) : focusedPanel === "experience" ? (
          <ExperienceSection
            entries={content.experienceLog}
            isEditorMode={isEditorMode}
            onAddEntry={handlers.onAddExperienceEntry}
            onEntryChange={handlers.onExperienceChange}
            onDeleteEntry={handlers.onDeleteExperienceEntry}
          />
        ) : focusedPanel === "education" ? (
          <EducationSection
            entries={content.educationLog}
            isEditorMode={isEditorMode}
            onAddEntry={handlers.onAddEducation}
            onEditEntry={handlers.onEditEducation}
            onDeleteEntry={handlers.onDeleteEducation}
          />
        ) : (
          <div className="sphere-page-empty">
            <Terminal className="h-5 w-5" />
            <span>NO_SECTION_CONTENT</span>
          </div>
        )}
      </div>

      <div className="sphere-focus-page-foot">
        <a href="https://github.com/bacobax" target="_blank" rel="noopener noreferrer">
          <Github className="h-4 w-4" />
          GITHUB
        </a>
        <a href="https://www.linkedin.com/in/francesco-bassignana/" target="_blank" rel="noopener noreferrer">
          <Linkedin className="h-4 w-4" />
          LINKEDIN
        </a>
      </div>
    </main>
  )
}
