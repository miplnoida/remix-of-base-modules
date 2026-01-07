-- Add first_name and last_name columns to profiles (keep full_name for backward compatibility)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create roles table for dynamic role management
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    mfa_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    updated_by UUID
);

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for roles table
CREATE POLICY "Authenticated users can view roles" ON public.roles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can manage roles" ON public.roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'Admin'::public.app_role));

-- Insert default roles from the existing enum
INSERT INTO public.roles (role_name, description, is_system_role, mfa_required) VALUES
    ('Admin', 'System administrator with full access', true, true),
    ('Clerk', 'Data entry and basic operations', false, false),
    ('FinanceOfficer', 'Financial operations and reporting', false, false),
    ('LegalOfficer', 'Legal case management', false, false),
    ('Supervisor', 'Team supervision and approvals', false, false),
    ('ReadOnly', 'View-only access to data', false, false)
ON CONFLICT (role_name) DO NOTHING;

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Create notification_providers table for provider configuration
CREATE TABLE IF NOT EXISTS public.notification_providers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    provider_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(channel)
);

-- Enable RLS on notification_providers
ALTER TABLE public.notification_providers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_providers
CREATE POLICY "Authenticated users can view providers" ON public.notification_providers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can manage providers" ON public.notification_providers
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'Admin'::public.app_role));

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, notification_type)
);

-- Enable RLS on user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_notification_preferences
CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences" ON public.user_notification_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Create in_app_notifications table for in-app notification center
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on in_app_notifications
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for in_app_notifications
CREATE POLICY "Users can view their own notifications" ON public.in_app_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.in_app_notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Add updated_at trigger to new tables
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_providers_updated_at
    BEFORE UPDATE ON public.notification_providers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON public.user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();