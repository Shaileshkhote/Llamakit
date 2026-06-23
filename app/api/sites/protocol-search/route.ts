import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { searchProtocols } from "@/lib/defillama/protocols"

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const query = url.searchParams.get("q") ?? ""
  const results = await searchProtocols(query)
  return NextResponse.json({ results })
}
