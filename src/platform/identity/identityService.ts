/**
 * Epic 6 — Identity service.
 *
 * Wraps the enterprise identity tables while keeping the existing
 * `profiles` and `user_roles` tables untouched. All writes go through
 * this service so audit + governance rules stay centralised.
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/services/systemLoggerService';
import type {
  CoreUserProfile,
  IdentityFilters,
  StaffAssignment,
  StaffAssignmentFormValues,
  StaffProfile,
  StaffProfileFormValues,
  UserDelegation,
  UserDelegationFormValues,
  UserProfileUpdatePayload,
  UserSecurityState,
  UserSecurityStateFormValues,
} from './identityTypes';

const db = supabase as any;

async function safeAudit(action: string, entityId: string | null, before: unknown, after: unknown) {
  try {
    await logAudit?.({
      action,
      entity_type: 'IDENTITY',
      entity_id: entityId ?? undefined,
      before,
      after,
    } as any);
  } catch {
    /* audit failures never block writes */
  }
}

/* -------------- Core user profile (compat over profiles) -------------- */

export async function getUserProfiles(filters: IdentityFilters = {}): Promise<CoreUserProfile[]> {
  let q = db.from('core_user_profiles_v').select('*').order('full_name');
  if (filters.office_code) q = q.eq('office_code', filters.office_code);
  if (filters.department_id) q = q.eq('department_id', filters.department_id);
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`full_name.ilike.${s},email.ilike.${s},employee_code.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CoreUserProfile[];
}

export async function getUserProfile(userId: string): Promise<CoreUserProfile | null> {
  const { data, error } = await db
    .from('core_user_profiles_v')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CoreUserProfile | null;
}

export async function updateUserProfile(
  userId: string,
  payload: UserProfileUpdatePayload,
): Promise<void> {
  const before = await getUserProfile(userId);
  const { error } = await db.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
  await safeAudit('USER_PROFILE_UPDATED', userId, before, payload);
}

/* -------------- Staff profile -------------- */

export async function getStaffProfileByUserId(userId: string): Promise<StaffProfile | null> {
  const { data, error } = await db
    .from('core_staff_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as StaffProfile | null;
}

export async function createStaffProfile(payload: StaffProfileFormValues): Promise<StaffProfile> {
  const { data, error } = await db.from('core_staff_profiles').insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('STAFF_PROFILE_CREATED', data.id, null, data);
  return data as StaffProfile;
}

export async function updateStaffProfile(
  id: string,
  payload: Partial<StaffProfileFormValues>,
): Promise<StaffProfile> {
  const { data: before } = await db.from('core_staff_profiles').select('*').eq('id', id).maybeSingle();
  const { data, error } = await db
    .from('core_staff_profiles').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('STAFF_PROFILE_UPDATED', id, before, data);
  return data as StaffProfile;
}

/* -------------- Staff assignments -------------- */

export async function getStaffAssignments(userId: string): Promise<StaffAssignment[]> {
  const { data, error } = await db
    .from('core_staff_assignments')
    .select('*')
    .eq('user_id', userId)
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StaffAssignment[];
}

export async function createStaffAssignment(
  payload: StaffAssignmentFormValues,
): Promise<StaffAssignment> {
  if (payload.is_primary) {
    // Enforce "only one active primary" at service layer as well.
    await db.from('core_staff_assignments')
      .update({ is_primary: false })
      .eq('user_id', payload.user_id)
      .eq('is_primary', true)
      .eq('is_active', true);
  }
  const { data, error } = await db
    .from('core_staff_assignments').insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('STAFF_ASSIGNMENT_CREATED', data.id, null, data);
  return data as StaffAssignment;
}

export async function updateStaffAssignment(
  id: string,
  payload: Partial<StaffAssignmentFormValues>,
): Promise<StaffAssignment> {
  const { data: before } = await db.from('core_staff_assignments').select('*').eq('id', id).maybeSingle();
  const { data, error } = await db
    .from('core_staff_assignments').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('STAFF_ASSIGNMENT_UPDATED', id, before, data);
  return data as StaffAssignment;
}

export async function deactivateStaffAssignment(id: string): Promise<void> {
  const { error } = await db
    .from('core_staff_assignments')
    .update({ is_active: false, assignment_status: 'ENDED' })
    .eq('id', id);
  if (error) throw error;
  await safeAudit('STAFF_ASSIGNMENT_DEACTIVATED', id, null, { is_active: false });
}

export async function reactivateStaffAssignment(id: string): Promise<void> {
  const { error } = await db
    .from('core_staff_assignments')
    .update({ is_active: true, assignment_status: 'ACTIVE' })
    .eq('id', id);
  if (error) throw error;
  await safeAudit('STAFF_ASSIGNMENT_REACTIVATED', id, null, { is_active: true });
}

export async function setPrimaryAssignment(id: string): Promise<void> {
  const { data: row, error: readErr } = await db
    .from('core_staff_assignments').select('user_id').eq('id', id).maybeSingle();
  if (readErr) throw readErr;
  if (!row) throw new Error('Assignment not found');
  await db.from('core_staff_assignments')
    .update({ is_primary: false })
    .eq('user_id', row.user_id)
    .eq('is_primary', true);
  const { error } = await db
    .from('core_staff_assignments')
    .update({ is_primary: true, assignment_status: 'ACTIVE', is_active: true })
    .eq('id', id);
  if (error) throw error;
  await safeAudit('STAFF_ASSIGNMENT_SET_PRIMARY', id, null, { is_primary: true });
}

/* -------------- Security state -------------- */

export async function getUserSecurityState(userId: string): Promise<UserSecurityState | null> {
  const { data, error } = await db
    .from('core_user_security_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as UserSecurityState | null;
}

export async function createOrUpdateUserSecurityState(
  userId: string,
  payload: UserSecurityStateFormValues,
): Promise<UserSecurityState> {
  const existing = await getUserSecurityState(userId);
  if (existing) {
    const { data, error } = await db
      .from('core_user_security_state').update(payload).eq('user_id', userId).select('*').single();
    if (error) throw error;
    await safeAudit('USER_SECURITY_STATE_UPDATED', userId, existing, data);
    return data as UserSecurityState;
  }
  const { data, error } = await db
    .from('core_user_security_state').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  await safeAudit('USER_SECURITY_STATE_UPDATED', userId, null, data);
  return data as UserSecurityState;
}

export async function lockUser(userId: string, reason: string, lockedUntil?: string): Promise<void> {
  await createOrUpdateUserSecurityState(userId, {
    account_status: 'LOCKED',
    is_locked: true,
    locked_at: new Date().toISOString(),
    locked_until: lockedUntil ?? null,
    locked_reason: reason,
  });
  await db.from('profiles').update({ locked_until: lockedUntil ?? new Date(Date.now() + 24 * 3600e3).toISOString() }).eq('id', userId);
  await safeAudit('USER_LOCKED', userId, null, { reason, lockedUntil });
}

export async function unlockUser(userId: string): Promise<void> {
  await createOrUpdateUserSecurityState(userId, {
    account_status: 'ACTIVE',
    is_locked: false,
    locked_at: null,
    locked_until: null,
    locked_reason: null,
    failed_login_count: 0,
  });
  await db.from('profiles').update({ locked_until: null, failed_login_attempts: 0 }).eq('id', userId);
  await safeAudit('USER_UNLOCKED', userId, null, {});
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  await createOrUpdateUserSecurityState(userId, {
    account_status: 'SUSPENDED',
    is_suspended: true,
    suspended_at: new Date().toISOString(),
    suspended_reason: reason,
  });
  await safeAudit('USER_SUSPENDED', userId, null, { reason });
}

export async function disableUser(userId: string, reason: string): Promise<void> {
  await createOrUpdateUserSecurityState(userId, {
    account_status: 'DISABLED',
    is_disabled: true,
    disabled_at: new Date().toISOString(),
    disabled_reason: reason,
  });
  await db.from('profiles').update({ is_active: false }).eq('id', userId);
  await safeAudit('USER_DISABLED', userId, null, { reason });
}

export async function enableUser(userId: string): Promise<void> {
  await createOrUpdateUserSecurityState(userId, {
    account_status: 'ACTIVE',
    is_disabled: false,
    disabled_at: null,
    disabled_reason: null,
    is_suspended: false,
    suspended_at: null,
    suspended_reason: null,
    is_locked: false,
  });
  await db.from('profiles').update({ is_active: true }).eq('id', userId);
  await safeAudit('USER_ENABLED', userId, null, {});
}

export async function requirePasswordReset(userId: string, reason: string): Promise<void> {
  await createOrUpdateUserSecurityState(userId, {
    account_status: 'PASSWORD_RESET_REQUIRED',
    password_reset_required: true,
    password_reset_reason: reason,
  });
  await db.from('profiles').update({ force_password_change: true }).eq('id', userId);
  await safeAudit('USER_PASSWORD_RESET_REQUIRED', userId, null, { reason });
}

/* -------------- Delegations -------------- */

export async function getUserDelegations(userId: string): Promise<UserDelegation[]> {
  const { data, error } = await db
    .from('core_user_delegations')
    .select('*')
    .eq('delegator_user_id', userId)
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserDelegation[];
}

export async function getDelegationsForDelegate(userId: string): Promise<UserDelegation[]> {
  const { data, error } = await db
    .from('core_user_delegations')
    .select('*')
    .eq('delegate_user_id', userId)
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserDelegation[];
}

export async function createUserDelegation(
  payload: UserDelegationFormValues,
): Promise<UserDelegation> {
  const { data, error } = await db
    .from('core_user_delegations').insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('USER_DELEGATION_CREATED', data.id, null, data);
  return data as UserDelegation;
}

export async function updateUserDelegation(
  id: string,
  payload: Partial<UserDelegationFormValues>,
): Promise<UserDelegation> {
  const { data: before } = await db.from('core_user_delegations').select('*').eq('id', id).maybeSingle();
  const { data, error } = await db
    .from('core_user_delegations').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('USER_DELEGATION_UPDATED', id, before, data);
  return data as UserDelegation;
}

export async function revokeUserDelegation(id: string, reason: string): Promise<void> {
  const { error } = await db.from('core_user_delegations').update({
    approval_status: 'REVOKED',
    is_active: false,
    notes: reason,
  }).eq('id', id);
  if (error) throw error;
  await safeAudit('USER_DELEGATION_REVOKED', id, null, { reason });
}

/* -------------- Roles (thin wrapper over user_roles) -------------- */

export async function getUserRoles(userId: string): Promise<string[]> {
  const { data, error } = await db
    .from('user_roles').select('role').eq('user_id', userId);
  if (error) throw error;
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

export async function assignUserRole(userId: string, role: string): Promise<void> {
  const { error } = await db.from('user_roles').insert({ user_id: userId, role });
  if (error && !`${error.message}`.includes('duplicate')) throw error;
  await safeAudit('USER_ROLE_ASSIGNED', userId, null, { role });
}

export async function removeUserRole(userId: string, role: string): Promise<void> {
  const { error } = await db.from('user_roles').delete().eq('user_id', userId).eq('role', role);
  if (error) throw error;
  await safeAudit('USER_ROLE_REMOVED', userId, null, { role });
}

/**
 * Load available roles from the database. Falls back to a small conservative
 * list only when no roles table exists yet. Prefer the `roles` table; if the
 * project has a validate_user_role trigger with an allow-list, admins can also
 * augment via the roles master.
 */
export async function getAvailableRoles(): Promise<string[]> {
  // Prefer the roles master table if present.
  const { data: rolesTbl, error: rolesErr } = await db
    .from('roles').select('name,is_active').eq('is_active', true).order('name');
  if (!rolesErr && Array.isArray(rolesTbl) && rolesTbl.length) {
    return rolesTbl.map((r: any) => r.name).filter(Boolean);
  }
  // Fallback: distinct roles already assigned in the system.
  const { data: assigned } = await db.from('user_roles').select('role');
  const set = new Set<string>();
  (assigned ?? []).forEach((r: any) => r?.role && set.add(r.role));
  return Array.from(set).sort();
}
