import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole, UserStatus, KYCStatus, Lead, LeadStatus, Transaction, Notification, Ticket, Banner, PayoutReport, ProfitReport, AutoFetchRecord, AdminPayoutRecord } from './types';
import { Layout } from './layout/Layout';
import { StateContext } from './context';
import { portalApi as api } from '@/services/portalApi';
import { MOCK_ADMIN, MOCK_BANNERS } from './services/mockData';
import Home from './pages/Home';
import PartnerDashboard from './pages/Partner/Dashboard';
import PartnerKYC from './pages/Partner/KYC';
import PartnerLeads from './pages/Partner/Leads';
import PartnerRenewals from './pages/Partner/Renewals';
import PartnerWallet from './pages/Partner/Wallet';
import PartnerTickets from './pages/Partner/Tickets';
import PartnerNotifications from './pages/Partner/Notifications';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminPartners from './pages/Admin/Partners';
import AdminKYC from './pages/Admin/KYC';
import AdminLeads from './pages/Admin/Leads';
import AdminBanners from './pages/Admin/Banners';
import AdminPayouts from './pages/Admin/Payouts';
import AdminPayoutRecords from './pages/Admin/PayoutRecords';
import AdminNotifications from './pages/Admin/Notifications';
import AdminTickets from './pages/Admin/Tickets';
import AdminAutoFetch from './pages/Admin/AutoFetchRecords';

import './assets/css/app.css';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPartnerIdForKyc, setSelectedPartnerIdForKyc] = useState<string | null>(null);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('fivs_session_user_dark_mode');
    return saved === 'true';
  });

  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutReports, setPayoutReports] = useState<PayoutReport[]>([]);
  const [adminProfitReports, setAdminProfitReports] = useState<ProfitReport[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [autoFetchRecords, setAutoFetchRecords] = useState<AutoFetchRecord[]>([]);
  const [adminPayoutRecords, setAdminPayoutRecords] = useState<AdminPayoutRecord[]>([]);

  // 1. Initial hydration from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('fivs_session_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('fivs_session_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fivs_session_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('fivs_session_user');
    }
  }, [currentUser]);

  // Sync Logic
  const isSyncingRef = useRef(false);
  const syncData = useCallback(async (isInitial = false) => {
    if (!currentUser) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const [
        dbUsers, dbBanners, dbLeads, dbTx,
        dbPayoutReports, dbProfitReports, dbTickets, dbNotifications,
        dbAutoFetch, dbAdminPayoutRecords
      ] = await Promise.all([
        api.getUsers(),
        api.getBanners(),
        api.getLeads(),
        api.getTransactions(),
        api.getPayoutReports(),
        api.getProfitReports(),
        api.getTickets(),
        api.getNotifications(),
        api.getAutoFetchRecords(),
        api.getAdminPayoutRecords()
      ]);

      setUsers(Array.isArray(dbUsers) ? dbUsers : []);
      setLeads(Array.isArray(dbLeads) ? dbLeads : []);
      setTransactions(Array.isArray(dbTx) ? dbTx : []);
      setPayoutReports(Array.isArray(dbPayoutReports) ? dbPayoutReports : []);
      setAdminProfitReports(Array.isArray(dbProfitReports) ? dbProfitReports : []);
      setBanners(Array.isArray(dbBanners) ? dbBanners : []);
      setTickets(Array.isArray(dbTickets) ? dbTickets : []);
      setNotifications(Array.isArray(dbNotifications) ? dbNotifications : []);
      setAutoFetchRecords(Array.isArray(dbAutoFetch) ? dbAutoFetch : []);
      setAdminPayoutRecords(Array.isArray(dbAdminPayoutRecords) ? dbAdminPayoutRecords : []);
      setError(null);
    } catch (err: any) {
      console.debug("Background sync idle:", err.message);
      if (isInitial && users.length === 0) {
        setError(`Connectivity Issue: ${err.message}`);
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      syncData(true);
    }
  }, [currentUser, syncData]);

  useEffect(() => {
    localStorage.setItem('fivs_session_user_dark_mode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Placeholder methods to match context
  const updateUser = async (id: string, data: any) => { await api.updateUser(id, data); syncData(); };
  const registerUser = async (user: User) => { await api.register(user); syncData(); };
  const addLead = async (lead: Lead) => { await api.addLead(lead); syncData(); };
  const updateLead = async (id: string, data: any) => { await api.updateLead(id, data); syncData(); };
  const addTicket = async (ticket: Ticket) => { await api.addTicket(ticket); syncData(); };
  const updateTicket = async (id: string, data: any) => { await api.updateTicket(id, data); syncData(); };
  const updateBanner = async (id: string, updates: Partial<Banner>) => { await api.updateBanner(id, updates); syncData(); };
  const addTransaction = async (tx: Transaction) => { await api.addTransaction(tx); syncData(); };
  const resetKYC = async (id: string) => { await api.updateUser(id, { kycStatus: KYCStatus.NOT_SUBMITTED, kycDocuments: [] }); syncData(); };
  const generateMonthlyReport = async (partnerId: string, month: string) => { /* logic */ };
  const generateProfitReport = async (month: string) => { /* logic */ };
  const sendNotification = async (notif: Notification) => { await api.addNotification(notif); syncData(); };
  const markNotificationAsRead = async (id: string) => {
    if (!currentUser) return;
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      await api.updateNotification(id, { readBy: [...notif.readBy, currentUser.id] });
      syncData();
    }
  };
  const saveAutoFetchRecord = async (rec: AutoFetchRecord) => { await api.saveAutoFetchRecord(rec); syncData(); };
  const deleteAutoFetchRecord = async (id: string) => { await api.deleteAutoFetchRecord(id); syncData(); };
  const saveAdminPayoutRecord = async (rec: AdminPayoutRecord) => { await api.saveAdminPayoutRecord(rec); syncData(); };
  const deleteAdminPayoutRecord = async (id: string) => { await api.deleteAdminPayoutRecord(id); syncData(); };

  if (isLoading) {
    return (
      <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Booting Portal Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <StateContext.Provider value={{
      users, leads, transactions, notifications, tickets, banners, payoutReports, adminProfitReports, autoFetchRecords, adminPayoutRecords, currentUser, darkMode, isLoading,
      selectedPartnerIdForKyc, setSelectedPartnerIdForKyc,
      toggleDarkMode, updateUser, registerUser, addLead, updateLead, addTicket, updateTicket, updateBanner, addTransaction, resetKYC, setCurrentUser,
      generateMonthlyReport, generateProfitReport,
      sendNotification, markNotificationAsRead,
      saveAutoFetchRecord, deleteAutoFetchRecord,
      saveAdminPayoutRecord, deleteAdminPayoutRecord,
      redemptionRequests: []
    }}>
      <div className={darkMode ? 'dark' : ''}>
        {!currentUser ? (
          <Home onLogin={() => navigate('/dashboard')} />
        ) : (
          <Layout
            user={currentUser}
            onLogout={() => {
              setCurrentUser(null);
              localStorage.removeItem('fivs_session_user');
              localStorage.removeItem('fivs_auth_token');
              navigate('/');
            }}
          >
            <Routes>
              {currentUser.role === UserRole.PARTNER ? (
                <>
                  <Route path="/dashboard" element={<PartnerDashboard user={currentUser} />} />
                  <Route path="/kyc" element={<PartnerKYC user={currentUser} />} />
                  <Route path="/leads" element={<PartnerLeads user={currentUser} />} />
                  <Route path="/renewals" element={<PartnerRenewals user={currentUser} />} />
                  <Route path="/wallet" element={<PartnerWallet user={currentUser} />} />
                  <Route path="/tickets" element={<PartnerTickets user={currentUser} />} />
                  <Route path="/notifications" element={<PartnerNotifications user={currentUser} />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              ) : (
                <>
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/partners" element={<AdminPartners />} />
                  <Route path="/kyc-approval" element={<AdminKYC />} />
                  <Route path="/all-leads" element={<AdminLeads />} />
                  <Route path="/autofetch" element={<AdminAutoFetch />} />
                  <Route path="/payout-records" element={<AdminPayoutRecords />} />
                  <Route path="/banner-management" element={<AdminBanners />} />
                  <Route path="/payouts" element={<AdminPayouts />} />
                  <Route path="/admin-notifications" element={<AdminNotifications />} />
                  <Route path="/admin-tickets" element={<AdminTickets />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
          </Layout>
        )}
      </div>
    </StateContext.Provider>
  );
};

export default App;
