"use client"

import Image from "next/image"
import type React from "react"

import {
  Activity,
  Code2,
  Cpu,
  Database,
  FileDown,
  Github,
  Linkedin,
  Mail,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EditableText } from "@/components/editable-text"
import { type PortfolioContent } from "@/lib/default-content"
import profilePic from "@/app/prof_pic.jpeg"

export type AboutSectionProps = {
  content: PortfolioContent
  isEditorMode: boolean
  onUpdateProfileField: (field: keyof PortfolioContent["profileData"], value: string) => void
  onUpdateAboutStat: (field: keyof PortfolioContent["aboutStats"], value: string) => void
  onUpdateSystemStatusValue: (id: string, value: number) => void
  onUpdateSystemStatusLabel?: (id: string, label: string) => void
  onAddSystemStatus: () => void
  onRemoveSystemStatus: (id: string) => void
  onUpdateLastDeployment: (value: string) => void
}

export function AboutSection({
  content,
  isEditorMode,
  onUpdateProfileField,
  onUpdateAboutStat,
  onUpdateSystemStatusValue,
  onUpdateSystemStatusLabel,
  onAddSystemStatus,
  onRemoveSystemStatus,
  onUpdateLastDeployment,
}: AboutSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
      <Card className="lg:col-span-2 p-4 sm:p-6 bg-card border border-primary/20 ">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6 mb-4 sm:mb-6">
          <div className="relative flex-shrink-0">
            <div className="holo-avatar group w-20 h-20 sm:w-32 sm:h-32">
              <span className="holo-avatar__grid" aria-hidden="true" />
              <span className="holo-avatar__line" aria-hidden="true" />
              <Image
                src={profilePic}
                alt={`${content.profileData.name}'s profile portrait`}
                fill
                priority
                sizes="(min-width: 640px) 12rem, 5rem"
                className="holo-avatar__image"
              />
            </div>
            <div
              className="absolute -inset-1 hidden sm:block rounded-sm border border-primary/60 opacity-70 blur-[1.5px]"
              aria-hidden="true"
            />
            <div className="absolute -inset-2 hidden sm:block bg-primary/20 opacity-30 blur-lg" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <EditableText
              value={content.profileData.name}
              onChange={(value) => onUpdateProfileField("name", value)}
              isEditorMode={isEditorMode}
              as="h2"
              className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 text-foreground"
            />
            <div className="flex items-center gap-2 mb-1 sm:mb-2 text-primary font-mono text-[10px] sm:text-sm">
              <Code2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <EditableText
                value={`> ${content.profileData.title}`}
                onChange={(value) => onUpdateProfileField("title", value.replace(/^>\s*/, ""))}
                isEditorMode={isEditorMode}
                as="p"
                className="flex-1"
              />
            </div>
            <EditableText
              value={content.profileData.bio}
              onChange={(value) => onUpdateProfileField("bio", value)}
              isEditorMode={isEditorMode}
              as="p"
              multiline
              className="text-muted-foreground text-xs sm:text-sm leading-relaxed"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="PROJECTS" value={content.aboutStats.projects} icon={<Database className="w-4 h-4" />} />
          <StatCard
            label="COMMITS"
            value={content.aboutStats.commits}
            icon={<Github className="w-4 h-4" />}
            isEditorMode={isEditorMode}
            onValueChange={(value) => onUpdateAboutStat("commits", value)}
          />
          <StatCard
            label="EXPERIENCE"
            value={content.aboutStats.experience}
            icon={<Cpu className="w-4 h-4" />}
            isEditorMode={isEditorMode}
            onValueChange={(value) => onUpdateAboutStat("experience", value)}
          />
          <StatCard
            label="EFFICIENCY"
            value={content.aboutStats.efficiency}
            icon={<Activity className="w-4 h-4" />}
            isEditorMode={isEditorMode}
            onValueChange={(value) => onUpdateAboutStat("efficiency", value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button asChild variant="default" className="font-mono text-xs w-full sm:w-auto cursor-pointer">
            <a href="mailto:quicksolver02@gmail.com">
              <Mail className="w-4 h-4 mr-2" />
              CONTACT
            </a>
          </Button>
          <Button asChild variant="outline" className="font-mono text-xs bg-transparent w-full sm:w-auto cursor-pointer">
            <a href="https://github.com/bacobax" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4 mr-2" />
              GITHUB
            </a>
          </Button>
          <Button asChild variant="outline" className="font-mono text-xs bg-transparent w-full sm:w-auto cursor-pointer">
            <a href="https://www.linkedin.com/in/francesco-bassignana/" target="_blank" rel="noopener noreferrer">
              <Linkedin className="w-4 h-4 mr-2" />
              LINKEDIN
            </a>
          </Button>
          <Button asChild variant="outline" className="font-mono text-xs bg-transparent w-full sm:w-auto cursor-pointer">
            <a href="/cv" rel="noopener noreferrer">
              <FileDown className="w-4 h-4 mr-2" />
              VIEW & DOWNLOAD CV
            </a>
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 bg-card border border-primary/20">
        <h3 className="text-xs sm:text-sm font-mono text-primary mb-3 sm:mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 animate-pulse" />
          SYSTEM_STATUS
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {content.systemStatus.map((status) => (
            <StatusBar
              key={status.id}
              label={status.label}
              value={status.value}
              isEditorMode={isEditorMode}
              onValueChange={(value) => onUpdateSystemStatusValue(status.id, value)}
              onLabelChange={
                isEditorMode && onUpdateSystemStatusLabel
                  ? (value) => onUpdateSystemStatusLabel(status.id, value)
                  : undefined
              }
              onDelete={
                isEditorMode && content.systemStatus.length > 1
                  ? () => onRemoveSystemStatus(status.id)
                  : undefined
              }
            />
          ))}
          {isEditorMode && (
            <button
              type="button"
              onClick={onAddSystemStatus}
              className="w-full border border-dashed border-primary/50 text-primary text-[10px] sm:text-xs font-mono py-2 cursor-pointer hover:border-primary bg-background/40"
            >
              <Plus className="inline-block w-3 h-3 mr-2" /> ADD_STATUS_BAR
            </button>
          )}
        </div>
        <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-primary/10 border border-primary/30 text-[10px] sm:text-xs font-mono">
          <p className="text-primary mb-1">{">"} LAST_DEPLOYMENT:</p>
          <EditableText
            value={content.lastDeployment}
            onChange={onUpdateLastDeployment}
            isEditorMode={isEditorMode}
            className="text-muted-foreground"
            as="p"
          />
          <p className="text-primary mt-2">{">"} BUILD_STATUS:</p>
          <p className="text-primary">SUCCESS ✓</p>
        </div>
      </Card>
    </div>
  )
}

type StatCardProps = {
  label: string
  value: string
  icon: React.ReactNode
  isEditorMode?: boolean
  onValueChange?: (value: string) => void
}

function StatCard({ label, value, icon, isEditorMode, onValueChange }: StatCardProps) {
  return (
    <div className="bg-secondary/50 border border-border p-2 sm:p-3">
      <div className="flex items-center gap-1 sm:gap-2 mb-1 text-primary">
        {icon}
        <p className="text-[10px] sm:text-xs font-mono">{label}</p>
      </div>
      {isEditorMode && onValueChange ? (
        <EditableText
          value={value}
          onChange={onValueChange}
          isEditorMode={isEditorMode}
          className="text-lg sm:text-2xl font-bold text-foreground"
        />
      ) : (
        <p className="text-lg sm:text-2xl font-bold text-foreground">{value}</p>
      )}
    </div>
  )
}

type StatusBarProps = {
  label: string
  value: number
  isEditorMode?: boolean
  onValueChange?: (value: number) => void
  onLabelChange?: (value: string) => void
  onDelete?: () => void
}

function StatusBar({ label, value, isEditorMode, onValueChange, onLabelChange, onDelete }: StatusBarProps) {
  const handleChange = (newValue: string) => {
    const num = Number.parseInt(newValue, 10)
    if (!Number.isNaN(num) && num >= 0 && num <= 100 && onValueChange) {
      onValueChange(num)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs font-mono text-muted-foreground">
        {isEditorMode && onLabelChange ? (
          <EditableText
            value={label}
            onChange={onLabelChange}
            isEditorMode={isEditorMode}
            className="text-primary"
          />
        ) : (
          <span className="text-primary">{label}</span>
        )}
        <div className="flex items-center gap-2">
          {isEditorMode && onDelete && (
            <button
              onClick={onDelete}
              className="text-destructive border border-destructive/50 px-2 py-0.5 hover:border-destructive transition-colors cursor-pointer"
              type="button"
            >
              REMOVE
            </button>
          )}
          {isEditorMode && onValueChange ? (
            <EditableText
              value={String(value)}
              onChange={handleChange}
              isEditorMode={isEditorMode}
              className="text-primary"
            />
          ) : (
            <span className="text-primary">{value}%</span>
          )}
        </div>
      </div>
      <div className="h-2 sm:h-2.5 bg-primary/10 border border-primary/30">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
