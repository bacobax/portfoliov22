# CV Docs-style editor implementation plan

> For the executing agent: use godmode:inline-execution to run this plan task by task. Steps use checkboxes for tracking.

**Goal:** an editable, paged print view in `/cv/edit` with Word-style page gaps, "Page X of N", font-size and fit-to-pages controls, and bold and italic. It must stay in sync with the existing form.

**Design:** `docs/plans/2026-11-16-cv-docs-editor-design.md`

**Architecture:**
- `AtsPrintCvLayout` gains a screen mode. The edit page renders it inside a paged proof that measures blocks (`lib/cv-pagination.ts`, a pure function) and pushes each page's first block onto a new sheet with an imperative spacer margin.
- Inline `Editable` fields write through a resolver (`lib/cv-display-edit.ts`). It maps display paths, resolved by section **id**, back to `CvPreset.content`.
- Bold and italic are stored as `**` and `*` marks, which `lib/cv-inline-marks.ts` parses and serialises.

**Stack:** Next.js (App Router) with React client components, Zod, Vitest 4 (`environment: "node"`, tests use `renderToStaticMarkup`), and Playwright with Chrome for `scripts/check-cv-print.ts`.

## Global constraints

- At 10.5 pt with no marks, the PDF text and page count match today's output.
- The PDF stays single-column, black text and ATS-safe. No raw `**` or `*` appears in any rendered output.
- A focused `Editable` owns its DOM. Incoming values never overwrite the focused field, which is the rollback fix from commit `9a4ba15`.
- Spacers and sheet decorations are screen only. In `@media print` they are reset with `!important`.
- Never call `window.print()` from browser automation.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review focus

1. **A hidden section before the edited section.** The edit must land in the right source section, because resolution is by id. Test in Task 3.
2. **Existing presets with `baseFontPt` below 10.5.** Their PDF now prints at their real size, where before it was floored at 10.5. Report this to the user at handoff, and test the clamp in Task 4.
3. **Pasting rich HTML or Word content into the page.** It must arrive as plain text. Test in Task 5.
4. **Fast typing inline while autosave responds.** There must be no rollback. Check in Chrome during Task 8.
5. **Preview zoom other than 100%.** Measurement must not depend on zoom: pixels per mm come from the measured column width. Test in Task 6.
6. **Bold at the start of a description paragraph.** It becomes a part title, which looks the same. The round-trip test is in Task 2.

## Sources

- `document.execCommand` (bold and italic): https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand. Deprecated, but supported in Chrome, Edge, Firefox and Safari. Checked 2026-11-16.
- Margins are truncated at unforced breaks, and `break-after` / `break-inside: avoid` behave as specified: https://www.w3.org/TR/css-break-3/#break-margins
- In-repo precedent: `components/cv/cv-edit-context.tsx`, `components/cv/cv-tailor-builder.tsx:110-140` (edit API), and `scripts/check-cv-print.ts` (Playwright PDF fixture).

## File map

| File | Action | Responsibility |
|---|---|---|
| `lib/cv-inline-marks.ts` | Create | Parse marks to React nodes, strip marks, marks to HTML, DOM to marks |
| `lib/cv-data-transform.ts` | Modify | `serializeCvDescription`; raw `dateStart`/`dateEnd` on display entries |
| `components/cv/cv-types.ts` | Modify | `CvDisplayLogEntry.dateStart?` and `dateEnd?` |
| `lib/cv-display-edit.ts` | Create | Map a display-path edit to an updated `CvPreset` |
| `lib/cv-document.ts` | Modify | `targetPages` in the design schema |
| `components/cv/ats-print-layout.tsx` | Modify | Screen mode, `em` heading sizes, 9–13 pt clamp, keep-lines-together, Editables, marks |
| `components/cv/cv-edit-context.tsx` | Modify | `rich` Editable mode |
| `components/cv/regional-layout.tsx` | Modify | Render marks and use `rich` mode in prose fields |
| `lib/cv-pagination.ts` | Create | Pure page-break and spacer computation |
| `components/cv/cv-paged-proof.tsx` | Create | Measure the DOM, apply spacers, draw sheets, report pages and the caret's page |
| `components/cv/cv-docs-toolbar.tsx` | Create | A−/A+, B/I, Page X of N, fit target, Shrink to fit |
| `app/cv/edit/page.tsx` | Modify | Print/Design toggle, edit provider and resolver, toolbar wiring |
| `scripts/check-cv-print.ts` | Modify | Compare the measured page count and page starts with the PDF at 9, 10.5 and 12 pt |
| `tests/cv-inline-marks.test.ts`, `tests/cv-display-edit.test.ts`, `tests/cv-pagination.test.ts`, `tests/cv-ats-screen.test.tsx` | Create | Unit and component tests |

---

### Task 1: Inline marks library

**Files:** create `lib/cv-inline-marks.ts` and `tests/cv-inline-marks.test.ts`.

**Covers:** the bold and italic acceptance criterion (storage and rendering).

**Produces:**
- `parseMarks(text: string): ReactNode[]`. `**x**` becomes `<strong>`, `*x*` becomes `<em>`. Unbalanced markers stay literal. Elements get stable keys.
- `stripMarks(text: string): string`
- `marksToHtml(text: string): string`. HTML-escapes the text, then uses `<strong>` and `<em>`.
- `interface MarkNode { nodeType: number; nodeName: string; textContent: string | null; childNodes: ArrayLike<MarkNode> }`
- `domToMarks(root: MarkNode): string`. Keeps text, wraps `B`/`STRONG` in `**` and `I`/`EM` in `*`, turns `BR` and block `DIV`/`P` boundaries into `\n`, and drops any other tag but keeps its text. Adjacent identical marks merge (`**a****b**` becomes `**ab**`).

- [ ] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement, Fragment } from "react"
import { domToMarks, marksToHtml, parseMarks, stripMarks, type MarkNode } from "@/lib/cv-inline-marks"

const html = (t: string) => renderToStaticMarkup(createElement(Fragment, null, ...parseMarks(t)))
const text = (s: string): MarkNode => ({ nodeType: 3, nodeName: "#text", textContent: s, childNodes: [] })
const el = (name: string, ...kids: MarkNode[]): MarkNode => ({ nodeType: 1, nodeName: name, textContent: null, childNodes: kids })

describe("inline marks", () => {
  it("renders bold and italic", () => {
    expect(html("Led **10** people *remotely*")).toBe("Led <strong>10</strong> people <em>remotely</em>")
  })
  it("keeps unbalanced markers literal", () => { expect(html("a ** b")).toBe("a ** b") })
  it("escapes HTML", () => { expect(marksToHtml("<b>x</b> **y**")).toBe("&lt;b&gt;x&lt;/b&gt; <strong>y</strong>") })
  it("strips marks", () => { expect(stripMarks("**a** and *b*")).toBe("a and b") })
  it("serialises DOM to marks, dropping unknown tags", () => {
    expect(domToMarks(el("SPAN", text("Led "), el("B", text("10")), text(" "), el("FONT", el("I", text("x")))))).toBe("Led **10** *x*")
  })
  it("merges adjacent marks", () => { expect(domToMarks(el("SPAN", el("B", text("a")), el("STRONG", text("b"))))).toBe("**ab**") })
  it("round-trips", () => { const s = "x **y** *z*"; expect(stripMarks(s)).toBe("x y z"); expect(html(s)).toContain("<strong>y</strong>") })
})
```

- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run tests/cv-inline-marks.test.ts`. Expected: FAIL, because `@/lib/cv-inline-marks` cannot be resolved.

- [ ] **Step 3: Implement the five exports above.** Tokenise with `/(\*\*[^*\n]+?\*\*|\*[^*\s][^*\n]*?\*)/`. A `*` followed by a space is not italic, so bullet syntax is safe.

- [ ] **Step 4: Run them and confirm they pass.** Same command. Expected: PASS, 7 tests.

- [ ] **Step 5: Commit** with the message `Add inline bold/italic marks for CV text`.

### Task 2: Description serialiser and raw dates

**Files:**
- Modify `lib/cv-data-transform.ts`: add after `parseCvDescription` (around line 32), and change the log mapping at lines 86-95.
- Modify `components/cv/cv-types.ts:9-18`.
- Test: append to `tests/cv-inline-marks.test.ts` (a new `describe`).

**Produces:**
- `serializeCvDescription(blocks: CvDescriptionBlock[]): string`
  - A paragraph becomes `**title** text`, or just `text` when it has no title.
  - Bullets become `- item` lines.
  - Blocks are joined with `"\n\n"`.
  - Empty paragraphs and empty bullet items are dropped.
- `CvDisplayLogEntry.dateStart?: string` and `dateEnd?: string`, the raw source values, always set by `transformSectionData`.

- [ ] **Step 1: Write the failing tests.**

```ts
import { parseCvDescription, serializeCvDescription, createCvData } from "@/lib/cv-data-transform"
describe("description round-trip", () => {
  const samples = ["Plain prose\nsecond line", "**Role** did things\n- a\n- b", "- x\n\n- y", "**Lead** text\n\nOther para", "Led **10** people"]
  it.each(samples)("parse∘serialize is stable for %j", (s) => {
    const blocks = parseCvDescription(s)
    expect(parseCvDescription(serializeCvDescription(blocks))).toEqual(blocks)
  })
  it("bold at paragraph start becomes a part title", () => {
    expect(parseCvDescription(serializeCvDescription([{ type: "paragraph", text: "**Led** team" }]))[0]).toMatchObject({ title: "Led" })
  })
  it("exposes raw dates", () => {
    const data = createCvData({ sections: [{ id: "e", title: "E", type: "log", placement: "main", visible: true, data: { type: "log", entries: [{ id: "1", title: "T", subtitle: "", dateStart: "2020", dateEnd: "Present", description: "", tags: [] }] } }] } as never)
    expect(data.sections[0].content).toMatchObject({ entries: [{ dateStart: "2020", dateEnd: "Present" }] })
  })
})
```

- [ ] **Step 2: Confirm they fail.** Run `npx vitest run tests/cv-inline-marks.test.ts`. Expected: FAIL, "serializeCvDescription is not a function".
- [ ] **Step 3: Implement both changes.**
- [ ] **Step 4: Confirm they pass**, then run `npm test`. Expected: all tests pass.
- [ ] **Step 5: Commit** with the message `Serialize CV description blocks and expose raw entry dates`.

### Task 3: Display-edit resolver

**Files:** create `lib/cv-display-edit.ts` and `tests/cv-display-edit.test.ts`.

**Covers:** inline edits writing to the right source field, for every row of the design's field-mapping table.

**Interfaces:**
- Consumes `serializeCvDescription` and `parseCvDescription` (Task 2), and `splitList` from `lib/cv-tailor.ts`.
- Produces three functions:
  - `applyDisplayEdit(preset: CvPreset, data: CvData, path: CvPath, value: unknown): CvPreset`
  - `insertDisplayBullet(preset, data, itemsPath: CvPath, index: number): CvPreset`
  - `removeDisplayBullet(preset, data, itemsPath: CvPath, index: number): CvPreset`

  `data` is the `CvData` snapshot that was rendered. A path that doesn't resolve returns `preset` unchanged (same reference).

**Path mapping** (display path → source):

| Display path | Source written |
|---|---|
| `["name"]` | `content.name` |
| `["title"]` | `targetRoleOverride` if it is non-empty, otherwise `content.title` |
| `["sections", i, "title"]` | the section where `id === data.sections[i].id`: `title`, with `titleMode: "custom"` |
| `[…, "content", "entries", j, "title" \| "subtitle" \| "dateStart" \| "dateEnd"]` | `entries[j][field]` |
| `[…, "content", "entries", j, "tags"]` | `entries[j].tags = value` (already an array, from list mode) |
| `[…, "content", "entries", j, "description", b, …rest]` | parse, then `setAtPath(blocks, [b, …rest], value)`, then serialise |
| `[…, "content", "text"]` | `data.content` |
| `[…, "content", "groups", g, "category" \| "items"]` | `groups[g][field]` |
| `[…, "content", "items", k]` for `simple-list` | `items[k]` |

- [ ] **Step 1: Write the failing tests.** Build a preset with `[hidden "a", visible "exp" (log), visible "skills" (tags), visible "profile" (text)]`, and set `data = createCvData(preset.content, preset)`. Then assert:
  - `["sections", 0, "content", "entries", 0, "title"]` set to `"New"` changes the **`exp`** entry. This is the hidden-section case.
  - `["title"]` with `targetRoleOverride: "X"` changes the override and leaves `content.title` alone.
  - Editing the description block `[...,"description",1,"items",0]` changes only that bullet, so `parseCvDescription` on the result shows the new item.
  - `insertDisplayBullet` at index 1 adds `""` and the serialised text keeps the other items. `removeDisplayBullet` removes the item.
  - Editing a section title sets `titleMode` to `"custom"`.
  - An unknown path returns the same `preset` reference (`toBe`).
- [ ] **Step 2: Confirm they fail.** Run `npx vitest run tests/cv-display-edit.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement the three functions**, using structural copies (no mutation).
- [ ] **Step 4: Confirm they pass.** Expected: PASS, at least 6 tests.
- [ ] **Step 5: Commit** with the message `Map inline CV edits back to source content`.

### Task 4: ATS layout screen mode, scaling and print rules

**Files:**
- Modify `lib/cv-document.ts:5-28`: add `targetPages: z.number().int().min(1).max(6).optional()`.
- Modify `components/cv/ats-print-layout.tsx`: line 131 (font size), line 128 (signature), lines 172-205 (styles).
- Test: `tests/cv-ats-screen.test.tsx`.

**Produces:** `AtsPrintCvLayout({ data, screen = false }: { data: CvData; screen?: boolean })`.

**Pinned values:**
- `fontSize = Math.min(13, Math.max(9, design.baseFontPt))`.
- The rules move from `@media print { .ats-print-cv … }` to a shared rule set scoped to `.ats-doc`. That rule set is emitted once for `@media print` (selector `.ats-print-cv`) and once for the screen (selector `.ats-print-cv--screen`). On screen, `.ats-print-cv:not(.ats-print-cv--screen)` stays `display: none`.
- In print, when a screen instance is present, the non-screen ATS copy is hidden, so only one copy prints. Use `body:has(.ats-print-cv--screen) .ats-print-cv:not(.ats-print-cv--screen) { display: none !important }`.
- Headings: h1 `1.9048em`, `.ats-header__role` `1.1429em`, h2 `1.2381em`, h3 `1.0476em`. These equal 20, 12, 13 and 11 pt at 10.5 pt.
- Add `p, li { break-inside: avoid; page-break-inside: avoid; }`.
- Print reset: `[data-cv-page-start] { margin-top: <original> !important }`. Implement this as a `--cv-spacer` custom property used only by the screen selector, so the print rules never read it.
- Render `parseMarks` in description text, bullets and text sections. `screen` sets the class `ats-print-cv--screen` and `data-cv-output="ats-screen"`.

- [ ] **Step 1: Write the failing tests** (`renderToStaticMarkup` with `professionalCvFixture()`):
  - `screen` adds `ats-print-cv--screen`.
  - The default render does not add it.
  - `baseFontPt: 7` renders `--ats-font-size:9pt`.
  - `baseFontPt: 10` renders `10pt`.
  - A description of `"Led **10**"` renders `<strong>10</strong>` and no `**`.
  - The style string contains `break-inside:avoid` for `p`.
  - `cvDesignSchema.parse({ targetPages: 2 }).targetPages === 2`, and `targetPages: 0` is rejected.
- [ ] **Step 2: Confirm they fail.** Run `npx vitest run tests/cv-ats-screen.test.tsx`. Expected: FAIL on the screen-class assertion.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Confirm they pass**, then run `npm test`. Expected: all pass. Existing `cv-layout` and `cv-templates` tests must still pass. If one asserts `10.5pt` for a smaller design value, update it, because the design deliberately changes that behaviour.
- [ ] **Step 5: Commit** with the message `ATS CV: screen mode, scalable type, keep lines together`.

### Task 5: Rich Editable mode and marks in the layouts

**Files:**
- Modify `components/cv/cv-edit-context.tsx:36-152`.
- Modify `components/cv/regional-layout.tsx:77-78`, `:102` and the bullet `Editable`s.
- Modify `components/cv/ats-print-layout.tsx`: the `AtsLogEntry` and `AtsSection` text nodes.
- Test: `tests/cv-ats-screen.test.tsx` (append).

**Produces:**
- `EditableMode` gains `"rich"` (multiline) and `"rich-bullet"` (bullet behaviour plus marks).
- **Without a provider**, a rich mode renders `parseMarks(value)`.
- **With a provider**, it renders `contentEditable="true"` and uses `marksToHtml` for its initial HTML (`dangerouslySetInnerHTML` at mount) and for its layout-effect sync, which sets `innerHTML` only when the field is not focused.
- `read()` uses `domToMarks(ref.current)` and trims.
- `onPaste` does `preventDefault` and inserts `clipboardData.getData("text/plain")` with `document.execCommand("insertText")`.
- Cmd/Ctrl+B and Cmd/Ctrl+I call `document.execCommand("bold" | "italic")` and then `commit()`.
- Exported helper: `applyMark(kind: "bold" | "italic"): void`. The toolbar calls it. It runs `execCommand` on the current selection when the selection is inside a `.cv-editable[data-rich]`, then dispatches an `input` event on that field.
- ATS screen mode wraps these fields in `Editable`:
  - name and role: `line`
  - section title: `line`
  - entry title and subtitle: `line`
  - `dateStart` and `dateEnd`: `line`, rendered as `start – end` inside the date paragraph when screen mode has a provider
  - description text: `rich`
  - bullets: `rich-bullet`
  - tags: `list`
  - text section: `rich`
  - group category: `line`
  - group items: `list`

  Links, contact, personal details and the footer stay plain. Use the same `CvPath` shapes as the Task 3 mapping table.

- [ ] **Step 1: Write the failing tests:**
  - With no provider, `RegionalCvLayout` renders `<strong>` for a marked description.
  - With a provider, ATS screen mode renders `contenteditable="true"` and `data-rich` on the description, and `contenteditable="plaintext-only"` on the entry title.
  - With a provider, `data-cv-path="sections.0.content.entries.0.dateStart"` is present.
  - Links are not editable: the `a` inside `.ats-contact` has no ancestor with `contenteditable`.
- [ ] **Step 2: Confirm they fail.** Run `npx vitest run tests/cv-ats-screen.test.tsx`. Expected: FAIL on `data-rich`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Confirm they pass**, then run `npm test`. Expected: all pass, including `tests/cv-tailor.test.tsx`.
- [ ] **Step 5: Commit** with the message `Rich inline editing with bold/italic marks`.

### Task 6: Pagination algorithm

**Files:** create `lib/cv-pagination.ts` and `tests/cv-pagination.test.ts`.

**Produces:**

```ts
export interface MeasuredBlock { top: number; height: number; keepWithNext: boolean } // px, spacer-free, relative to the content column top
export interface PageLayout { pageContentPx: number; marginPx: number; gapPx: number }
export interface Pagination { pageCount: number; breaks: { blockIndex: number; spacerPx: number }[]; oversized: number[]; overflowPx: number }
export function paginate(blocks: MeasuredBlock[], layout: PageLayout, targetPages?: number): Pagination
export function pageOfBlock(p: Pagination, blockIndex: number): number // 1-based
export function pxPerMm(columnWidthPx: number, columnWidthMm: number): number
```

**Rules:**
- A page starts at the top of its first block, because margins at a break are truncated.
- Block `b` fits when `b.top + b.height − pageStart ≤ pageContentPx`.
- If it doesn't fit, the break goes before `b`. Then walk back while the previous block has `keepWithNext` and isn't the page's first block.
- A block taller than `pageContentPx` gets its index added to `oversized`. It starts a page and is not pushed again.
- `spacerPx = (pageStart + pageContentPx − breakBlock.top) + 2·marginPx + gapPx`.
- `overflowPx` is the sum of content heights on pages beyond `targetPages`, or 0 when no target is set.

- [ ] **Step 1: Write the failing tests.** With `layout = { pageContentPx: 100, marginPx: 10, gapPx: 12 }`:
  - Three blocks of height 40 at tops 0, 45 and 90 give 2 pages, with a break before block 2 and `spacerPx = (0+100−90)+20+12 = 42`.
  - A block ending exactly at 100 fits.
  - A heading (`keepWithNext`) at top 80 and height 10, followed by a paragraph at 92 with height 20, breaks before the heading.
  - A block with height 250 is oversized and the page count is 2. It starts on page 1, and the next block starts page 2 after it.
  - `targetPages: 1` on two pages gives `overflowPx > 0`.
  - `pxPerMm(793.7, 210)` is ≈ 3.7795, and `pxPerMm(396.85, 210)` is ≈ 1.8898 (the 50%-zoom case).
  - `pageOfBlock` returns 2 for block 2.
  - An empty block list gives `pageCount: 1` and no breaks.
- [ ] **Step 2: Confirm they fail.** Run `npx vitest run tests/cv-pagination.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Confirm they pass.** Expected: PASS, 8 tests.
- [ ] **Step 5: Commit** with the message `Add CV page-break computation`.

### Task 7: Paged proof component

**Files:** create `components/cv/cv-paged-proof.tsx`.

**Interfaces:**
- Consumes `paginate`, `pageOfBlock` and `pxPerMm` (Task 6), and `AtsPrintCvLayout screen` (Task 4).
- Produces `CvPagedProof({ data, onPagination }: { data: CvData; onPagination: (state: { pageCount: number; caretPage: number | null; overflowPx: number; linePx: number; oversized: number }) => void })`.

**Behaviour:**
- Render `<style>@page { size; margin }</style>`, then a `.cv-paged-proof` wrapper containing absolutely positioned `.cv-sheet` divs (white with a shadow, one per page, at `top = i·(sheetPx + gapPx)`), then the ATS screen layout. The layout is padded by `marginPx` so its text sits inside sheet 1.
- **Blocks** are the direct leaf blocks in document order:
  - `.ats-header` and `.ats-footer` are atomic
  - `ul.ats-inline-list` is atomic
  - otherwise `h2`, `h3`, `p` and `li`
  - `keepWithNext` is set on `h2`, `h3`, `.ats-entry__subtitle` and `.ats-entry__date`
- **Measure:**
  1. Clear every `--cv-spacer` (remove the attribute `data-cv-page-start`).
  2. Read the rects relative to the column top.
  3. Compute `pxPerMm` from the column's rect width against `pageWidthMm − 2·margin`.
  4. Call `paginate`.
  5. Set `data-cv-page-start` and `style.setProperty("--cv-spacer", px)` on each break block.
  6. Write `data-cv-page-count` on the wrapper. The Task 9 check reads it.
- Re-measure on a `ResizeObserver`, a `MutationObserver` (`childList`, `subtree`, `characterData`, **not** attributes), and `document.fonts.ready`, coalesced to one `requestAnimationFrame`.
- **Caret page:** on `selectionchange`, take the block containing `anchorNode` and use `pageOfBlock`. The result is `null` when the selection is outside the proof.
- `linePx = fontPt · 1.42 · (96/72) · zoomRatio`.
- If the column width is 0, call `onPagination` with `pageCount: 0`. The toolbar shows "–".

- [ ] **Step 1:** No unit test, because the DOM is required. Verify with Claude in Chrome during Task 8.
- [ ] **Step 2:** Run `npx tsc --noEmit -p .`. Expected: no new errors in the changed files.
- [ ] **Step 3: Commit** with the message `Add paged CV proof with Word-style page gaps`.

### Task 8: Toolbar and edit-page wiring

**Files:**
- Create `components/cv/cv-docs-toolbar.tsx`.
- Modify `app/cv/edit/page.tsx`:
  - the state block around lines 129-142
  - the proof header and scaler at lines 1266-1291
  - a `useMemo` edit API next to `updatePresetMetadata` (line 595)

**Produces:** `CvDocsToolbar({ design, pagination, onDesign, onMark }: { design: CvDesign; pagination: …; onDesign: (d: CvDesign) => void; onMark: (k: "bold" | "italic") => void })`

The toolbar contains:
- `A−`/`A+`, each ±0.5 within 9–13, with the pt value shown.
- A "small for ATS/readability" note when the size is below 10.
- **B** and **I** buttons. They use `onMouseDown={e => e.preventDefault()}` so the selection is kept.
- `Page X of N`, or `N pages` when there is no caret.
- A "Fit to [n] pages" number input from 1 to 6, empty for unset, stored in `design.targetPages`.
- A status: `✓ Fits` or `Over by ~K lines`, where `K = ceil(overflowPx / linePx)`.
- A **Shrink to fit** button. It is disabled with no target or when the CV already fits. It sets the `fitting` state. While fitting, each new pagination result lowers `baseFontPt` by 0.5 if the CV is still over target and above 9. It stops when the CV fits or reaches 9. At 9 and still over, it shows `Still N pages at 9 pt — trim content or spacing`.

**Edit page:**
- `proofView: "print" | "design"` state, defaulting to `"print"`, with a two-button toggle in the proof header.
- Print view renders `<CvEditProvider api={editApi}><CvPagedProof … /></CvEditProvider>` inside the existing `CvScaleToFit`. Design view renders today's `CvDocumentOutput`.
- `editApi` methods:
  - `set`, `insertBullet` and `removeBullet` call `updatePresetMetadata(activePresetId, p => applyDisplayEdit(p, previewDataRef.current, path, value))`
  - `swap`, `move`, `hideEntry` and `addBullet` are no-ops
  - `hideSection(i)` toggles the matching section's visibility by id
  - `focusKey`/`clearFocus` use state, as in tailor
- `previewDataRef` holds the `previewData` that was rendered.
- Toolbar `onDesign` uses `updatePresetMetadata(id, p => ({ ...p, design }))`, the same call as `CvDesignPanel` at line 1082.
- Clicks on links inside the print proof are suppressed, as in tailor at `cv-tailor-builder.tsx:268-272`.

- [ ] **Step 1:** Implement, then run `npx tsc --noEmit -p .` and `npm test`. Expected: no new type errors, and all tests pass.
- [ ] **Step 2: Chrome feedback loop.** Run `npm run dev` in the background and open `/cv/edit` in a new tab. Verify with screenshots:
  1. separate sheets with gaps, and the page count
  2. typing in a description: text appears and the form textarea updates, with no rollback while typing fast for about 5 seconds
  3. editing the form updates the page
  4. Enter and Backspace on bullets
  5. B and I and the keyboard shortcuts
  6. pasting HTML gives plain text
  7. A+/A− and the page count changing
  8. Fit to 1 page, then Shrink to fit
  9. the Print/Design toggle
  10. zoom at 50% keeps the same page count
  11. width 390 px

  Check console errors with the pattern `error|warn` and record a GIF called `cv-docs-editor.gif`. Fix what's wrong, then re-check.
- [ ] **Step 3: Commit** with the message `Docs-style CV editing: paged print view, toolbar, inline edits`.

### Task 9: Print-accuracy check

**Files:** modify `scripts/check-cv-print.ts`. Add a loop near the PDF generation at around line 49, plus a helper after `assertAtsPdf`.

**Behaviour:** for `baseFontPt` in `[9, 10.5, 12]`:
1. Set the fixture state's design.
2. Load `/cv/edit` in print view.
3. Wait for `[data-cv-page-count]`.
4. Read the count, and the first 30 characters of `textContent` of each `[data-cv-page-start]` block.
5. `page.pdf(...)`.
6. Extract the pages with `extractPdfText`.
7. Assert that `pdf.pages.length === count`, and that for each page `k ≥ 2`, `pages[k-1]` normalised begins with the expected start text normalised (whitespace collapsed).

On a mismatch, throw `Error("page mismatch at <pt>pt: proof <n> vs pdf <m>")`.

- [ ] **Step 1:** Implement, then run `npm run dev` (port 3001: `npx next dev -p 3001`) and `npx tsx scripts/check-cv-print.ts`. Expected: it exits 0, with the existing checks plus `page parity ok at 9/10.5/12pt`. On a mismatch, fix the block rules in Task 7 (the `godmode:fault-diagnosis` order applies) and rerun.
- [ ] **Step 2: Commit** with the message `Check proof page parity against generated PDF`.

---

## Acceptance criteria → tasks

| Criterion (from the design) | Tasks |
|---|---|
| Page count and page starts match the PDF at 9, 10.5 and 12 pt | 6, 7, 9 |
| "Page X of N" follows the caret | 7, 8 (Chrome) |
| A+/A− at 0.5 pt within 9–13, followed by the PDF | 4, 8 |
| Shrink to fit, or stop at 9 pt with the message | 8 |
| Inline and form sync, no rollback | 3, 5, 8 |
| B, I and the shortcuts; no raw asterisks anywhere | 1, 4, 5, 8 |
| 10.5 pt PDF unchanged | 4, 9 |
| Links, contact and personal details not inline-editable | 5 |
