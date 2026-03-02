import CvCursorVisibility from "@/components/cv-cursor-visibility"
import PrintViewportFix from "@/components/cv/print-viewport-fix"
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
      data: createCvData(p.content),
    }))

  return (
    <div className="cv-page">
      <CvCursorVisibility />
      <PrintViewportFix />
      <style>{`
        :root {
          color-scheme: light;
        }
        @page {
          size: A4;
          margin: 12mm;
        }
        body {
          background: #e5e7eb;
        }
        @media (pointer: fine) {
          .cv-page,
          .cv-page * {
            cursor: auto !important;
          }
        }
        @media (pointer: coarse) {
          .tech-cursor {
            display: none !important;
          }
        }
        .cv-page {
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          min-height: 100vh;
        }
        .toolbar {
          width: 210mm;
          max-width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        }
        .toolbar__layouts {
          display: flex;
          gap: 0;
          flex-wrap: wrap;
        }
        .toolbar__layout-btn {
          border: 1px solid #0f172a;
          background: transparent;
          color: #0f172a;
          padding: 8px 16px;
          font-size: 10pt;
          letter-spacing: 0.05em;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .toolbar__layout-btn:first-child {
          border-right: none;
        }
        .toolbar__layout-btn--active {
          background: #0f172a;
          color: #ffffff;
          font-weight: 700;
        }
        .toolbar__layout-btn:hover:not(.toolbar__layout-btn--active) {
          background: #f1f5f9;
        }
        .toolbar__button {
          border: 1px solid #0f172a;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 16px;
          font-size: 10pt;
          letter-spacing: 0.08em;
          font-weight: 600;
          cursor: pointer;
        }
        .toolbar__button:hover {
          background: #1e293b;
        }
        @media screen and (max-width: 768px) {
          .cv-page {
            padding: 12px 8px;
            gap: 12px;
          }
          .toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .toolbar__layouts {
            justify-content: center;
          }
          .toolbar__layout-btn {
            padding: 6px 12px;
            font-size: 9pt;
          }
          .toolbar__button {
            padding: 8px 12px;
            font-size: 9pt;
            text-align: center;
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
