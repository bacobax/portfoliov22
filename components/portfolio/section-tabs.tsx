"use client"

import { Button } from "@/components/ui/button"

export type SectionKey = "ALL" | "ABOUT" | "EXPERIENCE" | "EDUCATION" | "PROJECTS" | "SKILLS"

export type SectionTabsProps = {
  sections: SectionKey[]
  activeSection: SectionKey
  onSectionChange: (section: SectionKey) => void
}

export function SectionTabs({ sections, activeSection, onSectionChange }: SectionTabsProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-8 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
      {sections.map((section) => (
        <Button
          key={section}
          variant={activeSection === section ? "default" : "outline"}
          onClick={() => onSectionChange(section)}
          className="font-mono text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-4 h-8 sm:h-10 cursor-pointer"
          type="button"
        >
          [{section}]
        </Button>
      ))}
    </div>
  )
}
