import "dotenv/config"

import { MongoClient, type Document } from "mongodb"

import {
  CONTENT_HUB_COLLECTION,
  CONTENT_HUB_ID,
  applyEditorOperations,
  contentHubDocumentSchema,
  materializeCvPresets,
  validateHubReferences,
  type ContentHubDocument,
} from "../lib/content-hub"
import { hydrateStoredContentHub } from "../lib/content-hub-storage"
import type { CvLogEntry, CvSection, CvSectionData } from "../lib/cv-content"
import { cvPresetSchema, type CvPreset } from "../lib/cv-presets"

const SOURCE_PRESET_ID = "1772411940727-zo8azuk"
const TARGET_PRESET_ID = "cv-fullstack-genai-en"

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

type SectionWithData<T extends CvSectionData["type"]> = CvSection & {
  data: Extract<CvSectionData, { type: T }>
}

function section<T extends CvSectionData["type"]>(
  preset: CvPreset,
  id: string,
  type: T,
): SectionWithData<T> {
  const result = preset.content.sections.find((item) => item.id === id)
  if (!result || result.data.type !== type) {
    throw new Error(`Missing ${type} section: ${id}`)
  }
  return result as SectionWithData<T>
}

const logEntry = (input: CvLogEntry): CvLogEntry => input

function buildFullStackGenAiCv(source: CvPreset): CvPreset {
  const preset = clone(source)

  Object.assign(preset, {
    id: TARGET_PRESET_ID,
    name: "Full Stack and GenAI EN",
    layout: "british_irish",
    targetCountry: "United Kingdom",
    documentLanguage: "en",
    visible: true,
  } satisfies Partial<CvPreset>)

  preset.regionalOptions = {
    showPhoto: false,
    personalFields: [],
    showSignature: false,
    documentDate: "",
    customFooter: "",
  }
  preset.design = {
    ...preset.design,
    page: "A4",
    marginMm: 16,
    columns: "single",
    fontFamily: "sans",
    baseFontPt: 10.5,
    lineHeight: 1.3,
    accent: "#183153",
    sectionGapMm: 4,
    entryGapMm: 3,
    appearance: "professional",
    datePlacement: "right",
    headingStyle: "divider",
    showTaxId: false,
    showLocation: true,
    locationLabel: "Cuneo, Italy",
    showProjectStatus: false,
    pageBreakBefore: [],
  }

  preset.content.title = "FULL STACK & GENERATIVE AI ENGINEER"
  preset.content.location = "Cuneo, Italy"
  if (preset.content.profileExtras) {
    preset.content.profileExtras.nationality = ""
    preset.content.profileExtras.references = []
    preset.content.profileExtras.drivingLicences = []
  }

  const profile = section(preset, "profile", "text")
  profile.title = "Profile"
  profile.placement = "main"
  profile.data.content =
    "Full-stack and generative AI engineer with a BSc in Computer Science and MSc studies in Artificial Intelligence Systems. I build end-to-end systems across React and Next.js frontends, TypeScript and Python services, databases, containerized delivery and machine-learning workflows. My research covers LLM evaluation, generative models for synthetic data, computer vision and audio reconstruction. I am strongest where software engineering and applied AI meet: turning experiments into usable services, evaluation platforms and reliable integrations."

  const skills = section(preset, "skills", "tags")
  skills.title = "Technical Skills"
  skills.placement = "main"
  skills.data.groups = [
    {
      category: "Full Stack",
      items: [
        "TypeScript",
        "JavaScript",
        "React",
        "Next.js",
        "Node.js",
        "Python",
        "FastAPI",
        "REST APIs",
      ],
    },
    {
      category: "Generative AI and ML",
      items: [
        "PyTorch",
        "LLMs",
        "Prompt Engineering",
        "LangChain",
        "Ollama",
        "Diffusion Models",
        "Flow Matching",
        "Computer Vision",
      ],
    },
    {
      category: "Data and Delivery",
      items: [
        "PostgreSQL",
        "MongoDB",
        "Docker",
        "AWS",
        "Git",
        "Model Evaluation",
        "Experiment Design",
      ],
    },
    {
      category: "Systems",
      items: ["Go", "C", "MQTT", "Zigbee", "IoT Integration"],
    },
  ]

  const experience = section(preset, "experience", "log")
  experience.title = "Experience"
  experience.placement = "main"
  experience.data.entries = [
    logEntry({
      id: "experience-16xo1vt",
      title: "RESEARCH INTERN — GENERATIVE AI & COMPUTER VISION",
      subtitle: "École de technologie supérieure (ÉTS) — Montréal, Canada",
      dateStart: "2026",
      dateEnd: "",
      description:
        "Researching synthetic infrared-image generation with diffusion models and flow matching. Training, fine-tuning and comparing generative models, evaluating output quality and investigating how synthetic data can support downstream computer-vision tasks on specialized real-world imagery.",
      tags: [
        "Python",
        "PyTorch",
        "Generative AI",
        "Diffusion Models",
        "Flow Matching",
        "Model Evaluation",
      ],
    }),
    logEntry({
      id: "1790106809352-oclg1op",
      title: "RESEARCH INTERN — LLM EVALUATION & FULL-STACK SYSTEMS",
      subtitle: "University of Turin",
      dateStart: "2024",
      dateEnd: "2024",
      description:
        "Researched system-prompting strategies for LLMs across coding, education, summarization and content creation. Designed and developed a full-stack evaluation platform with Next.js, React, LangChain, Ollama and local language models; organized expert comparisons and analyzed quantitative and qualitative feedback.",
      tags: [
        "Next.js",
        "React",
        "LangChain",
        "Ollama",
        "LLMs",
        "Prompt Engineering",
      ],
    }),
    logEntry({
      id: "experience-17l0h73",
      title: "FULL-STACK SOFTWARE & IOT CONSULTANT",
      subtitle: "S.H.D. Elettronica S.r.l.",
      dateStart: "2023",
      dateEnd: "2024",
      description:
        "Designed and developed web, software and connected-device solutions for operational use cases. Integrated MQTT, Zigbee, HTTP/REST services and embedded components for a port-focused IoT system, contributing across software design, implementation and system integration.",
      tags: [
        "Full-Stack Development",
        "REST APIs",
        "MQTT",
        "Zigbee",
        "IoT",
        "Firmware",
      ],
    }),
  ]

  const projects = section(preset, "projects", "log")
  projects.title = "Selected Full-Stack and Generative AI Projects"
  projects.placement = "main"
  projects.data.entries = [
    logEntry({
      id: "project-1yf7z5",
      title: "LLM PROMPT EVALUATION PLATFORM",
      subtitle: "Full Stack / Generative AI",
      dateStart: "COMPLETED",
      dateEnd: "",
      description:
        "Built a web platform for comparing system-prompt strategies across software engineering and other knowledge-work tasks. Integrated local OpenChat, Mistral and Llama 3 models, structured expert evaluations and analyzed both numerical results and written feedback to derive practical prompting guidelines.",
      tags: ["Next.js", "React", "LangChain", "Ollama", "Local LLMs"],
      url: "https://github.com/bassi-uni/tesi",
    }),
    logEntry({
      id: "project-dmtvda",
      title: "DIGITAL PHOTO AI",
      subtitle: "Full Stack / Computer Vision",
      dateStart: "BETA",
      dateEnd: "",
      description:
        "Developed a portrait-framing application that detects faces and produces document-photo crops under configurable pixel and physical-dimension constraints. Implemented a React client, FastAPI service, OpenCV image pipeline, YOLO-based face detection and downloadable image and metadata outputs.",
      tags: ["React", "FastAPI", "Python", "OpenCV", "YOLO", "REST API"],
      url: "https://github.com/bacobax/digital_photo_ai",
    }),
    logEntry({
      id: "project-1usyyss",
      title: "AUDIO GAP FILLING",
      subtitle: "Generative AI / Audio",
      dateStart: "ONGOING",
      dateEnd: "",
      description:
        "Building a configurable research framework for reconstructing missing audio regions from highly limited training data. Implemented reusable YAML-driven training pipelines, masked-autoencoder reconstruction over mel-spectrogram patches, VAE waveform compression and evaluation utilities, with latent-diffusion integration in progress.",
      tags: [
        "PyTorch",
        "Masked Autoencoders",
        "Vision Transformers",
        "VAE",
        "Diffusion Models",
      ],
      url: "https://github.com/bacobax/audio_overfit_impainting",
    }),
  ]

  const education = section(preset, "education", "log")
  education.title = "Education"
  education.placement = "main"
  education.data.entries = [
    logEntry({
      id: "education-1wwouvp",
      title: "MSc ARTIFICIAL INTELLIGENCE SYSTEMS",
      subtitle: "University of Trento",
      dateStart: "2024",
      dateEnd: "2026",
      description:
        "Advanced study of machine learning and AI engineering, with focus areas in generative models, computer vision, NLP and audio signal processing.",
      tags: ["AI Engineering", "Deep Learning", "Computer Vision", "NLP"],
    }),
    logEntry({
      id: "education-1q6jl3k",
      title: "BSc COMPUTER SCIENCE",
      subtitle: "University of Turin",
      dateStart: "2021",
      dateEnd: "2024",
      description:
        "Foundation in software engineering, algorithms, databases, operating systems and computer networks.",
      tags: ["Software Engineering", "Algorithms", "Databases", "Networks"],
    }),
  ]

  const languages = section(preset, "languages", "simple-list")
  languages.title = "Languages"
  languages.placement = "main"
  languages.data.items = [
    "Italian — Native",
    "English — B2, Cambridge certified",
  ]

  const certifications = section(preset, "certs", "simple-list")
  certifications.title = "Certifications"
  certifications.visible = false
  certifications.placement = "main"
  certifications.data.items = ["Cambridge English — B2"]

  preset.content.sections = [
    profile,
    skills,
    experience,
    education,
    projects,
    languages,
    certifications,
  ]

  return cvPresetSchema.parse(preset)
}

async function main() {
  const apply = process.argv.includes("--apply")
  const uri = process.env.MONGODB_ATLAS_URI
  if (!uri) throw new Error("MONGODB_ATLAS_URI is not set")

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB || undefined)
    const collection = db.collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
    const raw = await collection.findOne({ _id: CONTENT_HUB_ID })
    if (!raw) throw new Error("Content hub not found")

    const hub = contentHubDocumentSchema.parse(
      hydrateStoredContentHub(raw as Record<string, unknown>),
    ) as ContentHubDocument
    const source = materializeCvPresets(hub).find(
      (preset) => preset.id === SOURCE_PRESET_ID,
    )
    if (!source) throw new Error("Source CV not found")

    const variant = buildFullStackGenAiCv(source)
    let next = clone(hub)

    if (!next.presets.some((preset) => preset.id === variant.id)) {
      const sourceConfig = next.presets.find(
        (preset) => preset.id === SOURCE_PRESET_ID,
      )
      if (!sourceConfig) throw new Error("Draft source CV configuration not found")
      next.presets.push({
        ...clone(sourceConfig),
        id: variant.id,
        name: variant.name,
        layout: variant.layout,
        targetCountry: variant.targetCountry,
        documentLanguage: variant.documentLanguage,
        visible: true,
      })
    }

    const drafts = materializeCvPresets(next).filter(
      (preset) => preset.id !== variant.id,
    )
    next = applyEditorOperations(next, [
      {
        type: "replace-presets",
        presets: [...drafts, variant],
        activePresetId: variant.id,
      },
      { type: "publish-cv", presetId: variant.id },
    ])
    next.revision = hub.revision + 1
    next.updatedAt = new Date().toISOString()

    const referenceErrors = validateHubReferences(next)
    if (referenceErrors.length > 0) {
      throw new Error(`Invalid references: ${referenceErrors.join(", ")}`)
    }
    const validated = contentHubDocumentSchema.parse(next) as ContentHubDocument

    const report: Record<string, unknown> = {
      status: apply ? "applied" : "dry-run",
      source: { id: source.id, name: source.name },
      fromRevision: hub.revision,
      toRevision: validated.revision,
      cv: {
        id: variant.id,
        name: variant.name,
        role: variant.content.title,
        layout: variant.layout,
        locale: variant.documentLanguage,
        projects: projectsCount(variant),
      },
    }

    if (apply) {
      const backupId = `${CONTENT_HUB_ID}-before-fullstack-genai-cv-${Date.now()}`
      await db.collection<{ _id: string } & Document>("content_hub_backups").insertOne({
        ...raw,
        _id: backupId,
        backedUpAt: new Date().toISOString(),
        reason: "Before creating the Full Stack and GenAI English CV",
      })
      const result = await collection.replaceOne(
        { _id: CONTENT_HUB_ID, revision: hub.revision },
        validated as ContentHubDocument & Document,
        { ignoreUndefined: true },
      )
      if (result.modifiedCount !== 1) {
        throw new Error("Content hub changed during the update; no CV was written")
      }
      report.backupId = backupId
    }

    console.log(JSON.stringify(report, null, 2))
  } finally {
    await client.close()
  }
}

function projectsCount(preset: CvPreset) {
  const projects = preset.content.sections.find((item) => item.id === "projects")
  return projects?.data.type === "log" ? projects.data.entries.length : 0
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
