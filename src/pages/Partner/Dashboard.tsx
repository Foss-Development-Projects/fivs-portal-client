
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LeadStatus, KYCStatus } from '@/types';
import { useGlobalState } from '@/context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ icon, label, value, color }: { icon: string, label: string, value: string | number, color: string }) => (
  <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start justify-between group transition-all">
    <div>
      <p className="text-[8px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white tracking-tight">{value}</h3>
    </div>
    <div className={`p-3 md:p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
      <span className="material-icons-outlined text-xl md:text-2xl">{icon}</span>
    </div>
  </div>
);

const PartnerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const { leads, banners, darkMode } = useGlobalState();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  // State to track dismissed notifications
  const [dismissedKyc, setDismissedKyc] = useState(false);
  const [dismissedPolicy, setDismissedPolicy] = useState(false);

  const activeBanner = banners[0] || { id: 'B1', title: 'Welcome to FIVS!', imageUrl: '', endDate: new Date().toISOString() };

  useEffect(() => {
    const timer = setInterval(() => {
      const target = new Date(activeBanner.endDate).getTime();
      const now = new Date().getTime();
      const distance = target - now;
      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          mins: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          secs: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeBanner.endDate]);

  const partnerLeads = useMemo(() => leads.filter(l => l.partnerId === user.id), [leads, user.id]);
  const conversions = useMemo(() => partnerLeads.filter(l => l.status === LeadStatus.CONVERTED || l.status === LeadStatus.POLICY_ISSUED).length, [partnerLeads]);
  const earnings = useMemo(() => partnerLeads.reduce((sum, l) => sum + (l.partnerCommission || 0), 0), [partnerLeads]);

  // Renewal Logic
  const dueRenewals = useMemo(() => {
    const now = new Date();
    return partnerLeads.filter(l => {
      if (!l.renewalDate) return false;
      const rDate = new Date(l.renewalDate);
      const diffDays = Math.ceil((rDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0; // Renewals due in next 30 days
    });
  }, [partnerLeads]);

  const showKycAlert = user.kycStatus !== KYCStatus.APPROVED && !dismissedKyc;
  const showPolicyAlert = partnerLeads.some(l => l.status === LeadStatus.POLICY_ISSUED && !l.readBy?.includes(user.id)) && !dismissedPolicy;

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Dynamic Status Notifications */}
      <div className="space-y-4">
        {dueRenewals.length > 0 && (
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center">
              <span className="material-icons-outlined text-purple-600 mr-3 animate-pulse">update</span>
              <p className="text-xs md:text-sm text-purple-800 font-bold uppercase tracking-tight">
                Reminder: {dueRenewals.length} Policy Renewals due this month. Check Renewal List.
              </p>
            </div>
            <button onClick={() => navigate('/renewals')} className="text-[10px] font-black uppercase text-purple-600 hover:underline">View List</button>
          </div>
        )}

        {showKycAlert && (
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center">
              <span className="material-icons-outlined text-orange-500 mr-3">verified</span>
              <p className="text-xs md:text-sm text-orange-800 font-bold uppercase tracking-tight">
                Action Required: Your KYC status is <span className="underline">{user.kycStatus === KYCStatus.NOT_SUBMITTED ? 'N/A' : user.kycStatus.replace('_', ' ')}</span>.
              </p>
            </div>
            <button onClick={() => setDismissedKyc(true)} className="p-1 hover:bg-orange-100 rounded-full transition-colors text-orange-600">
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        )}
        {showPolicyAlert && (
          <div className="p-4 bg-[#2E7D32] text-white rounded-2xl flex items-center justify-between shadow-xl animate-scaleIn">
            <div className="flex items-center">
              <span className="material-icons-outlined mr-3">verified_user</span>
              <p className="text-xs md:text-sm font-black uppercase tracking-widest">Great News! A new policy has been issued for your client.</p>
            </div>
            <button onClick={() => setDismissedPolicy(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-[#2E7D32] to-[#0a310c] text-white p-6 md:p-10 shadow-xl min-h-[280px] md:min-h-[340px] flex items-center">
        {activeBanner.imageUrl && (
          <img src={activeBanner.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
        )}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8 w-full">
          <div className="max-w-xl text-center lg:text-left">
            <span className="px-3 md:px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Promotion</span>
            <h2 className="text-2xl md:text-5xl font-black mt-4 md:mt-6 mb-2 md:mb-4 leading-tight tracking-tighter">{activeBanner.title}</h2>
            <p className="text-green-100 text-sm md:text-lg font-medium opacity-80">Check current offers and boost your monthly earnings.</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/20 text-center min-w-full sm:min-w-[300px]">
            <p className="text-[8px] md:text-[10px] uppercase font-black text-green-300 mb-4 md:mb-6 tracking-widest">Promotion Ends In</p>
            <div className="flex space-x-4 md:space-x-6 justify-center">
              {[
                { v: timeLeft.days, l: 'Days' },
                { v: timeLeft.hours, l: 'Hrs' },
                { v: timeLeft.mins, l: 'Min' },
                { v: timeLeft.secs, l: 'Sec' }
              ].map((t, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-xl md:text-3xl font-black tracking-tighter">{t.v.toString().padStart(2, '0')}</span>
                  <span className="text-[6px] md:text-[8px] font-black uppercase mt-1 opacity-60">{t.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard icon="assignment" label="Submissions" value={partnerLeads.length} color="bg-blue-500" />
        <StatCard icon="paid" label="Earnings" value={`₹${earnings.toLocaleString()}`} color="bg-green-500" />
        <StatCard icon="auto_graph" label="Conversions" value={conversions} color="bg-purple-500" />
        <StatCard icon="verified_user" label="KYC Status" value={user.kycStatus === KYCStatus.NOT_SUBMITTED ? 'N/A' : user.kycStatus.replace('_', ' ')} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
          <h3 className="text-lg font-black text-gray-800 dark:text-white mb-8 tracking-tight">Lead Distribution</h3>
          <div className="w-full h-[300px] relative" style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{ name: 'Leads', total: partnerLeads.length, conv: conversions }]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#f1f5f9"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: darkMode ? '#111827' : '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="total" fill={darkMode ? "#4b5563" : "#e2e8f0"} radius={[5, 5, 0, 0]} barSize={40} />
                <Bar dataKey="conv" fill="#2E7D32" radius={[5, 5, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
          <h3 className="text-lg font-black text-gray-800 dark:text-white mb-6 tracking-tight">Recent Updates</h3>
          <div className="space-y-4">
            {partnerLeads.slice(-3).reverse().map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <div>
                  <p className="text-sm font-black dark:text-white">{lead.customerName}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lead.status}</p>
                </div>
                <span className="material-icons-outlined text-gray-300">chevron_right</span>
              </div>
            ))}
            {partnerLeads.length === 0 && <p className="text-xs text-gray-400 italic text-center py-10">No recent activity recorded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
