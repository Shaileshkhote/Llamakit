do $$
begin
  if to_regclass('public.tenants') is not null and to_regclass('public.analytics_sites') is null then
    alter table tenants rename to analytics_sites;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'domains' and column_name = 'tenant_id'
  ) then
    alter table domains rename column tenant_id to analytics_site_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'metric_cache' and column_name = 'tenant_id'
  ) then
    alter table metric_cache rename column tenant_id to analytics_site_id;
  end if;
end $$;

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists analytics_sites (
  id text primary key,
  owner_user_id text references users(id) on delete set null,
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
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table analytics_sites add column if not exists owner_user_id text references users(id) on delete set null;
alter table analytics_sites add column if not exists published_at timestamptz;

create table if not exists domains (
  id text primary key,
  analytics_site_id text not null references analytics_sites(id) on delete cascade,
  hostname text not null unique,
  type text not null check (type in ('subdomain', 'custom')),
  status text not null check (status in ('pending', 'verifying', 'active', 'failed')),
  verification_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists metric_cache (
  cache_key text primary key,
  analytics_site_id text references analytics_sites(id) on delete cascade,
  metric text not null,
  payload jsonb not null,
  source_url text not null,
  fetched_at timestamptz not null,
  last_data_at timestamptz,
  expires_at timestamptz not null,
  status text not null check (status in ('ok', 'stale', 'error')),
  error_message text
);

alter table metric_cache add column if not exists analytics_site_id text references analytics_sites(id) on delete cascade;

create index if not exists analytics_sites_owner_user_id_idx on analytics_sites(owner_user_id);
create index if not exists analytics_sites_published_updated_idx on analytics_sites(published, updated_at desc);
create index if not exists domains_analytics_site_id_idx on domains(analytics_site_id);
create index if not exists user_sessions_user_id_idx on user_sessions(user_id);
create index if not exists user_sessions_expires_at_idx on user_sessions(expires_at);
