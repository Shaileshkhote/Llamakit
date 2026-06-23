import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getAnalyticsSiteBySlug, getAnalyticsSitesByOwner, upsertAnalyticsSite } from "@/lib/tenancy/store"
import type { AnalyticsSite } from "@/types/site"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return NextResponse.json({ sites: await getAnalyticsSitesByOwner(user.id) })
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const input = (await request.json()) as AnalyticsSite
    const slug = await uniqueSiteSlug(input.slug)
    const site = await upsertAnalyticsSite({
      ...input,
      id: input.id === `site-${input.slug}` ? `site-${slug}` : input.id,
      slug,
      ownerUserId: user.id,
      published: false,
      publishedAt: null,
    })
    return NextResponse.json({ site }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

async function uniqueSiteSlug(baseSlug: string) {
  const base = baseSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "analytics-site"
  let slug = base
  let index = 2

  while (await getAnalyticsSiteBySlug(slug)) {
    slug = `${base}-${index}`
    index += 1
  }

  return slug
}
