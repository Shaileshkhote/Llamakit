import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { patchAnalyticsSite } from "@/lib/tenancy/store"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { siteSlug } = await params
  const site = await patchAnalyticsSite(siteSlug, { published: false }, user.id)
  if (!site) return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })
  return NextResponse.json({ site })
}
