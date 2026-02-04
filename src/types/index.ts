
export enum UserRole {
  ADMIN = 'admin',
  PARTNER = 'partner'
}

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
  FROZEN = 'frozen'
}

export enum KYCStatus {
  NOT_SUBMITTED = 'not_submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum LeadStatus {
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in-review',
  POLICY_ISSUED = 'policy-issued',
  CONVERTED = 'converted',
  REJECTED = 'rejected'
}

export type PayoutStatus = 'credited' | 'pending' | 'pre-payout';

export interface LeadMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  fileUrl?: string;
}

export interface Lead {
  id: string;
  partnerId: string;
  leadType: 'motor' | 'health' | 'life' | 'sme';
  leadCategory: 'self' | 'admin';
  customerName: string;
  customerMobile: string;
  status: LeadStatus;
  commission: number;
  partnerCommission: number;
  adminCommission: number;
  submittedAt: string;
  customerNotes?: string;
  partnerProcessNotes?: string;
  specialNote?: string;
  policyUrl?: string;
  adminNotes?: string;
  documents?: string[];
  messages?: LeadMessage[];
  payoutStatus?: PayoutStatus;
  payoutTransactionId?: string;
  payoutDate?: string;
  readBy?: string[];
  // Existing Enhanced Fields
  aggregator?: string;
  insuranceCompany?: string;
  policyType?: string;
  isNameTransfer?: boolean;
  nameTransferDate?: string;
  // New Partner Only Field
  preferredInsurers?: string[];
  // Renewal Fields
  renewalDate?: string;
  isRenewal?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: KYCStatus;
  leadSubmissionEnabled: boolean;
  category?: string;
  kycReason?: string;
  kycDocuments?: string[];
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolder?: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface AutoFetchRecord {
  id: string; // Generated: CUSTOMERNAME + Last4Aadhar
  timestamp: string; // Immutable, first column

  // Auto-Fetched Fields
  ownerName: string;
  ownerAddress: string;
  vehicleRegNo: string;
  engineNo: string;
  chassisNo: string;
  policyNo: string;
  policyIssueDate: string;
  policyStartDate: string;
  policyEndDate: string;
  renewalDate: string;
  vehicleType: string;
  vehicleClass: string; // New field for RC Front extraction
  panNo: string;
  dob: string;
  aadhaarNo: string;

  // Manual Inputs
  remarks: string;
  ownerPhone: string;
  specialNotes: string;
  ownerProfession: string;

  // Multiple Contacts
  contacts: ContactPerson[];

  // Broker Details
  brokerName: string;
  brokerPhone: string;
  brokerProfession: string;
  brokerAddress: string;

  // Admin Only Manual Fields
  webAggregator: string;
  insuranceCompany: string;
  insuranceType: 'OD' | 'TP' | 'COMPREHENSIVE';
  isNameTransfer: boolean;
  nameTransferDate: string;

  // Documents
  documents: {
    policyCopy?: string;
    endorsementCopy?: string; // New
    rcFront?: string; // Renamed
    rcBack?: string; // New
    panCard?: string;
    aadhaarCard?: string;
    aadhaarBack?: string;
    voterFront?: string;
    voterBack?: string;
  };

  status: 'fresh' | 'renewal-due' | 'renewed' | 'missed';
  lastUpdated: string;
}

export interface AdminPayoutRecord {
  id: string; // Same as Lead ID for association
  timestamp: string;
  customerName: string;
  vehicleNumber: string;
  insuranceCompany: string;
  aggregatorName: string;
  policyType: string;

  // Manual Fields
  totalPremiumWithGst?: number;
  premiumAmount: number; // Policy Amount without GST
  commissionRate: number;
  // Fix: Added 'Fixed' to valid commissionOn options to resolve type narrowing issues in Admin/PayoutRecords.tsx
  commissionOn: 'Net' | 'OD' | 'TP' | 'OD+TP' | 'ONLINE POINTS' | 'N/A' | 'NOT KNOWN' | 'Fixed';

  // OD+TP Specific Fields & New Logic Support
  odPremium?: number;
  tpPremium?: number;
  netPremium?: number; // Manual entry for NET commission
  points?: number; // Manual entry for ONLINE POINTS

  odPercentage?: number;
  tpPercentage?: number;

  // Calculation derivation
  earning?: number;
  tds?: number;
  tdsRate?: number; // New: Percentage for TDS
  amountAfterTds?: number;

  discount: number;
  brokerPayment: number;
  otherExpense?: number; // New field
  netProfit: number;
  paymentReceived: 'Yes' | 'No'; // Internal: Yes=Received, No=Pending
  remarks: 'Renewal' | 'New';

  lastUpdated: string;
}

export interface Transaction {
  id: string;
  partnerId: string;
  date: string;
  redeemableDate?: string;
  type: 'Credit' | 'Debit';
  category: string;
  details: string;
  amount: number;
  leadId?: string;
  customerName?: string;
}

export interface PayoutReport {
  id: string;
  month: string;
  partnerId: string;
  partnerName: string;
  totalEarnings: number;
  generatedDate: string;
  csvData: string;
}

export interface ProfitReport {
  id: string;
  month: string;
  totalRevenue: number;
  totalPayouts: number;
  profit: number;
  generatedDate: string;
  csvData: string;
}

export type NotificationType = 'general' | 'meeting' | 'product' | 'update' | 'alert';

export interface Notification {
  id: string;
  recipientId: string | 'all';
  type: NotificationType;
  title: string;
  message: string;
  readBy: string[];
  createdAt: string;
  priority: 'normal' | 'high';
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  endDate: string;
  isActive: boolean;
}

export interface Ticket {
  id: string;
  partnerId: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  description: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RedemptionRequest {
  id: string;
  partnerId: string;
  amount: number;
  period: string;
  status: 'pending' | 'completed' | 'rejected';
  requestDate: string;
  processedDate?: string;
  transactionId?: string;
}
