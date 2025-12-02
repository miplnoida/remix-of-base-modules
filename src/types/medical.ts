export type DoctorApplicationStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Manual-Entered'
  | 'Under-Review'
  | 'More-Info-Requested'
  | 'Approved'
  | 'Rejected';

export type DoctorApplicationType = 'Online' | 'Manual';

export type DoctorStatus = 'Active' | 'Suspended' | 'Deactivated';

export interface DoctorBenefitPermissions {
  canStartSicknessClaims: boolean;
  canStartInjuryClaims: boolean;
  canStartMaternityClaims: boolean;
}

export interface PracticeLocation {
  id: string;
  facilityName: string;
  address: string;
  island: 'St Kitts' | 'Nevis' | 'Both';
  phone: string;
  isPrimary: boolean;
}

export interface DoctorApplication {
  id: string;
  referenceNumber: string;
  status: DoctorApplicationStatus;
  applicationType: DoctorApplicationType;
  submittedDate: string;
  lastUpdated: string;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  
  // Personal Info
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  nationalId: string;
  email: string;
  phone: string;
  address: string;
  
  // Professional Info
  localRegistrationNumber: string;
  registrationAuthority: string;
  speciality: string;
  licenseExpiryDate: string;
  otherJurisdictions?: string;
  yearsOfExperience: number;
  
  // Practice Info
  practiceLocations: PracticeLocation[];
  
  // Benefit Permissions
  benefitPermissions: DoctorBenefitPermissions;
  
  // Documents
  documents: DoctorDocument[];
  
  // Internal Notes
  internalNotes: ApplicationNote[];
  
  // Rejection/More Info
  moreInfoReason?: string;
  rejectionReason?: string;
  rejectionMessage?: string;
}

export interface DoctorDocument {
  id: string;
  name: string;
  type: 'ID' | 'License' | 'Certificate' | 'Other';
  uploadedDate: string;
  fileUrl: string;
  fileSize: string;
}

export interface ApplicationNote {
  id: string;
  authorId: string;
  authorName: string;
  note: string;
  createdAt: string;
  action?: string;
}

export interface ApprovedDoctor {
  id: string;
  userId?: string;
  referenceNumber: string;
  
  // Personal Info
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Professional Info
  localRegistrationNumber: string;
  registrationAuthority: string;
  speciality: string;
  licenseExpiryDate: string;
  
  // Practice Info
  practiceLocations: PracticeLocation[];
  primaryIsland: 'St Kitts' | 'Nevis' | 'Both';
  
  // Status & Permissions
  status: DoctorStatus;
  benefitPermissions: DoctorBenefitPermissions;
  
  // Dates
  approvedDate: string;
  lastLoginDate?: string;
  accountActivated: boolean;
}

export interface MoreInfoRequest {
  reasons: string[];
  customMessage: string;
}

export const MORE_INFO_REASONS = [
  'ID document unclear or expired',
  'Medical license not provided',
  'License expiry date missing',
  'Practice address incomplete',
  'Professional registration number invalid',
  'Missing specialty certification',
  'Additional documentation required',
  'Contact information incomplete',
];

export const REJECTION_REASONS = [
  'Invalid or expired medical license',
  'Failed verification checks',
  'Incomplete documentation after multiple requests',
  'Not registered with recognized authority',
  'Outside service area',
  'Duplicate application',
  'Other',
];
