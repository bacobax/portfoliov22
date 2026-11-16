# CV Docs-style editor design

Date: 2026-11-16. Status: draft, awaiting the user's approval.

## Intent

Make `/cv/edit` feel like Google Docs. While editing a CV, the user should be able to:

1. See the real printed pages and which page the cursor is on.
2. Raise or lower the text size to fit the CV into a target number of pages.
3. Use bold and italic.
4. Type directly on the page, as in tailor mode.

Success means that the page count and page breaks shown while editing match what **Save ATS PDF** produces, and that the user can fit a CV to N pages without exporting repeatedly.

## Goals, non-goals, anti-goals

- **Goals:**
  - An editable print view, split into pages.
  - A "Page X of N" indicator.
  - A font-size toolbar with a target page count.
  - Bold and italic.
  - Inline edits that stay in sync with the existing form.
- **Non-goals:**
  - Free per-word colour, font family or size (rejected in rationale, option B).
  - Editing the styled ("design") view inline.
  - Removing the left form editor (the user chose to keep both, option 2).
- **Anti-goals (failure even if it works):**
  - The page count on screen differs from the PDF.
  - Inline typing loses text or rolls it back (see commit `9a4ba15`).
  - The PDF stops being ATS-safe.
  - Raw `**` markers leak into the printed output.

## Constraints

- The PDF is produced by `window.print()` of `AtsPrintCvLayout` (`components/cv/ats-print-layout.tsx`). Its styles are currently inside `@media print` only, so it is hidden on screen.
- The page size is `design.page` (A4 or Letter). The margin is `max(12, design.marginMm)` mm (`components/cv/cv-document-output.tsx`).
- The editor stores `CvContent` (the source). The preview is derived from it by `createCvData` (`lib/cv-data-transform.ts`), and that conversion is lossy:
  - start and end dates are merged into one string
  - descriptions are parsed into parts
  - labels pass through `formatLabel`
  - hidden sections are filtered out
- Inline editing already exists as `Editable` and `CvEditProvider` (`components/cv/cv-edit-context.tsx`). It addresses fields by `CvData` paths, which works in tailor mode because tailor edits `CvData` directly.
- Chrome and Edge are the target browsers for printing. The print help text already assumes the Chrome print dialog.

## Approach

**Chosen: an editable, paged print view on the existing PDF layout.**

The ATS layout gets a screen mode. Edit mode renders it at real paper width, splits it into pages by measuring it, and makes its text editable through a source-mapping edit API.

Rejected:
- **Editing the styled preview while counting pages from the hidden PDF layout.** The break lines would only be approximate.
- **Printing the styled layout.** This breaks the ATS-safe export.
- **Paged.js or a similar polyfill that re-chunks the DOM into pages.** It rewrites the DOM, which conflicts with React-owned `contentEditable` and the caret.

## Design

### 1. Print view on screen

- Move the ATS rules out of `@media print` into a scoped class, `.ats-doc`. Print keeps applying it. On screen it applies when the edit page renders `<AtsPrintCvLayout screen />`. Print output stays the same at default settings.
- Heading sizes become `em` ratios of the body size (20/10.5, 13/10.5, 12/10.5 and 11/10.5). At 10.5 pt the PDF is identical to today, and smaller sizes scale the whole document.
- Remove the 10.5 pt floor. The new range is **9–13 pt**. Below 10 pt the toolbar shows "small for ATS/readability". *Agent's call: the floor existed for readability, so I keep a warning rather than a hard limit. Veto if you want 10 pt as the minimum.*
- The proof pane gains a **Print view / Design view** toggle. Print view is the default and is editable. Design view is today's styled preview and stays read-only.

### 2. Pagination (measured, never re-chunked)

- The content column is `pageWidth − 2·margin` wide. The printable height is `pageHeight − 2·margin`.
- `lib/cv-pagination.ts` is a pure function. It takes a list of measured blocks and returns break positions. A block is a heading, paragraph, list item, header or footer, given as `{ top, height, lineBoxes[], keepWithNext, avoidInside }`. It follows the same rules the print CSS declares:
  - `break-after: avoid` on h2, h3, subtitle and date keeps them with the next block
  - the header and footer are never split
  - paragraphs and list items split between lines, with orphans and widows of 2
- `usePagination(ref)` measures with `getBoundingClientRect` and `Range.getClientRects` for line boxes. It re-runs on a `ResizeObserver`, a `MutationObserver` and `document.fonts.ready`, debounced to one animation frame.
- **Display:** a continuous white sheet with a page-gap band drawn over it at each break ("Page 2"). A band only ever sits between line boxes, so no text is hidden. Page sheets end at the printable height, with the margin drawn above and below. *Agent's call: true separate sheets would need extra spacing inserted inside React-owned paragraphs, so the bands are the safe Docs-like look.*
- **"Page X of N":** the page holding the caret, read from `selectionchange`. Without a caret, it is the page at the centre of the viewport.

### 3. Toolbar (sticky, above the proof)

The toolbar contains:
- `A−` and `A+` (steps of 0.5 pt) with the current pt value.
- **B** and **I**.
- `Page X of N`.
- A target page count ("Fit to [2] pages"), shown as a ✓ or as "over by ~K lines".
- A **Shrink to fit** button. It steps `baseFontPt` down by 0.5 pt until the measured count is at or under the target, and never goes below 9 pt. If 9 pt still doesn't fit, it stops and says so.

The target page count is saved in `design.targetPages`, an optional integer from 1 to 6. It is a new optional field, so no migration is needed.

### 4. Inline editing mapped to the source

- `createCvData` gains an optional `withSource` flag. With it, each display string carries a source reference: `{ sectionId, entryId?, field, partIndex? }`. References use **IDs, not indices**, so filtering out hidden sections can't misroute an edit.
- `Editable` accepts `source` as well as `path`. The edit page's `CvEditApi.set` resolves the source reference into an immutable update of `CvContent`, using the same updater the form uses. This keeps one source of truth, and the form re-renders from it.
- Field mapping:

  | Display field | Source written |
  |---|---|
  | name, role | `cv.name`, or `targetRoleOverride` if set, otherwise `cv.title` |
  | section title | `section.title`, and sets `titleMode: "custom"` |
  | entry title, subtitle | `entry.title`, `entry.subtitle` (raw, so the user edits the source text and display formatting still applies) |
  | dates | two inline fields, `dateStart` and `dateEnd`, shown with a separator |
  | description part or bullet | the part is edited, then the whole description is rebuilt with `serializeDescriptionParts` |
  | text section, summary | `data.content`, or `summaryOverride` if set |
  | tags, skills | the comma list, using `splitList` like tailor mode |
  | links, contact, personal details | **not editable inline** (stays in the form) |

  *Agent's call: links and personal fields are structured, so they stay form-only.*
- Enter adds a new bullet and Backspace on an empty bullet removes it, reusing the existing `insertBullet` and `removeBullet` behaviour.
- **Sync rule** (the one that prevents rollbacks): a focused `Editable` owns its DOM text, as it does today. Form inputs bound to the same field update from state, and the field being typed in is never overwritten by its own echo.

### 5. Bold and italic

- They are stored as light marks in existing strings: `**bold**` and `*italic*`. The schema stays the same and the tailor agent and fact-checker can read them.
- Allowed only in description parts, bullets, text sections and the summary. Titles, dates and names stay plain. *Agent's call.*
- `lib/cv-inline-marks.ts` provides `parseMarks(text)` (to React nodes) and `stripMarks(text)` (for the document title, PDF filename and quality checks). Every layout renders through `parseMarks`, so the public `/cv`, the design view and the PDF all show real bold and italic, never raw asterisks.
- **Editing:** mark-enabled `Editable` fields switch from `plaintext-only` to `contentEditable="true"`. Cmd/Ctrl+B and Cmd/Ctrl+I, plus the toolbar buttons, use `document.execCommand("bold" | "italic")`. `execCommand` is deprecated but still supported in all browsers, and it is what most lightweight editors use for simple marks. On commit, the DOM is serialised back to marks, keeping only text, `b`/`strong` and `i`/`em`. Paste is forced to plain text.
- The form's textareas show the raw `**` marks. That's acceptable because the form is the power-user view.

### Error handling

- If measuring fails (fonts not ready, zero width), the page count shows "–" and no bands are drawn, rather than wrong numbers.
- A source reference that no longer resolves (for example, its entry was deleted in the form) makes the edit a no-op and logs it.
- Unknown HTML from a paste is dropped to plain text.

### Testing

- **Unit tests (vitest):**
  - the pagination algorithm on synthetic blocks: keep-with-next, splitting between lines, orphans and widows, header never split, exact-fit boundary
  - `parseMarks`, `stripMarks` and the DOM-to-marks serialiser round-trip
  - resolving source references to `CvContent` for each field-mapping row, including a hidden section placed before the edited one
- **Component tests:** typing in an inline field updates the form value and the reverse, with no rollback. Enter and Backspace manage bullets.
- **Visual feedback loop (Claude in Chrome):** after each UI task, run `npm run dev`, open `/cv/edit` in a new Chrome tab and check the work by screenshot and DOM reads. Check:
  - the toolbar layout
  - the page bands and "Page X of N" while typing
  - A+/A− and Shrink to fit
  - B and I
  - form and inline sync
  - the Print and Design toggle
  - narrow and mobile widths, using resize

  Read console errors with a filtered pattern, and record a GIF of the key flows for review. Never trigger `window.print()` from automation, because the print dialog blocks the extension. PDF accuracy is checked by the Playwright script instead.
- **Print-accuracy check:** extend `scripts/check-cv-print.ts`, which uses Playwright and pdfjs. For the fixture CV at 9, 10.5 and 12 pt, compare the measured page count and the first words of each page with the generated PDF. They must match.

## Specification

### Inputs

| Input | Type | Constraints | Default |
|---|---|---|---|
| `design.baseFontPt` | number | 9–13, step 0.5 | 10.5 |
| `design.targetPages` | integer, optional | 1–6 | unset (no fit indicator) |
| Inline text edit | string | marks only in mark-enabled fields | n/a |
| B / I command | toggle | mark-enabled field focused, with a selection | n/a |

### Outputs

| Case | Result |
|---|---|
| Normal edit | `CvContent` is updated, the form and both views re-render, and autosave runs as today |
| Measurement ready | bands at the breaks, plus "Page X of N" |
| Measurement not ready | "–" and no bands |
| Shrink to fit succeeds | `baseFontPt` is lowered and the count is at or under the target |
| Shrink to fit can't reach the target at 9 pt | stops at 9 pt with the message "Still N pages at 9 pt: trim content or spacing" |

### Edge cases

| Case | Expected behaviour |
|---|---|
| Empty CV or empty section | 1 page, empty fields show their placeholder |
| Paragraph longer than a page | splits across pages between lines |
| Heading as the last line of a page | moves to the next page with its content |
| Hidden section before the edited one | the edit lands in the correct section (ID-based) |
| Same field focused inline while the form changes it | the inline DOM keeps the user's text and the commit wins |
| Paste of rich HTML | inserted as plain text |
| Unbalanced `**` in stored text | rendered literally, never crashes |
| Letter paper or 30 mm margins | measurements use the active page size and margin |
| Switching presets | pagination resets and the target is per preset |

### Acceptance criteria

- [ ] For the fixture CV at 9, 10.5 and 12 pt, the measured page count equals the PDF page count, and each page starts with the same text (print-accuracy check).
- [ ] "Page X of N" shows the caret's page within one frame of the caret moving.
- [ ] A+ and A− change `baseFontPt` by 0.5 within 9–13, and the PDF follows them, including values below 10.5.
- [ ] Shrink to fit reaches the target where 9 pt allows, otherwise stops at 9 pt with the message.
- [ ] Typing inline in each field-mapping row updates the matching form field, and editing the form updates the page, with no rollback while typing.
- [ ] Cmd/Ctrl+B, Cmd/Ctrl+I and the toolbar buttons produce `**`/`*` in storage, and bold or italic, never raw asterisks, in the print view, design view, PDF and public `/cv`.
- [ ] At 10.5 pt with no marks, the PDF text and page count match today's output for the fixture.
- [ ] Links, contact and personal fields are not editable inline.

### Out of scope

- Per-word colour, font or size, and highlight.
- Inline editing in the design view.
- Undo and redo beyond the browser's native per-field undo.
- Line-height and spacing controls in the toolbar (they stay in the design panel).

## Decisions

- **User:** option B from rationale (smaller version).
- **User:** keep the form next to an editable page (option 2).
- **User:** the reference pages are the printed PDF layout (A).
- **Agent's call:** a 9 pt minimum with a warning, removing the 10.5 pt floor.
- **Agent's call:** page-gap bands on one sheet, not separate sheet elements.
- **Agent's call:** the design view stays read-only.
- **Agent's call:** marks only in prose fields.
- **Agent's call:** links and personal fields stay form-only.
- **Agent's call:** `targetPages` is stored per preset.

## Sources

- `document.execCommand`: MDN marks it deprecated, but it remains supported in all major browsers. https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand (checked 2026-11-16, from knowledge; verify during planning).
- CSS fragmentation (`break-after`, `orphans`, `widows`): https://www.w3.org/TR/css-break-3/
- In-repo precedent: `components/cv/cv-edit-context.tsx`, `components/cv/cv-tailor-builder.tsx`, `scripts/check-cv-print.ts`.
