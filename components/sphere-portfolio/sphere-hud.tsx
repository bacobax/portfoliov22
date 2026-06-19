"use client"

import type { ChangeEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Lock,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react"

import { ColorPicker } from "@/components/color-picker"
import type { ExperienceEntry, PortfolioContent, ProjectCategory, ThemeColor } from "@/lib/default-content"
import type { ThemeMode } from "@/lib/theme"
import { FOCUS_ORDER, panelLabel, type FocusPanelName } from "./panel-layout"
import type { EditableSphereHandlers } from "./sphere-types"

type SphereHudProps = {
  time: Date
  theme: ThemeMode
  accentColor: ThemeColor
  isReady: boolean
  isEditorMode: boolean
  isAuthenticated: boolean
  isContentLoading: boolean
  contentError: string | null
  content: PortfolioContent | null
  activeCategory: ProjectCategory | null
  activeCategoryIndex: number
  focusedPanel: FocusPanelName | null
  activePanel: FocusPanelName | null
  hintHidden: boolean
  adminOpen: boolean
  onSetAdminOpen: (open: boolean) => void
  onFocus: (name: FocusPanelName) => void
  onExitFocus: () => void
  onCycleFocus: (step: number) => void
  onPrevCategory: () => void
  onNextCategory: () => void
  onRetryContent: () => void
  onToggleEditor: () => void
  onToggleTheme: () => void
  onLogout: () => void
  onColorChange: (h: number, s: number, l: number) => void
  onPersistAccentColor: (color: ThemeColor) => void
  canPersistAccent: boolean
  handlers: EditableSphereHandlers
}

const buttonBase =
  "border border-primary/40 bg-background/70 text-primary hover:border-primary hover:bg-primary/10 transition-colors"

const Field = ({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) => (
  <label className="block space-y-1">
    <span className="text-[10px] tracking-[0.12em] text-muted-foreground">{label}</span>
    {multiline ? (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full border border-primary/25 bg-background/70 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
      />
    ) : (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-primary/25 bg-background/70 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
      />
    )}
  </label>
)

const NumberField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10)
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(0, Math.min(100, parsed)))
    }
  }

  return (
    <label className="block space-y-1">
      <span className="text-[10px] tracking-[0.12em] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={handleChange}
        className="w-full border border-primary/25 bg-background/70 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
      />
    </label>
  )
}

const ListEditor = ({
  title,
  items,
  onChange,
}: {
  title: string
  items: string[]
  onChange: (items: string[]) => void
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h4 className="text-[11px] font-bold tracking-[0.14em] text-primary">{title}</h4>
      <button
        type="button"
        onClick={() => onChange([...items, "New Skill"])}
        className={`${buttonBase} p-1`}
        title={`Add ${title.toLowerCase()} skill`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={`${title}-${index}`} className="flex gap-1.5">
          <input
            value={item}
            onChange={(event) => onChange(items.map((entry, idx) => (idx === index ? event.target.value : entry)))}
            className="min-w-0 flex-1 border border-primary/25 bg-background/70 px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== index))}
            className={`${buttonBase} px-2`}
            title="Remove skill"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  </div>
)

export function SphereHud({
  time,
  theme,
  accentColor,
  isReady,
  isEditorMode,
  isAuthenticated,
  isContentLoading,
  contentError,
  content,
  activeCategory,
  activeCategoryIndex,
  focusedPanel,
  activePanel,
  hintHidden,
  adminOpen,
  onSetAdminOpen,
  onFocus,
  onExitFocus,
  onCycleFocus,
  onPrevCategory,
  onNextCategory,
  onRetryContent,
  onToggleEditor,
  onToggleTheme,
  onLogout,
  onColorChange,
  onPersistAccentColor,
  canPersistAccent,
  handlers,
}: SphereHudProps) {
  const clock = time.toUTCString().slice(17, 25)

  return (
    <>
      <div className={`sphere-status ${focusedPanel ? "opacity-0" : "opacity-100"}`}>
        <span className="sphere-status-dot" />
        <b>SYSTEM_PORTFOLIO_v2.0</b>
        <span className="text-muted-foreground">/</span>
        <span suppressHydrationWarning>{clock} UTC</span>
      </div>

      <div className={`sphere-hint ${hintHidden || focusedPanel ? "opacity-0" : "opacity-100"}`}>
        <div className="sphere-hint-ring" />
        <span className="sphere-hint-desktop">Drag to look &middot; click a panel to focus</span>
        <span className="sphere-hint-mobile">Scroll to orbit &middot; tap a section to focus</span>
      </div>

      <div className="sphere-controls">
        <button type="button" onClick={onToggleEditor} className={`${buttonBase} p-2`} title="Toggle editor">
          <Lock className="h-4 w-4" />
        </button>
        {isAuthenticated && (
          <button type="button" onClick={onLogout} className={`${buttonBase} p-2`} title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onToggleTheme} className={`${buttonBase} p-2`} title="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {!isContentLoading && (
          <ColorPicker
            onColorChange={onColorChange}
            defaultH={accentColor.h}
            defaultS={accentColor.s}
            defaultL={accentColor.l}
            canPersist={canPersistAccent}
            onPersistDefault={onPersistAccentColor}
          />
        )}
        {isEditorMode && (
          <button
            type="button"
            onClick={() => onSetAdminOpen(!adminOpen)}
            className={`${buttonBase} p-2`}
            title="Open editor drawer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
      </div>

      {contentError && !isContentLoading && (
        <div className="sphere-error">
          <span>{contentError}</span>
          <button type="button" onClick={onRetryContent} className="border border-destructive/60 px-2 py-1">
            RETRY
          </button>
        </div>
      )}

      <nav className="sphere-compass" aria-label="Portfolio sections">
        {FOCUS_ORDER.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => (focusedPanel === name ? onExitFocus() : onFocus(name))}
            className={focusedPanel === name || (!focusedPanel && activePanel === name) ? "active" : undefined}
          >
            {panelLabel(name)}
          </button>
        ))}
      </nav>

      <div className={`sphere-focusbar ${focusedPanel ? "show" : ""}`}>
        <button type="button" className="arw" onClick={() => onCycleFocus(-1)} title="Previous section">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="title">{focusedPanel ? panelLabel(focusedPanel) : "ABOUT"}</div>
        <button type="button" className="arw" onClick={() => onCycleFocus(1)} title="Next section">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className="close" onClick={onExitFocus}>
          EXIT
        </button>
      </div>

      <div className={`sphere-exit-hint ${focusedPanel ? "show" : ""}`}>Scroll to read &middot; Esc or click away to exit</div>

      <div className={`sphere-loader ${isReady ? "gone" : ""}`}>
        <svg className="globe" viewBox="0 0 200 200" strokeWidth="1.3" aria-hidden="true">
          <circle cx="100" cy="100" r="80" />
          <ellipse cx="100" cy="100" rx="80" ry="30" />
          <ellipse cx="100" cy="100" rx="80" ry="58" />
          <ellipse cx="100" cy="100" rx="30" ry="80" />
          <ellipse cx="100" cy="100" rx="58" ry="80" />
          <rect x="54" y="40" width="44" height="22" transform="rotate(-12 76 51)" />
          <rect x="116" y="96" width="42" height="26" transform="rotate(11 137 109)" />
          <rect x="46" y="122" width="40" height="24" transform="rotate(8 66 134)" />
          <circle cx="100" cy="100" r="3.5" fill="currentColor" stroke="none" />
        </svg>
        <div className="ttl">SPHERE&nbsp;PORTFOLIO</div>
        <div className="sub">INITIALIZING...</div>
      </div>

      {isEditorMode && content && (
        <AdminDrawer
          open={adminOpen}
          content={content}
          activeCategory={activeCategory}
          activeCategoryIndex={activeCategoryIndex}
          onClose={() => onSetAdminOpen(false)}
          onPrevCategory={onPrevCategory}
          onNextCategory={onNextCategory}
          handlers={handlers}
        />
      )}
    </>
  )
}

function AdminDrawer({
  open,
  content,
  activeCategory,
  activeCategoryIndex,
  onClose,
  onPrevCategory,
  onNextCategory,
  handlers,
}: {
  open: boolean
  content: PortfolioContent
  activeCategory: ProjectCategory | null
  activeCategoryIndex: number
  onClose: () => void
  onPrevCategory: () => void
  onNextCategory: () => void
  handlers: EditableSphereHandlers
}) {
  const updateExperience = (index: number, field: keyof ExperienceEntry, value: string) => {
    const entry = content.experienceLog[index]
    if (!entry) {
      return
    }
    handlers.onExperienceChange(index, { ...entry, [field]: value })
  }

  return (
    <aside className={`sphere-admin ${open ? "open" : ""}`} aria-label="Portfolio editor">
      <div className="flex items-center justify-between border-b border-primary/25 px-4 py-3">
        <div>
          <h2 className="text-xs font-bold tracking-[0.2em] text-primary">EDITOR_CONSOLE</h2>
          <p className="text-[10px] text-muted-foreground">Canvas textures repaint after each change.</p>
        </div>
        <button type="button" onClick={onClose} className={`${buttonBase} p-2`} title="Close editor">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6 overflow-y-auto px-4 py-4">
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-primary">PROFILE</h3>
          <Field label="NAME" value={content.profileData.name} onChange={(value) => handlers.onUpdateProfileField("name", value)} />
          <Field label="TITLE" value={content.profileData.title} onChange={(value) => handlers.onUpdateProfileField("title", value)} />
          <Field label="BIO" value={content.profileData.bio} multiline onChange={(value) => handlers.onUpdateProfileField("bio", value)} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="COMMITS" value={content.aboutStats.commits} onChange={(value) => handlers.onUpdateAboutStat("commits", value)} />
            <Field label="EXPERIENCE" value={content.aboutStats.experience} onChange={(value) => handlers.onUpdateAboutStat("experience", value)} />
          </div>
          <Field label="LAST_DEPLOYMENT" value={content.lastDeployment} onChange={handlers.onUpdateLastDeployment} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary">SYSTEM_STATUS</h3>
            <button type="button" onClick={handlers.onAddSystemStatus} className={`${buttonBase} px-2 py-1 text-[10px]`}>
              ADD
            </button>
          </div>
          {content.systemStatus.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[1fr_82px_auto] gap-2">
              <Field label="LABEL" value={entry.label} onChange={(value) => handlers.onUpdateSystemStatusLabel(entry.id, value)} />
              <NumberField label="VALUE" value={entry.value} onChange={(value) => handlers.onUpdateSystemStatusValue(entry.id, value)} />
              <button
                type="button"
                onClick={() => handlers.onRemoveSystemStatus(entry.id)}
                className={`${buttonBase} self-end px-2 py-2`}
                title="Remove status"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-primary">PROJECTS</h3>
            <div className="flex gap-1">
              <button type="button" onClick={onPrevCategory} className={`${buttonBase} p-1.5`} title="Previous category">
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button type="button" onClick={onNextCategory} className={`${buttonBase} p-1.5`} title="Next category">
                <ChevronRight className="h-3 w-3" />
              </button>
              <button type="button" onClick={handlers.onAddProject} className={`${buttonBase} p-1.5`} title="Add project">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{activeCategory?.name ?? "No category"} category</p>
          <div className="space-y-2">
            {activeCategory?.projects.map((project, index) => (
              <div key={`${project.title}-${index}`} className="flex items-center justify-between gap-2 border border-primary/20 bg-background/40 p-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">{project.title}</p>
                  <p className="text-[10px] text-muted-foreground">{project.status}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handlers.onEditProject(activeCategoryIndex, index)}
                    className={`${buttonBase} p-1.5`}
                    title="Edit project"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlers.onDeleteProject(activeCategoryIndex, index)}
                    className={`${buttonBase} p-1.5`}
                    title="Delete project"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold text-primary">SKILLS</h3>
          <ListEditor title="FRONTEND" items={content.skillsData.frontend} onChange={(items) => handlers.onUpdateSkills("frontend", items)} />
          <ListEditor title="BACKEND" items={content.skillsData.backend} onChange={(items) => handlers.onUpdateSkills("backend", items)} />
          <ListEditor title="DEVOPS" items={content.skillsData.devops} onChange={(items) => handlers.onUpdateSkills("devops", items)} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary">EXPERIENCE</h3>
            <button type="button" onClick={handlers.onAddExperienceEntry} className={`${buttonBase} px-2 py-1 text-[10px]`}>
              ADD
            </button>
          </div>
          {content.experienceLog.map((entry, index) => (
            <div key={`${entry.title}-${index}`} className="space-y-2 border border-primary/20 bg-background/40 p-2">
              <div className="flex justify-between gap-2">
                <p className="text-[11px] font-bold text-foreground">{entry.title}</p>
                <button type="button" onClick={() => handlers.onDeleteExperienceEntry(index)} className={`${buttonBase} p-1`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <Field label="YEAR" value={entry.year} onChange={(value) => updateExperience(index, "year", value)} />
              <Field label="TITLE" value={entry.title} onChange={(value) => updateExperience(index, "title", value)} />
              <Field label="COMPANY" value={entry.company} onChange={(value) => updateExperience(index, "company", value)} />
              <Field label="DESCRIPTION" value={entry.description} multiline onChange={(value) => updateExperience(index, "description", value)} />
            </div>
          ))}
        </section>

        <section className="space-y-3 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary">EDUCATION</h3>
            <button type="button" onClick={handlers.onAddEducation} className={`${buttonBase} px-2 py-1 text-[10px]`}>
              ADD
            </button>
          </div>
          {content.educationLog.map((entry, index) => (
            <div key={`${entry.degree}-${index}`} className="flex items-center justify-between gap-2 border border-primary/20 bg-background/40 p-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-foreground">{entry.degree}</p>
                <p className="text-[10px] text-muted-foreground">{entry.year}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => handlers.onEditEducation(index)} className={`${buttonBase} p-1.5`}>
                  <Edit3 className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => handlers.onDeleteEducation(index)} className={`${buttonBase} p-1.5`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </aside>
  )
}
