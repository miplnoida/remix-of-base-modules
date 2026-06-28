
-- 1. Create master table
CREATE TABLE IF NOT EXISTS public.comm_asset_category_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code text NOT NULL UNIQUE,
  category_name text NOT NULL,
  group_name text NOT NULL,
  description text,
  used_in jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_size text,
  accepted_file_types text NOT NULL DEFAULT 'image/*,.pdf,.svg,.webp',
  max_file_size_kb integer NOT NULL DEFAULT 2000,
  aspect text NOT NULL DEFAULT 'any',
  tips jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_asset_category_master TO authenticated;
GRANT SELECT ON public.comm_asset_category_master TO anon;
GRANT ALL ON public.comm_asset_category_master TO service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_comm_asset_category_master_updated_at ON public.comm_asset_category_master;
CREATE TRIGGER trg_comm_asset_category_master_updated_at
  BEFORE UPDATE ON public.comm_asset_category_master
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed system defaults
INSERT INTO public.comm_asset_category_master
  (category_code, category_name, group_name, description, used_in, recommended_size, accepted_file_types, max_file_size_kb, aspect, tips, sort_order, is_system_default)
VALUES
 ('logo','Primary Logo','Branding','The main organisation logo used on documents, the app header, and PDFs.','["Letterheads","PDF cover pages","Login screen","App top bar"]','512 × 512 px (transparent PNG/SVG)','image/png,image/svg+xml,image/webp',500,'square','["Use a transparent background.","SVG is preferred for crispness."]',10,true),
 ('logo_small','Compact Logo / Icon Mark','Branding','Square mark used where the full logo will not fit (mobile, sidebars, social previews).','["Sidebar collapsed state","Mobile header","Social OG image fallback"]','128 × 128 px','image/png,image/svg+xml,image/webp',200,'square','["Avoid text — only the mark.","Must be legible at 32 px."]',20,true),
 ('favicon','Browser Favicon','Branding','Tab icon shown by web browsers and bookmarks.','["Browser tab","Bookmarks","PWA install"]','32 × 32 px or 64 × 64 px (.ico or PNG)','image/x-icon,image/png,image/svg+xml',100,'square','["Provide a square asset — no padding.",".ico supports multiple sizes."]',30,true),
 ('letterhead_header','Letterhead — Header Band','Documents','Top band printed on every official letter and PDF report.','["Generated letters","Audit reports","Legal notices","Compliance correspondence"]','1600 × 280 px (≈ A4 width at 200 DPI)','image/png,image/jpeg,image/svg+xml',800,'wide','["Include logo, organisation name and address line.","Leave 20 px safe area on each side."]',40,true),
 ('letterhead_footer','Letterhead — Footer Band','Documents','Footer band with statutory contact details printed on every letter.','["Generated letters","Receipts","Statements"]','1600 × 180 px','image/png,image/jpeg,image/svg+xml',800,'wide','["Avoid overlapping with page numbers (last 40 px)."]',50,true),
 ('signature','Authorised Signature','Documents','Scanned signature applied to approved documents and certificates.','["Certificates","Approval letters","Cheques"]','400 × 120 px (transparent PNG)','image/png,image/svg+xml',200,'wide','["Scan at 300 DPI, then remove background.","Restrict access — requires approval."]',60,true),
 ('stamp','Office Stamp','Documents','Round/rectangular office stamp overlaid on issued documents.','["Receipts","Certified copies","Approved letters"]','300 × 300 px (transparent PNG)','image/png,image/svg+xml',200,'square','["Transparent background only.","Use semi-transparent ink for realism."]',70,true),
 ('seal','Official Seal','Documents','Statutory seal used on legal and binding documents.','["Legal notices","Court referrals","Binding agreements"]','400 × 400 px (transparent PNG)','image/png,image/svg+xml',300,'square','["High contrast; will print in black & white.","Requires Director-level approval."]',80,true),
 ('qr_code','Reference QR Code','Documents','QR code embedded on receipts and certificates for verification.','["Receipts","Certificates","Public verification pages"]','300 × 300 px','image/png,image/svg+xml',100,'square','["Most modules generate QR dynamically — only override here if you have a static fallback."]',90,true),
 ('watermark','Document Watermark','Documents','Faint background mark printed behind document body (DRAFT, COPY, ORIGINAL…).','["Draft PDFs","Internal copies"]','1200 × 1200 px (transparent PNG, low opacity)','image/png,image/svg+xml',400,'square','["Use ~15% opacity grey.","Centered behind text."]',100,true),
 ('certificate_background','Certificate Background','Documents','Full-page decorative background used by certificates of registration / completion.','["Registration certificates","Compliance certificates"]','2480 × 3508 px (A4 portrait, 300 DPI)','image/png,image/jpeg',2000,'tall','["Keep the centre area lightly textured — text is overlaid there."]',110,true),
 ('email_header','Email Header Banner','Email','Banner image at the top of every transactional and notification email.','["Notification emails","Statement emails","Payment receipts"]','1200 × 240 px','image/png,image/jpeg',300,'wide','["Optimise for mobile width (375 px).","Do not embed important text — many clients block images."]',120,true),
 ('email_footer','Email Footer Banner','Email','Footer block in emails with contact details and unsubscribe area.','["All outbound emails"]','1200 × 180 px','image/png,image/jpeg',300,'wide','["Leave space for the unsubscribe link injected by the mailer."]',130,true),
 ('login_logo','Login Page Logo','Portal','Logo shown on the public sign-in screen.','["Sign-in page","Password reset"]','320 × 120 px','image/png,image/svg+xml,image/webp',200,'wide','["Use the colour variant of the logo."]',140,true),
 ('login_background','Login Background','Portal','Backdrop image behind the sign-in form.','["Sign-in page"]','1920 × 1080 px','image/jpeg,image/webp',800,'wide','["Pick a low-contrast image so the form remains readable.","JPG/WebP — avoid PNG to keep size low."]',150,true),
 ('dashboard_banner','Public Portal Banner','Portal','Banner on the public landing portal.','["Public portal home"]','1920 × 480 px','image/jpeg,image/webp,image/png',800,'wide','["Avoid placing key text near the edges — crops on small screens."]',160,true),
 ('announcement_banner','Member Portal Banner','Portal','Banner shown to authenticated members.','["Member portal home"]','1600 × 400 px','image/jpeg,image/webp,image/png',700,'wide','["Rotate periodically with effective-from/to dates."]',170,true),
 ('maintenance_banner','Employer Portal Banner','Portal','Banner shown to authenticated employers.','["Employer portal home"]','1600 × 400 px','image/jpeg,image/webp,image/png',700,'wide','["Use for filing-deadline reminders and policy notices."]',180,true),
 ('app_icon','Mobile App Icon','Mobile','Launcher icon for the iOS/Android app.','["iOS home screen","Android launcher"]','1024 × 1024 px (square, no transparency)','image/png',500,'square','["No transparency — fully opaque PNG.","Avoid thin lines, they get clipped by the OS mask."]',190,true),
 ('app_splash','Mobile App Splash','Mobile','Splash screen shown while the app loads.','["App cold-start"]','1242 × 2688 px (portrait)','image/png,image/jpeg',1500,'tall','["Keep critical content in the safe area (centre 60%)."]',200,true),
 ('other','Other','Other','Anything that doesn''t fit the categories above.','["Ad-hoc / one-off uses"]','—','image/*,.pdf,.svg,.webp',2000,'any','[]',210,true)
ON CONFLICT (category_code) DO NOTHING;

-- 3. Drop indexes referencing enum column, convert to text, recreate indexes
DROP INDEX IF EXISTS public.ix_comm_media_asset_category;
DROP INDEX IF EXISTS public.ix_comm_media_asset_resolver;
DROP INDEX IF EXISTS public.ux_comm_media_asset_sys_default;
DROP INDEX IF EXISTS public.idx_comm_media_asset_category_status;
DROP INDEX IF EXISTS public.ix_comm_asset_mapping_lookup;

-- Drop the function with the enum-typed parameter so column type-change isn't blocked
DROP FUNCTION IF EXISTS public.resolve_comm_asset(comm_asset_category, uuid, text, text, uuid, text);

ALTER TABLE public.comm_media_asset
  ALTER COLUMN category TYPE text USING category::text;

ALTER TABLE public.comm_asset_mapping
  ALTER COLUMN category TYPE text USING category::text;

-- Recreate indexes
CREATE INDEX ix_comm_media_asset_category ON public.comm_media_asset (category);
CREATE INDEX ix_comm_media_asset_resolver ON public.comm_media_asset
  (category, approval_status, is_active, organization_id, department_id, module_code, location_id);
CREATE UNIQUE INDEX ux_comm_media_asset_sys_default ON public.comm_media_asset (category)
  WHERE (is_system_default = true);
CREATE INDEX idx_comm_media_asset_category_status ON public.comm_media_asset (category, approval_status);
CREATE INDEX ix_comm_asset_mapping_lookup ON public.comm_asset_mapping
  (category, communication_type, module_code, department_code, organization_id, location_id)
  WHERE (is_active = true);

-- Recreate resolver function with text category param
CREATE OR REPLACE FUNCTION public.resolve_comm_asset(
  p_category text,
  p_organization_id uuid DEFAULT NULL,
  p_department_code text DEFAULT NULL,
  p_module_code text DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_communication_type text DEFAULT NULL
)
RETURNS TABLE(
  asset_id uuid, asset_name text, source comm_asset_source,
  storage_path text, external_url text, resolved_via text, is_fallback boolean
)
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
BEGIN
  IF p_communication_type IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'communication_type'::text, false
    FROM public.comm_asset_mapping m
    JOIN public.comm_media_asset a ON a.id = m.asset_id
    WHERE m.category = p_category AND m.communication_type = p_communication_type
      AND m.is_active = true AND a.is_active = true AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY m.priority ASC, a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_module_code IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'module'::text, false
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.module_code = p_module_code
      AND a.is_active = true AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_department_code IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'department'::text, false
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.department_code = p_department_code
      AND a.is_active = true AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_organization_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'organization'::text, false
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.organization_id = p_organization_id
      AND a.scope = 'organization' AND a.is_active = true AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_location_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'location'::text, false
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.location_id = p_location_id
      AND a.is_active = true AND a.approval_status = 'approved'
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT a.id, a.name, a.source, a.storage_path, a.external_url,
         CASE WHEN a.is_system_default THEN 'system_default' ELSE 'global' END,
         a.is_system_default
  FROM public.comm_media_asset a
  WHERE a.category = p_category AND a.is_active = true AND a.approval_status = 'approved'
    AND (a.scope = 'global' OR a.is_system_default = true)
  ORDER BY a.is_system_default ASC, a.version DESC LIMIT 1;
END;
$function$;

-- 4. Guard: prevent deleting a category used by assets, or deleting system defaults
CREATE OR REPLACE FUNCTION public.guard_comm_asset_category_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF OLD.is_system_default THEN
    RAISE EXCEPTION 'System default category "%" cannot be deleted. Deactivate it instead.', OLD.category_code;
  END IF;
  SELECT count(*) INTO v_count FROM public.comm_media_asset WHERE category = OLD.category_code;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Category "%" is in use by % asset(s). Deactivate it instead.', OLD.category_code, v_count;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_comm_asset_category_delete ON public.comm_asset_category_master;
CREATE TRIGGER trg_guard_comm_asset_category_delete
  BEFORE DELETE ON public.comm_asset_category_master
  FOR EACH ROW EXECUTE FUNCTION public.guard_comm_asset_category_delete();
