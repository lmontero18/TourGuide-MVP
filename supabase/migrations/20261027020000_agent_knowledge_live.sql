-- agentKnowledge pasa a 'live' (lib/features.ts): cualquier admin o agente de
-- la org edita Tours y preguntas y guarda recogidas. Saca la condicion del
-- flag que agrego 20261027010000_agent_knowledge.sql.

create or replace function public.can_edit_knowledge()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.org_id is not null
      and u.role in ('admin', 'agent')
  )
$$;

revoke all on function public.can_edit_knowledge() from public, anon;
grant execute on function public.can_edit_knowledge() to authenticated;
