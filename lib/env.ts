import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  ADMIN_SECRET: z.string().default("change-me"),
  NEXT_PUBLIC_APP_HOST: z.string().optional(),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default("llamapages.dev"),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_API_TOKEN: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional()
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
  NEXT_PUBLIC_APP_HOST: process.env.NEXT_PUBLIC_APP_HOST,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_API_TOKEN: process.env.VERCEL_API_TOKEN,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID
})

export function requireAdminSecret(request: Request) {
  const auth = request.headers.get("authorization")
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : undefined
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("lamma_admin="))
    ?.slice("lamma_admin=".length)
  const provided = request.headers.get("x-admin-secret") || bearer || (cookie ? decodeURIComponent(cookie) : undefined)
  return provided != null && provided === env.ADMIN_SECRET
}
