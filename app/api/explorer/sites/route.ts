import { NextResponse } from "next/server"
import { getPublishedPublicAnalyticsSites } from "@/lib/tenancy/store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get("limit") ?? 24)
  const q = url.searchParams.get("q")
  const cursor = url.searchParams.get("cursor")
  const sort = url.searchParams.get("sort")

  const result = await getPublishedPublicAnalyticsSites({ cursor, limit, q, sort })
  return NextResponse.json(result)
}
