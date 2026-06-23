create table if not exists tenants (
  id text primary key,
  slug text not null unique,
  display_name text not null,
  protocol_description text not null default '',
  logo_url text,
  website_url text,
  twitter_url text,
  primary_color text not null default '#2172e5',
  accent_color text not null default '#16885f',
  background_style text not null default 'light',
  metric_sources jsonb not null,
  capabilities jsonb not null default '{}',
  enabled_modules jsonb not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists domains (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  hostname text not null unique,
  type text not null check (type in ('subdomain', 'custom')),
  status text not null check (status in ('pending', 'verifying', 'active', 'failed')),
  verification_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists metric_cache (
  cache_key text primary key,
  tenant_id text references tenants(id) on delete cascade,
  metric text not null,
  payload jsonb not null,
  source_url text not null,
  fetched_at timestamptz not null,
  last_data_at timestamptz,
  expires_at timestamptz not null,
  status text not null check (status in ('ok', 'stale', 'error')),
  error_message text
);
