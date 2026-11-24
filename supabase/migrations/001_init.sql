-- MINAH TECH Finance — Supabase PostgreSQL Schema
-- Run in Supabase SQL Editor. Enables UUIDs, NUMERIC money, RLS, indexes, views & functions.

create extension if not exists pgcrypto;

-- ============ TABLES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('personal','business')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  account_type text not null default 'Cash',
  opening_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  parent_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  transaction_type text not null check (transaction_type in ('income','expense','transfer','adjustment')),
  title text not null,
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null,
  description text,
  payment_method text not null default 'UPI',
  reference_number text,
  project_id uuid,
  client_id uuid,
  status text not null default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  vendor text,
  subcategory text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_account_id uuid not null references public.financial_accounts(id) on delete restrict,
  destination_account_id uuid not null references public.financial_accounts(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  transfer_date date not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (source_account_id <> destination_account_id)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  period_type text not null default 'monthly' check (period_type in ('weekly','monthly','custom')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.budget_alerts (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  threshold_pct int not null check (threshold_pct in (75,90,100)),
  notified_at timestamptz not null default now(),
  unique (budget_id, threshold_pct)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  description text,
  contract_amount numeric(14,2) not null check (contract_amount >= 0),
  project_status text not null default 'Not Started',
  start_date date not null,
  expected_completion_date date,
  created_at timestamptz not null default now()
);

-- Link projects to transactions after both exist
alter table public.transactions add column if not exists project_id_fk uuid references public.projects(id) on delete set null;
alter table public.transactions add column if not exists client_id_fk uuid references public.clients(id) on delete set null;

create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null,
  payment_status text not null default 'Received' check (payment_status in ('Received','Pending','Failed')),
  reference_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text not null default 'light',
  default_workspace_id uuid references public.workspaces(id) on delete set null,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ INDEXES ============
create index if not exists idx_tx_workspace_date on public.transactions(workspace_id, transaction_date desc);
create index if not exists idx_tx_account on public.transactions(account_id);
create index if not exists idx_tx_category on public.transactions(category_id);
create index if not exists idx_tx_project on public.transactions(project_id);
create index if not exists idx_accounts_workspace on public.financial_accounts(workspace_id);
create index if not exists idx_categories_workspace on public.categories(workspace_id);
create index if not exists idx_projects_workspace on public.projects(workspace_id);
create index if not exists idx_payments_project on public.project_payments(project_id);
create index if not exists idx_audit_user on public.audit_logs(user_id, created_at desc);

-- ============ BALANCE FUNCTION (single source of truth) ============
create or replace function public.account_balance(p_account_id uuid)
returns numeric language sql stable as $$
  select coalesce(a.opening_balance,0)
    + coalesce((select sum(amount) from public.transactions where account_id = p_account_id and status='confirmed' and transaction_type='income'),0)
    - coalesce((select sum(amount) from public.transactions where account_id = p_account_id and status='confirmed' and transaction_type='expense'),0)
    + coalesce((select sum(amount) from public.transfers where destination_account_id = p_account_id),0)
    - coalesce((select sum(amount) from public.transfers where source_account_id = p_account_id),0)
  from public.financial_accounts a where a.id = p_account_id;
$$;

create or replace function public.project_financials(p_project_id uuid)
returns table (received numeric, pending numeric, expenses numeric, profit numeric) language sql stable as $$
  select
    coalesce((select sum(amount) from public.project_payments where project_id = p_project_id and payment_status='Received'),0) as received,
    (select contract_amount from public.projects where id = p_project_id)
      - coalesce((select sum(amount) from public.project_payments where project_id = p_project_id and payment_status='Received'),0) as pending,
    coalesce((select sum(amount) from public.transactions where project_id = p_project_id and transaction_type='expense'),0) as expenses,
    coalesce((select sum(amount) from public.project_payments where project_id = p_project_id and payment_status='Received'),0)
      - coalesce((select sum(amount) from public.transactions where project_id = p_project_id and transaction_type='expense'),0) as profit;
$$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_alerts enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_payments enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_preferences enable row level security;

-- Helper: is member of workspace?
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = auth.uid());
$$;

create or replace function public.workspace_role(p_workspace_id uuid)
returns text language sql stable security definer as $$
  select role from public.workspace_members where workspace_id = p_workspace_id and user_id = auth.uid() limit 1;
$$;

-- Profiles: users see/edit own profile
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: members can read; owners can manage
create policy "member read workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "owner manage workspaces" on public.workspaces for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Members: members can read their workspace memberships
create policy "member read memberships" on public.workspace_members for select using (public.is_workspace_member(workspace_id));

-- Financial data: members read; owner/admin/editor write; viewer read-only
create policy "member read accounts" on public.financial_accounts for select using (public.is_workspace_member(workspace_id));
create policy "editor write accounts" on public.financial_accounts for insert with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));
create policy "editor update accounts" on public.financial_accounts for update using (public.workspace_role(workspace_id) in ('owner','admin','editor'));
create policy "editor delete accounts" on public.financial_accounts for delete using (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "member read categories" on public.categories for select using (public.is_workspace_member(workspace_id));
create policy "editor write categories" on public.categories for all using (public.workspace_role(workspace_id) in ('owner','admin','editor')) with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "member read transactions" on public.transactions for select using (public.is_workspace_member(workspace_id));
create policy "editor write transactions" on public.transactions for insert with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));
create policy "editor update transactions" on public.transactions for update using (public.workspace_role(workspace_id) in ('owner','admin','editor'));
create policy "editor delete transactions" on public.transactions for delete using (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "member read transfers" on public.transfers for select using (public.is_workspace_member(workspace_id));
create policy "editor write transfers" on public.transfers for all using (public.workspace_role(workspace_id) in ('owner','admin','editor')) with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "member read budgets" on public.budgets for select using (public.is_workspace_member(workspace_id));
create policy "editor write budgets" on public.budgets for all using (public.workspace_role(workspace_id) in ('owner','admin','editor')) with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "member read clients" on public.clients for select using (public.is_workspace_member(workspace_id));
create policy "editor write clients" on public.clients for all using (public.workspace_role(workspace_id) in ('owner','admin','editor')) with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "member read projects" on public.projects for select using (public.is_workspace_member(workspace_id));
create policy "editor write projects" on public.projects for all using (public.workspace_role(workspace_id) in ('owner','admin','editor')) with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "member read payments" on public.project_payments for select using (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)));
create policy "editor write payments" on public.project_payments for all using (exists (select 1 from public.projects p where p.id = project_id and public.workspace_role(p.workspace_id) in ('owner','admin','editor'))) with check (exists (select 1 from public.projects p where p.id = project_id and public.workspace_role(p.workspace_id) in ('owner','admin','editor')));

create policy "member read attachments" on public.attachments for select using (public.is_workspace_member(workspace_id));
create policy "editor write attachments" on public.attachments for all using (public.workspace_role(workspace_id) in ('owner','admin','editor')) with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy "own audit logs" on public.audit_logs for select using (user_id = auth.uid());
create policy "own insert audit" on public.audit_logs for insert with check (user_id = auth.uid());

create policy "own preferences" on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own budget alerts" on public.budget_alerts for all using (exists (select 1 from public.budgets b where b.id = budget_id and public.is_workspace_member(b.workspace_id))) with check (exists (select 1 from public.budgets b where b.id = budget_id and public.workspace_role(b.workspace_id) in ('owner','admin','editor')));

-- ============ STORAGE (private bucket for receipts) ============
-- Create bucket via dashboard or:
-- insert into storage.buckets (id, name, public) values ('receipts','receipts', false) on conflict do nothing;
-- Then add storage policies restricting to workspace members (see README).

-- ============ SEED CATEGORIES (per workspace, run after creating workspaces) ============
-- Personal income: Salary, Freelancing, Cricket, Business Income, Investments, Gifts, Other Income
-- Personal expense: Food, Transportation, Shopping, Education, Cricket / Sports, Health and Fitness, Entertainment, Mobile and Internet, Travel, Family, Personal Development, Other
-- Business income: Website Development, Software Development, Mobile App Development, SaaS Revenue, Maintenance, Client Payments, Internship/Course Revenue, Other Business Income
-- Business expense: Domain and Hosting, Software Subscriptions, Cloud Services, Marketing and Advertising, Client Project Expenses, Employee Payments, Internship Expenses, Development Tools, Office Expenses, Hardware, Internet and Communication, Travel, Other Business Expenses
