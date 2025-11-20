import { legalConfig } from "@/config/legalConfig";

export interface Employer {
  regNo: string;
  name: string;
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  complianceStatus: string;
  riskRating?: number; // 0-100
  riskBand?: 'Low' | 'Medium' | 'High' | 'Critical';
  zone?: string;
  lastAuditDate?: string;
  outstandingArrears?: number;
  outstandingBalance?: number; // Alias for compatibility
  lastC3Status?: string;
  lastC3Date?: string;
  lastPaymentDate?: string;
}

const mockEmployers: Record<string, Employer> = {
  "EMP-001": {
    regNo: "EMP-001",
    name: "ABC Construction Ltd.",
    contact: {
      email: "info@abcconstruction.com",
      phone: "869-555-1001",
      address: "123 Industrial Park, Basseterre"
    },
    complianceStatus: "Non-Compliant",
    riskRating: 95,
    riskBand: 'Critical',
    zone: 'Zone A',
    lastAuditDate: '2023-06-15',
    outstandingArrears: 75000,
    outstandingBalance: 75000,
    lastC3Status: 'submitted_no_payment',
    lastC3Date: '2024-11-15',
    lastPaymentDate: '2023-08-10'
  },
  "EMP-002": {
    regNo: "EMP-002",
    name: "XYZ Hospitality Services",
    contact: {
      email: "hr@xyzhospitality.com",
      phone: "869-555-1002",
      address: "456 Frigate Bay Road"
    },
    complianceStatus: "Under Review",
    riskRating: 88,
    riskBand: 'High',
    zone: 'Zone A',
    lastAuditDate: '2023-09-20',
    outstandingArrears: 65000,
    outstandingBalance: 65000,
    lastC3Status: 'not_submitted',
    lastC3Date: '2024-09-01',
    lastPaymentDate: '2024-01-15'
  },
  "EMP-003": {
    regNo: "EMP-003",
    name: "Caribbean Tech Solutions",
    contact: {
      email: "admin@caribtech.com",
      phone: "869-555-1003",
      address: "789 Bird Rock, Basseterre"
    },
    complianceStatus: "Compliant",
    riskRating: 82,
    riskBand: 'High',
    zone: 'Zone A',
    lastAuditDate: '2024-01-10',
    outstandingArrears: 0,
    outstandingBalance: 0,
    lastC3Status: 'submitted_with_payment',
    lastC3Date: '2024-12-01',
    lastPaymentDate: '2024-12-01'
  },
  "EMP-004": {
    regNo: "EMP-004",
    name: "Island Resort & Spa",
    contact: {
      email: "hr@islandresort.com",
      phone: "869-555-1004",
      address: "Beach Front, Frigate Bay"
    },
    complianceStatus: "Compliant",
    riskRating: 75,
    riskBand: 'High',
    zone: 'Zone A',
    lastAuditDate: '2024-02-15',
    outstandingArrears: 12000,
    outstandingBalance: 12000,
    lastC3Status: 'submitted_partial_payment',
    lastC3Date: '2024-11-30',
    lastPaymentDate: '2024-11-30'
  },
  "EMP-005": {
    regNo: "EMP-005",
    name: "St. Kitts Manufacturing Co.",
    contact: {
      email: "accounts@skmfg.com",
      phone: "869-555-1005",
      address: "Industrial Estate, Sandy Point"
    },
    complianceStatus: "Non-Compliant",
    riskRating: 72,
    riskBand: 'Medium',
    zone: 'Zone B',
    lastAuditDate: '2023-08-05',
    outstandingArrears: 55000,
    outstandingBalance: 55000,
    lastC3Status: 'submitted_no_payment',
    lastC3Date: '2024-10-15',
    lastPaymentDate: '2023-12-20'
  },
  "EMP-006": {
    regNo: "EMP-006",
    name: "Paradise Hotel Group",
    contact: {
      email: "payroll@paradisehotel.com",
      phone: "869-555-1006",
      address: "Cockleshell Beach"
    },
    complianceStatus: "Compliant",
    riskRating: 65,
    riskBand: 'Medium',
    zone: 'Zone A',
    lastAuditDate: '2024-03-01',
    outstandingArrears: 0,
    outstandingBalance: 0,
    lastC3Status: 'submitted_with_payment',
    lastC3Date: '2024-12-05',
    lastPaymentDate: '2024-12-05'
  },
  "EMP-007": {
    regNo: "EMP-007",
    name: "BuildRight Contractors",
    contact: {
      email: "office@buildright.com",
      phone: "869-555-1007",
      address: "Main Street, Charlestown"
    },
    complianceStatus: "Under Review",
    riskRating: 58,
    riskBand: 'Medium',
    zone: 'Zone B',
    lastAuditDate: '2024-01-20',
    outstandingArrears: 28000,
    outstandingBalance: 28000,
    lastC3Status: 'submitted_no_payment',
    lastC3Date: '2024-11-01',
    lastPaymentDate: '2024-05-15'
  },
  "EMP-008": {
    regNo: "EMP-008",
    name: "Caribbean Shipping Ltd.",
    contact: {
      email: "admin@caribship.com",
      phone: "869-555-1008",
      address: "Port Zante, Basseterre"
    },
    complianceStatus: "Compliant",
    riskRating: 52,
    riskBand: 'Medium',
    zone: 'Zone A',
    lastAuditDate: '2024-04-10',
    outstandingArrears: 8500,
    outstandingBalance: 8500,
    lastC3Status: 'submitted_with_payment',
    lastC3Date: '2024-11-28',
    lastPaymentDate: '2024-11-28'
  },
  "EMP-009": {
    regNo: "EMP-009",
    name: "Green Energy Solutions",
    contact: {
      email: "info@greenenergy.com",
      phone: "869-555-1009",
      address: "Solar Park, Sandy Point"
    },
    complianceStatus: "Compliant",
    riskRating: 42,
    riskBand: 'Low',
    zone: 'Zone B',
    lastAuditDate: '2024-05-15',
    outstandingArrears: 0,
    outstandingBalance: 0,
    lastC3Status: 'submitted_with_payment',
    lastC3Date: '2024-12-02',
    lastPaymentDate: '2024-12-02'
  },
  "EMP-010": {
    regNo: "EMP-010",
    name: "Financial Services Group",
    contact: {
      email: "hr@fsg.com",
      phone: "869-555-1010",
      address: "Bank Street, Basseterre"
    },
    complianceStatus: "Compliant",
    riskRating: 35,
    riskBand: 'Low',
    zone: 'Zone A',
    lastAuditDate: '2024-06-01',
    outstandingArrears: 0,
    outstandingBalance: 0,
    lastC3Status: 'submitted_with_payment',
    lastC3Date: '2024-12-03',
    lastPaymentDate: '2024-12-03'
  }
};

export const employersAdapter = {
  async getEmployer(regNo: string): Promise<Employer | null> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      return mockEmployers[regNo] || null;
    }
    
    const response = await fetch(`/api/employers/${regNo}`);
    if (!response.ok) return null;
    return response.json();
  },

  async search(query: string): Promise<Employer[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      return Object.values(mockEmployers).filter(e => 
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.regNo.includes(query)
      );
    }
    
    const response = await fetch(`/api/employers/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    return response.json();
  },

  async getAllByZone(zone: string): Promise<Employer[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      return Object.values(mockEmployers)
        .filter(e => e.zone === zone)
        .sort((a, b) => (b.riskRating || 0) - (a.riskRating || 0)); // Sort by risk descending
    }
    
    const response = await fetch(`/api/employers?zone=${encodeURIComponent(zone)}`);
    if (!response.ok) return [];
    return response.json();
  }
};
