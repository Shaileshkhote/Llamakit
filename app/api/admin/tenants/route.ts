import { NextResponse } from "next/server"
import { requireAdminSecret } from "@/lib/env"
import { getAllTenants, upsertTenant } from "@/lib/tenancy/store"
import type { Tenant } from "@/types/tenant"

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ tenants: await getAllTenants() })
}

export async function POST(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tenant = await upsertTenant((await request.json()) as Tenant)
    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
