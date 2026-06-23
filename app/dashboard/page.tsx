import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import SiteBuilder from "./SiteBuilder"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const requestHeaders = await headers()
  const user = await getCurrentUser(new Request("http://llamakit.local/dashboard", { headers: requestHeaders }))

  if (!user) redirect("/login?next=/dashboard")
  return <SiteBuilder user={user} />
}
