-- First drop the user_identity_map table with CASCADE (this will drop dependent policies)
DROP TABLE IF EXISTS public.user_identity_map CASCADE;

-- Now drop the identity-related helper functions
DROP FUNCTION IF EXISTS public.identity_has_role(character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.identity_has_role(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.identity_current_identity_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.identity_current_user_code() CASCADE;
DROP FUNCTION IF EXISTS public.identity_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.generate_user_code(character varying, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_generate_user_code() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_aspnet_updated_at() CASCADE;