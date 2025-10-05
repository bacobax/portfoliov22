"use client"

import { Cpu, Plus, Trash2 } from "lucide-react"

import { Card } from "@/components/ui/card"
import { EditableText } from "@/components/editable-text"
import { type PortfolioContent } from "@/lib/default-content"

export type SkillsSectionProps = {
  skills: PortfolioContent["skillsData"]
  isEditorMode?: boolean
  onSkillsChange: (field: keyof PortfolioContent["skillsData"], skills: string[]) => void
}

export function SkillsSection({ skills, isEditorMode, onSkillsChange }: SkillsSectionProps) {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <h3 className="text-base sm:text-lg font-mono text-primary mb-4 sm:mb-6 flex items-center gap-2">
        <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
        SKILLS_MATRIX
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <SkillCategory
          title="FRONTEND"
          skills={skills.frontend}
          isEditorMode={isEditorMode}
          onSkillsChange={(updated) => onSkillsChange("frontend", updated)}
        />
        <SkillCategory
          title="BACKEND"
          skills={skills.backend}
          isEditorMode={isEditorMode}
          onSkillsChange={(updated) => onSkillsChange("backend", updated)}
        />
        <SkillCategory
          title="DEVOPS"
          skills={skills.devops}
          isEditorMode={isEditorMode}
          onSkillsChange={(updated) => onSkillsChange("devops", updated)}
        />
      </div>
    </Card>
  )
}

type SkillCategoryProps = {
  title: string
  skills: string[]
  isEditorMode?: boolean
  onSkillsChange?: (skills: string[]) => void
}

function SkillCategory({ title, skills, isEditorMode, onSkillsChange }: SkillCategoryProps) {
  const handleSkillChange = (index: number, newValue: string) => {
    if (!onSkillsChange) {
      return
    }

    const newSkills = [...skills]
    newSkills[index] = newValue
    onSkillsChange(newSkills)
  }

  const handleAddSkill = () => {
    if (!onSkillsChange) {
      return
    }

    onSkillsChange([...skills, "New Skill"])
  }

  const handleRemoveSkill = (index: number) => {
    if (!onSkillsChange) {
      return
    }

    const newSkills = skills.filter((_, i) => i !== index)
    onSkillsChange(newSkills)
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
            type="button"
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
                  isEditorMode={Boolean(isEditorMode)}
                  className="text-foreground flex-1"
                />
                <button
                  onClick={() => handleRemoveSkill(index)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-0.5 border border-destructive/50 hover:border-destructive cursor-pointer"
                  title="Remove Skill"
                  type="button"
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
