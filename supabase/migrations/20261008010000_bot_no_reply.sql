-- Mensaje del cliente sin respuesta (CODE-177). Si el bot esta activo y un
-- mensaje del cliente queda mas de 2 minutos sin respuesta (n8n caido, token,
-- OpenAI, un bug), la ruta /api/cron/unanswered pasa la conversacion a un
-- agente, avisa al equipo y deja este evento. Sirve tambien para medir la
-- garantia de respuesta de la oferta.

alter table public.conversation_events drop constraint conversation_events_type_check;
alter table public.conversation_events
  add constraint conversation_events_type_check
  check (type in ('handoff', 'taken', 'returned_to_bot', 'resolved', 'reopened', 'bot_no_reply'));

select cron.schedule('tourfy-unanswered', '* * * * *', $$select private.call_app_cron('/api/cron/unanswered')$$);
