import { NextResponse } from "next/server"

import { createSession } from "@/lib/session"

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }))

  if (!password) {
    return NextResponse.json({ success: false, error: "Password required" }, { status: 400 })
  }

  if (!process.env.ADMIN_PSW) {
    return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 })
  }

  if (password !== process.env.ADMIN_PSW) {
    return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 })
  }

  try {
    await createSession()
  } catch (error) {
    console.error("Failed to create session", error)
    return NextResponse.json({ success: false, error: "Unable to create session" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
