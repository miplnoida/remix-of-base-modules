-- Add RLS policy for admins to manage ALL profiles
CREATE POLICY "Admins can manage all profiles" 
ON profiles FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- Add INSERT policy for user_sessions
CREATE POLICY "Users can create their own sessions" 
ON user_sessions FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());