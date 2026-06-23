import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { addCustomDomain } from "@/lib/domains/vercel"
import { getDomainsBySiteId, getOwnedAnalyticsSiteBySlug } from "@/lib/tenancy/store"

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

  return NextResponse.json({ domains: await getDomainsBySiteId(site.id) })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { siteSlug } = await params
  const site = await getOwnedAnalyticsSiteBySlug(siteSlug, user.id)
  if (!site) return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })

  const body = (await request.json()) as { hostname?: string }
  if (!body.hostname) return NextResponse.json({ error: "hostname is required" }, { status: 400 })

  const domain = await addCustomDomain(site, body.hostname)
  return NextResponse.json({ domain })
}
