import CoreTemplateManagement from "@/components/templates/CoreTemplateManagement";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useLegalReadOnly } from "@/hooks/legal/useLegalReadOnly";

/**
 * Legal Template Management is a filtered view of the central Core Template
 * library (module_code = LEGAL). Legal does NOT own template content —
 * create/edit routes through the Core editor, and the "Assign Template to
 * Event" action is handled by /legal/admin/stage-template-mapping.
 *
 * See docs/legal/lg-template-cutover-comparison.md for the migration audit.
 */
export default function LegalTemplateManagement() {
  const { isReadOnly } = useLegalReadOnly();
  return (
    <div className="space-y-3">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Core is the source of truth.</strong> All Legal templates live in the
          centralized Core Template library. Use <em>Create</em>/<em>Edit</em> here to
          manage template content, and{" "}
          <a href="/legal/admin/stage-template-mapping" className="underline">
            Stage → Template Mapping
          </a>{" "}
          to control which template fires at which stage/event. Legacy
          <code className="mx-1">legal_templates</code> and legal rows in
          <code className="mx-1">notification_templates</code> have been deprecated.
        </AlertDescription>
      </Alert>
      <CoreTemplateManagement
        fixedModuleCode="LEGAL"
        title="Legal Template Management"
        description={
          isReadOnly
            ? "Read-only view — you have LEGAL_READ_ONLY access."
            : "Manage notices, letters, and PDFs used across the Legal module"
        }
      />
    </div>
  );
}
