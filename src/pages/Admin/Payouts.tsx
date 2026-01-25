
import React, { useState, useMemo } from 'react';
import { useGlobalState } from '@/context';
import { User, Lead, PayoutStatus } from '@/types';

const AdminPayouts: React.FC = () => {
  const { leads, users, updateLead, generateProfitReport, adminProfitReports } = useGlobalState();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [txId, setTxId] = useState('');

  const pendingSettlements = useMemo(() => leads.filter(l => l.payoutStatus === 'pending'), [leads]);
  const recentlyCredited = useMemo(() => leads.filter(l => l.payoutStatus === 'credited').slice(-10), [leads]);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !txId) return alert("UTR / Bank Transaction ID is required for settlement.");
    try {
      await updateLead(selectedLead.id, {
        payoutStatus: 'credited',
        payoutTransactionId: txId,
        payoutDate: new Date().toISOString()
      });
      setSelectedLead(null);
      setTxId('');
      alert("Payout settled successfully. Lead marked as Credited.");
    } catch (err) {
      alert("Failed to process payout. Please try again.");
    }
  };

  const handleGenerateProfitLog = () => {
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    generateProfitReport(month);
    alert(`Profit Log generated for ${month}. This updates your dashboard parameters instantly.`);
  };

  const handleDownload = (data: string, name: string) => {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Financial Treasury</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage liquidity, disburse lead-based commissions, and audit company profitability.</p>
        </div>
        <button
          onClick={handleGenerateProfitLog}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center space-x-2"
        >
          <span className="material-icons-outlined text-sm">auto_graph</span>
          <span>Generate Monthly Profit Log</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-10 border-b dark:border-gray-700 flex items-center justify-between bg-orange-50/50 dark:bg-orange-900/10">
              <div>
                <h3 className="text-xl font-black text-orange-800 dark:text-orange-400 tracking-tight">Pending Settlements</h3>
                <p className="text-[10px] font-black uppercase text-orange-600/60 mt-1 tracking-widest">Leads awaiting bank disbursement</p>
              </div>
              <span className="px-5 py-2 bg-orange-600 text-white rounded-2xl text-xs font-black tracking-widest">{pendingSettlements.length} PENDING</span>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {pendingSettlements.length === 0 ? (
                <div className="p-24 text-center text-gray-300">
                  <span className="material-icons-outlined text-6xl mb-4">check_circle_outline</span>
                  <p className="font-black uppercase tracking-widest text-sm">No pending settlements!</p>
                </div>
              ) : (
                pendingSettlements.map(lead => {
                  const partner = users.find(u => u.id === lead.partnerId);
                  return (
                    <div key={lead.id} className="p-10 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-[1.5rem] flex items-center justify-center font-black text-xl">
                          {partner?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-800 dark:text-white">{lead.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Partner: {partner?.name} • Lead #{lead.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-12">
                        <div className="text-right">
                          <p className="text-2xl font-black text-gray-800 dark:text-white">₹{(lead.partnerCommission || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Type: {lead.leadType}</p>
                        </div>
                        <button onClick={() => setSelectedLead(lead)} className="bg-black dark:bg-gray-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">Settle</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-10 border-b dark:border-gray-700">
              <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Settlement History</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Recently credited payouts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b dark:border-gray-700">
                  <tr>
                    <th className="px-10 py-6">Customer / Lead</th>
                    <th className="px-10 py-6">Partner</th>
                    <th className="px-10 py-6">Payout</th>
                    <th className="px-10 py-6 text-right">UTR ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700 text-sm">
                  {recentlyCredited.map(lead => {
                    const partner = users.find(u => u.id === lead.partnerId);
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group">
                        <td className="px-10 py-6">
                          <p className="font-black text-gray-800 dark:text-white group-hover:text-[#2E7D32] transition-colors">{lead.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">ID: #{lead.id}</p>
                        </td>
                        <td className="px-10 py-6 font-bold text-gray-600 dark:text-gray-400">{partner?.name}</td>
                        <td className="px-10 py-6 font-black text-green-600">₹{(lead.partnerCommission || 0).toLocaleString()}</td>
                        <td className="px-10 py-6 text-right font-mono text-[10px] text-gray-400 uppercase tracking-tighter">
                          {lead.payoutTransactionId}
                        </td>
                      </tr>
                    );
                  })}
                  {recentlyCredited.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center text-gray-400 italic">No recent disbursements found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest">Payout Statistics</h3>
              <span className="material-icons-outlined text-[#2E7D32]">query_stats</span>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-3xl">
                <p className="text-[10px] font-black text-green-800 dark:text-green-400 uppercase tracking-widest mb-1">Total Disbursed</p>
                <p className="text-2xl font-black text-green-800 dark:text-green-400">₹{leads.filter(l => l.payoutStatus === 'credited').reduce((sum, l) => sum + (l.partnerCommission || 0), 0).toLocaleString()}</p>
              </div>
              <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl">
                <p className="text-[10px] font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest mb-1">Current Liability</p>
                <p className="text-2xl font-black text-orange-800 dark:text-orange-400">₹{leads.filter(l => l.payoutStatus === 'pending').reduce((sum, l) => sum + (l.partnerCommission || 0), 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest">Profit Archives</h3>
              <span className="material-icons-outlined text-blue-500">inventory_2</span>
            </div>
            <div className="space-y-4">
              {adminProfitReports.slice().reverse().map(report => (
                <div key={report.id} className="flex items-center justify-between p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800">
                  <div>
                    <p className="text-sm font-black dark:text-white">{report.month}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase mt-1">Profit: ₹{report.profit.toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleDownload(report.csvData, `Profit_Log_${report.month.replace(' ', '_')}.csv`)} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="material-icons-outlined text-sm">download</span>
                  </button>
                </div>
              ))}
              {adminProfitReports.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Archives will appear here.</p>}
            </div>
          </div>
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[3.5rem] w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-12 text-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-3xl font-black tracking-tight dark:text-white">Lead Settlement</h3>
              <div className="mt-4 flex flex-col items-center">
                <p className="text-4xl font-black text-[#2E7D32] tracking-tighter">₹{(selectedLead.partnerCommission || 0).toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Disbursement for {selectedLead.customerName}</p>
              </div>
            </div>
            <form onSubmit={handleSettle} className="p-12 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 ml-2">Bank Transaction / UTR ID (Mandatory)</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-8 py-5 rounded-3xl border-2 border-gray-100 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-black text-2xl tracking-tight text-center shadow-inner"
                  placeholder="E.g. 41220911029..."
                  value={txId}
                  onChange={e => setTxId(e.target.value)}
                />
              </div>
              <div className="flex gap-6 pt-4">
                <button type="button" onClick={() => setSelectedLead(null)} className="flex-1 py-5 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-gray-600 transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] bg-[#2E7D32] text-white py-5 rounded-[2rem] font-black shadow-2xl hover:bg-[#1b5e20] transition-all transform hover:-translate-y-1 active:translate-y-0">Confirm Settlement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayouts;
