-- =====================================================================
-- LoadWise DEMO DATA (optional, for testing and the final evaluation)
--
-- 1. Run schema-part2.sql first.
-- 2. Change the two emails just below:
--      dispatcher_email = the Dispatcher (or Admin) account that will own the data
--      driver_email     = a Driver account to assign to the Dallas box truck ('' = none)
-- 3. Paste into Supabase > SQL Editor and click Run.
--
-- Adds: 7 carriers, 11 vehicles, 10 brokers (low / high / not verified),
-- about 38 available loads to match, 4 weeks of booking history for every
-- carrier, and weekly invoices (the older week already paid).
-- Running it again first removes the previous demo data (and any bookings
-- you made on demo loads). Your own carriers, vehicles and loads are kept.
-- All company names, MC numbers, phone numbers and VINs are made up.
-- =====================================================================
do $$
declare
  dispatcher_email text := 'your-dispatcher@example.com';   -- <-- CHANGE ME
  driver_email     text := '';                              -- <-- optional

  demo_mcs text[] := array['9900101', '9900102', '9900103', '9900104', '9900105', '9900106', '9900107'];
  owner_id uuid;
  v_driver_id uuid;
  r record;
  v record;
  c record;
  new_load bigint;
  new_booking bigint;
  empty_miles integer;
  net numeric;
  lane numeric;
  risk text;
  v_invoice_id bigint;
  week date;
  invoice_count integer := 0;
begin
  -- ---------- Who owns the demo data ----------
  select u.id into owner_id
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(dispatcher_email) and p.role in ('dispatcher', 'admin');
  if owner_id is null then
    raise exception 'No Dispatcher/Admin account with email %. Sign up in the app first, then edit dispatcher_email.', dispatcher_email;
  end if;

  if driver_email <> '' then
    select u.id into v_driver_id
    from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) = lower(driver_email) and p.role = 'driver';
    if v_driver_id is null then
      raise exception 'No Driver account with email %.', driver_email;
    end if;
  end if;

  -- ---------- Remove the previous demo data ----------
  delete from public.loads where created_by = owner_id and broker_mc like '71000%';  -- also removes their bookings
  delete from public.carriers where mc_number = any (demo_mcs);                      -- also removes vehicles + invoices

  -- ---------- Brokers (10) ----------
  insert into public.brokers (mc_number, legal_name, authority_status, authority_granted_on, source, notes, checked_by) values
    ('7100001', 'Summit Freight Brokers LLC',   'active',    date '2016-04-12', 'manual', 'Demo: long-standing broker, pays in 30 days', owner_id),
    ('7100002', 'Blue Ridge Logistics Inc',     'active',    date '2019-09-03', 'manual', 'Demo: good payment history', owner_id),
    ('7100003', 'Prairie Lane Brokerage',       'active',    (current_date - interval '4 months')::date, 'manual', 'Demo: authority only 4 months old', owner_id),
    ('7100004', 'QuickHaul Freight Solutions',  'inactive',  date '2021-02-15', 'manual', 'Demo: authority revoked', owner_id),
    ('7100006', 'Heartland Shipping Group',     'active',    date '2014-07-21', 'manual', 'Demo: quick pay available', owner_id),
    ('7100007', 'Coastal Connect Logistics',    'active',    date '2020-05-18', 'manual', 'Demo: verified by phone', owner_id),
    ('7100008', 'Redline Transport Brokers',    'active',    (current_date - interval '8 months')::date, 'manual', 'Demo: new broker, check references', owner_id),
    ('7100009', 'Great Plains Freight Network', 'active',    date '2017-11-02', 'manual', 'Demo: Midwest specialist', owner_id),
    ('7100010', 'Northstar Load Partners',      'not_found', null,              'manual', 'Demo: MC number not found at FMCSA', owner_id)
  on conflict (mc_number) do update
    set legal_name = excluded.legal_name, authority_status = excluded.authority_status,
        authority_granted_on = excluded.authority_granted_on, source = excluded.source,
        notes = excluded.notes, checked_at = now();
  -- MC 7100005 (Gulf Coast Cargo Partners) is left unchecked on purpose -> "Not verified"
  delete from public.brokers where mc_number = '7100005';

  -- ---------- Carriers (7) ----------
  insert into public.carriers (created_by, company_name, mc_number, dot_number, contact_email, contact_phone,
                               home_city, home_state, zip_code, preferred_states, min_rate_per_mile, fee_percent)
  select owner_id, name, mc, dot, email, phone, city, st, zip, pref, min_rate, fee
  from (values
    ('Lone Star Freight LLC',      '9900101', '3990101', 'dispatch@lonestarfreight.example', '2145550101', 'Dallas',     'TX', '75201', array['TX', 'OK', 'LA', 'AR'],             2.00, 10.0),
    ('Peach State Hauling Co',     '9900102', '3990102', 'ops@peachstatehauling.example',    '4045550102', 'Atlanta',    'GA', '30303', array['GA', 'FL', 'SC', 'NC', 'TN', 'AL'], 2.25, 8.0),
    ('Windy City Express Inc',     '9900103', '3990103', 'loads@windycityexpress.example',   '3125550103', 'Chicago',    'IL', '60601', array['IL', 'IN', 'WI', 'MI', 'OH'],       2.10, 9.0),
    ('Desert Sun Carriers LLC',    '9900104', '3990104', 'team@desertsuncarriers.example',   '6025550104', 'Phoenix',    'AZ', '85004', array['AZ', 'NV', 'CA', 'NM', 'UT'],       2.30, 10.0),
    ('Sunshine Route Logistics',   '9900105', '3990105', 'hello@sunshineroute.example',      '4075550105', 'Orlando',    'FL', '32801', array['FL', 'GA', 'AL'],                   2.15, 7.5),
    ('Rocky Mountain Movers LLC',  '9900106', '3990106', 'dispatch@rockymtnmovers.example',  '3035550106', 'Denver',     'CO', '80202', array['CO', 'UT', 'WY', 'NM', 'KS'],       2.40, 10.0),
    ('Keystone Cargo Co',          '9900107', '3990107', 'office@keystonecargo.example',     '7175550107', 'Harrisburg', 'PA', '17101', array['PA', 'NJ', 'NY', 'MD', 'OH'],       2.20, 9.0)
  ) as t(name, mc, dot, email, phone, city, st, zip, pref, min_rate, fee);

  -- ---------- Vehicles (11) ----------
  insert into public.vehicles (carrier_id, created_by, equipment_type, length_ft, width_in, height_in, max_payload_lbs,
                               max_pallets, plate_number, vin, current_city, current_state, fuel_cost_per_mile)
  select (select id from public.carriers where mc_number = mc), owner_id, equip, len, wid, hgt, payload,
         pallets, plate, vin, city, st, fuel
  from (values
    ('9900101', 'box_truck', 26, 96, 96, 10000, 12, 'LSF26BX', '1HTMMAAL4EH000101', 'Dallas', 'TX', 0.45),
    ('9900101', 'cargo_van', 12, 70, 60, 3500, 2, 'LSF12CV', '1FTYR2CM5KKA00102', 'Fort Worth', 'TX', 0.25),
    ('9900102', 'dry_van', 53, 100, 110, 44000, 26, 'PSH53DV', '1JJV532D8NL000103', 'Atlanta', 'GA', 0.65),
    ('9900102', 'reefer', 53, 98, 108, 43000, 26, 'PSH53RF', '1JJV532W2NL000104', 'Atlanta', 'GA', 0.75),
    ('9900103', 'box_truck', 24, 96, 96, 10000, 10, 'WCE24BX', '1HTMMAAN6FH000105', 'Chicago', 'IL', 0.45),
    ('9900103', 'dry_van', 53, 100, 110, 44000, 26, 'WCE53DV', '1JJV532D3PL000106', 'Joliet', 'IL', 0.65),
    ('9900104', 'flatbed', 48, 102, 60, 45000, 24, 'DSC48FB', '1UYFS2483RA000107', 'Phoenix', 'AZ', 0.65),
    ('9900104', 'cargo_van', 15, 70, 70, 4000, 3, 'DSC15CV', '1FTBW2CM7RKA00108', 'Tucson', 'AZ', 0.28),
    ('9900105', 'box_truck', 20, 96, 90, 8000, 8, 'SRL20BX', '1HTMMAAM8GH000109', 'Orlando', 'FL', 0.42),
    ('9900106', 'reefer', 53, 98, 108, 43000, 26, 'RMM53RF', '1UYVS2538SM000110', 'Denver', 'CO', 0.78),
    ('9900107', 'dry_van', 53, 100, 110, 44000, 26, 'KCC53DV', '1JJV532D5TL000111', 'Harrisburg', 'PA', 0.65)
  ) as t(mc, equip, len, wid, hgt, payload, pallets, plate, vin, city, st, fuel);

  if v_driver_id is not null then
    update public.vehicles set driver_id = v_driver_id where plate_number = 'LSF26BX';
  end if;

  -- Past pickup dates are allowed for the demo history only
  alter table public.loads disable trigger loads_check_dates;

  -- ---------- Available loads to match (pickup in the next 1-6 days) ----------
  insert into public.loads (created_by, origin_city, origin_state, destination_city, destination_state, pickup_date,
                            delivery_date, loaded_miles, weight_lbs, pallet_count, length_ft, equipment_type, rate_usd,
                            broker_name, broker_mc)
  select owner_id, o_city, o_state, d_city, d_state, current_date + day, current_date + day + ((miles + 499) / 500),
         miles, weight, pallets, len, equip, rate, broker, mc
  from (values
    -- Texas (Lone Star box truck + cargo van)
    ('Dallas', 'TX', 'Houston', 'TX', 1, 240, 7500, 8, 18, 'box_truck', 620, 'Summit Freight Brokers', '7100001'),
    ('Fort Worth', 'TX', 'Oklahoma City', 'OK', 1, 205, 9000, 10, 22, 'box_truck', 560, 'Blue Ridge Logistics', '7100002'),
    ('Dallas', 'TX', 'Memphis', 'TN', 2, 450, 8800, 12, 24, 'box_truck', 1350, 'Prairie Lane Brokerage', '7100003'),
    ('Austin', 'TX', 'Denver', 'CO', 2, 920, 6000, 6, 16, 'box_truck', 2900, 'Heartland Shipping Group', '7100006'),
    ('Houston', 'TX', 'New Orleans', 'LA', 3, 350, 5000, 6, 14, 'box_truck', 1050, 'Gulf Coast Cargo Partners', '7100005'),
    ('Dallas', 'TX', 'Chicago', 'IL', 3, 925, 14000, 14, 26, 'box_truck', 2600, 'Summit Freight Brokers', '7100001'),
    ('Dallas', 'TX', 'Phoenix', 'AZ', 4, 1065, 30000, 22, 48, 'dry_van', 3200, 'Heartland Shipping Group', '7100006'),
    ('Waco', 'TX', 'Shreveport', 'LA', 2, 280, 4000, 4, 12, 'box_truck', 820, 'QuickHaul Freight Solutions', '7100004'),
    ('Dallas', 'TX', 'San Antonio', 'TX', 1, 275, 2500, 2, 10, 'cargo_van', 700, 'Summit Freight Brokers', '7100001'),
    ('Fort Worth', 'TX', 'Austin', 'TX', 2, 190, 1800, 1, 8, 'cargo_van', 480, 'Coastal Connect Logistics', '7100007'),
    ('Dallas', 'TX', 'Little Rock', 'AR', 4, 320, 9500, 11, 24, 'box_truck', 760, 'Heartland Shipping Group', '7100006'),
    -- Georgia (Peach State dry van + reefer)
    ('Atlanta', 'GA', 'Jacksonville', 'FL', 1, 345, 38000, 24, 48, 'dry_van', 900, 'Blue Ridge Logistics', '7100002'),
    ('Savannah', 'GA', 'Charlotte', 'NC', 2, 250, 30000, 20, 40, 'reefer', 1100, 'Summit Freight Brokers', '7100001'),
    ('Atlanta', 'GA', 'Nashville', 'TN', 3, 250, 20000, 14, 30, 'dry_van', 600, 'Heartland Shipping Group', '7100006'),
    ('Atlanta', 'GA', 'Charlotte', 'NC', 2, 245, 32000, 20, 44, 'reefer', 820, 'Great Plains Freight Network', '7100009'),
    ('Lakeland', 'FL', 'Savannah', 'GA', 3, 300, 28000, 18, 40, 'reefer', 1050, 'Summit Freight Brokers', '7100001'),
    -- Midwest (Windy City box truck + dry van)
    ('Chicago', 'IL', 'Indianapolis', 'IN', 1, 180, 7000, 8, 18, 'box_truck', 520, 'Great Plains Freight Network', '7100009'),
    ('Chicago', 'IL', 'Detroit', 'MI', 2, 285, 9000, 10, 22, 'box_truck', 780, 'Summit Freight Brokers', '7100001'),
    ('Joliet', 'IL', 'Milwaukee', 'WI', 1, 110, 5000, 6, 14, 'box_truck', 380, 'Redline Transport Brokers', '7100008'),
    ('Chicago', 'IL', 'Minneapolis', 'MN', 3, 410, 12000, 12, 24, 'box_truck', 1100, 'Heartland Shipping Group', '7100006'),
    ('Chicago', 'IL', 'Columbus', 'OH', 2, 355, 36000, 22, 48, 'dry_van', 1050, 'Coastal Connect Logistics', '7100007'),
    ('Gary', 'IN', 'Cleveland', 'OH', 3, 330, 30000, 20, 40, 'dry_van', 990, 'Northstar Load Partners', '7100010'),
    -- Southwest (Desert Sun flatbed + cargo van)
    ('Phoenix', 'AZ', 'Las Vegas', 'NV', 1, 300, 38000, 0, 40, 'flatbed', 1150, 'Heartland Shipping Group', '7100006'),
    ('Tucson', 'AZ', 'Albuquerque', 'NM', 2, 450, 42000, 0, 45, 'flatbed', 1500, 'Prairie Lane Brokerage', '7100003'),
    ('Phoenix', 'AZ', 'Los Angeles', 'CA', 3, 370, 46000, 0, 48, 'flatbed', 1300, 'Summit Freight Brokers', '7100001'),
    ('Phoenix', 'AZ', 'San Diego', 'CA', 2, 355, 3000, 2, 10, 'cargo_van', 900, 'Coastal Connect Logistics', '7100007'),
    ('Phoenix', 'AZ', 'Tucson', 'AZ', 1, 115, 1800, 1, 8, 'cargo_van', 350, 'Gulf Coast Cargo Partners', '7100005'),
    -- Florida (Sunshine box truck)
    ('Orlando', 'FL', 'Miami', 'FL', 1, 235, 6000, 6, 16, 'box_truck', 640, 'Coastal Connect Logistics', '7100007'),
    ('Tampa', 'FL', 'Jacksonville', 'FL', 2, 200, 7500, 8, 18, 'box_truck', 560, 'Blue Ridge Logistics', '7100002'),
    ('Orlando', 'FL', 'Atlanta', 'GA', 3, 440, 9000, 9, 20, 'box_truck', 1150, 'Redline Transport Brokers', '7100008'),
    -- Rockies (Rocky Mountain reefer)
    ('Denver', 'CO', 'Salt Lake City', 'UT', 1, 520, 35000, 22, 48, 'reefer', 1650, 'Heartland Shipping Group', '7100006'),
    ('Denver', 'CO', 'Kansas City', 'MO', 2, 600, 40000, 24, 50, 'reefer', 1700, 'Redline Transport Brokers', '7100008'),
    ('Colorado Springs', 'CO', 'Albuquerque', 'NM', 3, 380, 25000, 16, 40, 'dry_van', 1100, 'Summit Freight Brokers', '7100001'),
    -- Northeast (Keystone dry van)
    ('Harrisburg', 'PA', 'Newark', 'NJ', 1, 165, 30000, 22, 48, 'dry_van', 680, 'Coastal Connect Logistics', '7100007'),
    ('Philadelphia', 'PA', 'Baltimore', 'MD', 2, 100, 20000, 12, 30, 'dry_van', 450, 'Gulf Coast Cargo Partners', '7100005'),
    ('Allentown', 'PA', 'Buffalo', 'NY', 3, 300, 41000, 26, 53, 'dry_van', 980, 'Great Plains Freight Network', '7100009'),
    ('Pittsburgh', 'PA', 'Columbus', 'OH', 2, 185, 30000, 0, 40, 'flatbed', 700, 'QuickHaul Freight Solutions', '7100004'),
    ('Scranton', 'PA', 'Albany', 'NY', 4, 160, 22000, 14, 36, 'dry_van', 600, 'Blue Ridge Logistics', '7100002')
  ) as t(o_city, o_state, d_city, d_state, day, miles, weight, pallets, len, equip, rate, broker, mc);

  -- ---------- Booking history ----------
  -- chosen = true: the dispatcher booked it on that vehicle (with its final status).
  -- chosen = false: a load they passed on (someone else took it).
  -- For the Dallas box truck the dispatcher prefers short empty miles and
  -- home lanes over the highest rate, which the Weight Lab should discover.
  for r in
    select * from (values
      -- plate, day, chosen, origin, o_st, destination, d_st, miles, rate, broker, mc, final status, weight, pallets, length, equipment
      ('LSF26BX', -24, true,  'Dallas', 'TX', 'Tulsa', 'OK', 260, 780, 'Summit Freight Brokers', '7100001', 'paid', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -24, false, 'Houston', 'TX', 'Atlanta', 'GA', 790, 2450, 'Blue Ridge Logistics', '7100002', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -23, false, 'Amarillo', 'TX', 'Denver', 'CO', 430, 1400, 'Heartland Shipping Group', '7100006', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -21, true,  'Fort Worth', 'TX', 'Shreveport', 'LA', 220, 640, 'Heartland Shipping Group', '7100006', 'paid', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -21, false, 'Dallas', 'TX', 'Kansas City', 'MO', 550, 1700, 'Heartland Shipping Group', '7100006', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -20, false, 'El Paso', 'TX', 'Phoenix', 'AZ', 430, 1400, 'Summit Freight Brokers', '7100001', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -18, true,  'Dallas', 'TX', 'Little Rock', 'AR', 320, 930, 'Blue Ridge Logistics', '7100002', 'delivered', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -18, false, 'Dallas', 'TX', 'St. Louis', 'MO', 630, 1950, 'Blue Ridge Logistics', '7100002', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -17, false, 'Houston', 'TX', 'Memphis', 'TN', 560, 1750, 'Summit Freight Brokers', '7100001', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -15, true,  'Waco', 'TX', 'Oklahoma City', 'OK', 300, 860, 'Summit Freight Brokers', '7100001', 'delivered', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -15, false, 'Dallas', 'TX', 'Nashville', 'TN', 660, 2050, 'Blue Ridge Logistics', '7100002', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -14, false, 'Lubbock', 'TX', 'Albuquerque', 'NM', 330, 1100, 'Summit Freight Brokers', '7100001', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -12, true,  'Dallas', 'TX', 'Houston', 'TX', 240, 720, 'Heartland Shipping Group', '7100006', 'delivered', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -12, false, 'Austin', 'TX', 'Atlanta', 'GA', 950, 3000, 'Heartland Shipping Group', '7100006', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -11, false, 'Dallas', 'TX', 'Denver', 'CO', 800, 2550, 'Summit Freight Brokers', '7100001', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -9,  true,  'Fort Worth', 'TX', 'Baton Rouge', 'LA', 430, 1250, 'Blue Ridge Logistics', '7100002', 'delivered', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -9,  false, 'Dallas', 'TX', 'Chicago', 'IL', 925, 2900, 'Summit Freight Brokers', '7100001', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -8,  false, 'Oklahoma City', 'OK', 'Wichita', 'KS', 160, 560, 'Blue Ridge Logistics', '7100002', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -6,  true,  'Dallas', 'TX', 'Austin', 'TX', 195, 600, 'Summit Freight Brokers', '7100001', 'delivered', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -6,  false, 'Houston', 'TX', 'Jacksonville', 'FL', 870, 2700, 'Heartland Shipping Group', '7100006', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -5,  false, 'Dallas', 'TX', 'Omaha', 'NE', 670, 2100, 'Heartland Shipping Group', '7100006', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -3,  true,  'Dallas', 'TX', 'Oklahoma City', 'OK', 205, 640, 'Heartland Shipping Group', '7100006', 'delivered', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -3,  false, 'Dallas', 'TX', 'Atlanta', 'GA', 780, 2450, 'Blue Ridge Logistics', '7100002', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -2,  false, 'El Paso', 'TX', 'Tucson', 'AZ', 320, 1050, 'Summit Freight Brokers', '7100001', '', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', -1,  true,  'Fort Worth', 'TX', 'Little Rock', 'AR', 330, 980, 'Summit Freight Brokers', '7100001', 'in_transit', 8000, 10, 22, 'box_truck'),
      ('LSF26BX', 2,   true,  'Dallas', 'TX', 'Shreveport', 'LA', 190, 600, 'Heartland Shipping Group', '7100006', 'booked', 8000, 10, 22, 'box_truck'),
      -- Lone Star cargo van
      ('LSF12CV', -10, true,  'Fort Worth', 'TX', 'Waco', 'TX', 90, 280, 'Coastal Connect Logistics', '7100007', 'delivered', 1500, 1, 8, 'cargo_van'),
      ('LSF12CV', -4,  true,  'Dallas', 'TX', 'Austin', 'TX', 195, 520, 'Summit Freight Brokers', '7100001', 'delivered', 2200, 2, 10, 'cargo_van'),
      -- Peach State dry van + reefer
      ('PSH53DV', -20, true,  'Atlanta', 'GA', 'Birmingham', 'AL', 150, 520, 'Blue Ridge Logistics', '7100002', 'paid', 30000, 20, 44, 'dry_van'),
      ('PSH53DV', -13, true,  'Atlanta', 'GA', 'Orlando', 'FL', 440, 1150, 'Blue Ridge Logistics', '7100002', 'delivered', 34000, 22, 48, 'dry_van'),
      ('PSH53DV', -8,  true,  'Atlanta', 'GA', 'Charlotte', 'NC', 245, 700, 'Summit Freight Brokers', '7100001', 'delivered', 28000, 20, 44, 'dry_van'),
      ('PSH53DV', -1,  true,  'Atlanta', 'GA', 'Nashville', 'TN', 250, 640, 'Coastal Connect Logistics', '7100007', 'in_transit', 26000, 18, 40, 'dry_van'),
      ('PSH53RF', -11, true,  'Savannah', 'GA', 'Tampa', 'FL', 340, 1180, 'Heartland Shipping Group', '7100006', 'delivered', 36000, 24, 48, 'reefer'),
      ('PSH53RF', -5,  true,  'Atlanta', 'GA', 'Columbia', 'SC', 215, 760, 'Great Plains Freight Network', '7100009', 'delivered', 30000, 20, 44, 'reefer'),
      -- Windy City box truck + dry van
      ('WCE24BX', -14, true,  'Chicago', 'IL', 'Rockford', 'IL', 90, 320, 'Great Plains Freight Network', '7100009', 'paid', 6000, 6, 16, 'box_truck'),
      ('WCE24BX', -10, true,  'Chicago', 'IL', 'Milwaukee', 'WI', 92, 330, 'Great Plains Freight Network', '7100009', 'delivered', 6000, 6, 16, 'box_truck'),
      ('WCE24BX', -7,  true,  'Chicago', 'IL', 'Indianapolis', 'IN', 180, 540, 'Summit Freight Brokers', '7100001', 'delivered', 7500, 8, 18, 'box_truck'),
      ('WCE24BX', -2,  true,  'Joliet', 'IL', 'Detroit', 'MI', 280, 760, 'Great Plains Freight Network', '7100009', 'picked_up', 8000, 9, 20, 'box_truck'),
      ('WCE53DV', -9,  true,  'Joliet', 'IL', 'Fort Wayne', 'IN', 160, 560, 'Coastal Connect Logistics', '7100007', 'delivered', 32000, 22, 48, 'dry_van'),
      ('WCE53DV', -4,  true,  'Chicago', 'IL', 'Toledo', 'OH', 245, 720, 'Heartland Shipping Group', '7100006', 'delivered', 38000, 24, 48, 'dry_van'),
      -- Desert Sun flatbed + cargo van
      ('DSC48FB', -18, true,  'Phoenix', 'AZ', 'Tucson', 'AZ', 115, 520, 'Heartland Shipping Group', '7100006', 'paid', 36000, 0, 40, 'flatbed'),
      ('DSC48FB', -11, true,  'Phoenix', 'AZ', 'Las Vegas', 'NV', 300, 1200, 'Heartland Shipping Group', '7100006', 'delivered', 40000, 0, 44, 'flatbed'),
      ('DSC48FB', -5,  true,  'Phoenix', 'AZ', 'Albuquerque', 'NM', 420, 1400, 'Coastal Connect Logistics', '7100007', 'delivered', 42000, 0, 46, 'flatbed'),
      ('DSC48FB', 3,   true,  'Tucson', 'AZ', 'El Paso', 'TX', 320, 1050, 'Heartland Shipping Group', '7100006', 'booked', 38000, 0, 42, 'flatbed'),
      ('DSC15CV', -6,  true,  'Tucson', 'AZ', 'Phoenix', 'AZ', 115, 340, 'Coastal Connect Logistics', '7100007', 'delivered', 1800, 1, 8, 'cargo_van'),
      -- Sunshine box truck
      ('SRL20BX', -12, true,  'Orlando', 'FL', 'Lakeland', 'FL', 55, 240, 'Coastal Connect Logistics', '7100007', 'paid', 4000, 4, 12, 'box_truck'),
      ('SRL20BX', -8,  true,  'Orlando', 'FL', 'Tampa', 'FL', 85, 320, 'Coastal Connect Logistics', '7100007', 'delivered', 5000, 5, 14, 'box_truck'),
      ('SRL20BX', -4,  true,  'Orlando', 'FL', 'Jacksonville', 'FL', 140, 450, 'Blue Ridge Logistics', '7100002', 'delivered', 6000, 6, 16, 'box_truck'),
      -- Rocky Mountain reefer
      ('RMM53RF', -16, true,  'Denver', 'CO', 'Colorado Springs', 'CO', 70, 340, 'Summit Freight Brokers', '7100001', 'paid', 30000, 20, 44, 'reefer'),
      ('RMM53RF', -9,  true,  'Denver', 'CO', 'Salt Lake City', 'UT', 520, 1700, 'Heartland Shipping Group', '7100006', 'delivered', 38000, 22, 48, 'reefer'),
      ('RMM53RF', -6,  true,  'Denver', 'CO', 'Cheyenne', 'WY', 100, 420, 'Great Plains Freight Network', '7100009', 'delivered', 26000, 18, 40, 'reefer'),
      ('RMM53RF', -2,  true,  'Colorado Springs', 'CO', 'Denver', 'CO', 70, 300, 'Summit Freight Brokers', '7100001', 'in_transit', 24000, 16, 36, 'reefer'),
      -- Keystone dry van
      ('KCC53DV', -12, true,  'Harrisburg', 'PA', 'Philadelphia', 'PA', 105, 480, 'Coastal Connect Logistics', '7100007', 'paid', 30000, 20, 44, 'dry_van'),
      ('KCC53DV', -7,  true,  'Allentown', 'PA', 'Newark', 'NJ', 85, 420, 'Summit Freight Brokers', '7100001', 'delivered', 28000, 18, 40, 'dry_van'),
      ('KCC53DV', -3,  true,  'Harrisburg', 'PA', 'Pittsburgh', 'PA', 205, 700, 'Great Plains Freight Network', '7100009', 'delivered', 34000, 22, 48, 'dry_van')
    ) as h(plate, day, chosen, o_city, o_state, d_city, d_state, miles, rate, broker, mc, final_status,
           weight, pallets, len, equip)
  loop
    insert into public.loads (created_by, origin_city, origin_state, destination_city, destination_state, pickup_date,
                              delivery_date, loaded_miles, weight_lbs, pallet_count, length_ft, equipment_type,
                              rate_usd, broker_name, broker_mc)
    values (owner_id, r.o_city, r.o_state, r.d_city, r.d_state, current_date + r.day,
            current_date + r.day + ((r.miles + 499) / 500), r.miles, r.weight, r.pallets, r.len, r.equip,
            r.rate, r.broker, r.mc)
    returning id into new_load;

    if not r.chosen then
      update public.loads set status = 'booked' where id = new_load;  -- taken by someone else
      continue;
    end if;

    select * into v from public.vehicles where plate_number = r.plate;
    select * into c from public.carriers where id = v.carrier_id;

    -- Empty miles: 0 when the pickup is in the truck's city, otherwise a short repositioning
    empty_miles := case when lower(r.o_city) = lower(v.current_city) then 0
                        when r.o_state = v.current_state then 35 + (r.miles % 80)
                        else 110 end;
    net := round((r.rate - empty_miles * v.fuel_cost_per_mile) / (r.miles + empty_miles), 2);
    lane := (case when r.o_state = any (c.preferred_states || c.home_state) then 0.5 else 0 end)
          + (case when r.d_state = any (c.preferred_states || c.home_state) then 0.5 else 0 end);
    risk := public.broker_risk(r.mc);

    insert into public.bookings (load_id, vehicle_id, carrier_id, created_by, deadhead_miles, net_rpm, score, risk_confirmed)
    values (
      new_load, v.id, c.id, owner_id, empty_miles, net,
      -- Same score formula as the app, with the default weights 40/25/20/15
      round(
        40 * least(1, greatest(0, (net - 0.5 * c.min_rate_per_mile) / c.min_rate_per_mile))
        + 25 * least(1, greatest(0, 1 - (empty_miles::numeric / (r.miles + empty_miles)) / 0.5))
        + 20 * lane
        + 15 * (case risk when 'low' then 1 when 'unknown' then 0.5 else 0 end)
      ),
      risk <> 'low'
    )
    returning id into new_booking;

    update public.bookings
    set status = r.final_status,
        booked_at = (current_date + r.day - 1)::timestamptz,
        delivered_at = case when r.final_status in ('delivered', 'paid')
                            then (current_date + r.day + ((r.miles + 499) / 500))::timestamptz end
    where id = new_booking;
  end loop;

  alter table public.loads enable trigger loads_check_dates;

  -- ---------- Weekly invoices: 2 weeks ago (paid) and last week (unpaid) ----------
  -- generate_invoice() checks who is asking, so act as the demo dispatcher here
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  for c in select id from public.carriers where mc_number = any (demo_mcs) order by id loop
    foreach week in array array[current_date - 14, current_date - 7] loop
      begin
        v_invoice_id := public.generate_invoice(c.id, week);
        invoice_count := invoice_count + 1;
        if week = current_date - 14 then
          perform public.mark_invoice_paid(v_invoice_id);
        end if;
      exception when others then
        null;  -- this carrier had no deliveries that week
      end;
    end loop;
  end loop;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);

  raise notice 'Demo data added for %: 7 carriers, 11 vehicles, 10 brokers, % loads, % bookings, % invoices',
    dispatcher_email,
    (select count(*) from public.loads where created_by = owner_id and broker_mc like '71000%'),
    (select count(*) from public.bookings b join public.carriers ca on ca.id = b.carrier_id where ca.mc_number = any (demo_mcs)),
    invoice_count;
end;
$$;
