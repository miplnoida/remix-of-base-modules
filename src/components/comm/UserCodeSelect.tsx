import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useProfilesDirectory } from "@/hooks/useProfilesDirectory";

interface Props {
  value: string | null | undefined;
  onChange: (userCode: string | null) => void;
  placeholder?: string;
}

/** Picks a user by user_code, showing the user's full name in the trigger. */
export function UserCodeSelect({ value, onChange, placeholder = "— Select user —" }: Props) {
  const { data = [], isLoading } = useProfilesDirectory();
  const options = useMemo(
    () =>
      data.map((p) => ({
        value: p.user_code,
        label: `${p.full_name ?? p.user_code} · ${p.user_code}`,
        searchText: `${p.user_code} ${p.full_name ?? ""} ${p.email ?? ""}`,
      })),
    [data],
  );
  return (
    <SearchableSelect
      options={options}
      value={value ?? ""}
      onValueChange={(v) => onChange(v || null)}
      placeholder={isLoading ? "Loading…" : placeholder}
      searchPlaceholder="Search by name or user code"
      emptyMessage="No users found"
    />
  );
}
