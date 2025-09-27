import { 
  Person, 
  Claim, 
  BenefitType, 
  ClaimStatus, 
  Contribution, 
  Award, 
  Payment, 
  Message,
  EligibilitySnapshot,
  Diary,
  Employer,
  Document,
  ClaimEvent
} from '@/types/newBenefit';

// Mock data storage
class MockDataStore {
  private static instance: MockDataStore;
  private persons: Person[] = [];
  private claims: Claim[] = [];
  private contributions: Contribution[] = [];
  private awards: Award[] = [];
  private payments: Payment[] = [];
  private messages: Message[] = [];
  private employers: Employer[] = [];
  private documents: Document[] = [];
  private claimEvents: ClaimEvent[] = [];

  private constructor() {
    this.initializeMockData();
  }

  static getInstance(): MockDataStore {
    if (!MockDataStore.instance) {
      MockDataStore.instance = new MockDataStore();
    }
    return MockDataStore.instance;
  }

  private initializeMockData() {
    // Initialize persons
    this.persons = [
      {
        ssn: '123456789',
        firstName: 'John',
        lastName: 'Contributor',
        dateOfBirth: '1980-01-15',
        email: 'john@example.com',
        phone: '(869) 555-0123',
        address: '123 Main Street, Basseterre, St. Kitts',
        bankAccount: '1234567890',
        bankRoutingNumber: '123456789'
      },
      {
        ssn: '987654321',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1975-05-20',
        email: 'jane@example.com',
        phone: '(869) 555-0456',
        address: '456 Church Street, Charlestown, Nevis',
        bankAccount: '9876543210',
        bankRoutingNumber: '987654321'
      }
    ];

    // Initialize employers
    this.employers = [
      {
        id: 'EMP001',
        name: 'Government of St. Kitts & Nevis',
        registrationNumber: 'GOV001',
        contactPerson: 'HR Manager',
        phone: '(869) 465-2521',
        email: 'hr@gov.kn',
        address: 'Government Headquarters, Basseterre'
      },
      {
        id: 'EMP002',
        name: 'Royal Bank of Canada',
        registrationNumber: 'RBC001',
        contactPerson: 'Payroll Department',
        phone: '(869) 465-2359',
        email: 'payroll@rbc.com',
        address: 'Fort Street, Basseterre'
      }
    ];

    // Initialize contributions
    this.generateMockContributions();

    // Initialize sample claims
    this.initializeSampleClaims();

    // Initialize sample messages
    this.initializeSampleMessages();
  }

  private generateMockContributions() {
    const startYear = 2020;
    const endYear = new Date().getFullYear();
    
    this.persons.forEach(person => {
      for (let year = startYear; year <= endYear; year++) {
        for (let week = 1; week <= 52; week++) {
          const weekEnding = new Date(year, 0, week * 7);
          this.contributions.push({
            id: `${person.ssn}-${year}-${week.toString().padStart(2, '0')}`,
            ssn: person.ssn,
            employerId: 'EMP001',
            weekEnding: weekEnding.toISOString().split('T')[0],
            wages: 800 + Math.random() * 400,
            contribution: 64 + Math.random() * 32,
            credited: Math.random() > 0.05,
            year
          });
        }
      }
    });
  }

  private initializeSampleClaims() {
    this.claims = [
      {
        id: 'CLM001',
        ssn: '123456789',
        benefitType: 'SICKNESS',
        status: 'SUBMITTED',
        submissionDate: '2024-01-15',
        lastUpdated: '2024-01-15',
        priority: 'NORMAL',
        contactPhone: '(869) 555-0123',
        contactEmail: 'john@example.com',
        bankAccount: '1234567890',
        bankRoutingNumber: '123456789',
        declaration: true,
        digitalSignature: 'John Contributor',
        sicknessData: {
          lastDayWorked: '2024-01-10',
          expectedReturnDate: '2024-01-25',
          employerId: 'EMP001',
          medicalCertificateId: 'DOC001'
        }
      },
      {
        id: 'CLM002',
        ssn: '987654321',
        benefitType: 'MATERNITY',
        status: 'APPROVED',
        submissionDate: '2024-01-10',
        lastUpdated: '2024-01-20',
        assignedTo: 'claims_officer1',
        priority: 'HIGH',
        contactPhone: '(869) 555-0456',
        contactEmail: 'jane@example.com',
        bankAccount: '9876543210',
        bankRoutingNumber: '987654321',
        declaration: true,
        digitalSignature: 'Jane Smith',
        maternityData: {
          expectedDeliveryDate: '2024-02-15',
          medicalProofId: 'DOC002'
        }
      }
    ];
  }

  private initializeSampleMessages() {
    this.messages = [
      {
        id: 'MSG001',
        fromUser: 'claims_officer1',
        toUser: '123456789',
        claimId: 'CLM001',
        subject: 'Additional Documentation Required',
        message: 'Please provide updated medical certificate showing current status.',
        sentDate: '2024-01-16',
        read: false
      }
    ];
  }

  // Public methods for data access
  getPersonBySSN(ssn: string): Person | undefined {
    return this.persons.find(p => p.ssn === ssn);
  }

  getClaimsBySSN(ssn: string): Claim[] {
    return this.claims.filter(c => c.ssn === ssn);
  }

  getClaimById(id: string): Claim | undefined {
    return this.claims.find(c => c.id === id);
  }

  getAllClaims(): Claim[] {
    return this.claims;
  }

  getContributionsBySSN(ssn: string): Contribution[] {
    return this.contributions.filter(c => c.ssn === ssn);
  }

  getMessagesByUser(userSSN: string): Message[] {
    return this.messages.filter(m => m.toUser === userSSN || m.fromUser === userSSN);
  }

  createClaim(claim: Omit<Claim, 'id'>): Claim {
    const newClaim: Claim = {
      ...claim,
      id: `CLM${(this.claims.length + 1).toString().padStart(3, '0')}`
    };
    this.claims.push(newClaim);
    return newClaim;
  }

  updateClaim(id: string, updates: Partial<Claim>): Claim | null {
    const index = this.claims.findIndex(c => c.id === id);
    if (index !== -1) {
      this.claims[index] = { ...this.claims[index], ...updates, lastUpdated: new Date().toISOString().split('T')[0] };
      return this.claims[index];
    }
    return null;
  }

  addClaimEvent(event: Omit<ClaimEvent, 'id'>): ClaimEvent {
    const newEvent: ClaimEvent = {
      ...event,
      id: `EVT${(this.claimEvents.length + 1).toString().padStart(3, '0')}`
    };
    this.claimEvents.push(newEvent);
    return newEvent;
  }

  getClaimEvents(claimId: string): ClaimEvent[] {
    return this.claimEvents.filter(e => e.claimId === claimId);
  }

  sendMessage(message: Omit<Message, 'id'>): Message {
    const newMessage: Message = {
      ...message,
      id: `MSG${(this.messages.length + 1).toString().padStart(3, '0')}`
    };
    this.messages.push(newMessage);
    return newMessage;
  }
}

export const newBenefitService = {
  // Authentication
  async authenticateContributor(ssn: string, password: string): Promise<Person | null> {
    // For demo, any password works
    const dataStore = MockDataStore.getInstance();
    return dataStore.getPersonBySSN(ssn) || null;
  },

  // Contributors
  async getContributorProfile(ssn: string): Promise<Person | null> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.getPersonBySSN(ssn) || null;
  },

  async getContributionHistory(ssn: string): Promise<Contribution[]> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.getContributionsBySSN(ssn);
  },

  async getContributionSummary(ssn: string): Promise<{
    totalWeeks: number;
    paidWeeks: number;
    creditedWeeks: number;
    totalContributions: number;
  }> {
    const dataStore = MockDataStore.getInstance();
    const contributions = dataStore.getContributionsBySSN(ssn);
    
    return {
      totalWeeks: contributions.length,
      paidWeeks: contributions.filter(c => !c.credited).length,
      creditedWeeks: contributions.filter(c => c.credited).length,
      totalContributions: contributions.reduce((sum, c) => sum + c.contribution, 0)
    };
  },

  // Claims
  async submitClaim(claim: Omit<Claim, 'id' | 'submissionDate' | 'lastUpdated'>): Promise<Claim> {
    const dataStore = MockDataStore.getInstance();
    const newClaim = dataStore.createClaim({
      ...claim,
      submissionDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    });

    // Add submission event
    dataStore.addClaimEvent({
      claimId: newClaim.id,
      eventType: 'CLAIM_SUBMITTED',
      eventDate: new Date().toISOString(),
      performedBy: claim.ssn,
      toStatus: 'SUBMITTED'
    });

    return newClaim;
  },

  async getClaimsBySSN(ssn: string): Promise<Claim[]> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.getClaimsBySSN(ssn);
  },

  async getClaimById(id: string): Promise<Claim | null> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.getClaimById(id) || null;
  },

  async getAllClaims(): Promise<Claim[]> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.getAllClaims();
  },

  async updateClaimStatus(claimId: string, newStatus: ClaimStatus, performedBy: string, notes?: string): Promise<Claim | null> {
    const dataStore = MockDataStore.getInstance();
    const currentClaim = dataStore.getClaimById(claimId);
    
    if (!currentClaim) return null;
    
    const updatedClaim = dataStore.updateClaim(claimId, { status: newStatus });
    
    if (updatedClaim) {
      dataStore.addClaimEvent({
        claimId,
        eventType: 'STATUS_CHANGE',
        eventDate: new Date().toISOString(),
        performedBy,
        fromStatus: currentClaim.status,
        toStatus: newStatus,
        notes
      });
    }
    
    return updatedClaim;
  },

  async getClaimEvents(claimId: string): Promise<ClaimEvent[]> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.getClaimEvents(claimId);
  },

  // Messages
  async getMessages(userSSN: string): Promise<Message[]> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.getMessagesByUser(userSSN);
  },

  async sendMessage(message: Omit<Message, 'id' | 'sentDate'>): Promise<Message> {
    const dataStore = MockDataStore.getInstance();
    return dataStore.sendMessage({
      ...message,
      sentDate: new Date().toISOString()
    });
  },

  // Eligibility checking
  async checkEligibility(ssn: string, benefitType: BenefitType): Promise<EligibilitySnapshot> {
    const dataStore = MockDataStore.getInstance();
    const contributions = dataStore.getContributionsBySSN(ssn);
    const person = dataStore.getPersonBySSN(ssn);
    
    let requiredWeeks = 0;
    let eligibilityMet = false;
    const reasonsPass: string[] = [];
    const reasonsFailure: string[] = [];
    
    // Basic eligibility rules (simplified)
    switch (benefitType) {
      case 'SICKNESS':
        requiredWeeks = 8;
        break;
      case 'MATERNITY':
        requiredWeeks = 20;
        break;
      case 'EMPLOYMENT_INJURY':
        requiredWeeks = 1;
        break;
      case 'AGE_PENSION':
        requiredWeeks = 500;
        break;
      case 'AGE_GRANT':
        requiredWeeks = 50;
        break;
      case 'INVALIDITY':
        requiredWeeks = 150;
        break;
      default:
        requiredWeeks = 0;
    }
    
    const contributionWeeks = contributions.length;
    
    if (contributionWeeks >= requiredWeeks) {
      eligibilityMet = true;
      reasonsPass.push(`Sufficient contribution weeks: ${contributionWeeks} >= ${requiredWeeks}`);
    } else {
      reasonsFailure.push(`Insufficient contribution weeks: ${contributionWeeks} < ${requiredWeeks}`);
    }
    
    // Age check for age benefits
    if (benefitType === 'AGE_PENSION' || benefitType === 'AGE_GRANT' || benefitType === 'NON_CONTRIBUTORY_PENSION') {
      if (person) {
        const age = new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear();
        if (age >= 62) {
          reasonsPass.push(`Age requirement met: ${age} >= 62`);
        } else {
          eligibilityMet = false;
          reasonsFailure.push(`Age requirement not met: ${age} < 62`);
        }
      }
    }
    
    return {
      id: `ELIG${Date.now()}`,
      claimId: '',
      checkDate: new Date().toISOString(),
      eligibilityMet,
      contributionWeeks,
      requiredWeeks,
      reasonsFailure,
      reasonsPass
    };
  },

  // Benefit calculations
  async calculateBenefit(ssn: string, benefitType: BenefitType): Promise<{
    weeklyAmount?: number;
    monthlyAmount?: number;
    lumpSumAmount?: number;
    calculationDetails: string[];
  }> {
    const dataStore = MockDataStore.getInstance();
    const contributions = dataStore.getContributionsBySSN(ssn);
    
    // Calculate Average Weekly Wage (AWW) from last 20 weeks
    const recentContributions = contributions.slice(-20);
    const totalWages = recentContributions.reduce((sum, c) => sum + c.wages, 0);
    const aww = totalWages / Math.max(recentContributions.length, 1);
    
    const calculationDetails: string[] = [];
    calculationDetails.push(`Average Weekly Wage: $${aww.toFixed(2)}`);
    
    let result: any = {};
    
    switch (benefitType) {
      case 'SICKNESS':
        result.weeklyAmount = Math.min(aww * 0.65, 500); // 65% of AWW, max $500
        calculationDetails.push(`Sickness Benefit: 65% of AWW = $${result.weeklyAmount.toFixed(2)}`);
        break;
        
      case 'MATERNITY':
        result.weeklyAmount = Math.min(aww * 0.65, 500); // 65% of AWW, max $500
        calculationDetails.push(`Maternity Benefit: 65% of AWW = $${result.weeklyAmount.toFixed(2)}`);
        break;
        
      case 'EMPLOYMENT_INJURY':
        result.weeklyAmount = Math.min(aww * 0.75, 600); // 75% of AWW, max $600
        calculationDetails.push(`Employment Injury Benefit: 75% of AWW = $${result.weeklyAmount.toFixed(2)}`);
        break;
        
      case 'FUNERAL_GRANT':
        result.lumpSumAmount = 2000; // Fixed amount
        calculationDetails.push(`Funeral Grant: Fixed amount = $${result.lumpSumAmount}`);
        break;
        
      case 'AGE_PENSION':
        result.monthlyAmount = Math.min(aww * 4 * 0.3, 1200); // 30% of monthly AWW, max $1200
        calculationDetails.push(`Age Pension: 30% of monthly AWW = $${result.monthlyAmount.toFixed(2)}`);
        break;
        
      case 'AGE_GRANT':
        result.lumpSumAmount = 5000; // Fixed amount
        calculationDetails.push(`Age Grant: Fixed amount = $${result.lumpSumAmount}`);
        break;
        
      default:
        result.weeklyAmount = 0;
        calculationDetails.push('Calculation not implemented for this benefit type');
    }
    
    return { ...result, calculationDetails };
  }
};