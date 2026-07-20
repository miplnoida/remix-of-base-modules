/**
 * BN Mortality — Domain DTOs.
 *
 * Shape returned to the browser from the secure query boundary.
 * Sensitive fields (source payload, external references, financial detail,
 * PII beyond display name) are stripped for non-admin callers.
 */

export interface BnMortalityEventSummaryDto {
  readonly id: string;
  readonly eventReference: string;
  readonly status: string;
  readonly deceasedFullName: string | null;
  readonly deathDate: string | null;
  readonly slaDueAt: string | null;
  readonly assignedTo: string | null;
}

export interface BnMortalityEventListItemDto {
  readonly id: string;
  readonly eventReference: string;
  readonly status: string;
  readonly source: string;
  readonly deceasedFullName: string | null;
  readonly deathDate: string | null;
  readonly reportedAt: string | null;
  readonly assignedTo: string | null;
  readonly slaDueAt: string | null;
  readonly rowVersion: number;
  readonly updatedAt: string | null;
}

export interface BnMortalityEventDetailDto {
  readonly id: string;
  readonly eventReference: string;
  readonly status: string;
  readonly source: string;
  readonly deceased: {
    readonly fullName: string | null;
    readonly dateOfBirth: string | null;
    readonly gender: string | null;
    readonly nationalIdMasked: string | null;
  };
  readonly death: {
    readonly date: string | null;
    readonly time: string | null;
    readonly place: string | null;
    readonly cause: string | null;
  };
  readonly matched: {
    readonly ipId: string | null;
    readonly confidence: string | null;
    readonly matchedAt: string | null;
  };
  readonly verification: {
    readonly source: string | null;
    readonly reference: string | null;
    readonly confidence: string | null;
    readonly verifiedAt: string | null;
  };
  readonly assignedTo: string | null;
  readonly slaDueAt: string | null;
  readonly rowVersion: number;
  readonly reportedAt: string | null;
  readonly submittedForVerificationAt: string | null;
  readonly confirmedAt: string | null;
  readonly completedAt: string | null;
  readonly closedAt: string | null;
  readonly reversedAt: string | null;
  readonly correlationId: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  // Masked for non-admin.
  readonly sourcePayload: unknown | null;
  readonly externalReferenceRaw: string | null;
  readonly diagnostics: unknown | null;
}

export interface BnMortalityPersonMatchDto {
  readonly ipId: string;
  readonly fullName: string;
  readonly nationalIdMasked: string | null;
  readonly dateOfBirth: string | null;
  readonly gender: string | null;
  readonly confidenceInternals: unknown | null;
}
