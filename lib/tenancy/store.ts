import { ensureDatabase, getPool, hasDatabase } from "@/lib/db"
import { seedTenants } from "@/lib/seeds"
import type { Tenant as DashboardTenant, TenantDomain } from "@/types/tenant"

type TenantRow = {
  id: string
  slug: string
  display_name: string
  protocol_description: string
  logo_url: string | null
  website_url: string | null
  twitter_url: string | null
  primary_color: string
  accent_color: string
  background_style: "light" | "soft" | "dark"
  metric_sources: DashboardTenant["metricSources"]
  capabilities: DashboardTenant["capabilities"]
  enabled_modules: DashboardTenant["enabledModules"]
  published: boolean
  created_at: Date | string
  updated_at: Date | string
}

type DomainRow = {
  id: string
  tenant_id: string
  hostname: string
  type: TenantDomain["type"]
  status: TenantDomain["status"]
  verification_data: TenantDomain["verificationData"]
  created_at: Date | string
  updated_at: Date | string
}

const memoryTenants = new Map<string, DashboardTenant>(seedTenants.map((tenant) => [tenant.slug, tenant]))
const memoryDomains = new Map<string, TenantDomain>()

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value
}

function tenantFromRow(row: TenantRow): DashboardTenant {
  return {
    id: row.id,
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
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  }
}

function domainFromRow(row: DomainRow): TenantDomain {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    hostname: row.hostname,
    type: row.type,
    status: row.status,
    verificationData: row.verification_data,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  }
}

async function dbTenantBySlug(slug: string) {
  const pool = getPool()
  if (!pool) return undefined
  const result = await pool.query<TenantRow>("select * from tenants where slug = $1 limit 1", [slug])
  return result.rows[0] ? tenantFromRow(result.rows[0]) : undefined
}

async function dbTenantById(id: string) {
  const pool = getPool()
  if (!pool) return undefined
  const result = await pool.query<TenantRow>("select * from tenants where id = $1 limit 1", [id])
  return result.rows[0] ? tenantFromRow(result.rows[0]) : undefined
}

async function dbUpsertTenant(tenant: DashboardTenant) {
  const pool = getPool()
  if (!pool) return tenant
  const result = await pool.query<TenantRow>(
    `insert into tenants (
      id, slug, display_name, protocol_description, logo_url, website_url, twitter_url,
      primary_color, accent_color, background_style, metric_sources, capabilities,
      enabled_modules, published, created_at, updated_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11::jsonb, $12::jsonb,
      $13::jsonb, $14, $15, $16
    )
    on conflict (slug) do update set
      id = excluded.id,
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
      updated_at = excluded.updated_at
    returning *`,
    [
      tenant.id,
      tenant.slug,
      tenant.displayName,
      tenant.protocolDescription,
      tenant.logoUrl,
      tenant.websiteUrl,
      tenant.twitterUrl,
      tenant.primaryColor,
      tenant.accentColor,
      tenant.backgroundStyle,
      JSON.stringify(tenant.metricSources),
      JSON.stringify(tenant.capabilities),
      JSON.stringify(tenant.enabledModules),
      tenant.published,
      tenant.createdAt,
      tenant.updatedAt
    ]
  )
  return tenantFromRow(result.rows[0])
}

async function seedDatabaseIfEmpty() {
  const pool = getPool()
  if (!pool) return
  const count = await pool.query<{ count: string }>("select count(*) from tenants")
  if (Number(count.rows[0]?.count ?? 0) > 0) return
  for (const tenant of seedTenants) {
    await dbUpsertTenant(tenant)
  }
}

async function withDatabase<T>(operation: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!hasDatabase()) return fallback()

  try {
    await ensureDatabase()
    await seedDatabaseIfEmpty()
    return await operation()
  } catch (error) {
    console.warn("Postgres store unavailable; using in-memory tenants.", error)
    return fallback()
  }
}

export async function getAllTenants(): Promise<DashboardTenant[]> {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return Array.from(memoryTenants.values())
      const result = await pool.query<TenantRow>("select * from tenants order by created_at asc")
      return result.rows.map(tenantFromRow)
    },
    () => Array.from(memoryTenants.values())
  )
}

export async function getTenantBySlug(slug: string): Promise<DashboardTenant | undefined> {
  return withDatabase(
    () => dbTenantBySlug(slug),
    () => memoryTenants.get(slug)
  )
}

export async function getTenantBySlugOrHost(slugOrHost: string): Promise<DashboardTenant | undefined> {
  const normalized = slugOrHost.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]
  const subdomainSlug = normalized.split(".")[0]

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return memoryTenants.get(slugOrHost) || memoryTenants.get(normalized) || memoryTenants.get(subdomainSlug)

      const domain = await pool.query<DomainRow>("select * from domains where hostname = $1 limit 1", [normalized])
      if (domain.rows[0]) return dbTenantById(domain.rows[0].tenant_id)

      const result = await pool.query<TenantRow>(
        "select * from tenants where slug = any($1::text[]) limit 1",
        [[slugOrHost, normalized, subdomainSlug]]
      )
      return result.rows[0] ? tenantFromRow(result.rows[0]) : undefined
    },
    () => {
      const domain = memoryDomains.get(normalized)
      if (domain) return Array.from(memoryTenants.values()).find((tenant) => tenant.id === domain.tenantId)
      return memoryTenants.get(slugOrHost) || memoryTenants.get(normalized) || memoryTenants.get(subdomainSlug)
    }
  )
}

export async function upsertTenant(input: DashboardTenant): Promise<DashboardTenant> {
  const timestamp = new Date().toISOString()
  const tenant = {
    ...input,
    createdAt: input.createdAt || timestamp,
    updatedAt: timestamp
  }

  return withDatabase(
    () => dbUpsertTenant(tenant),
    () => {
      memoryTenants.set(tenant.slug, tenant)
      return tenant
    }
  )
}

export async function patchTenant(slug: string, patch: Partial<DashboardTenant>): Promise<DashboardTenant | undefined> {
  const existing = await getTenantBySlug(slug)
  if (!existing) return undefined
  const tenant = {
    ...existing,
    ...patch,
    slug: patch.slug || existing.slug,
    updatedAt: new Date().toISOString()
  }
  if (tenant.slug !== slug) memoryTenants.delete(slug)
  return upsertTenant(tenant)
}

export async function createDomain(input: Omit<TenantDomain, "id" | "createdAt" | "updatedAt">): Promise<TenantDomain> {
  const timestamp = new Date().toISOString()
  const domain: TenantDomain = {
    id: `${input.tenantId}:${input.hostname.toLowerCase()}`,
    ...input,
    hostname: input.hostname.toLowerCase(),
    createdAt: timestamp,
    updatedAt: timestamp
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return domain
      const result = await pool.query<DomainRow>(
        `insert into domains (
          id, tenant_id, hostname, type, status, verification_data, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        on conflict (hostname) do update set
          tenant_id = excluded.tenant_id,
          type = excluded.type,
          status = excluded.status,
          verification_data = excluded.verification_data,
          updated_at = excluded.updated_at
        returning *`,
        [
          domain.id,
          domain.tenantId,
          domain.hostname,
          domain.type,
          domain.status,
          JSON.stringify(domain.verificationData),
          domain.createdAt,
          domain.updatedAt
        ]
      )
      return domainFromRow(result.rows[0])
    },
    () => {
      memoryDomains.set(domain.hostname, domain)
      return domain
    }
  )
}

export async function getDomain(hostname: string): Promise<TenantDomain | undefined> {
  const normalized = hostname.toLowerCase()
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return memoryDomains.get(normalized)
      const result = await pool.query<DomainRow>("select * from domains where hostname = $1 limit 1", [normalized])
      return result.rows[0] ? domainFromRow(result.rows[0]) : undefined
    },
    () => memoryDomains.get(normalized)
  )
}

export async function updateDomain(hostname: string, patch: Partial<TenantDomain>): Promise<TenantDomain | undefined> {
  const normalized = hostname.toLowerCase()
  const existing = await getDomain(normalized)
  if (!existing) return undefined

  const domain = {
    ...existing,
    ...patch,
    hostname: patch.hostname?.toLowerCase() || existing.hostname,
    updatedAt: new Date().toISOString()
  }

  if (domain.hostname !== normalized) memoryDomains.delete(normalized)
  return createDomain(domain)
}
