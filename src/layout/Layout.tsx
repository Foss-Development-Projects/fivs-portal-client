import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole, KYCStatus } from '@/types';
import { useGlobalState } from '@/context';
import { portalApi as api } from '@/services/portalApi';

interface LayoutProps {
  user: User;
  children: React.ReactNode;
  onLogout: () => void;
}

const SidebarItem: React.FC<{ to?: string, icon: string, label: string, badgeCount?: number, onClick?: () => void }> = ({ to, icon, label, badgeCount, onClick }) => {
  const commonClasses = (isActive: boolean) =>
    `w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${isActive
      ? 'bg-[#2E7D32] text-white shadow-md'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  const content = (
    <>
      <div className="flex items-center space-x-3">
        <span className="material-icons-outlined text-xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      {badgeCount && badgeCount > 0 ? (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">
          {badgeCount}
        </span>
      ) : null}
    </>
  );

  if (to) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) => commonClasses(isActive)}
      >
        {content}
      </NavLink>
    );
  }

  return (
    <button onClick={onClick} className={commonClasses(false)}>
      {content}
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ user, children, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString());
  const { darkMode, toggleDarkMode, notifications, tickets, isLoading, leads, showAlert } = useGlobalState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname.split('/')[1] || 'dashboard';

  const LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjQP3GbpiX6PTXwBPogsN7Z9GYViQF7RciaBSJ9sXPDGjhq5SY25Con616krp_COWQE8TkDZjJYNaPLR9Lk9z6VDs_ZYcL0zmABWLkumfWRTkFgBo8HBdFYfGUCV1KZmuliOc0v10Rm_7PGFXgPFwMipN_bonERXvYkH9I95mQzQqheiK9FRQltiA3NP4g/s320/Adobe%20Express%20-%20file.png";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (!isLoading) {
      setLastSync(new Date().toLocaleTimeString());
    }
  }, [isLoading]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter(n =>
      (n.recipientId === 'all' || n.recipientId === user.id) &&
      !n.readBy.includes(user.id)
    ).length;
  }, [notifications, user.id]);

  const openTicketCount = useMemo(() => {
    return user.role === UserRole.ADMIN
      ? tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length
      : 0;
  }, [tickets, user.role]);

  const dueRenewalCount = useMemo(() => {
    if (user.role !== UserRole.PARTNER) return 0;
    const now = new Date();
    return leads.filter(l => {
      if (!l.renewalDate || l.partnerId !== user.id) return false;
      const renewalDate = new Date(l.renewalDate);
      const diffTime = renewalDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0;
    }).length;
  }, [leads, user.id, user.role]);

  const navItems = user.role === UserRole.PARTNER ? [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'kyc', icon: 'verified_user', label: 'KYC' },
    { id: 'leads', icon: 'assignment', label: 'Leads' },
    { id: 'renewals', icon: 'update', label: 'Renewals', badge: dueRenewalCount },
    { id: 'wallet', icon: 'account_balance_wallet', label: 'Wallet' },
    { id: 'tickets', icon: 'support_agent', label: 'Support' },
    { id: 'notifications', icon: 'notifications', label: 'Alerts', badge: unreadNotifCount },
  ] : [
    { id: 'dashboard', icon: 'analytics', label: 'Overview' },
    { id: 'autofetch', icon: 'keyboard', label: 'Data Entry' },
    { id: 'payout-records', icon: 'receipt_long', label: 'Payout Logs' },
    { id: 'partners', icon: 'people', label: 'Partners' },
    { id: 'kyc-approval', icon: 'fact_check', label: 'KYC Review' },
    { id: 'all-leads', icon: 'list_alt', label: 'Leads' },
    { id: 'payouts', icon: 'payments', label: 'Payments' },
    { id: 'admin-tickets', icon: 'confirmation_number', label: 'Tickets', badge: openTicketCount },
    { id: 'admin-notifications', icon: 'send_time_extension', label: 'Broadcast' },
    { id: 'banner-management', icon: 'campaign', label: 'Banners' },
  ];

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    showAlert('Copied', 'Partner ID has been copied to clipboard.', 'success');
  };

  const handleBackup = async () => {
    try {
      const data = await api.exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FIVS_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (err) {
      showAlert('Export Error', "Failed to export system backup.", 'error');
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await api.importDatabase(ev.target?.result as string);
        showAlert('Migration Success', "Database restored successfully. Portal environment is refreshing...", 'success');
        window.location.reload();
      } catch (err) {
        showAlert('Integrity Error', "Invalid backup file format or data corrupted.", 'error');
      }
    };
    reader.readAsText(file);
  };

  const showKycAlert = user.role === UserRole.PARTNER && user.kycStatus !== KYCStatus.APPROVED;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 z-50 w-64 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-center">
          <div className="flex items-center">
            <img src={LOGO_URL} alt="FIVS Logo" className="h-12 w-auto object-contain" />
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
          {user.role === UserRole.PARTNER ? (
            <>
              {navItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  to={`/${item.id}`}
                  icon={item.icon}
                  label={item.label}
                  badgeCount={item.badge}
                />
              ))}
              <div className="pt-4 mt-4 border-t dark:border-gray-700">
                <p className="px-4 py-2 text-[10px] font-black uppercase text-gray-400">Account</p>
                <SidebarItem icon="logout" label="Logout" onClick={onLogout} />
              </div>
            </>
          ) : (
            <>
              {/* Admin Console */}
              <div className="mb-6">
                <p className="px-4 py-2 text-[10px] font-black uppercase text-gray-400">Admin Console</p>
                {[
                  { id: 'dashboard', icon: 'analytics', label: 'Overview' },
                  { id: 'data-entry', icon: 'keyboard', label: 'Data Entry' },
                  { id: 'payout-records', icon: 'receipt_long', label: 'Payout Logs' },
                ].map((item) => (
                  <SidebarItem
                    key={item.id}
                    to={`/${item.id}`}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
                <SidebarItem to="/admin-profile" icon="manage_accounts" label="My Account" />
              </div>

              {/* Partner Console */}
              <div className="mb-6">
                <p className="px-4 py-2 text-[10px] font-black uppercase text-gray-400">Partner Console</p>
                {[
                  { id: 'partners', icon: 'people', label: 'Partners' },
                  { id: 'kyc-approval', icon: 'fact_check', label: 'KYC Review' },
                  { id: 'all-leads', icon: 'list_alt', label: 'Leads' },
                  { id: 'payouts', icon: 'payments', label: 'Payments' },
                  { id: 'admin-tickets', icon: 'confirmation_number', label: 'Tickets', badge: openTicketCount },
                  { id: 'admin-notifications', icon: 'send_time_extension', label: 'Broadcast' },
                  { id: 'banner-management', icon: 'campaign', label: 'Banners' },
                ].map((item) => (
                  <SidebarItem
                    key={item.id}
                    to={`/${item.id}`}
                    icon={item.icon}
                    label={item.label}
                    badgeCount={item.badge}
                  />
                ))}
              </div>

              {/* Maintenance Console */}
              <div className="mb-6">
                <p className="px-4 py-2 text-[10px] font-black uppercase text-gray-400">Maintenance Console</p>
                <SidebarItem icon="cloud_download" label="Backup Data" onClick={handleBackup} />
                <SidebarItem icon="cloud_upload" label="Restore Data" onClick={() => fileInputRef.current?.click()} />
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
              </div>

              <div className="pt-4 mt-4 border-t dark:border-gray-700">
                <SidebarItem icon="logout" label="Logout" onClick={onLogout} />
              </div>
            </>
          )}
        </nav>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400">
                System Online
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-bold">{lastSync}</span>
          </div>
          <div
            onClick={handleCopyId}
            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <span className="text-[8px] font-black uppercase text-gray-400">UID: {user.id}</span>
            <span className="material-icons-outlined text-[12px] text-gray-400">content_copy</span>
          </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 lg:ml-64 w-full min-w-0`}>
        <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40 transition-colors duration-300">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 lg:hidden hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
              <span className="material-icons-outlined">menu</span>
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-200 capitalize truncate">
              {currentPath.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 flex hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-icons-outlined">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 sm:space-x-4 focus:outline-none"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{user.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{user.role}</p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]">{user.email}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#2E7D32] rounded-full flex items-center justify-center text-white shadow-md text-xs sm:text-base cursor-pointer hover:bg-opacity-90 transition-all">
                  {user.name?.charAt(0) || '?'}
                </div>
              </button>

              {/* Mobile Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 animate-scaleIn origin-top-right z-50">
                  <div className="px-4 py-3 border-b dark:border-gray-700 sm:hidden">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{user.role}</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/admin-profile');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
                  >
                    <span className="material-icons-outlined text-base mr-2">manage_accounts</span>
                    Account
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center"
                  >
                    <span className="material-icons-outlined text-base mr-2">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {showKycAlert && (
          <div className="bg-red-600 text-white px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn sticky top-16 z-30">
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <span className="material-icons-outlined animate-pulse hidden sm:block">report_problem</span>
              <p className="text-[10px] sm:text-sm font-black uppercase tracking-widest">
                Action Required: Please complete your KYC verification to resume payouts.
              </p>
            </div>
            <button
              onClick={() => navigate('/kyc')}
              className="bg-white text-red-600 px-4 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg whitespace-nowrap"
            >
              Go to KYC Segment
            </button>
          </div>
        )}

        <div className="p-4 sm:p-8 min-h-[calc(100vh-64px)]">
          {children}
        </div>
      </main>

      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
    </div>
  );
};
