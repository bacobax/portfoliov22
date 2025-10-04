import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { deleteSession, SESSION_COOKIE_NAME } from "@/lib/session"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  await deleteSession(token)

  return NextResponse.json({ success: true })
}
