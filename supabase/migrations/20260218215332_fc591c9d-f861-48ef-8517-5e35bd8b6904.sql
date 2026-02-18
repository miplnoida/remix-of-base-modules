
-- Fix set_email_provider_default: cast 'email' literal to the notification_channel enum type
CREATE OR REPLACE FUNCTION public.set_email_provider_default(provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear current default for email channel (cast literal to enum)
  UPDATE notification_providers
  SET is_default = false
  WHERE channel = 'email'::notification_channel
    AND is_default = true;

  -- Set the new default
  UPDATE notification_providers
  SET is_default = true,
      updated_at = now()
  WHERE id = provider_id
    AND channel = 'email'::notification_channel;

  -- Raise if provider not found or wrong channel
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider % not found or is not an email provider', provider_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.set_email_provider_default(uuid) TO authenticated;
