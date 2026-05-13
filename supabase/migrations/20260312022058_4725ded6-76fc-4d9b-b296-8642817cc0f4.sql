
DO $$
DECLARE
  v_module_id UUID := '91a509c7-c24a-4f4f-8b48-df86e13a1739';
  v_exts TEXT[] := ARRAY['pdf','jpg','jpeg','png'];
  v_max_mb NUMERIC := 5;
  v_cat_id UUID;
BEGIN

  -- 1. Limited Company
  INSERT INTO public.module_doc_categories (module_id, category_name, description, sort_order, is_active, created_by, updated_by)
  VALUES (v_module_id, 'Limited Company', 'Incorporated businesses registered under the Companies Act', 1, true, 'SYSTEM', 'SYSTEM')
  RETURNING id INTO v_cat_id;

  INSERT INTO public.module_doc_configs (category_id, document_name, is_required, allowed_extensions, max_file_size_mb, sort_order, is_active, created_by, updated_by) VALUES
    (v_cat_id, 'Certificate of Incorporation', true, v_exts, v_max_mb, 1, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Articles of Incorporation / Memorandum of Association', true, v_exts, v_max_mb, 2, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Notice of Registered Office', true, v_exts, v_max_mb, 3, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Business Licence', true, v_exts, v_max_mb, 4, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Director ID (all directors)', true, v_exts, v_max_mb, 5, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Shareholder Register', false, v_exts, v_max_mb, 6, true, 'SYSTEM', 'SYSTEM');

  -- 2. Partnership
  INSERT INTO public.module_doc_categories (module_id, category_name, description, sort_order, is_active, created_by, updated_by)
  VALUES (v_module_id, 'Partnership', 'Business owned by two or more partners', 2, true, 'SYSTEM', 'SYSTEM')
  RETURNING id INTO v_cat_id;

  INSERT INTO public.module_doc_configs (category_id, document_name, is_required, allowed_extensions, max_file_size_mb, sort_order, is_active, created_by, updated_by) VALUES
    (v_cat_id, 'Business Name Registration Certificate', true, v_exts, v_max_mb, 1, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Partner ID (all partners)', true, v_exts, v_max_mb, 2, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Business Licence', true, v_exts, v_max_mb, 3, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Proof of Business Address', true, v_exts, v_max_mb, 4, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Partnership Agreement', false, v_exts, v_max_mb, 5, true, 'SYSTEM', 'SYSTEM');

  -- 3. Sole Trader / Self-Employed
  INSERT INTO public.module_doc_categories (module_id, category_name, description, sort_order, is_active, created_by, updated_by)
  VALUES (v_module_id, 'Sole Trader / Self-Employed', 'Individual operating a business on their own', 3, true, 'SYSTEM', 'SYSTEM')
  RETURNING id INTO v_cat_id;

  INSERT INTO public.module_doc_configs (category_id, document_name, is_required, allowed_extensions, max_file_size_mb, sort_order, is_active, created_by, updated_by) VALUES
    (v_cat_id, 'Business Name Registration Certificate', true, v_exts, v_max_mb, 1, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Owner ID', true, v_exts, v_max_mb, 2, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Business Licence', true, v_exts, v_max_mb, 3, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Proof of Business Address', true, v_exts, v_max_mb, 4, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Tax Registration Number (TRN)', false, v_exts, v_max_mb, 5, true, 'SYSTEM', 'SYSTEM');

  -- 4. Club / Association / NGO
  INSERT INTO public.module_doc_categories (module_id, category_name, description, sort_order, is_active, created_by, updated_by)
  VALUES (v_module_id, 'Club / Association / NGO', 'Non-profit organizations, societies, and charitable bodies', 4, true, 'SYSTEM', 'SYSTEM')
  RETURNING id INTO v_cat_id;

  INSERT INTO public.module_doc_configs (category_id, document_name, is_required, allowed_extensions, max_file_size_mb, sort_order, is_active, created_by, updated_by) VALUES
    (v_cat_id, 'Constitution / Rules / By-Laws', true, v_exts, v_max_mb, 1, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Certificate of Registration', true, v_exts, v_max_mb, 2, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Authorized Signatory ID', true, v_exts, v_max_mb, 3, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'List of Executive Members', true, v_exts, v_max_mb, 4, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Minutes of Meeting', false, v_exts, v_max_mb, 5, true, 'SYSTEM', 'SYSTEM');

  -- 5. Government Department
  INSERT INTO public.module_doc_categories (module_id, category_name, description, sort_order, is_active, created_by, updated_by)
  VALUES (v_module_id, 'Government Department', 'Government departments and ministries', 5, true, 'SYSTEM', 'SYSTEM')
  RETURNING id INTO v_cat_id;

  INSERT INTO public.module_doc_configs (category_id, document_name, is_required, allowed_extensions, max_file_size_mb, sort_order, is_active, created_by, updated_by) VALUES
    (v_cat_id, 'Official Letter / Mandate', true, v_exts, v_max_mb, 1, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Authorized Officer ID', true, v_exts, v_max_mb, 2, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Appointment Letter', true, v_exts, v_max_mb, 3, true, 'SYSTEM', 'SYSTEM'),
    (v_cat_id, 'Organization Structure', false, v_exts, v_max_mb, 4, true, 'SYSTEM', 'SYSTEM');

END $$;
