export type User = {
  id: string
  email: string
  name: string
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
