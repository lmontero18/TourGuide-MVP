-- supabase/seed.sql
-- =====================================================================
-- Datos de desarrollo — SOLO entorno local. Se aplica en `supabase db reset`.
-- =====================================================================
-- Crea 2 organizaciones (A y B) completas para:
--   1. Desarrollar localmente con datos realistas.
--   2. Servir de base a los tests de aislamiento RLS (paso 07):
--      un usuario de la org A NO debe poder leer datos de la org B.
--
-- NO usar en staging/prod. Las contraseñas son de demo.
-- Todos los usuarios tienen password: "password123"
--
-- Usuarios de prueba:
--   admin-a@tourguide.test  (admin, Org A — Tours Patagonia)
--   agent-a@tourguide.test  (agent, Org A)
--   admin-b@tourguide.test  (admin, Org B — Caribe Adventures)
--   agent-b@tourguide.test  (agent, Org B)
-- =====================================================================

-- ============ 1. Organizaciones ============
insert into public.organizations (id, name, slug, plan, status, prompt) values
  ('11111111-1111-1111-1111-111111111111', 'Tours Patagonia',   'tours-patagonia',   'growth',  'active', 'Eres el asistente de Tours Patagonia. Vendes excursiones en la Patagonia argentina y chilena.'),
  ('22222222-2222-2222-2222-222222222222', 'Caribe Adventures', 'caribe-adventures', 'starter', 'active', 'Eres el asistente de Caribe Adventures. Ofreces tours de buceo y playa en el Caribe.');

-- ============ 2. Usuarios ============
-- Se insertan en auth.users; el trigger handle_new_user() crea automáticamente
-- la fila en public.users leyendo role/org_id/full_name de raw_user_meta_data.
-- Por eso NO insertamos en public.users directamente.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-a@tourguide.test', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Patagonia","role":"admin","org_id":"11111111-1111-1111-1111-111111111111"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'agent-a@tourguide.test', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Agente Patagonia","role":"agent","org_id":"11111111-1111-1111-1111-111111111111"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-b@tourguide.test', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Caribe","role":"admin","org_id":"22222222-2222-2222-2222-222222222222"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'agent-b@tourguide.test', extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Agente Caribe","role":"agent","org_id":"22222222-2222-2222-2222-222222222222"}', '', '', '', '');

-- Identidad de email por usuario (requerido por GoTrue para login por email/password).
insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values
  ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '{"sub":"a1111111-1111-1111-1111-111111111111","email":"admin-a@tourguide.test"}', 'email', 'a1111111-1111-1111-1111-111111111111', now(), now(), now()),
  ('a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', '{"sub":"a2222222-2222-2222-2222-222222222222","email":"agent-a@tourguide.test"}', 'email', 'a2222222-2222-2222-2222-222222222222', now(), now(), now()),
  ('b1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '{"sub":"b1111111-1111-1111-1111-111111111111","email":"admin-b@tourguide.test"}', 'email', 'b1111111-1111-1111-1111-111111111111', now(), now(), now()),
  ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '{"sub":"b2222222-2222-2222-2222-222222222222","email":"agent-b@tourguide.test"}', 'email', 'b2222222-2222-2222-2222-222222222222', now(), now(), now());

-- ============ 3. Contactos (clientes de WhatsApp) ============
insert into public.contacts (id, org_id, phone, name) values
  -- Org A
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '+5491140000001', 'Lucía Fernández'),
  ('c1222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '+5491140000002', 'Mateo Gómez'),
  -- Org B
  ('c2111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '+5219980000001', 'Sofía Ramírez'),
  ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '+5219980000002', 'Diego Torres');

-- ============ 4. Conversaciones ============
insert into public.conversations (id, org_id, contact_id, status, bot_active, assigned_agent_id, last_message_at) values
  -- Org A: una con el bot activo, otra tomada por el agente
  ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'open',    true,  null,                                   now()),
  ('d1222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'c1222222-2222-2222-2222-222222222222', 'open',    false, 'a2222222-2222-2222-2222-222222222222', now()),
  -- Org B
  ('d2111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'c2111111-1111-1111-1111-111111111111', 'pending', true,  null,                                   now());

-- ============ 5. Mensajes ============
insert into public.messages (conversation_id, role, content, from_bot) values
  -- Conversación A1 (bot activo)
  ('d1111111-1111-1111-1111-111111111111', 'user',      'Hola, ¿hacen excursiones al Perito Moreno?', false),
  ('d1111111-1111-1111-1111-111111111111', 'assistant', '¡Hola Lucía! Sí, tenemos una excursión de día completo al Glaciar Perito Moreno. ¿Para qué fecha te interesa?', true),
  -- Conversación A2 (tomada por agente)
  ('d1222222-2222-2222-2222-222222222222', 'user',      'Necesito factura a nombre de empresa, ¿se puede?', false),
  ('d1222222-2222-2222-2222-222222222222', 'agent',     'Hola Mateo, soy del equipo. Sí, emitimos factura A. Te paso los detalles.', false),
  -- Conversación B1
  ('d2111111-1111-1111-1111-111111111111', 'user',      '¿Cuánto cuesta el tour de buceo en Cozumel?', false),
  ('d2111111-1111-1111-1111-111111111111', 'assistant', '¡Hola Sofía! El tour de buceo en Cozumel cuesta desde 85 USD por persona. ¿Cuántas personas serían?', true);

-- ============ 6. Leads ============
insert into public.leads (id, org_id, contact_id, conversation_id, tour_interest, status, metadata) values
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Glaciar Perito Moreno', 'new',       '{"group_size": 2, "dates": "marzo"}'),
  ('e2111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'c2111111-1111-1111-1111-111111111111', 'd2111111-1111-1111-1111-111111111111', 'Buceo en Cozumel',      'qualified', '{"group_size": 4, "dates": "abril"}');
