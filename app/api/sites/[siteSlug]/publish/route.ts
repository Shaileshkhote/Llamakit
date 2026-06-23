import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDomainsBySiteId, getOwnedAnalyticsSiteBySlug, patchAnalyticsSite } from "@/lib/tenancy/store"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { siteSlug } = await params
  const existingSite = await getOwnedAnalyticsSiteBySlug(siteSlug, user.id)
  if (!existingSite) return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })

  const domains = await getDomainsBySiteId(existingSite.id)
  const hasActiveCustomDomain = domains.some((domain) => domain.type === "custom" && domain.status === "active")
  if (!hasActiveCustomDomain) {
    return NextResponse.json({ error: "Verify an active custom domain before deploying." }, { status: 400 })
  }

  const site = await patchAnalyticsSite(siteSlug, { published: true }, user.id)
  if (!site) return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })
  return NextResponse.json({ site })
}
