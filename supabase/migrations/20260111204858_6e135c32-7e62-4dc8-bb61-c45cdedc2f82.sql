-- Drop the existing delete policy
DROP POLICY IF EXISTS "Admins can delete applications" ON sample_applications;

-- Create a new delete policy that allows:
-- 1. The applicant to delete their own Draft applications
-- 2. Users with 'delete' permission on the module
CREATE POLICY "Users can delete applications"
ON sample_applications
FOR DELETE
USING (
  -- Applicant can delete their own Draft applications
  (auth.uid() = applicant_id AND status = 'Draft')
  OR 
  -- Or users with delete permission
  has_permission(auth.uid(), 'sample_application', 'delete')
);