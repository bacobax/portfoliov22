import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { loadPortfolioContent } from "@/lib/portfolio-content";
import { loadContentHub } from "@/lib/content-hub-db";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session";

export async function GET() {
  const [content, hub] = await Promise.all([
    loadPortfolioContent(),
    loadContentHub().catch(() => null),
  ]);
  return NextResponse.json({ content, revision: hub?.revision ?? null });
}

export async function PUT() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await validateSession(token);

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const hub = await loadContentHub().catch(() => null);
  if (!hub) {
    return NextResponse.json(
      {
        success: false,
        error: "Content hub migration is required",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    {
      success: false,
      error: "Full-document writes are retired; use /api/editor/content",
    },
    { status: 405 },
  );
}
