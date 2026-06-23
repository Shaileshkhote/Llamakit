import { randomUUID } from "node:crypto"
import { ensureDatabase, getPool, hasDatabase } from "@/lib/db"
import { seedAnalyticsSites } from "@/lib/seeds"
import type { AuthSession, User } from "@/types/auth"
import type { AnalyticsSite, AnalyticsSiteDomain, PublicAnalyticsSite } from "@/types/site"

type AnalyticsSiteRow = {
  id: string
  owner_user_id: string | null
  slug: string
  display_name: string
  protocol_description: string
  logo_url: string | null
  website_url: string | null
  twitter_url: string | null
  primary_color: string
  accent_color: string
  background_style: "light" | "soft" | "dark"
  metric_sources: AnalyticsSite["metricSources"]
  capabilities: AnalyticsSite["capabilities"]
  enabled_modules: AnalyticsSite["enabledModules"]
  published: boolean
  published_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

type DomainRow = {
  id: string
  analytics_site_id: string
  hostname: string
  type: AnalyticsSiteDomain["type"]
  status: AnalyticsSiteDomain["status"]
  verification_data: AnalyticsSiteDomain["verificationData"]
  created_at: Date | string
  updated_at: Date | string
}

type UserRow = {
  id: string
  email: string
  password_hash: string
  name: string
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

const memorySites = new Map<string, AnalyticsSite>(
  seedAnalyticsSites.map((site) => [site.slug, site]),
)
const memoryDomains = new Map<string, AnalyticsSiteDomain>()
const memoryUsers = new Map<string, User & { passwordHash: string }>()
const memorySessions = new Map<string, AuthSession & { tokenHash: string }>()

function iso(value: Date | string | null) {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : value
}

function userFromRow(row: UserRow): User & { passwordHash: string } {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  }
}

function sessionFromRow(row: SessionRow): AuthSession & { tokenHash: string } {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: iso(row.expires_at) ?? new Date().toISOString(),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    lastSeenAt: iso(row.last_seen_at) ?? new Date().toISOString(),
  }
}

function siteFromRow(row: AnalyticsSiteRow): AnalyticsSite {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    displayName: row.display_name,
    protocolDescription: row.protocol_description,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    twitterUrl: row.twitter_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    backgroundStyle: row.background_style,
    metricSources: row.metric_sources,
    capabilities: row.capabilities,
    enabledModules: row.enabled_modules,
    published: row.published,
    publishedAt: iso(row.published_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  }
}

function domainFromRow(row: DomainRow): AnalyticsSiteDomain {
  return {
    id: row.id,
    analyticsSiteId: row.analytics_site_id,
    hostname: row.hostname,
    type: row.type,
    status: row.status,
    verificationData: row.verification_data,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  }
}

function publicSite(site: AnalyticsSite, domains: AnalyticsSiteDomain[] = []): PublicAnalyticsSite {
  return {
    slug: site.slug,
    displayName: site.displayName,
    protocolDescription: site.protocolDescription,
    logoUrl: site.logoUrl,
    websiteUrl: site.websiteUrl,
    twitterUrl: site.twitterUrl,
    primaryColor: site.primaryColor,
    capabilities: site.capabilities,
    publishedAt: site.publishedAt,
    updatedAt: site.updatedAt,
    defaultUrl: `/sites/${site.slug}`,
    customDomains: domains
      .filter((domain) => domain.type === "custom" && domain.status === "active")
      .map((domain) => ({ hostname: domain.hostname, status: domain.status })),
  }
}

async function seedDatabaseIfEmpty() {
  const pool = getPool()
  if (!pool) return
  const count = await pool.query<{ count: string }>("select count(*) from analytics_sites")
  if (Number(count.rows[0]?.count ?? 0) > 0) return
  for (const site of seedAnalyticsSites) {
    await dbUpsertAnalyticsSite(site)
  }
}

async function withDatabase<T>(operation: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!hasDatabase()) return fallback()

  try {
    await ensureDatabase()
    await seedDatabaseIfEmpty()
    return await operation()
  } catch (error) {
    console.warn("Postgres store unavailable; using in-memory LlamaKit store.", error)
    return fallback()
  }
}

async function dbUpsertAnalyticsSite(site: AnalyticsSite) {
  const pool = getPool()
  if (!pool) return site
  const result = await pool.query<AnalyticsSiteRow>(
    `insert into analytics_sites (
      id, owner_user_id, slug, display_name, protocol_description, logo_url, website_url,
      twitter_url, primary_color, accent_color, background_style, metric_sources,
      capabilities, enabled_modules, published, published_at, created_at, updated_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12::jsonb,
      $13::jsonb, $14::jsonb, $15, $16, $17, $18
    )
    on conflict (slug) do update set
      owner_user_id = excluded.owner_user_id,
      display_name = excluded.display_name,
      protocol_description = excluded.protocol_description,
      logo_url = excluded.logo_url,
      website_url = excluded.website_url,
      twitter_url = excluded.twitter_url,
      primary_color = excluded.primary_color,
      accent_color = excluded.accent_color,
      background_style = excluded.background_style,
      metric_sources = excluded.metric_sources,
      capabilities = excluded.capabilities,
      enabled_modules = excluded.enabled_modules,
      published = excluded.published,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at
    returning *`,
    [
      site.id,
      site.ownerUserId,
      site.slug,
      site.displayName,
      site.protocolDescription,
      site.logoUrl,
      site.websiteUrl,
      site.twitterUrl,
      site.primaryColor,
      site.accentColor,
      site.backgroundStyle,
      JSON.stringify(site.metricSources),
      JSON.stringify(site.capabilities),
      JSON.stringify(site.enabledModules),
      site.published,
      site.publishedAt,
      site.createdAt,
      site.updatedAt,
    ],
  )
  return siteFromRow(result.rows[0])
}

export async function createUser(input: {
  email: string
  name: string
  passwordHash: string
}): Promise<User> {
  const timestamp = new Date().toISOString()
  const email = input.email.trim().toLowerCase()
  const user: User & { passwordHash: string } = {
    id: `user-${randomUUID()}`,
    email,
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const saved = await withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return user
      const result = await pool.query<UserRow>(
        `insert into users (id, email, password_hash, name, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [user.id, user.email, user.passwordHash, user.name, user.createdAt, user.updatedAt],
      )
      return userFromRow(result.rows[0])
    },
    () => {
      if ([...memoryUsers.values()].some((item) => item.email === email)) {
        throw new Error("An account with this email already exists")
      }
      memoryUsers.set(user.id, user)
      return user
    },
  )

  return { id: saved.id, email: saved.email, name: saved.name, createdAt: saved.createdAt, updatedAt: saved.updatedAt }
}

export async function getUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return [...memoryUsers.values()].find((user) => user.email === normalized)
      const result = await pool.query<UserRow>("select * from users where email = $1 limit 1", [
        normalized,
      ])
      return result.rows[0] ? userFromRow(result.rows[0]) : undefined
    },
    () => [...memoryUsers.values()].find((user) => user.email === normalized),
  )
}

export async function getUserById(id: string): Promise<User | undefined> {
  const user = await withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return memoryUsers.get(id)
      const result = await pool.query<UserRow>("select * from users where id = $1 limit 1", [id])
      return result.rows[0] ? userFromRow(result.rows[0]) : undefined
    },
    () => memoryUsers.get(id),
  )

  return user
    ? { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt }
    : undefined
}

export async function createUserSession(input: {
  userId: string
  tokenHash: string
  expiresAt: string
}) {
  const timestamp = new Date().toISOString()
  const session: AuthSession & { tokenHash: string } = {
    id: `session-${randomUUID()}`,
    userId: input.userId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    createdAt: timestamp,
    lastSeenAt: timestamp,
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return session
      const result = await pool.query<SessionRow>(
        `insert into user_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [
          session.id,
          session.userId,
          session.tokenHash,
          session.expiresAt,
          session.createdAt,
          session.lastSeenAt,
        ],
      )
      return sessionFromRow(result.rows[0])
    },
    () => {
      memorySessions.set(session.tokenHash, session)
      return session
    },
  )
}

export async function getUserSessionByTokenHash(tokenHash: string) {
  const now = new Date()
  const session = await withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return memorySessions.get(tokenHash)
      const result = await pool.query<SessionRow>(
        "select * from user_sessions where token_hash = $1 and expires_at > now() limit 1",
        [tokenHash],
      )
      if (!result.rows[0]) return undefined
      await pool.query("update user_sessions set last_seen_at = now() where id = $1", [
        result.rows[0].id,
      ])
      return sessionFromRow(result.rows[0])
    },
    () => {
      const stored = memorySessions.get(tokenHash)
      if (!stored || new Date(stored.expiresAt) <= now) return undefined
      stored.lastSeenAt = now.toISOString()
      return stored
    },
  )

  return session
}

export async function deleteUserSession(tokenHash: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return
      await pool.query("delete from user_sessions where token_hash = $1", [tokenHash])
    },
    () => {
      memorySessions.delete(tokenHash)
    },
  )
}

export async function getAllAnalyticsSites(): Promise<AnalyticsSite[]> {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return Array.from(memorySites.values())
      const result = await pool.query<AnalyticsSiteRow>(
        "select * from analytics_sites order by created_at asc",
      )
      return result.rows.map(siteFromRow)
    },
    () => Array.from(memorySites.values()),
  )
}

export async function getAnalyticsSitesByOwner(ownerUserId: string): Promise<AnalyticsSite[]> {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return Array.from(memorySites.values()).filter((site) => site.ownerUserId === ownerUserId)
      const result = await pool.query<AnalyticsSiteRow>(
        "select * from analytics_sites where owner_user_id = $1 order by updated_at desc",
        [ownerUserId],
      )
      return result.rows.map(siteFromRow)
    },
    () => Array.from(memorySites.values()).filter((site) => site.ownerUserId === ownerUserId),
  )
}

export async function getAnalyticsSiteBySlug(slug: string): Promise<AnalyticsSite | undefined> {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return memorySites.get(slug)
      const result = await pool.query<AnalyticsSiteRow>(
        "select * from analytics_sites where slug = $1 limit 1",
        [slug],
      )
      return result.rows[0] ? siteFromRow(result.rows[0]) : undefined
    },
    () => memorySites.get(slug),
  )
}

export async function getOwnedAnalyticsSiteBySlug(slug: string, ownerUserId: string) {
  const site = await getAnalyticsSiteBySlug(slug)
  if (!site || site.ownerUserId !== ownerUserId) return undefined
  return site
}

export async function getAnalyticsSiteBySlugOrHost(slugOrHost: string): Promise<AnalyticsSite | undefined> {
  const normalized = slugOrHost.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]
  const subdomainSlug = normalized.split(".")[0]

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return memorySites.get(slugOrHost) || memorySites.get(normalized) || memorySites.get(subdomainSlug)

      const domain = await pool.query<DomainRow>(
        "select * from domains where hostname = $1 limit 1",
        [normalized],
      )
      if (domain.rows[0]) {
        const site = await pool.query<AnalyticsSiteRow>(
          "select * from analytics_sites where id = $1 limit 1",
          [domain.rows[0].analytics_site_id],
        )
        return site.rows[0] ? siteFromRow(site.rows[0]) : undefined
      }

      const result = await pool.query<AnalyticsSiteRow>(
        "select * from analytics_sites where slug = any($1::text[]) limit 1",
        [[slugOrHost, normalized, subdomainSlug]],
      )
      return result.rows[0] ? siteFromRow(result.rows[0]) : undefined
    },
    () => {
      const domain = memoryDomains.get(normalized)
      if (domain) return Array.from(memorySites.values()).find((site) => site.id === domain.analyticsSiteId)
      return memorySites.get(slugOrHost) || memorySites.get(normalized) || memorySites.get(subdomainSlug)
    },
  )
}

export async function upsertAnalyticsSite(input: AnalyticsSite): Promise<AnalyticsSite> {
  const timestamp = new Date().toISOString()
  const site = {
    ...input,
    createdAt: input.createdAt || timestamp,
    updatedAt: timestamp,
  }

  return withDatabase(
    () => dbUpsertAnalyticsSite(site),
    () => {
      memorySites.set(site.slug, site)
      return site
    },
  )
}

export async function patchAnalyticsSite(
  slug: string,
  patch: Partial<AnalyticsSite>,
  ownerUserId?: string,
): Promise<AnalyticsSite | undefined> {
  const existing = await getAnalyticsSiteBySlug(slug)
  if (!existing) return undefined
  if (ownerUserId && existing.ownerUserId !== ownerUserId) return undefined

  const nextPublished = patch.published ?? existing.published
  const publishedAt =
    patch.publishedAt !== undefined
      ? patch.publishedAt
      : !existing.published && nextPublished
        ? new Date().toISOString()
        : nextPublished
          ? existing.publishedAt
          : null
  const site = {
    ...existing,
    ...patch,
    slug: patch.slug || existing.slug,
    ownerUserId: patch.ownerUserId === undefined ? existing.ownerUserId : patch.ownerUserId,
    published: nextPublished,
    publishedAt,
    updatedAt: new Date().toISOString(),
  }

  if (site.slug !== slug) memorySites.delete(slug)
  return upsertAnalyticsSite(site)
}

export async function createDomain(
  input: Omit<AnalyticsSiteDomain, "id" | "createdAt" | "updatedAt">,
): Promise<AnalyticsSiteDomain> {
  const timestamp = new Date().toISOString()
  const domain: AnalyticsSiteDomain = {
    id: `${input.analyticsSiteId}:${input.hostname.toLowerCase()}`,
    ...input,
    hostname: input.hostname.toLowerCase(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return domain
      const result = await pool.query<DomainRow>(
        `insert into domains (
          id, analytics_site_id, hostname, type, status, verification_data, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        on conflict (hostname) do update set
          analytics_site_id = excluded.analytics_site_id,
          type = excluded.type,
          status = excluded.status,
          verification_data = excluded.verification_data,
          updated_at = excluded.updated_at
        returning *`,
        [
          domain.id,
          domain.analyticsSiteId,
          domain.hostname,
          domain.type,
          domain.status,
          JSON.stringify(domain.verificationData),
          domain.createdAt,
          domain.updatedAt,
        ],
      )
      return domainFromRow(result.rows[0])
    },
    () => {
      memoryDomains.set(domain.hostname, domain)
      return domain
    },
  )
}

export async function getDomain(hostname: string): Promise<AnalyticsSiteDomain | undefined> {
  const normalized = hostname.toLowerCase()
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return memoryDomains.get(normalized)
      const result = await pool.query<DomainRow>("select * from domains where hostname = $1 limit 1", [
        normalized,
      ])
      return result.rows[0] ? domainFromRow(result.rows[0]) : undefined
    },
    () => memoryDomains.get(normalized),
  )
}

export async function getDomainsBySiteId(analyticsSiteId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return Array.from(memoryDomains.values()).filter((domain) => domain.analyticsSiteId === analyticsSiteId)
      const result = await pool.query<DomainRow>(
        "select * from domains where analytics_site_id = $1 order by created_at desc",
        [analyticsSiteId],
      )
      return result.rows.map(domainFromRow)
    },
    () => Array.from(memoryDomains.values()).filter((domain) => domain.analyticsSiteId === analyticsSiteId),
  )
}

export async function updateDomain(
  hostname: string,
  patch: Partial<AnalyticsSiteDomain>,
): Promise<AnalyticsSiteDomain | undefined> {
  const normalized = hostname.toLowerCase()
  const existing = await getDomain(normalized)
  if (!existing) return undefined

  const domain = {
    ...existing,
    ...patch,
    hostname: patch.hostname?.toLowerCase() || existing.hostname,
    updatedAt: new Date().toISOString(),
  }

  if (domain.hostname !== normalized) memoryDomains.delete(normalized)
  return createDomain(domain)
}

export async function deleteDomain(hostname: string) {
  const normalized = hostname.toLowerCase()
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return
      await pool.query("delete from domains where hostname = $1", [normalized])
    },
    () => {
      memoryDomains.delete(normalized)
    },
  )
}

export async function getPublishedPublicAnalyticsSites(options: {
  cursor?: string | null
  limit?: number
  q?: string | null
  sort?: string | null
} = {}) {
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 50)
  const query = options.q?.trim().toLowerCase() || null
  const cursor = options.cursor || null
  const updatedCursor = cursor && options.sort !== "name" ? new Date(cursor) : null
  const sort = options.sort === "name" ? "name" : "updated"

  const sites = await withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return Array.from(memorySites.values()).filter((site) => site.published)
      const params: unknown[] = []
      const where = ["published = true"]
      if (query) {
        params.push(`%${query}%`)
        where.push(
          `(lower(display_name) like $${params.length} or lower(protocol_description) like $${params.length} or lower(slug) like $${params.length})`,
        )
      }
      if (updatedCursor && sort === "updated") {
        params.push(updatedCursor.toISOString())
        where.push(`updated_at < $${params.length}`)
      }
      if (cursor && sort === "name") {
        params.push(cursor.toLowerCase())
        where.push(`lower(display_name) > $${params.length}`)
      }
      params.push(limit + 1)
      const order = sort === "name" ? "display_name asc" : "updated_at desc"
      const result = await pool.query<AnalyticsSiteRow>(
        `select * from analytics_sites where ${where.join(" and ")} order by ${order} limit $${params.length}`,
        params,
      )
      return result.rows.map(siteFromRow)
    },
    () => {
      const items = Array.from(memorySites.values())
        .filter((site) => site.published)
        .filter((site) =>
          query
            ? [site.displayName, site.protocolDescription, site.slug].some((value) =>
                value.toLowerCase().includes(query),
              )
            : true,
        )
        .sort((a, b) =>
          sort === "name"
            ? a.displayName.localeCompare(b.displayName)
            : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
      if (cursor && sort === "name") {
        return items.filter((site) => site.displayName.toLowerCase() > cursor.toLowerCase())
      }
      return updatedCursor && sort === "updated"
        ? items.filter((site) => new Date(site.updatedAt) < updatedCursor)
        : items
    },
  )

  const page = sites.slice(0, limit)
  const nextCursor =
    sites.length > limit
      ? sort === "name"
        ? page.at(-1)?.displayName ?? null
        : page.at(-1)?.updatedAt ?? null
      : null
  const publicSites = await Promise.all(
    page.map(async (site) => publicSite(site, await getDomainsBySiteId(site.id))),
  )

  return { sites: publicSites, nextCursor }
}

export const getAllTenants = getAllAnalyticsSites
export const getTenantBySlug = getAnalyticsSiteBySlug
export const getTenantBySlugOrHost = getAnalyticsSiteBySlugOrHost
export const patchTenant = patchAnalyticsSite
export const upsertTenant = upsertAnalyticsSite
