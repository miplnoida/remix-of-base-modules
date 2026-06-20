/**
 * Legal Reference Data — module-scoped view over the central
 * core_reference_group / core_reference_value tables, filtered to module_code='LEGAL'.
 * Path: /legal/config/reference-data
 */
import ReferenceDataAdmin from '@/pages/bn/config/ReferenceDataAdmin';

export default function LegalReferenceData() {
  return (
    <ReferenceDataAdmin
      moduleCode="LEGAL"
      defaultNewModule="LEGAL"
      title="Legal Reference Data"
      description="Manage Legal dropdown values (case types, stages, hearing outcomes, notice types, party roles, etc.). Stored centrally in the reference framework with module_code = LEGAL."
    />
  );
}
