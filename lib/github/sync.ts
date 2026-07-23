import { randomUUID } from "node:crypto"
import { fetchInstallationRepositories } from "@/lib/github/app"
import { upsertGitHubInstallation, upsertGitHubRepository } from "@/lib/platform/store"

export async function syncGitHubInstallationRepositories(input: {
  userId: string
  installationId: number
}) {
  const repos = await fetchInstallationRepositories(input.installationId)
  const first = repos[0]
  await upsertGitHubInstallation({
    userId: input.userId,
    installationId: input.installationId,
    accountLogin: first?.owner.login ?? "github",
    accountType: null,
  })
  for (const repo of repos) {
    await upsertGitHubRepository({
      id: randomUUID(),
      installationId: input.installationId,
      repositoryId: repo.id,
      ownerLogin: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      private: repo.private,
      updatedAt: repo.updated_at ?? new Date().toISOString(),
    })
  }
  return repos.length
}
