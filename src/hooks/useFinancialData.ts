import { useQuery } from '@tanstack/react-query';

// Mock data hook - replace with actual API calls
export const useFinancialData = (caseId: string) => {
  return useQuery({
    queryKey: ['financial-data', caseId],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data with new structure
      return {
        periods: [
          {
            id: '1',
            rowType: 'Amount Due on JDS' as const,
            employer: 'ABC Construction Ltd.',
            periodFrom: '2023-09-01',
            periodTo: '2024-03-31',
            ssc: 12500.00,
            ssf: 8400.00,
            ssCosts: 500.00,
            totalSS: 21400.00,
            lvc: 2000.00,
            lvp: 1500.00,
            lvCosts: 200.00,
            totalLV: 3700.00,
            pec: 750.00,
            pep: 0.00,
            peCosts: 150.00,
            totalPE: 900.00,
          },
          {
            id: '2',
            rowType: 'Payment' as const,
            employer: 'ABC Construction Ltd.',
            periodFrom: '2023-09-01',
            periodTo: '2024-03-31',
            dateOfPayment: '2024-04-15',
            ssc: 5000.00,
            ssf: 3000.00,
            ssCosts: 0.00,
            totalSS: 8000.00,
            lvc: 500.00,
            lvp: 500.00,
            lvCosts: 0.00,
            totalLV: 1000.00,
            pec: 250.00,
            pep: 0.00,
            peCosts: 0.00,
            totalPE: 250.00,
            totalPaid: 9250.00,
            periodCovers: "Sep'23, Oct'23",
          },
          {
            id: '3',
            rowType: 'Bal Due' as const,
            employer: 'ABC Construction Ltd.',
            periodFrom: '2023-09-01',
            periodTo: '2024-03-31',
            ssc: 7500.00,
            ssf: 5400.00,
            ssCosts: 500.00,
            totalSS: 13400.00,
            lvc: 1500.00,
            lvp: 1000.00,
            lvCosts: 200.00,
            totalLV: 2700.00,
            pec: 500.00,
            pep: 0.00,
            peCosts: 150.00,
            totalPE: 650.00,
          },
        ],
        payments: [
          {
            id: '1',
            paymentDate: '2024-04-15',
            fund: 'SSC',
            amountPaid: 5000.00,
            appliedPeriod: "Sep'23 – Mar'24",
            receiptReference: 'REC-2024-001',
            remainingBalance: 16750.00,
          },
          {
            id: '2',
            paymentDate: '2024-05-10',
            fund: 'SSF',
            amountPaid: 3000.00,
            appliedPeriod: "Sep'23 – Mar'24",
            receiptReference: 'REC-2024-002',
            remainingBalance: 13750.00,
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
        waivers: [
          {
            id: '1',
            waiverType: 'Penalty Reduction',
            amount: 1000.00,
            authorizedBy: 'Sarah Mitchell',
            date: '2024-03-15',
            reason: 'Financial hardship - family medical emergency',
            appliedPeriods: ['2023-09-01 to 2024-03-31'],
          },
          {
            id: '2',
            waiverType: 'Interest Waiver',
            percent: 50,
            amount: 500.00,
            authorizedBy: 'John Williams',
            date: '2024-04-01',
            reason: 'Good faith payment efforts',
            appliedPeriods: ['2023-09-01 to 2024-03-31'],
          },
        ],
        arrangements: [
          {
            id: '1',
            terms: '12-month payment plan for outstanding contributions',
            durationMonths: 12,
            startDate: '2024-05-01',
            status: 'On Track',
            installments: [
              { date: '2024-05-15', amount: 2054.17, paid: true },
              { date: '2024-06-15', amount: 2054.17, paid: true },
              { date: '2024-07-15', amount: 2054.17, paid: false },
              { date: '2024-08-15', amount: 2054.17, paid: false },
              { date: '2024-09-15', amount: 2054.17, paid: false },
              { date: '2024-10-15', amount: 2054.17, paid: false },
              { date: '2024-11-15', amount: 2054.17, paid: false },
              { date: '2024-12-15', amount: 2054.17, paid: false },
              { date: '2025-01-15', amount: 2054.17, paid: false },
              { date: '2025-02-15', amount: 2054.17, paid: false },
              { date: '2025-03-15', amount: 2054.17, paid: false },
              { date: '2025-04-15', amount: 2054.16, paid: false },
            ],
          },
        ],
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

  const totalOwed = data.periods
    .filter(p => p.rowType === 'Amount Due on JDS')
    .reduce((sum, p) => sum + p.totalSS + p.totalLV + p.totalPE, 0);
  
  const totalCollected = data.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalWaived = data.waivers.reduce((sum, w) => sum + w.amount, 0);
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
