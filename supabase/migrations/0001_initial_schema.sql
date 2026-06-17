-- =============================================================================
-- STK Render AI — Migration 0001: Schema Base (MVP / Fase 1)
-- =============================================================================
-- Escopo: profiles, projects, project_files, technical_analysis, prompts,
-- scenario_library, ai_providers, provider_routing_rules, jobs.
-- Tabelas de billing/render/QC ficam para a Fase 2 (migration 0002).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- PROFILES
-- Espelha auth.users com dados próprios da aplicação.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: cria um profile automaticamente ao registrar um novo usuário.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- AI PROVIDERS
-- Registro central de providers de Analysis e Render (provider-agnostic).
-- -----------------------------------------------------------------------------
create table public.ai_providers (
  id uuid primary key default uuid_generate_v4(),
  provider_key text not null unique,
  category text not null check (category in ('analysis', 'render')),
  display_name text not null,
  capabilities text[] not null default '{}',
  cost_tier text not null default 'low' check (cost_tier in ('low', 'medium', 'high')),
  cost_per_unit numeric(10, 6),
  cost_unit text,
  max_resolution text,
  active boolean not null default true,
  priority integer not null default 1,
  config jsonb not null default '{}',
  fallback_provider_id uuid references public.ai_providers (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Leitura pública (apenas para que a aplicação resolva providers ativos).
-- Sem políticas de escrita: gestão é administrativa (service role).
alter table public.ai_providers enable row level security;

create policy "Authenticated users can read active providers"
  on public.ai_providers for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- PROVIDER ROUTING RULES
-- Define qual provider usar em cada estágio do pipeline.
-- -----------------------------------------------------------------------------
create table public.provider_routing_rules (
  id uuid primary key default uuid_generate_v4(),
  pipeline_stage text not null unique,
  primary_provider_id uuid not null references public.ai_providers (id),
  fallback_provider_id uuid references public.ai_providers (id),
  fallback_provider_2_id uuid references public.ai_providers (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.provider_routing_rules enable row level security;

create policy "Authenticated users can read routing rules"
  on public.provider_routing_rules for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- SCENARIO LIBRARY
-- Biblioteca de cenários (data-driven) consumida pelo Engineering Core.
-- -----------------------------------------------------------------------------
create table public.scenario_library (
  id uuid primary key default uuid_generate_v4(),
  context_type text not null unique,
  name text not null,
  active boolean not null default true,
  version integer not null default 1,
  description text,
  data jsonb not null, -- camera, urban_context, landscaping, humanization, vehicles,
                        -- lighting, weather, time_of_day, vegetation,
                        -- predominant_materials, engineering_rules,
                        -- structural_fidelity_constraints, incompatibilities
  weight numeric(4, 2) not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scenario_library enable row level security;

create policy "Authenticated users can read active scenarios"
  on public.scenario_library for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- PROJECTS
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'uploaded' check (
    status in (
      'uploaded',
      'analyzing',
      'analyzed',
      'approved',
      'prompt_ready',
      'error'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- PROJECT FILES
-- -----------------------------------------------------------------------------
create table public.project_files (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_type text not null check (file_type in ('jpg', 'jpeg', 'png', 'pdf', 'ifc', 'dwg')),
  storage_path text not null,
  original_filename text not null,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

create index project_files_project_id_idx on public.project_files (project_id);

alter table public.project_files enable row level security;

create policy "Users can view files of their own projects"
  on public.project_files for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert files into their own projects"
  on public.project_files for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete files of their own projects"
  on public.project_files for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- TECHNICAL ANALYSIS
-- -----------------------------------------------------------------------------
create table public.technical_analysis (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  raw_report text not null,
  structured_json jsonb not null, -- EngineeringJSON v1
  structure_type text check (structure_type in ('metalica', 'concreto', 'mista')),
  analysis_provider_id uuid references public.ai_providers (id),
  created_at timestamptz not null default now()
);

create index technical_analysis_project_id_idx on public.technical_analysis (project_id);

alter table public.technical_analysis enable row level security;

create policy "Users can view analysis of their own projects"
  on public.technical_analysis for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = technical_analysis.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Inserções de análise são feitas pelo backend (service role / route handlers
-- com privilégios elevados), não diretamente pelo cliente.

-- -----------------------------------------------------------------------------
-- PROMPTS
-- -----------------------------------------------------------------------------
create table public.prompts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  structured_json_snapshot jsonb not null, -- EngineeringJSON + engineering_lock no momento da aprovação
  scenario_variant_used jsonb not null,
  final_prompt text not null,
  model_used text,
  created_at timestamptz not null default now()
);

create index prompts_project_id_idx on public.prompts (project_id);

alter table public.prompts enable row level security;

create policy "Users can view prompts of their own projects"
  on public.prompts for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = prompts.project_id
      and projects.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- JOBS
-- Fila de processamento assíncrono (polling-based no MVP).
-- -----------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  job_type text not null check (
    job_type in ('parse_file', 'analyze', 'structure_json', 'build_prompt')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'done', 'failed')
  ),
  payload jsonb not null default '{}',
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_project_id_idx on public.jobs (project_id);
create index jobs_status_idx on public.jobs (status);

alter table public.jobs enable row level security;

create policy "Users can view jobs of their own projects"
  on public.jobs for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = jobs.project_id
      and projects.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- updated_at TRIGGER HELPER
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_projects_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();

create trigger set_jobs_updated_at before update on public.jobs
  for each row execute procedure public.set_updated_at();

create trigger set_ai_providers_updated_at before update on public.ai_providers
  for each row execute procedure public.set_updated_at();

create trigger set_provider_routing_rules_updated_at before update on public.provider_routing_rules
  for each row execute procedure public.set_updated_at();

create trigger set_scenario_library_updated_at before update on public.scenario_library
  for each row execute procedure public.set_updated_at();
