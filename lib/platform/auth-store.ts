import { randomUUID } from "node:crypto"
import { ensureDatabase, getPool, hasDatabase } from "@/lib/db"
import type { AuthSession, OAuthAccount, User } from "@/types/auth"

type UserRow = {
  id: string
  email: string
  password_hash: string | null
  name: string
  avatar_url: string | null
  created_at: Date | string
  updated_at: Date | string
}

type SessionRow = {
  id: string
  user_id: string
  token_hash: string
  expires_at: Date | string
  created_at: Date | string
  last_seen_at: Date | string
}

type OAuthRow = {
  id: string
  user_id: string
  provider: "github"
  provider_account_id: string
  access_token: string | null
  refresh_token: string | null
  expires_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

const memory = {
  users: new Map<string, User>(),
  sessions: new Map<string, AuthSession & { tokenHash: string }>(),
  oauth: new Map<string, OAuthAccount>(),
}

const now = () => new Date().toISOString()

function iso(value: Date | string | null) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function userFromRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function sessionFromRow(row: SessionRow): AuthSession & { tokenHash: string } {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: iso(row.expires_at) ?? now(),
    createdAt: iso(row.created_at) ?? now(),
    lastSeenAt: iso(row.last_seen_at) ?? now(),
  }
}

function oauthFromRow(row: OAuthRow): OAuthAccount {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: iso(row.expires_at),
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

async function withDatabase<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!hasDatabase()) return fallback()
  try {
    await ensureDatabase()
    return await operation()
  } catch (error) {
    console.warn("Falling back to in-memory auth store", error)
    return fallback()
  }
}

export async function createUser(input: {
  email: string
  passwordHash?: string | null
  name: string
  avatarUrl?: string | null
}) {
  const user: User = {
    id: randomUUID(),
    email: input.email,
    passwordHash: input.passwordHash ?? null,
    name: input.name,
    avatarUrl: input.avatarUrl ?? null,
    createdAt: now(),
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return user
      const result = await pool.query<UserRow>(
        `insert into users (id, email, password_hash, name, avatar_url, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [user.id, user.email, user.passwordHash, user.name, user.avatarUrl, user.createdAt, user.updatedAt],
      )
      return userFromRow(result.rows[0])
    },
    () => {
      memory.users.set(user.id, user)
      return user
    },
  )
}

export async function getUserByEmail(email: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<UserRow>("select * from users where email = $1 limit 1", [email])
      return result.rows[0] ? userFromRow(result.rows[0]) : undefined
    },
    () => [...memory.users.values()].find((user) => user.email === email),
  )
}

export async function getUserById(id: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<UserRow>("select * from users where id = $1 limit 1", [id])
      return result.rows[0] ? userFromRow(result.rows[0]) : undefined
    },
    () => memory.users.get(id),
  )
}

export async function createUserSession(input: { userId: string; tokenHash: string; expiresAt: string }) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return
      await pool.query(
        `insert into user_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
         values ($1, $2, $3, $4, now(), now())`,
        [randomUUID(), input.userId, input.tokenHash, input.expiresAt],
      )
    },
    () => {
      const session = {
        id: randomUUID(),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: now(),
        lastSeenAt: now(),
      }
      memory.sessions.set(input.tokenHash, session)
    },
  )
}

export async function getUserSessionByTokenHash(tokenHash: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<SessionRow>(
        "select * from user_sessions where token_hash = $1 and expires_at > now() limit 1",
        [tokenHash],
      )
      if (!result.rows[0]) return undefined
      await pool.query("update user_sessions set last_seen_at = now() where id = $1", [result.rows[0].id])
      return sessionFromRow(result.rows[0])
    },
    () => {
      const session = memory.sessions.get(tokenHash)
      if (!session || Date.parse(session.expiresAt) <= Date.now()) return undefined
      session.lastSeenAt = now()
      return session
    },
  )
}

export async function deleteUserSession(tokenHash: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return
      await pool.query("delete from user_sessions where token_hash = $1", [tokenHash])
    },
    () => {
      memory.sessions.delete(tokenHash)
    },
  )
}

export async function upsertOAuthAccount(input: {
  userId: string
  provider: "github"
  providerAccountId: string
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: string | null
}) {
  const account: OAuthAccount = {
    id: randomUUID(),
    userId: input.userId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    accessToken: input.accessToken ?? null,
    refreshToken: input.refreshToken ?? null,
    expiresAt: input.expiresAt ?? null,
    createdAt: now(),
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return account
      const result = await pool.query<OAuthRow>(
        `insert into oauth_accounts (
          id, user_id, provider, provider_account_id, access_token, refresh_token, expires_at, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,now(),now())
        on conflict (provider, provider_account_id) do update set
          user_id = excluded.user_id,
          access_token = excluded.access_token,
          refresh_token = excluded.refresh_token,
          expires_at = excluded.expires_at,
          updated_at = now()
        returning *`,
        [
          account.id,
          account.userId,
          account.provider,
          account.providerAccountId,
          account.accessToken,
          account.refreshToken,
          account.expiresAt,
        ],
      )
      return oauthFromRow(result.rows[0])
    },
    () => {
      memory.oauth.set(`${account.provider}:${account.providerAccountId}`, account)
      return account
    },
  )
}

export async function getOAuthAccount(provider: "github", providerAccountId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<OAuthRow>(
        "select * from oauth_accounts where provider = $1 and provider_account_id = $2 limit 1",
        [provider, providerAccountId],
      )
      return result.rows[0] ? oauthFromRow(result.rows[0]) : undefined
    },
    () => memory.oauth.get(`${provider}:${providerAccountId}`),
  )
}
