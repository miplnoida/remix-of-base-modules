/**
 * Epic 7 – Organization Foundation React Query hooks.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './organizationService';
import type {
  Office, OrganizationFilters, DepartmentFormValues, DesignationFormValues,
  OrganizationProfileFormValues, OfficeLocationFormValues, CalendarHolidayFormValues,
} from './organizationTypes';

const K = {
  offices: (f?: OrganizationFilters) => ['org', 'offices', f ?? {}] as const,
  office: (code: string) => ['org', 'office', code] as const,
  departments: (f?: OrganizationFilters) => ['org', 'departments', f ?? {}] as const,
  department: (id: string) => ['org', 'department', id] as const,
  designations: (f?: OrganizationFilters) => ['org', 'designations', f ?? {}] as const,
  designation: (id: string) => ['org', 'designation', id] as const,
  profile: () => ['org', 'profile'] as const,
  locations: (f?: OrganizationFilters) => ['org', 'locations', f ?? {}] as const,
  holidays: (f?: OrganizationFilters) => ['org', 'holidays', f ?? {}] as const,
};

// ---- Offices ----
export function useOffices(filters?: OrganizationFilters) {
  return useQuery({ queryKey: K.offices(filters), queryFn: () => svc.getOffices(filters) });
}
export function useOffice(code: string | undefined) {
  return useQuery({
    queryKey: K.office(code ?? ''),
    queryFn: () => svc.getOffice(code!),
    enabled: !!code,
  });
}
export function useCreateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Office) => svc.createOffice(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'offices'] }),
  });
}
export function useUpdateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, patch }: { code: string; patch: Partial<Office> }) =>
      svc.updateOffice(code, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org'] }),
  });
}
export function useDeactivateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => svc.deactivateOffice(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'offices'] }),
  });
}
export function useReactivateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => svc.reactivateOffice(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'offices'] }),
  });
}

// ---- Departments ----
export function useDepartments(filters?: OrganizationFilters) {
  return useQuery({ queryKey: K.departments(filters), queryFn: () => svc.getDepartments(filters) });
}
export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: K.department(id ?? ''),
    queryFn: () => svc.getDepartment(id!),
    enabled: !!id,
  });
}
export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: DepartmentFormValues) => svc.createDepartment(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'departments'] }),
  });
}
export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DepartmentFormValues> }) =>
      svc.updateDepartment(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'departments'] }),
  });
}
export function useDeactivateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateDepartment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'departments'] }),
  });
}
export function useReactivateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.reactivateDepartment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'departments'] }),
  });
}

// ---- Designations ----
export function useDesignations(filters?: OrganizationFilters) {
  return useQuery({ queryKey: K.designations(filters), queryFn: () => svc.getDesignations(filters) });
}
export function useDesignation(id: string | undefined) {
  return useQuery({
    queryKey: K.designation(id ?? ''),
    queryFn: () => svc.getDesignation(id!),
    enabled: !!id,
  });
}
export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: DesignationFormValues) => svc.createDesignation(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'designations'] }),
  });
}
export function useUpdateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DesignationFormValues> }) =>
      svc.updateDesignation(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'designations'] }),
  });
}
export function useDeactivateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateDesignation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'designations'] }),
  });
}
export function useReactivateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.reactivateDesignation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'designations'] }),
  });
}

// ---- Organization Profile ----
export function useOrganizationProfile() {
  return useQuery({ queryKey: K.profile(), queryFn: () => svc.getOrganizationProfile() });
}
export function useCreateOrUpdateOrganizationProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: OrganizationProfileFormValues) => svc.createOrUpdateOrganizationProfile(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.profile() }),
  });
}

// ---- Office Locations ----
export function useOfficeLocations(filters?: OrganizationFilters) {
  return useQuery({ queryKey: K.locations(filters), queryFn: () => svc.getOfficeLocations(filters) });
}
export function useCreateOfficeLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: OfficeLocationFormValues) => svc.createOfficeLocation(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'locations'] }),
  });
}
export function useUpdateOfficeLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<OfficeLocationFormValues> }) =>
      svc.updateOfficeLocation(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'locations'] }),
  });
}
export function useDeactivateOfficeLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateOfficeLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'locations'] }),
  });
}
export function useReactivateOfficeLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.reactivateOfficeLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'locations'] }),
  });
}

// ---- Calendar Holidays ----
export function useCalendarHolidays(filters?: OrganizationFilters) {
  return useQuery({ queryKey: K.holidays(filters), queryFn: () => svc.getCalendarHolidays(filters) });
}
export function useCreateCalendarHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CalendarHolidayFormValues) => svc.createCalendarHoliday(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'holidays'] }),
  });
}
export function useUpdateCalendarHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CalendarHolidayFormValues> }) =>
      svc.updateCalendarHoliday(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'holidays'] }),
  });
}
export function useDeactivateCalendarHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateCalendarHoliday(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'holidays'] }),
  });
}
export function useReactivateCalendarHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.reactivateCalendarHoliday(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org', 'holidays'] }),
  });
}
