DO $$
DECLARE
  v_layout RECORD;
  v_module RECORD;
  v_code TEXT;
  v_name TEXT;
  v_template_id UUID;
  v_version_id UUID;
  v_body TEXT;
BEGIN
  FOR v_module IN
    SELECT * FROM (VALUES
      ('ORG','Organization'),('LEGAL','Legal'),('BENEFITS','Benefits'),
      ('COMPLIANCE','Compliance'),('EMPLOYER','Employer'),('MEMBER','Member'),
      ('PAYMENTS','Payments'),('REPORTS','Reports'),('AUDIT','Audit')
    ) AS t(code,name)
  LOOP
    FOR v_layout IN
      SELECT l.id, l.code, x.template_type
      FROM (VALUES ('BASE_EMAIL','EMAIL'),('BASE_LETTER','LETTER'),('BASE_NOTICE','NOTICE')) AS x(code, template_type)
      JOIN core_template_layout l ON l.code = x.code
    LOOP
      v_code := 'STD_' || v_module.code || '_' || v_layout.template_type;
      IF EXISTS (SELECT 1 FROM core_template WHERE code = v_code) THEN CONTINUE; END IF;
      v_name := 'Standard ' || v_module.name || ' ' || initcap(lower(v_layout.template_type));

      INSERT INTO core_template (code, name, description, module_code, module_name, template_type, status, default_layout_id, is_active, scope)
      VALUES (v_code, v_name,
        'Shipped baseline. Uses runtime resolution for signature, footer, disclaimer and letterhead.',
        v_module.code, v_module.name, v_layout.template_type, 'ACTIVE', v_layout.id, TRUE, 'GLOBAL')
      RETURNING id INTO v_template_id;

      v_body := CASE v_layout.template_type
        WHEN 'EMAIL'  THEN '<p>Dear {{recipient.name}},</p><p>{{body}}</p><p>Regards,<br/>{{SIGNATURE_BLOCK}}</p>{{DISCLAIMER_BLOCK}}{{FOOTER_BLOCK}}'
        WHEN 'LETTER' THEN '<p>{{today}}</p><p>{{recipient.name}}<br/>{{recipient.address}}</p><p>Dear {{recipient.salutation}},</p><p>{{body}}</p><p>Yours sincerely,<br/>{{SIGNATURE_BLOCK}}</p>{{DISCLAIMER_BLOCK}}{{FOOTER_BLOCK}}'
        WHEN 'NOTICE' THEN '<h2>{{notice.title}}</h2><p>Reference: {{notice.reference}}</p><p>{{body}}</p>{{DISCLAIMER_BLOCK}}{{FOOTER_BLOCK}}'
      END;

      INSERT INTO core_template_version (template_id, version_no, status, body_html, subject, layout_id)
      VALUES (v_template_id, 1, 'ACTIVE', v_body,
        CASE WHEN v_layout.template_type = 'EMAIL' THEN '{{subject}}' ELSE NULL END,
        v_layout.id)
      RETURNING id INTO v_version_id;

      UPDATE core_template SET active_version_id = v_version_id WHERE id = v_template_id;
    END LOOP;
  END LOOP;
END $$;