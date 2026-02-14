-- Add encrypted_key column to store reversible encrypted API keys for admin retrieval
ALTER TABLE public.public_api_keys ADD COLUMN IF NOT EXISTS encrypted_key TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.public_api_keys.encrypted_key IS 'AES-GCM encrypted API key for admin retrieval. Only decryptable server-side.';