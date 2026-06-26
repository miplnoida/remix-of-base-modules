import { useLegalCapability } from "./useLegalCapability";

/**
 * Convenience hook for forms and dialogs in the Legal module.
 * `disabled` is true when the current user is LEGAL_READ_ONLY.
 */
export function useLegalReadOnly() {
  const { capability, isLoading } = useLegalCapability();
  return {
    isReadOnly: capability.isReadOnly,
    disabled: capability.isReadOnly,
    isLoading,
  };
}
