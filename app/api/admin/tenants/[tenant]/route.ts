import { NextResponse } from "next/server"
import { requireAdminSecret } from "@/lib/env"
import { getTenantBySlug, patchTenant } from "@/lib/tenancy/store"
import type { Tenant } from "@/types/tenant"

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tenant } = await params
    const updated = await patchTenant(tenant, (await request.json()) as Partial<Tenant>)
    if (!updated) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    return NextResponse.json({ tenant: updated })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tenant } = await params
    const current = await getTenantBySlug(tenant)
    if (!current) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    return NextResponse.json({ tenant: current })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 })
  }
}

export async function DELETE(
  request: Request,
  { params: _params }: { params: Promise<{ tenant: string }> },
) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ error: "Deleting analytics tenants is not supported in the MVP" }, { status: 405 })
}
