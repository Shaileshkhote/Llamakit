import { NextResponse } from "next/server"
import { addCustomDomain } from "@/lib/domains/vercel"
import { requireAdminSecret } from "@/lib/env"
import { getTenantBySlug } from "@/lib/tenancy/store"

export async function POST(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as { tenantSlug?: string; hostname?: string }
  if (!body.tenantSlug || !body.hostname) {
    return NextResponse.json({ error: "tenantSlug and hostname are required" }, { status: 400 })
  }

  const tenant = await getTenantBySlug(body.tenantSlug)
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })

  const domain = await addCustomDomain(tenant, body.hostname)
  return NextResponse.json({ domain })
}
