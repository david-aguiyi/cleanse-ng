-- Cleanse.ng pilot seed data (Blueprint §5.2 seed + Appendix A.3)
-- Amounts are NGN converted to kobo. Service fee baseline 20% => service_fee_bps = 2000.

-- --- Service zones (Ibadan pilot) ---
insert into service_zones(code, name, city, state, sort_order) values
  ('BODIJA',   'Bodija',   'Ibadan', 'Oyo', 10),
  ('AKOBO',    'Akobo',    'Ibadan', 'Oyo', 20),
  ('JERICHO',  'Jericho',  'Ibadan', 'Oyo', 30),
  ('OLUYOLE',  'Oluyole',  'Ibadan', 'Oyo', 40),
  ('IYAGANKU', 'Iyaganku', 'Ibadan', 'Oyo', 50)
on conflict (code) do nothing;

-- --- Services ---
insert into services(code, name, description, pricing_mode, active, requires_photos) values
  ('REGULAR', 'Regular Cleaning', 'Standard residential cleaning', 'FIXED_RULES', true, false)
on conflict (code) do nothing;

insert into services(code, name, description, pricing_mode, active, requires_photos) values
  ('DEEP',        'Deep Cleaning',           'Intensive top-to-bottom clean',        'MANUAL_QUOTE', true, true),
  ('MOVE',        'Move-in / Move-out',      'End-of-tenancy deep clean',            'MANUAL_QUOTE', true, true),
  ('POSTFUMIGATION', 'Post-fumigation Clean','Cleanup after fumigation treatment',   'MANUAL_QUOTE', true, true)
on conflict (code) do nothing;

-- --- Extras for Regular Cleaning ---
with regular_service as (select id from services where code = 'REGULAR')
insert into service_extras(service_id, code, name, active)
select r.id, e.code, e.name, true
from regular_service r
cross join (values
  ('FRIDGE', 'Inside fridge'),
  ('OVEN',   'Inside oven'),
  ('LAUNDRY','Laundry & fold'),
  ('WINDOWS','Interior windows')
) as e(code, name)
on conflict (service_id, code) do nothing;

-- --- Pilot Regular-cleaning pricing seed (Appendix A.3) ---
with regular_service as (
  select id from services where code = 'REGULAR'
), price_seed(property_bedrooms, amount_kobo) as (
  values (1,  900000::bigint),
         (2, 1300000::bigint),
         (3, 1700000::bigint),
         (4, 2000000::bigint),
         (5, 2500000::bigint)
)
insert into pricing_rules(
  service_id, property_bedrooms, frequency_code, amount_kobo,
  service_fee_bps, effective_from, active
)
select r.id, p.property_bedrooms, 'ONE_TIME', p.amount_kobo,
       2000, '2026-09-16T00:00:00Z'::timestamptz, true
from regular_service r cross join price_seed p;
