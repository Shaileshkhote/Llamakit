import { NextResponse } from "next/server"
import { getDashboardData } from "@/lib/data/dashboard"
import { getTenantBySlugOrHost } from "@/lib/tenancy/store"

export async function GET(_: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params
  const tenant = await getTenantBySlugOrHost(decodeURIComponent(tenantParam))

  if (!tenant || !tenant.published) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  const data = await getDashboardData(tenant)
  return NextResponse.json({ tenant, data })
}
