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
