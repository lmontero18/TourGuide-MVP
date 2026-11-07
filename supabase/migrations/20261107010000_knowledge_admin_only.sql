-- CODE-200: solo el admin de la agencia edita Tours y preguntas (tours, FAQs,
-- info del negocio y recogidas). Los agentes los ven pero no los cambian.
-- Vuelve atras 20261027020000_agent_knowledge_live.sql, que lo habia abierto a
-- todo el equipo. save_pickups() y touch_knowledge() ya llaman a esta funcion,
-- asi que un agente que las llame directo recibe 'not allowed'.

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
      and u.role = 'admin'
  )
$$;

revoke all on function public.can_edit_knowledge() from public, anon;
grant execute on function public.can_edit_knowledge() to authenticated;
