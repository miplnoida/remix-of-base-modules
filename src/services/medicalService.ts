import { 
  DoctorApplication, 
  ApprovedDoctor, 
  DoctorApplicationStatus,
  ApplicationNote,
  MoreInfoRequest
} from '@/types/medical';

// Mock Doctor Applications
const mockApplications: DoctorApplication[] = [
  {
    id: 'app-001',
    referenceNumber: 'DRR-2025-000001',
    status: 'Submitted',
    applicationType: 'Online',
    submittedDate: '2025-01-20T10:30:00Z',
    lastUpdated: '2025-01-20T10:30:00Z',
    title: 'Dr.',
    firstName: 'Michael',
    lastName: 'Thompson',
    dateOfBirth: '1975-03-15',
    nationality: 'Kittitian',
    nationalId: 'KN-1975-12345',
    email: 'dr.thompson@healthclinic.kn',
    phone: '+1-869-555-0101',
    address: '45 Main Street, Basseterre, St Kitts',
    localRegistrationNumber: 'MED-2020-1234',
    registrationAuthority: 'St Kitts Medical Board',
    speciality: 'General Practice',
    licenseExpiryDate: '2026-12-31',
    yearsOfExperience: 18,
    practiceLocations: [
      {
        id: 'loc-001',
        facilityName: 'Basseterre Health Clinic',
        address: '45 Main Street, Basseterre',
        island: 'St Kitts',
        phone: '+1-869-555-0102',
        isPrimary: true
      }
    ],
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: true,
      canStartMaternityClaims: false
    },
    documents: [
      { id: 'doc-001', name: 'National ID Card.pdf', type: 'ID', uploadedDate: '2025-01-20', fileUrl: '#', fileSize: '1.2 MB' },
      { id: 'doc-002', name: 'Medical License.pdf', type: 'License', uploadedDate: '2025-01-20', fileUrl: '#', fileSize: '2.5 MB' },
      { id: 'doc-003', name: 'Board Certification.pdf', type: 'Certificate', uploadedDate: '2025-01-20', fileUrl: '#', fileSize: '1.8 MB' }
    ],
    internalNotes: []
  },
  {
    id: 'app-002',
    referenceNumber: 'DRR-2025-000002',
    status: 'Under-Review',
    applicationType: 'Online',
    submittedDate: '2025-01-18T14:20:00Z',
    lastUpdated: '2025-01-21T09:15:00Z',
    assignedReviewerId: 'user-001',
    assignedReviewerName: 'Sarah Johnson',
    title: 'Dr.',
    firstName: 'Amanda',
    lastName: 'Richards',
    dateOfBirth: '1982-07-22',
    nationality: 'Nevisian',
    nationalId: 'NV-1982-67890',
    email: 'amanda.richards@nevismedical.com',
    phone: '+1-869-555-0201',
    address: '12 Charlestown Road, Charlestown, Nevis',
    localRegistrationNumber: 'MED-2018-5678',
    registrationAuthority: 'Nevis Medical Council',
    speciality: 'Obstetrics & Gynecology',
    licenseExpiryDate: '2025-06-30',
    yearsOfExperience: 12,
    practiceLocations: [
      {
        id: 'loc-002',
        facilityName: 'Nevis Women\'s Health Center',
        address: '12 Charlestown Road, Charlestown',
        island: 'Nevis',
        phone: '+1-869-555-0202',
        isPrimary: true
      }
    ],
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: false,
      canStartMaternityClaims: true
    },
    documents: [
      { id: 'doc-004', name: 'Passport.pdf', type: 'ID', uploadedDate: '2025-01-18', fileUrl: '#', fileSize: '1.5 MB' },
      { id: 'doc-005', name: 'Medical License 2024.pdf', type: 'License', uploadedDate: '2025-01-18', fileUrl: '#', fileSize: '2.1 MB' }
    ],
    internalNotes: [
      {
        id: 'note-001',
        authorId: 'user-001',
        authorName: 'Sarah Johnson',
        note: 'Application received and assigned for review. License expires in 6 months - will need renewal confirmation.',
        createdAt: '2025-01-21T09:15:00Z',
        action: 'Assigned for Review'
      }
    ]
  },
  {
    id: 'app-003',
    referenceNumber: 'DRR-2025-000003',
    status: 'More-Info-Requested',
    applicationType: 'Manual',
    submittedDate: '2025-01-15T11:00:00Z',
    lastUpdated: '2025-01-19T16:45:00Z',
    assignedReviewerId: 'user-002',
    assignedReviewerName: 'James Williams',
    title: 'Dr.',
    firstName: 'Robert',
    lastName: 'Chen',
    dateOfBirth: '1968-11-08',
    nationality: 'Kittitian',
    nationalId: 'KN-1968-11223',
    email: 'dr.chen@islandhealth.kn',
    phone: '+1-869-555-0301',
    address: '78 Sandy Point Road, Sandy Point, St Kitts',
    localRegistrationNumber: 'MED-2015-9012',
    registrationAuthority: 'St Kitts Medical Board',
    speciality: 'Internal Medicine',
    licenseExpiryDate: '2025-03-31',
    yearsOfExperience: 25,
    practiceLocations: [
      {
        id: 'loc-003',
        facilityName: 'Island Health Medical Center',
        address: '78 Sandy Point Road, Sandy Point',
        island: 'St Kitts',
        phone: '+1-869-555-0302',
        isPrimary: true
      }
    ],
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: true,
      canStartMaternityClaims: false
    },
    documents: [
      { id: 'doc-006', name: 'National ID.pdf', type: 'ID', uploadedDate: '2025-01-15', fileUrl: '#', fileSize: '1.1 MB' }
    ],
    internalNotes: [
      {
        id: 'note-002',
        authorId: 'user-002',
        authorName: 'James Williams',
        note: 'Manual application entered from paper form. Medical license document missing.',
        createdAt: '2025-01-15T11:30:00Z',
        action: 'Manual Entry'
      },
      {
        id: 'note-003',
        authorId: 'user-002',
        authorName: 'James Williams',
        note: 'Requested additional documentation: Medical license and board certification.',
        createdAt: '2025-01-19T16:45:00Z',
        action: 'More Info Requested'
      }
    ],
    moreInfoReason: 'Medical license not provided, Missing specialty certification'
  },
  {
    id: 'app-004',
    referenceNumber: 'DRR-2025-000004',
    status: 'Approved',
    applicationType: 'Online',
    submittedDate: '2025-01-10T09:00:00Z',
    lastUpdated: '2025-01-17T14:30:00Z',
    assignedReviewerId: 'user-001',
    assignedReviewerName: 'Sarah Johnson',
    title: 'Dr.',
    firstName: 'Patricia',
    lastName: 'Morgan',
    dateOfBirth: '1979-04-25',
    nationality: 'Kittitian',
    nationalId: 'KN-1979-44556',
    email: 'p.morgan@medicalgroup.kn',
    phone: '+1-869-555-0401',
    address: '22 Fort Street, Basseterre, St Kitts',
    localRegistrationNumber: 'MED-2012-3456',
    registrationAuthority: 'St Kitts Medical Board',
    speciality: 'Occupational Medicine',
    licenseExpiryDate: '2026-09-30',
    yearsOfExperience: 15,
    practiceLocations: [
      {
        id: 'loc-004',
        facilityName: 'Occupational Health Services',
        address: '22 Fort Street, Basseterre',
        island: 'St Kitts',
        phone: '+1-869-555-0402',
        isPrimary: true
      }
    ],
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: true,
      canStartMaternityClaims: false
    },
    documents: [
      { id: 'doc-007', name: 'ID Document.pdf', type: 'ID', uploadedDate: '2025-01-10', fileUrl: '#', fileSize: '1.3 MB' },
      { id: 'doc-008', name: 'Medical License.pdf', type: 'License', uploadedDate: '2025-01-10', fileUrl: '#', fileSize: '2.0 MB' },
      { id: 'doc-009', name: 'Occupational Medicine Cert.pdf', type: 'Certificate', uploadedDate: '2025-01-10', fileUrl: '#', fileSize: '1.6 MB' }
    ],
    internalNotes: [
      {
        id: 'note-004',
        authorId: 'user-001',
        authorName: 'Sarah Johnson',
        note: 'All documentation verified. License valid until Sept 2026. Approved for sickness and injury referrals.',
        createdAt: '2025-01-17T14:30:00Z',
        action: 'Approved'
      }
    ]
  },
  {
    id: 'app-005',
    referenceNumber: 'DRR-2025-000005',
    status: 'Rejected',
    applicationType: 'Online',
    submittedDate: '2025-01-08T15:45:00Z',
    lastUpdated: '2025-01-14T10:20:00Z',
    assignedReviewerId: 'user-002',
    assignedReviewerName: 'James Williams',
    title: 'Dr.',
    firstName: 'Kevin',
    lastName: 'Smith',
    dateOfBirth: '1985-09-12',
    nationality: 'Other',
    nationalId: 'US-1985-99887',
    email: 'k.smith@email.com',
    phone: '+1-869-555-0501',
    address: '100 Visitor Lane, Frigate Bay, St Kitts',
    localRegistrationNumber: 'TEMP-2024-001',
    registrationAuthority: 'Foreign',
    speciality: 'Family Medicine',
    licenseExpiryDate: '2024-12-31',
    yearsOfExperience: 8,
    practiceLocations: [
      {
        id: 'loc-005',
        facilityName: 'Temporary Clinic',
        address: '100 Visitor Lane, Frigate Bay',
        island: 'St Kitts',
        phone: '+1-869-555-0502',
        isPrimary: true
      }
    ],
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: false,
      canStartMaternityClaims: false
    },
    documents: [
      { id: 'doc-010', name: 'Passport.pdf', type: 'ID', uploadedDate: '2025-01-08', fileUrl: '#', fileSize: '1.4 MB' }
    ],
    internalNotes: [
      {
        id: 'note-005',
        authorId: 'user-002',
        authorName: 'James Williams',
        note: 'Application rejected: Medical license expired in Dec 2024. Not registered with local medical board.',
        createdAt: '2025-01-14T10:20:00Z',
        action: 'Rejected'
      }
    ],
    rejectionReason: 'Invalid or expired medical license',
    rejectionMessage: 'Your application has been declined because your medical license has expired. Please renew your license and register with the St Kitts or Nevis Medical Board before reapplying.'
  },
  {
    id: 'app-006',
    referenceNumber: 'DRR-2025-000006',
    status: 'Manual-Entered',
    applicationType: 'Manual',
    submittedDate: '2025-01-22T08:30:00Z',
    lastUpdated: '2025-01-22T08:30:00Z',
    title: 'Dr.',
    firstName: 'Elizabeth',
    lastName: 'Taylor',
    dateOfBirth: '1972-06-18',
    nationality: 'Nevisian',
    nationalId: 'NV-1972-33445',
    email: 'e.taylor@nevishealth.com',
    phone: '+1-869-555-0601',
    address: '55 Newcastle Road, Newcastle, Nevis',
    localRegistrationNumber: 'MED-2010-7890',
    registrationAuthority: 'Nevis Medical Council',
    speciality: 'Pediatrics',
    licenseExpiryDate: '2025-12-31',
    yearsOfExperience: 20,
    practiceLocations: [
      {
        id: 'loc-006',
        facilityName: 'Newcastle Pediatric Clinic',
        address: '55 Newcastle Road, Newcastle',
        island: 'Nevis',
        phone: '+1-869-555-0602',
        isPrimary: true
      }
    ],
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: false,
      canStartMaternityClaims: false
    },
    documents: [
      { id: 'doc-011', name: 'National ID.pdf', type: 'ID', uploadedDate: '2025-01-22', fileUrl: '#', fileSize: '1.2 MB' },
      { id: 'doc-012', name: 'Medical License.pdf', type: 'License', uploadedDate: '2025-01-22', fileUrl: '#', fileSize: '2.3 MB' }
    ],
    internalNotes: [
      {
        id: 'note-006',
        authorId: 'user-003',
        authorName: 'Mary Brown',
        note: 'Paper application received and entered. Awaiting assignment for review.',
        createdAt: '2025-01-22T08:30:00Z',
        action: 'Manual Entry'
      }
    ]
  }
];

// Mock Approved Doctors (Registry)
const mockApprovedDoctors: ApprovedDoctor[] = [
  {
    id: 'doc-reg-001',
    userId: 'user-doc-001',
    referenceNumber: 'DRR-2024-000098',
    title: 'Dr.',
    firstName: 'Patricia',
    lastName: 'Morgan',
    email: 'p.morgan@medicalgroup.kn',
    phone: '+1-869-555-0401',
    localRegistrationNumber: 'MED-2012-3456',
    registrationAuthority: 'St Kitts Medical Board',
    speciality: 'Occupational Medicine',
    licenseExpiryDate: '2026-09-30',
    practiceLocations: [
      {
        id: 'loc-004',
        facilityName: 'Occupational Health Services',
        address: '22 Fort Street, Basseterre',
        island: 'St Kitts',
        phone: '+1-869-555-0402',
        isPrimary: true
      }
    ],
    primaryIsland: 'St Kitts',
    status: 'Active',
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: true,
      canStartMaternityClaims: false
    },
    approvedDate: '2024-06-15',
    lastLoginDate: '2025-01-21',
    accountActivated: true
  },
  {
    id: 'doc-reg-002',
    userId: 'user-doc-002',
    referenceNumber: 'DRR-2024-000075',
    title: 'Dr.',
    firstName: 'James',
    lastName: 'Martinez',
    email: 'j.martinez@stkittshospital.kn',
    phone: '+1-869-555-0701',
    localRegistrationNumber: 'MED-2008-1122',
    registrationAuthority: 'St Kitts Medical Board',
    speciality: 'Emergency Medicine',
    licenseExpiryDate: '2025-08-15',
    practiceLocations: [
      {
        id: 'loc-007',
        facilityName: 'JNF General Hospital',
        address: 'Cayon Street, Basseterre',
        island: 'St Kitts',
        phone: '+1-869-555-0700',
        isPrimary: true
      }
    ],
    primaryIsland: 'St Kitts',
    status: 'Active',
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: true,
      canStartMaternityClaims: false
    },
    approvedDate: '2024-04-20',
    lastLoginDate: '2025-01-20',
    accountActivated: true
  },
  {
    id: 'doc-reg-003',
    userId: 'user-doc-003',
    referenceNumber: 'DRR-2024-000052',
    title: 'Dr.',
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 's.williams@nevismaternity.com',
    phone: '+1-869-555-0801',
    localRegistrationNumber: 'MED-2016-4455',
    registrationAuthority: 'Nevis Medical Council',
    speciality: 'Obstetrics & Gynecology',
    licenseExpiryDate: '2025-11-30',
    practiceLocations: [
      {
        id: 'loc-008',
        facilityName: 'Alexandra Hospital',
        address: 'Government Road, Charlestown',
        island: 'Nevis',
        phone: '+1-869-555-0800',
        isPrimary: true
      }
    ],
    primaryIsland: 'Nevis',
    status: 'Active',
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: false,
      canStartMaternityClaims: true
    },
    approvedDate: '2024-02-10',
    lastLoginDate: '2025-01-19',
    accountActivated: true
  },
  {
    id: 'doc-reg-004',
    userId: 'user-doc-004',
    referenceNumber: 'DRR-2023-000234',
    title: 'Dr.',
    firstName: 'David',
    lastName: 'Brown',
    email: 'd.brown@clinicplus.kn',
    phone: '+1-869-555-0901',
    localRegistrationNumber: 'MED-2005-6677',
    registrationAuthority: 'St Kitts Medical Board',
    speciality: 'General Practice',
    licenseExpiryDate: '2025-04-30',
    practiceLocations: [
      {
        id: 'loc-009',
        facilityName: 'Clinic Plus Medical Center',
        address: '88 Wellington Road, Basseterre',
        island: 'St Kitts',
        phone: '+1-869-555-0902',
        isPrimary: true
      },
      {
        id: 'loc-010',
        facilityName: 'Clinic Plus Nevis',
        address: '15 Main Street, Charlestown',
        island: 'Nevis',
        phone: '+1-869-555-0903',
        isPrimary: false
      }
    ],
    primaryIsland: 'Both',
    status: 'Active',
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: true,
      canStartMaternityClaims: true
    },
    approvedDate: '2023-09-05',
    lastLoginDate: '2025-01-22',
    accountActivated: true
  },
  {
    id: 'doc-reg-005',
    referenceNumber: 'DRR-2024-000110',
    title: 'Dr.',
    firstName: 'Linda',
    lastName: 'Johnson',
    email: 'l.johnson@healthfirst.kn',
    phone: '+1-869-555-1001',
    localRegistrationNumber: 'MED-2019-8899',
    registrationAuthority: 'St Kitts Medical Board',
    speciality: 'Internal Medicine',
    licenseExpiryDate: '2026-03-15',
    practiceLocations: [
      {
        id: 'loc-011',
        facilityName: 'Health First Clinic',
        address: '42 Bay Road, Basseterre',
        island: 'St Kitts',
        phone: '+1-869-555-1002',
        isPrimary: true
      }
    ],
    primaryIsland: 'St Kitts',
    status: 'Suspended',
    benefitPermissions: {
      canStartSicknessClaims: true,
      canStartInjuryClaims: true,
      canStartMaternityClaims: false
    },
    approvedDate: '2024-08-20',
    accountActivated: false
  }
];

// Service functions
export const medicalService = {
  // Applications
  getApplications: async (filters?: {
    status?: DoctorApplicationStatus;
    type?: 'Online' | 'Manual';
    island?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<DoctorApplication[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    let filtered = [...mockApplications];
    
    if (filters?.status) {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    if (filters?.type) {
      filtered = filtered.filter(a => a.applicationType === filters.type);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
    );
  },

  getApplicationById: async (id: string): Promise<DoctorApplication | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockApplications.find(a => a.id === id) || null;
  },

  updateApplicationStatus: async (
    id: string, 
    status: DoctorApplicationStatus,
    note?: string,
    additionalData?: {
      moreInfoReason?: string;
      rejectionReason?: string;
      rejectionMessage?: string;
    }
  ): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const app = mockApplications.find(a => a.id === id);
    if (app) {
      app.status = status;
      app.lastUpdated = new Date().toISOString();
      if (additionalData?.moreInfoReason) app.moreInfoReason = additionalData.moreInfoReason;
      if (additionalData?.rejectionReason) app.rejectionReason = additionalData.rejectionReason;
      if (additionalData?.rejectionMessage) app.rejectionMessage = additionalData.rejectionMessage;
      if (note) {
        app.internalNotes.push({
          id: `note-${Date.now()}`,
          authorId: 'current-user',
          authorName: 'Current User',
          note,
          createdAt: new Date().toISOString(),
          action: status
        });
      }
      return true;
    }
    return false;
  },

  addApplicationNote: async (id: string, note: ApplicationNote): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const app = mockApplications.find(a => a.id === id);
    if (app) {
      app.internalNotes.push(note);
      return true;
    }
    return false;
  },

  assignReviewer: async (applicationId: string, reviewerId: string, reviewerName: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const app = mockApplications.find(a => a.id === applicationId);
    if (app) {
      app.assignedReviewerId = reviewerId;
      app.assignedReviewerName = reviewerName;
      app.lastUpdated = new Date().toISOString();
      return true;
    }
    return false;
  },

  // Doctor Registry
  getApprovedDoctors: async (filters?: {
    status?: 'Active' | 'Suspended' | 'Deactivated';
    island?: string;
    speciality?: string;
    search?: string;
  }): Promise<ApprovedDoctor[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    let filtered = [...mockApprovedDoctors];
    
    if (filters?.status) {
      filtered = filtered.filter(d => d.status === filters.status);
    }
    if (filters?.island) {
      filtered = filtered.filter(d => d.primaryIsland === filters.island || d.primaryIsland === 'Both');
    }
    if (filters?.speciality) {
      filtered = filtered.filter(d => d.speciality === filters.speciality);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(d => 
        d.firstName.toLowerCase().includes(search) ||
        d.lastName.toLowerCase().includes(search) ||
        d.localRegistrationNumber.toLowerCase().includes(search) ||
        d.email.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  },

  getDoctorById: async (id: string): Promise<ApprovedDoctor | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockApprovedDoctors.find(d => d.id === id) || null;
  },

  updateDoctorStatus: async (id: string, status: 'Active' | 'Suspended' | 'Deactivated'): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const doctor = mockApprovedDoctors.find(d => d.id === id);
    if (doctor) {
      doctor.status = status;
      return true;
    }
    return false;
  },

  triggerPasswordReset: async (doctorId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Password reset triggered for doctor: ${doctorId}`);
    return true;
  },

  // Statistics
  getApplicationStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      total: mockApplications.length,
      submitted: mockApplications.filter(a => a.status === 'Submitted').length,
      underReview: mockApplications.filter(a => a.status === 'Under-Review').length,
      moreInfoRequested: mockApplications.filter(a => a.status === 'More-Info-Requested').length,
      approved: mockApplications.filter(a => a.status === 'Approved').length,
      rejected: mockApplications.filter(a => a.status === 'Rejected').length,
      manualEntered: mockApplications.filter(a => a.status === 'Manual-Entered').length,
    };
  },

  getDoctorStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      total: mockApprovedDoctors.length,
      active: mockApprovedDoctors.filter(d => d.status === 'Active').length,
      suspended: mockApprovedDoctors.filter(d => d.status === 'Suspended').length,
      deactivated: mockApprovedDoctors.filter(d => d.status === 'Deactivated').length,
      stKitts: mockApprovedDoctors.filter(d => d.primaryIsland === 'St Kitts').length,
      nevis: mockApprovedDoctors.filter(d => d.primaryIsland === 'Nevis').length,
      both: mockApprovedDoctors.filter(d => d.primaryIsland === 'Both').length,
    };
  }
};
