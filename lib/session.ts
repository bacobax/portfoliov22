import { cookies } from "next/headers"
import { randomBytes } from "crypto"

import { getDb } from "@/lib/mongodb"

export const SESSION_COOKIE_NAME = "portfolio_session"
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours in seconds

interface SessionDocument {
  token: string
  createdAt: Date
  expiresAt: Date
}

export async function createSession() {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

  const db = await getDb()
  await db.collection<SessionDocument>("sessions").insertOne({
    token,
    createdAt: new Date(),
    expiresAt,
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })

  return { token, expiresAt }
}

export async function validateSession(token?: string | null) {
  if (!token) {
    return false
  }

  try {
    const db = await getDb()
    const session = await db.collection<SessionDocument>("sessions").findOne({ token })

    if (!session) {
      return false
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await db.collection<SessionDocument>("sessions").deleteOne({ token })
      return false
    }

    return true
  } catch (error) {
    console.error("Failed to validate session", error)
    return false
  }
}

export async function deleteSession(token?: string | null) {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)

  if (!token) {
    return
  }

  try {
    const db = await getDb()
    await db.collection<SessionDocument>("sessions").deleteOne({ token })
  } catch (error) {
    console.error("Failed to delete session", error)
  }
}
