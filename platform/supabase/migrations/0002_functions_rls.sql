-- Cleanse.ng V2 — functions, atomic claim, triggers, RLS (Blueprint §5.3, §6.2, Appendix A.1)

-- ---------------------------------------------------------------------------
-- updated_at trigger (Appendix A.1)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

create trigger cleaners_set_updated_at
  before update on cleaners
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic first-accept-wins claim (Blueprint §5.3)
--
-- Race-condition invariant: never "check then assign" in separate operations.
-- Every cleaner acceptance goes through this single database operation. For a
-- one-cleaner job exactly one cleaner fills slot 1; for multi-cleaner bookings
-- each slot has at most one active cleaner, and one cleaner cannot fill two
-- slots on the same booking.
-- ---------------------------------------------------------------------------
create or replace function claim_job_offer(
  p_offer_id uuid,
  p_cleaner_id uuid
)
returns table (
  won boolean,
  booking_id uuid,
  result_code text,
  slot_number integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offer job_offers%rowtype;
  v_booking bookings%rowtype;
  v_active_count integer;
begin
  select * into v_offer
  from job_offers
  where id = p_offer_id
    and cleaner_id = p_cleaner_id
  for update;

  if not found then
    return query select false, null::uuid, 'OFFER_NOT_FOUND', null::integer;
    return;
  end if;

  if v_offer.status not in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED')
     or v_offer.expires_at <= now() then
    return query select false, v_offer.booking_id, 'OFFER_NOT_ACTIVE', v_offer.slot_number;
    return;
  end if;

  -- Serialize every claim for this booking, including multi-cleaner crew slots.
  perform pg_advisory_xact_lock(hashtextextended(v_offer.booking_id::text, 0));

  select * into v_booking
  from bookings
  where id = v_offer.booking_id
  for update;

  if v_booking.payment_status <> 'SUCCESS'
     or v_booking.customer_status <> 'CONFIRMED'
     or v_booking.fulfilment_status in ('COMPLETED','CANCELLED') then
    return query select false, v_offer.booking_id, 'BOOKING_NOT_CLAIMABLE', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments
    where booking_id = v_offer.booking_id
      and slot_number = v_offer.slot_number
      and status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    update job_offers set status = 'LOST' where id = p_offer_id;
    return query select false, v_offer.booking_id, 'ALREADY_TAKEN', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments
    where booking_id = v_offer.booking_id
      and cleaner_id = p_cleaner_id
      and status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    return query select false, v_offer.booking_id, 'CLEANER_ALREADY_ON_BOOKING', v_offer.slot_number;
    return;
  end if;

  insert into job_assignments(booking_id, cleaner_id, source_offer_id, slot_number, status)
  values (v_offer.booking_id, p_cleaner_id, p_offer_id, v_offer.slot_number, 'ASSIGNED');

  update job_offers
     set status = case when id = p_offer_id then 'ACCEPTED'::job_offer_status else 'LOST'::job_offer_status end,
         accepted_at = case when id = p_offer_id then now() else accepted_at end
   where booking_id = v_offer.booking_id
     and slot_number = v_offer.slot_number
     and status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED');

  select count(*) into v_active_count
  from job_assignments
  where booking_id = v_offer.booking_id
    and status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS');

  update bookings
     set assigned_cleaner_id = coalesce(assigned_cleaner_id, p_cleaner_id),
         fulfilment_status = case
           when v_active_count >= requested_cleaner_count then 'CLEANER_ASSIGNED'::fulfilment_status
           else 'PARTIALLY_ASSIGNED'::fulfilment_status
         end,
         assigned_at = coalesce(assigned_at, now()),
         updated_at = now()
   where id = v_offer.booking_id;

  insert into booking_events(booking_id,event_type,actor_type,actor_id,data)
  values (v_offer.booking_id,'cleaner.assigned','CLEANER',p_cleaner_id,
          jsonb_build_object('offer_id',p_offer_id,'slot_number',v_offer.slot_number));

  return query select true, v_offer.booking_id, 'WON', v_offer.slot_number;
end;
$$;

-- Only the trusted server service role should invoke this RPC.
revoke all on function claim_job_offer(uuid,uuid) from public;
revoke all on function claim_job_offer(uuid,uuid) from anon;
revoke all on function claim_job_offer(uuid,uuid) from authenticated;
grant execute on function claim_job_offer(uuid,uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row-Level Security baseline (Blueprint §6.2)
-- ---------------------------------------------------------------------------
alter table cleaners enable row level security;
alter table cleaner_devices enable row level security;
alter table job_offers enable row level security;
alter table job_assignments enable row level security;
alter table bookings enable row level security;

-- Helper mapping auth.uid() -> active cleaner id.
create or replace function current_cleaner_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id from cleaners where auth_user_id = auth.uid() and account_status = 'ACTIVE';
$$;

-- Cleaner can read only own profile/offers/assignments if direct reads are used.
create policy cleaner_reads_self
  on cleaners for select to authenticated
  using (auth_user_id = auth.uid());

create policy cleaner_reads_own_offers
  on job_offers for select to authenticated
  using (cleaner_id = current_cleaner_id());

create policy cleaner_reads_own_assignments
  on job_assignments for select to authenticated
  using (cleaner_id = current_cleaner_id());

-- Do not grant cleaner direct UPDATE on assignment/booking rows.
-- State transitions go through server APIs/domain services (service role).
