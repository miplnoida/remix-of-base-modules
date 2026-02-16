/**
 * Types for External API Application data
 * Matches the actual API response structure
 */

// Raw API response types for list endpoint
export interface ExternalApplicationListItem {
  id: string;
  referenceNumber: string;
  registrationNumber: string | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phoneMobile: string;
  phoneMobileCountry: string;
  phoneMobileDialCode: string;
  dateOfBirth?: string;
  status: string;
  createdAt: string;
  submittedAt: string;
  updatedAt: string;
}

// Raw API response types for detail endpoint
export interface ExternalApplicationDetail {
  id: string;
  referenceNumber: string;
  registrationNumber: string | null;
  status: string;
  createdAt: string;
  submittedAt: string;
  updatedAt: string;
  expiryDate: string;
  
  // Personal Information
  title: string | null;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string | null;
  maidenName: string;
  alias: string;
  gender: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  maritalStatus: string;
  dateMarried: string | null;
  
  // Physical Characteristics
  heightFeet: number | null;
  heightInches: number | null;
  eyeColor: string | null;
  photoUrl: string | null;
  
  // Contact Information
  email: string;
  phoneMobile: string;
  phoneMobileCountry: string | null;
  phoneMobileDialCode: string;
  phoneHome: string;
  phoneHomeCountry: string | null;
  phoneHomeDialCode: string;
  phoneWork: string | null;
  phoneWorkCountry: string | null;
  phoneWorkDialCode: string;
  fax: string | null;
  faxCountry: string | null;
  faxDialCode: string;
  
  // Residential Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  parish: string;
  postalDistrict: string;
  country: string;
  
  // Mailing Address
  mailingAddr1: string;
  mailingAddr2: string;
  
  // Residency
  placeOfResidency: string;
  residencyDate: string | null;
  
  // Emergency Contact
  contactName: string;
  contactRelation: string;
  contactAddress: string;
  contactAddress1: string;
  contactPhone: string;
  contactPhoneCountry: string | null;
  contactPhoneDialCode: string;
  contactMobile: string;
  contactMobileCountry: string | null;
  contactMobileDialCode: string;
  contactEmail: string;
  
  // Parent Information
  fatherName: string;
  fatherFirstName?: string;
  fatherLastName?: string;
  fatherSSN: string | null;
  fatherDOB: string | null;
  motherName: string;
  motherFirstName?: string;
  motherLastName?: string;
  motherMaidenName: string | null;
  motherSSN: string | null;
  motherDOB: string | null;
  
  // Spouse Information
  spouseName: string;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseSSN: string | null;
  spouseDOB: string | null;
  spouseDateOfBirth?: string | null;
  
  // Beneficiary
  beneficiaryName: string;
  beneficiaryAddress: string;
  beneficiaryAddress1: string;
  
  // Witness
  witnessName: string | null;
  witnessDate: string | null;
  
  // Employment
  isSelfEmployed: boolean;
  hasWorkPermit: boolean;
  workPermitExpiry: string | null;
  occupation: string;
  employerName: string;
  employerAddress: string;
  employerTown: string;
  employerPhone: string;
  employerPhoneCountry: string | null;
  employerPhoneDialCode: string;
  employerEmail: string | null;
  employmentStartDate: string | null;
  
  // Remarks
  remarks: string | null;
  
  // Dependants
  dependants: ExternalDependant[];
  
  // Documents
  documents?: ExternalDocument[];
  
  // Notes
  notes: ExternalNote[];
}

export interface ExternalDependant {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  relationship: string;
  address: string;
  livesAtSameAddress: boolean;
  isInSchool: boolean;
  schoolName: string | null;
}

export interface ExternalDocument {
  id?: string;
  name: string;
  type?: string;
  url?: string;
  fileSize?: string;
  uploadedAt?: string;
}

export interface ExternalNote {
  id?: string;
  note: string;
  createdAt: string;
  createdBy?: string;
}

// Mapped types for UI display (consistent with internal naming)
export interface ApplicationListItem {
  applicationId: string;
  referenceNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  phoneFormatted: string;
  dateOfBirth?: string;
  registrationDate?: string;
  status: string;
  statusDisplay: string;
  submittedAt: string;
  createdAt: string;
}

/**
 * Map external API list response to internal format
 */
export function mapListItemFromApi(item: ExternalApplicationListItem): ApplicationListItem {
  const fullName = [item.firstName, item.middleName, item.lastName]
    .filter(Boolean)
    .join(' ');
  
  const phoneFormatted = item.phoneMobileDialCode 
    ? `(${item.phoneMobileDialCode}) ${item.phoneMobile}`
    : item.phoneMobile;
  
  return {
    applicationId: item.id,
    referenceNumber: item.referenceNumber,
    firstName: item.firstName,
    middleName: item.middleName,
    lastName: item.lastName,
    fullName,
    email: item.email,
    phone: item.phoneMobile,
    phoneFormatted,
    dateOfBirth: item.dateOfBirth,
    registrationDate: item.submittedAt,
    status: item.status,
    statusDisplay: formatStatusDisplay(item.status),
    submittedAt: item.submittedAt,
    createdAt: item.createdAt,
  };
}

/**
 * Format status for display
 */
export function formatStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'in-office - in progress': 'Under Review',
    'In-Office - In Progress': 'Under Review',
  };
  
  return statusMap[status.toLowerCase()] || status;
}

/**
 * Get status variant for Badge component
 */
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const lowerStatus = status.toLowerCase();
  
  if (lowerStatus === 'approved') return 'default';
  if (lowerStatus === 'rejected') return 'destructive';
  if (lowerStatus === 'pending') return 'outline';
  return 'secondary';
}
