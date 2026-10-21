import CvCursorVisibility from "@/components/cv-cursor-visibility"
import { CvLayoutSwitcher, type PresetView } from "@/components/cv/cv-layout-switcher"
import { createCvData } from "@/lib/cv-data-transform"
import { loadCvPresetsWithFallback } from "@/lib/cv-presets-db"
import { loadPortfolioContent } from "@/lib/portfolio-content"
import profilePicture from "@/app/prof_pic.jpeg"

/** Force dynamic rendering so the page always reads fresh data from MongoDB */
export const dynamic = "force-dynamic"

export default async function CvPage() {
  const portfolio = await loadPortfolioContent()
  const { presets } = await loadCvPresetsWithFallback(portfolio)

  const visiblePresets: PresetView[] = presets
    .filter((p) => p.visible)
    .map((p) => ({
      id: p.id,
      name: p.name,
      layout: p.layout,
      data: createCvData(p.content, p, portfolio.contactData.links),
    }))

  return (
    <div className="cv-page cv-proof">
      <CvCursorVisibility />
      <style>{`
        :root {
          color-scheme: light;
        }
        @media (pointer: fine) {
          .cv-page,
          .cv-page * {
            cursor: auto !important;
          }
          .cv-page a,
          .cv-page button {
            cursor: pointer !important;
          }
        }
        @media (pointer: coarse) {
          .tech-cursor {
            display: none !important;
          }
        }
        @media print {
          body {
            background: #ffffff;
          }
          .cv-page {
            padding: 0;
            display: block; /* allow natural multi-page flow */
            min-height: 0;
          }
          .toolbar {
            display: none;
          }
        }
      `}</style>
      <CvLayoutSwitcher presets={visiblePresets} profilePicture={profilePicture} />
    </div>
  )
}
