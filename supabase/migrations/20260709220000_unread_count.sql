-- Contador de mensajes no leídos por conversación (org-wide, no por agente).
-- Se incrementa vía trigger con cada mensaje entrante del cliente y se
-- resetea a 0 cuando un agente abre la conversación en el dashboard.

ALTER TABLE "public"."conversations"
  ADD COLUMN IF NOT EXISTS "unread_count" integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION "public"."increment_unread_on_user_message"() RETURNS "trigger"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" = ''
AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE public.conversations
    SET unread_count = unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "messages_increment_unread" ON "public"."messages";
CREATE TRIGGER "messages_increment_unread"
  AFTER INSERT ON "public"."messages"
  FOR EACH ROW EXECUTE FUNCTION "public"."increment_unread_on_user_message"();
