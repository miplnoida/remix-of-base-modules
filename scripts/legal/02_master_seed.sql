-- =====================================================================
-- LEGAL MASTER / REFERENCE SEED — TEST / UAT ONLY
-- =====================================================================
-- ⚠️  DO NOT RUN ON PRODUCTION WITH REAL DATA.
-- Idempotent: uses ON CONFLICT on natural keys. Safe to re-run.
--
-- Assumes existing reference groups (matter type, priority, stage,
-- status, fund type, liability type, fee heads) are already seeded
-- from prior migrations. Only re-seeds what the UAT scenarios need
-- and what is safe to top-up: courts, court officers, and a small
-- set of core_reference_value rows for St. Kitts & Nevis defaults.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Courts (St. Kitts & Nevis)
-- ---------------------------------------------------------------------
INSERT INTO lg_court (court_code, court_name, court_type, island, country_code, active, created_at, updated_at)
VALUES
  ('MC_BAS',  'Magistrate Court — Basseterre',       'MAGISTRATE',  'ST_KITTS', 'KN', true, now(), now()),
  ('MC_CHA',  'Magistrate Court — Charlestown',      'MAGISTRATE',  'NEVIS',    'KN', true, now(), now()),
  ('HC_BAS',  'High Court — Basseterre',             'HIGH_COURT',  'ST_KITTS', 'KN', true, now(), now()),
  ('COA_ECS', 'Eastern Caribbean Court of Appeal',   'COURT_OF_APPEAL', 'ST_KITTS', 'KN', true, now(), now())
ON CONFLICT (court_code) DO UPDATE
  SET court_name = EXCLUDED.court_name,
      active     = EXCLUDED.active,
      updated_at = now();

-- ---------------------------------------------------------------------
-- Court officers (magistrates / registrars)
-- ---------------------------------------------------------------------
INSERT INTO lg_court_officer (officer_code, officer_name, officer_type, active, created_at, updated_at)
VALUES
  ('MAG_BAS_01', 'Hon. J. Williams',    'MAGISTRATE', true, now(), now()),
  ('MAG_CHA_01', 'Hon. R. Liburd',      'MAGISTRATE', true, now(), now()),
  ('JUD_HC_01',  'Hon. Justice A. Ward','JUDGE',      true, now(), now()),
  ('REG_BAS_01', 'M. Browne',           'REGISTRAR',  true, now(), now())
ON CONFLICT (officer_code) DO UPDATE
  SET officer_name = EXCLUDED.officer_name,
      active       = true,
      updated_at   = now();

COMMIT;

SELECT 'lg_court' AS t, COUNT(*) FROM lg_court
UNION ALL SELECT 'lg_court_officer', COUNT(*) FROM lg_court_officer;
