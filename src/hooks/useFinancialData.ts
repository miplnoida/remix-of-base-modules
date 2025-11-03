import { useQuery } from '@tanstack/react-query';

// Mock data hook - replace with actual API calls
export const useFinancialData = (caseId: string) => {
  return useQuery({
    queryKey: ['financial-data', caseId],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      return {
        periods: [
          {
            id: '1',
            employer: 'ABC Construction Ltd.',
            periodFrom: '2023-09-01',
            periodTo: '2024-03-31',
            dateOfPayment: '2024-04-15',
            ssc: 12500.00,
            ssf: 8400.00,
            costsFees: 500.00,
            lvc: 2000.00,
            lvp: 1500.00,
            pec: 750.00,
            waiverApplied: 1000.00,
            balanceOutstanding: 24650.00,
            hasPayment: true,
          },
        ],
        payments: [
          {
            id: '1',
            paymentDate: '2024-04-15',
            funds: ['S.S.C', 'S.S.F'],
            amountPaid: 5000.00,
            appliedPeriod: '1',
            receiptReference: 'REC-2024-001',
            remainingBalance: 24650.00,
          },
        ],
        costs: [
          {
            id: '1',
            costDate: '2024-01-10',
            costType: 'Filing Fee',
            amount: 250.00,
            description: 'Initial court filing fee',
          },
          {
            id: '2',
            costDate: '2024-02-20',
            costType: 'Court Appearance Fee',
            amount: 250.00,
            description: 'Hearing appearance fee',
          },
        ],
        waivers: [],
        arrangements: [],
      };
    },
    enabled: !!caseId,
  });
};

export const useFinancialSummary = (caseId: string) => {
  const { data } = useFinancialData(caseId);

  if (!data) {
    return {
      summary: {
        totalOwed: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        nextPaymentDue: null,
      },
      isLoading: true,
    };
  }

  const totalOwed = data.periods.reduce((sum, p) => 
    sum + p.ssc + p.ssf + p.costsFees + p.lvc + p.lvp + p.pec, 0
  );
  
  const totalCollected = data.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalWaived = data.periods.reduce((sum, p) => sum + p.waiverApplied, 0);
  const totalOutstanding = totalOwed - totalCollected - totalWaived;

  // Find next payment due from arrangements
  let nextPaymentDue = null;
  if (data.arrangements.length > 0) {
    const activeArrangement = data.arrangements.find(a => a.status === 'On Track');
    if (activeArrangement) {
      const nextInstallment = activeArrangement.installments.find(i => !i.paid);
      if (nextInstallment) {
        nextPaymentDue = new Date(nextInstallment.date).toLocaleDateString();
      }
    }
  }

  return {
    summary: {
      totalOwed,
      totalCollected,
      totalOutstanding,
      nextPaymentDue,
    },
    isLoading: false,
  };
};
