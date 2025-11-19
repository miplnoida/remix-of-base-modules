import { InsuredPerson } from '@/types/serviceRequest';

export const INSURED_PERSONS: InsuredPerson[] = [
  {
    id: 'IP10001',
    ssn: '123-456-7890',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    dateOfBirth: '1985-03-15',
    contactPhone: '+1-869-555-0101',
    email: 'john.doe@email.com',
    address: '123 Main Street, Basseterre, St. Kitts'
  },
  {
    id: 'IP10002',
    ssn: '234-567-8901',
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith',
    dateOfBirth: '1990-07-22',
    contactPhone: '+1-869-555-0102',
    email: 'jane.smith@email.com',
    address: '456 Church Street, Charlestown, Nevis'
  },
  {
    id: 'IP10003',
    ssn: '345-678-9012',
    firstName: 'Michael',
    lastName: 'Johnson',
    fullName: 'Michael Johnson',
    dateOfBirth: '1978-11-08',
    contactPhone: '+1-869-555-0103',
    email: 'michael.johnson@email.com',
    address: '789 Bay Road, Basseterre, St. Kitts'
  },
  {
    id: 'IP10004',
    ssn: '456-789-0123',
    firstName: 'Sarah',
    lastName: 'Williams',
    fullName: 'Sarah Williams',
    dateOfBirth: '1992-05-30',
    contactPhone: '+1-869-555-0104',
    email: 'sarah.williams@email.com',
    address: '321 Market Street, Basseterre, St. Kitts'
  },
  {
    id: 'IP10005',
    ssn: '567-890-1234',
    firstName: 'David',
    lastName: 'Brown',
    fullName: 'David Brown',
    dateOfBirth: '1980-09-12',
    contactPhone: '+1-869-555-0105',
    email: 'david.brown@email.com',
    address: '654 Fort Street, Basseterre, St. Kitts'
  }
];
