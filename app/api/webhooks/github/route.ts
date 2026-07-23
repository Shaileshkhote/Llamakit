import { NextResponse } from "next/server"
import { verifyGitHubWebhookSignature } from "@/lib/github/app"
import {
  findSourceConnectionsByRepo,
  getProjectById,
  queueBuild,
  recordGitHubDelivery,
  upsertGitHubRepository,
} from "@/lib/platform/store"
import { randomUUID } from "node:crypto"

export async function POST(request: Request) {
  const payloadText = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  const deliveryId = request.headers.get("x-github-delivery") || randomUUID()
  const event = request.headers.get("x-github-event") || "unknown"

  if (!verifyGitHubWebhookSignature(payloadText, signature)) {
    await recordGitHubDelivery({
      deliveryId,
      event,
      action: null,
      installationId: null,
      repositoryId: null,
      status: "rejected",
      statusMessage: "Invalid signature",
      payload: {},
    })
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payload = JSON.parse(payloadText) as {
    action?: string
    installation?: { id?: number; account?: { login?: string; type?: string } }
    repository?: { id?: number; name?: string; full_name?: string; private?: boolean; default_branch?: string; owner?: { login?: string } }
    ref?: string
    after?: string
  }
  const installationId = payload.installation?.id ?? null
  const repositoryId = payload.repository?.id ?? null

  const delivery = await recordGitHubDelivery({
    deliveryId,
    event,
    action: payload.action ?? null,
    installationId,
    repositoryId,
    status: "accepted",
    statusMessage: "Accepted",
    payload,
  })
  if (!delivery) return NextResponse.json({ ok: true, duplicate: true }, { status: 202 })

  if (payload.repository && installationId && repositoryId) {
    await upsertGitHubRepository({
      id: randomUUID(),
      installationId,
      repositoryId,
      ownerLogin: payload.repository.owner?.login ?? payload.repository.full_name?.split("/")[0] ?? "unknown",
      name: payload.repository.name ?? "unknown",
      fullName: payload.repository.full_name ?? "unknown/unknown",
      defaultBranch: payload.repository.default_branch ?? "main",
      private: Boolean(payload.repository.private),
      updatedAt: new Date().toISOString(),
    })
  }

  if (event === "push" && repositoryId && payload.ref?.startsWith("refs/heads/")) {
    const branch = payload.ref.replace("refs/heads/", "")
    const connections = await findSourceConnectionsByRepo(repositoryId, branch)
    for (const connection of connections) {
      const project = await getProjectById(connection.projectId)
      if (project) await queueBuild(project.id, { branch, commitSha: payload.after ?? null })
    }
  }

  return NextResponse.json({ ok: true }, { status: 202 })
}
