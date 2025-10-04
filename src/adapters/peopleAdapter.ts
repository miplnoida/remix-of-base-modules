import { legalConfig } from "@/config/legalConfig";

export interface Person {
  ssn: string;
  name: string;
  dob: string;
  contact: {
    email?: string;
    phone?: string;
  };
  status: string;
}

const mockPeople: Record<string, Person> = {
  "123-45-6789": {
    ssn: "123-45-6789",
    name: "John Williams",
    dob: "1985-03-15",
    contact: { email: "j.williams@example.com", phone: "869-555-0101" },
    status: "Active"
  },
  "234-56-7890": {
    ssn: "234-56-7890",
    name: "Mary Johnson",
    dob: "1978-07-22",
    contact: { email: "m.johnson@example.com", phone: "869-555-0102" },
    status: "Active"
  },
  "345-67-8901": {
    ssn: "345-67-8901",
    name: "Robert Brown",
    dob: "1990-11-30",
    contact: { email: "r.brown@example.com", phone: "869-555-0103" },
    status: "Active"
  }
};

export const peopleAdapter = {
  async getPerson(ssn: string): Promise<Person | null> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      return mockPeople[ssn] || null;
    }
    
    // Legacy API call
    const response = await fetch(`/api/people/${ssn}`);
    if (!response.ok) return null;
    return response.json();
  },

  async search(query: string): Promise<Person[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      return Object.values(mockPeople).filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.ssn.includes(query)
      );
    }
    
    const response = await fetch(`/api/people/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    return response.json();
  }
};
