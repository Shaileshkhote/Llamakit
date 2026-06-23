import { NextResponse } from "next/server"
import { getTenantBySlugOrHost } from "@/lib/tenancy/store"

export async function GET(_: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params
  const tenant = await getTenantBySlugOrHost(decodeURIComponent(tenantParam))

  if (!tenant || !tenant.published) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  return NextResponse.json({ capabilities: tenant.capabilities })
}
