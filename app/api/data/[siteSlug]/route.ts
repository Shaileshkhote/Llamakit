import { NextResponse } from "next/server"
import { getDashboardData } from "@/lib/data/dashboard"
import { getAnalyticsSiteBySlugOrHost } from "@/lib/tenancy/store"

export async function GET(_: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params
  const site = await getAnalyticsSiteBySlugOrHost(decodeURIComponent(siteSlug))

  if (!site || !site.published) {
    return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })
  }

  const data = await getDashboardData(site)
  return NextResponse.json({ site, data })
}
