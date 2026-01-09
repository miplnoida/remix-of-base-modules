-- Fix workflow_tasks RLS policy to allow viewing tasks by role assignment
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON workflow_tasks;

CREATE POLICY "Users can view assigned tasks by role or user"
ON workflow_tasks FOR SELECT USING (
  assigned_to = auth.uid()
  OR assigned_role::text IN (
    SELECT ur.role::text FROM user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
  OR assigned_designation IN (
    SELECT d.name FROM designations d 
    JOIN profiles p ON p.designation_id = d.id
    WHERE p.id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'Admin'
  )
);