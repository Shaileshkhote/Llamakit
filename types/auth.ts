export type User = {
  id: string
  email: string
  passwordHash?: string | null
  name: string
  avatarUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
  lastSeenAt: string
}

export type OAuthAccount = {
  id: string
  userId: string
  provider: "github"
  providerAccountId: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}
