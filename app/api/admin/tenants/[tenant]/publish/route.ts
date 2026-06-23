import { NextResponse } from "next/server"
import { requireAdminSecret } from "@/lib/env"
import { patchTenant } from "@/lib/tenancy/store"

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tenant } = await params
    const published = await patchTenant(tenant, { published: true })
    if (!published) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    return NextResponse.json({ tenant: published })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
