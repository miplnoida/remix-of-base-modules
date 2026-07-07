import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './identityService';
import type {
  IdentityFilters,
  StaffAssignmentFormValues,
  StaffProfileFormValues,
  UserDelegationFormValues,
  UserProfileUpdatePayload,
  UserSecurityStateFormValues,
} from './identityTypes';

const K = {
  profiles: ['identity', 'profiles'] as const,
  profile: (id: string) => ['identity', 'profile', id] as const,
  staff: (id: string) => ['identity', 'staff', id] as const,
  assignments: (id: string) => ['identity', 'assignments', id] as const,
  security: (id: string) => ['identity', 'security', id] as const,
  delegations: (id: string) => ['identity', 'delegations', id] as const,
  delegationsFor: (id: string) => ['identity', 'delegations-for', id] as const,
  roles: (id: string) => ['identity', 'roles', id] as const,
  availableRoles: ['identity', 'available-roles'] as const,
};

export function useCoreUserProfiles(filters: IdentityFilters = {}) {
  return useQuery({ queryKey: [...K.profiles, filters], queryFn: () => svc.getUserProfiles(filters) });
}
export function useCoreUserProfile(userId?: string) {
  return useQuery({
    queryKey: userId ? K.profile(userId) : ['identity', 'profile', 'none'],
    queryFn: () => (userId ? svc.getUserProfile(userId) : Promise.resolve(null)),
    enabled: !!userId,
  });
}
export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UserProfileUpdatePayload }) =>
      svc.updateUserProfile(userId, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: K.profiles });
      qc.invalidateQueries({ queryKey: K.profile(v.userId) });
    },
  });
}

export function useStaffProfile(userId?: string) {
  return useQuery({
    queryKey: userId ? K.staff(userId) : ['identity', 'staff', 'none'],
    queryFn: () => (userId ? svc.getStaffProfileByUserId(userId) : Promise.resolve(null)),
    enabled: !!userId,
  });
}
export function useCreateStaffProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StaffProfileFormValues) => svc.createStaffProfile(payload),
    onSuccess: (d) => qc.invalidateQueries({ queryKey: K.staff(d.user_id) }),
  });
}
export function useUpdateStaffProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StaffProfileFormValues> }) =>
      svc.updateStaffProfile(id, payload),
    onSuccess: (d) => qc.invalidateQueries({ queryKey: K.staff(d.user_id) }),
  });
}

export function useStaffAssignments(userId?: string) {
  return useQuery({
    queryKey: userId ? K.assignments(userId) : ['identity', 'assignments', 'none'],
    queryFn: () => (userId ? svc.getStaffAssignments(userId) : Promise.resolve([])),
    enabled: !!userId,
  });
}
export function useCreateStaffAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StaffAssignmentFormValues) => svc.createStaffAssignment(payload),
    onSuccess: (d) => qc.invalidateQueries({ queryKey: K.assignments(d.user_id) }),
  });
}
export function useUpdateStaffAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StaffAssignmentFormValues> }) =>
      svc.updateStaffAssignment(id, payload),
    onSuccess: (d) => qc.invalidateQueries({ queryKey: K.assignments(d.user_id) }),
  });
}
export function useDeactivateStaffAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateStaffAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identity', 'assignments'] }),
  });
}
export function useReactivateStaffAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.reactivateStaffAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identity', 'assignments'] }),
  });
}
export function useSetPrimaryAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.setPrimaryAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identity', 'assignments'] }),
  });
}

export function useUserSecurityState(userId?: string) {
  return useQuery({
    queryKey: userId ? K.security(userId) : ['identity', 'security', 'none'],
    queryFn: () => (userId ? svc.getUserSecurityState(userId) : Promise.resolve(null)),
    enabled: !!userId,
  });
}
export function useUpdateUserSecurityState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UserSecurityStateFormValues }) =>
      svc.createOrUpdateUserSecurityState(userId, payload),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.security(v.userId) }),
  });
}
export function useLockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason, lockedUntil }: { userId: string; reason: string; lockedUntil?: string }) =>
      svc.lockUser(userId, reason, lockedUntil),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.security(v.userId) }),
  });
}
export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => svc.unlockUser(userId),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: K.security(id) }),
  });
}
export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => svc.suspendUser(userId, reason),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.security(v.userId) }),
  });
}
export function useDisableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => svc.disableUser(userId, reason),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: K.security(v.userId) });
      qc.invalidateQueries({ queryKey: K.profiles });
    },
  });
}
export function useEnableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => svc.enableUser(userId),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: K.security(id) });
      qc.invalidateQueries({ queryKey: K.profiles });
    },
  });
}
export function useRequirePasswordReset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      svc.requirePasswordReset(userId, reason),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.security(v.userId) }),
  });
}

export function useUserDelegations(userId?: string) {
  return useQuery({
    queryKey: userId ? K.delegations(userId) : ['identity', 'delegations', 'none'],
    queryFn: () => (userId ? svc.getUserDelegations(userId) : Promise.resolve([])),
    enabled: !!userId,
  });
}
export function useDelegationsForDelegate(userId?: string) {
  return useQuery({
    queryKey: userId ? K.delegationsFor(userId) : ['identity', 'delegations-for', 'none'],
    queryFn: () => (userId ? svc.getDelegationsForDelegate(userId) : Promise.resolve([])),
    enabled: !!userId,
  });
}
export function useCreateUserDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserDelegationFormValues) => svc.createUserDelegation(payload),
    onSuccess: (d) => qc.invalidateQueries({ queryKey: K.delegations(d.delegator_user_id) }),
  });
}
export function useUpdateUserDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UserDelegationFormValues> }) =>
      svc.updateUserDelegation(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identity', 'delegations'] }),
  });
}
export function useRevokeUserDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => svc.revokeUserDelegation(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identity', 'delegations'] }),
  });
}

export function useIdentityUserRoles(userId?: string) {
  return useQuery({
    queryKey: userId ? K.roles(userId) : ['identity', 'roles', 'none'],
    queryFn: () => (userId ? svc.getUserRoles(userId) : Promise.resolve([])),
    enabled: !!userId,
  });
}
export function useAssignIdentityRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => svc.assignUserRole(userId, role),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.roles(v.userId) }),
  });
}
export function useRemoveIdentityRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => svc.removeUserRole(userId, role),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.roles(v.userId) }),
  });
}
export function useAvailableRoles() {
  return useQuery({ queryKey: K.availableRoles, queryFn: () => svc.getAvailableRoles() });
}
