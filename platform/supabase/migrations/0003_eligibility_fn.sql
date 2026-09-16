-- Cleanse.ng V2 — eligibility ranking function (Blueprint §10.1)
-- Ranks ACTIVE + verified + deployment-ready + AVAILABLE cleaners who serve the
-- booking's zone and are qualified for its service, excluding those with a
-- conflicting active assignment in a ±4h window and any explicitly excluded ids.

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
                      b2.scheduled_start_at + interval '4 hours', '[)')
            && tstzrange(v_booking.scheduled_start_at,
                         v_booking.scheduled_start_at + interval '4 hours', '[)')
    )
    -- Exclude cleaners already offered this booking in any active offer.
    and not exists (
      select 1 from job_offers jo
      where jo.booking_id = p_booking_id
        and jo.cleaner_id = c.id
        and jo.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED','ACCEPTED')
    )
  order by
    coalesce(c.completion_rate, 100) desc,
    coalesce(c.rating, 5) desc,
    c.last_active_at desc nulls last
  limit p_limit;
end;
$$;

revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from public;
revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from anon;
grant execute on function get_eligible_cleaners(uuid, uuid[], integer) to service_role;
