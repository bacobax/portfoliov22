import { createRegionalPreset } from "@/lib/cv-presets"

/** Synthetic content: print checks never need a production CV or Atlas writes. */
export function professionalCvFixture() {
  const preset = createRegionalPreset({ name: "Professional layout fixture", country: "Switzerland", locale: "en", layout: "germanic_tabular" })
  preset.regionalOptions.showPhoto = false
  preset.regionalOptions.personalFields = []
  preset.regionalOptions.showSignature = false
  preset.content = {
    name: "Alex Morgan", title: "AI & Full Stack Engineer", location: "Zurich, Switzerland",
    email: "alex@example.com", phone: "+41 00 000 00 00", piva: "HIDDEN-TAX-ID",
    sections: [
      { id: "profile", title: "Profile", type: "text", placement: "main", visible: true, data: { type: "text", content: "Engineer building applied machine learning products and reliable web services. Turns research into measurable results with clear documentation and practical delivery." } },
      { id: "experience", title: "Experience", type: "log", placement: "main", visible: true, data: { type: "log", entries: Array.from({ length: 5 }, (_, i) => ({
        id: `role-${i}`, title: `Engineering role ${i + 1}`, subtitle: `Example organization ${i + 1}`, dateStart: `${2025 - i}-09`, dateEnd: i === 0 ? "Present" : `${2026 - i}-06`,
        description: "Delivered a searchable knowledge service with reliable citations, reducing manual lookup time by 32% across the pilot team.\nBuilt evaluation datasets and repeatable deployment workflows with documented ownership, monitoring and recovery procedures.\nWorked with researchers and designers to turn user feedback into clear product changes and measurable acceptance criteria.",
        tags: ["Python", "PyTorch", "AWS"], url: "https://github.com/example",
      })) } },
      { id: "skills", title: "Technical skills", type: "tags", placement: "sidebar", visible: true, data: { type: "tags", groups: [{ category: "Machine learning", items: ["PyTorch", "CLIP", "Computer vision", "Diffusion models"] }, { category: "Delivery", items: ["TypeScript", "React", "Docker", "AWS"] }] } },
      { id: "projects", title: "Selected projects", type: "log", placement: "main", visible: true, data: { type: "log", entries: [{ id: "project-one", title: "Visual research assistant", subtitle: "Independent project", dateStart: "2024-09", dateEnd: "2025-03", description: "Built an image retrieval prototype using CLIP embeddings and a lightweight review interface.\nMeasured retrieval quality against a held-out evaluation set and documented failure cases for future work.", tags: ["CLIP", "Python", "Docker"], url: "https://github.com/example" }] } },
      { id: "education", title: "Education", type: "log", placement: "main", visible: true, data: { type: "log", entries: [{ id: "degree", title: "MSc Computer Science", subtitle: "Example University", dateStart: "2020-09", dateEnd: "2022-06", description: "Specialization in machine learning and distributed systems.", tags: [] }] } },
      { id: "links", title: "Links", type: "links", placement: "sidebar", visible: true, data: { type: "links", items: [{ label: "Email", url: "alex@example.com" }, { label: "LinkedIn", url: "https://linkedin.com/in/example" }] } },
    ],
  }
  return preset
}
