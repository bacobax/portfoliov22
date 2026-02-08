export const toProjectSlug = (title: string): string =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const buildProjectPath = (categoryId: string, title: string): string =>
  `/projects/${encodeURIComponent(categoryId)}/${encodeURIComponent(toProjectSlug(title))}`
