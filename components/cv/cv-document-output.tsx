import type { StaticImageData } from "next/image"

import type { CvData, CvLayoutId } from "./cv-types"
import { AtsPrintCvLayout } from "./ats-print-layout"
import { CvDocumentTitle } from "./cv-document-title"
import { RegionalCvLayout } from "./regional-layout"
import { cvDesignSchema } from "@/lib/cv-document"

export function CvDocumentOutput({
  layout,
  data,
  profilePicture,
}: {
  layout: CvLayoutId
  data: CvData
  profilePicture: StaticImageData
}) {
  const design = cvDesignSchema.parse(data.design ?? {})
  const printMargin = Math.max(12, design.marginMm)

  return (
    <>
      <CvDocumentTitle name={data.name} />
      <style>{`@page { size: ${design.page}; margin: ${printMargin}mm; }`}</style>
      <RegionalCvLayout layout={layout} data={data} profilePicture={profilePicture} />
      <AtsPrintCvLayout data={data} />
    </>
  )
}
