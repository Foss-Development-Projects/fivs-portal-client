
import React from 'react';

export const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#81C784',
  secondary: '#757575',
  bg: '#f8fafc',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b'
};

export const CONTACT_INFO = {
  phone: '7872501894 / 7863908956',
  email: 'support@fivs.in',
  address: 'Tehatta, Shakuntala Lodge, Nadia, WB, 741160'
};

export const LEAD_TYPES = [
  { id: 'motor', label: 'Motor Insurance' },
  { id: 'health', label: 'Health Insurance' },
  { id: 'life', label: 'Life Insurance' },
  { id: 'sme', label: 'SME Insurance' }
];

export const INSURANCE_REQUIREMENTS = {
  motor: [
    'Previous Policy Copy',
    'Registration Certificate (RC) Copy',
    'Owner Identity Proof',
    'Vehicle Images (for break-in cases)'
  ],
  health: [
    'Proposer ID Proof (Aadhaar/PAN)',
    'Medical Reports (if over 45 years)',
    'Previous Policy (for Portability cases)',
    'Bank Account Details for ECS'
  ],
  life: [
    'Income Proof (Last 3 months salary slip/ITR)',
    'Identity & Address Proof',
    'Age Proof (School Leaving Certificate/Passport)',
    'Medical Examination Report'
  ],
  sme: [
    'Business Registration Certificate',
    'Financial Statements (Profit & Loss)',
    'Property Valuation Report',
    'Occupancy Certificate'
  ]
};

export const TICKET_CATEGORIES = [
  'Technical',
  'Payout',
  'Lead',
  'KYC',
  'Other'
];

export const WEB_AGGREGATORS = [
  'Policy Bazaar',
  'Turtlemint',
  'Insurance Dekho',
  'Choice',
  'Probus',
  'Shri',
  'RenewBuy',
  'Oriental Direct'
];

export const INSURANCE_COMPANIES = [
  // Government
  'Life Insurance Corporation of India (LIC)',
  'General Insurance Corporation of India (GIC)',
  'New India Assurance',
  'Oriental Insurance Company',
  'United India Insurance Company',
  'National Insurance Company',
  'Agriculture Insurance Company of India',
  // Private
  'HDFC ERGO General Insurance',
  'ICICI Lombard General Insurance',
  'Bajaj Allianz General Insurance',
  'Tata AIG General Insurance',
  'SBI General Insurance',
  'IFFCO Tokio General Insurance',
  'Reliance General Insurance',
  'Star Health & Allied Insurance',
  'Niva Bupa Health Insurance',
  'Digit General Insurance',
  'Care Health Insurance',
  'Acko General Insurance',
  'Royal Sundaram General Insurance',
  'Future Generali India Insurance',
  'Chola MS General Insurance',
  'Magma HDI General Insurance',
  'Kotak Mahindra General Insurance',
  'Zuno General Insurance',
  'Liberty General Insurance',
  'Shriram General Insurance'
];

export const RELATIONS_LIST = [
  'Father', 'Mother', 'Spouse', 'Brother', 'Sister', 
  'Son', 'Daughter', 'Friend', 'Business Partner', 
  'Employee', 'Agent', 'Other'
];
