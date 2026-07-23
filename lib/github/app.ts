import { createHmac, createSign, timingSafeEqual } from "node:crypto"
import { env } from "@/lib/env"
import type { ProjectSourceFile } from "@/types/platform"

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url")
}

export function requireGitHubAppEnv() {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App is not configured.")
  }
  return {
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }
}

export function createGitHubAppJwt() {
  const { appId, privateKey } = requireGitHubAppEnv()
  const nowSeconds = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const payload = base64Url(
    JSON.stringify({
      iat: nowSeconds - 60,
      exp: nowSeconds + 9 * 60,
      iss: appId,
    }),
  )
  const data = `${header}.${payload}`
  const signature = createSign("RSA-SHA256").update(data).sign(privateKey, "base64url")
  return `${data}.${signature}`
}

export async function createInstallationToken(installationId: number) {
  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${createGitHubAppJwt()}`,
      "x-github-api-version": "2022-11-28",
    },
  })
  const data = (await response.json()) as { token?: string; message?: string }
  if (!response.ok || !data.token) throw new Error(data.message || "Could not create installation token.")
  return data.token
}

export async function fetchInstallationRepositories(installationId: number) {
  const token = await createInstallationToken(installationId)
  const repositories: Array<{
    id: number
    name: string
    full_name: string
    private: boolean
    default_branch: string
    owner: { login: string }
    updated_at?: string
  }> = []
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`https://api.github.com/installation/repositories?per_page=100&page=${page}`, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
    })
    if (!response.ok) throw new Error("Could not list installation repositories.")
    const data = (await response.json()) as { repositories?: typeof repositories }
    const batch = data.repositories ?? []
    repositories.push(...batch)
    if (batch.length < 100) break
  }
  return repositories
}

export async function fetchRepositoryFiles(input: {
  installationId: number
  owner: string
  repo: string
  branch: string
  rootDirectory: string
}) {
  const token = await createInstallationToken(input.installationId)
  const treeResponse = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.repo}/git/trees/${encodeURIComponent(input.branch)}?recursive=1`,
    {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
    },
  )
  if (!treeResponse.ok) throw new Error("Could not fetch repository tree.")
  const tree = (await treeResponse.json()) as {
    tree?: Array<{ path: string; type: "blob" | "tree"; size?: number; url?: string }>
  }
  const root = input.rootDirectory === "." ? "" : `${input.rootDirectory.replace(/^\/+|\/+$/g, "")}/`
  const files = (tree.tree ?? [])
    .filter((item) => item.type === "blob" && item.path.startsWith(root))
    .filter((item) => !item.path.includes("node_modules/") && !item.path.includes(".git/"))
    .filter((item) => (item.size ?? 0) <= 256_000)
    .slice(0, 120)

  const result: ProjectSourceFile[] = []
  for (const file of files) {
    if (!file.url) continue
    const rawResponse = await fetch(file.url, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
    })
    if (!rawResponse.ok) continue
    const blob = (await rawResponse.json()) as { content?: string; encoding?: string }
    const content =
      blob.encoding === "base64" && blob.content
        ? Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf8")
        : ""
    result.push({
      path: root ? file.path.slice(root.length) : file.path,
      content,
    })
  }
  return result
}

export function verifyGitHubWebhookSignature(payload: string, signatureHeader: string | null) {
  if (!env.GITHUB_WEBHOOK_SECRET || !signatureHeader?.startsWith("sha256=")) return false
  const expected = `sha256=${createHmac("sha256", env.GITHUB_WEBHOOK_SECRET).update(payload).digest("hex")}`
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(signatureHeader)
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}
