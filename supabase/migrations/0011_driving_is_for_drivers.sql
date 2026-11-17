-- Driving a meet means bringing your own car, so only driver (personal) accounts can be on the Driving list.
-- Clubs and businesses can still attend or organize.
create trigger meet_attendees_drivers_only before insert or update of role on public.meet_attendees
  for each row when (new.role = 'driver') execute function public.trg_personal_only();

-- Anyone already listed as driving from a club or business account moves to Attending.
update public.meet_attendees a set role = 'attendee', car_id = null
  from public.profiles p where p.id = a.user_id and a.role = 'driver' and p.account_type <> 'personal';
