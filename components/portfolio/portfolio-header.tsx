"use client"

import { Activity, Lock, LogOut, Moon, Sun, Terminal } from "lucide-react"

import { ColorPicker } from "@/components/color-picker"
import { Skeleton } from "@/components/ui/skeleton"

export type PortfolioHeaderProps = {
  timeString: string
  isEditorMode: boolean
  isAuthenticated: boolean
  theme: "dark" | "light"
  isContentLoading: boolean
  accentColor: { h: number; s: number; l: number }
  onToggleEditor: () => void
  onToggleTheme: () => void
  onLogout: () => void
  onColorChange: (h: number, s: number, l: number) => void
}

export function PortfolioHeader({
  timeString,
  isEditorMode,
  isAuthenticated,
  theme,
  isContentLoading,
  accentColor,
  onToggleEditor,
  onToggleTheme,
  onLogout,
  onColorChange,
}: PortfolioHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold text-foreground truncate">SYSTEM_PORTFOLIO_v2.0</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                STATUS: {isEditorMode ? "EDITOR_MODE" : "ONLINE"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-muted-foreground">UPTIME: 99.9%</span>
            </div>
            <div className="hidden sm:block text-xs sm:text-sm font-mono text-primary">{timeString}</div>
            <button
              onClick={onToggleEditor}
              className={`p-1.5 sm:p-2 border ${
                isEditorMode ? "border-primary bg-primary/20" : "border-primary/50 bg-card"
              } hover:border-primary transition-colors cursor-pointer`}
              title={isEditorMode ? "Exit Editor Mode" : "Enter Editor Mode"}
              type="button"
            >
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </button>
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="p-1.5 sm:p-2 border border-primary/50 bg-card hover:border-primary transition-colors cursor-pointer"
                title="Logout"
                type="button"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </button>
            )}
            <button
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2 border border-primary/50 bg-card hover:border-primary transition-colors cursor-pointer"
              title="Toggle Theme"
              type="button"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              )}
            </button>
            {isContentLoading ? (
              <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 border border-primary/50" />
            ) : (
              <ColorPicker
                onColorChange={onColorChange}
                defaultH={accentColor.h}
                defaultS={accentColor.s}
                defaultL={accentColor.l}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
