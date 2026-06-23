# LlamaKit

Unofficial, non-commercial prototype for generating branded protocol analytics portals from public DefiLlama data.

The MVP demonstrates:

- Protocol selection and per-metric DefiLlama source configuration
- Capability-driven dashboard rendering
- Server-side DefiLlama fetching, normalization, cache fallback, and source attribution
- Branded public tenant pages at `/sites/[tenant]`
- Admin builder at `/admin`
- Iframe chart embeds at `/embed/[tenant]/[module]`
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
- Admin: `http://localhost:3000/admin`
- Uniswap dashboard: `http://localhost:3000/sites/uniswap`
- Embed: `http://localhost:3000/embed/uniswap/tvl?theme=light`

Default admin secret for local development is `change-me` unless `ADMIN_SECRET` is set.

## Environment

```bash
DATABASE_URL=
ADMIN_SECRET=change-me
NEXT_PUBLIC_ROOT_DOMAIN=llamapages.dev
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
```

The current MVP uses an in-memory seeded tenant store so it can run immediately. `database/schema.sql` contains the Postgres target schema for persistent storage.

## Validation

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Seed Tenants

Seed fixtures live in `lib/seeds`:

- Uniswap
- Aave
- Lido

Each tenant has display metadata, DefiLlama source IDs, enabled modules, and initial capability flags.

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
