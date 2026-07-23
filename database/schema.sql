create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text,
  name text not null,
  avatar_url text,
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

create table if not exists oauth_accounts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  provider text not null check (provider in ('github')),
  provider_account_id text not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);

create table if not exists projects (
  id text primary key,
  owner_user_id text references users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  framework text not null check (framework in ('nextjs', 'vite', 'static')),
  install_command text not null default 'pnpm install',
  build_command text not null default 'pnpm build',
  start_command text not null default 'pnpm start',
  root_directory text not null default '.',
  production_branch text not null default 'main',
  default_domain text,
  source_provider text not null check (source_provider in ('manual', 'github')) default 'manual',
  status text not null check (status in ('draft', 'ready', 'building', 'deployed', 'failed')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects add column if not exists owner_user_id text references users(id) on delete cascade;
alter table projects add column if not exists production_branch text not null default 'main';
alter table projects add column if not exists default_domain text;
alter table projects add column if not exists source_provider text not null default 'manual';

create table if not exists project_files (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create table if not exists project_versions (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  version_number integer not null,
  source_snapshot jsonb not null,
  branch text,
  commit_sha text,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

alter table project_versions add column if not exists branch text;
alter table project_versions add column if not exists commit_sha text;

create table if not exists builds (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  version_id text not null references project_versions(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  image_ref text,
  branch text,
  commit_sha text,
  logs text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table builds add column if not exists branch text;
alter table builds add column if not exists commit_sha text;

create table if not exists deployments (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  version_id text references project_versions(id) on delete set null,
  build_id text references builds(id) on delete set null,
  environment text not null check (environment in ('preview', 'production')) default 'preview',
  status text not null check (status in ('pending', 'deploying', 'active', 'failed')),
  runtime_status text not null check (runtime_status in ('pending', 'deploying', 'active', 'failed')) default 'pending',
  namespace text not null,
  service_name text not null,
  image_ref text,
  preview_url text,
  preview_hostname text,
  branch text,
  commit_sha text,
  deployment_number integer not null default 1,
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table deployments add column if not exists version_id text references project_versions(id) on delete set null;
alter table deployments add column if not exists environment text not null default 'preview';
alter table deployments add column if not exists runtime_status text not null default 'pending';
alter table deployments add column if not exists preview_hostname text;
alter table deployments add column if not exists branch text;
alter table deployments add column if not exists commit_sha text;
alter table deployments add column if not exists deployment_number integer not null default 1;
alter table deployments add column if not exists promoted_at timestamptz;

create table if not exists project_environment_aliases (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  environment text not null check (environment in ('production')),
  deployment_id text references deployments(id) on delete set null,
  hostname text not null,
  updated_at timestamptz not null default now(),
  unique (project_id, environment)
);

create table if not exists project_domains (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  hostname text not null unique,
  domain_type text not null check (domain_type in ('default', 'custom')) default 'custom',
  environment text not null check (environment in ('production')) default 'production',
  status text not null check (status in ('pending', 'verifying', 'active', 'failed')) default 'pending',
  is_primary boolean not null default false,
  verification_status text,
  dns_records jsonb not null default '[]',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table project_domains add column if not exists domain_type text not null default 'custom';
alter table project_domains add column if not exists environment text not null default 'production';
alter table project_domains add column if not exists is_primary boolean not null default false;
alter table project_domains add column if not exists verification_status text;
alter table project_domains add column if not exists last_checked_at timestamptz;

create table if not exists github_installations (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  installation_id bigint not null unique,
  account_login text not null,
  account_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists github_repositories (
  id text primary key,
  installation_id bigint not null references github_installations(installation_id) on delete cascade,
  repository_id bigint not null unique,
  owner_login text not null,
  name text not null,
  full_name text not null,
  default_branch text not null default 'main',
  private boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists project_source_connections (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  provider text not null check (provider in ('github')),
  installation_id bigint not null,
  repository_id bigint not null,
  owner_login text not null,
  repo_name text not null,
  full_name text not null,
  branch text not null,
  root_directory text not null default '.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider)
);

create table if not exists github_webhook_deliveries (
  id text primary key,
  delivery_id text not null unique,
  event text not null,
  action text,
  installation_id bigint,
  repository_id bigint,
  status text not null check (status in ('accepted', 'ignored', 'rejected', 'processed', 'failed')),
  status_message text,
  payload jsonb,
  received_at timestamptz not null default now()
);

create table if not exists cluster_targets (
  id text primary key,
  name text not null,
  api_server text,
  registry_url text,
  ingress_class text not null default 'nginx',
  status text not null check (status in ('planned', 'active', 'disabled')) default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_status_updated_idx on projects(status, updated_at desc);
create index if not exists projects_owner_updated_idx on projects(owner_user_id, updated_at desc);
create index if not exists project_files_project_id_idx on project_files(project_id);
create index if not exists project_versions_project_id_idx on project_versions(project_id, version_number desc);
create index if not exists builds_project_id_idx on builds(project_id, created_at desc);
create index if not exists deployments_project_id_idx on deployments(project_id, created_at desc);
create index if not exists project_domains_project_id_idx on project_domains(project_id);
create index if not exists user_sessions_token_hash_idx on user_sessions(token_hash);
create index if not exists oauth_accounts_user_id_idx on oauth_accounts(user_id);
create index if not exists github_installations_user_id_idx on github_installations(user_id);
create index if not exists github_repositories_installation_id_idx on github_repositories(installation_id);
create index if not exists project_source_connections_repo_idx on project_source_connections(repository_id, branch);
