import { NextResponse, type NextRequest } from "next/server"

const sessionCookieName = "llamakit_session"

const publicApiPrefixes = ["/api/auth", "/api/webhooks/github", "/api/github/installations/callback"]
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "llamapages.dev"
const appHosts = new Set(
  [
    process.env.NEXT_PUBLIC_APP_HOST,
    process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : undefined,
    "localhost",
    "127.0.0.1",
    "llamakit.shaileshk.xyz",
    "llamakit.84.247.134.60.sslip.io",
  ]
    .filter(Boolean)
    .map((host) => String(host).toLowerCase()),
)

function cleanHost(value: string | null) {
  return (value || "").split(":")[0]?.toLowerCase() ?? ""
}

function isControlPlaneHost(hostname: string) {
  if (!hostname) return true
  if (appHosts.has(hostname)) return true
  return hostname === rootDomain
}

function requiresSession(pathname: string) {
  if (pathname.startsWith("/dashboard")) return true
  if (pathname.startsWith("/api/projects")) return true
  if (pathname.startsWith("/api/github")) return true
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = cleanHost(request.headers.get("host"))

  if (!isControlPlaneHost(hostname) && !pathname.startsWith("/api/runtime-proxy")) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/runtime-proxy${pathname === "/" ? "" : pathname}`
    return NextResponse.rewrite(url)
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (requiresSession(pathname) && !request.cookies.get(sessionCookieName)?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/:path*"]
}
