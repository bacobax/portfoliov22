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
  it("does not treat a bullet marker as italic", () => { expect(html("* a and b*")).toBe("* a and b*") })
  it("escapes HTML", () => { expect(marksToHtml("<b>x</b> **y**")).toBe("&lt;b&gt;x&lt;/b&gt; <strong>y</strong>") })
  it("keeps newlines literal in HTML", () => { expect(marksToHtml("a\nb")).toBe("a\nb") })
  it("strips marks", () => { expect(stripMarks("**a** and *b*")).toBe("a and b") })
  it("serialises DOM to marks, dropping unknown tags", () => {
    expect(domToMarks(el("SPAN", text("Led "), el("B", text("10")), text(" "), el("FONT", el("I", text("x")))))).toBe("Led **10** *x*")
  })
  it("merges adjacent marks", () => { expect(domToMarks(el("SPAN", el("B", text("a")), el("STRONG", text("b"))))).toBe("**ab**") })
  it("turns BR and block boundaries into newlines", () => {
    expect(domToMarks(el("SPAN", text("a"), el("BR"), text("b"), el("DIV", text("c"))))).toBe("a\nb\nc")
  })
  it("keeps whitespace outside marks", () => { expect(domToMarks(el("SPAN", text("a"), el("B", text(" b ")), text("c")))).toBe("a **b** c") })
  it("drops empty marks", () => { expect(domToMarks(el("SPAN", text("a"), el("B", text("")), text("b")))).toBe("ab") })
  it("round-trips through HTML-shaped DOM", () => {
    const s = "x **y** *z*"
    expect(stripMarks(s)).toBe("x y z")
    expect(domToMarks(el("SPAN", text("x "), el("STRONG", text("y")), text(" "), el("EM", text("z"))))).toBe(s)
  })
})

import { parseCvDescription, serializeCvDescription, createCvData, serializeDescriptionParts } from "@/lib/cv-data-transform"

describe("description round-trip", () => {
  const samples = ["Plain prose\nsecond line", "**Role** did things\n- a\n- b", "- x\n\n- y", "**Lead** text\n\nOther para", "Led **10** people", "Intro\n- a\nAfter list"]
  it.each(samples)("parse∘serialize is stable for %j", (s) => {
    const blocks = parseCvDescription(s)
    expect(parseCvDescription(serializeCvDescription(blocks))).toEqual(blocks)
  })
  const exact = [
    serializeDescriptionParts([{ title: "Role", text: "did things" }, { title: "Stack", text: "- a\n- b" }]),
    serializeDescriptionParts([{ title: "", text: "Plain prose" }, { title: "Impact", text: "Led **10** people" }]),
    "**Role** did things\n- a\n- b",
  ]
  it.each(exact)("serialize∘parse preserves editor parts for %j", (s) => {
    expect(serializeCvDescription(parseCvDescription(s))).toBe(s)
  })
  it("bold at paragraph start becomes a part title", () => {
    expect(parseCvDescription(serializeCvDescription([{ type: "paragraph", text: "**Led** team" }]))[0]).toMatchObject({ title: "Led" })
  })
  it("drops empty paragraphs but keeps empty bullets being written", () => {
    expect(serializeCvDescription([{ type: "paragraph", text: "" }, { type: "bullets", items: ["a", " "] }])).toBe("- a\n-")
    expect(parseCvDescription("- a\n-")).toEqual([{ type: "bullets", items: ["a", ""] }])
  })
  it("exposes raw dates", () => {
    const data = createCvData({ sections: [{ id: "e", title: "E", type: "log", placement: "main", visible: true, data: { type: "log", entries: [{ id: "1", title: "T", subtitle: "", dateStart: "2020", dateEnd: "Present", description: "", tags: [] }] } }] } as never)
    expect(data.sections[0].content).toMatchObject({ entries: [{ dateStart: "2020", dateEnd: "Present" }] })
  })
})
