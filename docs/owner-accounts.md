# Owner accounts (agency CEO)

An **owner** is the agency's CEO or owner. The account is read-only and only
sees **Métricas**: the business numbers and, with the `teamMetrics` flag, the
**Equipo** tab with per-agent metrics.

It is a "ghost" account:

- It doesn't show up in Agentes, in "Asignar a…", or in the team metrics.
- It gets no conversation notifications or emails.
- It can't write anything. Restrictive RLS policies block inserts, updates
  and deletes on conversations, messages, leads, contacts and bookings, and
  the API routes return 403 to owners.

Agency admins can't create, see or edit owners. **Tourfy creates the account
when the agency asks for it.**

## Create one

1. Supabase (prod) → Authentication → Users → **Invite user** with the CEO's
   email. This sends the standard invitation email.
2. **Right away**, before the invitation is accepted, attach the user to the
   org as owner. If they accept first they have no org and land in
   onboarding, where they would create a new agency.

   ```sql
   update public.users
      set org_id = '<org id>', role = 'owner', full_name = '<Name>'
    where email = '<ceo email>';
   ```

3. While `teamMetrics` is `beta`, turn it on for that org so the Equipo tab
   shows up (skip this for `is_beta` orgs):

   ```sql
   update public.organizations
      set features = array_append(features, 'teamMetrics')
    where id = '<org id>' and not ('teamMetrics' = any(features));
   ```

4. The CEO accepts the invitation, sets a password and lands on `/metrics`.

## Remove one

Delete the user in Supabase → Authentication → Users. The `public.users` row
goes with it.

## Where it's enforced

- DB: `supabase/migrations/20261028010000_owner_role.sql` (enum value) and
  `20261028020000_owner_readonly.sql` (restrictive policies, hidden in
  `users`, `get_team_metrics`).
- API: `lib/auth/requireMember.ts`, `lib/conversations/agentSend.ts`,
  `app/api/conversations/[id]/*`, `app/api/leads/[id]/*`, `app/api/agents/*`
  (owners are filtered out), `lib/email/notify.ts` (no emails).
- UI: `proxy.ts` (only `/metrics`), `visibleNavItems` in
  `components/layout/Sidebar.tsx`, `ConversationsProvider` (no conversations
  loaded), `TopBar` (no notifications or Novedades).
