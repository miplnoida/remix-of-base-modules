import { legalConfig } from "@/config/legalConfig";

export interface Penalty {
  penaltyId: string;
  caseId: string;
  orderId?: string;
  type: string;
  amount: number;
  currency: string;
  dueOn: string;
  status: "Pending" | "Partial" | "Paid" | "Waived" | "Written Off";
  payments?: Payment[];
}

export interface Payment {
  paymentId: string;
  penaltyId: string;
  amount: number;
  receivedOn: string;
  method: string;
  reference: string;
}

const mockPenalties: Penalty[] = [];

export const financeAdapter = {
  async listPenalties(filters: { caseId?: string }): Promise<Penalty[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      return filters.caseId 
        ? mockPenalties.filter(p => p.caseId === filters.caseId)
        : mockPenalties;
    }
    
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`/api/finance/penalties?${params}`);
    if (!response.ok) return [];
    return response.json();
  },

  async createPenaltiesFromOrder(data: {
    caseId: string;
    orderId: string;
    items: Array<{ type: string; amount: number; dueOn: string }>;
  }): Promise<Penalty[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 150));
      const newPenalties = data.items.map(item => ({
        penaltyId: `PEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        caseId: data.caseId,
        orderId: data.orderId,
        type: item.type,
        amount: item.amount,
        currency: "XCD",
        dueOn: item.dueOn,
        status: "Pending" as const,
        payments: []
      }));
      mockPenalties.push(...newPenalties);
      return newPenalties;
    }
    
    const response = await fetch('/api/finance/penalties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create penalties');
    return response.json();
  },

  async postPayment(data: {
    penaltyId: string;
    amount: number;
    receivedOn: string;
    method: string;
    reference: string;
  }): Promise<Payment> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 150));
      const payment: Payment = {
        paymentId: `PAY-${Date.now()}`,
        ...data
      };
      
      const penalty = mockPenalties.find(p => p.penaltyId === data.penaltyId);
      if (penalty) {
        if (!penalty.payments) penalty.payments = [];
        penalty.payments.push(payment);
        
        const totalPaid = penalty.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= penalty.amount) {
          penalty.status = "Paid";
        } else if (totalPaid > 0) {
          penalty.status = "Partial";
        }
      }
      
      return payment;
    }
    
    const response = await fetch('/api/finance/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to post payment');
    return response.json();
  }
};
