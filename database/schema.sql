create table if not exists projects (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text,
  framework text not null check (framework in ('nextjs', 'vite', 'static')),
  install_command text not null default 'pnpm install',
  build_command text not null default 'pnpm build',
  start_command text not null default 'pnpm start',
  root_directory text not null default '.',
  status text not null check (status in ('draft', 'ready', 'building', 'deployed', 'failed')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create table if not exists builds (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  version_id text not null references project_versions(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  image_ref text,
  logs text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deployments (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  build_id text references builds(id) on delete set null,
  status text not null check (status in ('pending', 'deploying', 'active', 'failed')),
  namespace text not null,
  service_name text not null,
  image_ref text,
  preview_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_domains (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  hostname text not null unique,
  status text not null check (status in ('pending', 'verifying', 'active', 'failed')) default 'pending',
  dns_records jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index if not exists project_files_project_id_idx on project_files(project_id);
create index if not exists project_versions_project_id_idx on project_versions(project_id, version_number desc);
create index if not exists builds_project_id_idx on builds(project_id, created_at desc);
create index if not exists deployments_project_id_idx on deployments(project_id, created_at desc);
create index if not exists project_domains_project_id_idx on project_domains(project_id);
