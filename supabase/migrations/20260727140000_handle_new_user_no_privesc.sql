-- CODE-151 (M8) · handle_new_user() confiaba en metadata controlada por el usuario.
--
-- El trigger (baseline :151-166) tomaba `role` y `org_id` de NEW.raw_user_meta_data,
-- que en un signup es input crudo del atacante. Es SECURITY DEFINER, asi que
-- bypassea RLS. Con la anon key — publica, va en el bundle del browser — alcanzaba
-- con saltearse la app y pegarle directo a GoTrue:
--
--   POST /auth/v1/signup
--   {"email":"...","password":"...",
--    "data":{"role":"admin","org_id":"<uuid-de-la-org-victima>"}}
--
-- ...y el trigger creaba la fila en public.users como ADMIN de esa org. Toma de
-- cuenta completa. Verificado en local contra este mismo branch: los grants por
-- columna de la migracion 20260727120000 NO lo frenan, porque no pasa por
-- PostgREST — lo escribe el trigger.
--
-- Variante que ni siquiera necesita adivinar un uuid: un agente invitado ya conoce
-- el org_id de su propia org (lo lee de public.users), asi que podia registrar una
-- segunda cuenta con role=admin en su misma org y auto-promoverse.
--
-- Fix: el trigger deja de leer role/org_id de la metadata. Todo signup nace sin
-- org y con el default 'admin' de siempre — que es el flujo documentado: sin
-- org_id el middleware manda a /onboarding, donde se crea la org propia.
-- El unico camino legitimo para asignar org_id/role es /api/agents/invite, que
-- corre con service client y ahora escribe public.users directamente.
--
-- full_name se sigue tomando de la metadata: es el propio nombre del usuario, no
-- decide nada de autorizacion.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.users (id, email, full_name, role, org_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    -- role y org_id NO salen de raw_user_meta_data: en un signup eso lo controla
    -- quien se registra. Ver /api/agents/invite para el alta de agentes.
    'admin'::public.user_role,
    null
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crea public.users al registrarse en auth.users. NUNCA leer role/org_id de '
  'raw_user_meta_data: es input del usuario y esta funcion es SECURITY DEFINER. '
  'La asignacion de org la hace /api/onboarding o /api/agents/invite con service client.';
