
import React, { useMemo } from 'react';
import { useGlobalState } from '@/context';
import { KYCStatus, LeadStatus, UserStatus, Lead, User, Ticket } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard: React.FC = () => {
  const { users, leads, tickets, darkMode } = useGlobalState();

  const stats = useMemo(() => {
    const finalizedLeads = leads.filter((l: Lead) => l.status === LeadStatus.CONVERTED || l.status === LeadStatus.POLICY_ISSUED);
    const totalRevenue = finalizedLeads.reduce((sum: number, l: Lead) => sum + (l.adminCommission || 0), 0);
    const totalPayouts = finalizedLeads.reduce((sum: number, l: Lead) => sum + (l.partnerCommission || 0), 0);
    const netProfit = totalRevenue - totalPayouts;

    return {
      partners: users.filter((u: User) => u.role === 'partner').length,
      pendingKYC: users.filter((u: User) => u.role === 'partner' && u.kycStatus === KYCStatus.UNDER_REVIEW).length,
      pendingLeads: leads.filter((l: Lead) => l.status === LeadStatus.SUBMITTED).length,
      pendingRegistrations: users.filter((u: User) => u.role === 'partner' && u.status === UserStatus.PENDING).length,
      totalRevenue,
      totalPayouts,
      netProfit,
      openTickets: tickets.filter((t: Ticket) => t.status === 'open').length
    };
  }, [users, leads, tickets]);

  const urgentActions = [
    { label: 'New Registrations', count: stats.pendingRegistrations, color: 'text-blue-600 bg-blue-50', icon: 'person_add' },
    { label: 'KYC Reviews', count: stats.pendingKYC, color: 'text-orange-600 bg-orange-50', icon: 'verified' },
    { label: 'New Leads', count: stats.pendingLeads, color: 'text-green-600 bg-green-50', icon: 'assignment_late' },
    { label: 'Open Tickets', count: stats.openTickets, color: 'text-red-600 bg-red-50', icon: 'support_agent' }
  ].filter(a => a.count > 0);

  const chartData = [
    { name: 'Current', revenue: stats.totalRevenue, payouts: stats.totalPayouts },
    { name: 'Profit', revenue: stats.netProfit, payouts: 0 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Introduction Banner */}
      <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-gradient-to-r from-gray-900 to-green-900 text-white shadow-2xl border border-white/5 group">
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <span className="material-icons-outlined text-green-400 text-3xl">admin_panel_settings</span>
            <h3 className="text-xl font-black uppercase tracking-widest">Admin Control Center</h3>
          </div>
          <p className="text-green-100/80 text-sm font-medium max-w-lg">
            Welcome back. Monitor real-time performance, audit payouts, and manage partner relationships from a centralized hub.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
          <span className="material-icons-outlined text-[120px]">dashboard</span>
        </div>
      </div>

      {urgentActions.length > 0 && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border-l-[8px] border-orange-500 transition-all hover:shadow-md">
          <h3 className="text-lg font-black text-gray-800 dark:text-white mb-6 tracking-tight flex items-center">
            <span className="material-icons-outlined mr-2 text-orange-500">notification_important</span>
            Urgent Action Items
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {urgentActions.map((action, i) => (
              <div key={i} className={`p-4 rounded-2xl ${action.color} border transition-all hover:scale-[1.02] shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-icons-outlined text-lg">{action.icon}</span>
                  <span className="text-xl font-black">{action.count}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">{action.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Gross Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: 'receipt_long', color: 'blue' },
          { label: 'Partner Payouts', value: `₹${stats.totalPayouts.toLocaleString()}`, icon: 'payments', color: 'yellow' },
          { label: 'Net Profit', value: `₹${stats.netProfit.toLocaleString()}`, icon: 'account_balance_wallet', color: 'green' },
          { label: 'Support Tickets', value: stats.openTickets, icon: 'confirmation_number', color: 'red' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-5 md:p-7 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h3 className="text-lg md:text-3xl font-black text-gray-800 dark:text-white tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
          <h3 className="text-xl font-black text-gray-800 dark:text-white mb-10 tracking-tight">Finances</h3>
          <div className="w-full h-[350px] relative" style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#f1f5f9"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: darkMode ? '#111827' : '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                <Bar name="Value" dataKey="revenue" fill="#2E7D32" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-w-0">
          <h3 className="text-xl font-black text-gray-800 dark:text-white mb-8 tracking-tight">Recent Leads</h3>
          <div className="space-y-4">
            {leads.slice(-4).reverse().map((l: Lead, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl transition-all hover:bg-gray-100 dark:hover:bg-gray-800/50">
                <div>
                  <p className="text-sm font-black dark:text-white">{l.customerName}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{l.leadType} insurance</p>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${l.status === LeadStatus.SUBMITTED ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                  {l.status}
                </span>
              </div>
            ))}
            {leads.length === 0 && <p className="text-center py-10 text-gray-400 text-xs italic">Awaiting your first lead submission.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
