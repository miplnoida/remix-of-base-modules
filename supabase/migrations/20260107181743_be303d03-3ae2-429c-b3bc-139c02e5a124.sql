-- Drop duplicate/conflicting SELECT policies on office_locations and keep one simple authenticated read policy
DROP POLICY IF EXISTS "Anyone can view active office locations" ON public.office_locations;
DROP POLICY IF EXISTS "Authenticated can view office_locations" ON public.office_locations;

-- Create a clear SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view office_locations" 
ON public.office_locations 
FOR SELECT 
TO authenticated
USING (true);

-- Same for departments - ensure authenticated users can view
DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view active departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments" 
ON public.departments 
FOR SELECT 
TO authenticated
USING (true);