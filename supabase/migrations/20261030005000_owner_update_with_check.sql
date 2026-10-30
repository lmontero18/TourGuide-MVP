-- Las policies restrictivas de 20261028020000_owner_readonly declaraban solo
-- USING en UPDATE. El WITH CHECK implicito es la misma expresion, asi que el
-- comportamiento no cambia, pero schema_guard_test exige que toda policy de
-- UPDATE lo declare explicito (ver el test 7).
alter policy bookings_no_owner_update on public.bookings
  with check (public.auth_role() is distinct from 'owner');
alter policy contacts_no_owner_update on public.contacts
  with check (public.auth_role() is distinct from 'owner');
alter policy conversations_no_owner_update on public.conversations
  with check (public.auth_role() is distinct from 'owner');
alter policy leads_no_owner_update on public.leads
  with check (public.auth_role() is distinct from 'owner');
alter policy messages_no_owner_update on public.messages
  with check (public.auth_role() is distinct from 'owner');
