import { NextResponse, type NextRequest } from "next/server"
import { env } from "@/lib/env"

const reservedPrefixes = ["/api", "/admin", "/dashboard", "/login", "/signup", "/embed", "/_next", "/favicon.ico"]
const sessionCookieName = "llamakit_session"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtectedDashboard = pathname.startsWith("/dashboard")
  const isProtectedApi = pathname.startsWith("/api/sites")
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value)

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if ((isProtectedDashboard || isProtectedApi) && !hasSession) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (reservedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase()
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next()
  }

  const rootDomain = env.NEXT_PUBLIC_ROOT_DOMAIN.toLowerCase()
  const appHosts = new Set(
    [env.NEXT_PUBLIC_APP_HOST, env.VERCEL_PROJECT_PRODUCTION_URL, rootDomain]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase())
  )

  if (appHosts.has(hostname) || hostname === `www.${rootDomain}`) {
    return NextResponse.next()
  }

  const siteSlug =
    hostname.endsWith(`.${rootDomain}`)
      ? hostname.slice(0, -(rootDomain.length + 1))
      : hostname

  if (!siteSlug || siteSlug === "www") return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/sites/${siteSlug}${pathname === "/" ? "" : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
}
