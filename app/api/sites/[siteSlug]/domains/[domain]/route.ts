import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { removeCustomDomain } from "@/lib/domains/vercel"
import { getDomain, getOwnedAnalyticsSiteBySlug } from "@/lib/tenancy/store"

export const runtime = "nodejs"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string; domain: string }> },
) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { siteSlug, domain: hostnameParam } = await params
  const site = await getOwnedAnalyticsSiteBySlug(siteSlug, user.id)
  if (!site) return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })

  const hostname = decodeURIComponent(hostnameParam)
  const existing = await getDomain(hostname)
  if (!existing || existing.analyticsSiteId !== site.id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  await removeCustomDomain(hostname)
  return NextResponse.json({ ok: true })
}
