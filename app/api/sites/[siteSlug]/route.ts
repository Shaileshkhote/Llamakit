import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedAnalyticsSiteBySlug, patchAnalyticsSite } from "@/lib/tenancy/store"
import type { AnalyticsSite } from "@/types/site"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { siteSlug } = await params
  const site = await getOwnedAnalyticsSiteBySlug(siteSlug, user.id)
  if (!site) return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })
  return NextResponse.json({ site })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { siteSlug } = await params
    const patch = (await request.json()) as Partial<AnalyticsSite>
    const updated = await patchAnalyticsSite(siteSlug, patch, user.id)
    if (!updated) return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })
    return NextResponse.json({ site: updated })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
