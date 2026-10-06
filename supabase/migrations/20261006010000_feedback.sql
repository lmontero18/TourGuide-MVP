-- Comentarios de las agencias desde el panel: errores, ideas/funciones y
-- otros. Se guardan aca (no se pierden si falla el correo) y se mandan por
-- correo al equipo de Tourfy. Solo el server (service role) lee y escribe.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 4000),
  page text,
  user_agent text,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created on public.feedback (created_at desc);
create index if not exists idx_feedback_user_created on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated, public;
