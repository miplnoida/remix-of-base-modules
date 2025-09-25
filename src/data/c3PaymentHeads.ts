export interface PaymentHead {
  id: string;
  name: string;
  description: string;
  category: 'contribution' | 'penalty' | 'benefit' | 'levy';
  isActive: boolean;
  glAccount?: string;
}

export const c3PaymentHeads: PaymentHead[] = [
  // Social Security Contributions
  { 
    id: 'SS_REGULAR', 
    name: 'Social Security Contributions', 
    description: 'Regular monthly social security contributions',
    category: 'contribution',
    isActive: true,
    glAccount: '4101'
  },
  { 
    id: 'SS_ARREARS', 
    name: 'Social Security Arrears', 
    description: 'Past due social security contributions',
    category: 'contribution',
    isActive: true,
    glAccount: '4102'
  },
  
  // Levy Payments
  { 
    id: 'LEVY_TRAINING', 
    name: 'Training & Development Levy', 
    description: 'Employer training and development levy',
    category: 'levy',
    isActive: true,
    glAccount: '4201'
  },
  { 
    id: 'LEVY_SOCIAL', 
    name: 'Social Development Levy', 
    description: 'Social development program levy',
    category: 'levy',
    isActive: true,
    glAccount: '4202'
  },
  
  // Severance Payments
  { 
    id: 'SEV_CURRENT', 
    name: 'Severance Payment Fund', 
    description: 'Current severance payment contributions',
    category: 'contribution',
    isActive: true,
    glAccount: '4301'
  },
  { 
    id: 'SEV_ARREARS', 
    name: 'Severance Arrears', 
    description: 'Past due severance payment contributions',
    category: 'contribution',
    isActive: true,
    glAccount: '4302'
  },
  
  // Penalties and Interest
  { 
    id: 'PENALTY_LATE', 
    name: 'Late Payment Penalty', 
    description: 'Penalty for late C3 submission',
    category: 'penalty',
    isActive: true,
    glAccount: '4401'
  },
  { 
    id: 'PENALTY_NON_FILING', 
    name: 'Non-Filing Penalty', 
    description: 'Penalty for failure to file C3',
    category: 'penalty',
    isActive: true,
    glAccount: '4402'
  },
  { 
    id: 'INTEREST', 
    name: 'Interest Charges', 
    description: 'Interest on overdue contributions',
    category: 'penalty',
    isActive: true,
    glAccount: '4403'
  },
  
  // Additional Contributions
  { 
    id: 'VOLUNTARY', 
    name: 'Voluntary Contributions', 
    description: 'Additional voluntary social security contributions',
    category: 'contribution',
    isActive: true,
    glAccount: '4501'
  },
  { 
    id: 'MATERNITY', 
    name: 'Maternity Benefit Fund', 
    description: 'Contributions to maternity benefit fund',
    category: 'contribution',
    isActive: true,
    glAccount: '4502'
  }
];

export const getActivePaymentHeads = () => c3PaymentHeads.filter(head => head.isActive);

export const getPaymentHeadsByCategory = (category: PaymentHead['category']) => 
  c3PaymentHeads.filter(head => head.category === category && head.isActive);