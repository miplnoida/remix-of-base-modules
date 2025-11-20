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
    complianceStatus: "Non-Compliant"
  },
  "EMP-002": {
    regNo: "EMP-002",
    name: "XYZ Hospitality Services",
    contact: {
      email: "hr@xyzhospitality.com",
      phone: "869-555-1002",
      address: "456 Frigate Bay Road"
    },
    complianceStatus: "Under Review"
  },
  "EMP-003": {
    regNo: "EMP-003",
    name: "Caribbean Tech Solutions",
    contact: {
      email: "admin@caribtech.com",
      phone: "869-555-1003",
      address: "789 Bird Rock, Basseterre"
    },
    complianceStatus: "Compliant"
  },
  "EMP-004": {
    regNo: "EMP-004",
    name: "Island Resort & Spa",
    contact: {
      email: "hr@islandresort.com",
      phone: "869-555-1004",
      address: "Beach Front, Frigate Bay"
    },
    complianceStatus: "Compliant"
  },
  "EMP-005": {
    regNo: "EMP-005",
    name: "St. Kitts Manufacturing Co.",
    contact: {
      email: "accounts@skmfg.com",
      phone: "869-555-1005",
      address: "Industrial Estate, Sandy Point"
    },
    complianceStatus: "Non-Compliant"
  },
  "EMP-006": {
    regNo: "EMP-006",
    name: "Paradise Hotel Group",
    contact: {
      email: "payroll@paradisehotel.com",
      phone: "869-555-1006",
      address: "Cockleshell Beach"
    },
    complianceStatus: "Compliant"
  },
  "EMP-007": {
    regNo: "EMP-007",
    name: "BuildRight Contractors",
    contact: {
      email: "office@buildright.com",
      phone: "869-555-1007",
      address: "Main Street, Charlestown"
    },
    complianceStatus: "Under Review"
  },
  "EMP-008": {
    regNo: "EMP-008",
    name: "Caribbean Shipping Ltd.",
    contact: {
      email: "admin@caribship.com",
      phone: "869-555-1008",
      address: "Port Zante, Basseterre"
    },
    complianceStatus: "Compliant"
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
  }
};
