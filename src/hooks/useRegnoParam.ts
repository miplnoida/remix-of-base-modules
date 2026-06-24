import { useSearchParams } from "react-router-dom";

/**
 * Standard `?regno=<employer regno>` deep-link contract for the Compliance
 * restructure (Delivery 4). Returns the value (or `null`) plus helpers to set
 * or clear it without dropping other query-string params.
 *
 *   /compliance/cases?regno=663363  // pre-filters the list to that employer
 *   /compliance/notices?regno=663363
 *
 * Every Compliance list page should honor this param. Every per-employer link
 * should set it via `setRegno(regno)`.
 */
export function useRegnoParam(): {
  regno: string | null;
  setRegno: (regno: string | null) => void;
  clearRegno: () => void;
} {
  const [params, setParams] = useSearchParams();
  const regno = params.get("regno");

  const setRegno = (next: string | null) => {
    const updated = new URLSearchParams(params);
    if (next) updated.set("regno", next);
    else updated.delete("regno");
    setParams(updated, { replace: true });
  };

  return { regno, setRegno, clearRegno: () => setRegno(null) };
}

/** Build a URL preserving `?regno=` if provided. */
export function withRegno(path: string, regno?: string | null): string {
  if (!regno) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}regno=${encodeURIComponent(regno)}`;
}
