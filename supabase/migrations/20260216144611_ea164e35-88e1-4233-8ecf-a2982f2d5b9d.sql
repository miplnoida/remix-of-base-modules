
-- Add is_public column to external_api_master
ALTER TABLE public.external_api_master
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Allow anonymous read access to public active APIs
CREATE POLICY "Anyone can read public active APIs"
ON public.external_api_master
FOR SELECT
USING (is_public = true AND is_active = true);

-- Allow anonymous read access to request fields for public APIs
CREATE POLICY "Anyone can read request fields of public APIs"
ON public.external_api_request_fields
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.external_api_master
    WHERE id = external_api_request_fields.api_id
    AND is_public = true AND is_active = true
  )
);

-- Allow anonymous read access to response fields for public APIs
CREATE POLICY "Anyone can read response fields of public APIs"
ON public.external_api_response_fields
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.external_api_master
    WHERE id = external_api_response_fields.api_id
    AND is_public = true AND is_active = true
  )
);

-- Allow anonymous read access to change logs for public APIs
CREATE POLICY "Anyone can read change logs of public APIs"
ON public.external_api_change_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.external_api_master
    WHERE id = external_api_change_log.api_id
    AND is_public = true AND is_active = true
  )
);

-- Mark existing sample APIs as public
UPDATE public.external_api_master SET is_public = true WHERE is_active = true;
