import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

const SYSTEM_PROMPTS: Record<string, string> = {
  summarize:
    "You are a concise text editor. Summarize the following text, keeping the key points. Output only the summarized text with no preamble.",
  formalize:
    "You are a professional text editor. Rewrite the following text in a more formal, polished tone suitable for a CV or professional document. Output only the rewritten text with no preamble.",
  shorten:
    "You are a concise text editor. Make the following text significantly shorter while preserving its meaning. Output only the shortened text with no preamble.",
  expand:
    "You are a skilled text editor. Expand the following text with more detail while keeping it professional and relevant for a CV. Output only the expanded text with no preamble.",
}

export async function POST(request: NextRequest) {
  /* ── auth guard ── */
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const authenticated = await validateSession(token)
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  /* ── parse body ── */
  let text: string
  let action: string
  let customPrompt: string | undefined

  try {
    const body = await request.json()
    text = body.text
    action = body.action // "summarize" | "formalize" | "shorten" | "expand" | "custom"
    customPrompt = body.customPrompt
    if (!text || !action) throw new Error("Missing fields")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  /* ── build prompt ── */
  let systemInstruction: string
  if (action === "custom" && customPrompt) {
    systemInstruction = `You are a helpful text editor assistant working on CV / résumé content. Follow this instruction: ${customPrompt}. Output only the resulting text with no preamble.`
  } else if (SYSTEM_PROMPTS[action]) {
    systemInstruction = SYSTEM_PROMPTS[action]
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  /* ── call Gemini ── */
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.")
    }

    const ai = new GoogleGenAI({ apiKey })
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemInstruction}\n\nText:\n${text}`,
    })

    return NextResponse.json({ text: result.text ?? "" })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error"
    console.error("Gemini API Error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
