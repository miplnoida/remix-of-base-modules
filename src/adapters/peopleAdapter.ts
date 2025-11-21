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
  },
  "456-78-9012": {
    ssn: "456-78-9012",
    name: "Sarah Davis",
    dob: "1982-05-20",
    contact: { email: "s.davis@example.com", phone: "869-555-0104" },
    status: "Active"
  },
  "567-89-0123": {
    ssn: "567-89-0123",
    name: "Michael Thompson",
    dob: "1975-09-12",
    contact: { email: "m.thompson@example.com", phone: "869-555-0105" },
    status: "Active"
  },
  "678-90-1234": {
    ssn: "678-90-1234",
    name: "Jennifer Martinez",
    dob: "1988-12-08",
    contact: { email: "j.martinez@example.com", phone: "869-555-0106" },
    status: "Active"
  },
  "789-01-2345": {
    ssn: "789-01-2345",
    name: "David Wilson",
    dob: "1970-04-25",
    contact: { email: "d.wilson@example.com", phone: "869-555-0107" },
    status: "Active"
  },
  "890-12-3456": {
    ssn: "890-12-3456",
    name: "Lisa Anderson",
    dob: "1992-08-17",
    contact: { email: "l.anderson@example.com", phone: "869-555-0108" },
    status: "Active"
  },
  "901-23-4567": {
    ssn: "901-23-4567",
    name: "James Taylor",
    dob: "1965-11-30",
    contact: { email: "j.taylor@example.com", phone: "869-555-0109" },
    status: "Retired"
  },
  "012-34-5678": {
    ssn: "012-34-5678",
    name: "Patricia White",
    dob: "1995-02-14",
    contact: { email: "p.white@example.com", phone: "869-555-0110" },
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
