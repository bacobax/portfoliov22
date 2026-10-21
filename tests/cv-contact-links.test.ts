import { describe, expect, it } from "vitest"

import { selectContactLinks } from "@/lib/cv-contact-links"

describe("selectContactLinks", () => {
  it("picks LinkedIn then GitHub and ignores email", () => {
    const links = selectContactLinks([
      { url: "me@example.com" },
      { url: "https://github.com/jane" },
      { url: "https://www.linkedin.com/in/jane-doe/" },
    ])
    expect(links.map((link) => link.label)).toEqual(["linkedin.com/in/jane-doe", "github.com/jane"])
  })

  it("falls back to the personal site when there is no GitHub", () => {
    const links = selectContactLinks([{ url: "https://linkedin.com/in/jane" }, { url: "https://jane.dev/" }])
    expect(links.map((link) => link.label)).toEqual(["linkedin.com/in/jane", "jane.dev"])
  })

  it("returns nothing without usable web links", () => {
    expect(selectContactLinks(undefined)).toEqual([])
    expect(selectContactLinks([{ url: "me@example.com" }, { url: "not a url" }])).toEqual([])
  })
})
