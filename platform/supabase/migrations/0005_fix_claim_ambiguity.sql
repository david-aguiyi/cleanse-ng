-- Cleanse.ng V2 — fix ambiguous column references in claim_job_offer.
-- The function's OUT columns (booking_id, slot_number) collided with the
-- job_offers/job_assignments columns inside WHERE/SET clauses ("column
-- reference booking_id is ambiguous"). Qualify every table column so the
-- planner never confuses them with the output parameters.

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
  where job_offers.id = p_offer_id
    and job_offers.cleaner_id = p_cleaner_id
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

  perform pg_advisory_xact_lock(hashtextextended(v_offer.booking_id::text, 0));

  select * into v_booking
  from bookings
  where bookings.id = v_offer.booking_id
  for update;

  if v_booking.payment_status <> 'SUCCESS'
     or v_booking.customer_status <> 'CONFIRMED'
     or v_booking.fulfilment_status in ('COMPLETED','CANCELLED') then
    return query select false, v_offer.booking_id, 'BOOKING_NOT_CLAIMABLE', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments ja
    where ja.booking_id = v_offer.booking_id
      and ja.slot_number = v_offer.slot_number
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    update job_offers set status = 'LOST' where job_offers.id = p_offer_id;
    return query select false, v_offer.booking_id, 'ALREADY_TAKEN', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments ja
    where ja.booking_id = v_offer.booking_id
      and ja.cleaner_id = p_cleaner_id
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    return query select false, v_offer.booking_id, 'CLEANER_ALREADY_ON_BOOKING', v_offer.slot_number;
    return;
  end if;

  insert into job_assignments(booking_id, cleaner_id, source_offer_id, slot_number, status)
  values (v_offer.booking_id, p_cleaner_id, p_offer_id, v_offer.slot_number, 'ASSIGNED');

  update job_offers
     set status = case when job_offers.id = p_offer_id then 'ACCEPTED'::job_offer_status else 'LOST'::job_offer_status end,
         accepted_at = case when job_offers.id = p_offer_id then now() else job_offers.accepted_at end
   where job_offers.booking_id = v_offer.booking_id
     and job_offers.slot_number = v_offer.slot_number
     and job_offers.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED');

  select count(*) into v_active_count
  from job_assignments ja
  where ja.booking_id = v_offer.booking_id
    and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS');

  update bookings
     set assigned_cleaner_id = coalesce(bookings.assigned_cleaner_id, p_cleaner_id),
         fulfilment_status = case
           when v_active_count >= bookings.requested_cleaner_count then 'CLEANER_ASSIGNED'::fulfilment_status
           else 'PARTIALLY_ASSIGNED'::fulfilment_status
         end,
         assigned_at = coalesce(bookings.assigned_at, now()),
         updated_at = now()
   where bookings.id = v_offer.booking_id;

  insert into booking_events(booking_id,event_type,actor_type,actor_id,data)
  values (v_offer.booking_id,'cleaner.assigned','CLEANER',p_cleaner_id,
          jsonb_build_object('offer_id',p_offer_id,'slot_number',v_offer.slot_number));

  return query select true, v_offer.booking_id, 'WON', v_offer.slot_number;
end;
$$;

revoke all on function claim_job_offer(uuid,uuid) from public;
revoke all on function claim_job_offer(uuid,uuid) from anon;
revoke all on function claim_job_offer(uuid,uuid) from authenticated;
grant execute on function claim_job_offer(uuid,uuid) to service_role;
