-- Huddle plan state (see "State and UI" in CLAUDE.md).
-- plans          one row per detected plan
-- plan_options   flights / hotels / places the agent found
-- votes          the group's votes on options
-- agent_steps    one row per agent tool call; the app streams these with Realtime

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'planning'
    check (status in ('planning', 'needs_input', 'voting', 'ready', 'booked', 'failed')),
  source_app text check (source_app in ('whatsapp', 'instagram')),
  chat_name text,
  title text,
  summary text,
  -- extract_trip output: who / where / when / budget / constraints
  trip jsonb not null default '{}'::jsonb,
  -- set by ask_user when the agent needs the group's input
  pending_question text
);

create table public.plan_options (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  created_at timestamptz not null default now(),
  category text not null
    check (category in ('flight', 'hotel', 'restaurant', 'activity')),
  title text not null,
  subtitle text,
  price_cents integer check (price_cents >= 0),
  currency text not null default 'USD',
  url text,
  image_url text,
  lat double precision,
  lng double precision,
  -- raw fields from SerpAPI / Places the verifier can check against
  details jsonb not null default '{}'::jsonb,
  -- set by tally_votes for the winning option in each category
  is_selected boolean not null default false
);

create index plan_options_plan_id_idx on public.plan_options (plan_id);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  option_id uuid not null references public.plan_options (id) on delete cascade,
  -- MOCK: no accounts for the demo, so voters are identified by name
  voter_name text not null check (length(trim(voter_name)) > 0),
  created_at timestamptz not null default now(),
  unique (option_id, voter_name)
);

create index votes_plan_id_idx on public.votes (plan_id);

create table public.agent_steps (
  id bigint generated always as identity primary key,
  plan_id uuid not null references public.plans (id) on delete cascade,
  step_index integer not null check (step_index >= 0),
  tool text not null,
  -- short, human-readable lines for the "Huddle is working" timeline
  input_summary text,
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  result_summary text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (plan_id, step_index)
);

create index agent_steps_plan_id_idx on public.agent_steps (plan_id);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

-- Row-level security. Edge Functions write with the service-role key, which bypasses RLS.
-- MOCK: login is mocked, so the app (anon key) can read every plan and cast votes.
-- Tighten these to per-group policies when real accounts exist.
alter table public.plans enable row level security;
alter table public.plan_options enable row level security;
alter table public.votes enable row level security;
alter table public.agent_steps enable row level security;

create policy "anon can read plans" on public.plans for select to anon, authenticated using (true);
create policy "anon can read plan options" on public.plan_options
  for select to anon, authenticated using (true);
create policy "anon can read votes" on public.votes for select to anon, authenticated using (true);
create policy "anon can vote" on public.votes for insert to anon, authenticated with check (true);
create policy "anon can change vote" on public.votes for delete to anon, authenticated using (true);
create policy "anon can read agent steps" on public.agent_steps
  for select to anon, authenticated using (true);

-- Realtime: the app streams agent steps, votes and plan status changes.
alter publication supabase_realtime add table public.plans, public.votes, public.agent_steps;
