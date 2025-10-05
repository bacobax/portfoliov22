"use client"

import { useEffect, useMemo, useState } from "react"

import { GraduationCap, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { type EducationEntry } from "@/lib/default-content"

export type EducationFormProps = {
  education?: EducationEntry
  onSave: (education: EducationEntry) => void
  onCancel: () => void
}

export function EducationForm({ education, onSave, onCancel }: EducationFormProps) {
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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

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
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-start sm:items-center justify-center p-4 sm:p-6">
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
    </div>
  )
}
