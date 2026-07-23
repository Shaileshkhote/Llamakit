import { NextResponse } from "next/server"
import { resolveDeploymentByHostname } from "@/lib/platform/store"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ path?: string[] }>
}

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

function cleanHost(value: string | null) {
  return (value || "").split(":")[0]?.toLowerCase() ?? ""
}

function upstreamHeaders(request: Request) {
  const headers = new Headers(request.headers)
  for (const key of hopByHopHeaders) headers.delete(key)
  headers.set("x-forwarded-host", request.headers.get("host") || "")
  headers.set("x-forwarded-proto", request.headers.get("x-forwarded-proto") || "https")
  return headers
}

async function proxy(request: Request, context: Params) {
  const hostname = cleanHost(request.headers.get("host"))
  const deployment = await resolveDeploymentByHostname(hostname)
  if (!deployment) {
    return NextResponse.json({ error: "Domain is not connected to an active deployment." }, { status: 404 })
  }

  const { path = [] } = await context.params
  const requestUrl = new URL(request.url)
  const upstreamPath = `/${path.map(encodeURIComponent).join("/")}${requestUrl.search}`
  const upstreamUrl = `http://${deployment.serviceName}.${deployment.namespace}.svc.cluster.local${upstreamPath}`
  const method = request.method.toUpperCase()
  const response = await fetch(upstreamUrl, {
    method,
    headers: upstreamHeaders(request),
    body: method === "GET" || method === "HEAD" ? undefined : request.body,
    // Required by Node when proxying a streaming request body.
    duplex: method === "GET" || method === "HEAD" ? undefined : "half",
    redirect: "manual",
  } as RequestInit & { duplex?: "half" })

  const headers = new Headers(response.headers)
  for (const key of hopByHopHeaders) headers.delete(key)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const GET = proxy
export const HEAD = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
