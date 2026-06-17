CREATE OR REPLACE FUNCTION public.bn_block_legacy_tariff_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Legacy table %.% is retired — insert into public.bn_medical_reimbursement_limit instead.',
    TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'feature_not_supported';
END;
$$;

DROP TRIGGER IF EXISTS trg_bn_medical_tariff_table_block_insert ON public.bn_medical_tariff_table;
CREATE TRIGGER trg_bn_medical_tariff_table_block_insert
BEFORE INSERT ON public.bn_medical_tariff_table
FOR EACH ROW EXECUTE FUNCTION public.bn_block_legacy_tariff_insert();

DROP TRIGGER IF EXISTS trg_bn_medical_tariff_row_block_insert ON public.bn_medical_tariff_row;
CREATE TRIGGER trg_bn_medical_tariff_row_block_insert
BEFORE INSERT ON public.bn_medical_tariff_row
FOR EACH ROW EXECUTE FUNCTION public.bn_block_legacy_tariff_insert();