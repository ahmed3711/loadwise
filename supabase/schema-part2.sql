-- =====================================================================
-- LoadWise database, PART 2 (final milestone)
-- Matching engine, broker risk check, bookings, invoices, driver view.
--
-- Run this AFTER schema.sql. Paste the whole file into
-- Supabase > SQL Editor and click Run.
-- It only ADDS tables, columns and rules, so the carriers, vehicles and
-- loads you already saved are kept. It is safe to run more than once.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CARRIERS: dispatch fee and matching score weights (FR-09, FR-14)
--    Weights are whole percentages and must add up to 100.
-- ---------------------------------------------------------------------
alter table public.carriers
  add column if not exists fee_percent numeric not null default 10
    check (fee_percent > 0 and fee_percent <= 50 and scale(fee_percent) <= 2),
  add column if not exists weight_rpm integer not null default 40
    check (weight_rpm between 0 and 100),
  add column if not exists weight_deadhead integer not null default 25
    check (weight_deadhead between 0 and 100),
  add column if not exists weight_lane integer not null default 20
    check (weight_lane between 0 and 100),
  add column if not exists weight_broker integer not null default 15
    check (weight_broker between 0 and 100);

alter table public.carriers drop constraint if exists weights_add_up_to_100;
alter table public.carriers add constraint weights_add_up_to_100
  check (weight_rpm + weight_deadhead + weight_lane + weight_broker = 100);


-- ---------------------------------------------------------------------
-- 2. VEHICLES: current location (for empty miles), fuel cost per mile
--    and the driver assigned to the vehicle (FR-06, FR-07, FR-15)
-- ---------------------------------------------------------------------
alter table public.vehicles
  add column if not exists current_city text
    check (current_city is null or current_city ~ '^[A-Za-z .''-]{2,50}$'),
  add column if not exists current_state text
    check (current_state is null or current_state = any (public.us_states())),
  add column if not exists fuel_cost_per_mile numeric not null default 0.60
    check (fuel_cost_per_mile > 0 and fuel_cost_per_mile <= 5 and scale(fuel_cost_per_mile) <= 2),
  add column if not exists driver_id uuid references public.profiles (id) on delete set null;

-- City and state are given together, or both left empty (then the
-- carrier's home base is used as the truck's location)
alter table public.vehicles drop constraint if exists current_location_complete;
alter table public.vehicles add constraint current_location_complete
  check ((current_city is null) = (current_state is null));

-- A driver can only be assigned to one vehicle
create unique index if not exists vehicles_one_vehicle_per_driver
  on public.vehicles (driver_id) where driver_id is not null;

-- Only users with the Driver role can be assigned as a driver
create or replace function public.check_vehicle_driver()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.driver_id is not null and coalesce(
    (select role from public.profiles where id = new.driver_id), ''
  ) <> 'driver' then
    raise exception 'Only a user with the Driver role can be assigned to a vehicle';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_check_driver on public.vehicles;
create trigger vehicles_check_driver
  before insert or update of driver_id on public.vehicles
  for each row execute function public.check_vehicle_driver();


-- ---------------------------------------------------------------------
-- 3. BROKERS: cached FMCSA results or manual checks (FR-10, FR-11, NFR-04)
--    Broker authority is public information, so every logged-in user
--    can read it. Only Admins and Dispatchers can save checks.
-- ---------------------------------------------------------------------
create table if not exists public.brokers (
  mc_number             text primary key check (mc_number ~ '^[0-9]{6,8}$'),
  legal_name            text check (legal_name is null or char_length(legal_name) <= 200),
  dot_number            text check (dot_number is null or dot_number ~ '^[0-9]{1,8}$'),
  authority_status      text not null check (authority_status in ('active', 'inactive', 'not_found')),
  authority_granted_on  date check (authority_granted_on is null or authority_granted_on <= current_date),
  source                text not null check (source in ('fmcsa', 'manual')),
  notes                 text check (notes is null or char_length(notes) <= 300),
  checked_at            timestamptz not null default now(),
  checked_by            uuid default auth.uid() references public.profiles (id) on delete set null
);

-- Risk level for a broker MC number (same rules as lib/brokers/risk.mjs):
--   high    = authority inactive / not found, or less than 12 months old
--   low     = active and at least 12 months old
--   unknown = never checked, or the authority date is not known yet
create or replace function public.broker_risk(p_mc text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when b.mc_number is null then 'unknown'
    when b.authority_status <> 'active' then 'high'
    when b.authority_granted_on is null then 'unknown'
    when b.authority_granted_on > (current_date - interval '12 months') then 'high'
    else 'low'
  end
  from (select 1) as one
  left join public.brokers b on b.mc_number = p_mc
$$;


-- ---------------------------------------------------------------------
-- 4. INVOICES: one weekly dispatch-fee invoice per carrier (FR-14)
--    Created only by the generate_invoice() function below, so the
--    totals always come from booking records, never typed by hand.
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id               bigint generated always as identity primary key,
  invoice_number   text not null unique,
  carrier_id       bigint not null references public.carriers (id) on delete cascade,
  created_by       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  week_start       date not null check (extract(isodow from week_start) = 1),
  week_end         date not null,
  load_count       integer not null check (load_count > 0),
  total_line_haul  numeric not null check (total_line_haul >= 0),
  fee_percent      numeric not null check (fee_percent > 0 and fee_percent <= 50),
  fee_amount       numeric not null check (fee_amount >= 0),
  status           text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  constraint one_invoice_per_carrier_week unique (carrier_id, week_start),
  constraint invoice_week_is_7_days check (week_end = week_start + 6)
);


-- ---------------------------------------------------------------------
-- 5. BOOKINGS: a load booked on a vehicle, tracked to "Paid" (FR-12, FR-13)
--    The matching numbers (empty miles, net rate per mile, score) are
--    saved at booking time so reports show what the dispatcher saw.
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id              bigint generated always as identity primary key,
  load_id         bigint not null unique references public.loads (id) on delete cascade,
  vehicle_id      bigint not null references public.vehicles (id),
  carrier_id      bigint not null references public.carriers (id) on delete cascade,
  created_by      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status          text not null default 'booked'
                  check (status in ('booked', 'picked_up', 'in_transit', 'delivered', 'paid')),
  deadhead_miles  integer not null check (deadhead_miles between 0 and 5000),
  net_rpm         numeric not null check (net_rpm between -100 and 100),
  score           integer not null check (score between 0 and 100),
  broker_risk     text not null default 'unknown' check (broker_risk in ('low', 'high', 'unknown')),
  risk_confirmed  boolean not null default false,
  invoice_id      bigint references public.invoices (id) on delete set null,
  booked_at       timestamptz not null default now(),
  delivered_at    timestamptz,
  -- FR-12 risk gate: a risky or unchecked broker needs the dispatcher's confirmation
  constraint risk_gate check (broker_risk = 'low' or risk_confirmed)
);

create index if not exists bookings_vehicle_idx on public.bookings (vehicle_id);
create index if not exists bookings_carrier_idx on public.bookings (carrier_id);
create index if not exists bookings_created_by_idx on public.bookings (created_by);
create index if not exists bookings_invoice_idx on public.bookings (invoice_id);

-- Which vehicle types can carry a load posted for each equipment type
-- (same rules as lib/matching/scoring.mjs). A reefer can also haul dry freight.
create or replace function public.equipment_can_carry(p_vehicle text, p_load text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_vehicle = p_load or (p_load = 'dry_van' and p_vehicle = 'reefer')
$$;

-- Runs before a booking is saved. This is the last safety net (CCP
-- "Consequences"): even if someone skips the website, the database
-- refuses a booking that doesn't fit the vehicle.
create or replace function public.prepare_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.loads%rowtype;
  v public.vehicles%rowtype;
begin
  select * into l from public.loads where id = new.load_id;
  select * into v from public.vehicles where id = new.vehicle_id;

  if l.id is null then raise exception 'This load no longer exists'; end if;
  if v.id is null then raise exception 'This vehicle no longer exists'; end if;
  if l.status <> 'available' then raise exception 'This load is no longer available'; end if;

  -- Hard fit filter (FR-05)
  if not public.equipment_can_carry(v.equipment_type, l.equipment_type) then
    raise exception 'Load needs a % but this vehicle is a %', l.equipment_type, v.equipment_type;
  end if;
  if l.weight_lbs > v.max_payload_lbs then
    raise exception 'Load weight (% lbs) is over the vehicle payload (% lbs)', l.weight_lbs, v.max_payload_lbs;
  end if;
  if l.pallet_count > v.max_pallets then
    raise exception 'Load has % pallets but the vehicle holds %', l.pallet_count, v.max_pallets;
  end if;
  if l.length_ft > v.length_ft then
    raise exception 'Load length (% ft) is longer than the vehicle (% ft)', l.length_ft, v.length_ft;
  end if;

  -- Values the user can't choose
  new.carrier_id   := v.carrier_id;
  new.broker_risk  := public.broker_risk(l.broker_mc);
  new.status       := 'booked';
  new.invoice_id   := null;
  new.delivered_at := null;
  new.booked_at    := now();
  return new;
end;
$$;

drop trigger if exists bookings_prepare on public.bookings;
create trigger bookings_prepare
  before insert on public.bookings
  for each row execute function public.prepare_booking();

-- Keeps the load's status the same as its booking
create or replace function public.sync_load_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Booking cancelled: the load is available again
    update public.loads set status = 'available' where id = old.load_id;
    return old;
  end if;
  update public.loads set status = new.status where id = new.load_id;
  return new;
end;
$$;

drop trigger if exists bookings_sync_load on public.bookings;
create trigger bookings_sync_load
  after insert or delete or update of status on public.bookings
  for each row execute function public.sync_load_status();


-- ---------------------------------------------------------------------
-- 6. HELPERS used by the security rules
-- ---------------------------------------------------------------------
-- Is this vehicle driven by the logged-in driver?
create or replace function public.is_my_vehicle(p_vehicle_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicles
    where id = p_vehicle_id and driver_id = auth.uid()
  )
$$;

-- Is this load booked on the logged-in driver's vehicle? (FR-15)
create or replace function public.is_my_driver_load(p_load_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.vehicles v on v.id = b.vehicle_id
    where b.load_id = p_load_id and v.driver_id = auth.uid()
  )
$$;


-- ---------------------------------------------------------------------
-- 7. CHANGING A BOOKING'S STATUS (FR-13)
--    Status moves one step at a time:
--    Booked -> Picked up -> In transit -> Delivered -> Paid
--    Drivers can move their own loads up to "Delivered".
-- ---------------------------------------------------------------------
create or replace function public.set_booking_status(p_booking_id bigint, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings%rowtype;
  my_role text := public.get_my_role();
  steps text[] := array['booked', 'picked_up', 'in_transit', 'delivered', 'paid'];
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'Booking not found'; end if;

  -- Who may change it
  if not (
    my_role = 'admin'
    or (my_role = 'dispatcher' and b.created_by = auth.uid())
    or (my_role = 'driver' and public.is_my_vehicle(b.vehicle_id)
        and p_status in ('picked_up', 'in_transit', 'delivered'))
  ) then
    raise exception 'You don''t have permission to change this booking';
  end if;

  -- Only the next step is allowed
  if array_position(steps, p_status) is distinct from array_position(steps, b.status) + 1 then
    raise exception 'A booking that is % can''t be moved to %', replace(b.status, '_', ' '), replace(p_status, '_', ' ');
  end if;

  update public.bookings
  set status = p_status,
      delivered_at = case when p_status = 'delivered' then now() else delivered_at end
  where id = p_booking_id;

  return p_status;
end;
$$;


-- ---------------------------------------------------------------------
-- 8. GENERATING A WEEKLY INVOICE (FR-14)
--    Fee = carrier's fee % of the line-haul rate of every delivered
--    (or paid) load whose delivery date is in that Monday-Sunday week.
--    Running it again for the same week adds loads delivered since.
-- ---------------------------------------------------------------------
create or replace function public.generate_invoice(p_carrier_id bigint, p_week date)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.carriers%rowtype;
  my_role text := public.get_my_role();
  v_week_start date := date_trunc('week', p_week)::date;  -- Monday
  v_week_end date := date_trunc('week', p_week)::date + 6; -- Sunday
  existing public.invoices%rowtype;
  new_id bigint;
  line_count integer;
  line_haul numeric;
begin
  select * into c from public.carriers where id = p_carrier_id;
  if c.id is null then raise exception 'Carrier not found'; end if;
  if not (my_role = 'admin' or (my_role = 'dispatcher' and c.created_by = auth.uid())) then
    raise exception 'You don''t have permission to invoice this carrier';
  end if;

  select * into existing from public.invoices
  where carrier_id = p_carrier_id and week_start = v_week_start;

  if existing.id is not null and existing.status = 'paid' then
    raise exception 'The invoice for this week is already paid and can''t be changed';
  end if;

  -- Delivered loads for this carrier and week that aren't on another invoice
  select count(*), coalesce(sum(l.rate_usd), 0)
  into line_count, line_haul
  from public.bookings b
  join public.loads l on l.id = b.load_id
  where b.carrier_id = p_carrier_id
    and b.status in ('delivered', 'paid')
    and l.delivery_date between v_week_start and v_week_end
    and (b.invoice_id is null or b.invoice_id = existing.id);

  if line_count = 0 then
    raise exception 'No delivered loads for this carrier in the week of %', to_char(v_week_start, 'Mon DD, YYYY');
  end if;

  if existing.id is null then
    insert into public.invoices (
      invoice_number, carrier_id, created_by, week_start, week_end,
      load_count, total_line_haul, fee_percent, fee_amount
    ) values (
      'LW-' || to_char(v_week_start, 'IYYY') || '-W' || to_char(v_week_start, 'IW') || '-' || lpad(c.id::text, 4, '0'),
      c.id, coalesce(auth.uid(), c.created_by), v_week_start, v_week_end,
      line_count, line_haul, c.fee_percent, round(line_haul * c.fee_percent / 100, 2)
    )
    returning id into new_id;
  else
    update public.invoices
    set load_count = line_count,
        total_line_haul = line_haul,
        fee_percent = c.fee_percent,
        fee_amount = round(line_haul * c.fee_percent / 100, 2)
    where id = existing.id;
    new_id := existing.id;
  end if;

  update public.bookings b
  set invoice_id = new_id
  from public.loads l
  where l.id = b.load_id
    and b.carrier_id = p_carrier_id
    and b.status in ('delivered', 'paid')
    and l.delivery_date between v_week_start and v_week_end
    and b.invoice_id is null;

  return new_id;
end;
$$;

create or replace function public.mark_invoice_paid(p_invoice_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invoices%rowtype;
  my_role text := public.get_my_role();
begin
  select * into i from public.invoices where id = p_invoice_id;
  if i.id is null then raise exception 'Invoice not found'; end if;
  if not (my_role = 'admin' or (my_role = 'dispatcher' and i.created_by = auth.uid())) then
    raise exception 'You don''t have permission to change this invoice';
  end if;
  update public.invoices set status = 'paid', paid_at = now() where id = p_invoice_id;
end;
$$;

-- Only logged-in users can call these functions
revoke execute on function public.set_booking_status(bigint, text) from public, anon;
revoke execute on function public.generate_invoice(bigint, date) from public, anon;
revoke execute on function public.mark_invoice_paid(bigint) from public, anon;
grant execute on function public.set_booking_status(bigint, text) to authenticated;
grant execute on function public.generate_invoice(bigint, date) to authenticated;
grant execute on function public.mark_invoice_paid(bigint) to authenticated;


-- ---------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY for the new tables
-- ---------------------------------------------------------------------
alter table public.brokers  enable row level security;
alter table public.bookings enable row level security;
alter table public.invoices enable row level security;

-- ----- BROKERS -----
drop policy if exists "Everyone logged in can view brokers" on public.brokers;
create policy "Everyone logged in can view brokers"
  on public.brokers for select to authenticated
  using (true);

drop policy if exists "Admin and dispatchers save broker checks" on public.brokers;
create policy "Admin and dispatchers save broker checks"
  on public.brokers for insert to authenticated
  with check (public.get_my_role() in ('admin', 'dispatcher'));

drop policy if exists "Admin and dispatchers update broker checks" on public.brokers;
create policy "Admin and dispatchers update broker checks"
  on public.brokers for update to authenticated
  using (public.get_my_role() in ('admin', 'dispatcher'))
  with check (public.get_my_role() in ('admin', 'dispatcher'));

-- ----- BOOKINGS -----
-- (no UPDATE policy: status only changes through set_booking_status)
drop policy if exists "View bookings" on public.bookings;
create policy "View bookings"
  on public.bookings for select to authenticated
  using (
    public.get_my_role() in ('admin', 'carrier_owner')
    or created_by = auth.uid()
    or (public.get_my_role() = 'driver' and public.is_my_vehicle(vehicle_id))
  );

drop policy if exists "Admin and dispatchers book their loads" on public.bookings;
create policy "Admin and dispatchers book their loads"
  on public.bookings for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'dispatcher'
      and created_by = auth.uid()
      and exists (select 1 from public.loads l where l.id = load_id and l.created_by = auth.uid())
      and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.created_by = auth.uid())
    )
  );

drop policy if exists "Cancel a booking before pickup" on public.bookings;
create policy "Cancel a booking before pickup"
  on public.bookings for delete to authenticated
  using (
    status = 'booked'
    and (
      public.get_my_role() = 'admin'
      or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
    )
  );

-- ----- INVOICES -----
-- (no INSERT/UPDATE policy: generate_invoice and mark_invoice_paid do that)
drop policy if exists "View invoices" on public.invoices;
create policy "View invoices"
  on public.invoices for select to authenticated
  using (
    public.get_my_role() in ('admin', 'carrier_owner')
    or created_by = auth.uid()
  );

drop policy if exists "Delete unpaid invoices" on public.invoices;
create policy "Delete unpaid invoices"
  on public.invoices for delete to authenticated
  using (
    status = 'unpaid'
    and (
      public.get_my_role() = 'admin'
      or (public.get_my_role() = 'dispatcher' and created_by = auth.uid())
    )
  );

-- ----- LOADS: drivers now only see loads assigned to their vehicle (FR-15) -----
drop policy if exists "View loads" on public.loads;
create policy "View loads"
  on public.loads for select to authenticated
  using (
    public.get_my_role() in ('admin', 'carrier_owner')
    or created_by = auth.uid()
    or (public.get_my_role() = 'driver' and public.is_my_driver_load(id))
  );

-- ----- PROFILES: Admins and Dispatchers can see drivers (to assign them) -----
drop policy if exists "Managers see driver profiles" on public.profiles;
create policy "Managers see driver profiles"
  on public.profiles for select to authenticated
  using (role = 'driver' and public.get_my_role() in ('admin', 'dispatcher'));
