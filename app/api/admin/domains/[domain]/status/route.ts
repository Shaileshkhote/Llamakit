import { NextResponse } from "next/server"
import { refreshCustomDomain } from "@/lib/domains/vercel"
import { requireAdminSecret } from "@/lib/env"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { domain: hostname } = await params
  const domain = await refreshCustomDomain(decodeURIComponent(hostname))
  if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 })

  return NextResponse.json({ domain })
}
