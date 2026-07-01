import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAutoCode } from "@/hooks/useAutoCode";

interface Props {
  entityKey: string;
  departmentCode?: string | null;
  /** If provided (edit mode) shows the existing code as read-only instead of preview. */
  existingCode?: string | null;
  label?: string;
  countryCode?: string;
}

/**
 * Drop-in field for any create dialog whose entity is registered in
 * `AUTO_CODE_REGISTRY`. Displays a live preview via the central numbering
 * engine and never lets the user type a code. The final value is assigned
 * server-side inside the save mutation using `generateAutoCode`.
 *
 * Admin override (manual entry) is intentionally NOT exposed here — enable
 * it only in a dedicated admin surface behind a feature flag.
 */
export function AutoCodeField({
  entityKey,
  departmentCode,
  existingCode,
  label = "Code",
  countryCode,
}: Props) {
  const { preview, loading } = useAutoCode({
    entityKey,
    departmentCode,
    countryCode,
    enabled: !existingCode,
  });

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {existingCode ? (
        <Input value={existingCode} disabled readOnly />
      ) : (
        <div className="h-9 px-3 rounded-md border bg-muted/40 flex items-center text-xs font-mono text-muted-foreground">
          {loading ? "Reserving preview…" : preview ? `Will be assigned: ${preview}` : "Auto-assigned on save"}
        </div>
      )}
    </div>
  );
}
