import { NextResponse, type NextRequest } from "next/server"
import { env } from "@/lib/env"

const reservedPrefixes = ["/api", "/admin", "/embed", "/_next", "/favicon.ico"]
const adminCookieName = "lamma_admin"

function presentedAdminSecret(request: NextRequest) {
  const auth = request.headers.get("authorization")
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : undefined
  return request.headers.get("x-admin-secret")?.trim() || bearer || request.cookies.get(adminCookieName)?.value
}

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return new NextResponse("Unauthorized admin request.", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8" }
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminPath = pathname.startsWith("/api/admin")

  if (isAdminPath) {
    if (presentedAdminSecret(request) !== env.ADMIN_SECRET) {
      return unauthorized(request)
    }

    return NextResponse.next()
  }

  if (reservedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase()
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next()
  }

  const rootDomain = env.NEXT_PUBLIC_ROOT_DOMAIN.toLowerCase()
  const tenant =
    hostname.endsWith(`.${rootDomain}`) && hostname !== rootDomain
      ? hostname.slice(0, -(rootDomain.length + 1))
      : hostname

  if (!tenant || tenant === "www") return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/sites/${tenant}${pathname === "/" ? "" : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
}
