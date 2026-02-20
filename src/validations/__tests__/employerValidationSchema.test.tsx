// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  erMasterValidationSchema,
  erOwnerValidationSchema,
  erLocationValidationSchema,
  erNoteValidationSchema,
  erCommenceValidationSchema,
  erSuitValidationSchema,
  erVisitValidationSchema,
  erNotificationValidationSchema,
  erLastRegnoValidationSchema,
  validateERField,
  validateERMasterStep,
  ER_FIELD_LIMITS,
} from '../employerValidationSchema';

// ============================================================
// er_master field validation tests
// ============================================================
describe('er_master validation', () => {
  it('should reject name exceeding 40 chars', () => {
    const result = erMasterValidationSchema.shape.name.safeParse('A'.repeat(41));
    expect(result.success).toBe(false);
  });

  it('should accept name up to 40 chars', () => {
    const result = erMasterValidationSchema.shape.name.safeParse('A'.repeat(40));
    expect(result.success).toBe(true);
  });

  it('should require name (non-empty)', () => {
    const result = erMasterValidationSchema.shape.name.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject trade_name exceeding 40 chars', () => {
    const result = erMasterValidationSchema.shape.trade_name.safeParse('X'.repeat(41));
    expect(result.success).toBe(false);
  });

  it('should accept trade_name up to 40 chars', () => {
    const result = erMasterValidationSchema.shape.trade_name.safeParse('X'.repeat(40));
    expect(result.success).toBe(true);
  });

  it('should reject phone exceeding 10 chars', () => {
    const result = erMasterValidationSchema.shape.phone.safeParse('12345678901');
    expect(result.success).toBe(false);
  });

  it('should reject phone with non-digit chars', () => {
    const result = erMasterValidationSchema.shape.phone.safeParse('123-456');
    expect(result.success).toBe(false);
  });

  it('should accept valid phone', () => {
    const result = erMasterValidationSchema.shape.phone.safeParse('1234567890');
    expect(result.success).toBe(true);
  });

  it('should reject fax exceeding 10 chars', () => {
    const result = erMasterValidationSchema.shape.fax.safeParse('12345678901');
    expect(result.success).toBe(false);
  });

  it('should reject hq_addr1 exceeding 25 chars', () => {
    const result = erMasterValidationSchema.shape.hq_addr1.safeParse('A'.repeat(26));
    expect(result.success).toBe(false);
  });

  it('should accept hq_addr1 up to 25 chars', () => {
    const result = erMasterValidationSchema.shape.hq_addr1.safeParse('A'.repeat(25));
    expect(result.success).toBe(true);
  });

  it('should reject office_code exceeding 3 chars', () => {
    const result = erMasterValidationSchema.shape.office_code.safeParse('ABCD');
    expect(result.success).toBe(false);
  });

  it('should reject sector_code exceeding 1 char', () => {
    const result = erMasterValidationSchema.shape.sector_code.safeParse('AB');
    expect(result.success).toBe(false);
  });

  it('should accept sector_code of 1 char', () => {
    const result = erMasterValidationSchema.shape.sector_code.safeParse('O');
    expect(result.success).toBe(true);
  });

  it('should reject email exceeding 40 chars', () => {
    const longEmail = 'a'.repeat(30) + '@example.com'; // 42 chars
    const result = erMasterValidationSchema.shape.email.safeParse(longEmail);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = erMasterValidationSchema.shape.email.safeParse('not-an-email');
    expect(result.success).toBe(false);
  });

  it('should accept valid email', () => {
    const result = erMasterValidationSchema.shape.email.safeParse('test@example.com');
    expect(result.success).toBe(true);
  });

  it('should reject regno exceeding 6 chars', () => {
    const result = erMasterValidationSchema.shape.regno.safeParse('1234567');
    expect(result.success).toBe(false);
  });

  it('should reject mobile exceeding 10 chars', () => {
    const result = erMasterValidationSchema.shape.mobile.safeParse('12345678901');
    expect(result.success).toBe(false);
  });

  it('should reject parent_regno exceeding 6 chars', () => {
    const result = erMasterValidationSchema.shape.parent_regno.safeParse('1234567');
    expect(result.success).toBe(false);
  });

  it('should reject make_model exceeding 30 chars', () => {
    const result = erMasterValidationSchema.shape.make_model.safeParse('A'.repeat(31));
    expect(result.success).toBe(false);
  });

  it('should reject registry_num exceeding 30 chars', () => {
    const result = erMasterValidationSchema.shape.registry_num.safeParse('A'.repeat(31));
    expect(result.success).toBe(false);
  });

  it('should reject entered_by exceeding 5 chars', () => {
    const result = erMasterValidationSchema.shape.entered_by.safeParse('ABCDEF');
    expect(result.success).toBe(false);
  });

  it('should reject previous_owner exceeding 40 chars', () => {
    const result = erMasterValidationSchema.shape.previous_owner.safeParse('A'.repeat(41));
    expect(result.success).toBe(false);
  });

  it('should reject prev_owner_addr1 exceeding 25 chars', () => {
    const result = erMasterValidationSchema.shape.prev_owner_addr1.safeParse('A'.repeat(26));
    expect(result.success).toBe(false);
  });

  it('should accept industrial_code up to 4 chars', () => {
    const result = erMasterValidationSchema.shape.industrial_code.safeParse('0000');
    expect(result.success).toBe(true);
  });

  it('should reject industrial_code exceeding 4 chars', () => {
    const result = erMasterValidationSchema.shape.industrial_code.safeParse('00000');
    expect(result.success).toBe(false);
  });
});

// ============================================================
// er_owner field validation tests
// ============================================================
describe('er_owner validation', () => {
  it('should reject owner name exceeding 40 chars', () => {
    const result = erOwnerValidationSchema.shape.name.safeParse('A'.repeat(41));
    expect(result.success).toBe(false);
  });

  it('should accept owner name up to 40 chars', () => {
    const result = erOwnerValidationSchema.shape.name.safeParse('A'.repeat(40));
    expect(result.success).toBe(true);
  });

  it('should reject owner title exceeding 25 chars', () => {
    const result = erOwnerValidationSchema.shape.title.safeParse('A'.repeat(26));
    expect(result.success).toBe(false);
  });

  it('should reject owner phone exceeding 10 chars', () => {
    const result = erOwnerValidationSchema.shape.phone.safeParse('12345678901');
    expect(result.success).toBe(false);
  });

  it('should reject owner email exceeding 30 chars', () => {
    const longEmail = 'a'.repeat(20) + '@example.com'; // 32 chars
    const result = erOwnerValidationSchema.shape.email.safeParse(longEmail);
    expect(result.success).toBe(false);
  });

  it('should reject owner ssn exceeding 6 chars', () => {
    const result = erOwnerValidationSchema.shape.ssn.safeParse('1234567');
    expect(result.success).toBe(false);
  });

  it('should reject owner ssn with non-digits', () => {
    const result = erOwnerValidationSchema.shape.ssn.safeParse('12AB34');
    expect(result.success).toBe(false);
  });

  it('should accept valid owner ssn', () => {
    const result = erOwnerValidationSchema.shape.ssn.safeParse('123456');
    expect(result.success).toBe(true);
  });
});

// ============================================================
// er_locations field validation tests
// ============================================================
describe('er_locations validation', () => {
  it('should reject trade_name exceeding 40 chars', () => {
    const result = erLocationValidationSchema.shape.trade_name.safeParse('A'.repeat(41));
    expect(result.success).toBe(false);
  });

  it('should reject loc_addr1 exceeding 25 chars', () => {
    const result = erLocationValidationSchema.shape.loc_addr1.safeParse('A'.repeat(26));
    expect(result.success).toBe(false);
  });

  it('should reject loc_addr2 exceeding 25 chars', () => {
    const result = erLocationValidationSchema.shape.loc_addr2.safeParse('A'.repeat(26));
    expect(result.success).toBe(false);
  });

  it('should reject activity_type exceeding 50 chars', () => {
    const result = erLocationValidationSchema.shape.activity_type.safeParse('A'.repeat(51));
    expect(result.success).toBe(false);
  });
});

// ============================================================
// er_notes field validation tests
// ============================================================
describe('er_notes validation', () => {
  it('should reject note exceeding 100 chars', () => {
    const result = erNoteValidationSchema.shape.note.safeParse('A'.repeat(101));
    expect(result.success).toBe(false);
  });

  it('should accept note up to 100 chars', () => {
    const result = erNoteValidationSchema.shape.note.safeParse('A'.repeat(100));
    expect(result.success).toBe(true);
  });

  it('should reject user_id exceeding 5 chars', () => {
    const result = erNoteValidationSchema.shape.user_id.safeParse('ABCDEF');
    expect(result.success).toBe(false);
  });
});

// ============================================================
// er_commence field validation tests
// ============================================================
describe('er_commence validation', () => {
  it('should reject modified_by exceeding 30 chars', () => {
    const result = erCommenceValidationSchema.shape.modified_by.safeParse('A'.repeat(31));
    expect(result.success).toBe(false);
  });

  it('should accept modified_by up to 30 chars', () => {
    const result = erCommenceValidationSchema.shape.modified_by.safeParse('A'.repeat(30));
    expect(result.success).toBe(true);
  });
});

// ============================================================
// er_suit field validation tests
// ============================================================
describe('er_suit validation', () => {
  it('should reject suit_type exceeding 3 chars', () => {
    const result = erSuitValidationSchema.shape.suit_type.safeParse('ABCD');
    expect(result.success).toBe(false);
  });

  it('should reject suit_year exceeding 4 chars', () => {
    const result = erSuitValidationSchema.shape.suit_year.safeParse('20261');
    expect(result.success).toBe(false);
  });

  it('should reject suit_no exceeding 4 chars', () => {
    const result = erSuitValidationSchema.shape.suit_no.safeParse('12345');
    expect(result.success).toBe(false);
  });

  it('should reject suit_status exceeding 1 char', () => {
    const result = erSuitValidationSchema.shape.suit_status.safeParse('AB');
    expect(result.success).toBe(false);
  });

  it('should reject remarks exceeding 255 chars', () => {
    const result = erSuitValidationSchema.shape.remarks.safeParse('A'.repeat(256));
    expect(result.success).toBe(false);
  });

  it('should accept remarks up to 255 chars', () => {
    const result = erSuitValidationSchema.shape.remarks.safeParse('A'.repeat(255));
    expect(result.success).toBe(true);
  });

  it('should reject scheme_code exceeding 2 chars', () => {
    const result = erSuitValidationSchema.shape.scheme_code.safeParse('ABC');
    expect(result.success).toBe(false);
  });

  it('should reject outcome_code exceeding 3 chars', () => {
    const result = erSuitValidationSchema.shape.outcome_code.safeParse('ABCD');
    expect(result.success).toBe(false);
  });
});

// ============================================================
// er_visit field validation tests
// ============================================================
describe('er_visit validation', () => {
  it('should require date_of_visit', () => {
    const result = erVisitValidationSchema.shape.date_of_visit.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject work_code exceeding 1 char', () => {
    const result = erVisitValidationSchema.shape.work_code.safeParse('AB');
    expect(result.success).toBe(false);
  });

  it('should reject operation_code exceeding 3 chars', () => {
    const result = erVisitValidationSchema.shape.operation_code.safeParse('ABCD');
    expect(result.success).toBe(false);
  });

  it('should accept valid number_of_jobs', () => {
    const result = erVisitValidationSchema.shape.number_of_jobs.safeParse(5);
    expect(result.success).toBe(true);
  });
});

// ============================================================
// er_notification field validation tests
// ============================================================
describe('er_notification validation', () => {
  it('should reject status_code exceeding 3 chars', () => {
    const result = erNotificationValidationSchema.shape.status_code.safeParse('ABCD');
    expect(result.success).toBe(false);
  });

  it('should reject userid exceeding 30 chars', () => {
    const result = erNotificationValidationSchema.shape.userid.safeParse('A'.repeat(31));
    expect(result.success).toBe(false);
  });

  it('should reject Name exceeding 25 chars', () => {
    const result = erNotificationValidationSchema.shape.Name.safeParse('A'.repeat(26));
    expect(result.success).toBe(false);
  });

  it('should reject Comment exceeding 100 chars', () => {
    const result = erNotificationValidationSchema.shape.Comment.safeParse('A'.repeat(101));
    expect(result.success).toBe(false);
  });
});

// ============================================================
// er_last_regno field validation tests
// ============================================================
describe('er_last_regno validation', () => {
  it('should reject regno exceeding 6 chars', () => {
    const result = erLastRegnoValidationSchema.shape.regno.safeParse('1234567');
    expect(result.success).toBe(false);
  });

  it('should require regno', () => {
    const result = erLastRegnoValidationSchema.shape.regno.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should require date_issued', () => {
    const result = erLastRegnoValidationSchema.shape.date_issued.safeParse('');
    expect(result.success).toBe(false);
  });
});

// ============================================================
// validateERField helper tests
// ============================================================
describe('validateERField helper', () => {
  it('should return null for valid field', () => {
    expect(validateERField('er_master', 'name', 'Valid Name')).toBeNull();
  });

  it('should return error for invalid field', () => {
    expect(validateERField('er_master', 'name', '')).not.toBeNull();
  });

  it('should return null for unknown field', () => {
    expect(validateERField('er_master', 'nonexistent_field', 'value')).toBeNull();
  });
});

// ============================================================
// validateERMasterStep tests
// ============================================================
describe('validateERMasterStep', () => {
  const baseData = {
    name: 'Test Employer',
    email: 'test@test.com',
    hq_addr1: '123 Main St',
    maddr1: 'PO Box 123',
    phone: '1234567890',
    village_code: '001',
    activity_type: 'Retail',
    inspector_code: '001',
    application_date: '2026-01-01',
  };

  it('step 0 - should return errors for missing required fields', () => {
    const errors = validateERMasterStep(0, { name: '', email: '', hq_addr1: '', maddr1: '' });
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.hq_addr1).toBeDefined();
    expect(errors.maddr1).toBeDefined();
  });

  it('step 0 - should return no errors for valid data', () => {
    const errors = validateERMasterStep(0, baseData);
    expect(Object.keys(errors).length).toBe(0);
  });

  it('step 2 - should return errors for missing contact fields', () => {
    const errors = validateERMasterStep(2, { phone: '', village_code: '000', activity_type: '', inspector_code: 'UNK', application_date: '' });
    expect(errors.phone).toBeDefined();
    expect(errors.village_code).toBeDefined();
    expect(errors.activity_type).toBeDefined();
    expect(errors.inspector_code).toBeDefined();
    expect(errors.application_date).toBeDefined();
  });

  it('step 0 - should validate field length on name', () => {
    const errors = validateERMasterStep(0, { ...baseData, name: 'A'.repeat(41) });
    expect(errors.name).toBeDefined();
  });
});

// ============================================================
// ER_FIELD_LIMITS constant tests
// ============================================================
describe('ER_FIELD_LIMITS', () => {
  it('should have correct limits for er_master fields', () => {
    expect(ER_FIELD_LIMITS.name).toBe(40);
    expect(ER_FIELD_LIMITS.trade_name).toBe(40);
    expect(ER_FIELD_LIMITS.phone).toBe(10);
    expect(ER_FIELD_LIMITS.fax).toBe(10);
    expect(ER_FIELD_LIMITS.hq_addr1).toBe(25);
    expect(ER_FIELD_LIMITS.email).toBe(40);
    expect(ER_FIELD_LIMITS.regno).toBe(6);
    expect(ER_FIELD_LIMITS.mobile).toBe(10);
    expect(ER_FIELD_LIMITS.make_model).toBe(30);
    expect(ER_FIELD_LIMITS.registry_num).toBe(30);
    expect(ER_FIELD_LIMITS.previous_owner).toBe(40);
  });

  it('should have correct limits for er_owner fields', () => {
    expect(ER_FIELD_LIMITS.owner_name).toBe(40);
    expect(ER_FIELD_LIMITS.owner_title).toBe(25);
    expect(ER_FIELD_LIMITS.owner_phone).toBe(10);
    expect(ER_FIELD_LIMITS.owner_email).toBe(30);
    expect(ER_FIELD_LIMITS.owner_ssn).toBe(6);
  });

  it('should have correct limits for er_suit fields', () => {
    expect(ER_FIELD_LIMITS.suit_type).toBe(3);
    expect(ER_FIELD_LIMITS.suit_year).toBe(4);
    expect(ER_FIELD_LIMITS.remarks).toBe(255);
    expect(ER_FIELD_LIMITS.scheme_code).toBe(2);
  });
});
