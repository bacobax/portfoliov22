"use client"

import { useMemo, type ReactNode } from "react"
import Image from "next/image"
import { Activity, Cpu, Database, FileDown, Github, GraduationCap, Linkedin, Mail, Rocket } from "lucide-react"

import profilePicture from "@/app/prof_pic.jpeg"
import { SphereOS, type SphereCluster, type SphereNode } from "@/components/sphere-os"
import { cn } from "@/lib/utils"
import type { PortfolioContent, Project, ProjectStatus } from "@/lib/default-content"

export type SphereSectionKey = "ABOUT" | "EXPERIENCE" | "EDUCATION" | "PROJECTS" | "SKILLS"

// Cluster anchor directions around the viewer (longitude / latitude in degrees).
// Order matches the tab order so arrow-key navigation steps intuitively.
const CLUSTERS: (SphereCluster & { id: SphereSectionKey })[] = [
  { id: "ABOUT", yaw: 0, pitch: 6 },
  { id: "EXPERIENCE", yaw: 72, pitch: 2 },
  { id: "EDUCATION", yaw: 144, pitch: 2 },
  { id: "PROJECTS", yaw: 216, pitch: 0 },
  { id: "SKILLS", yaw: 288, pitch: 4 },
]

const STATUS_TONE: Record<ProjectStatus, string> = {
  PRODUCTION: "text-emerald-400 border-emerald-400/50",
  BETA: "text-amber-400 border-amber-400/50",
  DEVELOPMENT: "text-sky-400 border-sky-400/50",
  ONGOING: "text-primary border-primary/50",
  TERMINED: "text-muted-foreground border-border",
}

/* ---- Holographic console tile chrome ----------------------------------- */

function HoloTile({
  title,
  badge,
  icon,
  children,
  scroll,
  className,
}: {
  title?: string
  badge?: ReactNode
  icon?: ReactNode
  children: ReactNode
  scroll?: boolean
  className?: string
}) {
  return (
    <div className={cn("holo-tile", className)}>
      <span className="holo-corner holo-corner-tl" />
      <span className="holo-corner holo-corner-tr" />
      <span className="holo-corner holo-corner-bl" />
      <span className="holo-corner holo-corner-br" />
      {title && (
        <div className="holo-head">
          <span className="holo-dot" />
          {icon}
          <span className="truncate">{title}</span>
          {badge && <span className="ml-auto shrink-0">{badge}</span>}
        </div>
      )}
      <div className={cn("holo-body", scroll && "holo-scroll")}>{children}</div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="holo-chip">{children}</span>
}

/* ---- Content tiles ----------------------------------------------------- */

function IdentityTile({ content }: { content: PortfolioContent }) {
  return (
    <HoloTile title="OPERATOR" icon={<Activity className="w-3 h-3 animate-pulse" />} badge={<span className="text-[9px] text-emerald-400">● ONLINE</span>}>
      <div className="flex items-center gap-3 h-full">
        <div className="relative w-20 h-20 shrink-0 overflow-hidden border border-primary/50">
          <Image
            src={profilePicture}
            alt={`${content.profileData.name || "Portfolio owner"} portrait`}
            fill
            sizes="80px"
            className="object-cover contrast-110 saturate-125"
          />
          <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-70 animate-hologram-scan pointer-events-none" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight text-foreground truncate">{content.profileData.name}</h2>
          <p className="text-primary text-[11px] mt-1">&gt; {content.profileData.title}</p>
        </div>
      </div>
    </HoloTile>
  )
}

function BioTile({ content }: { content: PortfolioContent }) {
  return (
    <HoloTile title="README.txt" scroll>
      <p className="text-muted-foreground text-[11px] leading-relaxed">{content.profileData.bio}</p>
    </HoloTile>
  )
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <HoloTile>
      <div className="flex flex-col justify-center h-full">
        <div className="flex items-center gap-2 text-primary mb-1">
          {icon}
          <span className="text-[10px] tracking-wider">{label}</span>
        </div>
        <span className="text-3xl font-bold text-foreground leading-none">{value}</span>
      </div>
    </HoloTile>
  )
}

function ContactTile() {
  const links = [
    { href: "mailto:quicksolver02@gmail.com", icon: <Mail className="w-3.5 h-3.5" />, label: "CONTACT" },
    { href: "https://github.com/bacobax", icon: <Github className="w-3.5 h-3.5" />, label: "GITHUB", ext: true },
    {
      href: "https://www.linkedin.com/in/francesco-bassignana/",
      icon: <Linkedin className="w-3.5 h-3.5" />,
      label: "LINKEDIN",
      ext: true,
    },
    { href: "/cv", icon: <FileDown className="w-3.5 h-3.5" />, label: "VIEW & DOWNLOAD CV" },
  ]
  return (
    <HoloTile title="UPLINK">
      <div className="grid grid-cols-2 gap-2 h-full content-center">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            {...(l.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="holo-link"
          >
            {l.icon}
            <span className="truncate">{l.label}</span>
          </a>
        ))}
      </div>
    </HoloTile>
  )
}

function StatusBarsTile({ content }: { content: PortfolioContent }) {
  return (
    <HoloTile title="SYSTEM_STATUS" icon={<Activity className="w-3 h-3" />} scroll>
      <div className="space-y-2.5">
        {content.systemStatus.map((s) => (
          <div key={s.id} className="space-y-1">
            <div className="flex justify-between text-[10px] text-primary">
              <span className="truncate pr-2">{s.label}</span>
              <span>{s.value}%</span>
            </div>
            <div className="h-1.5 bg-primary/10 border border-primary/30">
              <div className="h-full bg-primary" style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </HoloTile>
  )
}

function DeploymentTile({ content }: { content: PortfolioContent }) {
  return (
    <HoloTile title="BUILD">
      <div className="text-[10px] leading-relaxed h-full flex flex-col justify-center">
        <p className="text-primary">&gt; LAST_DEPLOYMENT:</p>
        <p className="text-muted-foreground mb-2">{content.lastDeployment}</p>
        <p className="text-primary">&gt; BUILD_STATUS:</p>
        <p className="text-emerald-400">SUCCESS ✓</p>
      </div>
    </HoloTile>
  )
}

function ClusterHeaderTile({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <div className="holo-marker">
      {icon}
      <span>{label}</span>
    </div>
  )
}

function ExperienceTile({ entry }: { entry: PortfolioContent["experienceLog"][number] }) {
  return (
    <HoloTile title={entry.year} badge={<span className="text-[9px] text-muted-foreground">{entry.company}</span>} scroll>
      <h3 className="text-foreground text-xs font-bold mb-1">{entry.title}</h3>
      <p className="text-muted-foreground text-[11px] leading-relaxed mb-2">{entry.description}</p>
      <div className="flex flex-wrap gap-1">
        {entry.tags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>
    </HoloTile>
  )
}

function EducationTile({ entry }: { entry: PortfolioContent["educationLog"][number] }) {
  return (
    <HoloTile title={entry.year} badge={<span className="text-[9px] text-muted-foreground">{entry.institution}</span>} scroll>
      <h3 className="text-foreground text-xs font-bold mb-1">{entry.degree}</h3>
      <p className="text-muted-foreground text-[11px] leading-relaxed mb-2">{entry.description}</p>
      <div className="flex flex-wrap gap-1">
        {entry.tags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>
    </HoloTile>
  )
}

function ProjectTile({ project, category }: { project: Project; category: string }) {
  return (
    <HoloTile
      title={category}
      badge={<span className={cn("border px-1.5 py-0.5 text-[9px]", STATUS_TONE[project.status])}>{project.status}</span>}
      scroll
    >
      <h3 className="text-foreground text-xs font-bold mb-1 break-words">{project.title}</h3>
      <p className="text-muted-foreground text-[11px] leading-relaxed mb-2">{project.description}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {Object.entries(project.metrics).map(([k, v]) => (
          <Chip key={k}>
            {k}: <span className="text-primary">{v}</span>
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        {project.githubUrl && (
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="holo-link flex-1">
            <Github className="w-3 h-3" /> CODE
          </a>
        )}
        {project.projectUrl && (
          <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="holo-link flex-1">
            <Rocket className="w-3 h-3" /> LIVE
          </a>
        )}
      </div>
    </HoloTile>
  )
}

function SkillGroupTile({ label, skills }: { label: string; skills: string[] }) {
  return (
    <HoloTile title={label} scroll>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </HoloTile>
  )
}

/* ---- Layout: scatter the tiles across the sphere ----------------------- */

function buildNodes(content: PortfolioContent): SphereNode[] {
  const nodes: SphereNode[] = []
  const add = (
    id: string,
    cluster: SphereSectionKey,
    yaw: number,
    pitch: number,
    w: number,
    h: number,
    node: ReactNode,
  ) => nodes.push({ id, cluster, yaw, pitch, w, h, content: node })

  // --- ABOUT (front, yaw 0): hero centred, bio/contact flanking, stats below ---
  add("about-id", "ABOUT", 2, 15, 410, 150, <IdentityTile content={content} />)
  add("about-bio", "ABOUT", -22, 0, 330, 200, <BioTile content={content} />)
  add("about-contact", "ABOUT", 24, 2, 340, 145, <ContactTile />)
  add("stat-projects", "ABOUT", -16, -22, 150, 110, <StatTile label="PROJECTS" value={content.aboutStats.projects} icon={<Database className="w-3.5 h-3.5" />} />)
  add("stat-commits", "ABOUT", 4, -24, 150, 110, <StatTile label="COMMITS" value={content.aboutStats.commits} icon={<Github className="w-3.5 h-3.5" />} />)
  add("stat-exp", "ABOUT", 24, -22, 150, 110, <StatTile label="EXPERIENCE" value={content.aboutStats.experience} icon={<Cpu className="w-3.5 h-3.5" />} />)

  // --- EXPERIENCE (yaw 72) ---
  const exp = content.experienceLog ?? []
  add("exp-head", "EXPERIENCE", 72, 27, 300, 64, <ClusterHeaderTile label="EXPERIENCE_LOG" icon={<Cpu className="w-4 h-4" />} />)
  exp.forEach((entry, i) => {
    const spread = (i - (exp.length - 1) / 2) * 21
    const pitch = i % 2 === 0 ? 2 : -19
    add(`exp-${i}`, "EXPERIENCE", 72 + spread, pitch, 340, 215, <ExperienceTile entry={entry} />)
  })

  // --- EDUCATION (yaw 144) ---
  const edu = content.educationLog ?? []
  add("edu-head", "EDUCATION", 144, 27, 300, 64, <ClusterHeaderTile label="EDUCATION_TIMELINE" icon={<GraduationCap className="w-4 h-4" />} />)
  edu.forEach((entry, i) => {
    const spread = (i - (edu.length - 1) / 2) * 23
    const pitch = i % 2 === 0 ? 2 : -19
    add(`edu-${i}`, "EDUCATION", 144 + spread, pitch, 340, 210, <EducationTile entry={entry} />)
  })

  // --- PROJECTS (yaw 216) — every project becomes its own tile in a grid ---
  const flatProjects: { project: Project; category: string }[] = []
  content.projectCategories.forEach((cat) => cat.projects.forEach((project) => flatProjects.push({ project, category: cat.name })))
  add("proj-head", "PROJECTS", 216, 28, 300, 64, <ClusterHeaderTile label="PROJECT_INDEX" icon={<Rocket className="w-4 h-4" />} />)
  flatProjects.forEach(({ project, category }, i) => {
    const col = (i % 3) - 1 // -1, 0, 1
    const row = Math.floor(i / 3) // 0, 1, 2...
    const yaw = 216 + col * 22
    const pitch = 10 - row * 22
    add(`proj-${i}`, "PROJECTS", yaw, pitch, 290, 190, <ProjectTile project={project} category={category} />)
  })

  // --- SKILLS (yaw 288) ---
  add("skills-head", "SKILLS", 288, 27, 280, 64, <ClusterHeaderTile label="CAPABILITIES" icon={<Activity className="w-4 h-4" />} />)
  add("skills-fe", "SKILLS", 288 - 22, 7, 260, 140, <SkillGroupTile label="FRONTEND" skills={content.skillsData.frontend} />)
  add("skills-be", "SKILLS", 288, -3, 260, 140, <SkillGroupTile label="BACKEND" skills={content.skillsData.backend} />)
  add("skills-do", "SKILLS", 288 + 22, 7, 260, 140, <SkillGroupTile label="DEVOPS" skills={content.skillsData.devops} />)
  add("skills-status", "SKILLS", 288 - 13, -22, 310, 170, <StatusBarsTile content={content} />)
  add("skills-build", "SKILLS", 288 + 17, -23, 240, 140, <DeploymentTile content={content} />)

  return nodes
}

interface SphereOSSceneProps {
  content: PortfolioContent
  theme: "dark" | "light"
  color: { r: number; g: number; b: number }
  activeSection: SphereSectionKey
  onActiveSectionChange: (section: SphereSectionKey) => void
}

export function SphereOSScene({ content, theme, color, activeSection, onActiveSectionChange }: SphereOSSceneProps) {
  const nodes = useMemo(() => buildNodes(content), [content])

  return (
    <SphereOS
      nodes={nodes}
      clusters={CLUSTERS}
      activeCluster={activeSection}
      onActiveClusterChange={(id) => onActiveSectionChange(id as SphereSectionKey)}
      color={color}
      theme={theme}
    />
  )
}
