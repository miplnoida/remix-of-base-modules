/**
 * BN Mortality — Action-availability DTO row.
 * Returned by BN_MORTALITY_GET_ACTION_AVAILABILITY.
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
  readonly integrationReady: boolean;
  readonly dataReady: boolean;
}

export interface MortalityActionAvailabilityResponse {
  readonly eventId: string | null;
  readonly currentUserId: string | null;
  readonly actionsEnabled: boolean;
  readonly rows: readonly MortalityActionAvailabilityDto[];
}
