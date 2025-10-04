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
