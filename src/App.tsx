import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { User, UserRole, UserStatus, KYCStatus, Lead, LeadStatus, Transaction, Notification, Ticket, Banner, PayoutReport, ProfitReport, AutoFetchRecord, AdminPayoutRecord } from './types';
import { Layout } from './layout/Layout';
import { StateContext } from './context';
import { portalApi as api } from '@/services/api.service';
import Home from './pages/Home';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminPayoutRecords from './pages/Admin/PayoutRecords';
import AdminAutoFetch from './pages/Admin/AutoFetchRecords';
import AdminProfile from './pages/Admin/AdminProfile';
import { initFormPersistence } from './utils/formPersistence';
import ErrorPage from './pages/ErrorPage';
import { AdminGuard, AuthGuard } from './components/RouteGuards';

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
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  const showAlert = useCallback((title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setAlert({ title, message, type });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'warning' | 'error' | 'info' = 'warning') => {
    setAlert({ title, message, type, onConfirm });
  }, []);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore cleanup errors
    }
    setCurrentUser(null);
    localStorage.removeItem('fivs_session_user');
    localStorage.removeItem('fivs_auth_token');
    localStorage.removeItem('fivs_session_timestamp');
    navigate('/');
  }, [navigate]);

  // 1. Initial hydration from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('fivs_session_user');
    const sessionTimestamp = localStorage.getItem('fivs_session_timestamp');

    if (savedUser && sessionTimestamp) {
      const loginTime = parseInt(sessionTimestamp, 10);
      const currentTime = Date.now();
      const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

      if (currentTime - loginTime > sessionDuration) {
        // Session expired
        logout();
      } else {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
          logout();
        }
      }
    }
    setIsLoading(false);
  }, [logout]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fivs_session_user', JSON.stringify(currentUser));
      // Set timestamp only if it doesn't already exist (to preserve initial login time)
      if (!localStorage.getItem('fivs_session_timestamp')) {
        localStorage.setItem('fivs_session_timestamp', Date.now().toString());
      }
    } else {
      localStorage.removeItem('fivs_session_user');
      localStorage.removeItem('fivs_session_timestamp');
    }
  }, [currentUser]);

  // Periodic session check (every 5 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const checkInterval = setInterval(() => {
      const sessionTimestamp = localStorage.getItem('fivs_session_timestamp');
      if (sessionTimestamp) {
        const loginTime = parseInt(sessionTimestamp, 10);
        const currentTime = Date.now();
        const sessionDuration = 24 * 60 * 60 * 1000;

        if (currentTime - loginTime > sessionDuration) {
          logout();
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(checkInterval);
  }, [currentUser, logout]);

  // Form persistence initialization
  useEffect(() => {
    const cleanup = initFormPersistence();
    return cleanup;
  }, [location.pathname]); // Re-initialize or re-scan on route changes

  // Sync Logic
  const isSyncingRef = useRef(false);
  const syncData = useCallback(async (isInitial = false) => {
    // We check for currentUser at call time, not in dependencies
    const currentToken = localStorage.getItem('fivs_auth_token');
    if (!currentToken) return;

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

      // REFRESH CURRENT USER using functional update to avoid dependency
      if (Array.isArray(dbUsers)) {
        setCurrentUser(prev => {
          if (!prev) return null;
          const fresh = dbUsers.find(u => u.id === prev.id);
          if (!fresh) return prev;

          const hasChanged =
            fresh.name !== prev.name ||
            fresh.email !== prev.email ||
            fresh.mobile !== prev.mobile ||
            fresh.role !== prev.role ||
            fresh.status !== prev.status;

          return hasChanged ? fresh : prev;
        });
      }

      setError(null);
    } catch (err: any) {
      if (isInitial && users.length === 0) {
        setError(`Connectivity Issue: ${err.message}`);
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []); // NO DEPENDENCIES

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
      showAlert, showConfirm, showToast,
      redemptionRequests: []
    }}>
      <div className={`${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} min-h-screen transition-colors duration-300`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={!currentUser ? <Home onLogin={() => navigate('/overview')} /> : <Navigate to="/overview" replace />} />

          {/* Protected Routes */}
          <Route element={<AuthGuard user={currentUser} />}>
            <Route element={
              <Layout user={currentUser!} onLogout={logout}>
                <Outlet />
              </Layout>
            }>
              {/* Admin Routes */}
              <Route element={<AdminGuard user={currentUser} />}>
                <Route path="/overview" element={<AdminDashboard />} />
                <Route path="/data-entry" element={<AdminAutoFetch />} />
                <Route path="/payout-records" element={<AdminPayoutRecords />} />
                <Route path="/my-account" element={<AdminProfile />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all - 404 */}
          <Route path="*" element={<ErrorPage type="404" />} />
        </Routes>

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
                          const onConfirm = alert.onConfirm;
                          setAlert(null);
                          onConfirm?.();
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
        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-12 right-12 z-[12000] animate-slideUp">
            <div className={`px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 flex items-center gap-5 transition-all outline outline-4 outline-white/10 ${toast.type === 'success' ? 'bg-[#2E7D32] text-white border-green-400' :
              toast.type === 'error' ? 'bg-red-600 text-white border-red-400' :
                toast.type === 'warning' ? 'bg-orange-600 text-white border-orange-400' :
                  'bg-blue-600 text-white border-blue-400'
              }`}>
              <span className="material-icons-outlined">
                {toast.type === 'success' ? 'check_circle' :
                  toast.type === 'error' ? 'error' :
                    toast.type === 'warning' ? 'warning' : 'info'}
              </span>
              <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </StateContext.Provider>
  );
};

export default App;
