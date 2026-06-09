create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  privy_user_id text not null unique,
  wallet_address text not null unique,
  email text,
  display_name text,
  role text not null default 'applicant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists grants (
  id text primary key,
  contract_round_id text unique,
  owner_profile_id uuid references profiles(id) on delete set null,
  owner_wallet_address text not null,
  title text not null,
  public_summary text not null default '',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists grant_members (
  id uuid primary key default gen_random_uuid(),
  grant_id text not null references grants(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  member_role text not null,
  created_at timestamptz not null default now(),
  unique (grant_id, profile_id, member_role)
);

create table if not exists applications (
  id text primary key,
  grant_id text not null references grants(id) on delete cascade,
  applicant_profile_id uuid not null references profiles(id) on delete cascade,
  applicant_wallet_address text not null,
  status text not null default 'draft',
  public_summary text not null default '',
  content_hash text,
  content_cid text,
  requested_amount numeric,
  currency text,
  category text,
  evidence_summaries jsonb not null default '[]'::jsonb,
  private_body jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists application_files (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references applications(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_cid text,
  file_hash text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists reviewer_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references applications(id) on delete cascade,
  reviewer_profile_id uuid not null references profiles(id) on delete cascade,
  assigned_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (application_id, reviewer_profile_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references applications(id) on delete cascade,
  reviewer_profile_id uuid references profiles(id) on delete set null,
  review_type text not null,
  reviewer_notes text,
  admin_notes text,
  verdict text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists contract_sync_events (
  id uuid primary key default gen_random_uuid(),
  contract_address text not null,
  contract_round_id text,
  contract_proposal_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  tx_hash text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table grants enable row level security;
alter table grant_members enable row level security;
alter table applications enable row level security;
alter table application_files enable row level security;
alter table reviewer_assignments enable row level security;
alter table reviews enable row level security;
alter table audit_logs enable row level security;
alter table contract_sync_events enable row level security;

-- These policies are placeholders for the server-backed access layer; the app will read/write through API routes using service role.
create policy "profiles_service_only" on profiles for all using (false) with check (false);
create policy "grants_service_only" on grants for all using (false) with check (false);
create policy "grant_members_service_only" on grant_members for all using (false) with check (false);
create policy "applications_service_only" on applications for all using (false) with check (false);
create policy "application_files_service_only" on application_files for all using (false) with check (false);
create policy "reviewer_assignments_service_only" on reviewer_assignments for all using (false) with check (false);
create policy "reviews_service_only" on reviews for all using (false) with check (false);
create policy "audit_logs_service_only" on audit_logs for all using (false) with check (false);
create policy "contract_sync_events_service_only" on contract_sync_events for all using (false) with check (false);
