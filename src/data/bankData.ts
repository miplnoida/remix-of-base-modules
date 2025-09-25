export interface Bank {
  id: string;
  name: string;
  code: string;
  country: string;
  isActive: boolean;
}

export const stKittsBanks: Bank[] = [
  { id: 'RBC', name: 'Royal Bank of Canada', code: 'RBC', country: 'St. Kitts & Nevis', isActive: true },
  { id: 'FCB', name: 'First Citizens Bank', code: 'FCB', country: 'St. Kitts & Nevis', isActive: true },
  { id: 'CIBC', name: 'CIBC FirstCaribbean', code: 'CIBC', country: 'St. Kitts & Nevis', isActive: true },
  { id: 'BON', name: 'Bank of Nevis', code: 'BON', country: 'St. Kitts & Nevis', isActive: true },
  { id: 'SKIB', name: 'St. Kitts Investment Bank', code: 'SKIB', country: 'St. Kitts & Nevis', isActive: true },
  { id: 'NCB', name: 'National Commercial Bank', code: 'NCB', country: 'St. Kitts & Nevis', isActive: true },
  { id: 'BOA', name: 'Bank of Antigua', code: 'BOA', country: 'Antigua & Barbuda', isActive: true },
  { id: 'RBTT', name: 'RBC Royal Bank (Trinidad)', code: 'RBTT', country: 'Trinidad & Tobago', isActive: true },
  { id: 'SCOTIA', name: 'Scotiabank', code: 'SCOTIA', country: 'Regional', isActive: true },
  { id: 'OTHER', name: 'Other Bank', code: 'OTHER', country: 'Other', isActive: true }
];

export const getActiveBanks = () => stKittsBanks.filter(bank => bank.isActive);