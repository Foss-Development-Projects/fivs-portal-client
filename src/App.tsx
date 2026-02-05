import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole, UserStatus, KYCStatus, Lead, LeadStatus, Transaction, Notification, Ticket, Banner, PayoutReport, ProfitReport, AutoFetchRecord, AdminPayoutRecord } from './types';
import { Layout } from './layout/Layout';
import { StateContext } from './context';
import { portalApi as api } from '@/services/portalApi';
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
import AdminProfile from './pages/Admin/AdminProfile';
import { initFormPersistence } from './utils/formPersistence';

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
  const [alert, setAlert] = useState<{ title: string, message: string, type: 'success' | 'warning' | 'error' | 'info', onConfirm?: () => void } | null>(null);

  const showAlert = useCallback((title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setAlert({ title, message, type });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'warning' | 'error' | 'info' = 'warning') => {
    setAlert({ title, message, type, onConfirm });
  }, []);

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

  // Form persistence initialization
  useEffect(() => {
    const cleanup = initFormPersistence();
    return cleanup;
  }, [location.pathname]); // Re-initialize or re-scan on route changes

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

      // REFRESH CURRENT USER: Update current user state with latest data from DB
      if (currentUser && Array.isArray(dbUsers)) {
        const freshUser = dbUsers.find(u => u.id === currentUser.id);
        if (freshUser) {
          // Check if user data actually changed to prevent infinite loops
          const hasChanged =
            freshUser.name !== currentUser.name ||
            freshUser.email !== currentUser.email ||
            freshUser.mobile !== currentUser.mobile ||
            freshUser.role !== currentUser.role ||
            freshUser.status !== currentUser.status;

          if (hasChanged) {
            setCurrentUser(freshUser);
          }
        }
      }

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
      showAlert, showConfirm,
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
                  <Route path="/data-entry" element={<AdminAutoFetch />} />
                  <Route path="/payout-records" element={<AdminPayoutRecords />} />
                  <Route path="/banner-management" element={<AdminBanners />} />
                  <Route path="/payouts" element={<AdminPayouts />} />
                  <Route path="/admin-notifications" element={<AdminNotifications />} />
                  <Route path="/admin-tickets" element={<AdminTickets />} />
                  <Route path="/admin-profile" element={<AdminProfile />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
          </Layout>
        )}

        {/* Global Alert Modal */}
        {alert && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm overflow-hidden animate-scaleIn">
              <div className={`p-8 ${alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400' :
                alert.type === 'error' ? 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400' :
                  alert.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400' :
                    'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400'
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="material-icons-outlined text-4xl">
                    {alert.type === 'success' ? 'check_circle' :
                      alert.type === 'error' ? 'error' :
                        alert.type === 'warning' ? 'warning' : 'info'}
                  </span>
                  <button onClick={() => setAlert(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <span className="material-icons-outlined">close</span>
                  </button>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter mb-2">{alert.title}</h3>
                <p className="text-[11px] font-bold opacity-80 leading-relaxed uppercase tracking-widest">{alert.message}</p>
                <div className="mt-8 flex gap-4">
                  {alert.onConfirm ? (
                    <>
                      <button
                        onClick={() => setAlert(null)}
                        className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          alert.onConfirm?.();
                          setAlert(null);
                        }}
                        className={`flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${alert.type === 'success' ? 'bg-green-600 text-white shadow-green-200 dark:shadow-none' :
                          alert.type === 'error' ? 'bg-red-600 text-white shadow-red-200 dark:shadow-none' :
                            alert.type === 'warning' ? 'bg-orange-600 text-white shadow-orange-200 dark:shadow-none' :
                              'bg-blue-600 text-white shadow-blue-200 dark:shadow-none'
                          }`}
                      >
                        Confirm Action
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setAlert(null)}
                      className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${alert.type === 'success' ? 'bg-green-600 text-white shadow-green-200 dark:shadow-none' :
                        alert.type === 'error' ? 'bg-red-600 text-white shadow-red-200 dark:shadow-none' :
                          alert.type === 'warning' ? 'bg-orange-600 text-white shadow-orange-200 dark:shadow-none' :
                            'bg-blue-600 text-white shadow-blue-200 dark:shadow-none'
                        }`}
                    >
                      Got It
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StateContext.Provider>
  );
};

export default App;
