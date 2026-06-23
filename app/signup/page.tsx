import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AuthForm } from "@/app/login/AuthForm"

export const dynamic = "force-dynamic"

export default async function SignupPage() {
  const requestHeaders = await headers()
  const user = await getCurrentUser(new Request("http://llamakit.local/signup", { headers: requestHeaders }))
  if (user) redirect("/dashboard")
  return <AuthForm mode="signup" />
}
