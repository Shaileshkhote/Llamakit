import { NextResponse } from "next/server"
import { detectCapabilities } from "@/lib/data/dashboard"
import { requireAdminSecret } from "@/lib/env"
import { getTenantBySlug } from "@/lib/tenancy/store"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { tenant: slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })

  const capabilities = await detectCapabilities(tenant)
  return NextResponse.json({ capabilities })
}
