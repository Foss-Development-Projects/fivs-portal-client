
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserStatus, KYCStatus, LeadStatus } from '@/types';
import { useGlobalState } from '@/context';

const AdminPartners: React.FC = () => {
  const navigate = useNavigate();
  const { users, leads, updateUser, setSelectedPartnerIdForKyc } = useGlobalState();
  const partners = users.filter(u => u.role === 'partner');
  const [managingUserId, setManagingUserId] = useState<string | null>(null);

  const managingUser = useMemo(() => users.find(u => u.id === managingUserId), [users, managingUserId]);

  const userStats = useMemo(() => {
    if (!managingUserId) return null;
    const userLeads = leads.filter(l => l.partnerId === managingUserId);
    const converted = userLeads.filter(l => l.status === LeadStatus.POLICY_ISSUED || l.status === LeadStatus.CONVERTED);
    const totalEarnings = userLeads.reduce((sum, l) => sum + (l.partnerCommission || 0), 0);

    // Lead distribution by type
    const distribution = userLeads.reduce((acc: any, lead) => {
      acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
      return acc;
    }, {});

    return {
      total: userLeads.length,
      converted: converted.length,
      conversionRate: userLeads.length > 0 ? ((converted.length / userLeads.length) * 100).toFixed(1) : '0',
      totalEarnings,
      distribution
    };
  }, [leads, managingUserId]);

  const toggleLeadSub = (id: string, current: boolean) => {
    updateUser(id, { leadSubmissionEnabled: !current });
  };

  const setStatus = (id: string, status: UserStatus) => {
    updateUser(id, { status });
  };

  const viewKycDocs = (id: string) => {
    setSelectedPartnerIdForKyc(id);
    navigate('/kyc-approval');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Partner Directory</h2>
          <p className="text-gray-500 dark:text-gray-400">Global management of all registered agents.</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              id="partner-filter-input"
              name="partnerFilter"
              placeholder="Filter by name or UID..."
              className="pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-100/50 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-2xl outline-none focus:border-[#2E7D32] min-w-[320px] shadow-inner transition-all font-bold text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase tracking-widest font-black text-gray-400 border-b dark:border-gray-700">
              <tr>
                <th className="px-8 py-6">Partner Identity</th>
                <th className="px-8 py-6">Account Status</th>
                <th className="px-8 py-6">Capabilities</th>
                <th className="px-8 py-6">Identity Verification</th>
                <th className="px-8 py-6 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700 text-sm">
              {partners.map(partner => (
                <tr key={partner.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#2E7D32] to-[#1b4d1f] rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-green-100 dark:shadow-none group-hover:scale-105 transition-transform">
                        {partner.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-black text-gray-800 dark:text-gray-100 text-base tracking-tight">{partner.name}</p>
                        <p className="text-xs text-gray-400 font-medium">{partner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${partner.status === UserStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-800' :
                      partner.status === UserStatus.FROZEN ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800' : 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800'
                      }`}>
                      {partner.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => toggleLeadSub(partner.id, partner.leadSubmissionEnabled)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${partner.leadSubmissionEnabled ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 text-gray-400 border-gray-100 dark:bg-gray-700 dark:border-gray-600'
                        }`}
                    >
                      <span className="material-icons-outlined text-sm">{partner.leadSubmissionEnabled ? 'assignment_turned_in' : 'assignment_late'}</span>
                      <span>Leads: {partner.leadSubmissionEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${partner.kycStatus === KYCStatus.APPROVED ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-gray-50 text-gray-400 border-gray-100 dark:bg-gray-700 dark:border-gray-600'
                        }`}>
                        {partner.kycStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end space-x-2">
                      {partner.kycStatus !== KYCStatus.NOT_SUBMITTED && (
                        <button
                          title="View KYC Documents"
                          className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center border border-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-800"
                          onClick={() => viewKycDocs(partner.id)}
                        >
                          <span className="material-icons-outlined text-xl">description</span>
                        </button>
                      )}
                      {partner.status !== UserStatus.APPROVED && (
                        <button onClick={() => setStatus(partner.id, UserStatus.APPROVED)} className="w-10 h-10 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all flex items-center justify-center border border-green-100 dark:bg-green-900/30 dark:border-green-800" title='Approve Access'>
                          <span className="material-icons-outlined text-xl">check_circle</span>
                        </button>
                      )}
                      <button
                        onClick={() => setManagingUserId(partner.id)}
                        className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all flex items-center justify-center border border-gray-100 dark:bg-gray-700 dark:border-gray-600" title='Manage User'>
                        <span className="material-icons-outlined text-xl">manage_accounts</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage User Modal - Detailed Profile & Business Report */}
      {managingUser && userStats && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl animate-scaleIn flex flex-col">
            <div className="p-8 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-[#2E7D32] text-white rounded-2xl flex items-center justify-center text-3xl font-black">
                  {managingUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black dark:text-white tracking-tight">{managingUser.name}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Partner ID: {managingUser.id}</p>
                </div>
              </div>
              <button onClick={() => setManagingUserId(null)} className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition-colors">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Profile & Bank Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</p>
                    <p className="font-bold dark:text-white">{managingUser.mobile}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                    <p className="font-bold dark:text-white">{managingUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</p>
                    <p className="font-bold dark:text-white">{managingUser.category || 'Standard Partner'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bank Name</p>
                    <p className="font-bold dark:text-white">{managingUser.bankName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Account Number</p>
                    <p className="font-bold dark:text-white">{managingUser.accountNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">IFSC Code</p>
                    <p className="font-bold dark:text-white">{managingUser.ifscCode || 'N/A'}</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Business Performance Report</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Leads</p>
                    <p className="text-3xl font-black text-blue-800 dark:text-blue-300">{userStats.total}</p>
                  </div>
                  <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-[2rem] border border-green-100 dark:border-green-800">
                    <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Conversions</p>
                    <p className="text-3xl font-black text-green-800 dark:text-green-300">{userStats.converted}</p>
                  </div>
                  <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] border border-purple-100 dark:border-purple-800">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1">Success Rate</p>
                    <p className="text-3xl font-black text-purple-800 dark:text-purple-300">{userStats.conversionRate}%</p>
                  </div>
                  <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] border border-orange-100 dark:border-orange-800">
                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Gross Earnings</p>
                    <p className="text-3xl font-black text-orange-800 dark:text-orange-300">₹{userStats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Lead Portfolio distribution</h5>
                  <div className="space-y-4">
                    {['motor', 'health', 'life', 'sme'].map(type => {
                      const count = userStats.distribution[type] || 0;
                      const percentage = userStats.total > 0 ? (count / userStats.total) * 100 : 0;
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-black uppercase">
                            <span className="dark:text-white">{type} Insurance</span>
                            <span className="text-gray-400">{count} Cases</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[#2E7D32]" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] shadow-sm">
                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Account Controls</h5>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setStatus(managingUser.id, UserStatus.SUSPENDED)}
                        className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                      >
                        Suspend User
                      </button>
                      <button
                        onClick={() => setStatus(managingUser.id, UserStatus.APPROVED)}
                        className="px-6 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-100 transition-all"
                      >
                        Re-Activate
                      </button>
                      <button
                        onClick={() => viewKycDocs(managingUser.id)}
                        className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                      >
                        Re-Audit KYC
                      </button>
                    </div>
                  </div>
                  <div className="p-6 bg-yellow-50 dark:bg-yellow-900/10 rounded-[2rem] border border-yellow-100 dark:border-yellow-900/30 flex items-center space-x-4">
                    <span className="material-icons-outlined text-yellow-600">tips_and_updates</span>
                    <p className="text-[11px] font-medium text-yellow-800 dark:text-yellow-400 leading-tight">
                      Analyzing lead distribution helps identify the partner's domain expertise for targeted training.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-8 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex justify-center">
              <button onClick={() => setManagingUserId(null)} className="bg-black text-white px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                Close Management View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartners;
