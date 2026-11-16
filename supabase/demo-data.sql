-- =====================================================================
-- LoadWise DEMO DATA (optional, for testing Load Matching)
--
-- 1. Change the email just below to the Dispatcher (or Admin) account
--    that will own the data (sign up in the app first).
-- 2. Paste into Supabase > SQL Editor and click Run.
--
-- Adds: 7 carriers, 11 vehicles (box trucks, cargo vans, dry vans,
-- reefers, a flatbed) and 38 available loads with pickups in the next
-- 1-4 days. Running it again first removes the previous demo data.
-- Your own carriers, vehicles and loads are kept.
-- All company names, MC numbers, phone numbers and VINs are made up.
-- =====================================================================
do $$
declare
  dispatcher_email text := 'your-dispatcher@example.com';   -- <-- CHANGE ME

  demo_mcs text[] := array['9900101', '9900102', '9900103', '9900104', '9900105', '9900106', '9900107'];
  owner_id uuid;
begin
  -- ---------- Who owns the demo data ----------
  select u.id into owner_id
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(dispatcher_email) and p.role in ('dispatcher', 'admin');
  if owner_id is null then
    raise exception 'No Dispatcher/Admin account with email %. Sign up in the app first, then edit dispatcher_email.', dispatcher_email;
  end if;

  -- ---------- Remove the previous demo data ----------
  delete from public.loads where created_by = owner_id and broker_mc like '71000%';
  delete from public.carriers where mc_number = any (demo_mcs);   -- also removes their vehicles

  -- ---------- Carriers (7) ----------
  insert into public.carriers (created_by, company_name, mc_number, dot_number, contact_email, contact_phone,
                               home_city, home_state, zip_code, preferred_states, min_rate_per_mile)
  select owner_id, name, mc, dot, email, phone, city, st, zip, pref, min_rate
  from (values
    ('Lone Star Freight LLC',      '9900101', '3990101', 'dispatch@lonestarfreight.example', '2145550101', 'Dallas',     'TX', '75201', array['TX', 'OK', 'LA', 'AR'],             2.00),
    ('Peach State Hauling Co',     '9900102', '3990102', 'ops@peachstatehauling.example',    '4045550102', 'Atlanta',    'GA', '30303', array['GA', 'FL', 'SC', 'NC', 'TN', 'AL'], 2.25),
    ('Windy City Express Inc',     '9900103', '3990103', 'loads@windycityexpress.example',   '3125550103', 'Chicago',    'IL', '60601', array['IL', 'IN', 'WI', 'MI', 'OH'],       2.10),
    ('Desert Sun Carriers LLC',    '9900104', '3990104', 'team@desertsuncarriers.example',   '6025550104', 'Phoenix',    'AZ', '85004', array['AZ', 'NV', 'CA', 'NM', 'UT'],       2.30),
    ('Sunshine Route Logistics',   '9900105', '3990105', 'hello@sunshineroute.example',      '4075550105', 'Orlando',    'FL', '32801', array['FL', 'GA', 'AL'],                   2.15),
    ('Rocky Mountain Movers LLC',  '9900106', '3990106', 'dispatch@rockymtnmovers.example',  '3035550106', 'Denver',     'CO', '80202', array['CO', 'UT', 'WY', 'NM', 'KS'],       2.40),
    ('Keystone Cargo Co',          '9900107', '3990107', 'office@keystonecargo.example',     '7175550107', 'Harrisburg', 'PA', '17101', array['PA', 'NJ', 'NY', 'MD', 'OH'],       2.20)
  ) as t(name, mc, dot, email, phone, city, st, zip, pref, min_rate);

  -- ---------- Vehicles (11) ----------
  insert into public.vehicles (carrier_id, created_by, equipment_type, length_ft, width_in, height_in, max_payload_lbs,
                               max_pallets, plate_number, vin)
  select (select id from public.carriers where mc_number = mc), owner_id, equip, len, wid, hgt, payload, pallets, plate, vin
  from (values
    ('9900101', 'box_truck', 26, 96, 96, 10000, 12, 'LSF26BX', '1HTMMAAL4EH000101'),
    ('9900101', 'cargo_van', 12, 70, 60, 3500, 2, 'LSF12CV', '1FTYR2CM5KKA00102'),
    ('9900102', 'dry_van', 53, 100, 110, 44000, 26, 'PSH53DV', '1JJV532D8NL000103'),
    ('9900102', 'reefer', 53, 98, 108, 43000, 26, 'PSH53RF', '1JJV532W2NL000104'),
    ('9900103', 'box_truck', 24, 96, 96, 10000, 10, 'WCE24BX', '1HTMMAAN6FH000105'),
    ('9900103', 'dry_van', 53, 100, 110, 44000, 26, 'WCE53DV', '1JJV532D3PL000106'),
    ('9900104', 'flatbed', 48, 102, 60, 45000, 24, 'DSC48FB', '1UYFS2483RA000107'),
    ('9900104', 'cargo_van', 15, 70, 70, 4000, 3, 'DSC15CV', '1FTBW2CM7RKA00108'),
    ('9900105', 'box_truck', 20, 96, 90, 8000, 8, 'SRL20BX', '1HTMMAAM8GH000109'),
    ('9900106', 'reefer', 53, 98, 108, 43000, 26, 'RMM53RF', '1UYVS2538SM000110'),
    ('9900107', 'dry_van', 53, 100, 110, 44000, 26, 'KCC53DV', '1JJV532D5TL000111')
  ) as t(mc, equip, len, wid, hgt, payload, pallets, plate, vin);

  -- ---------- Available loads to match (pickup in the next 1-4 days) ----------
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

  raise notice 'Demo data added: % carriers, % vehicles, % available loads',
    (select count(*) from public.carriers where mc_number = any (demo_mcs)),
    (select count(*) from public.vehicles v join public.carriers c on c.id = v.carrier_id where c.mc_number = any (demo_mcs)),
    (select count(*) from public.loads where created_by = owner_id and broker_mc like '71000%' and status = 'available');
end;
$$;
