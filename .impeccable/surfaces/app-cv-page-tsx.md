---
version: 1
slug: "app-cv-page-tsx"
primary_target: "app/cv/page.tsx"
related_targets: ["app/cv/edit/page.tsx","app/cv/tailor/page.tsx"]
---

## Scope

The CV tools: public viewer `/cv` (Read: a recruiter opens, reads, downloads), editor `/cv/edit` and tailor `/cv/tailor` (Operate: Francesco builds, tailors and publishes versions), plus their loading states. Only the frame around the document changes. The CV document itself (regional layouts, `components/cv/regional-layout.tsx`), the ATS print layout and every print rule stay byte-for-byte in behaviour. This world is deliberately quieter and more professional than the portfolio's Lab Notebook; it does not inherit the portfolio's paper hue, Archivo display or mono labels.

## Direction contract

THESIS: The CV is a page proof under review, and every tool lives in the proofreader's margin around it. Refuses the default resume-builder shell: coloured buttons, rounded cards inside cards, and a preview boxed like any other panel.

OWN-WORLD: A neutral proofing-booth grey board (true neutral, never cream) under a white page at true scale with hairline crop marks at its corners. Ink near-black type, cool hairline rules, square-shouldered controls (2-4px corners), one proofreader's correction red reserved for the current mark, the primary action and errors. Source Serif 4 for titles, Source Sans 3 for interface, tabular numerals for revisions and dates.

STORY: A recruiter sees the document first and can switch version or save the ATS PDF without hunting. Francesco sees what is being edited, where it lands on the page, and whether the version is saved, published or a private draft.

FIRST VIEWPORT: Public: slim masthead on the board (name in serif, version switcher as underlined text tabs, Save ATS PDF as the single ink primary), the cropped page centred below at full width available. Editor: masthead (back, title, saved revision, Content hub, Publish in red), version tabs with status, then three columns on wide screens: section list as the margin, form column of ruled slips, proof board with the live page.

FORM: Page Proof, candidate 1 of 7 on the ordered list (my pick; the roll assigned candidate 7, Timetable). seed:9ff49dfc00320f5f. Signature interaction: a red proof mark in the board margin tracks the section being edited onto its position on the live page.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- DESIGN.md currently records the portfolio world; the CV world needs its own record without erasing it.
