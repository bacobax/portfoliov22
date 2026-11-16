import { createElement, type ReactNode } from "react"

/**
 * Light inline marks stored inside CV strings: `**bold**`, `*italic*` and
 * `***both***`. Marks never span a line break, and a `*` followed by a space is
 * never italic, so the `* item` bullet syntax stays safe.
 */
const MARK = /(\*\*\*[^*\n]+?\*\*\*|\*\*[^*\n]+?\*\*|\*[^*\s][^*\n]*?\*)/

type Token = { text: string; bold: boolean; italic: boolean }

function tokenize(value: string): Token[] {
  return value.split(MARK).filter(Boolean).map((part) => {
    if (MARK.test(part) && part.match(MARK)?.[0] === part) {
      if (part.startsWith("***")) return { text: part.slice(3, -3), bold: true, italic: true }
      if (part.startsWith("**")) return { text: part.slice(2, -2), bold: true, italic: false }
      return { text: part.slice(1, -1), bold: false, italic: true }
    }
    return { text: part, bold: false, italic: false }
  })
}

/** Marked text as React nodes: `<strong>` and `<em>`, everything else plain text. */
export function parseMarks(value: string): ReactNode[] {
  return tokenize(value).map((token, index) => {
    if (!token.bold && !token.italic) return token.text
    const inner = token.italic ? createElement("em", { key: token.bold ? undefined : index }, token.text) : token.text
    return token.bold ? createElement("strong", { key: index }, inner) : inner
  })
}

export function stripMarks(value: string): string {
  return tokenize(value).map((token) => token.text).join("")
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/**
 * Marked text as safe HTML for a rich `contentEditable` field. Newlines stay
 * literal so the layout's own `white-space` rule decides how they render, exactly
 * as it does for the printed copy.
 */
export function marksToHtml(value: string): string {
  return tokenize(value).map((token) => {
    let html = escapeHtml(token.text)
    if (token.italic) html = `<em>${html}</em>`
    if (token.bold) html = `<strong>${html}</strong>`
    return html
  }).join("")
}

/** The subset of a DOM node that `domToMarks` reads, so it can run without a browser. */
export interface MarkNode {
  nodeType: number
  nodeName: string
  textContent: string | null
  childNodes: ArrayLike<MarkNode>
}

const BLOCK_TAGS = new Set(["DIV", "P", "LI"])

/**
 * Serialise an edited rich field back to marks. Only text, bold and italic
 * survive; any other tag keeps its text and loses its formatting.
 */
export function domToMarks(root: MarkNode): string {
  const runs: Token[] = []
  const push = (text: string, bold: boolean, italic: boolean) => {
    const last = runs[runs.length - 1]
    if (last && last.bold === bold && last.italic === italic && text !== "\n" && last.text !== "\n") last.text += text
    else runs.push({ text, bold, italic })
  }
  const endsWithNewline = () => runs.length === 0 || runs[runs.length - 1].text.endsWith("\n")

  const walk = (node: MarkNode, bold: boolean, italic: boolean) => {
    if (node.nodeType === 3) {
      const lines = (node.textContent ?? "").split("\n")
      lines.forEach((line, index) => {
        if (index > 0) push("\n", false, false)
        if (line) push(line, bold, italic)
      })
      return
    }
    if (node.nodeType !== 1) return
    const name = node.nodeName.toUpperCase()
    if (name === "BR") { push("\n", false, false); return }
    if (BLOCK_TAGS.has(name) && !endsWithNewline()) push("\n", false, false)
    const nextBold = bold || name === "B" || name === "STRONG"
    const nextItalic = italic || name === "I" || name === "EM"
    for (let index = 0; index < node.childNodes.length; index += 1) walk(node.childNodes[index], nextBold, nextItalic)
  }
  walk(root, false, false)

  return runs.map(({ text, bold, italic }) => {
    if (!bold && !italic) return text
    const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/)
    const [, lead, core, trail] = match ?? ["", "", text, ""]
    if (!core) return lead + trail
    const marker = bold && italic ? "***" : bold ? "**" : "*"
    return `${lead}${marker}${core}${marker}${trail}`
  }).join("")
}
