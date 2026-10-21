export interface CvContactLink {
  /** What the header prints, e.g. "linkedin.com/in/jane-doe". */
  label: string
  url: string
}

const hostOf = (url: URL) => url.hostname.replace(/^www\./, "")
const isHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

function parseWebLink(value: string): URL | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url : null
  } catch { return null }
}

/**
 * The links printed under the email: LinkedIn, then GitHub, or the personal
 * site when there is no GitHub. Email and phone entries are ignored.
 */
export function selectContactLinks(candidates: readonly { url: string }[] | undefined): CvContactLink[] {
  const parsed = (candidates ?? []).flatMap(({ url }) => {
    const parsedUrl = parseWebLink(url)
    return parsedUrl ? [parsedUrl] : []
  })
  const linkedin = parsed.find((url) => isHost(hostOf(url), "linkedin.com"))
  const github = parsed.find((url) => isHost(hostOf(url), "github.com"))
  const portfolio = parsed.find((url) => url !== linkedin && url !== github)
  return [linkedin, github ?? portfolio].flatMap((url) => url ? [{
    label: `${hostOf(url)}${url.pathname.replace(/\/$/, "")}`,
    url: url.href,
  }] : [])
}
