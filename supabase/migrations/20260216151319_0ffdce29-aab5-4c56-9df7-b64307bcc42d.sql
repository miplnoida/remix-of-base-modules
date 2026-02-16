-- Allow anonymous (unauthenticated) users to read enabled api_registry entries
CREATE POLICY "Anyone can read enabled api_registry"
ON public.api_registry FOR SELECT
USING (is_enabled = true);
