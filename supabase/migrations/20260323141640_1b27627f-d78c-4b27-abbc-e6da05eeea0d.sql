CREATE TRIGGER trg_audit_tb_self_emp_contrib_rate
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_self_emp_contrib_rate
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('SE Contribution Rates');