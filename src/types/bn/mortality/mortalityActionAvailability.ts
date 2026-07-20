/**
 * BN Mortality — Action-availability DTO row.
 * Returned by BN_MORTALITY_GET_ACTION_AVAILABILITY.
 *
 * BN-MORT-UI-1D §C: extended with maker step/source/occurredAt so the
 * UI can render "Approved by Alice at 10:14" without extra round-trips.
 */
export interface MortalityActionAvailabilityDto {
  readonly command: string;
  readonly displayName: string;
  readonly available: boolean;
  readonly implemented: boolean;
  readonly requiredCapability: string;
  readonly validFromStatuses: readonly string[];
  readonly reasons: readonly string[];
  readonly requiresMakerChecker: boolean;
  readonly makerUserId: string | null;
  readonly makerRole: string | null;
  /** Human-friendly label of the maker step ("submit-impact", "confirm-verification", …). */
  readonly makerStep: string | null;
  /** Canonical maker source command (e.g. "BN_MORTALITY_SUBMIT_IMPACT"). */
  readonly makerSourceCommand: string | null;
  /** ISO timestamp of the maker's action (from bn_mortality_event_history). */
  readonly makerOccurredAt: string | null;
  readonly integrationReady: boolean;
  readonly dataReady: boolean;
}

export interface MortalityActionAvailabilityResponse {
  readonly eventId: string | null;
  readonly currentUserId: string | null;
  readonly actionsEnabled: boolean;
  readonly rows: readonly MortalityActionAvailabilityDto[];
}
