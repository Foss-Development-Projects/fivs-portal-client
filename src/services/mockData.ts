
import { User, UserRole, UserStatus, KYCStatus, LeadStatus, Lead, Banner, Ticket, AutoFetchRecord, Notification, Transaction } from '@/types';

export const MOCK_ADMIN: User = {
  id: 'admin-1',
  name: 'System Admin',
  email: 'admin@fivs.in',
  mobile: '9876543210',
  username: 'admin001',
  role: UserRole.ADMIN,
  status: UserStatus.APPROVED,
  kycStatus: KYCStatus.APPROVED,
  leadSubmissionEnabled: true
};

export const MOCK_PARTNERS: User[] = [
  {
    id: 'P1001',
    name: 'Rahul Kumar',
    email: 'rahul.k@example.com',
    mobile: '9876500001',
    username: 'rahul_k',
    role: UserRole.PARTNER,
    status: UserStatus.APPROVED,
    kycStatus: KYCStatus.APPROVED,
    leadSubmissionEnabled: true,
    category: 'Gold',
    accountHolder: 'Rahul Kumar',
    bankName: 'HDFC Bank',
    accountNumber: '501002345678',
    ifscCode: 'HDFC0001234'
  },
  {
    id: 'P1002',
    name: 'Priya Singh',
    email: 'priya.s@example.com',
    mobile: '9876500002',
    username: 'priya_s',
    role: UserRole.PARTNER,
    status: UserStatus.PENDING,
    kycStatus: KYCStatus.UNDER_REVIEW,
    leadSubmissionEnabled: false,
    kycDocuments: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', '', '', '', '']
  },
  {
    id: 'P1003',
    name: 'Vikram Malhotra',
    email: 'vikram.m@example.com',
    mobile: '9876500003',
    username: 'vikram_m',
    role: UserRole.PARTNER,
    status: UserStatus.FROZEN,
    kycStatus: KYCStatus.REJECTED,
    leadSubmissionEnabled: true,
    kycReason: 'Blurry Documents'
  }
];

export const MOCK_LEADS: Lead[] = [
  {
    id: 'L2024001',
    partnerId: 'P1001',
    leadType: 'motor',
    leadCategory: 'admin',
    customerName: 'Amit Sharma',
    customerMobile: '9988776655',
    status: LeadStatus.POLICY_ISSUED,
    commission: 1500,
    partnerCommission: 1200,
    adminCommission: 1500,
    submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    policyUrl: 'https://example.com/policy.pdf',
    payoutStatus: 'credited',
    payoutTransactionId: 'UTR123456789',
    payoutDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    insuranceCompany: 'HDFC ERGO',
    policyType: 'Comprehensive',
    renewalDate: new Date(Date.now() + 86400000 * 360).toISOString(),
    isRenewal: false
  },
  {
    id: 'L2024002',
    partnerId: 'P1001',
    leadType: 'health',
    leadCategory: 'self',
    customerName: 'Sneha Gupta',
    customerMobile: '9988776644',
    status: LeadStatus.SUBMITTED,
    commission: 0,
    partnerCommission: 0,
    adminCommission: 0,
    submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    insuranceCompany: 'Star Health',
    policyType: 'Family Floater',
    preferredInsurers: ['Star Health', 'Niva Bupa']
  },
  {
    id: 'L2024003',
    partnerId: 'P1002',
    leadType: 'life',
    leadCategory: 'admin',
    customerName: 'Rajiv Mehta',
    customerMobile: '9988776633',
    status: LeadStatus.IN_REVIEW,
    commission: 0,
    partnerCommission: 0,
    adminCommission: 0,
    submittedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    messages: [
      { id: 'm1', senderId: 'P1002', senderName: 'Priya Singh', text: 'Client is asking for high coverage term plan.', timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'L2024004',
    partnerId: 'P1001',
    leadType: 'motor',
    leadCategory: 'admin',
    customerName: 'Arun Varma',
    customerMobile: '9123456789',
    status: LeadStatus.POLICY_ISSUED,
    commission: 0,
    partnerCommission: 500,
    adminCommission: 800,
    submittedAt: new Date(Date.now() - 86400000 * 400).toISOString(),
    renewalDate: new Date(Date.now() + 86400000 * 10).toISOString(), // Due in 10 days
    isRenewal: false,
    policyUrl: 'https://example.com/old_policy.pdf'
  }
];

export const MOCK_BANNERS: Banner[] = [
  { id: 'B1', title: 'Grand Diwali Offer - 2x Commission!', imageUrl: 'https://images.unsplash.com/photo-1554034483-04fda0d3507b?q=80&w=2070', endDate: new Date(Date.now() + 86400000 * 15).toISOString(), isActive: true }
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'T3001',
    partnerId: 'P1001',
    subject: 'Payout Discrepancy',
    category: 'Payout',
    priority: 'high',
    status: 'resolved',
    description: 'I received 1000 instead of 1200 for Lead #L2024001',
    adminResponse: 'Corrected. The remaining amount has been credited via UTR9988.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'T3002',
    partnerId: 'P1002',
    subject: 'KYC Verification Pending',
    category: 'KYC',
    priority: 'medium',
    status: 'open',
    description: 'Uploaded documents 2 days ago. Please check.',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

export const MOCK_AUTOFETCH: AutoFetchRecord[] = [
  {
    id: 'RAJESH5678',
    timestamp: new Date().toLocaleString(),
    ownerName: 'Rajesh Koothrappali',
    ownerAddress: 'Flat 4A, Galaxy Apts, Mumbai',
    vehicleRegNo: 'MH02CB1234',
    engineNo: 'ENG898989',
    chassisNo: 'CHAS787878',
    policyNo: 'POL909090',
    policyIssueDate: '2023-05-10',
    policyStartDate: '2023-05-15',
    policyEndDate: '2024-05-14',
    renewalDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], // Expired recently
    vehicleType: 'Private Car',
    vehicleClass: 'LMV',
    panNo: 'ABCDE1234F',
    dob: '1990-01-01',
    aadhaarNo: '123456789012',
    remarks: 'Customer interested in comprehensive',
    ownerPhone: '9876543210',
    specialNotes: '',
    ownerProfession: 'Software Engineer',
    contacts: [{ id: '1', name: 'Penny', relation: 'Spouse', phone: '9123456789' }],
    brokerName: 'Local Agent',
    brokerPhone: '',
    brokerProfession: '',
    brokerAddress: '',
    webAggregator: 'Policy Bazaar',
    insuranceCompany: 'ICICI Lombard',
    insuranceType: 'COMPREHENSIVE',
    isNameTransfer: false,
    nameTransferDate: '',
    documents: {},
    status: 'renewal-due',
    lastUpdated: new Date().toISOString()
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'N4001',
    recipientId: 'all',
    type: 'general',
    title: 'Welcome to the New Portal',
    message: 'We have updated our partner portal with AutoFetch features.',
    readBy: [],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    priority: 'normal'
  },
  {
    id: 'N4002',
    recipientId: 'P1001',
    type: 'alert',
    title: 'Policy Renewal Reminder',
    message: 'Lead #L2024004 is due for renewal in 10 days.',
    readBy: [],
    createdAt: new Date().toISOString(),
    priority: 'high'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [];
