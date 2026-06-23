# LlamaKit

Unofficial, non-commercial prototype for generating branded protocol analytics portals from public DefiLlama data.

The MVP demonstrates:

- Protocol selection and per-metric DefiLlama source configuration
- Capability-driven dashboard rendering
- Server-side DefiLlama fetching, normalization, cache fallback, and source attribution
- Account signup/login with owner-scoped analytics site management
- Branded public analytics site pages at `/sites/[siteSlug]`
- Dashboard builder at `/dashboard`
- Public explorer API at `/api/explorer/sites`
- Iframe chart embeds at `/embed/[siteSlug]/[module]`
- Vercel custom-domain integration with stub mode when credentials are absent

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ECharts
- TanStack Query and Table
- Ariakit
- Vitest
- oxlint / oxfmt

The UI uses the same kind of public libraries as `DefiLlama/defillama-app`, but all components in this repo are original. Do not copy GPL source into this project.

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Local URLs:

- Home: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`
- Login: `http://localhost:3000/login`
- Signup: `http://localhost:3000/signup`
- Uniswap dashboard: `http://localhost:3000/sites/uniswap`
- Embed: `http://localhost:3000/embed/uniswap/tvl?theme=light`

## Environment

```bash
DATABASE_URL=
NEXT_PUBLIC_APP_HOST=llamakit.shaileshk.xyz
NEXT_PUBLIC_ROOT_DOMAIN=llamapages.dev
VERCEL_PROJECT_PRODUCTION_URL=
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
```

Production account flows require `DATABASE_URL`. Local development can fall back to the in-memory seeded store so the public demo dashboards render immediately.

## Validation

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Seed Analytics Sites

Seed fixtures live in `lib/seeds`:

- Uniswap
- Aave
- Lido

Each seed analytics site has display metadata, DefiLlama source IDs, enabled modules, and initial capability flags.

## Data Boundary

Only documented public DefiLlama hosts are allowed:

- `api.llama.fi`
- `yields.llama.fi`
- `coins.llama.fi`
- `stablecoins.llama.fi`

The app does not scrape DefiLlama pages, does not use undocumented Next.js endpoints, and does not call DefiLlama directly from the browser.

Required attribution:

- `Unofficial LlamaKit prototype`
- `Data provided by DefiLlama`
