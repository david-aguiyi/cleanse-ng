-- Cleanse.ng V2 — fair dispatch (spread work + 2-hour busy lock).
--
-- 1. get_eligible_cleaners now ranks by CURRENT WORKLOAD first (fewest recent
--    jobs win), so work spreads across the network instead of always going to
--    the single highest-rated cleaner. Reliability is the tie-breaker.
-- 2. A job is estimated at 2 hours. A cleaner with an active assignment whose
--    2-hour block overlaps the candidate job is excluded (eligibility) AND
--    blocked at claim time (claim_job_offer), so one cleaner can never hold two
--    overlapping jobs.
--
-- JOB_BLOCK below is the pilot job-duration estimate; change '2 hours' to retune.

create or replace function get_eligible_cleaners(
  p_booking_id uuid,
  p_exclude uuid[] default '{}',
  p_limit integer default 50
)
returns table (cleaner_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    return;
  end if;

  return query
  select c.id
  from cleaners c
  join cleaner_zones cz on cz.cleaner_id = c.id
  join cleaner_services cs on cs.cleaner_id = c.id and cs.approved = true
  where c.account_status = 'ACTIVE'
    and c.verified = true
    and c.deployment_ready = true
    and c.availability = 'AVAILABLE'
    and cz.zone_id = v_booking.zone_id
    and cs.service_id = v_booking.service_id
    and not (c.id = any(p_exclude))
    -- 2-hour busy lock: no active assignment whose 2h block overlaps this job.
    and not exists (
      select 1
      from job_assignments ja
      join bookings b2 on b2.id = ja.booking_id
      where ja.cleaner_id = c.id
        and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
        and tstzrange(b2.scheduled_start_at,
                      b2.scheduled_start_at + interval '2 hours', '[)')
            && tstzrange(v_booking.scheduled_start_at,
                         v_booking.scheduled_start_at + interval '2 hours', '[)')
    )
    -- not already offered this booking in an active/accepted offer
    and not exists (
      select 1 from job_offers jo
      where jo.booking_id = p_booking_id
        and jo.cleaner_id = c.id
        and jo.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED','ACCEPTED')
    )
  order by
    -- FAIRNESS: fewest jobs in the last 24h first, so work spreads around.
    (select count(*) from job_assignments ja2
       where ja2.cleaner_id = c.id
         and ja2.assigned_at > now() - interval '24 hours') asc,
    coalesce(c.completion_rate, 100) desc,
    coalesce(c.rating, 5) desc,
    c.last_active_at desc nulls last
  limit p_limit;
end;
$$;

revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from public;
revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from anon;
grant execute on function get_eligible_cleaners(uuid, uuid[], integer) to service_role;

-- ---------------------------------------------------------------------------
-- claim_job_offer: add the 2-hour busy-lock guard so a cleaner can never accept
-- a second job overlapping one they already hold (defense in depth).
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

  -- 2-hour busy lock across OTHER bookings.
  if exists (
    select 1 from job_assignments ja
    join bookings b2 on b2.id = ja.booking_id
    where ja.cleaner_id = p_cleaner_id
      and ja.booking_id <> v_offer.booking_id
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
      and tstzrange(b2.scheduled_start_at,
                    b2.scheduled_start_at + interval '2 hours', '[)')
          && tstzrange(v_booking.scheduled_start_at,
                       v_booking.scheduled_start_at + interval '2 hours', '[)')
  ) then
    return query select false, v_offer.booking_id, 'CLEANER_TIME_CONFLICT', v_offer.slot_number;
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
