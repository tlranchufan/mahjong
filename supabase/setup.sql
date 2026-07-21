-- Mahjong League database setup
-- Run this entire file once in Supabase: SQL Editor -> New query -> Run.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.league_settings (
  id integer primary key check (id = 1),
  white_value integer not null default 1 check (white_value > 0),
  red_value integer not null default 5 check (red_value > 0),
  blue_value integer not null default 10 check (blue_value > 0),
  green_value integer not null default 25 check (green_value > 0),
  default_white integer not null default 5 check (default_white >= 0),
  default_red integer not null default 5 check (default_red >= 0),
  default_blue integer not null default 5 check (default_blue >= 0),
  default_green integer not null default 5 check (default_green >= 0),
  updated_at timestamptz not null default now()
);
insert into public.league_settings(id) values (1) on conflict (id) do nothing;

create type public.submission_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  match_date date not null default current_date,
  start_white integer not null check (start_white >= 0),
  start_red integer not null check (start_red >= 0),
  start_blue integer not null check (start_blue >= 0),
  start_green integer not null check (start_green >= 0),
  end_white integer not null check (end_white >= 0),
  end_red integer not null check (end_red >= 0),
  end_blue integer not null check (end_blue >= 0),
  end_green integer not null check (end_green >= 0),
  white_value integer not null default 1 check (white_value > 0),
  red_value integer not null default 5 check (red_value > 0),
  blue_value integer not null default 10 check (blue_value > 0),
  green_value integer not null default 25 check (green_value > 0),
  start_value integer generated always as (
    start_white * white_value + start_red * red_value + start_blue * blue_value + start_green * green_value
  ) stored,
  end_value integer generated always as (
    end_white * white_value + end_red * red_value + end_blue * blue_value + end_green * green_value
  ) stored,
  net_score integer generated always as (
    (end_white - start_white) * white_value +
    (end_red - start_red) * red_value +
    (end_blue - start_blue) * blue_value +
    (end_green - start_green) * green_value
  ) stored,
  notes text,
  status public.submission_status not null default 'pending',
  submitted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  approved_at timestamptz
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  cutoff_at timestamptz not null default now(),
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.settlement_balances (
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  player_id uuid not null references public.players(id),
  balance integer not null,
  primary key (settlement_id, player_id)
);

create table if not exists public.settlement_payments (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  payer_player_id uuid not null references public.players(id),
  payee_player_id uuid not null references public.players(id),
  amount integer not null check (amount > 0),
  check (payer_player_id <> payee_player_id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true);
$$;

create or replace function public.apply_current_chip_values()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.league_settings%rowtype;
begin
  select * into s from public.league_settings where id = 1;
  new.white_value := s.white_value;
  new.red_value := s.red_value;
  new.blue_value := s.blue_value;
  new.green_value := s.green_value;
  return new;
end;
$$;

drop trigger if exists submissions_chip_values on public.submissions;
create trigger submissions_chip_values before insert on public.submissions for each row execute procedure public.apply_current_chip_values();

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.league_settings enable row level security;
alter table public.submissions enable row level security;
alter table public.settlements enable row level security;
alter table public.settlement_balances enable row level security;
alter table public.settlement_payments enable row level security;

-- Profiles
create policy "Users can read their own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Admins can read profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "Admins can update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Players
create policy "Everyone can read active players" on public.players for select to anon, authenticated using (active = true or public.is_admin());
create policy "Admins can add players" on public.players for insert to authenticated with check (public.is_admin());
create policy "Admins can update players" on public.players for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete players" on public.players for delete to authenticated using (public.is_admin());

-- Settings
create policy "Everyone can read settings" on public.league_settings for select to anon, authenticated using (true);
create policy "Admins can update settings" on public.league_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Submissions: public can insert pending rows; only approved rows are publicly visible.
create policy "Everyone can submit pending results" on public.submissions for insert to anon, authenticated
with check (
  status = 'pending' and reviewed_by is null and reviewed_at is null and approved_at is null and
  (submitted_by is null or submitted_by = auth.uid())
);
create policy "Everyone can read approved results" on public.submissions for select to anon, authenticated using (status = 'approved');
create policy "Admins can read all submissions" on public.submissions for select to authenticated using (public.is_admin());
create policy "Admins can update submissions" on public.submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete submissions" on public.submissions for delete to authenticated using (public.is_admin());

-- Settlement history is public; only admins can modify it.
create policy "Everyone can read settlements" on public.settlements for select to anon, authenticated using (true);
create policy "Everyone can read settlement balances" on public.settlement_balances for select to anon, authenticated using (true);
create policy "Everyone can read settlement payments" on public.settlement_payments for select to anon, authenticated using (true);
create policy "Admins can insert settlements" on public.settlements for insert to authenticated with check (public.is_admin());
create policy "Admins can insert settlement balances" on public.settlement_balances for insert to authenticated with check (public.is_admin());
create policy "Admins can insert settlement payments" on public.settlement_payments for insert to authenticated with check (public.is_admin());

create or replace view public.current_leaderboard
with (security_invoker = true) as
select
  p.id as player_id,
  p.name as player_name,
  coalesce(sum(s.net_score) filter (
    where s.status = 'approved'
      and s.approved_at > coalesce((select max(st.cutoff_at) from public.settlements st), '-infinity'::timestamptz)
  ), 0)::integer as balance,
  max(s.match_date) filter (
    where s.status = 'approved'
      and s.approved_at > coalesce((select max(st.cutoff_at) from public.settlements st), '-infinity'::timestamptz)
  ) as last_played
from public.players p
left join public.submissions s on s.player_id = p.id
where p.active = true
group by p.id, p.name;

grant select on public.current_leaderboard to anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.players, public.league_settings, public.submissions, public.settlements, public.settlement_balances, public.settlement_payments to anon, authenticated;
grant insert on public.submissions to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.players, public.league_settings, public.submissions, public.settlements, public.settlement_balances, public.settlement_payments to authenticated;

create or replace function public.finalize_settlement(p_note text, p_payments jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_settlement_id uuid;
  v_snapshot jsonb;
  v_total integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;

  select coalesce(sum(balance), 0), coalesce(jsonb_agg(jsonb_build_object('player_id', player_id, 'balance', balance)), '[]'::jsonb)
  into v_total, v_snapshot
  from public.current_leaderboard;

  if v_total <> 0 then raise exception 'Current balances must add to zero. Current total: %', v_total; end if;

  insert into public.settlements(note, created_by) values (nullif(trim(p_note), ''), auth.uid()) returning id into v_settlement_id;

  insert into public.settlement_balances(settlement_id, player_id, balance)
  select v_settlement_id, x.player_id, x.balance
  from jsonb_to_recordset(v_snapshot) as x(player_id uuid, balance integer);

  if p_payments is not null and jsonb_typeof(p_payments) = 'array' then
    insert into public.settlement_payments(settlement_id, payer_player_id, payee_player_id, amount)
    select v_settlement_id, x.payer_id, x.payee_id, x.amount
    from jsonb_to_recordset(p_payments) as x(payer_id uuid, payee_id uuid, amount integer)
    where x.amount > 0 and x.payer_id <> x.payee_id;
  end if;

  return v_settlement_id;
end;
$$;

grant execute on function public.finalize_settlement(text, jsonb) to authenticated;
