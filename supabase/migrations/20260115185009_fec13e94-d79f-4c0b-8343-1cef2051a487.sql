-- Microsoft Identity Compatible Tables for Zero-Trust Authentication
-- These tables follow the ASP.NET Core Identity schema structure

-- ============================================================================
-- 1. AspNetUsers - Main user table (mirrors ASP.NET Identity)
-- ============================================================================
CREATE TABLE public."AspNetUsers" (
    "Id" VARCHAR(450) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "UserName" VARCHAR(256),
    "NormalizedUserName" VARCHAR(256),
    "Email" VARCHAR(256),
    "NormalizedEmail" VARCHAR(256),
    "EmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "PasswordHash" TEXT,
    "SecurityStamp" TEXT DEFAULT gen_random_uuid()::text,
    "ConcurrencyStamp" TEXT DEFAULT gen_random_uuid()::text,
    "PhoneNumber" VARCHAR(50),
    "PhoneNumberConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "TwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "LockoutEnd" TIMESTAMPTZ,
    "LockoutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "AccessFailedCount" INTEGER NOT NULL DEFAULT 0,
    -- Extended fields for our system
    "user_code" VARCHAR(5) UNIQUE,
    "first_name" VARCHAR(100),
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "full_name" VARCHAR(300),
    "title" VARCHAR(20),
    "gender" VARCHAR(10),
    "date_of_birth" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "force_password_change" BOOLEAN NOT NULL DEFAULT true,
    "mfa_method" VARCHAR(50),
    "department_id" UUID,
    "designation_id" UUID,
    "office_id" UUID,
    "employee_code" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_by" VARCHAR(5),
    "updated_by" VARCHAR(5),
    "last_login" TIMESTAMPTZ,
    "last_password_change" TIMESTAMPTZ
);

-- Create indexes for AspNetUsers
CREATE INDEX "IX_AspNetUsers_NormalizedEmail" ON public."AspNetUsers" ("NormalizedEmail");
CREATE INDEX "IX_AspNetUsers_NormalizedUserName" ON public."AspNetUsers" ("NormalizedUserName");
CREATE INDEX "IX_AspNetUsers_Email" ON public."AspNetUsers" ("Email");
CREATE INDEX "IX_AspNetUsers_user_code" ON public."AspNetUsers" ("user_code");

-- ============================================================================
-- 2. AspNetRoles - Roles table
-- ============================================================================
CREATE TABLE public."AspNetRoles" (
    "Id" VARCHAR(450) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "Name" VARCHAR(256) NOT NULL,
    "NormalizedName" VARCHAR(256) NOT NULL UNIQUE,
    "ConcurrencyStamp" TEXT DEFAULT gen_random_uuid()::text,
    -- Extended fields
    "description" TEXT,
    "is_privileged" BOOLEAN NOT NULL DEFAULT false,
    "require_mfa" BOOLEAN NOT NULL DEFAULT false,
    "session_timeout_minutes" INTEGER DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_by" VARCHAR(5),
    "updated_by" VARCHAR(5)
);

CREATE INDEX "IX_AspNetRoles_NormalizedName" ON public."AspNetRoles" ("NormalizedName");

-- ============================================================================
-- 3. AspNetUserRoles - User-Role mapping
-- ============================================================================
CREATE TABLE public."AspNetUserRoles" (
    "UserId" VARCHAR(450) NOT NULL REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE,
    "RoleId" VARCHAR(450) NOT NULL REFERENCES public."AspNetRoles"("Id") ON DELETE CASCADE,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "assigned_by" VARCHAR(5),
    "expires_at" TIMESTAMPTZ,
    PRIMARY KEY ("UserId", "RoleId")
);

CREATE INDEX "IX_AspNetUserRoles_RoleId" ON public."AspNetUserRoles" ("RoleId");

-- ============================================================================
-- 4. AspNetUserClaims - User claims
-- ============================================================================
CREATE TABLE public."AspNetUserClaims" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" VARCHAR(450) NOT NULL REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE,
    "ClaimType" TEXT,
    "ClaimValue" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "IX_AspNetUserClaims_UserId" ON public."AspNetUserClaims" ("UserId");

-- ============================================================================
-- 5. AspNetRoleClaims - Role claims
-- ============================================================================
CREATE TABLE public."AspNetRoleClaims" (
    "Id" SERIAL PRIMARY KEY,
    "RoleId" VARCHAR(450) NOT NULL REFERENCES public."AspNetRoles"("Id") ON DELETE CASCADE,
    "ClaimType" TEXT,
    "ClaimValue" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "IX_AspNetRoleClaims_RoleId" ON public."AspNetRoleClaims" ("RoleId");

-- ============================================================================
-- 6. AspNetUserLogins - External login providers
-- ============================================================================
CREATE TABLE public."AspNetUserLogins" (
    "LoginProvider" VARCHAR(128) NOT NULL,
    "ProviderKey" VARCHAR(128) NOT NULL,
    "ProviderDisplayName" TEXT,
    "UserId" VARCHAR(450) NOT NULL REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("LoginProvider", "ProviderKey")
);

CREATE INDEX "IX_AspNetUserLogins_UserId" ON public."AspNetUserLogins" ("UserId");

-- ============================================================================
-- 7. AspNetUserTokens - User tokens (2FA, password reset, etc.)
-- ============================================================================
CREATE TABLE public."AspNetUserTokens" (
    "UserId" VARCHAR(450) NOT NULL REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE,
    "LoginProvider" VARCHAR(128) NOT NULL,
    "Name" VARCHAR(128) NOT NULL,
    "Value" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expires_at" TIMESTAMPTZ,
    PRIMARY KEY ("UserId", "LoginProvider", "Name")
);

-- ============================================================================
-- 8. user_identity_map - Maps legacy users to new identity
-- ============================================================================
CREATE TABLE public.user_identity_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_user_id UUID NOT NULL,
    identity_user_id VARCHAR(450) NOT NULL REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE,
    generated_user_code VARCHAR(5) NOT NULL,
    supabase_auth_id UUID,
    migration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    migration_notes TEXT,
    UNIQUE(legacy_user_id),
    UNIQUE(identity_user_id),
    UNIQUE(supabase_auth_id)
);

CREATE INDEX "IX_user_identity_map_legacy" ON public.user_identity_map (legacy_user_id);
CREATE INDEX "IX_user_identity_map_identity" ON public.user_identity_map (identity_user_id);
CREATE INDEX "IX_user_identity_map_user_code" ON public.user_identity_map (generated_user_code);

-- ============================================================================
-- 9. Function to generate unique 5-character user code
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_user_code(
    p_first_name VARCHAR,
    p_middle_name VARCHAR,
    p_last_name VARCHAR
)
RETURNS VARCHAR(5)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_code VARCHAR(3);
    v_suffix VARCHAR(2);
    v_full_code VARCHAR(5);
    v_counter INTEGER := 0;
    v_chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
    -- Build base code from initials
    v_base_code := UPPER(
        COALESCE(LEFT(p_first_name, 1), 'X') ||
        COALESCE(LEFT(p_middle_name, 1), 'X') ||
        COALESCE(LEFT(p_last_name, 1), 'X')
    );
    
    -- Try to find unique code with alphanumeric suffix
    LOOP
        -- Generate 2-character suffix
        v_suffix := SUBSTR(v_chars, (floor(random() * 32)::int + 1), 1) ||
                    SUBSTR(v_chars, (floor(random() * 32)::int + 1), 1);
        
        v_full_code := v_base_code || v_suffix;
        
        -- Check if code exists
        IF NOT EXISTS (SELECT 1 FROM public."AspNetUsers" WHERE "user_code" = v_full_code) THEN
            RETURN v_full_code;
        END IF;
        
        v_counter := v_counter + 1;
        
        -- Safety valve - after 100 attempts, use timestamp-based suffix
        IF v_counter > 100 THEN
            v_full_code := v_base_code || SUBSTR(TO_CHAR(NOW(), 'SSMS'), 1, 2);
            RETURN v_full_code;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- 10. Trigger to auto-generate user_code on insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_generate_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW."user_code" IS NULL THEN
        NEW."user_code" := public.generate_user_code(
            NEW."first_name",
            NEW."middle_name", 
            NEW."last_name"
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_aspnetusers_generate_user_code
    BEFORE INSERT ON public."AspNetUsers"
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_generate_user_code();

-- ============================================================================
-- 11. Trigger to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_aspnet_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."updated_at" := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_aspnetusers_updated_at
    BEFORE UPDATE ON public."AspNetUsers"
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_aspnet_updated_at();

CREATE TRIGGER tr_aspnetroles_updated_at
    BEFORE UPDATE ON public."AspNetRoles"
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_aspnet_updated_at();

-- ============================================================================
-- 12. Enable RLS on all tables
-- ============================================================================
ALTER TABLE public."AspNetUsers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AspNetRoles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AspNetUserRoles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AspNetUserClaims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AspNetRoleClaims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AspNetUserLogins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AspNetUserTokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_identity_map ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 13. Create security definer function for role checks
-- ============================================================================
CREATE OR REPLACE FUNCTION public.identity_has_role(_user_id VARCHAR(450), _role_name VARCHAR(256))
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public."AspNetUserRoles" ur
        JOIN public."AspNetRoles" r ON ur."RoleId" = r."Id"
        WHERE ur."UserId" = _user_id
          AND r."NormalizedName" = UPPER(_role_name)
          AND (ur."expires_at" IS NULL OR ur."expires_at" > NOW())
    )
$$;

-- ============================================================================
-- 14. RLS Policies for AspNetUsers
-- ============================================================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public."AspNetUsers" FOR SELECT 
TO authenticated
USING (
    "Id" = (
        SELECT identity_user_id::text FROM public.user_identity_map 
        WHERE supabase_auth_id = auth.uid()
    )
    OR public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

-- Admins can insert users
CREATE POLICY "Admins can insert users"
ON public."AspNetUsers" FOR INSERT
TO authenticated
WITH CHECK (
    public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

-- Users can update own profile, admins can update any
CREATE POLICY "Users can update own or admins can update all"
ON public."AspNetUsers" FOR UPDATE
TO authenticated
USING (
    "Id" = (
        SELECT identity_user_id::text FROM public.user_identity_map 
        WHERE supabase_auth_id = auth.uid()
    )
    OR public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

-- ============================================================================
-- 15. RLS Policies for AspNetRoles
-- ============================================================================
CREATE POLICY "Authenticated users can view roles"
ON public."AspNetRoles" FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage roles"
ON public."AspNetRoles" FOR ALL
TO authenticated
USING (
    public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

-- ============================================================================
-- 16. RLS Policies for AspNetUserRoles
-- ============================================================================
CREATE POLICY "Users can view own roles"
ON public."AspNetUserRoles" FOR SELECT
TO authenticated
USING (
    "UserId" = (
        SELECT identity_user_id::text FROM public.user_identity_map 
        WHERE supabase_auth_id = auth.uid()
    )
    OR public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

CREATE POLICY "Admins can manage user roles"
ON public."AspNetUserRoles" FOR ALL
TO authenticated
USING (
    public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

-- ============================================================================
-- 17. RLS Policies for user_identity_map
-- ============================================================================
CREATE POLICY "Users can view own mapping"
ON public.user_identity_map FOR SELECT
TO authenticated
USING (
    supabase_auth_id = auth.uid()
    OR public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

CREATE POLICY "Admins can manage identity mappings"
ON public.user_identity_map FOR ALL
TO authenticated
USING (
    public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

-- ============================================================================
-- 18. RLS Policies for claims tables
-- ============================================================================
CREATE POLICY "Users can view own claims"
ON public."AspNetUserClaims" FOR SELECT
TO authenticated
USING (
    "UserId" = (
        SELECT identity_user_id::text FROM public.user_identity_map 
        WHERE supabase_auth_id = auth.uid()
    )
    OR public.identity_has_role(
        (SELECT identity_user_id FROM public.user_identity_map WHERE supabase_auth_id = auth.uid()),
        'Admin'
    )
);

CREATE POLICY "Authenticated can view role claims"
ON public."AspNetRoleClaims" FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 19. RLS Policies for login/token tables
-- ============================================================================
CREATE POLICY "Users can view own logins"
ON public."AspNetUserLogins" FOR SELECT
TO authenticated
USING (
    "UserId" = (
        SELECT identity_user_id::text FROM public.user_identity_map 
        WHERE supabase_auth_id = auth.uid()
    )
);

CREATE POLICY "Users can view own tokens"
ON public."AspNetUserTokens" FOR SELECT
TO authenticated
USING (
    "UserId" = (
        SELECT identity_user_id::text FROM public.user_identity_map 
        WHERE supabase_auth_id = auth.uid()
    )
);