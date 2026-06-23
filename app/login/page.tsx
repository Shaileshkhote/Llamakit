import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AuthForm } from "./AuthForm"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const requestHeaders = await headers()
  const user = await getCurrentUser(new Request("http://llamakit.local/login", { headers: requestHeaders }))
  if (user) redirect("/dashboard")
  return <AuthForm mode="login" />
}
