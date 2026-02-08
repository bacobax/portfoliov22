"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoaderCircle, X } from "lucide-react"

import type { Project, ProjectImage, ProjectStatus } from "@/lib/default-content"

interface ProjectFormProps {
  project?: Project
  onSave: (project: Project) => void
  onCancel: () => void
}

const createEmptyProject = (): Project => ({
  title: "",
  description: "",
  status: "DEVELOPMENT",
  metrics: {},
  githubUrl: undefined,
  projectUrl: undefined,
  image: undefined,
  showInCv: true,
})

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [metricKey, setMetricKey] = useState("")
  const [metricValue, setMetricValue] = useState("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Project>(() =>
    project
      ? {
          ...project,
          metrics: { ...project.metrics },
          image: project.image ? { ...project.image } : undefined,
          showInCv: project.showInCv ?? true,
        }
      : createEmptyProject(),
  )

  useEffect(() => {
    setImageUploadError(null)
    setFormData(
      project
        ? {
            ...project,
            metrics: { ...project.metrics },
            image: project.image ? { ...project.image } : undefined,
            showInCv: project.showInCv ?? true,
          }
        : createEmptyProject(),
    )
  }, [project])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setImageUploadError(null)
    setIsUploadingImage(true)

    try {
      const payload = new FormData()
      payload.append("file", file)

      const response = await fetch("/api/content/image", {
        method: "POST",
        body: payload,
      })

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; image?: ProjectImage; error?: string }
        | null

      if (!response.ok || !data?.success || !data.image) {
        throw new Error(data?.error || "Image upload failed")
      }

      setFormData((previous) => ({
        ...previous,
        image: data.image,
      }))
    } catch (error) {
      console.error("Failed to upload project image", error)
      setImageUploadError(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setIsUploadingImage(false)
      event.target.value = ""
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isUploadingImage) {
      return
    }

    if (formData.title && formData.description) {
      const trimmedGithub = formData.githubUrl?.trim()
      const trimmedProjectUrl = formData.projectUrl?.trim()
      const projectToSave: Project = {
        ...formData,
        githubUrl: trimmedGithub ? trimmedGithub : undefined,
        projectUrl: trimmedProjectUrl ? trimmedProjectUrl : undefined,
        image: formData.image ? { ...formData.image } : undefined,
      }

      onSave(projectToSave)
    }
  }

  const addMetric = () => {
    if (metricKey && metricValue) {
      setFormData({
        ...formData,
        metrics: { ...formData.metrics, [metricKey]: metricValue },
      })
      setMetricKey("")
      setMetricValue("")
    }
  }

  const removeMetric = (key: string) => {
    const newMetrics = { ...formData.metrics }
    delete newMetrics[key]
    setFormData({ ...formData, metrics: newMetrics })
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-start sm:items-center justify-center p-4 sm:p-6">
        <div className="bg-card border-2 border-primary p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-mono text-primary">{project ? "EDIT_PROJECT" : "NEW_PROJECT"}</h3>
            <button onClick={onCancel} className="text-primary hover:text-primary/70 cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-mono text-muted-foreground mb-2 block">
                PROJECT_TITLE
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-background border-primary/50 focus:border-primary font-mono"
                placeholder="MY_AWESOME_PROJECT"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-mono text-muted-foreground mb-2 block">
                DESCRIPTION
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-background border border-primary/50 focus:border-primary font-mono p-2 min-h-[100px] text-sm"
                placeholder="Describe your project..."
                required
              />
            </div>

            <div>
              <Label htmlFor="githubUrl" className="text-sm font-mono text-muted-foreground mb-2 block">
                GITHUB_REPOSITORY <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="githubUrl"
                type="url"
                value={formData.githubUrl ?? ""}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                className="bg-background border-primary/50 focus:border-primary font-mono"
                placeholder="https://github.com/username/repository"
                inputMode="url"
              />
            </div>

            <div>
              <Label htmlFor="projectUrl" className="text-sm font-mono text-muted-foreground mb-2 block">
                PROJECT_LINK <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="projectUrl"
                type="url"
                value={formData.projectUrl ?? ""}
                onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                className="bg-background border-primary/50 focus:border-primary font-mono"
                placeholder="https://project.example.com"
                inputMode="url"
              />
            </div>

            <div>
              <Label htmlFor="projectImage" className="text-sm font-mono text-muted-foreground mb-2 block">
                {formData.image ? "REPLACE_PROJECT_IMAGE" : "PROJECT_IMAGE"}{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <div className="border border-primary/50 bg-background/70 p-3 space-y-3">
                <Input
                  id="projectImage"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="bg-background border-primary/50 focus:border-primary font-mono text-sm cursor-pointer"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                <p className="text-[11px] font-mono text-muted-foreground/80">
                  You can upload now or later by editing this project again.
                </p>

                {isUploadingImage && (
                  <p className="text-xs font-mono text-primary flex items-center gap-2">
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    UPLOADING_IMAGE...
                  </p>
                )}

                {imageUploadError && <p className="text-xs font-mono text-destructive">{imageUploadError}</p>}

                {formData.image?.secureUrl && (
                  <div className="border border-primary/40 bg-card/60 p-2 space-y-2">
                    <img
                      src={formData.image.secureUrl}
                      alt={`${formData.title || "Project"} preview`}
                      className="w-full max-h-56 object-cover border border-primary/30"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-mono text-muted-foreground break-all">
                        {formData.image.displayName || formData.image.publicId}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((previous) => ({
                            ...previous,
                            image: undefined,
                          }))
                        }
                        className="text-xs font-mono px-2 py-1 border border-destructive/50 text-destructive hover:border-destructive cursor-pointer"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="status" className="text-sm font-mono text-muted-foreground mb-2 block">
                STATUS
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full bg-background border border-primary/50 focus:border-primary font-mono p-2 text-sm cursor-pointer"
              >
                <option value="DEVELOPMENT">DEVELOPMENT</option>
                <option value="BETA">BETA</option>
                <option value="PRODUCTION">PRODUCTION</option>
                <option value="ONGOING">ONGOING</option>
                <option value="TERMINED">TERMINED</option>
              </select>
            </div>

            <div className="border border-primary/50 bg-background/70 p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label htmlFor="showInCv" className="text-sm font-mono text-muted-foreground">
                    SHOW_IN_CV
                  </Label>
                  <p className="text-xs font-mono text-muted-foreground/80 mt-1">
                    Toggle to include this project in the generated CV.
                  </p>
                </div>
                <input
                  id="showInCv"
                  type="checkbox"
                  checked={formData.showInCv}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      showInCv: event.target.checked,
                    })
                  }
                  className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-mono text-muted-foreground mb-2 block">METRICS</Label>
              <div className="space-y-2 mb-3">
                {Object.entries(formData.metrics).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 bg-secondary/50 p-2 border border-border">
                    <span className="text-xs font-mono text-muted-foreground flex-1">
                      {key}: <span className="text-primary">{value}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMetric(key)}
                      className="text-destructive hover:text-destructive/70 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={metricKey}
                  onChange={(e) => setMetricKey(e.target.value)}
                  className="bg-background border-primary/50 focus:border-primary font-mono text-sm"
                  placeholder="Key (e.g., users)"
                />
                <Input
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  className="bg-background border-primary/50 focus:border-primary font-mono text-sm"
                  placeholder="Value (e.g., 10K)"
                />
                <Button
                  type="button"
                  onClick={addMetric}
                  variant="outline"
                  className="bg-transparent border-primary/50 hover:border-primary cursor-pointer"
                >
                  ADD
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 font-mono cursor-pointer" disabled={isUploadingImage}>
                {project ? "UPDATE" : "CREATE"}
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
        </div>
      </div>
    </div>
  )
}
