import { z } from "zod"

export type ProjectStatus = "PRODUCTION" | "BETA" | "DEVELOPMENT"

export interface Project {
  title: string
  description: string
  status: ProjectStatus
  metrics: Record<string, string>
  githubUrl?: string
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

export interface SystemStatus {
  frontend: number
  backend: number
  devops: number
  database: number
}

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

export interface PortfolioContent {
  profileData: ProfileData
  aboutStats: AboutStats
  systemStatus: SystemStatus
  lastDeployment: string
  experienceLog: ExperienceEntry[]
  educationLog: EducationEntry[]
  skillsData: SkillsData
  projectCategories: ProjectCategory[]
  customColor: { h: number; s: number; l: number }
}

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
  systemStatus: z.object({
    frontend: z.number().int().min(0).max(100),
    backend: z.number().int().min(0).max(100),
    devops: z.number().int().min(0).max(100),
    database: z.number().int().min(0).max(100),
  }),
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
            status: z.union([z.literal("PRODUCTION"), z.literal("BETA"), z.literal("DEVELOPMENT")]),
            metrics: z.record(z.string()),
            githubUrl: z.string().url().optional(),
          }),
        ),
      }),
    )
    .min(1),
  lastDeployment: z.string(),
  customColor: z.object({
    h: z.number(),
    s: z.number(),
    l: z.number(),
  }),
})

export type PersistedPortfolioContent = Omit<PortfolioContent, "customColor">

export const persistedPortfolioContentSchema = portfolioContentSchema.omit({
  customColor: true,
})

export function withDefaultCustomColor(content: PersistedPortfolioContent): PortfolioContent {
  const defaults = cloneDefaultContent()
  return {
    ...content,
    experienceLog: content.experienceLog ?? defaults.experienceLog,
    educationLog: content.educationLog ?? defaults.educationLog,
    lastDeployment: content.lastDeployment ?? defaults.lastDeployment,
    customColor: defaults.customColor,
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
  systemStatus: {
    frontend: 95,
    backend: 88,
    devops: 82,
    database: 90,
  },
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
        },
        {
          title: "NLP_SENTIMENT_ANALYZER",
          description: "Advanced natural language processing engine for real-time sentiment analysis across multiple languages.",
          status: "PRODUCTION",
          metrics: { accuracy: "94%", speed: "50ms" },
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
        },
        {
          title: "SOCIAL_MEDIA_APP",
          description: "Real-time social networking platform with live messaging, media sharing, and content moderation.",
          status: "BETA",
          metrics: { users: "50K", messages: "1M/day" },
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
        },
        {
          title: "API_GATEWAY_v3",
          description: "Scalable API gateway with rate limiting, authentication, and request transformation.",
          status: "BETA",
          metrics: { endpoints: "200+", throughput: "10K/s" },
          githubUrl: "https://github.com/johndoe/api-gateway-v3",
        },
        {
          title: "MONITORING_SUITE",
          description: "Comprehensive observability platform with custom metrics, logs, and distributed tracing.",
          status: "DEVELOPMENT",
          metrics: { services: "45", alerts: "120" },
        },
      ],
    },
  ],
  customColor: { h: 186, s: 100, l: 37 },
}

export function cloneDefaultContent(): PortfolioContent {
  return JSON.parse(JSON.stringify(defaultContent))
}
