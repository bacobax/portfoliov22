"use client"

export function EditorModeBanner() {
  return (
    <div className="bg-primary/20 border-b border-primary py-2 px-4 text-center relative z-10">
      <p className="text-xs sm:text-sm font-mono text-primary">⚡ EDITOR_MODE_ACTIVE | Click on any content to edit</p>
    </div>
  )
}
