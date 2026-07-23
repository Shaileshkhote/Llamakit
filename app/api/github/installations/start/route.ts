import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET() {
  if (!env.GITHUB_APP_SLUG) {
    return NextResponse.json({ error: "GitHub App slug is not configured." }, { status: 500 })
  }
  return NextResponse.redirect(`https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`)
}
