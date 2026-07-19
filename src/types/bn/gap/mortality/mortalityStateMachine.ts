/**
 * BN Mortality — Canonical state machine.
 *
 * Death & mortality workflow states track a death notification from receipt
 * through verification, downstream award closure, survivor / funeral / estate
 * referrals. States are enforced server-side by command handlers.
 */

export type BnMortalityStatus =
  | 'REPORTED'                // Death notification received (any channel)
  | 'PENDING_VERIFICATION'    // Awaiting authoritative source confirmation
  | 'VERIFIED'                // Confirmed by authoritative source (registrar / IP)
  | 'DISPUTED'                // Family or claimant disputed the notification
  | 'REJECTED'                // Notification rejected as inaccurate
  | 'AWARDS_HELD'             // All affected awards placed on payment hold
  | 'AWARDS_TERMINATED'       // Affected awards terminated with effective date
  | 'SURVIVOR_ASSESSMENT'     // Survivor benefit opportunity assessment open
  | 'FUNERAL_OPPORTUNITY'     // Funeral benefit opportunity notified
  | 'ESTATE_REFERRAL'         // Estate / legal referral raised
  | 'CLOSED';                 // Terminal

export type BnMortalitySource =
  | 'REGISTRAR_FEED'          // Civil registry authoritative feed
  | 'IP_MODULE'               // Insured Person master flagged deceased
  | 'FAMILY_NOTIFICATION'     // Family / next-of-kin submission
  | 'HOSPITAL_NOTICE'
  | 'STAFF_ENTRY'
  | 'OTHER';

export type BnMortalityEventCode =
  | 'REPORTED'
  | 'VERIFICATION_REQUESTED'
  | 'VERIFIED'
  | 'DISPUTED'
  | 'REJECTED'
  | 'AWARDS_HELD'
  | 'AWARDS_TERMINATED'
  | 'PAYMENT_AFTER_DEATH_OVERPAYMENT_RAISED'
  | 'SURVIVOR_ASSESSMENT_OPENED'
  | 'FUNERAL_OPPORTUNITY_OPENED'
  | 'ESTATE_REFERRAL_RAISED'
  | 'CLOSED';

export const BN_MORTALITY_TRANSITIONS: Readonly<
  Record<BnMortalityStatus, readonly BnMortalityStatus[]>
> = {
  REPORTED: ['PENDING_VERIFICATION', 'REJECTED'],
  PENDING_VERIFICATION: ['VERIFIED', 'DISPUTED', 'REJECTED'],
  DISPUTED: ['PENDING_VERIFICATION', 'REJECTED', 'CLOSED'],
  VERIFIED: ['AWARDS_HELD', 'CLOSED'],
  AWARDS_HELD: ['AWARDS_TERMINATED'],
  AWARDS_TERMINATED: ['SURVIVOR_ASSESSMENT', 'FUNERAL_OPPORTUNITY', 'ESTATE_REFERRAL', 'CLOSED'],
  SURVIVOR_ASSESSMENT: ['FUNERAL_OPPORTUNITY', 'ESTATE_REFERRAL', 'CLOSED'],
  FUNERAL_OPPORTUNITY: ['ESTATE_REFERRAL', 'CLOSED'],
  ESTATE_REFERRAL: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

export function canTransition(from: BnMortalityStatus, to: BnMortalityStatus): boolean {
  return BN_MORTALITY_TRANSITIONS[from]?.includes(to) ?? false;
}

export const BN_MORTALITY_TERMINAL_STATES: readonly BnMortalityStatus[] = ['CLOSED'];
export function isTerminal(status: BnMortalityStatus): boolean {
  return BN_MORTALITY_TERMINAL_STATES.includes(status);
}
