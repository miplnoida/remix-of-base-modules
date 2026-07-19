import { describe, it, expect } from 'vitest';
import {
  validateSubmitClaimantAppealInput,
  buildSubmitClaimantAppealEnvelope,
  type SubmitClaimantAppealInput,
} from '@/services/bn/gap/appeals/submitClaimantAppealService';

function baseInput(overrides: Partial<SubmitClaimantAppealInput> = {}): SubmitClaimantAppealInput {
  return {
    bnClaimId: '11111111-1111-1111-1111-111111111111',
    appealTypeCode: 'CLAIM_DENIED',
    reasonSummary: 'The evidence I submitted was not considered fully.',
    grounds: [{ groundCode: 'EVIDENCE_NOT_CONSIDERED', groundText: 'evidence not considered' }],
    actorUserCode: 'jsmith',
    idempotencyKey: '22222222-2222-2222-2222-222222222222',
    correlationId: '33333333-3333-3333-3333-333333333333',
    ...overrides,
  };
}

describe('submitClaimantAppealService — validation', () => {
  it('accepts a valid input', () => {
    const r = validateSubmitClaimantAppealInput(baseInput());
    expect(r.ok).toBe(true);
  });

  it('rejects missing claim id', () => {
    const r = validateSubmitClaimantAppealInput(baseInput({ bnClaimId: '' }));
    expect(r).toEqual({ ok: false, code: 'MISSING_CLAIM', message: expect.any(String) });
  });

  it('rejects invalid appeal type', () => {
    const r = validateSubmitClaimantAppealInput(baseInput({ appealTypeCode: 'NONSENSE' }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.code).toBe('INVALID_APPEAL_TYPE');
  });

  it('rejects short reason', () => {
    const r = validateSubmitClaimantAppealInput(baseInput({ reasonSummary: 'too short' }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.code).toBe('REASON_TOO_SHORT');
  });

  it('rejects SYSTEM as user code', () => {
    const r = validateSubmitClaimantAppealInput(baseInput({ actorUserCode: 'SYSTEM' }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.code).toBe('INVALID_USER_CODE');
  });

  it('rejects empty grounds', () => {
    const r = validateSubmitClaimantAppealInput(baseInput({ grounds: [] }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.code).toBe('MISSING_GROUNDS');
  });

  it('rejects unknown ground codes', () => {
    const r = validateSubmitClaimantAppealInput(
      baseInput({ grounds: [{ groundCode: 'MAGIC', groundText: 'x' }] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.code).toBe('UNKNOWN_GROUND');
  });
});

describe('submitClaimantAppealService — envelope shape', () => {
  it('produces a well-formed BN_APPEAL_SUBMIT_CLAIMANT envelope', () => {
    const env = buildSubmitClaimantAppealEnvelope(baseInput(), 'aaaa-user-id');
    expect(env.commandName).toBe('BN_APPEAL_SUBMIT_CLAIMANT');
    expect(env.commandVersion).toBe(1);
    expect(env.moduleCode).toBe('bn_appeals');
    expect(env.entityType).toBe('bn_appeal');
    expect(env.entityId).toBeNull();
    expect(env.actorUserId).toBe('aaaa-user-id');
    expect(env.actorRoles).toEqual([]); // never trusted
    expect(env.payload.bnClaimId).toBeDefined();
    expect(env.payload.grounds.length).toBe(1);
  });

  it('trims whitespace from user code and reason', () => {
    const env = buildSubmitClaimantAppealEnvelope(
      baseInput({ actorUserCode: '  jsmith  ', reasonSummary: '  a long enough reason string  ' }),
      'u',
    );
    expect(env.actorUserCode).toBe('jsmith');
    expect(env.payload.reasonSummary).toBe('a long enough reason string');
  });
});
