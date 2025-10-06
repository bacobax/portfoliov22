import { z } from "zod"

import { DEFAULT_THEME_COLORS, type ThemeMode } from "./theme"

export type ProjectStatus =
  | "PRODUCTION"
  | "BETA"
  | "DEVELOPMENT"
  | "ONGOING"
  | "TERMINED"

export interface Project {
  title: string
  description: string
  status: ProjectStatus
  metrics: Record<string, string>
  githubUrl?: string
  projectUrl?: string
  showInCv: boolean
}

export type ProjectVisual = "brain" | "sphere" | "engine"

export interface ProjectCategory {
  id: string
  name: string
  visual: ProjectVisual
  projects: Project[]
}

export interface ProfileData {
  name: string
  title: string
  bio: string
}

export interface AboutStats {
  projects: string
  commits: string
  experience: string
  efficiency: string
}

export interface SystemStatusEntry {
  id: string
  label: string
  value: number
}

export type SystemStatus = SystemStatusEntry[]

export interface ExperienceEntry {
  year: string
  title: string
  company: string
  description: string
  tags: string[]
}

export interface EducationEntry {
  year: string
  degree: string
  institution: string
  description: string
  tags: string[]
}

const defaultExperienceLog: ExperienceEntry[] = [
  {
    year: "2021 - PRESENT",
    title: "SENIOR_FULL_STACK_ENGINEER",
    company: "TechCorp Industries",
    description:
      "Leading development of cloud-native applications. Architected microservices handling 10M+ requests/day.",
    tags: ["React", "Node.js", "AWS", "Docker"],
  },
  {
    year: "2019 - 2021",
    title: "SOFTWARE_ENGINEER",
    company: "StartupXYZ",
    description:
      "Built scalable web applications from ground up. Reduced load times by 60% through optimization.",
    tags: ["Vue.js", "Python", "PostgreSQL"],
  },
  {
    year: "2018 - 2019",
    title: "JUNIOR_DEVELOPER",
    company: "Digital Solutions Inc",
    description:
      "Developed responsive web interfaces and RESTful APIs. Collaborated with cross-functional teams.",
    tags: ["JavaScript", "Express", "MongoDB"],
  },
]

const defaultEducationLog: EducationEntry[] = [
  {
    year: "2016 - 2018",
    degree: "M.S. SOFTWARE_ENGINEERING",
    institution: "Global Tech University",
    description:
      "Focused on distributed systems, cloud-native architectures, and advanced software design patterns.",
    tags: ["Distributed Systems", "Cloud Architecture", "Leadership"],
  },
  {
    year: "2012 - 2016",
    degree: "B.S. COMPUTER_SCIENCE",
    institution: "Innovation Institute of Technology",
    description:
      "Graduated with honors. Specialized in algorithms, data structures, and human-computer interaction.",
    tags: ["Algorithms", "HCI", "Dean's List"],
  },
]

export interface SkillsData {
  frontend: string[]
  backend: string[]
  devops: string[]
}

export type ThemeColor = { h: number; s: number; l: number }

export type ThemeColors = Record<ThemeMode, ThemeColor>

export interface PortfolioContent {
  profileData: ProfileData
  aboutStats: AboutStats
  systemStatus: SystemStatus
  lastDeployment: string
  experienceLog: ExperienceEntry[]
  educationLog: EducationEntry[]
  skillsData: SkillsData
  projectCategories: ProjectCategory[]
  themeColors: ThemeColors
}

const systemStatusEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number().int().min(0).max(100),
})

const legacySystemStatusSchema = z.object({
  frontend: z.number().int().min(0).max(100),
  backend: z.number().int().min(0).max(100),
  devops: z.number().int().min(0).max(100),
  database: z.number().int().min(0).max(100),
})

const defaultSystemStatus: SystemStatus = [
  { id: "frontend", label: "FRONTEND", value: 95 },
  { id: "backend", label: "BACKEND", value: 88 },
  { id: "devops", label: "DEVOPS", value: 82 },
  { id: "database", label: "DATABASE", value: 90 },
]

const systemStatusSchema: z.ZodEffects<z.ZodTypeAny, SystemStatus, unknown> = z
  .union([z.array(systemStatusEntrySchema).min(1), legacySystemStatusSchema, z.undefined()])
  .transform((status) => {
    if (!status) {
      return [...defaultSystemStatus]
    }

    if (Array.isArray(status)) {
      return status
    }

    return [
      { id: "frontend", label: "FRONTEND", value: status.frontend },
      { id: "backend", label: "BACKEND", value: status.backend },
      { id: "devops", label: "DEVOPS", value: status.devops },
      { id: "database", label: "DATABASE", value: status.database },
    ]
  })

const themeColorSchema = z.object({
  h: z.number(),
  s: z.number(),
  l: z.number(),
})

export const portfolioContentSchema = z.object({
  profileData: z.object({
    name: z.string(),
    title: z.string(),
    bio: z.string(),
  }),
  aboutStats: z.object({
    projects: z.string(),
    commits: z.string(),
    experience: z.string(),
    efficiency: z.string(),
  }),
  systemStatus: systemStatusSchema,
  experienceLog: z
    .array(
      z.object({
        year: z.string(),
        title: z.string(),
        company: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .default(defaultExperienceLog)
    .optional(),
  educationLog: z
    .array(
      z.object({
        year: z.string(),
        degree: z.string(),
        institution: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .default(defaultEducationLog)
    .optional(),
  skillsData: z.object({
    frontend: z.array(z.string()),
    backend: z.array(z.string()),
    devops: z.array(z.string()),
  }),
  projectCategories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        visual: z.union([z.literal("brain"), z.literal("sphere"), z.literal("engine")]),
        projects: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            status: z.union([
              z.literal("PRODUCTION"),
              z.literal("BETA"),
              z.literal("DEVELOPMENT"),
              z.literal("ONGOING"),
              z.literal("TERMINED"),
            ]),
            metrics: z.record(z.string()),
            githubUrl: z.string().url().optional(),
            projectUrl: z.string().url().optional(),
            showInCv: z.boolean().default(true),
          }),
        ),
      }),
    )
    .min(1),
  lastDeployment: z.string(),
  themeColors: z.object({
    dark: themeColorSchema,
    light: themeColorSchema,
  }),
})

const persistedThemeColorsSchema = z
  .object({
    dark: themeColorSchema.optional(),
    light: themeColorSchema.optional(),
  })
  .partial()
  .optional()

export const persistedPortfolioContentSchema = portfolioContentSchema.omit({
  themeColors: true,
}).extend({
  themeColors: persistedThemeColorsSchema,
})

export type PersistedPortfolioContent = z.infer<typeof persistedPortfolioContentSchema>

const isThemeColor = (value: unknown): value is ThemeColor => {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<ThemeColor>
  return (
    typeof candidate.h === "number" &&
    typeof candidate.s === "number" &&
    typeof candidate.l === "number"
  )
}

export function withDefaultCustomColor(
  content: PersistedPortfolioContent,
  legacyCustomColor?: unknown,
): PortfolioContent {
  const defaults = cloneDefaultContent()
  const resolvedThemeColors: ThemeColors = {
    dark: { ...defaults.themeColors.dark },
    light: { ...defaults.themeColors.light },
  }

  const providedThemeColors = content.themeColors ?? {}

  if (isThemeColor(providedThemeColors.dark)) {
    resolvedThemeColors.dark = providedThemeColors.dark
  } else if (isThemeColor(legacyCustomColor)) {
    resolvedThemeColors.dark = legacyCustomColor
  } else {
    const customColor = (content as Record<string, unknown>).customColor
    if (isThemeColor(customColor)) {
      resolvedThemeColors.dark = customColor
    }
  }

  if (isThemeColor(providedThemeColors.light)) {
    resolvedThemeColors.light = providedThemeColors.light
  }

  const { themeColors: _ignoredThemeColors, customColor: _ignoredCustomColor, ...rest } =
    content as PersistedPortfolioContent & { customColor?: unknown }

  return {
    ...rest,
    experienceLog: content.experienceLog ?? defaults.experienceLog,
    educationLog: content.educationLog ?? defaults.educationLog,
    lastDeployment: content.lastDeployment ?? defaults.lastDeployment,
    systemStatus: content.systemStatus ?? defaults.systemStatus,
    themeColors: resolvedThemeColors,
  }
}

export const defaultContent: PortfolioContent = {
  profileData: {
    name: "JOHN_DOE.exe",
    title: "FULL_STACK_DEVELOPER",
    bio: "Building scalable systems and crafting pixel-perfect interfaces. Specializing in modern web technologies, cloud architecture, and performance optimization. Currently architecting solutions at TechCorp Industries.",
  },
  aboutStats: {
    projects: "47",
    commits: "2.3K",
    experience: "5Y",
    efficiency: "98%",
  },
  systemStatus: [...defaultSystemStatus],
  lastDeployment: "2024-03-15 14:32:07 UTC",
  experienceLog: defaultExperienceLog,
  educationLog: defaultEducationLog,
  skillsData: {
    frontend: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Vue.js"],
    backend: ["Node.js", "Python", "Go", "PostgreSQL", "Redis"],
    devops: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
  },
  projectCategories: [
    {
      id: "ai",
      name: "AI",
      visual: "brain",
      projects: [
        {
          title: "NEURAL_NETWORK_DASHBOARD",
          description: "Real-time ML model monitoring system with predictive analytics and automated alerting.",
          status: "PRODUCTION",
          metrics: { users: "15K", uptime: "99.9%" },
          githubUrl: "https://github.com/johndoe/neural-network-dashboard",
          projectUrl: "https://neural-dashboard.example.com",
          showInCv: true,
        },
        {
          title: "NLP_SENTIMENT_ANALYZER",
          description: "Advanced natural language processing engine for real-time sentiment analysis across multiple languages.",
          status: "ONGOING",
          metrics: { accuracy: "94%", speed: "50ms" },
          projectUrl: "https://sentiment-analyzer.example.com",
          showInCv: true,
        },
      ],
    },
    {
      id: "webdev",
      name: "WEB_DEV",
      visual: "sphere",
      projects: [
        {
          title: "E-COMMERCE_PLATFORM",
          description: "Full-stack e-commerce solution with real-time inventory, payment processing, and analytics dashboard.",
          status: "PRODUCTION",
          metrics: { transactions: "100K+", revenue: "$2M" },
          projectUrl: "https://commerce-platform.example.com",
          showInCv: true,
        },
        {
          title: "SOCIAL_MEDIA_APP",
          description: "Real-time social networking platform with live messaging, media sharing, and content moderation.",
          status: "BETA",
          metrics: { users: "50K", messages: "1M/day" },
          projectUrl: "https://beta.social-app.example.com",
          showInCv: true,
        },
      ],
    },
    {
      id: "software",
      name: "SOFTWARE_DEV",
      visual: "engine",
      projects: [
        {
          title: "DISTRIBUTED_CACHE_SYSTEM",
          description: "High-performance caching layer reducing database load by 85% across microservices.",
          status: "PRODUCTION",
          metrics: { requests: "50M/day", latency: "12ms" },
          projectUrl: "https://cache-system.example.com",
          showInCv: true,
        },
        {
          title: "API_GATEWAY_v3",
          description: "Scalable API gateway with rate limiting, authentication, and request transformation.",
          status: "TERMINED",
          metrics: { endpoints: "200+", throughput: "10K/s" },
          githubUrl: "https://github.com/johndoe/api-gateway-v3",
          projectUrl: "https://api-gateway.example.com",
          showInCv: true,
        },
        {
          title: "MONITORING_SUITE",
          description: "Comprehensive observability platform with custom metrics, logs, and distributed tracing.",
          status: "DEVELOPMENT",
          metrics: { services: "45", alerts: "120" },
          projectUrl: "https://monitoring-suite.example.com",
          showInCv: true,
        },
      ],
    },
  ],
  themeColors: {
    dark: { ...DEFAULT_THEME_COLORS.dark },
    light: { ...DEFAULT_THEME_COLORS.light },
  },
}

export function cloneDefaultContent(): PortfolioContent {
  return JSON.parse(JSON.stringify(defaultContent))
}
