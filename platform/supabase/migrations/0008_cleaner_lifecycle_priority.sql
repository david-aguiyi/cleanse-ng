-- Cleanse.ng V2 — cleaner lifecycle (self-pause, admin block) + blended priority.

-- Lifecycle metadata. account_status already covers the states:
--   ACTIVE = working, INACTIVE = self-paused/stopped, SUSPENDED = admin-blocked.
alter table cleaners add column if not exists paused_at timestamptz;
alter table cleaners add column if not exists blocked_at timestamptz;
alter table cleaners add column if not exists block_reason text;

-- ---------------------------------------------------------------------------
-- Blended priority ranking (reputation + fairness). Reputation (rating,
-- completion, low cancellation) drives priority, but recent workload pushes busy
-- cleaners down so work spreads and newer good cleaners still get a fair shot.
-- New cleaners default to solid-but-not-top values so they are not buried.
-- Weights are pilot defaults — tune the coefficients to retune.
-- ---------------------------------------------------------------------------
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
    and not exists (
      select 1 from job_offers jo
      where jo.booking_id = p_booking_id
        and jo.cleaner_id = c.id
        and jo.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED','ACCEPTED')
    )
  order by
    (
      coalesce(c.rating, 4.6) * 10            -- reputation: rating
      + coalesce(c.completion_rate, 90) * 0.4 -- reliability
      - coalesce(c.cancellation_rate, 0) * 0.6-- penalise cancellations
      - (
          select count(*) from job_assignments ja2
          where ja2.cleaner_id = c.id
            and ja2.assigned_at > now() - interval '24 hours'
        ) * 9                                 -- fairness: spread today's load
    ) desc,
    c.last_active_at desc nulls last
  limit p_limit;
end;
$$;

revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from public;
revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from anon;
grant execute on function get_eligible_cleaners(uuid, uuid[], integer) to service_role;
