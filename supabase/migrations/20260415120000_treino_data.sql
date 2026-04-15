-- Estado do app (JSON): sd, qi, ew, log, ach
-- Executar no Supabase: SQL Editor → New query → Run
-- Ou: supabase db push (com CLI ligado ao projeto)

create table if not exists public.treino_data (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.treino_data is 'Treino app — estado por utilizador autenticado';

alter table public.treino_data enable row level security;

create policy "treino_data_select_own"
  on public.treino_data for select
  to authenticated
  using (auth.uid() = user_id);

create policy "treino_data_insert_own"
  on public.treino_data for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "treino_data_update_own"
  on public.treino_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
