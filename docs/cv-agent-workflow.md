# Agent-editable CVs

CVs are versioned JSON documents stored in MongoDB Atlas. Files under `.cv-work/` are disposable working copies and are ignored by Git. A draft is private until it is published.

```bash
npm run cv -- list --server https://example.com --password "$CV_ADMIN_PASSWORD"
npm run cv -- pull CV_ID --server https://example.com
npm run cv -- validate .cv-work/CV_ID.json
npm run cv -- push .cv-work/CV_ID.json --server https://example.com
npm run cv -- publish CV_ID --server https://example.com
```

Use `create --name NAME --country Italy --locale en --server URL` to create an unpublished draft. The password can be supplied through `CV_ADMIN_PASSWORD`. Never commit credentials.

Edit `cv.content` for wording and section data. Edit `cv.design` for page format, margins, columns, typography, colors, spacing, photo shape, and page breaks. The server rejects executable content, arbitrary CSS, unsupported values, invalid references, stale `baseRevision` values, and IDs that do not match the URL. After a conflict, pull again and reconcile the local edits before pushing.

Before enabling draft publication on an existing database, run `npm run migrate:cv-documents` for a dry run, then `npm run migrate:cv-documents -- --apply`. The apply pass creates a timestamped copy in `content_hub_backups` and uses the hub revision as an atomic guard. Re-running it is a no-op.

## Professional CV layout

New designs default to one continuous column, 10.5 pt body type and 16 mm margins. Existing numeric settings are preserved. In Design, use **Apply professional defaults** to reset layout and manual breaks while retaining text, language and photo visibility. `appearance: "regional"` retains the regional visual treatment; `professional` uses a compact header and restrained typography. Regional templates still determine content conventions and translated headings.

Entry descriptions preserve plain text as paragraphs and line breaks. Use a blank line between paragraphs. Only lines beginning with `- `, `* ` or `• ` become bullet items; prose and lists can be mixed in the same description. Sentences, acronyms and capitalization are preserved. Keep descriptions concise, whether you choose prose or bullets. Skills and technologies print as comma-separated text. Dates in `YYYY-MM` form are localized consistently; unsupported date strings remain unchanged. Project status labels are hidden in the date position by default.

Use `datePlacement` (`right`, `left`, `above`), `headingStyle` (`divider`, `spacing`), `photoSizeMm` (16–32), `showLocation`, `locationLabel`, `showTaxId`, and `showProjectStatus` for presentation. `locationLabel` is a CV-only city/country label; no address is guessed or deleted. `showTaxId` defaults to false. Manual `pageBreakBefore` overrides are available under Advanced, but prefer automatic page flow. Long entries may split while short entries and heading openings are protected. No content is truncated to enforce a page count.

Before sending, export from the editor to check the draft. Turn off browser **Headers and footers**, use the correct paper size at 100% scale, inspect all pages at normal size, and copy/select the text to verify reading order. Check email and web links. Review wording first when too long, then spacing, then margins; reduce font size last. The browser determines final pagination, so the editor does not claim an exact page count. Print rules follow [MDN's CSS printing guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).

For local layout verification, start the development server and run `npx tsx scripts/check-cv-print.ts`. This uses synthetic content and intercepts browser API requests so no drafts are saved to Atlas. It writes desktop/mobile screenshots and PDF variants to a temporary directory. It requires Playwright and Chrome; set `CV_PLAYWRIGHT_MODULE` to an available Playwright module, `CV_CHROME_PATH` for a non-default Chrome executable, and `CV_CHECK_URL` if the editor is not at `http://localhost:3001/cv/edit`. Inspect the resulting PDFs and extracted text; the script itself checks browser errors, not visual correctness.
