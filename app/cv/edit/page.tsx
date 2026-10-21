"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { CvLoadingSkeleton } from "@/components/loading-states"
import { arrayMove, useDragSort } from "@/components/cv/use-drag-sort"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Database,
  Eye,
  EyeOff,
  FileText,
  Code2,
  Palette,
  Send,
  GripVertical,
  LayoutTemplate,
  Loader2,
  PencilLine,
  Plus,
  Rows3,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import type { PortfolioContent } from "@/lib/default-content"
import type { ExperienceEntry, EducationEntry, Project } from "@/lib/default-content"
import type {
  CvContent,
  CvSection,
  CvSectionType,
  CvSectionData,
  CvLogEntry,
  CvTagGroup,
  CvLinkItem,
} from "@/lib/cv-content"
import type { CvPreset, CvLayoutId } from "@/lib/cv-presets"
import { cvAgentDocumentSchema } from "@/lib/cv-agent-document"
import { CV_DOCUMENT_SCHEMA_VERSION } from "@/lib/cv-document"
import { changePresetLanguage, changePresetTemplate, createRegionalPreset } from "@/lib/cv-presets"
import { createCvData } from "@/lib/cv-data-transform"
import { CvDocumentOutput } from "@/components/cv/cv-document-output"
import { CvScaleToFit } from "@/components/cv/cv-scale-to-fit"
import { CvDesignPanel, CvQualityReview } from "@/components/cv/cv-design-panel"
import { CvPrintButton } from "@/components/cv/cv-print-button"
import {
  descriptionBulletCount,
  hasDescriptionParts,
  parseDescriptionParts,
  serializeDescriptionParts,
  type CvDescriptionPart,
} from "@/lib/cv-data-transform"
import {
  COUNTRY_LOCALES,
  CV_COUNTRIES,
  CV_TEMPLATES,
  CV_TEMPLATE_BY_ID,
  isCvCountry,
  labelsForLocale,
  templateForCountry,
  type CvCountry,
  type CvLocale,
  type CvPersonalField,
} from "@/lib/cv-templates"
import profilePicture from "@/app/prof_pic.jpeg"
import {
  CONTENT_HUB_CHANNEL,
  ContentHubDrawer,
} from "@/components/content-hub-drawer"

/* ── helpers ── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const SECTION_TYPE_LABELS: Record<CvSectionType, string> = {
  log: "Timeline",
  tags: "Tag Groups",
  text: "Text",
  links: "Links",
  "simple-list": "List",
}

const HOBBIES_SECTION_ID = "hobbies"

function emptySectionData(type: CvSectionType): CvSectionData {
  switch (type) {
    case "log": return { type: "log", entries: [] }
    case "tags": return { type: "tags", groups: [] }
    case "text": return { type: "text", content: "" }
    case "links": return { type: "links", items: [] }
    case "simple-list": return { type: "simple-list", items: [] }
  }
}

/* ════════════════════════════════════════════════════
   Main Editor Page
   ════════════════════════════════════════════════════ */
export default function CvEditorPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [presets, setPresets] = useState<CvPreset[]>([])
  const [canonicalCvSeed, setCanonicalCvSeed] = useState<CvContent | null>(null)
  const [contactLinks, setContactLinks] = useState<{ url: string }[]>([])
  const [activePresetId, setActivePresetId] = useState("")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [publishedPresetIds, setPublishedPresetIds] = useState<string[]>([])
  const [editorView, setEditorView] = useState<"content" | "design" | "source">("content")
  const [sourceText, setSourceText] = useState("")
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showContentHub, setShowContentHub] = useState(false)
  const [, setRevision] = useState<number | null>(null)
  const [conflict, setConflict] = useState<{
    draft: CvPreset[]
    latest: CvPreset[]
    revision: number
  } | null>(null)
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor")
  const [previewZoom, setPreviewZoom] = useState(1)
  const panePositions = useRef({ editor: 0, preview: 0 })
  const switchMobileView = (view: "editor" | "preview") => {
    const current = document.querySelector<HTMLElement>(`.cv-editor-split__${mobileView}`)
    panePositions.current[mobileView] = current?.scrollTop ?? 0
    setMobileView(view)
    requestAnimationFrame(() => {
      const next = document.querySelector<HTMLElement>(`.cv-editor-split__${view}`)
      if (next) next.scrollTop = panePositions.current[view]
    })
  }
  const [activeEditorSection, setActiveEditorSection] = useState("settings")
  const [proofMark, setProofMark] = useState<{ top: number; left: number; height: number } | null>(null)
  const proofScalerRef = useRef<HTMLDivElement>(null)
  const [pendingEntity, setPendingEntity] = useState<{
    sectionId: "experience" | "education" | "projects"
    entry: CvLogEntry
    presetIds: string[]
    showcase: boolean
  } | null>(null)
  const [newPreset, setNewPreset] = useState<{
    step: 1 | 2 | 3
    countryQuery: string
    country: CvCountry
    layout: CvLayoutId
    locale: CvLocale
    name: string
    showPhoto: boolean
  } | null>(null)
  const [pendingTemplate, setPendingTemplate] = useState<CvLayoutId | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revisionRef = useRef<number | null>(null)
  const activePresetIdRef = useRef("")
  const pendingPresetsRef = useRef<{ presets: CvPreset[]; activePresetId: string } | null>(null)
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())
  /* Local edits are the source of truth while editing. These refs let async
     saves and refreshes tell whether the user changed anything since they
     started, so a late server response never rolls the text back. */
  const presetsRef = useRef<CvPreset[]>([])
  const editSeqRef = useRef(0)
  const savesInFlightRef = useRef(0)
  const conflictRef = useRef(false)
  const hasUnsavedWork = () => pendingPresetsRef.current !== null || savesInFlightRef.current > 0 || conflictRef.current
  const regionalDialogOpen = newPreset !== null || pendingTemplate !== null || pendingEntity !== null

  /* ── show default cursor on CV editor ── */
  useEffect(() => {
    document.body.classList.add("cv-cursor-visible")
    return () => { document.body.classList.remove("cv-cursor-visible") }
  }, [])

  useEffect(() => {
    if (!regionalDialogOpen) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = document.querySelector<HTMLElement>(".cv-create-dialog")
    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
    requestAnimationFrame(() => focusables()[0]?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNewPreset(null)
        setPendingTemplate(null)
        setPendingEntity(null)
        return
      }
      if (event.key !== "Tab") return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previous?.focus()
    }
  }, [regionalDialogOpen])

  useEffect(() => {
    activePresetIdRef.current = activePresetId
  }, [activePresetId])

  useEffect(() => {
    if (editorView !== "source" || revisionRef.current === null) return
    const current = presets.find((preset) => preset.id === activePresetId)
    if (current) setSourceText(JSON.stringify({ schemaVersion: CV_DOCUMENT_SCHEMA_VERSION, baseRevision: revisionRef.current, cv: current }, null, 2))
    // Refresh source when the selected CV changes; typing in the source must not reset itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePresetId, editorView])

  /* ── auth check ── */
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/auth/session")
        const d = (await r.json()) as { authenticated?: boolean }
        if (!d.authenticated) { router.replace("/"); return }
        setIsAuthenticated(true)
      } catch { router.replace("/") }
    })()
  }, [router])

  const refreshFromHub = useCallback(async () => {
    setRefreshing(true)
    const editSeqAtStart = editSeqRef.current
    try {
      const response = await fetch("/api/editor/content", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to load data")
      // Edited while the request was out: this snapshot is already stale.
      if (editSeqRef.current !== editSeqAtStart || hasUnsavedWork()) return
      const loaded: CvPreset[] = data.presets ?? []
      presetsRef.current = loaded
      setPresets(loaded)
      setPublishedPresetIds(data.publishedPresetIds ?? [])
      if (data.canonicalCvSeed) setCanonicalCvSeed(data.canonicalCvSeed as CvContent)
      setContactLinks((data.content as PortfolioContent | undefined)?.contactData?.links ?? [])
      if (typeof data.revision === "number") {
        revisionRef.current = data.revision
        setRevision(data.revision)
      }
      setActivePresetId((current) => {
        const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("cv") : null
        const next = requested && loaded.some((preset) => preset.id === requested)
          ? requested
          : loaded.some((preset) => preset.id === current)
          ? current
          : loaded[0]?.id ?? ""
        activePresetIdRef.current = next
        return next
      })
    } catch (e) {
      console.error("Failed to load data", e)
      setError("Failed to load data")
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  /* ── load data ── */
  useEffect(() => {
    if (!isAuthenticated) return
    void refreshFromHub()
  }, [isAuthenticated, refreshFromHub])

  useEffect(() => {
    if (!isAuthenticated) return
    const refreshIfSafe = () => {
      if (!hasUnsavedWork()) void refreshFromHub()
    }
    const channel = new BroadcastChannel(CONTENT_HUB_CHANNEL)
    channel.onmessage = (event) => {
      const nextRevision = (event.data as { revision?: unknown } | null)?.revision
      if (typeof nextRevision === "number" && nextRevision > (revisionRef.current ?? -1)) {
        refreshIfSafe()
      }
    }
    window.addEventListener("focus", refreshIfSafe)
    return () => {
      channel.close()
      window.removeEventListener("focus", refreshIfSafe)
    }
  }, [isAuthenticated, refreshFromHub])

  /* ── debounced persist ── */
  const persist = useCallback((data: CvPreset[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    pendingPresetsRef.current = { presets: data, activePresetId: activePresetIdRef.current }
    setSaving(true)
    setSaved(false)
    setError(null)
    saveTimerRef.current = setTimeout(() => {
      const pending = pendingPresetsRef.current
      pendingPresetsRef.current = null
      if (!pending) return
      const draft = pending.presets
      const draftEditSeq = editSeqRef.current
      savesInFlightRef.current += 1
      saveChainRef.current = saveChainRef.current.then(async () => {
        const baseRevision = revisionRef.current
        if (baseRevision === null) {
          setError("Content hub revision is unavailable")
          return
        }
        // A conflict is waiting for the user; don't stack more writes on it.
        if (conflictRef.current) return
        try {
          const res = await fetch("/api/editor/content", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              baseRevision,
              operations: [{
                type: "replace-presets",
                presets: draft,
                activePresetId: pending.activePresetId,
              }],
            }),
          })
          const payload = await res.json().catch(() => null) as {
            revision?: number
            presets?: CvPreset[]
            content?: PortfolioContent
            error?: string
          } | null
          if (res.status === 409 && typeof payload?.revision === "number" && payload.presets) {
            conflictRef.current = true
            setConflict({ draft, latest: payload.presets, revision: payload.revision })
            return
          }
          if (!res.ok || typeof payload?.revision !== "number") {
            throw new Error(payload?.error || `Save failed: ${res.status}`)
          }
          revisionRef.current = payload.revision
          setRevision(payload.revision)
          // Only adopt the server's copy when nothing was typed since this draft.
          if (editSeqRef.current === draftEditSeq && !pendingPresetsRef.current && payload.presets
            && JSON.stringify(payload.presets) !== JSON.stringify(presetsRef.current)) {
            presetsRef.current = payload.presets
            setPresets(payload.presets)
          }
          setSaved(true)
          const channel = new BroadcastChannel(CONTENT_HUB_CHANNEL)
          channel.postMessage({ revision: payload.revision })
          channel.close()
          setTimeout(() => setSaved(false), 2000)
        } catch (e: unknown) {
          console.error(e)
          setError(e instanceof Error ? e.message : "Failed to save")
        } finally {
          savesInFlightRef.current -= 1
          if (savesInFlightRef.current === 0 && !pendingPresetsRef.current) setSaving(false)
        }
      })
    }, 600)
  }, [])

  const updatePresets = useCallback(
    (updater: (prev: CvPreset[]) => CvPreset[]) => {
      // Apply to the ref first so rapid edits chain on the latest text, not on a render snapshot.
      const next = updater(presetsRef.current)
      if (next === presetsRef.current) return
      presetsRef.current = next
      editSeqRef.current += 1
      setPresets(next)
      persist(next)
    },
    [persist],
  )

  const switchEditorView = (view: "content" | "design" | "source") => {
    setEditorView(view)
    setSourceError(null)
    if (view === "source") {
      const current = presets.find((preset) => preset.id === activePresetId)
      if (current && revisionRef.current !== null) setSourceText(JSON.stringify({ schemaVersion: CV_DOCUMENT_SCHEMA_VERSION, baseRevision: revisionRef.current, cv: current }, null, 2))
    }
  }

  const applySource = () => {
    let candidate: unknown
    try { candidate = JSON.parse(sourceText) } catch (sourceParseError) {
      setSourceError(sourceParseError instanceof Error ? sourceParseError.message : "Invalid JSON")
      return
    }
    const parsed = cvAgentDocumentSchema.safeParse(candidate)
    if (!parsed.success || parsed.data.cv.id !== activePresetId) {
      setSourceError(parsed.success ? "The document ID must match the selected CV." : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"))
      return
    }
    setSourceError(null)
    updatePresets((items) => items.map((item) => item.id === activePresetId ? parsed.data.cv : item))
  }

  const publishActive = async () => {
    const baseRevision = revisionRef.current
    if (!activePresetId || baseRevision === null || saving || publishing) return
    setError(null)
    setPublishing(true)
    try {
      const response = await fetch(`/api/cv/documents/${encodeURIComponent(activePresetId)}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision }) })
      const payload = await response.json().catch(() => null) as { revision?: number; error?: string } | null
      if (!response.ok || typeof payload?.revision !== "number") { setError(payload?.error ?? "Publish failed"); return }
      revisionRef.current = payload.revision
      setRevision(payload.revision)
      setPublishedPresetIds((ids) => [...new Set([...ids, activePresetId])])
      setSaved(true)
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  /* ── profile fields ── */
  const updateProfile = useCallback(
    (field: keyof CvContent, value: unknown) => {
      updatePresets((prev) =>
        prev.map((p) => (p.id === activePresetId ? { ...p, content: { ...p.content, [field]: value } } : p)),
      )
    },
    [activePresetId, updatePresets],
  )

  /* ── section helpers ── */
  const updateSections = useCallback(
    (updater: (s: CvSection[]) => CvSection[]) => {
      updatePresets((prev) =>
        prev.map((p) =>
          p.id === activePresetId
            ? { ...p, content: { ...p.content, sections: updater(p.content.sections) } }
            : p,
        ),
      )
    },
    [activePresetId, updatePresets],
  )

  const updateSectionById = useCallback(
    (sectionId: string, updater: (s: CvSection) => CvSection) => {
      updateSections((ss) => ss.map((s) => (s.id === sectionId ? updater(s) : s)))
    },
    [updateSections],
  )

  /** Move a section to a given placement and insert it at a specific
    * position among the sections in that zone. */
  const moveSection = useCallback(
    (sectionId: string, placement: "sidebar" | "main", zoneIndex: number) => {
      updateSections((ss) => {
        const srcIdx = ss.findIndex((s) => s.id === sectionId)
        if (srcIdx === -1) return ss

        // Remove from current position
        const next = [...ss]
        const [moved] = next.splice(srcIdx, 1)
        moved.placement = placement

        // Find the absolute index to insert at based on the zone position
        const zoneItems = next.filter((s) => s.placement === placement)
        if (zoneIndex >= zoneItems.length) {
          // Append at end — find last item of this zone and insert after it
          let lastZoneIdx = -1
          next.forEach((s, i) => { if (s.placement === placement) lastZoneIdx = i })
          next.splice(lastZoneIdx + 1, 0, moved)
        } else {
          // Insert before the item currently at zoneIndex
          const targetId = zoneItems[zoneIndex].id
          const absIdx = next.findIndex((s) => s.id === targetId)
          next.splice(absIdx, 0, moved)
        }
        return next
      })
    },
    [updateSections],
  )

  const swapSection = useCallback(
    (sectionId: string, dir: -1 | 1) => {
      updateSections((ss) => {
        const idx = ss.findIndex((s) => s.id === sectionId)
        if (idx === -1) return ss
        const zone = ss.filter((section) => section.placement === ss[idx].placement)
        const neighbor = zone[zone.findIndex((section) => section.id === sectionId) + dir]
        if (!neighbor) return ss
        const target = ss.findIndex((section) => section.id === neighbor.id)
        const next = [...ss]
        ;[next[idx], next[target]] = [next[target], next[idx]]
        return next
      })
    },
    [updateSections],
  )

  const addSection = useCallback(
    (type: CvSectionType, placement: "sidebar" | "main") => {
      updateSections((ss) => [
        ...ss,
        { id: uid(), title: `New ${SECTION_TYPE_LABELS[type]}`, type, placement, visible: true, data: emptySectionData(type) },
      ])
    },
    [updateSections],
  )

  /** Hobbies is an optional short paragraph with a fixed id, so templates title and place it. */
  const addHobbies = useCallback(
    (placement: "sidebar" | "main") => {
      const locale = presets.find((preset) => preset.id === activePresetId)?.documentLanguage ?? "en"
      updateSections((ss) => ss.some((s) => s.id === HOBBIES_SECTION_ID) ? ss : [
        ...ss,
        { id: HOBBIES_SECTION_ID, title: labelsForLocale(locale).hobbies, titleMode: "template", type: "text", placement, visible: true, data: { type: "text", content: "" } },
      ])
    },
    [activePresetId, presets, updateSections],
  )

  const deleteSection = useCallback(
    (sectionId: string) => { updateSections((ss) => ss.filter((s) => s.id !== sectionId)) },
    [updateSections],
  )

  const toggleSectionVisibility = useCallback(
    (sectionId: string) => { updateSectionById(sectionId, (s) => ({ ...s, visible: !s.visible })) },
    [updateSectionById],
  )

  const renameSection = useCallback(
    (sectionId: string, title: string) => { updateSectionById(sectionId, (s) => ({ ...s, title, titleMode: "custom" })) },
    [updateSectionById],
  )

  /* ── preset CRUD ── */
  const createPreset = () => {
    const country: CvCountry = "Italy"
    const layout = templateForCountry(country)
    setNewPreset({
      step: 1,
      countryQuery: country,
      country,
      layout,
      locale: COUNTRY_LOCALES[country][0],
      name: `Italy CV ${presets.length + 1}`,
      showPhoto: CV_TEMPLATE_BY_ID[layout].defaultOptions.showPhoto,
    })
  }

  const confirmCreatePreset = () => {
    if (!newPreset) return
    const preset = createRegionalPreset({
      name: newPreset.name.trim(),
      country: newPreset.country,
      locale: newPreset.locale,
      layout: newPreset.layout,
      sourceContent: canonicalCvSeed ?? presets[0]?.content,
    })
    preset.regionalOptions.showPhoto = newPreset.showPhoto
    activePresetIdRef.current = preset.id
    setActivePresetId(preset.id)
    updatePresets((prev) => [...prev, preset])
    setNewPreset(null)
  }

  const deletePreset = (id: string) => {
    updatePresets((prev) => {
      const remaining = prev.filter((p) => p.id !== id)
      if (activePresetId === id && remaining.length > 0) setActivePresetId(remaining[0].id)
      return remaining
    })
  }

  const toggleVisibility = (id: string) => {
    updatePresets((prev) => prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)))
  }

  const setPresetLayout = (id: string, layout: CvLayoutId) => {
    updatePresets((prev) => prev.map((p) => (p.id === id ? changePresetTemplate(p, layout) : p)))
  }

  const renamePreset = (id: string, name: string) => {
    updatePresets((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  const updatePresetMetadata = (id: string, updater: (preset: CvPreset) => CvPreset) => {
    updatePresets((prev) => prev.map((preset) => preset.id === id ? updater(preset) : preset))
  }

  const togglePersonalField = (id: string, field: CvPersonalField) => {
    updatePresetMetadata(id, (preset) => {
      const selected = new Set(preset.regionalOptions.personalFields)
      if (selected.has(field)) selected.delete(field)
      else selected.add(field)
      return { ...preset, regionalOptions: { ...preset.regionalOptions, personalFields: [...selected] } }
    })
  }

  /* ── derived ── */
  const activePreset = presets.find((p) => p.id === activePresetId)
  const cv = activePreset?.content
  const previewData = activePreset ? createCvData(activePreset.content, activePreset, contactLinks) : null
  const editorDestinations = cv
    ? [
        { id: "settings", label: "CV setup", detail: "Format & visibility", icon: <Settings2 className="w-4 h-4" /> },
        { id: "profile", label: "Profile", detail: "Identity & contact", icon: <UserRound className="w-4 h-4" /> },
        { id: "layout", label: "Arrange sections", detail: "Order & placement", icon: <Rows3 className="w-4 h-4" /> },
        ...cv.sections.map((section) => ({
          id: `section-${section.id}`,
          label: section.title,
          detail: SECTION_TYPE_LABELS[section.type],
          icon: <FileText className="w-4 h-4" />,
        })),
      ]
    : []
  const editorDestinationKey = editorDestinations.map((item) => item.id).join("|")
  const activeEditorIndex = Math.max(0, editorDestinations.findIndex((item) => item.id === activeEditorSection))

  const navigateToEditorSection = useCallback((sectionId: string) => {
    setMobileView("editor")
    document.getElementById(`cv-editor-${sectionId}`)?.dispatchEvent(new Event("cv-open-section"))
    setActiveEditorSection(sectionId)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
        document.getElementById(`cv-editor-${sectionId}`)?.scrollIntoView({ behavior, block: "start" })
        // Bring the matching passage of the proof into view beside it.
        const pane = document.querySelector<HTMLElement>(".cv-editor-split__preview")
        const target = proofScalerRef.current && findProofTarget(proofScalerRef.current, sectionId)
        if (pane && target) {
          const top = target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 96
          pane.scrollTo({ top: Math.max(0, top), behavior })
        }
      })
    })
  }, [])

  /* The proof mark follows the section being edited onto its place on the page. */
  const placeProofMark = useCallback(() => {
    const scaler = proofScalerRef.current
    const target = scaler && findProofTarget(scaler, activeEditorSection)
    const page = scaler?.querySelector<HTMLElement>(".cv-document--visual")
    if (!scaler || !target || !page) {
      setProofMark((current) => current && null)
      return
    }
    const origin = scaler.getBoundingClientRect()
    const box = target.getBoundingClientRect()
    const next = {
      top: Math.round(box.top - origin.top),
      left: Math.round(page.getBoundingClientRect().left - origin.left - 16),
      height: Math.max(12, Math.round(box.height)),
    }
    setProofMark((current) => current && current.top === next.top && current.left === next.left && current.height === next.height ? current : next)
  }, [activeEditorSection])

  useEffect(() => {
    const scaler = proofScalerRef.current
    if (!scaler) return
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(placeProofMark)
    }
    schedule()
    const resize = new ResizeObserver(schedule)
    resize.observe(scaler)
    const mutations = new MutationObserver(schedule)
    mutations.observe(scaler, { childList: true, subtree: true, characterData: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
    }
  }, [placeProofMark, activePresetId, previewZoom, mobileView, loading, isAuthenticated, editorView])

  useEffect(() => {
    if (!editorDestinationKey || mobileView === "preview") return
    const editorPane = document.querySelector<HTMLElement>(".cv-editor-split__editor")
    const anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-cv-editor-anchor]"))
    if (anchors.length === 0) return

    const updateActiveSection = () => {
      // below the sticky Content / Design / Source tabs
      const referenceTop = (editorPane?.getBoundingClientRect().top ?? 0) + 96
      let next = anchors[0]?.dataset.cvEditorAnchor ?? "settings"
      for (const anchor of anchors) {
        if (anchor.getBoundingClientRect().top <= referenceTop) {
          next = anchor.dataset.cvEditorAnchor ?? next
        } else {
          break
        }
      }
      setActiveEditorSection((current) => current === next ? current : next)
    }

    updateActiveSection()
    editorPane?.addEventListener("scroll", updateActiveSection, { passive: true })
    window.addEventListener("scroll", updateActiveSection, { passive: true })
    window.addEventListener("resize", updateActiveSection)
    return () => {
      editorPane?.removeEventListener("scroll", updateActiveSection)
      window.removeEventListener("scroll", updateActiveSection)
      window.removeEventListener("resize", updateActiveSection)
    }
  }, [activePresetId, editorDestinationKey, mobileView])

  /* ── guards ── */
  if (!isAuthenticated || loading) {
    return <CvLoadingSkeleton editor />
  }

  return (
    <div className="cv-editor-page cv-proof">
      <ContentHubDrawer
        open={showContentHub}
        onClose={() => {
          setShowContentHub(false)
          void refreshFromHub()
        }}
      />
      {newPreset && (
        <div className="cv-create-layer" role="presentation">
          <div className="cv-create-dialog cv-template-dialog" role="dialog" aria-modal="true" aria-labelledby="new-cv-title">
            <div className="cv-create-dialog__head">
              <div>
                <span>Step {newPreset.step} of 3</span>
                <h2 id="new-cv-title">Create a regional CV</h2>
              </div>
              <button type="button" onClick={() => setNewPreset(null)} aria-label="Cancel CV creation"><X className="w-5 h-5" /></button>
            </div>

            {newPreset.step === 1 && (
              <section className="cv-wizard-step" aria-labelledby="country-step-title">
                <h3 id="country-step-title">Where will you apply?</h3>
                <p>The country selects the locally familiar format. You can override it in the next step.</p>
                <label className="cv-field">
                  <span className="cv-field__label">Search or choose a target country</span>
                  <input
                    className="cv-field__input"
                    list="cv-country-options"
                    value={newPreset.countryQuery}
                    onChange={(event) => {
                      const countryQuery = event.target.value
                      if (!isCvCountry(countryQuery)) {
                        setNewPreset({ ...newPreset, countryQuery })
                        return
                      }
                      const country = countryQuery
                      const layout = templateForCountry(country)
                      setNewPreset({
                        ...newPreset,
                        countryQuery,
                        country,
                        layout,
                        locale: COUNTRY_LOCALES[country][0],
                        name: `${country} CV ${presets.length + 1}`,
                        showPhoto: CV_TEMPLATE_BY_ID[layout].defaultOptions.showPhoto,
                      })
                    }}
                  />
                  <datalist id="cv-country-options">
                    {CV_COUNTRIES.map((country) => <option key={country} value={country} />)}
                  </datalist>
                </label>
                <div className="cv-recommendation">
                  <span>Recommended format</span>
                  <strong>{CV_TEMPLATE_BY_ID[templateForCountry(newPreset.country)].label}</strong>
                </div>
              </section>
            )}

            {newPreset.step === 2 && (
              <section className="cv-wizard-step" aria-labelledby="template-step-title">
                <h3 id="template-step-title">Choose the visual convention</h3>
                <p>The recommended format is marked. Every alternative remains available as an explicit override.</p>
                <div className="cv-template-grid">
                  {CV_TEMPLATES.map((template) => {
                    const recommended = template.id === templateForCountry(newPreset.country)
                    const selected = template.id === newPreset.layout
                    return (
                      <button
                        type="button"
                        key={template.id}
                        className={`cv-template-card ${selected ? "cv-template-card--selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => setNewPreset({
                          ...newPreset,
                          layout: template.id,
                          showPhoto: template.defaultOptions.showPhoto,
                        })}
                      >
                        <span className="cv-template-card__preview" style={{ "--card-accent": template.accent } as React.CSSProperties} aria-hidden="true"><i /><i /><i /></span>
                        <span className="cv-template-card__copy">
                          <strong>{template.shortLabel}</strong>
                          <small>{template.pageGuidance}</small>
                          <em>{recommended ? "Recommended" : template.conventions[0]}</em>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {newPreset.step === 3 && (
              <section className="cv-wizard-step" aria-labelledby="details-step-title">
                <h3 id="details-step-title">Name and language</h3>
                <p>Only headings and recognized dates are localized. Your authored content stays unchanged.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldWithHint label="CV name" value={newPreset.name} onChange={(name) => setNewPreset({ ...newPreset, name })} />
                  <label className="cv-field">
                    <span className="cv-field__label">Document language</span>
                    <select className="cv-field__input" value={newPreset.locale} onChange={(event) => setNewPreset({ ...newPreset, locale: event.target.value as CvLocale })}>
                      {COUNTRY_LOCALES[newPreset.country].map((locale) => <option key={locale} value={locale}>{new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? locale}</option>)}
                    </select>
                  </label>
                </div>
                <label className="cv-option-row">
                  <input type="checkbox" checked={newPreset.showPhoto} onChange={(event) => setNewPreset({ ...newPreset, showPhoto: event.target.checked })} />
                  <span><strong>Show profile photo</strong><small>Optional even where locally common; you can change this later.</small></span>
                </label>
                <div className="cv-recommendation">
                  <span>{newPreset.country}</span>
                  <strong>{CV_TEMPLATE_BY_ID[newPreset.layout].label}</strong>
                </div>
              </section>
            )}

            <div className="cv-wizard-actions">
              <button type="button" className="cv-btn" onClick={() => newPreset.step === 1 ? setNewPreset(null) : setNewPreset({ ...newPreset, step: (newPreset.step - 1) as 1 | 2 })}>
                {newPreset.step === 1 ? "Cancel" : "Back"}
              </button>
              {newPreset.step < 3 ? (
                <button
                  type="button"
                  className="cv-btn cv-btn--primary"
                  disabled={newPreset.step === 1 && !isCvCountry(newPreset.countryQuery)}
                  onClick={() => setNewPreset({ ...newPreset, step: (newPreset.step + 1) as 2 | 3 })}
                >
                  Continue
                </button>
              ) : (
                <button type="button" className="cv-btn cv-btn--primary" disabled={!newPreset.name.trim()} onClick={confirmCreatePreset}>Create CV</button>
              )}
            </div>
          </div>
        </div>
      )}
      {pendingTemplate && activePreset && (
        <div className="cv-create-layer" role="presentation">
          <div className="cv-create-dialog cv-template-confirm" role="alertdialog" aria-modal="true" aria-labelledby="template-change-title">
            <div className="cv-create-dialog__head">
              <div><span>Template change</span><h2 id="template-change-title">Apply {CV_TEMPLATE_BY_ID[pendingTemplate].shortLabel}?</h2></div>
              <button type="button" onClick={() => setPendingTemplate(null)} aria-label="Cancel template change"><X className="w-5 h-5" /></button>
            </div>
            <p>This applies the recommended section order and placement. Canonical content, selected items, visibility, personal-data choices, custom headings and wording remain intact.</p>
            <div className="cv-wizard-actions">
              <button type="button" className="cv-btn" onClick={() => setPendingTemplate(null)}>Keep current</button>
              <button type="button" className="cv-btn cv-btn--primary" onClick={() => { setPresetLayout(activePreset.id, pendingTemplate); setPendingTemplate(null) }}>Apply template</button>
            </div>
          </div>
        </div>
      )}
      {pendingEntity && (
        <div className="cv-create-layer" role="presentation">
          <div className="cv-create-dialog" role="dialog" aria-modal="true" aria-labelledby="cv-create-title">
            <div className="cv-create-dialog__head">
              <div>
                <span>New shared item</span>
                <h2 id="cv-create-title">Add {pendingEntity.sectionId.slice(0, -1)}</h2>
              </div>
              <button type="button" onClick={() => setPendingEntity(null)} aria-label="Cancel creation"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWithHint label="Title" value={pendingEntity.entry.title} onChange={(value) => setPendingEntity({ ...pendingEntity, entry: { ...pendingEntity.entry, title: value } })} />
              <FieldWithHint label="Subtitle" value={pendingEntity.entry.subtitle} onChange={(value) => setPendingEntity({ ...pendingEntity, entry: { ...pendingEntity.entry, subtitle: value } })} />
              <FieldWithHint label="Start / status" value={pendingEntity.entry.dateStart} onChange={(value) => setPendingEntity({ ...pendingEntity, entry: { ...pendingEntity.entry, dateStart: value } })} />
              <FieldWithHint label="End date" value={pendingEntity.entry.dateEnd} onChange={(value) => setPendingEntity({ ...pendingEntity, entry: { ...pendingEntity.entry, dateEnd: value } })} />
            </div>
            <TextAreaWithHint label="Description" value={pendingEntity.entry.description} onChange={(value) => setPendingEntity({ ...pendingEntity, entry: { ...pendingEntity.entry, description: value } })} rows={3} />
            <InlineTagsEditor
              label="Tags"
              items={pendingEntity.entry.tags}
              onChange={(tags) => setPendingEntity({
                ...pendingEntity,
                entry: { ...pendingEntity.entry, tags },
              })}
            />
            <fieldset className="cv-create-targets">
              <legend>Choose every destination before saving</legend>
              <label><input type="checkbox" checked={pendingEntity.showcase} onChange={(event) => setPendingEntity({ ...pendingEntity, showcase: event.target.checked })} /> Showcase</label>
              {presets.map((preset) => (
                <label key={preset.id}>
                  <input
                    type="checkbox"
                    checked={pendingEntity.presetIds.includes(preset.id)}
                    disabled={preset.id === activePresetId}
                    onChange={(event) => setPendingEntity({
                      ...pendingEntity,
                      presetIds: event.target.checked
                        ? [...pendingEntity.presetIds, preset.id]
                        : pendingEntity.presetIds.filter((id) => id !== preset.id),
                    })}
                  />
                  {preset.name}{preset.id === activePresetId ? " (current)" : ""}
                </label>
              ))}
            </fieldset>
            <div className="cv-create-actions">
              <button type="button" className="cv-btn" onClick={() => setPendingEntity(null)}>Cancel</button>
              <button
                type="button"
                className="cv-btn cv-btn--primary"
                disabled={!pendingEntity.entry.title.trim() || pendingEntity.presetIds.length === 0}
                onClick={() => {
                  const entry = { ...pendingEntity.entry, showcaseVisible: pendingEntity.showcase }
                  updatePresets((current) => current.map((preset) =>
                    !pendingEntity.presetIds.includes(preset.id)
                      ? preset
                      : {
                          ...preset,
                          content: {
                            ...preset.content,
                            sections: preset.content.sections.map((section) =>
                              section.id === pendingEntity.sectionId && section.data.type === "log"
                                ? { ...section, data: { type: "log" as const, entries: [...section.data.entries, entry] } }
                                : section,
                            ),
                          },
                        },
                  ))
                  setPendingEntity(null)
                }}
              >
                Add item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="cv-editor-bar">
        <div className="cv-editor-bar__left">
          <button onClick={() => router.push("/cv")} className="cv-editor-bar__back" type="button">
            <ArrowLeft className="w-4 h-4" /> CVs
          </button>
          <h1 className="cv-editor-bar__title">CV editor</h1>
        </div>
        <div className="cv-editor-bar__right">
          <span className="cv-editor-bar__status" aria-live="polite">
            {saving && <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>}
            {!saving && refreshing && <><Loader2 className="w-3 h-3 animate-spin" /> Refreshing from Atlas…</>}
            {!saving && !refreshing && !error && !conflict && <><Check className="w-3 h-3" /> {saved ? "All changes saved" : "Changes save automatically"}</>}
          </span>
          {error && <span className="cv-editor-bar__status cv-editor-bar__status--err">{error}</span>}
          <button onClick={() => setShowContentHub(true)} className="cv-editor-bar__btn" type="button">
            <Database className="w-4 h-4" /> Content hub
          </button>
          <button onClick={() => router.push("/")} className="cv-editor-bar__btn" type="button">
            Portfolio
          </button>
          {activePresetId && <button onClick={() => void publishActive()} disabled={saving || publishing} className="cv-editor-bar__btn cv-editor-publish" type="button">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {publishing ? "Publishing…" : publishedPresetIds.includes(activePresetId) ? "Publish update" : "Publish CV"}
          </button>}
        </div>
      </header>

      {conflict && (
        <div className="cv-editor-conflict" role="alert">
          <span>Another editor saved first. Your local changes are preserved.</span>
          <button type="button" onClick={() => {
            // Keep everything typed so far, including edits made after the failed save.
            const local = presetsRef.current
            revisionRef.current = conflict.revision
            setRevision(conflict.revision)
            const active = local.find((preset) => preset.id === activePresetId)
            if (active) setSourceText(JSON.stringify({ schemaVersion: CV_DOCUMENT_SCHEMA_VERSION, baseRevision: conflict.revision, cv: active }, null, 2))
            setEditorView("source")
            conflictRef.current = false
            setConflict(null)
            if (pendingPresetsRef.current === null && savesInFlightRef.current === 0) setSaving(false)
          }}>Review local JSON</button>
          <button type="button" onClick={() => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            pendingPresetsRef.current = null
            revisionRef.current = conflict.revision
            setRevision(conflict.revision)
            presetsRef.current = conflict.latest
            editSeqRef.current += 1
            setPresets(conflict.latest)
            conflictRef.current = false
            setConflict(null)
            if (savesInFlightRef.current === 0) setSaving(false)
          }}>Use Atlas version</button>
        </div>
      )}

      {/* ── Preset tabs ── */}
      <div className="cv-preset-bar">
        <div className="cv-preset-bar__tabs">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={activePresetId === preset.id}
              onClick={() => setActivePresetId(preset.id)}
              className={`cv-preset-tab ${activePresetId === preset.id ? "cv-preset-tab--active" : ""} ${!preset.visible ? "cv-preset-tab--hidden" : ""}`}
            >
              {!preset.visible && <EyeOff className="w-3 h-3" />}
              {preset.name}
              <span className="cv-preset-tab__layout">{CV_TEMPLATE_BY_ID[preset.layout].shortLabel}</span>
              <span className="cv-preset-tab__layout">{publishedPresetIds.includes(preset.id) ? "Published" : "Private draft"}</span>
            </button>
          ))}
          <button type="button" onClick={createPreset} className="cv-preset-tab cv-preset-tab--add">
            <Plus className="w-3 h-3" /> New CV
          </button>
        </div>
      </div>

      {/* ── Mobile view toggle ── */}
      {activePreset && (
        <div className="cv-editor-mobile-toggle">
          <button type="button" aria-pressed={mobileView === "editor"} onClick={() => switchMobileView("editor")}
            className={`cv-editor-mobile-toggle__btn ${mobileView === "editor" ? "cv-editor-mobile-toggle__btn--active" : ""}`}>
            <PencilLine className="w-4 h-4" /> Edit CV
          </button>
          <button type="button" aria-pressed={mobileView === "preview"} onClick={() => switchMobileView("preview")}
            className={`cv-editor-mobile-toggle__btn ${mobileView === "preview" ? "cv-editor-mobile-toggle__btn--active" : ""}`}>
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>
      )}

      {activePreset && cv && (
        <nav className="cv-section-nav" aria-label="CV sections">
          <div className="cv-section-nav__heading">
            <span><Rows3 className="w-4 h-4" /> Sections</span>
            <span>{activeEditorIndex + 1} / {editorDestinations.length}</span>
          </div>
          <div className="cv-section-nav__controls">
            <button type="button" aria-label="Previous section" disabled={activeEditorIndex === 0}
              onClick={() => navigateToEditorSection(editorDestinations[activeEditorIndex - 1].id)}><ChevronLeft className="w-4 h-4" /></button>
            <select aria-label="Choose CV section" value={editorDestinations[activeEditorIndex]?.id ?? "settings"}
              onChange={(event) => navigateToEditorSection(event.target.value)}>
              {editorDestinations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <button type="button" aria-label="Next section" disabled={activeEditorIndex === editorDestinations.length - 1}
              onClick={() => navigateToEditorSection(editorDestinations[activeEditorIndex + 1].id)}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="cv-section-nav__rail">
            {editorDestinations.map((item) => (
              <button key={item.id} type="button" aria-current={activeEditorSection === item.id ? "location" : undefined}
                onClick={() => navigateToEditorSection(item.id)} title={item.detail}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {activePreset && cv ? (
        <div className={`cv-editor-split ${mobileView === "preview" ? "cv-editor-split--preview-mode" : ""}`}>
          <div className="cv-editor-split__editor">
            <div className="cv-document-mode" role="tablist" aria-label="CV editing mode">
              <button type="button" role="tab" aria-selected={editorView === "content"} onClick={() => switchEditorView("content")}><FileText className="w-4 h-4" /> Content</button>
              <button type="button" role="tab" aria-selected={editorView === "design"} onClick={() => switchEditorView("design")}><Palette className="w-4 h-4" /> Design</button>
              <button type="button" role="tab" aria-selected={editorView === "source"} onClick={() => switchEditorView("source")}><Code2 className="w-4 h-4" /> Source</button>
            </div>
            {editorView === "design" && <main className="cv-editor-main">
              <CvDesignPanel preset={activePreset} onChange={(design) => updatePresetMetadata(activePreset.id, (preset) => ({ ...preset, design }))} />
            </main>}
            {editorView === "source" && <main className="cv-editor-main">
              <EditorCard sectionId="source" title="JSON source" icon={<Code2 className="w-4 h-4" />}>
                <p className="cv-source-help">This is the same versioned document used by the agent CLI. Apply validates it before replacing the draft.</p>
                <textarea className="cv-source-editor" aria-label="CV JSON source" spellCheck={false} value={sourceText} onChange={(event) => setSourceText(event.target.value)} />
                {sourceError && <pre className="cv-source-error" role="alert">{sourceError}</pre>}
                <button type="button" className="cv-btn cv-btn--primary" onClick={applySource}>Validate and apply</button>
              </EditorCard>
            </main>}
            <main className="cv-editor-main" style={{ display: editorView === "content" ? undefined : "none" }}>
              {/* ─── Preset Settings ─── */}
              <EditorCard sectionId="settings" title="CV setup" icon={<LayoutTemplate className="w-4 h-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="cv-field">
                    <label className="cv-field__label">Preset Name</label>
                    <input aria-label="Preset Name" className="cv-field__input" value={activePreset.name}
                      onChange={(e) => renamePreset(activePreset.id, e.target.value)} />
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Target country</label>
                    <select aria-label="Target country" className="cv-field__input" value={activePreset.targetCountry}
                      onChange={(e) => {
                        const country = e.target.value as CvCountry
                        updatePresetMetadata(activePreset.id, (preset) => ({
                          ...preset,
                          targetCountry: country,
                          documentLanguage: COUNTRY_LOCALES[country].includes(preset.documentLanguage)
                            ? preset.documentLanguage
                            : COUNTRY_LOCALES[country][0],
                        }))
                      }}>
                      {CV_COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                    </select>
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Regional template</label>
                    <select aria-label="Regional template" className="cv-field__input" value={activePreset.layout}
                      onChange={(e) => setPendingTemplate(e.target.value as CvLayoutId)}>
                      {CV_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.shortLabel}{template.id === templateForCountry(activePreset.targetCountry) ? " · recommended" : ""}</option>)}
                    </select>
                    {activePreset.layout !== templateForCountry(activePreset.targetCountry) && <span className="cv-field__hint">Explicit regional override</span>}
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Document language</label>
                    <select aria-label="Document language" className="cv-field__input" value={activePreset.documentLanguage}
                      onChange={(e) => updatePresetMetadata(activePreset.id, (preset) => changePresetLanguage(preset, e.target.value as CvLocale))}>
                      {COUNTRY_LOCALES[activePreset.targetCountry].map((locale) => <option key={locale} value={locale}>{new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? locale}</option>)}
                    </select>
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Visible</label>
                    <button type="button" className="cv-field__input text-left"
                      onClick={() => toggleVisibility(activePreset.id)}>
                      {activePreset.visible ? "✓ Visible" : "✗ Hidden"}
                    </button>
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Actions</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button type="button" className="cv-btn cv-btn--danger" onClick={() => deletePreset(activePreset.id)}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div className="cv-regional-settings">
                  <div className="cv-field">
                    <label className="cv-field__label">Target role override</label>
                    <input aria-label="Target role override" className="cv-field__input" value={activePreset.targetRoleOverride ?? ""}
                      placeholder={cv.title || "Role title"}
                      onChange={(e) => updatePresetMetadata(activePreset.id, (preset) => ({ ...preset, targetRoleOverride: e.target.value || undefined }))} />
                  </div>
                  <div className="cv-field">
                    <label className="cv-field__label">Preset summary override</label>
                    <textarea aria-label="Preset summary override" className="cv-field__input cv-field__textarea" rows={3} value={activePreset.summaryOverride ?? ""}
                      placeholder="Leave empty to use the canonical profile summary"
                      onChange={(e) => updatePresetMetadata(activePreset.id, (preset) => ({ ...preset, summaryOverride: e.target.value || undefined }))} />
                  </div>
                  <div className="cv-option-grid">
                    <label className="cv-option-row"><input type="checkbox" checked={activePreset.regionalOptions.showPhoto} onChange={(e) => updatePresetMetadata(activePreset.id, (preset) => ({ ...preset, regionalOptions: { ...preset.regionalOptions, showPhoto: e.target.checked } }))} /><span><strong>Profile photo</strong><small>Optional in every template</small></span></label>
                    <label className="cv-option-row"><input type="checkbox" checked={activePreset.regionalOptions.showSignature} onChange={(e) => updatePresetMetadata(activePreset.id, (preset) => ({ ...preset, regionalOptions: { ...preset.regionalOptions, showSignature: e.target.checked } }))} /><span><strong>Dated signature</strong><small>Common in tabular applications</small></span></label>
                  </div>
                  {activePreset.regionalOptions.showSignature && <FieldWithHint label="Document date / place" value={activePreset.regionalOptions.documentDate} onChange={(documentDate) => updatePresetMetadata(activePreset.id, (preset) => ({ ...preset, regionalOptions: { ...preset.regionalOptions, documentDate } }))} />}
                  <div className="cv-field">
                    <label className="cv-field__label">Optional footer</label>
                    <textarea aria-label="Optional footer" className="cv-field__input cv-field__textarea" rows={2} value={activePreset.regionalOptions.customFooter}
                      onChange={(e) => updatePresetMetadata(activePreset.id, (preset) => ({ ...preset, regionalOptions: { ...preset.regionalOptions, customFooter: e.target.value } }))} />
                    {activePreset.targetCountry === "Italy" && <span className="cv-field__hint">No generic GDPR consent is added automatically. Add wording only when the specific application requires it.</span>}
                  </div>
                  <fieldset className="cv-personal-fields">
                    <legend>Optional personal details shown in this CV</legend>
                    {(["dateOfBirth", "placeOfBirth", "nationality", "workAuthorization", "drivingLicences", "references"] as CvPersonalField[]).map((field) => (
                      <label key={field}><input type="checkbox" checked={activePreset.regionalOptions.personalFields.includes(field)} onChange={() => togglePersonalField(activePreset.id, field)} /> {field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</label>
                    ))}
                  </fieldset>
                  <div className="cv-page-guidance"><span>Format guidance</span><strong>{CV_TEMPLATE_BY_ID[activePreset.layout].pageGuidance}</strong><small>Content is never truncated automatically.</small></div>
                </div>
              </EditorCard>

              {/* ─── Profile ─── */}
              <EditorCard sectionId="profile" title="Profile & contact" icon={<UserRound className="w-4 h-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldWithHint label="Full Name" value={cv.name || ""} onChange={(v) => updateProfile("name", v || undefined)} />
                  <FieldWithHint label="Title / Role" value={cv.title || ""} onChange={(v) => updateProfile("title", v || undefined)} />
                  <FieldWithHint label="Location" value={cv.location || ""} onChange={(v) => updateProfile("location", v || undefined)} />
                  <FieldWithHint label="Email" value={cv.email || ""} onChange={(v) => updateProfile("email", v || undefined)} />
                  <FieldWithHint label="Phone" value={cv.phone || ""} onChange={(v) => updateProfile("phone", v || undefined)} />
                  <FieldWithHint label="P.IVA" value={cv.piva || ""} onChange={(v) => updateProfile("piva", v || undefined)} />
                  <FieldWithHint label="Date of birth (optional)" value={cv.profileExtras?.dateOfBirth || ""} onChange={(dateOfBirth) => updateProfile("profileExtras", { drivingLicences: [], references: [], ...cv.profileExtras, dateOfBirth: dateOfBirth || undefined })} />
                  <FieldWithHint label="Place of birth (optional)" value={cv.profileExtras?.placeOfBirth || ""} onChange={(placeOfBirth) => updateProfile("profileExtras", { drivingLicences: [], references: [], ...cv.profileExtras, placeOfBirth: placeOfBirth || undefined })} />
                  <FieldWithHint label="Nationality (optional)" value={cv.profileExtras?.nationality || ""} onChange={(nationality) => updateProfile("profileExtras", { drivingLicences: [], references: [], ...cv.profileExtras, nationality: nationality || undefined })} />
                  <FieldWithHint label="Work authorization (optional)" value={cv.profileExtras?.workAuthorization || ""} onChange={(workAuthorization) => updateProfile("profileExtras", { drivingLicences: [], references: [], ...cv.profileExtras, workAuthorization: workAuthorization || undefined })} />
                  <FieldWithHint label="Driving licences (comma-separated)" value={(cv.profileExtras?.drivingLicences ?? []).join(", ")} onChange={(value) => updateProfile("profileExtras", { references: [], ...cv.profileExtras, drivingLicences: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
                </div>
                <div className="cv-field mt-3">
                  <label className="cv-field__label">References — one per line: Name | Role | Organization | Email | Phone</label>
                  <textarea
                    className="cv-field__input cv-field__textarea"
                    rows={3}
                    value={(cv.profileExtras?.references ?? []).map((reference) => [reference.name, reference.role, reference.organization, reference.email ?? "", reference.phone ?? ""].join(" | ")).join("\n")}
                    onChange={(event) => updateProfile("profileExtras", {
                      drivingLicences: [], ...cv.profileExtras,
                      references: event.target.value.split("\n").filter((line) => line.trim()).map((line, index) => {
                        const [name = "", role = "", organization = "", email = "", phone = ""] = line.split("|").map((part) => part.trim())
                        return { id: cv.profileExtras?.references[index]?.id ?? uid(), name, role, organization, email: email || undefined, phone: phone || undefined }
                      }),
                    })}
                  />
                </div>
              </EditorCard>

              {/* ─── Section Layout Organizer ─── */}
              <EditorCard sectionId="layout" title="Arrange sections" icon={<GripVertical className="w-4 h-4" />}>
                <SectionLayoutOrganizer
                  sections={cv.sections}
                  onMove={moveSection}
                  onSwap={swapSection}
                  onToggleVisibility={toggleSectionVisibility}
                  onDelete={deleteSection}
                  onAdd={addSection}
                  onAddHobbies={cv.sections.some((section) => section.id === HOBBIES_SECTION_ID) ? undefined : addHobbies}
                />
              </EditorCard>

              {/* ─── Section editors ─── */}
              {cv.sections.map((section) => (
                <EditorCard
                  key={section.id}
                  sectionId={`section-${section.id}`}
                  title={section.title}
                  badge={SECTION_TYPE_LABELS[section.type]}
                  titleEditable
                  onTitleChange={(t) => renameSection(section.id, t)}
                  muted={!section.visible}
                >
                  {!section.visible && <p className="cv-hidden-note"><EyeOff className="w-4 h-4" /> Hidden from your CV. Show this section in Arrange sections.</p>}
                  <SectionDataEditor
                    section={section}
                    onChange={(data) => updateSectionById(section.id, (s) => ({ ...s, data }))}
                    onRequestCanonicalAdd={
                      ["experience", "education", "projects"].includes(section.id)
                        ? () => setPendingEntity({
                            sectionId: section.id as "experience" | "education" | "projects",
                            entry: {
                              id: uid(),
                              title: "",
                              subtitle: "",
                              dateStart: "",
                              dateEnd: "",
                              description: "",
                              tags: [],
                            },
                            presetIds: [activePreset.id],
                            showcase: false,
                          })
                        : undefined
                    }
                  />
                </EditorCard>
              ))}
            </main>
          </div>

          {/* ── Live preview ── */}
          <aside className="cv-editor-split__preview">
            <CvQualityReview preset={activePreset} />
            <div className="cv-editor-preview-header">
              <span className="cv-editor-preview-header__title">Proof</span>
              <div className="cv-editor-preview-header__controls">
                <CvPrintButton className="cv-btn cv-btn--sm" />
                <button type="button" className="cv-editor-preview-zoom-btn" aria-label="Zoom out"
                  onClick={() => setPreviewZoom((z) => Math.max(0.2, z - 0.1))}>−</button>
                <span className="cv-editor-preview-zoom-label">{Math.round(previewZoom * 100)}%</span>
                <button type="button" className="cv-editor-preview-zoom-btn" aria-label="Zoom in"
                  onClick={() => setPreviewZoom((z) => Math.min(1, z + 0.1))}>+</button>
                <span className="cv-editor-preview-header__layout">{CV_TEMPLATE_BY_ID[activePreset.layout].shortLabel} · {CV_TEMPLATE_BY_ID[activePreset.layout].pageGuidance}</span>
              </div>
            </div>
            <div className="cv-editor-preview-scaler" ref={proofScalerRef}>
              {previewData && (
                <CvScaleToFit maxScale={previewZoom} page={activePreset.design.page} proof>
                  <CvDocumentOutput layout={activePreset.layout} data={previewData} profilePicture={profilePicture} />
                </CvScaleToFit>
              )}
              <div className="cv-proof-mark" aria-hidden="true" hidden={!proofMark}
                style={proofMark ? { top: proofMark.top, left: proofMark.left, height: proofMark.height } : undefined}>
                <span>{editorDestinations[activeEditorIndex]?.label}</span>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <main className="cv-editor-main">
          <div className="cv-editor-empty">
            <p>No presets yet.</p>
            <button type="button" className="cv-btn" onClick={createPreset}>
              <Plus className="w-4 h-4" /> Create First Preset
            </button>
          </div>
        </main>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════ */

/* ── Proof mark target: the passage of the live page an editor section writes ── */
function findProofTarget(scaler: HTMLElement, sectionKey: string): HTMLElement | null {
  const page = scaler.querySelector<HTMLElement>(".cv-document--visual")
  if (!page) return null
  if (sectionKey === "profile") return page.querySelector<HTMLElement>(".region-header")
  if (!sectionKey.startsWith("section-")) return null
  const id = CSS.escape(sectionKey.slice("section-".length))
  const byClass = page.querySelector<HTMLElement>(`.region-section--${id}`)
  if (byClass) return byClass
  const heading = page.querySelector<HTMLElement>(`#cv-${id}`)
  if (heading) return heading.closest<HTMLElement>(".region-section") ?? heading
  const title = document.querySelector<HTMLInputElement>(`#cv-editor-${CSS.escape(sectionKey)} .cv-editor-card__title-input`)?.value.trim()
  if (!title) return null
  const match = Array.from(page.querySelectorAll<HTMLElement>(".region-section > h2")).find((h2) => h2.textContent?.trim() === title)
  return match?.closest<HTMLElement>(".region-section") ?? null
}

/* ── EditorCard ── */
function EditorCard({
  sectionId, title, icon, badge, children, titleEditable, onTitleChange, muted,
}: {
  sectionId: string
  title: string
  icon?: React.ReactNode
  badge?: string
  children: React.ReactNode
  titleEditable?: boolean
  onTitleChange?: (v: string) => void
  muted?: boolean
}) {
  const [open, setOpen] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  const bodyId = useId()
  useEffect(() => {
    const card = cardRef.current
    const reveal = () => setOpen(true)
    card?.addEventListener("cv-open-section", reveal)
    return () => card?.removeEventListener("cv-open-section", reveal)
  }, [])
  return (
    <section ref={cardRef} id={`cv-editor-${sectionId}`} data-cv-editor-anchor={sectionId}
      className={`cv-editor-card ${muted ? "cv-editor-card--muted" : ""}`}>
      <div className="cv-editor-card__header">
        <div className="cv-editor-card__identity">
          {icon}
          {titleEditable ? (
            <input className="cv-editor-card__title-input" aria-label="Section title" value={title}
              onChange={(e) => onTitleChange?.(e.target.value)} />
          ) : <h2 className="cv-editor-card__title">{title}</h2>}
          {badge && <span className="cv-editor-card__badge">{badge}</span>}
        </div>
        <button type="button" className="cv-card-collapse" aria-expanded={open} aria-controls={bodyId}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`} onClick={() => setOpen(!open)}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      <div id={bodyId} hidden={!open} className="cv-editor-card__body">{children}</div>
    </section>
  )
}

/* ── FieldWithHint ── */

function FieldWithHint({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const fieldId = useId()
  return (
    <div className="cv-field">
      <label htmlFor={fieldId} className="cv-field__label">{label}</label>
      <input id={fieldId}
        className="cv-field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

/* ── TextAreaWithHint ── */
function TextAreaWithHint({
  label, value, onChange, rows = 3, ai = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  ai?: boolean
}) {
  const fieldId = useId()
  return (
    <div className="cv-field">
      <div className="cv-field__label-row">
        <label htmlFor={fieldId} className="cv-field__label">{label}</label>
        {ai && value.trim().length > 0 && (
          <AiTextAssistant text={value} onResult={onChange} />
        )}
      </div>
      <textarea id={fieldId}
        className="cv-field__input cv-field__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
    </div>
  )
}

/* ── AI text assistant ── */
function AiTextAssistant({ text, onResult }: { text: string; onResult: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const run = async (action: string, prompt?: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, customPrompt: prompt }),
      })
      const data = await res.json()
      if (data.text) onResult(data.text)
      else if (data.error) console.error("AI error:", data.error)
    } catch (e) {
      console.error("AI request failed", e)
    } finally {
      setLoading(false)
      setOpen(false)
      setCustomOpen(false)
      setCustomPrompt("")
    }
  }

  return (
    <div className="ai-assist" ref={menuRef}>
      <button
        type="button"
        className={`ai-assist__trigger ${loading ? "ai-assist__trigger--loading" : ""}`}
        onClick={() => { if (!loading) setOpen(!open) }}
        title="AI Assistant"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        <span>AI</span>
      </button>
      {open && !loading && (
        <div className="ai-assist__menu">
          <button type="button" className="ai-assist__item" onClick={() => run("summarize")}>
            Summarize
          </button>
          <button type="button" className="ai-assist__item" onClick={() => run("formalize")}>
            Formalize
          </button>
          <button type="button" className="ai-assist__item" onClick={() => run("shorten")}>
            Shorten
          </button>
          <button type="button" className="ai-assist__item" onClick={() => run("expand")}>
            Expand
          </button>
          <div className="ai-assist__divider" />
          {!customOpen ? (
            <button type="button" className="ai-assist__item" onClick={() => setCustomOpen(true)}>
              Custom…
            </button>
          ) : (
            <div className="ai-assist__custom">
              <input
                className="ai-assist__custom-input"
                placeholder="Your instruction…"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && customPrompt.trim()) run("custom", customPrompt.trim()) }}
                autoFocus
              />
              <button type="button" className="ai-assist__custom-go"
                disabled={!customPrompt.trim()}
                onClick={() => customPrompt.trim() && run("custom", customPrompt.trim())}>
                Go
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   Section Layout Organizer (drag & drop)
   ═══════════════════════════════════════ */
function SectionLayoutOrganizer({
  sections,
  onMove,
  onSwap,
  onToggleVisibility,
  onDelete,
  onAdd,
  onAddHobbies,
}: {
  sections: CvSection[]
  onMove: (id: string, placement: "sidebar" | "main", zoneIndex: number) => void
  onSwap: (id: string, dir: -1 | 1) => void
  onToggleVisibility: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (type: CvSectionType, placement: "sidebar" | "main") => void
  /** Present only while the CV has no Hobbies section yet. */
  onAddHobbies?: (placement: "sidebar" | "main") => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ zone: "sidebar" | "main"; index: number } | null>(null)
  const [addMenuPlacement, setAddMenuPlacement] = useState<"sidebar" | "main" | null>(null)

  const sidebarSections = sections.filter((s) => s.placement === "sidebar")
  const mainSections = sections.filter((s) => s.placement === "main")

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragEnd = () => { setDragId(null); setDropTarget(null) }

  /** Determine drop index from mouse position relative to chip elements */
  const handleChipDragOver = (e: React.DragEvent, zone: "sidebar" | "main", idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const insertIdx = e.clientY < midY ? idx : idx + 1
    setDropTarget({ zone, index: insertIdx })
  }

  const handleZoneDragOver = (e: React.DragEvent, zone: "sidebar" | "main", count: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    // Only set dropTarget to end if we're not already over a chip
    if (!dropTarget || dropTarget.zone !== zone) {
      setDropTarget({ zone, index: count })
    }
  }

  const handleDrop = (e: React.DragEvent, zone: "sidebar" | "main", fallbackIndex: number) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (!id) return
    const idx = dropTarget && dropTarget.zone === zone ? dropTarget.index : fallbackIndex
    onMove(id, zone, idx)
    setDragId(null)
    setDropTarget(null)
  }

  const renderZone = (label: string, placement: "sidebar" | "main", items: CvSection[]) => {
    const isOver = dropTarget?.zone === placement
    return (
      <div
        className={`section-zone ${isOver ? "section-zone--drag-over" : ""}`}
        onDragOver={(e) => handleZoneDragOver(e, placement, items.length)}
        onDragLeave={(e) => {
          // Only clear if leaving the zone itself
          if (e.currentTarget === e.target) setDropTarget(null)
        }}
        onDrop={(e) => handleDrop(e, placement, items.length)}
      >
        <div className="section-zone__label">{label}</div>
        <div className="section-zone__chips">
          {items.map((s, i) => (
            <div key={s.id} style={{ position: "relative" }}>
              {/* Drop indicator above this chip */}
              {isOver && dropTarget.index === i && dragId !== s.id && (
                <div className="section-drop-indicator" />
              )}
              <div
                className={`section-chip ${dragId === s.id ? "section-chip--dragging" : ""} ${!s.visible ? "section-chip--hidden" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, s.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleChipDragOver(e, placement, i)}
              >
                <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0 cursor-grab" />
                <span className="section-chip__title">{s.title}</span>
                <select className="section-chip__placement" aria-label={`Placement for ${s.title}`} value={placement}
                  onChange={(event) => onMove(s.id, event.target.value as "sidebar" | "main", sections.filter((section) => section.placement === event.target.value).length)}>
                  <option value="sidebar">Sidebar</option><option value="main">Main</option>
                </select>
                <div className="section-chip__actions">
                  {i > 0 && (
                    <button type="button" className="section-chip__btn" onClick={() => onSwap(s.id, -1)} title="Move up">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                  {i < items.length - 1 && (
                    <button type="button" className="section-chip__btn" onClick={() => onSwap(s.id, 1)} title="Move down">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  <button type="button" className="section-chip__btn" onClick={() => onToggleVisibility(s.id)}
                    title={s.visible ? "Hide" : "Show"}>
                    {s.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button type="button" className="section-chip__btn section-chip__btn--danger"
                    onClick={() => onDelete(s.id)} title="Delete">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {/* Drop indicator at end */}
          {isOver && dropTarget.index === items.length && (
            <div className="section-drop-indicator" />
          )}
          {items.length === 0 && !isOver && (
            <div className="section-zone__empty">Drop sections here</div>
          )}
        </div>
        <button
          type="button"
          className="section-zone__add"
          onClick={() => setAddMenuPlacement(addMenuPlacement === placement ? null : placement)}
        >
          <Plus className="w-3 h-3" /> Add Section
        </button>
        {addMenuPlacement === placement && (
          <div className="section-zone__menu">
            {onAddHobbies && (
              <button type="button" className="section-zone__menu-item"
                onClick={() => { onAddHobbies(placement); setAddMenuPlacement(null) }}>
                Hobbies
              </button>
            )}
            {(["log", "tags", "text", "links", "simple-list"] as CvSectionType[]).map((t) => (
              <button key={t} type="button" className="section-zone__menu-item"
                onClick={() => { onAdd(t, placement); setAddMenuPlacement(null) }}>
                {SECTION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="section-organizer">
      {renderZone("Sidebar", "sidebar", sidebarSections)}
      {renderZone("Main Content", "main", mainSections)}
    </div>
  )
}

/* ═══════════════════════════════════════
   Section Data Editors (per type)
   ═══════════════════════════════════════ */
function SectionDataEditor({ section, onChange, onRequestCanonicalAdd }: {
  section: CvSection
  onChange: (d: CvSectionData) => void
  onRequestCanonicalAdd?: () => void
}) {
  const d = section.data
  switch (d.type) {
    case "log":
      return <LogSectionEditor entries={d.entries} onChange={(entries) => onChange({ type: "log", entries })} onRequestAdd={onRequestCanonicalAdd} />
    case "tags":
      return <TagsSectionEditor groups={d.groups} onChange={(groups) => onChange({ type: "tags", groups })} />
    case "text":
      return <TextSectionEditor
        content={d.content}
        onChange={(content) => onChange({ type: "text", content })}
        hint={section.id === HOBBIES_SECTION_ID ? "A short paragraph, usually 2–3 lines: what you do outside work and what it says about you." : undefined}
      />
    case "links":
      return <LinksSectionEditor items={d.items} onChange={(items) => onChange({ type: "links", items })} />
    case "simple-list":
      return <SimpleListSectionEditor items={d.items} onChange={(items) => onChange({ type: "simple-list", items })} />
  }
}

/* ══════════════════════════════════════
   Portfolio Importer
   ══════════════════════════════════════ */

function parseYearRange(year: string): { dateStart: string; dateEnd: string } {
  const parts = year.split(/\s*[-–]\s*/)
  return { dateStart: parts[0]?.trim() ?? year, dateEnd: parts[1]?.trim() ?? "" }
}

function experienceToEntry(e: ExperienceEntry): CvLogEntry {
  const { dateStart, dateEnd } = parseYearRange(e.year)
  return { id: uid(), title: e.title, subtitle: e.company, dateStart, dateEnd, description: e.cvDescription || e.description, tags: [...e.tags] }
}

function educationToEntry(e: EducationEntry): CvLogEntry {
  const { dateStart, dateEnd } = parseYearRange(e.year)
  return { id: uid(), title: e.degree, subtitle: e.institution, dateStart, dateEnd, description: e.cvDescription || e.description, tags: [...e.tags] }
}

function projectToEntry(p: Project, categoryName?: string): CvLogEntry {
  return {
    id: uid(),
    title: p.title,
    subtitle: categoryName ?? "",
    dateStart: "",
    dateEnd: "",
    description: p.cvDescription || p.description,
    tags: [],
    url: p.projectUrl || p.githubUrl || undefined,
  }
}

type ImportTab = "experiences" | "education" | "projects"

function PortfolioImporter({ portfolio, onImport }: { portfolio: PortfolioContent; onImport: (e: CvLogEntry) => void }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ImportTab>("experiences")
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())

  const handleImport = (entry: CvLogEntry, key: string) => {
    onImport(entry)
    setJustAdded((prev) => new Set([...prev, key]))
    setTimeout(() => setJustAdded((prev) => { const next = new Set(prev); next.delete(key); return next }), 1500)
  }

  const allProjects = (portfolio.projectCategories ?? []).flatMap((cat) =>
    cat.projects.map((p) => ({ p, catName: cat.name })),
  )

  return (
    <div className="portfolio-importer">
      <button
        type="button"
        className={`portfolio-importer__toggle ${open ? "portfolio-importer__toggle--open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <Download className="w-3 h-3" />
        Import from Portfolio
        {open ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {open && (
        <div className="portfolio-importer__panel">
          {/* Tabs */}
          <div className="portfolio-importer__tabs">
            {(["experiences", "education", "projects"] as ImportTab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`portfolio-importer__tab ${tab === t ? "portfolio-importer__tab--active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "experiences" ? "Experiences" : t === "education" ? "Education" : "Projects"}
                <span className="portfolio-importer__tab-count">
                  {t === "experiences" ? (portfolio.experienceLog ?? []).length
                    : t === "education" ? (portfolio.educationLog ?? []).length
                    : allProjects.length}
                </span>
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="portfolio-importer__items">
            {tab === "experiences" && (portfolio.experienceLog ?? []).map((exp, i) => {
              const key = `exp-${i}`
              return (
                <div key={key} className="portfolio-importer__item">
                  <div className="portfolio-importer__item-info">
                    <span className="portfolio-importer__item-title">{exp.title}</span>
                    <span className="portfolio-importer__item-sub">{exp.company} — {exp.year}</span>
                  </div>
                  <button type="button"
                    className={`portfolio-importer__add ${justAdded.has(key) ? "portfolio-importer__add--done" : ""}`}
                    onClick={() => handleImport(experienceToEntry(exp), key)}>
                    {justAdded.has(key) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              )
            })}

            {tab === "education" && (portfolio.educationLog ?? []).map((edu, i) => {
              const key = `edu-${i}`
              return (
                <div key={key} className="portfolio-importer__item">
                  <div className="portfolio-importer__item-info">
                    <span className="portfolio-importer__item-title">{edu.degree}</span>
                    <span className="portfolio-importer__item-sub">{edu.institution} — {edu.year}</span>
                  </div>
                  <button type="button"
                    className={`portfolio-importer__add ${justAdded.has(key) ? "portfolio-importer__add--done" : ""}`}
                    onClick={() => handleImport(educationToEntry(edu), key)}>
                    {justAdded.has(key) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              )
            })}

            {tab === "projects" && allProjects.map(({ p, catName }, i) => {
              const key = `proj-${i}`
              return (
                <div key={key} className="portfolio-importer__item">
                  <div className="portfolio-importer__item-info">
                    <span className="portfolio-importer__item-title">{p.title}</span>
                    <span className="portfolio-importer__item-sub">{catName}{p.status ? ` — ${p.status}` : ""}</span>
                  </div>
                  <button type="button"
                    className={`portfolio-importer__add ${justAdded.has(key) ? "portfolio-importer__add--done" : ""}`}
                    onClick={() => handleImport(projectToEntry(p, catName), key)}>
                    {justAdded.has(key) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              )
            })}

            {tab === "experiences" && (portfolio.experienceLog ?? []).length === 0 && (
              <p className="portfolio-importer__empty">No experience entries in portfolio.</p>
            )}
            {tab === "education" && (portfolio.educationLog ?? []).length === 0 && (
              <p className="portfolio-importer__empty">No education entries in portfolio.</p>
            )}
            {tab === "projects" && allProjects.length === 0 && (
              <p className="portfolio-importer__empty">No projects in portfolio.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Log (timeline) editor ── */
function LogSectionEditor({
  entries, onChange, portfolio, onRequestAdd,
}: {
  entries: CvLogEntry[]
  onChange: (e: CvLogEntry[]) => void
  portfolio?: PortfolioContent | null
  onRequestAdd?: () => void
}) {
  const update = (idx: number, patch: Partial<CvLogEntry>) =>
    onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)))

  const add = () =>
    onChange([...entries, { id: uid(), title: "", subtitle: "", dateStart: "", dateEnd: "", description: "", tags: [] }])

  const remove = (idx: number) => onChange(entries.filter((_, i) => i !== idx))

  const appendEntry = (entry: CvLogEntry) => onChange([...entries, entry])

  const move = (from: number, to: number) => onChange(arrayMove(entries, from, to))
  const sort = useDragSort(move)

  return (
    <div className="cv-section-editor">
      {/* Portfolio import helper */}
      {portfolio && (
        <PortfolioImporter portfolio={portfolio} onImport={appendEntry} />
      )}

      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className={`cv-entry-card${sort.dragIndex === i ? " cv-entry-card--dragging" : ""}`}
          data-drop={sort.dropSlot === i ? "before" : sort.dropSlot === i + 1 && i === entries.length - 1 ? "after" : undefined}
          {...sort.itemProps(i)}
        >
          <div className="cv-entry-card__header">
            <span
              className="cv-entry-card__grip"
              title="Drag to reorder"
              aria-hidden="true"
              {...sort.handleProps(i)}
            >
              <GripVertical className="w-4 h-4" />
            </span>
            <span className="cv-entry-card__num">#{i + 1}{entry.title.trim() ? ` · ${entry.title.trim()}` : ""}</span>
            <span className="cv-entry-card__actions">
              <button type="button" className="cv-btn cv-btn--sm" title="Move up" aria-label={`Move entry ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ChevronUp className="w-3 h-3" />
              </button>
              <button type="button" className="cv-btn cv-btn--sm" title="Move down" aria-label={`Move entry ${i + 1} down`} disabled={i === entries.length - 1} onClick={() => move(i, i + 1)}>
                <ChevronDown className="w-3 h-3" />
              </button>
              <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" title="Delete entry" aria-label={`Delete entry ${i + 1}`} onClick={() => remove(i)}>
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FieldWithHint label="Title" value={entry.title} onChange={(v) => update(i, { title: v })} />
            <FieldWithHint label="Subtitle" value={entry.subtitle} onChange={(v) => update(i, { subtitle: v })} placeholder="e.g. Company, Institution" />
            <FieldWithHint label="Start Date" value={entry.dateStart} onChange={(v) => update(i, { dateStart: v })} placeholder="YYYY-MM, e.g. 2024-09" />
            <FieldWithHint label="End Date" value={entry.dateEnd} onChange={(v) => update(i, { dateEnd: v })} placeholder="YYYY-MM or Present" />
            <FieldWithHint label="URL" value={entry.url || ""} onChange={(v) => update(i, { url: v || undefined })} placeholder="Optional link" />
          </div>
          <EntryDescriptionEditor value={entry.description} onChange={(description) => update(i, { description })} />
          <InlineTagsEditor label="Technologies — printed as comma-separated text" items={entry.tags} onChange={(tags) => update(i, { tags })} />
        </div>
      ))}
      <button type="button" className="cv-btn cv-btn--sm" onClick={onRequestAdd ?? add}>
        <Plus className="w-3 h-3" /> Add Entry
      </button>
    </div>
  )
}

/* ── Entry description: one text, or titled parts ── */
function EntryDescriptionEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [mode, setMode] = useState<"text" | "parts">(() => hasDescriptionParts(value) ? "parts" : "text")
  const [parts, setParts] = useState<CvDescriptionPart[]>(() => parseDescriptionParts(value))
  // The serialized form drops empty parts and trailing newlines, so keep the
  // local parts while they still produce the current value.
  const lastWritten = useRef(value)
  useEffect(() => {
    if (value === lastWritten.current) return
    lastWritten.current = value
    setParts(parseDescriptionParts(value))
  }, [value])

  const writeParts = (next: CvDescriptionPart[]) => {
    setParts(next)
    const serialized = serializeDescriptionParts(next)
    lastWritten.current = serialized
    if (serialized !== value) onChange(serialized)
  }
  const updatePart = (index: number, patch: Partial<CvDescriptionPart>) =>
    writeParts(parts.map((part, i) => (i === index ? { ...part, ...patch } : part)))

  const switchMode = (next: "text" | "parts") => {
    if (next === mode) return
    if (next === "parts") {
      const current = parseDescriptionParts(value)
      setParts(current.length > 0 ? current : [{ title: "", text: "" }])
    }
    setMode(next)
  }

  const words = value.replace(/\*\*/g, "").trim() ? value.replace(/\*\*/g, "").trim().split(/\s+/).length : 0

  return (
    <div className="cv-description">
      <div className="cv-field__label-row">
        <span className="cv-field__label">Description</span>
        <div className="cv-description__modes" role="group" aria-label="Description format">
          <button type="button" aria-pressed={mode === "text"} onClick={() => switchMode("text")}>Text</button>
          <button type="button" aria-pressed={mode === "parts"} onClick={() => switchMode("parts")}>Titled parts</button>
        </div>
      </div>
      {mode === "text" ? (
        <TextAreaWithHint label="Description text" value={value} onChange={onChange} rows={4} ai />
      ) : (
        <ol className="cv-description__parts">
          {parts.map((part, index) => (
            <li key={index} className="cv-description__part">
              <div className="cv-description__part-head">
                <input
                  className="cv-field__input cv-description__part-title"
                  value={part.title}
                  onChange={(event) => updatePart(index, { title: event.target.value })}
                  placeholder="Bold lead-in, e.g. Research:"
                  aria-label={`Part ${index + 1} title`}
                />
                <span className="cv-entry-card__actions">
                  <button type="button" className="cv-btn cv-btn--sm" title="Move part up" aria-label={`Move part ${index + 1} up`} disabled={index === 0} onClick={() => writeParts(arrayMove(parts, index, index - 1))}>
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button type="button" className="cv-btn cv-btn--sm" title="Move part down" aria-label={`Move part ${index + 1} down`} disabled={index === parts.length - 1} onClick={() => writeParts(arrayMove(parts, index, index + 1))}>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" title="Remove part" aria-label={`Remove part ${index + 1}`} onClick={() => writeParts(parts.filter((_, i) => i !== index))}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              </div>
              <textarea
                className="cv-field__input cv-field__textarea"
                value={part.text}
                onChange={(event) => updatePart(index, { text: event.target.value })}
                rows={3}
                placeholder="What you did and the result"
                aria-label={`Part ${index + 1} text`}
              />
            </li>
          ))}
          <li>
            <button type="button" className="cv-btn cv-btn--sm" onClick={() => setParts([...parts, { title: "", text: "" }])}>
              <Plus className="w-3 h-3" /> Add part
            </button>
          </li>
        </ol>
      )}
      <p className="cv-writing-hint">
        {words} words · {descriptionBulletCount(value)} bullets.{" "}
        {mode === "text"
          ? <>Plain text stays a paragraph. Start a line with “- ” for a bullet; use a blank line between paragraphs. Start a paragraph with **Title** for a bold lead-in.</>
          : <>Each part prints as one paragraph with its title in bold. Leave the title empty for a plain paragraph; lines starting with “- ” become bullets.</>}
      </p>
    </div>
  )
}

/* ── Tags/groups editor ── */
function TagsSectionEditor({
  groups, onChange,
}: {
  groups: CvTagGroup[]
  onChange: (g: CvTagGroup[]) => void
}) {
  const update = (idx: number, patch: Partial<CvTagGroup>) =>
    onChange(groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)))

  const add = () => onChange([...groups, { category: "", items: [] }])
  const remove = (idx: number) => onChange(groups.filter((_, i) => i !== idx))

  return (
    <div className="cv-section-editor">
      {groups.map((group, i) => (
        <div key={i} className="cv-entry-card">
          <div className="cv-entry-card__header">
            <FieldWithHint label="Category" value={group.category} onChange={(v) => update(i, { category: v })} />
            <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" onClick={() => remove(i)}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <InlineTagsEditor label="Items" items={group.items} onChange={(items) => update(i, { items })} />
        </div>
      ))}
      <button type="button" className="cv-btn cv-btn--sm" onClick={add}>
        <Plus className="w-3 h-3" /> Add Group
      </button>
    </div>
  )
}

/* ── Text editor ── */
function TextSectionEditor({ content, onChange, hint }: { content: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <>
      <TextAreaWithHint label="Content" value={content} onChange={onChange} rows={hint ? 3 : 4} ai />
      {hint && <p className="cv-writing-hint">{hint}</p>}
    </>
  )
}

/* ── Links editor ── */
function LinksSectionEditor({
  items, onChange,
}: {
  items: CvLinkItem[]
  onChange: (items: CvLinkItem[]) => void
}) {
  const update = (idx: number, patch: Partial<CvLinkItem>) =>
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)))

  const add = () => onChange([...items, { label: "", url: "" }])
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="cv-section-editor">
      {items.map((item, i) => (
        <div key={i} className="cv-entry-row">
          <input className="cv-field__input" value={item.label} placeholder="Label"
            onChange={(e) => update(i, { label: e.target.value })} />
          <input className="cv-field__input" value={item.url} placeholder="URL"
            onChange={(e) => update(i, { url: e.target.value })} />
          <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" onClick={() => remove(i)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button type="button" className="cv-btn cv-btn--sm" onClick={add}>
        <Plus className="w-3 h-3" /> Add Link
      </button>
    </div>
  )
}

/* ── Simple list editor ── */
function SimpleListSectionEditor({
  items, onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...items, v])
    setDraft("")
  }

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="cv-section-editor">
      <div className="cv-list-items">
        {items.map((item, i) => (
          <div key={i} className="cv-list-item">
            <input className="cv-field__input" value={item}
              onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))} />
            <button type="button" className="cv-btn cv-btn--sm cv-btn--danger" onClick={() => remove(i)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="cv-entry-row">
        <input className="cv-field__input" value={draft} placeholder="Add item…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
        <button type="button" className="cv-btn cv-btn--sm" onClick={add}>
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

/* ── Inline tags editor (for within log entries) ── */
function InlineTagsEditor({
  label, items, onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const v = draft.trim()
    if (!v || items.includes(v)) return
    onChange([...items, v])
    setDraft("")
  }

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))
  const update = (idx: number, value: string) =>
    onChange(items.map((item, i) => (i === idx ? value : item)))

  return (
    <div className="cv-field">
      <label className="cv-field__label">{label}</label>
      <div className="cv-tags-wrap">
        {items.map((tag, i) => (
          <span key={i} className="cv-tag">
            <input
              className="cv-tag__input"
              value={tag}
              style={{ width: `${Math.max(5, Math.min(tag.length + 1, 24))}ch` }}
              aria-label={`${label} tag ${i + 1}`}
              onChange={(event) => update(i, event.target.value)}
            />
            <button
              type="button"
              className="cv-tag__remove"
              aria-label={`Remove ${tag || `tag ${i + 1}`}`}
              onClick={() => remove(i)}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          className="cv-tags-input"
          value={draft}
          placeholder="Add tag…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add() }
            if (e.key === "Backspace" && !draft && items.length > 0) remove(items.length - 1)
          }}
        />
        <button
          type="button"
          className="cv-tags-add"
          aria-label={`Add ${label.toLowerCase()} tag`}
          disabled={!draft.trim() || items.includes(draft.trim())}
          onClick={add}
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════════════ */

