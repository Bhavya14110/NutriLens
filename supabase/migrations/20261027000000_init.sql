-- NutriLens schema: households own everything, RLS keys off membership.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  allergens text[] not null default '{}',
  diet text not null default 'none' check (diet in ('none', 'vegetarian', 'vegan', 'jain')),
  alcohol_ok boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  -- 8 hex chars is plenty for a household invite, and easy to read out loud
  invite_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table public.members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index members_user_idx on public.members (user_id);

create table public.products (
  barcode text primary key,
  name text,
  brand text,
  image_url text,
  nutriscore text check (nutriscore in ('a', 'b', 'c', 'd', 'e')),
  nova smallint check (nova between 1 and 4),
  nutrients jsonb not null default '{}',
  allergens text[] not null default '{}',
  additives text[] not null default '{}',
  categories text[] not null default '{}',
  canon_ing text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  barcode text,
  fruit text,
  name text not null check (char_length(name) between 1 and 120),
  canon_ing text,
  qty numeric not null default 1 check (qty >= 0),
  unit text not null default 'pcs',
  location text not null default 'shelf' check (location in ('fridge', 'freezer', 'shelf')),
  added_at timestamptz not null default now(),
  expires_at date,
  status text not null default 'active' check (status in ('active', 'used', 'wasted')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index pantry_hh_status_idx on public.pantry_items (household_id, status, expires_at);
create index pantry_barcode_idx on public.pantry_items (barcode);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  barcode text not null,
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index scans_hh_idx on public.scans (household_id, scanned_at desc);

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  canon_ing text,
  qty numeric not null default 1 check (qty > 0),
  unit text not null default 'pcs',
  est_cost_inr numeric,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index shop_hh_idx on public.shop_items (household_id, done);

create table public.cook_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  src text not null check (src in ('spoon', 'mealdb')),
  recipe_id text not null,
  title text not null,
  cooked_at timestamptz not null default now(),
  used_items uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index cook_hh_idx on public.cook_logs (household_id, cooked_at desc);

create table public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
create index push_user_idx on public.push_subs (user_id);

create table public.api_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index api_cache_exp_idx on public.api_cache (expires_at);

create table public.quota_log (
  day date primary key,
  points_used numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

-- security definer so policies on members don't recurse into themselves
create or replace function public.is_member(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.household_id = hh and m.user_id = auth.uid()
  );
$$;

create or replace function public.shares_household(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members a
    join public.members b on a.household_id = b.household_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- new auth user -> blank profile, name from Google or the email prefix
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_household(hname text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.households (name) values (trim(hname)) returning id into hid;
  insert into public.members (household_id, user_id, role) values (hid, auth.uid(), 'owner');
  return hid;
end;
$$;

create or replace function public.join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select id into hid from public.households where invite_code = lower(trim(code));
  if hid is null then
    raise exception 'invite code not found';
  end if;
  insert into public.members (household_id, user_id, role)
  values (hid, auth.uid(), 'member')
  on conflict do nothing;
  return hid;
end;
$$;

-- lets the join page show "Join Sharma flat (3 members)" before accepting
create or replace function public.household_preview(code text)
returns table (name text, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select h.name, (select count(*) from public.members m where m.household_id = h.id)
  from public.households h
  where h.invite_code = lower(trim(code));
$$;

-- owner leaving hands the house to the oldest member, last one out deletes it
create or replace function public.leave_household(hh uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wasowner boolean;
  nextuser uuid;
begin
  select role = 'owner' into wasowner from public.members
  where household_id = hh and user_id = auth.uid();
  if wasowner is null then
    raise exception 'not a member';
  end if;
  delete from public.members where household_id = hh and user_id = auth.uid();
  select user_id into nextuser from public.members where household_id = hh order by created_at limit 1;
  if nextuser is null then
    delete from public.households where id = hh;
  elsif wasowner then
    update public.members set role = 'owner' where household_id = hh and user_id = nextuser;
  end if;
end;
$$;

-- atomic bump, only the server (service role) calls this
create or replace function public.add_quota(d date, pts numeric)
returns numeric
language sql
security definer
set search_path = public
as $$
  insert into public.quota_log (day, points_used) values (d, pts)
  on conflict (day) do update set points_used = public.quota_log.points_used + excluded.points_used
  returning points_used;
$$;

revoke execute on function public.add_quota(date, numeric) from public, anon, authenticated;
revoke execute on function public.create_household(text) from public, anon;
revoke execute on function public.join_household(text) from public, anon;
revoke execute on function public.leave_household(uuid) from public, anon;
revoke execute on function public.household_preview(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.household_preview(text) to authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.products enable row level security;
alter table public.pantry_items enable row level security;
alter table public.scans enable row level security;
alter table public.shop_items enable row level security;
alter table public.cook_logs enable row level security;
alter table public.push_subs enable row level security;
alter table public.api_cache enable row level security;
alter table public.quota_log enable row level security;

-- profiles: see yourself and your housemates (allergen alerts need their names)
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.shares_household(user_id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- households: members only; creation goes through create_household()
create policy households_select on public.households for select to authenticated
  using (public.is_member(id));
create policy households_update on public.households for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));

-- members: see your housemates, remove only yourself (joins go through the rpc)
create policy members_select on public.members for select to authenticated
  using (public.is_member(household_id));
create policy members_delete on public.members for delete to authenticated
  using (user_id = auth.uid());

-- products are public OFF data: anyone signed in may read, only the server writes
create policy products_select on public.products for select to authenticated using (true);

create policy pantry_all on public.pantry_items for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy shop_all on public.shop_items for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy cook_all on public.cook_logs for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy scans_select on public.scans for select to authenticated
  using (public.is_member(household_id));
create policy scans_insert on public.scans for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(household_id));

create policy push_all on public.push_subs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- api_cache and quota_log: RLS on with no policies = service role only
