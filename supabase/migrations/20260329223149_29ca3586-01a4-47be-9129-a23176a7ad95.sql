-- Attach audit triggers to levy slab tables
CREATE TRIGGER audit_tb_levy_slabs
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_levy_slabs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

CREATE TRIGGER audit_tb_levy_slab_details
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_levy_slab_details
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();