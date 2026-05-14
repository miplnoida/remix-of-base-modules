
-- Batch 1: Update Administration screens with functional summaries and business purposes
UPDATE dev_info_screens SET 
  functional_summary = CASE screen_code
    WHEN 'SCR-ADMIN-API-CONFIG' THEN 'Manages API endpoint configurations, base URLs, authentication headers, and connection settings for external service integrations.'
    WHEN 'SCR-ADMIN-API-KEYS' THEN 'Creates, manages, and revokes API keys for third-party integrations. Supports scope assignments and rate limit policies.'
    WHEN 'ADM-AUDIT' THEN 'Displays comprehensive audit trail of all system activities including user actions, data modifications, and access events with filtering and search.'
    WHEN 'SCR-ADMIN-BACKUP' THEN 'Manages database backup scheduling, execution, and recovery operations for disaster recovery and data protection.'
    WHEN 'SCR-ADMIN-C3-CALC-CFG' THEN 'Configures C3 contribution calculation parameters including SS rates, EI rates, levy rates, wage ceilings, and penalty rates.'
    WHEN 'SCR-ADMIN-C3-CONFIG' THEN 'Manages C3 configuration periods with date ranges, rate details, and policy settings for contribution calculations.'
    WHEN 'SCR-ADMIN-C3-PERIOD' THEN 'Defines and manages C3 filing periods with start/end dates, activation status, and configuration details.'
    WHEN 'SCR-ADMIN-SCHEDULER' THEN 'Central job scheduler for managing automated tasks, batch processes, and scheduled operations across all modules.'
    WHEN 'SCR-ADMIN-USER-CREATE' THEN 'User account creation form with role assignment, department allocation, designation selection, and access permission configuration.'
    WHEN 'SCR-ADMIN-DATA-MIG' THEN 'Tools for migrating data between systems, importing legacy records, and managing data transformation processes.'
    WHEN 'SCR-ADMIN-DEPARTMENTS' THEN 'CRUD operations for organizational departments including hierarchy management, status tracking, and user assignments.'
    WHEN 'SCR-ADMIN-DELEGATIONS' THEN 'Manages approval delegation rules allowing users to delegate their approval authority to other users for specified periods.'
    WHEN 'SCR-ADMIN-RPT-ROLES' THEN 'Report showing all user accounts grouped by their assigned roles with permission summaries.'
    WHEN 'SCR-ADMIN-RPT-CFG-AUDIT' THEN 'Audit report tracking all configuration changes across the system with before/after values and change timestamps.'
    ELSE functional_summary
  END,
  business_purpose = CASE screen_code
    WHEN 'SCR-ADMIN-API-CONFIG' THEN 'Enable secure integration with external systems by centralizing API configuration management.'
    WHEN 'SCR-ADMIN-API-KEYS' THEN 'Control and monitor third-party API access through key lifecycle management and scope restrictions.'
    WHEN 'ADM-AUDIT' THEN 'Provide accountability and traceability for all system operations to support compliance and security requirements.'
    WHEN 'SCR-ADMIN-BACKUP' THEN 'Ensure business continuity through systematic data backup and recovery capabilities.'
    WHEN 'SCR-ADMIN-C3-CALC-CFG' THEN 'Maintain accurate contribution calculation parameters to ensure correct employer/employee contribution amounts.'
    WHEN 'SCR-ADMIN-C3-CONFIG' THEN 'Define contribution rules and rates for different time periods to support regulatory compliance.'
    WHEN 'SCR-ADMIN-C3-PERIOD' THEN 'Manage the lifecycle of C3 filing periods to control when employers can submit contribution returns.'
    WHEN 'SCR-ADMIN-SCHEDULER' THEN 'Automate routine operations and batch processes to reduce manual intervention and ensure timely execution.'
    WHEN 'SCR-ADMIN-USER-CREATE' THEN 'Onboard new system users with appropriate access levels and organizational assignments.'
    WHEN 'SCR-ADMIN-DATA-MIG' THEN 'Support system transitions and data consolidation by providing controlled data migration capabilities.'
    WHEN 'SCR-ADMIN-DEPARTMENTS' THEN 'Maintain organizational structure by managing department definitions and hierarchies.'
    WHEN 'SCR-ADMIN-DELEGATIONS' THEN 'Ensure workflow continuity by allowing temporary delegation of approval responsibilities.'
    ELSE business_purpose
  END,
  screen_type = CASE 
    WHEN screen_name LIKE '%Report%' THEN 'Report'
    WHEN screen_name LIKE '%Dashboard%' THEN 'Dashboard'
    WHEN screen_name LIKE '%Create%' OR screen_name LIKE '%New%' OR screen_name LIKE '%Add%' THEN 'Entry'
    WHEN screen_name LIKE '%List%' OR screen_name LIKE '%Management%' OR screen_name LIKE '%Viewer%' THEN 'List'
    WHEN screen_name LIKE '%Detail%' OR screen_name LIKE '%View%' THEN 'Detail'
    WHEN screen_name LIKE '%Config%' OR screen_name LIKE '%Setting%' THEN 'Settings'
    WHEN screen_name LIKE '%Wizard%' THEN 'Wizard'
    ELSE COALESCE(screen_type, 'List')
  END,
  documentation_status = 'auto_extracted',
  updated_at = now()
WHERE module_name = 'Administration' AND documentation_status = 'not_started';
