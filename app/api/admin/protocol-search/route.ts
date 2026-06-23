import { NextResponse } from "next/server"
import { requireAdminSecret } from "@/lib/env"
import { searchProtocols } from "@/lib/defillama/protocols"

export async function GET(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get("q") ?? ""
  const results = await searchProtocols(query)
  return NextResponse.json({ results })
}
