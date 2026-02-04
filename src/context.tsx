
import { createContext, useContext } from 'react';
import { User, Lead, Transaction, Notification, Ticket, Banner, RedemptionRequest, PayoutReport, ProfitReport, AutoFetchRecord, AdminPayoutRecord } from './types';

export interface GlobalState {
  users: User[];
  leads: Lead[];
  transactions: Transaction[];
  notifications: Notification[];
  tickets: Ticket[];
  banners: Banner[];
  redemptionRequests: RedemptionRequest[];
  payoutReports: PayoutReport[];
  adminProfitReports: ProfitReport[];
  autoFetchRecords: AutoFetchRecord[];
  adminPayoutRecords: AdminPayoutRecord[];
  currentUser: User | null;
  darkMode: boolean;
  isLoading: boolean;
  selectedPartnerIdForKyc: string | null;
  setSelectedPartnerIdForKyc: (id: string | null) => void;
  toggleDarkMode: () => void;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  registerUser: (userData: Omit<User, 'id' | 'status' | 'kycStatus' | 'leadSubmissionEnabled'>) => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'submittedAt'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  updateBanner: (id: string, updates: Partial<Banner>) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  resetKYC: (userId: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  generateMonthlyReport: (partnerId: string, month: string) => Promise<void>;
  generateProfitReport: (month: string) => Promise<void>;
  sendNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'readBy'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;

  // AutoFetch Module Functions
  saveAutoFetchRecord: (record: any) => Promise<void>;
  deleteAutoFetchRecord: (id: string) => Promise<void>;

  // Admin Payout Records Functions
  saveAdminPayoutRecord: (record: AdminPayoutRecord) => Promise<void>;
  deleteAdminPayoutRecord: (id: string) => Promise<void>;

  // Alert System
  showAlert: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'warning' | 'error' | 'info') => void;
}

export const StateContext = createContext<GlobalState | undefined>(undefined);

export const useGlobalState = () => {
  const context = useContext(StateContext);
  if (!context) throw new Error('useGlobalState must be used within StateProvider');
  return context;
};
