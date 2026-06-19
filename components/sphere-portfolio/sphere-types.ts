import type {
  EducationEntry,
  ExperienceEntry,
  PortfolioContent,
  Project,
  ProjectCategory,
  ThemeColor,
} from "@/lib/default-content"
import type { ThemeMode } from "@/lib/theme"
import type { FocusPanelName, PanelName } from "./panel-layout"

export type SphereThemeMode = ThemeMode

export type SphereContentSnapshot = {
  content: PortfolioContent | null
  activeCategory: ProjectCategory | null
  activeCategoryIndex: number
  time: Date
  accentColor: ThemeColor
  theme: SphereThemeMode
}

export type SphereSceneSnapshot = SphereContentSnapshot

export type SphereHudState = {
  focusedPanel: FocusPanelName | null
  activePanel: FocusPanelName | null
  isReady: boolean
  hintHidden: boolean
}

export type EditableSphereHandlers = {
  onUpdateProfileField: (field: keyof PortfolioContent["profileData"], value: string) => void
  onUpdateAboutStat: (field: keyof PortfolioContent["aboutStats"], value: string) => void
  onUpdateSystemStatusValue: (id: string, value: number) => void
  onUpdateSystemStatusLabel: (id: string, value: string) => void
  onAddSystemStatus: () => void
  onRemoveSystemStatus: (id: string) => void
  onUpdateLastDeployment: (value: string) => void
  onUpdateSkills: (field: keyof PortfolioContent["skillsData"], skills: string[]) => void
  onAddExperienceEntry: () => void
  onExperienceChange: (index: number, entry: ExperienceEntry) => void
  onDeleteExperienceEntry: (index: number) => void
  onAddEducation: () => void
  onEditEducation: (index: number) => void
  onDeleteEducation: (index: number) => void
  onAddProject: () => void
  onEditProject: (categoryIndex: number, projectIndex: number) => void
  onDeleteProject: (categoryIndex: number, projectIndex: number) => void
}

export type SphereSceneApi = {
  setSnapshot: (snapshot: SphereSceneSnapshot) => void
  setMobileScrollProgress: (progress: number) => void
  focus: (name: PanelName) => void
  exitFocus: () => void
  cycleFocus: (step: number) => void
  dispose: () => void
}

export type ProjectCardSummary = Pick<Project, "title" | "description" | "status" | "metrics">
