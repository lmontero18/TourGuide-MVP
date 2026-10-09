-- Asignar una conversacion a otro agente (CODE-187). El evento 'taken' sigue
-- registrando a quien queda a cargo (lo usa la metrica de cuanto tarda el
-- equipo en tomar un traspaso). Cuando la asigna otra persona, ademas queda
-- 'assigned' con quien la asigno, para el historial.

alter table public.conversation_events drop constraint conversation_events_type_check;
alter table public.conversation_events
  add constraint conversation_events_type_check
  check (type in ('handoff', 'taken', 'assigned', 'returned_to_bot', 'resolved', 'reopened', 'bot_no_reply'));

create or replace function public.log_conversation_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- El bot pidio un humano.
  if new.status = 'pending' and old.status is distinct from 'pending' then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'handoff', null);
  end if;

  -- Un agente la tomo (boton, respuesta directa o takeover de otro).
  if new.assigned_agent_id is not null and new.assigned_agent_id is distinct from old.assigned_agent_id then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'taken', new.assigned_agent_id);
    -- Se la asigno otra persona (admin o el agente que la tenia).
    if v_actor is not null and v_actor <> new.assigned_agent_id then
      insert into public.conversation_events (conversation_id, org_id, type, actor_id)
      values (new.id, new.org_id, 'assigned', v_actor);
    end if;
  end if;

  -- Se resolvio (a mano o por el cron de inactividad).
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'resolved', v_actor);
  -- Se reabrio: el cliente volvio a escribir o alguien toco "Reabrir".
  elsif old.status = 'resolved' and new.status is distinct from 'resolved' then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'reopened', v_actor);
  -- Volvio al bot sin resolverse.
  elsif new.bot_active and not old.bot_active then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'returned_to_bot', v_actor);
  end if;

  return new;
end;
$$;
