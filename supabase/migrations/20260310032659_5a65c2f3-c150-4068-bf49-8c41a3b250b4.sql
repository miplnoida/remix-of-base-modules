
-- Update ALL remaining screens with auto-generated functional summaries and business purposes based on screen name/module
UPDATE dev_info_screens SET 
  functional_summary = CASE 
    -- Employers module
    WHEN module_name = 'Employers' AND screen_name LIKE '%Registration%' THEN 'Manages employer registration process including application submission, review, and approval workflows.'
    WHEN module_name = 'Employers' AND screen_name LIKE '%Search%' THEN 'Provides advanced search functionality for locating employer records using multiple criteria.'
    WHEN module_name = 'Employers' AND screen_name LIKE '%Detail%' THEN 'Displays comprehensive employer information including business details, contact information, and compliance status.'
    WHEN module_name = 'Employers' AND screen_name LIKE '%Contribution%' THEN 'Manages employer contribution records, payment tracking, and contribution history.'
    WHEN module_name = 'Employers' AND screen_name LIKE '%Compliance%' THEN 'Tracks employer compliance status, violations, and corrective actions.'
    WHEN module_name = 'Employers' AND screen_name LIKE '%Employee%' THEN 'Manages employee records linked to employers including enrollment and cessation tracking.'
    -- C3 Management
    WHEN module_name = 'C3 Management' AND screen_name LIKE '%Submission%' THEN 'Handles C3 contribution return submissions from employers including line items, validation, and posting.'
    WHEN module_name = 'C3 Management' AND screen_name LIKE '%Validation%' THEN 'Validates C3 submission data against business rules including SSN verification, age limits, and wage ceilings.'
    WHEN module_name = 'C3 Management' AND screen_name LIKE '%Query%' THEN 'Manages queries raised on C3 submissions requiring employer clarification or correction.'
    WHEN module_name = 'C3 Management' AND screen_name LIKE '%Posting%' THEN 'Posts validated C3 submissions to the ledger, updating contribution records for employers and employees.'
    WHEN module_name = 'C3 Management' AND screen_name LIKE '%Report%' THEN 'Generates analytical reports on C3 submissions, contributions, and compliance metrics.'
    -- Compliance
    WHEN module_name = 'Compliance' AND screen_name LIKE '%Audit%' THEN 'Manages compliance audit cases including scheduling, execution, findings, and resolution tracking.'
    WHEN module_name = 'Compliance' AND screen_name LIKE '%Inspection%' THEN 'Tracks field inspection activities, findings, and follow-up actions for compliance enforcement.'
    WHEN module_name = 'Compliance' AND screen_name LIKE '%Arrears%' THEN 'Manages employer contribution arrears including balance tracking, interest calculations, and collection activities.'
    WHEN module_name = 'Compliance' AND screen_name LIKE '%Notice%' THEN 'Generates and tracks compliance notices, warnings, and demand letters sent to employers.'
    WHEN module_name = 'Compliance' AND screen_name LIKE '%Waiver%' THEN 'Processes penalty and interest waiver requests through multi-level approval workflows.'
    -- Finance
    WHEN module_name = 'Finance' AND screen_name LIKE '%Payment%' THEN 'Processes financial payments including employer contributions, benefit disbursements, and refunds.'
    WHEN module_name = 'Finance' AND screen_name LIKE '%Journal%' THEN 'Creates and manages financial journal entries for accounting adjustments and corrections.'
    WHEN module_name = 'Finance' AND screen_name LIKE '%Receipt%' THEN 'Records and manages payment receipts from employers and other sources.'
    WHEN module_name = 'Finance' AND screen_name LIKE '%Reconciliation%' THEN 'Reconciles financial records between internal systems, bank statements, and external data sources.'
    -- Legal
    WHEN module_name IN ('Legal', 'Legal Final') AND screen_name LIKE '%Case%' THEN 'Manages legal cases including case creation, documentation, proceedings tracking, and resolution.'
    WHEN module_name IN ('Legal', 'Legal Final') AND screen_name LIKE '%Prosecution%' THEN 'Tracks prosecution activities for non-compliant employers including court proceedings and outcomes.'
    WHEN module_name IN ('Legal', 'Legal Final') AND screen_name LIKE '%Settlement%' THEN 'Manages settlement negotiations and agreements for outstanding arrears or legal disputes.'
    -- Insured Persons
    WHEN module_name = 'Insured Persons' AND screen_name LIKE '%Registration%' THEN 'Manages insured person registration including personal details, employment history, and SSN assignment.'
    WHEN module_name = 'Insured Persons' AND screen_name LIKE '%Search%' THEN 'Provides search functionality for locating insured person records using SSN, name, or other criteria.'
    WHEN module_name = 'Insured Persons' AND screen_name LIKE '%History%' THEN 'Displays contribution history, employment records, and benefit claims for insured persons.'
    WHEN module_name = 'Insured Persons' AND screen_name LIKE '%Benefit%' THEN 'Manages benefit applications and entitlements for insured persons.'
    -- Internal Audit
    WHEN module_name = 'Internal Audit' AND screen_name LIKE '%Finding%' THEN 'Documents and tracks internal audit findings including risk assessment, recommendations, and follow-up actions.'
    WHEN module_name = 'Internal Audit' AND screen_name LIKE '%Plan%' THEN 'Creates and manages annual and quarterly internal audit plans with resource allocation.'
    WHEN module_name = 'Internal Audit' AND screen_name LIKE '%Working%' THEN 'Manages audit working papers including evidence collection, analysis, and documentation.'
    WHEN module_name = 'Internal Audit' AND screen_name LIKE '%Report%' THEN 'Generates internal audit reports with findings, recommendations, and management responses.'
    -- Benefits
    WHEN module_name IN ('Benefits', 'NBenefit', 'NewBenefit') AND screen_name LIKE '%Claim%' THEN 'Processes benefit claims including application review, eligibility verification, and payment authorization.'
    WHEN module_name IN ('Benefits', 'NBenefit', 'NewBenefit') AND screen_name LIKE '%Application%' THEN 'Manages benefit applications from insured persons including documentation and approval workflows.'
    -- Cashier
    WHEN module_name = 'Cashier' AND screen_name LIKE '%Receipt%' THEN 'Records cash and check receipts from employers and contributors at the cashier counter.'
    WHEN module_name = 'Cashier' AND screen_name LIKE '%Payment%' THEN 'Processes outgoing payments including benefit disbursements and refunds.'
    WHEN module_name = 'Cashier' AND screen_name LIKE '%Batch%' THEN 'Manages batch payment processing for bulk disbursements and contributions.'
    -- Workflow
    WHEN module_name = 'Workflow' AND screen_name LIKE '%Designer%' THEN 'Visual workflow designer for creating and modifying approval and business process workflows.'
    WHEN module_name = 'Workflow' AND screen_name LIKE '%Instance%' THEN 'Displays active workflow instances with current status, pending approvals, and timeline.'
    WHEN module_name = 'Workflow' AND screen_name LIKE '%Task%' THEN 'Shows pending workflow tasks assigned to the current user for review and action.'
    -- Notifications
    WHEN module_name = 'Notifications' THEN 'Manages system notifications including email, SMS, and in-app notification configuration and delivery.'
    -- Generic fallbacks
    WHEN screen_name LIKE '%Dashboard%' THEN 'Provides a summary dashboard with key metrics, charts, and quick-action links for the ' || module_name || ' module.'
    WHEN screen_name LIKE '%Report%' THEN 'Generates analytical and operational reports for the ' || module_name || ' module with filtering and export capabilities.'
    WHEN screen_name LIKE '%Settings%' OR screen_name LIKE '%Config%' THEN 'Configuration settings for the ' || module_name || ' module including parameters, rules, and preferences.'
    WHEN screen_name LIKE '%List%' OR screen_name LIKE '%Management%' THEN 'List view with search, filter, and CRUD operations for ' || module_name || ' records.'
    WHEN screen_name LIKE '%Create%' OR screen_name LIKE '%New%' OR screen_name LIKE '%Add%' THEN 'Data entry form for creating new records in the ' || module_name || ' module.'
    WHEN screen_name LIKE '%Edit%' OR screen_name LIKE '%Update%' THEN 'Edit form for modifying existing records in the ' || module_name || ' module.'
    WHEN screen_name LIKE '%Detail%' OR screen_name LIKE '%View%' THEN 'Detailed view of a specific record in the ' || module_name || ' module with related information.'
    ELSE 'Screen for ' || screen_name || ' functionality within the ' || COALESCE(module_name, 'System') || ' module.'
  END,
  business_purpose = CASE 
    WHEN module_name = 'Employers' THEN 'Support employer lifecycle management including registration, compliance monitoring, and contribution tracking.'
    WHEN module_name = 'C3 Management' THEN 'Ensure accurate and timely collection of employer contributions through structured submission and validation processes.'
    WHEN module_name = 'Compliance' THEN 'Enforce regulatory compliance through systematic monitoring, auditing, and enforcement activities.'
    WHEN module_name = 'Finance' THEN 'Manage financial transactions, accounting entries, and payment processing for the organization.'
    WHEN module_name IN ('Legal', 'Legal Final') THEN 'Support legal enforcement actions against non-compliant employers and manage legal case proceedings.'
    WHEN module_name = 'Insured Persons' THEN 'Manage insured person records and ensure accurate contribution tracking and benefit eligibility.'
    WHEN module_name = 'Internal Audit' THEN 'Provide independent assurance on internal controls, risk management, and governance processes.'
    WHEN module_name IN ('Benefits', 'NBenefit', 'NewBenefit') THEN 'Process and manage benefit claims to ensure timely and accurate disbursement to eligible insured persons.'
    WHEN module_name = 'Cashier' THEN 'Manage cash handling operations including receipt collection and payment disbursement at service points.'
    WHEN module_name = 'Workflow' THEN 'Automate business processes through configurable approval workflows and task management.'
    WHEN module_name = 'Administration' THEN 'Maintain system configuration, user management, and operational settings for the platform.'
    WHEN module_name = 'Notifications' THEN 'Ensure timely communication with stakeholders through multi-channel notification delivery.'
    WHEN module_name = 'Reports' THEN 'Provide data-driven insights through comprehensive reporting and analytics capabilities.'
    WHEN module_name = 'BeMA' THEN 'Manage BeMA (Benefits Management Administration) operations including registrations, contributions, and field activities.'
    WHEN module_name = 'Self-Employed' THEN 'Support self-employed contributor registration and contribution management.'
    WHEN module_name = 'Medical' THEN 'Manage medical examinations, reports, and health assessments for benefit claims.'
    WHEN module_name = 'Templates' THEN 'Manage document and communication templates used across the system.'
    WHEN module_name = 'Inspector' THEN 'Support field inspection operations including scheduling, execution, and reporting.'
    ELSE 'Support operational activities for the ' || COALESCE(module_name, 'System') || ' module.'
  END,
  screen_type = CASE 
    WHEN screen_type IS NOT NULL AND screen_type != '' THEN screen_type
    WHEN screen_name LIKE '%Report%' THEN 'Report'
    WHEN screen_name LIKE '%Dashboard%' THEN 'Dashboard'
    WHEN screen_name LIKE '%Create%' OR screen_name LIKE '%New%' OR screen_name LIKE '%Add%' OR screen_name LIKE '%Wizard%' THEN 'Entry'
    WHEN screen_name LIKE '%Detail%' OR screen_name LIKE '%View%' THEN 'Detail'
    WHEN screen_name LIKE '%Config%' OR screen_name LIKE '%Setting%' THEN 'Settings'
    ELSE 'List'
  END,
  primary_user_roles = CASE 
    WHEN module_name = 'Administration' THEN 'Super Admin, System Administrator'
    WHEN module_name = 'Compliance' THEN 'Compliance Officer, Inspector, Compliance Manager'
    WHEN module_name = 'Finance' THEN 'Finance Officer, Accountant, Finance Manager'
    WHEN module_name IN ('Legal', 'Legal Final') THEN 'Legal Officer, Legal Manager, Attorney'
    WHEN module_name = 'Internal Audit' THEN 'Internal Auditor, Audit Manager, Chief Auditor'
    WHEN module_name = 'Cashier' THEN 'Cashier, Finance Officer, Cashier Supervisor'
    WHEN module_name = 'Inspector' THEN 'Field Inspector, Inspector Supervisor'
    WHEN module_name IN ('Benefits', 'NBenefit', 'NewBenefit') THEN 'Benefits Officer, Benefits Manager, Claims Processor'
    WHEN module_name = 'Medical' THEN 'Medical Officer, Medical Board Member'
    ELSE 'System User, Administrator'
  END,
  documentation_status = 'auto_extracted',
  updated_at = now()
WHERE documentation_status = 'not_started';
