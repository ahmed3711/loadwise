-- =====================================================================
-- LoadWise DEMO DATA (optional, for testing and the final evaluation)
--
-- 1. Run schema-part2.sql first.
-- 2. Change the two emails just below:
--      dispatcher_email = the Dispatcher (or Admin) account that will own the data
--      driver_email     = a Driver account to assign to the box truck ('' = none)
-- 3. Paste into Supabase > SQL Editor and click Run.
--
-- It adds 2 carriers, 3 vehicles, 6 brokers, 13 available loads to match
-- and 3+ weeks of booking history (for the Weight Lab, dashboard and
-- invoices). Running it again first removes the previous demo data.
-- All company names, MC numbers and VINs are made up.
-- =====================================================================
do $$
declare
  dispatcher_email text := 'your-dispatcher@example.com';   -- <-- CHANGE ME
  driver_email     text := '';                              -- <-- optional

  owner_id uuid;
  driver_id uuid;
  lone_star bigint;
  peach bigint;
  box_truck bigint;
  cargo_van bigint;
  dry_van bigint;
  r record;
  new_load bigint;
  new_booking bigint;
begin
  -- ---------- Who owns the demo data ----------
  select u.id into owner_id
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(dispatcher_email) and p.role in ('dispatcher', 'admin');
  if owner_id is null then
    raise exception 'No Dispatcher/Admin account with email %. Sign up in the app first, then edit dispatcher_email.', dispatcher_email;
  end if;

  if driver_email <> '' then
    select u.id into driver_id
    from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) = lower(driver_email) and p.role = 'driver';
    if driver_id is null then
      raise exception 'No Driver account with email %.', driver_email;
    end if;
  end if;

  -- ---------- Remove the previous demo data ----------
  delete from public.loads where created_by = owner_id and broker_mc like '71000%';
  delete from public.carriers where mc_number in ('9900101', '9900102');

  -- ---------- Brokers (risk levels for the demo) ----------
  insert into public.brokers (mc_number, legal_name, authority_status, authority_granted_on, source, notes, checked_by) values
    ('7100001', 'Summit Freight Brokers LLC',   'active',   date '2016-04-12',                     'manual', 'Demo: long-standing broker', owner_id),
    ('7100002', 'Blue Ridge Logistics Inc',     'active',   date '2019-09-03',                     'manual', 'Demo: good payment history', owner_id),
    ('7100003', 'Prairie Lane Brokerage',       'active',   (current_date - interval '4 months')::date, 'manual', 'Demo: authority only 4 months old', owner_id),
    ('7100004', 'QuickHaul Freight Solutions',  'inactive', date '2021-02-15',                     'manual', 'Demo: authority revoked', owner_id),
    ('7100006', 'Heartland Shipping Group',     'active',   date '2014-07-21',                     'manual', 'Demo', owner_id)
  on conflict (mc_number) do update
    set legal_name = excluded.legal_name, authority_status = excluded.authority_status,
        authority_granted_on = excluded.authority_granted_on, source = excluded.source,
        notes = excluded.notes, checked_at = now();
  -- MC 7100005 (Gulf Coast Cargo Partners) is left unchecked on purpose -> "Not verified"
  delete from public.brokers where mc_number = '7100005';

  -- ---------- Carriers ----------
  insert into public.carriers (created_by, company_name, mc_number, dot_number, contact_email, contact_phone,
                               home_city, home_state, zip_code, preferred_states, min_rate_per_mile, fee_percent)
  values (owner_id, 'Lone Star Freight LLC', '9900101', '3990101', 'dispatch@lonestarfreight.example', '2145550101',
          'Dallas', 'TX', '75201', array['TX', 'OK', 'LA', 'AR'], 2.00, 10)
  returning id into lone_star;

  insert into public.carriers (created_by, company_name, mc_number, dot_number, contact_email, contact_phone,
                               home_city, home_state, zip_code, preferred_states, min_rate_per_mile, fee_percent)
  values (owner_id, 'Peach State Hauling Co', '9900102', '3990102', 'ops@peachstatehauling.example', '4045550102',
          'Atlanta', 'GA', '30303', array['GA', 'FL', 'SC', 'NC', 'TN', 'AL'], 2.25, 8)
  returning id into peach;

  -- ---------- Vehicles ----------
  insert into public.vehicles (carrier_id, created_by, equipment_type, length_ft, width_in, height_in, max_payload_lbs,
                               max_pallets, plate_number, vin, current_city, current_state, fuel_cost_per_mile, driver_id)
  values (lone_star, owner_id, 'box_truck', 26, 96, 96, 10000, 12, 'LSF26BX', '1HTMMAAL4EH000101', 'Dallas', 'TX', 0.45, driver_id)
  returning id into box_truck;

  insert into public.vehicles (carrier_id, created_by, equipment_type, length_ft, width_in, height_in, max_payload_lbs,
                               max_pallets, plate_number, vin, current_city, current_state, fuel_cost_per_mile)
  values (lone_star, owner_id, 'cargo_van', 12, 70, 60, 3500, 2, 'LSF12CV', '1FTYR2CM5KKA00102', 'Fort Worth', 'TX', 0.25)
  returning id into cargo_van;

  insert into public.vehicles (carrier_id, created_by, equipment_type, length_ft, width_in, height_in, max_payload_lbs,
                               max_pallets, plate_number, vin, current_city, current_state, fuel_cost_per_mile)
  values (peach, owner_id, 'dry_van', 53, 100, 110, 44000, 26, 'PSH53DV', '1JJV532D8NL000103', 'Atlanta', 'GA', 0.65)
  returning id into dry_van;

  -- Past pickup dates are allowed for the demo history only
  alter table public.loads disable trigger loads_check_dates;

  -- ---------- Available loads to match (pickup in the next days) ----------
  insert into public.loads (created_by, origin_city, origin_state, destination_city, destination_state, pickup_date,
                            delivery_date, loaded_miles, weight_lbs, pallet_count, length_ft, equipment_type, rate_usd,
                            broker_name, broker_mc)
  select owner_id, o_city, o_state, d_city, d_state, current_date + day, current_date + day + ((miles + 499) / 500),
         miles, weight, pallets, len, equip, rate, broker, mc
  from (values
    ('Dallas', 'TX', 'Houston', 'TX', 1, 240, 7500, 8, 18, 'box_truck', 620, 'Summit Freight Brokers', '7100001'),
    ('Fort Worth', 'TX', 'Oklahoma City', 'OK', 1, 205, 9000, 10, 22, 'box_truck', 560, 'Blue Ridge Logistics', '7100002'),
    ('Dallas', 'TX', 'Memphis', 'TN', 2, 450, 8800, 12, 24, 'box_truck', 1350, 'Prairie Lane Brokerage', '7100003'),
    ('Austin', 'TX', 'Denver', 'CO', 2, 920, 6000, 6, 16, 'box_truck', 2900, 'Heartland Shipping Group', '7100006'),
    ('Houston', 'TX', 'New Orleans', 'LA', 3, 350, 5000, 6, 14, 'box_truck', 1050, 'Gulf Coast Cargo Partners', '7100005'),
    ('Dallas', 'TX', 'Chicago', 'IL', 3, 925, 14000, 14, 26, 'box_truck', 2600, 'Summit Freight Brokers', '7100001'),
    ('Dallas', 'TX', 'Phoenix', 'AZ', 4, 1065, 30000, 22, 48, 'dry_van', 3200, 'Heartland Shipping Group', '7100006'),
    ('Waco', 'TX', 'Shreveport', 'LA', 2, 280, 4000, 4, 12, 'box_truck', 820, 'QuickHaul Freight Solutions', '7100004'),
    ('Dallas', 'TX', 'San Antonio', 'TX', 1, 275, 2500, 2, 10, 'cargo_van', 700, 'Summit Freight Brokers', '7100001'),
    ('Dallas', 'TX', 'Little Rock', 'AR', 4, 320, 9500, 11, 24, 'box_truck', 760, 'Heartland Shipping Group', '7100006'),
    ('Atlanta', 'GA', 'Jacksonville', 'FL', 1, 345, 38000, 24, 48, 'dry_van', 900, 'Blue Ridge Logistics', '7100002'),
    ('Savannah', 'GA', 'Charlotte', 'NC', 2, 250, 30000, 20, 40, 'reefer', 1100, 'Summit Freight Brokers', '7100001'),
    ('Atlanta', 'GA', 'Nashville', 'TN', 3, 250, 20000, 14, 30, 'dry_van', 600, 'Heartland Shipping Group', '7100006')
  ) as t(o_city, o_state, d_city, d_state, day, miles, weight, pallets, len, equip, rate, broker, mc);

  -- ---------- Booking history for the box truck ----------
  -- Each day: the load the dispatcher booked (chosen = true) and the loads
  -- they passed on. The dispatcher prefers short empty miles and home
  -- lanes over the highest rate, which the Weight Lab should discover.
  for r in
    select * from (values
      -- day, chosen, origin, o_st, destination, d_st, miles, rate, broker, mc, empty miles, final status
      (-24, true,  'Dallas', 'TX', 'Tulsa', 'OK', 260, 780, 'Summit Freight Brokers', '7100001', 0, 'paid'),
      (-24, false, 'Houston', 'TX', 'Atlanta', 'GA', 790, 2450, 'Blue Ridge Logistics', '7100002', 0, ''),
      (-23, false, 'Amarillo', 'TX', 'Denver', 'CO', 430, 1400, 'Heartland Shipping Group', '7100006', 0, ''),
      (-21, true,  'Fort Worth', 'TX', 'Shreveport', 'LA', 220, 640, 'Heartland Shipping Group', '7100006', 35, 'paid'),
      (-21, false, 'Dallas', 'TX', 'Kansas City', 'MO', 550, 1700, 'Heartland Shipping Group', '7100006', 0, ''),
      (-20, false, 'El Paso', 'TX', 'Phoenix', 'AZ', 430, 1400, 'Summit Freight Brokers', '7100001', 0, ''),
      (-18, true,  'Dallas', 'TX', 'Little Rock', 'AR', 320, 930, 'Blue Ridge Logistics', '7100002', 0, 'delivered'),
      (-18, false, 'Dallas', 'TX', 'St. Louis', 'MO', 630, 1950, 'Blue Ridge Logistics', '7100002', 0, ''),
      (-17, false, 'Houston', 'TX', 'Memphis', 'TN', 560, 1750, 'Summit Freight Brokers', '7100001', 0, ''),
      (-15, true,  'Waco', 'TX', 'Oklahoma City', 'OK', 300, 860, 'Summit Freight Brokers', '7100001', 110, 'delivered'),
      (-15, false, 'Dallas', 'TX', 'Nashville', 'TN', 660, 2050, 'Blue Ridge Logistics', '7100002', 0, ''),
      (-14, false, 'Lubbock', 'TX', 'Albuquerque', 'NM', 330, 1100, 'Summit Freight Brokers', '7100001', 0, ''),
      (-12, true,  'Dallas', 'TX', 'Houston', 'TX', 240, 720, 'Heartland Shipping Group', '7100006', 0, 'delivered'),
      (-12, false, 'Austin', 'TX', 'Atlanta', 'GA', 950, 3000, 'Heartland Shipping Group', '7100006', 0, ''),
      (-11, false, 'Dallas', 'TX', 'Denver', 'CO', 800, 2550, 'Summit Freight Brokers', '7100001', 0, ''),
      (-9,  true,  'Fort Worth', 'TX', 'Baton Rouge', 'LA', 430, 1250, 'Blue Ridge Logistics', '7100002', 35, 'delivered'),
      (-9,  false, 'Dallas', 'TX', 'Chicago', 'IL', 925, 2900, 'Summit Freight Brokers', '7100001', 0, ''),
      (-8,  false, 'Oklahoma City', 'OK', 'Wichita', 'KS', 160, 560, 'Blue Ridge Logistics', '7100002', 0, ''),
      (-6,  true,  'Dallas', 'TX', 'Austin', 'TX', 195, 600, 'Summit Freight Brokers', '7100001', 0, 'delivered'),
      (-6,  false, 'Houston', 'TX', 'Jacksonville', 'FL', 870, 2700, 'Heartland Shipping Group', '7100006', 0, ''),
      (-5,  false, 'Dallas', 'TX', 'Omaha', 'NE', 670, 2100, 'Heartland Shipping Group', '7100006', 0, ''),
      (-3,  true,  'Dallas', 'TX', 'Oklahoma City', 'OK', 205, 640, 'Heartland Shipping Group', '7100006', 0, 'delivered'),
      (-3,  false, 'Dallas', 'TX', 'Atlanta', 'GA', 780, 2450, 'Blue Ridge Logistics', '7100002', 0, ''),
      (-2,  false, 'El Paso', 'TX', 'Tucson', 'AZ', 320, 1050, 'Summit Freight Brokers', '7100001', 0, ''),
      (-1,  true,  'Fort Worth', 'TX', 'Little Rock', 'AR', 330, 980, 'Summit Freight Brokers', '7100001', 35, 'in_transit'),
      (2,   true,  'Dallas', 'TX', 'Shreveport', 'LA', 190, 600, 'Heartland Shipping Group', '7100006', 0, 'booked')
    ) as h(day, chosen, o_city, o_state, d_city, d_state, miles, rate, broker, mc, empty_miles, final_status)
  loop
    insert into public.loads (created_by, origin_city, origin_state, destination_city, destination_state, pickup_date,
                              delivery_date, loaded_miles, weight_lbs, pallet_count, length_ft, equipment_type,
                              rate_usd, broker_name, broker_mc)
    values (owner_id, r.o_city, r.o_state, r.d_city, r.d_state, current_date + r.day,
            current_date + r.day + ((r.miles + 499) / 500), r.miles, 8000, 10, 22, 'box_truck',
            r.rate, r.broker, r.mc)
    returning id into new_load;

    if r.chosen then
      insert into public.bookings (load_id, vehicle_id, carrier_id, created_by, deadhead_miles, net_rpm, score)
      values (
        new_load, box_truck, lone_star, owner_id, r.empty_miles,
        round((r.rate - r.empty_miles * 0.45) / (r.miles + r.empty_miles), 2),
        -- Approximate score with the default weights (net RPM, empty miles, lanes, broker)
        round(
          40 * least(1, greatest(0, ((r.rate - r.empty_miles * 0.45) / (r.miles + r.empty_miles) - 1.0) / 2.0))
          + 25 * least(1, greatest(0, 1 - (r.empty_miles::numeric / (r.miles + r.empty_miles)) / 0.5))
          + 20 * ((case when r.o_state in ('TX', 'OK', 'LA', 'AR') then 0.5 else 0 end)
                + (case when r.d_state in ('TX', 'OK', 'LA', 'AR') then 0.5 else 0 end))
          + 15
        )
      )
      returning id into new_booking;

      update public.bookings
      set status = r.final_status,
          booked_at = (current_date + r.day - 1)::timestamptz,
          delivered_at = case when r.final_status in ('delivered', 'paid')
                              then (current_date + r.day + ((r.miles + 499) / 500))::timestamptz end
      where id = new_booking;
    else
      -- A load the dispatcher passed on: someone else took it
      update public.loads set status = 'booked' where id = new_load;
    end if;
  end loop;

  alter table public.loads enable trigger loads_check_dates;

  raise notice 'Demo data added for %: carriers %, %; vehicles %, %, %', dispatcher_email, lone_star, peach, box_truck, cargo_van, dry_van;
end;
$$;
