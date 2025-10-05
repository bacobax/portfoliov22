"use client"

import { Edit, GraduationCap, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EditableText, formatMultilineText } from "@/components/editable-text"
import { type EducationEntry } from "@/lib/default-content"

export type EducationSectionProps = {
  entries: EducationEntry[]
  isEditorMode?: boolean
  onAddEntry: () => void
  onEditEntry: (index: number) => void
  onDeleteEntry: (index: number) => void
}

export function EducationSection({ entries, isEditorMode, onAddEntry, onEditEntry, onDeleteEntry }: EducationSectionProps) {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-mono text-primary flex items-center gap-2">
          <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          EDUCATION_TIMELINE
        </h3>
        {isEditorMode && (
          <button
            onClick={onAddEntry}
            className="flex items-center gap-2 px-3 py-2 border border-primary/50 bg-card hover:border-primary cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary">NEW_RECORD</span>
          </button>
        )}
      </div>
      {entries.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          {entries.map((entry, index) => (
            <EducationItem
              key={`${entry.degree}-${entry.year}-${index}`}
              entry={entry}
              isEditorMode={isEditorMode}
              onEdit={() => onEditEntry(index)}
              onDelete={() => onDeleteEntry(index)}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
          No education records yet. Use NEW_RECORD to add your academic milestones.
        </p>
      )}
    </Card>
  )
}

type EducationItemProps = {
  entry: EducationEntry
  isEditorMode?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

function EducationItem({ entry, isEditorMode, onEdit, onDelete }: EducationItemProps) {
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
                  type="button"
                >
                  <Edit className="w-3 h-3 text-primary" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 bg-card border border-destructive/50 hover:border-destructive cursor-pointer"
                  title="Delete Education"
                  type="button"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            )}
          </div>
          {description.trim().length > 0 && (
            <div className="text-xs sm:text-sm text-foreground mb-3 leading-relaxed space-y-2">
              {formatMultilineText(description)}
            </div>
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
