import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const authenticated = await validateSession(token)

  return NextResponse.json({ authenticated })
}
