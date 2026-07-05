
CREATE OR REPLACE VIEW public.v_ssp_party_projection AS
SELECT
  'ip_master'::text                        AS source_system,
  ip.id::text                              AS source_id,
  COALESCE(ip.ssn, ip.id::text)            AS legacy_ref,
  'PERSON'::text                           AS party_kind,
  TRIM(COALESCE(ip.firstname,'') || ' ' || COALESCE(ip.surname,''))
                                           AS display_name,
  ip.ssn                                   AS primary_identifier,
  'SSN'::text                              AS primary_identifier_type,
  ip.sex::text                             AS gender,
  ip.dob                                   AS date_of_birth,
  ip.nationality                           AS nationality_code,
  ip.status::text                          AS legacy_status,
  ip.district                              AS geo_area_code,
  ip.mobile                                AS mobile,
  ip.telephone                             AS phone,
  NULL::text                               AS email,
  ip.created_at                            AS created_at,
  ip.updated_at                            AS updated_at,
  ARRAY['MEMBER','CONTRIBUTOR']::text[]    AS projected_roles
FROM public.ip_master ip
UNION ALL
SELECT
  'er_master'::text                        AS source_system,
  er.regno::text                           AS source_id,
  er.regno                                 AS legacy_ref,
  'ORGANISATION'::text                     AS party_kind,
  COALESCE(er.trade_name, er.name)         AS display_name,
  er.regno                                 AS primary_identifier,
  'REGNO'::text                            AS primary_identifier_type,
  NULL::text                               AS gender,
  NULL::date                               AS date_of_birth,
  er.hq_country                            AS nationality_code,
  er.status::text                          AS legacy_status,
  er.village_code                          AS geo_area_code,
  er.mobile                                AS mobile,
  er.phone                                 AS phone,
  er.email                                 AS email,
  er.registration_date::timestamptz        AS created_at,
  er.date_modified::timestamptz            AS updated_at,
  ARRAY['EMPLOYER']::text[]                AS projected_roles
FROM public.er_master er;

GRANT SELECT ON public.v_ssp_party_projection TO anon, authenticated, service_role;

COMMENT ON VIEW public.v_ssp_party_projection IS
'Epic 2.6A — Read-only projection of legacy ip_master and er_master into the shared Participant/Party facade. No writes. No dual-write. Legacy tables unchanged.';

UPDATE public.enterprise_capability_registry
SET
  consumers = ARRAY(SELECT DISTINCT unnest(consumers || ARRAY['member_legacy','employer_legacy'])),
  updated_at = now()
WHERE capability_key ILIKE '%participant%'
   OR capability_name ILIKE '%participant%';
