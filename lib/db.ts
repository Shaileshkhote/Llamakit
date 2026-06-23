import { readFile } from "node:fs/promises"
import path from "node:path"
import { Pool } from "pg"
import { env } from "@/lib/env"

declare global {
  // eslint-disable-next-line no-var
  var __llamakitPgPool: Pool | undefined
  // eslint-disable-next-line no-var
  var __llamakitPgReady: Promise<void> | undefined
}

export function hasDatabase() {
  return Boolean(env.DATABASE_URL)
}

export function getPool() {
  if (!env.DATABASE_URL) return null

  globalThis.__llamakitPgPool ??= new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: true }
  })

  return globalThis.__llamakitPgPool
}

export async function ensureDatabase() {
  const pool = getPool()
  if (!pool) return

  globalThis.__llamakitPgReady ??= readFile(path.join(process.cwd(), "database/schema.sql"), "utf8").then((schema) =>
    pool.query(schema).then(() => undefined)
  )

  await globalThis.__llamakitPgReady
}
