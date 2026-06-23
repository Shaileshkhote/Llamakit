import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/env";
import { getTenantBySlugOrHost } from "@/lib/tenancy/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const hostname = url.searchParams.get("hostname") || request.headers.get("host") || "";

  try {
    const tenant = await getTenantBySlugOrHost(hostname);
    return NextResponse.json({ tenant: tenant || null });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
