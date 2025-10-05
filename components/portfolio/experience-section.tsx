"use client"

import { Plus, Terminal, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EditableText } from "@/components/editable-text"
import { type ExperienceEntry } from "@/lib/default-content"

export type ExperienceSectionProps = {
  entries: ExperienceEntry[]
  isEditorMode?: boolean
  onAddEntry: () => void
  onEntryChange: (index: number, entry: ExperienceEntry) => void
  onDeleteEntry: (index: number) => void
}

export function ExperienceSection({ entries, isEditorMode, onAddEntry, onEntryChange, onDeleteEntry }: ExperienceSectionProps) {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-mono text-primary flex items-center gap-2">
          <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
          EXPERIENCE_LOG
        </h3>
        {isEditorMode && (
          <button
            onClick={onAddEntry}
            className="flex items-center gap-2 px-3 py-2 border border-primary/50 bg-card hover:border-primary cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary">NEW_ENTRY</span>
          </button>
        )}
      </div>
      {entries.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          {entries.map((entry, index) => (
            <ExperienceItem
              key={`${entry.title}-${entry.year}-${index}`}
              entry={entry}
              isEditorMode={isEditorMode}
              onChange={(updated) => onEntryChange(index, updated)}
              onDelete={() => onDeleteEntry(index)}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
          No experience entries yet. Use NEW_ENTRY to add your journey.
        </p>
      )}
    </Card>
  )
}

type ExperienceItemProps = {
  entry: ExperienceEntry
  isEditorMode?: boolean
  onChange?: (entry: ExperienceEntry) => void
  onDelete?: () => void
}

function ExperienceItem({ entry, isEditorMode, onChange, onDelete }: ExperienceItemProps) {
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
          type="button"
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
                type="button"
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
            type="button"
          >
            <Plus className="w-3 h-3" />
            TAG
          </button>
        )}
      </div>
    </div>
  )
}
