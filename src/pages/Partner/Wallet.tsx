
import React, { useState, useMemo } from 'react';
import { User, KYCStatus, Lead } from '@/types';
import { useGlobalState } from '@/context';

const WalletCard = ({ label, value, color, subtext, highlight = false }: { label: string, value: string, color: string, subtext?: string, highlight?: boolean }) => (
  <div className={`p-8 rounded-[2.5rem] shadow-sm border relative overflow-hidden group transition-all duration-300 ${highlight
      ? 'bg-gradient-to-br from-[#2E7D32] to-[#1b5e20] text-white border-transparent shadow-xl'
      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
    }`}>
    <div className={`absolute top-0 left-0 w-1.5 h-full bg-${color}-500 transition-all group-hover:w-3 ${highlight ? 'hidden' : ''}`}></div>
    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${highlight ? 'text-green-200' : 'text-gray-400 dark:text-gray-500'}`}>{label}</p>
    <h3 className={`text-4xl font-black tracking-tighter ${highlight ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{value}</h3>
    {subtext && <p className={`text-[10px] mt-3 font-bold uppercase ${highlight ? 'text-green-100/60' : 'text-gray-400'}`}>{subtext}</p>}
  </div>
);

const PartnerWallet: React.FC<{ user: User }> = ({ user }) => {
  const { leads, transactions, payoutReports } = useGlobalState();
  const [payoutFilter, setPayoutFilter] = useState<'All' | 'credited' | 'pending' | 'pre-payout'>('All');

  const myLeads = useMemo(() => leads.filter(l => l.partnerId === user.id && l.payoutStatus), [leads, user.id]);
  const partnerReports = useMemo(() => payoutReports.filter(r => r.partnerId === user.id), [payoutReports, user.id]);

  const totalCredited = useMemo(() => myLeads.filter(l => l.payoutStatus === 'credited').reduce((sum, l) => sum + (l.partnerCommission || 0), 0), [myLeads]);
  const totalPending = useMemo(() => myLeads.filter(l => l.payoutStatus === 'pending').reduce((sum, l) => sum + (l.partnerCommission || 0), 0), [myLeads]);
  const totalLifetime = useMemo(() => myLeads.reduce((sum, l) => sum + (l.partnerCommission || 0), 0), [myLeads]);

  const filteredLeads = useMemo(() => {
    return myLeads.filter(l => payoutFilter === 'All' || l.payoutStatus === payoutFilter);
  }, [myLeads, payoutFilter]);

  const handleDownloadReport = (report: any) => {
    const blob = new Blob([report.csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Statement_${report.month.replace(' ', '_')}.csv`;
    a.click();
  };

  if (user.kycStatus !== KYCStatus.APPROVED) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 animate-fadeIn">
        <div className="w-28 h-28 bg-red-100 bg-opacity-50 rounded-[2.5rem] flex items-center justify-center text-red-500 mx-auto mb-10 shadow-xl shadow-red-100 animate-pulse">
          <span className="material-icons-outlined text-6xl">lock_person</span>
        </div>
        <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-6 tracking-tight">Finance Section Locked</h2>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-10 text-lg">
          Please complete your <span className="font-black text-gray-700 dark:text-gray-200">KYC Identity Verification</span> to unlock wallet and payout features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex flex-col xl:flex-row items-stretch gap-6">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <WalletCard label="Total Credited" value={`₹${totalCredited.toLocaleString()}`} color="green" subtext="Received in Bank" highlight={true} />
          <WalletCard label="Pending Settlement" value={`₹${totalPending.toLocaleString()}`} color="orange" subtext="Estimated within 72h" />
          <WalletCard label="Lifetime Earnings" value={`₹${totalLifetime.toLocaleString()}`} color="blue" subtext="Gross Performance" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-8 border-b dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Payout Ledger</h3>
            <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
              {['All', 'credited', 'pending', 'pre-payout'].map(t => (
                <button key={t} onClick={() => setPayoutFilter(t as any)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${payoutFilter === t ? 'bg-white dark:bg-gray-700 shadow-md text-[#2E7D32]' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b dark:border-gray-700">
                  <th className="px-8 py-5">Lead / Payout Details</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredLeads.slice().reverse().map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-gray-800 dark:text-white">{lead.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[200px]">ID: #{lead.id} • {lead.leadType}</p>
                      {lead.payoutTransactionId && <p className="text-[9px] text-[#2E7D32] mt-1 font-black uppercase">UTR: {lead.payoutTransactionId}</p>}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${lead.payoutStatus === 'credited' ? 'bg-green-50 text-green-600 border-green-100' :
                          lead.payoutStatus === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse' : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                        {lead.payoutStatus}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className={`font-black text-base ${lead.payoutStatus === 'credited' ? 'text-green-600' : 'text-orange-500'}`}>
                        ₹{(lead.partnerCommission || 0).toLocaleString()}
                      </p>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-20 text-center text-gray-400 italic">No matching payout records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Policy Payout Rules</h3>
              <span className="material-icons-outlined text-[#2E7D32]">info</span>
            </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">1</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">Payouts are triggered instantly upon successful policy generation by the Admin.</p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">2</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">"Pending" settlements are processed and credited to your registered bank account within 72 business hours.</p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">3</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">Always ensure your KYC bank details are up to date to avoid disbursement delays.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Earnings Statements</h3>
              <span className="material-icons-outlined text-gray-300">download_for_offline</span>
            </div>
            <div className="space-y-4">
              {partnerReports.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">Your monthly summaries will appear here.</p>
              ) : (
                partnerReports.slice().reverse().map(report => (
                  <div key={report.id} className="flex items-center justify-between p-6 bg-green-50/50 dark:bg-green-900/10 rounded-[2rem] border border-green-100 dark:border-green-800 group hover:border-[#2E7D32] transition-colors">
                    <div>
                      <p className="text-sm font-black text-green-800 dark:text-green-400">{report.month}</p>
                      <p className="text-[10px] text-green-600/60 font-bold uppercase">Total: ₹{report.totalEarnings.toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDownloadReport(report)} className="w-12 h-12 bg-white dark:bg-gray-700 text-[#2E7D32] rounded-2xl shadow-sm flex items-center justify-center hover:scale-110 transition-transform">
                      <span className="material-icons-outlined">download</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerWallet;
