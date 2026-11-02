-- =====================================================================
-- LoadWise database (Step 3)
-- Tables, validation rules (CHECK constraints), sign-up trigger
-- and Row Level Security (RLS) policies.
-- Paste this whole file into Supabase > SQL Editor and click Run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. CLEAN START: removes old versions so this script can be re-run
--    (WARNING: this deletes all data in these tables)
-- ---------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.loads cascade;
drop table if exists public.vehicles cascade;
drop table if exists public.carriers cascade;
drop table if exists public.profiles cascade;
drop table if exists public.connection_test cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.get_my_role() cascade;
drop function if exists public.check_load_dates() cascade;
drop function if exists public.us_states() cascade;


-- ---------------------------------------------------------------------
-- 1. HELPER: list of valid US state codes (50 states + DC)
-- ---------------------------------------------------------------------
create function public.us_states()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
    'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
    'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
    'VT','VA','WA','WV','WI','WY'
  ]
$$;


-- ---------------------------------------------------------------------
-- 2. PROFILES: one row for every user (linked to Supabase Auth)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null
              check (full_name ~ '^[A-Za-z ]{2,50}$' and char_length(trim(full_name)) >= 2),
  age         integer not null check (age between 18 and 75),
  phone       text not null check (phone ~ '^[0-9]{10}$'),
  role        text not null
              check (role in ('admin', 'dispatcher', 'carrier_owner', 'driver')),
  created_at  timestamptz not null default now(),
  -- Drivers must be at least 21 years old
  constraint driver_min_age check (role <> 'driver' or age >= 21)
);


-- ---------------------------------------------------------------------
-- 3. AUTO-CREATE A PROFILE WHEN SOMEONE SIGNS UP
--    Takes name, age, phone and role from the sign-up form data.
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, age, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    (new.raw_user_meta_data ->> 'age')::integer,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'role'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Helper used by the security rules: returns the logged-in user's role
create function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;


-- ---------------------------------------------------------------------
-- 4. CARRIERS: trucking companies managed by a dispatcher (FR-01)
-- ---------------------------------------------------------------------
create table public.carriers (
  id                 bigint generated always as identity primary key,
  created_by         uuid not null default auth.uid()
                     references public.profiles (id) on delete cascade,
  company_name       text not null check (char_length(trim(company_name)) between 2 and 100),
  mc_number          text not null unique check (mc_number ~ '^[0-9]{6,8}$'),
  dot_number         text not null unique check (dot_number ~ '^[0-9]{5,8}$'),
  contact_email      text not null
                     check (contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  contact_phone      text not null check (contact_phone ~ '^[0-9]{10}$'),
  home_city          text not null check (home_city ~ '^[A-Za-z .''-]{2,50}$'),
  home_state         text not null check (home_state = any (public.us_states())),
  zip_code           text not null check (zip_code ~ '^[0-9]{5}$'),
  preferred_states   text[] not null default '{}'
                     check (preferred_states <@ public.us_states()),
  min_rate_per_mile  numeric not null
                     check (min_rate_per_mile > 0 and min_rate_per_mile <= 20
                            and scale(min_rate_per_mile) <= 2),
  created_at         timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. VEHICLES: each vehicle belongs to one carrier
--    (deleting a carrier also deletes its vehicles)
-- ---------------------------------------------------------------------
create table public.vehicles (
  id               bigint generated always as identity primary key,
  carrier_id       bigint not null references public.carriers (id) on delete cascade,
  created_by       uuid not null default auth.uid()
                   references public.profiles (id) on delete cascade,
  equipment_type   text not null
                   check (equipment_type in ('cargo_van', 'box_truck', 'dry_van', 'reefer', 'flatbed')),
  length_ft        numeric not null check (length_ft between 5 and 53),
  width_in         numeric not null check (width_in between 40 and 102),
  height_in        numeric not null check (height_in between 36 and 162),
  max_payload_lbs  integer not null check (max_payload_lbs between 1 and 80000),
  max_pallets      integer not null check (max_pallets between 0 and 30),
  plate_number     text not null check (plate_number ~ '^[A-Z0-9]{2,8}$'),
  vin              text not null unique check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  created_at       timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 6. LOADS: freight entered by form or CSV (FR-03, FR-04)
-- ---------------------------------------------------------------------
create table public.loads (
  id                 bigint generated always as identity primary key,
  created_by         uuid not null default auth.uid()
                     references public.profiles (id) on delete cascade,
  origin_city        text not null check (origin_city ~ '^[A-Za-z .''-]{2,50}$'),
  origin_state       text not null check (origin_state = any (public.us_states())),
  destination_city   text not null check (destination_city ~ '^[A-Za-z .''-]{2,50}$'),
  destination_state  text not null check (destination_state = any (public.us_states())),
  pickup_date        date not null,
  delivery_date      date not null,
  loaded_miles       integer not null check (loaded_miles between 1 and 5000),
  weight_lbs         integer not null check (weight_lbs between 1 and 80000),
  pallet_count       integer not null check (pallet_count between 0 and 30),
  length_ft          numeric not null check (length_ft > 0 and length_ft <= 53),
  equipment_type     text not null
                     check (equipment_type in ('cargo_van', 'box_truck', 'dry_van', 'reefer', 'flatbed')),
  rate_usd           numeric not null
                     check (rate_usd > 0 and rate_usd <= 100000 and scale(rate_usd) <= 2),
  broker_name        text not null check (char_length(trim(broker_name)) between 2 and 100),
  broker_mc          text not null check (broker_mc ~ '^[0-9]{6,8}$'),
  status             text not null default 'available'
                     check (status in ('available', 'booked', 'picked_up', 'in_transit', 'delivered', 'paid')),
  created_at         timestamptz not null default now(),
  -- Delivery must be on or after pickup
  constraint delivery_after_pickup check (delivery_date >= pickup_date)
);

-- Pickup date can't be in the past (checked for new loads, or when the
-- pickup date is changed, so old loads can still be edited later)
create function public.check_load_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.pickup_date <> old.pickup_date then
    if new.pickup_date < current_date then
      raise exception 'Pickup date cannot be in the past';
    end if;
  end if;
  return new;
end;
$$;

create trigger loads_check_dates
  before insert or update on public.loads
  for each row execute function public.check_load_dates();

-- Indexes make "show me my rows" queries faster
create index on public.carriers (created_by);
create index on public.vehicles (carrier_id);
create index on public.vehicles (created_by);
create index on public.loads (created_by);


-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS)
--    Admin: everything. Dispatcher: only rows they created.
--    Carrier Owner & Driver: read only. Logged-out users: nothing.
--    REMEMBER: RLS ON + no policy = empty results!
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.carriers enable row level security;
alter table public.vehicles enable row level security;
alter table public.loads    enable row level security;

-- ----- PROFILES -----
create policy "Users see own profile, admin sees all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "Only admin can update profiles"
  on public.profiles for update to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ----- CARRIERS -----
create policy "View carriers"
  on public.carriers for select to authenticated
  using (
    public.get_my_role() in ('admin', 'carrier_owner', 'driver')
    or created_by = auth.uid()
  );

create policy "Admin and dispatchers add carriers"
  on public.carriers for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  );

create policy "Admin or owner dispatcher edits carriers"
  on public.carriers for update to authenticated
  using (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  )
  with check (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  );

create policy "Admin or owner dispatcher deletes carriers"
  on public.carriers for delete to authenticated
  using (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  );

-- ----- VEHICLES -----
create policy "View vehicles"
  on public.vehicles for select to authenticated
  using (
    public.get_my_role() in ('admin', 'carrier_owner', 'driver')
    or created_by = auth.uid()
  );

-- A dispatcher can only add a vehicle to a carrier they created
create policy "Admin and dispatchers add vehicles"
  on public.vehicles for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'dispatcher'
      and created_by = auth.uid()
      and exists (
        select 1 from public.carriers c
        where c.id = carrier_id and c.created_by = auth.uid()
      )
    )
  );

create policy "Admin or owner dispatcher edits vehicles"
  on public.vehicles for update to authenticated
  using (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  )
  with check (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'dispatcher'
      and created_by = auth.uid()
      and exists (
        select 1 from public.carriers c
        where c.id = carrier_id and c.created_by = auth.uid()
      )
    )
  );

create policy "Admin or owner dispatcher deletes vehicles"
  on public.vehicles for delete to authenticated
  using (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  );

-- ----- LOADS -----
create policy "View loads"
  on public.loads for select to authenticated
  using (
    public.get_my_role() in ('admin', 'carrier_owner', 'driver')
    or created_by = auth.uid()
  );

create policy "Admin and dispatchers add loads"
  on public.loads for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  );

create policy "Admin or owner dispatcher edits loads"
  on public.loads for update to authenticated
  using (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  )
  with check (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  );

create policy "Admin or owner dispatcher deletes loads"
  on public.loads for delete to authenticated
  using (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
  );
