/**
 * Epic 7 – Organization Foundation types.
 * Business-facing type names; all persistence details live in organizationService.
 */

export type LocationType =
  | 'OFFICE'
  | 'BRANCH'
  | 'SERVICE_CENTER'
  | 'INSPECTION_ZONE'
  | 'ARCHIVE'
  | 'OTHER';

export const LOCATION_TYPES: LocationType[] = [
  'OFFICE', 'BRANCH', 'SERVICE_CENTER', 'INSPECTION_ZONE', 'ARCHIVE', 'OTHER',
];

export type HolidayType =
  | 'PUBLIC' | 'BANK' | 'ORGANIZATION' | 'REGIONAL' | 'SPECIAL' | 'OTHER';

export const HOLIDAY_TYPES: HolidayType[] = [
  'PUBLIC', 'BANK', 'ORGANIZATION', 'REGIONAL', 'SPECIAL', 'OTHER',
];

export interface Office {
  officeCode: string;
  officeName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  email: string | null;
  phone: string | null;
  officeStartTime: string | null;
  officeEndTime: string | null;
  isActive: boolean;
}

export interface Department {
  departmentId: string;
  officeCode: string | null;
  departmentName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Designation {
  designationId: string;
  designationName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OrganizationProfile {
  id: string;
  organizationCode: string;
  organizationName: string;
  legalName: string | null;
  shortName: string | null;
  registrationNumber: string | null;
  taxIdentifier: string | null;
  mainPhone: string | null;
  mainEmail: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  logoUrl: string | null;
  brandingPrimaryColor: string | null;
  brandingSecondaryColor: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeLocation {
  id: string;
  officeCode: string;
  locationCode: string | null;
  locationName: string;
  locationType: LocationType;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarHoliday {
  id: string;
  holidayDate: string;
  holidayName: string;
  holidayType: HolidayType;
  officeCode: string | null;
  appliesNationally: boolean;
  affectsWorkflowDeadlines: boolean;
  affectsPaymentProcessing: boolean;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationFilters {
  search?: string;
  isActive?: boolean;
  officeCode?: string;
  locationType?: LocationType;
  holidayType?: HolidayType;
}

export type OfficeFormValues = Omit<Office, never>;
export type DepartmentFormValues = Omit<
  Department,
  'departmentId' | 'createdAt' | 'updatedAt'
>;
export type DesignationFormValues = Omit<
  Designation,
  'designationId' | 'createdAt' | 'updatedAt'
>;
export type OrganizationProfileFormValues = Omit<
  OrganizationProfile,
  'id' | 'createdAt' | 'updatedAt'
>;
export type OfficeLocationFormValues = Omit<
  OfficeLocation,
  'id' | 'createdAt' | 'updatedAt'
>;
export type CalendarHolidayFormValues = Omit<
  CalendarHoliday,
  'id' | 'createdAt' | 'updatedAt'
>;
