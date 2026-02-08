"use client"

import type React from "react"

import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatMultilineText } from "@/components/editable-text"
import { Github, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Globe, ImagePlus, FileText } from "lucide-react"
import { type ProjectCategory, type Project } from "@/lib/default-content"
import { buildProjectPath } from "@/lib/project-path"

export type ProjectVisualComponent = React.ComponentType<{
  color?: { r: number; g: number; b: number }
  theme?: "dark" | "light"
}>

export type ProjectsSectionProps = {
  activeCategory: ProjectCategory
  isEditorMode?: boolean
  theme: "dark" | "light"
  particleColor: { r: number; g: number; b: number }
  onPrevCategory: () => void
  onNextCategory: () => void
  onAddProject: () => void
  onEditProject: (projectIndex: number) => void
  onDeleteProject: (projectIndex: number) => void
  ParticleComponent: ProjectVisualComponent
}

export function ProjectsSection({
  activeCategory,
  isEditorMode,
  theme,
  particleColor,
  onPrevCategory,
  onNextCategory,
  onAddProject,
  onEditProject,
  onDeleteProject,
  ParticleComponent,
}: ProjectsSectionProps) {
  return (
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
            onClick={onAddProject}
            className="flex items-center gap-2 px-3 py-2 border border-primary/50 bg-card hover:border-primary cursor-pointer"
            type="button"
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
            onClick={onPrevCategory}
            className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent border-primary/50 hover:border-primary cursor-pointer"
            type="button"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          </Button>
          <Button
            variant="outline"
            onClick={onNextCategory}
            className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent border-primary/50 hover:border-primary cursor-pointer"
            type="button"
          >
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          </Button>
        </div>
      </div>

      <div className="w-full h-48 sm:h-64 mb-4 sm:mb-6 bg-black/50 border border-primary/20 rounded overflow-hidden">
        <ParticleComponent color={particleColor} theme={theme} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {activeCategory.projects.map((project, projectIndex) => (
          <ProjectCard
            key={`${project.title}-${projectIndex}`}
            project={project}
            projectPath={buildProjectPath(activeCategory.id, project.title)}
            isEditorMode={isEditorMode}
            onEdit={() => onEditProject(projectIndex)}
            onDelete={() => onDeleteProject(projectIndex)}
          />
        ))}
      </div>
    </Card>
  )
}

type ProjectCardProps = {
  project: Project
  projectPath: string
  isEditorMode?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

function ProjectCard({ project, projectPath, isEditorMode, onEdit, onDelete }: ProjectCardProps) {
  const router = useRouter()
  const { title, description, status, metrics, githubUrl, projectUrl, image, document } = project

  const handleOpenProject = () => {
    router.push(projectPath)
  }

  const statusColors = {
    PRODUCTION: "text-primary border-primary",
    BETA: "text-primary/70 border-primary/70",
    DEVELOPMENT: "text-primary/50 border-primary/50",
    ONGOING: "text-primary/80 border-primary/80",
    TERMINED: "text-destructive border-destructive/80",
  } as const

  return (
    <Card
      className="p-3 sm:p-5 bg-card border border-primary/20 hover:border-primary transition-colors relative group cursor-pointer"
      onClick={handleOpenProject}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleOpenProject()
        }
      }}
    >
      {isEditorMode && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(event) => {
              event.stopPropagation()
              onEdit?.()
            }}
            className="p-1.5 bg-card border border-primary/50 hover:border-primary cursor-pointer"
            title="Edit Project"
            type="button"
          >
            <Edit className="w-3 h-3 text-primary" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              onDelete?.()
            }}
            className="p-1.5 bg-card border border-destructive/50 hover:border-destructive cursor-pointer"
            title="Delete Project"
            type="button"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      )}
      {image?.secureUrl && (
        <div className="mb-3 border border-primary/20 bg-background/60 overflow-hidden">
          <img
            src={image.secureUrl}
            alt={`${title} preview`}
            className="w-full h-44 object-cover"
            loading="lazy"
          />
        </div>
      )}
      {isEditorMode && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onEdit?.()
          }}
          className="mb-3 inline-flex items-center gap-2 text-[10px] sm:text-xs font-mono px-2 py-1 border border-primary/50 text-primary hover:border-primary cursor-pointer"
        >
          <ImagePlus className="w-3 h-3" />
          {image?.secureUrl ? "CHANGE_IMAGE" : "ADD_IMAGE"}
        </button>
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
      <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed space-y-2">
        {formatMultilineText(description)}
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key}>
            <span className="text-muted-foreground uppercase">{key}: </span>
            <span className="text-primary">{value}</span>
          </div>
        ))}
      </div>
      {(githubUrl || projectUrl) && (
        <div className="mt-3 flex flex-col gap-2">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono text-primary hover:text-primary/80 transition-colors"
              title="View GitHub repository"
            >
              <Github className="w-4 h-4" />
              VIEW_REPOSITORY
            </a>
          )}
          {projectUrl && (
            <a
              href={projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono text-primary hover:text-primary/80 transition-colors"
              title="Visit project"
            >
              <Globe className="w-4 h-4" />
              VISIT_PROJECT
            </a>
          )}
        </div>
      )}
      {document?.secureUrl && (
        <div className="mt-3">
          <a
            href={document.secureUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono text-primary hover:text-primary/80 transition-colors"
            title="Open project PDF"
          >
            <FileText className="w-4 h-4" />
            OPEN_PDF
          </a>
        </div>
      )}
    </Card>
  )
}
