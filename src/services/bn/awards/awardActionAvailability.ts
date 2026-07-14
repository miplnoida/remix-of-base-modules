/**
 * Action availability resolver for Award 360.
 * Never returns enabled:true unless an accepted server command exists.
 * BN-AWARD360-V2.
 */
import type { AwardActionAvailability } from '@/pages/bn/awards/award-360/viewModels';

export type AwardActionKey =
  | 'VERIFY_LIFE_CERTIFICATE'
  | 'RECORD_LC_RECEIPT'
  | 'PROPOSE_SUSPENSION'
  | 'APPROVE_SUSPENSION'
  | 'SCHEDULE_MEDICAL_REVIEW'
  | 'RECORD_MEDICAL_OUTCOME'
  | 'AMEND_BENEFICIARY'
  | 'CANCEL_PAYMENT'
  | 'REISSUE_PAYMENT'
  | 'CONFIGURE_RECOVERY_PLAN'
  | 'SEND_AWARD_COMMUNICATION'
  | 'RETRY_COMMUNICATION';

const NOT_ENABLED = 'Server-authorized command is not enabled for this action; use the specialist workspace';

const ROUTES: Record<AwardActionKey, string> = {
  VERIFY_LIFE_CERTIFICATE: '/bn/servicing/life-certificates',
  RECORD_LC_RECEIPT: '/bn/servicing/life-certificates',
  PROPOSE_SUSPENSION: '/bn/award-suspension',
  APPROVE_SUSPENSION: '/bn/award-suspension',
  SCHEDULE_MEDICAL_REVIEW: '/bn/servicing/medical-reviews',
  RECORD_MEDICAL_OUTCOME: '/bn/servicing/medical-reviews',
  AMEND_BENEFICIARY: '/bn/awards',
  CANCEL_PAYMENT: '/bn/payments',
  REISSUE_PAYMENT: '/bn/payments',
  CONFIGURE_RECOVERY_PLAN: '/bn/servicing/overpayments',
  SEND_AWARD_COMMUNICATION: '/communication-hub',
  RETRY_COMMUNICATION: '/communication-hub',
};

export function getAwardActionAvailability(
  action: AwardActionKey,
  _awardId?: string,
  _userId?: string,
): AwardActionAvailability {
  return {
    action,
    visible: true,
    enabled: false,
    reason: NOT_ENABLED,
    targetRoute: ROUTES[action],
  };
}

export function getAllAwardActions(
  awardId: string,
  userId?: string,
): Record<AwardActionKey, AwardActionAvailability> {
  const keys: AwardActionKey[] = [
    'VERIFY_LIFE_CERTIFICATE',
    'RECORD_LC_RECEIPT',
    'PROPOSE_SUSPENSION',
    'APPROVE_SUSPENSION',
    'SCHEDULE_MEDICAL_REVIEW',
    'RECORD_MEDICAL_OUTCOME',
    'AMEND_BENEFICIARY',
    'CANCEL_PAYMENT',
    'REISSUE_PAYMENT',
    'CONFIGURE_RECOVERY_PLAN',
    'SEND_AWARD_COMMUNICATION',
    'RETRY_COMMUNICATION',
  ];
  const out: any = {};
  for (const k of keys) out[k] = getAwardActionAvailability(k, awardId, userId);
  return out;
}
