-- Trigger en auth.users que dispara handle_new_user() para crear el row en public.users.
-- Vive en el schema `auth` (gestionado por Supabase), por eso `supabase db dump` (solo public)
-- no lo captura en el baseline. Se agrega aparte para que local/CI reproduzcan el alta de usuarios.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
