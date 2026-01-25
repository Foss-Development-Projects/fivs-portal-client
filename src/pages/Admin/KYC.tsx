
import React, { useState, useMemo } from 'react';
import { useGlobalState } from '@/context';
import { KYCStatus } from '@/types';

const AdminKYC: React.FC = () => {
  const { users, updateUser, resetKYC, selectedPartnerIdForKyc, setSelectedPartnerIdForKyc } = useGlobalState();
  const [viewMode, setViewMode] = useState<'pending' | 'verified'>('pending');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const allSubmissions = useMemo(() => users.filter(p => p.role === 'partner' && p.kycStatus !== KYCStatus.NOT_SUBMITTED), [users]);

  const displayList = useMemo(() => {
    if (selectedPartnerIdForKyc) {
      return allSubmissions.filter(p => p.id === selectedPartnerIdForKyc);
    }

    if (viewMode === 'pending') {
      return allSubmissions.filter(p => p.kycStatus === KYCStatus.UNDER_REVIEW);
    } else {
      return allSubmissions.filter(p => p.kycStatus !== KYCStatus.UNDER_REVIEW);
    }
  }, [allSubmissions, viewMode, selectedPartnerIdForKyc]);

  const pendingCount = allSubmissions.filter(p => p.kycStatus === KYCStatus.UNDER_REVIEW).length;
  const verifiedCount = allSubmissions.filter(p => p.kycStatus !== KYCStatus.UNDER_REVIEW).length;

  const handleKYC = async (id: string, status: KYCStatus, reason?: string) => {
    try {
      await updateUser(id, { kycStatus: status, kycReason: reason });
    } catch (err) {
      alert("Error updating KYC status");
    }
  };

  const handleReset = async (id: string) => {
    if (confirm("Are you sure you want to RESET this partner's KYC? This will remove all uploaded documents and lock their wallet immediately.")) {
      try {
        await resetKYC(id);
        if (selectedPartnerIdForKyc === id) {
          setSelectedPartnerIdForKyc(null);
        }
        alert("KYC reset successfully");
      } catch (err) {
        alert("Failed to reset KYC");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <div className="max-w-5xl w-full h-full flex flex-col items-center justify-center">
            {zoomedImage.startsWith('data:image') ? (
              <img src={zoomedImage} className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg animate-scaleIn" alt="Zoomed View" />
            ) : (
              <div className="bg-white p-12 rounded-[2rem] flex flex-col items-center">
                <span className="material-icons-outlined text-red-500 text-8xl mb-6">picture_as_pdf</span>
                <p className="text-xl font-bold text-gray-800">PDF Document</p>
                <a href={zoomedImage} download="document.pdf" className="mt-8 bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest">Download PDF to View</a>
              </div>
            )}
            <button className="mt-8 text-white flex items-center space-x-2 bg-white/10 px-6 py-2 rounded-full hover:bg-white/20">
              <span className="material-icons-outlined">close</span>
              <span className="text-xs font-black uppercase tracking-widest">Close Preview</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
            {selectedPartnerIdForKyc ? 'Focused Document Review' : 'Identity Management System'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {selectedPartnerIdForKyc ? 'Reviewing specific documentation for the selected partner.' : 'Review new applications and manage existing verified records.'}
          </p>
        </div>

        {selectedPartnerIdForKyc ? (
          <button
            onClick={() => setSelectedPartnerIdForKyc(null)}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
          >
            <span className="material-icons-outlined text-sm">arrow_back</span>
            <span>Back to All Submissions</span>
          </button>
        ) : (
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('pending')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${viewMode === 'pending' ? 'bg-white dark:bg-gray-700 shadow-md text-[#2E7D32] dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <span className="material-icons-outlined text-sm">pending_actions</span>
              <span>Pending ({pendingCount})</span>
            </button>
            <button
              onClick={() => setViewMode('verified')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${viewMode === 'verified' ? 'bg-white dark:bg-gray-700 shadow-md text-[#2E7D32] dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <span className="material-icons-outlined text-sm">history_edu</span>
              <span>Verified Records ({verifiedCount})</span>
            </button>
          </div>
        )}
      </div>

      {displayList.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-24 rounded-[3rem] border border-gray-100 dark:border-gray-700 text-center shadow-sm">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200 dark:text-gray-700">
            <span className="material-icons-outlined text-5xl">
              {viewMode === 'pending' ? 'checklist_rtl' : 'inventory_2'}
            </span>
          </div>
          <p className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em] text-sm">
            {selectedPartnerIdForKyc ? 'This partner has not submitted any documents yet.' : (viewMode === 'pending' ? 'All caught up! No pending reviews.' : 'No verified records found in archives.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10">
          {displayList.map(partner => (
            <div key={partner.id} className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 p-10 group hover:shadow-xl transition-all duration-500">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 pb-8 border-b border-gray-50 dark:border-gray-700">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#2E7D32] to-[#1b4d1f] rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-green-100 dark:shadow-none">
                    {partner.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">{partner.name}</h3>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${partner.category === 'Type A' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:border-purple-800'
                        }`}>
                        {partner.category || 'N/A'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${partner.kycStatus === KYCStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                          partner.kycStatus === KYCStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                        }`}>
                        {partner.kycStatus.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-gray-400 font-bold tracking-widest bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg">UID: {partner.id}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleReset(partner.id)}
                    className="px-6 py-3 bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-300 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all flex items-center space-x-2"
                  >
                    <span className="material-icons-outlined text-sm">restart_alt</span>
                    <span>Reset KYC</span>
                  </button>

                  {partner.kycStatus !== KYCStatus.APPROVED && (
                    <>
                      <button
                        onClick={() => handleKYC(partner.id, KYCStatus.REJECTED, prompt("Reason for rejection?") || "Documents invalid")}
                        className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleKYC(partner.id, KYCStatus.APPROVED)}
                        className="px-8 py-3 bg-[#2E7D32] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 dark:shadow-none"
                      >
                        Approve KYC
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Bank Details Display Section */}
              <div className="mb-10 bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-full mb-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Verified Bank Information</h4>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Holder</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{partner.accountHolder || partner.name}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{partner.accountNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">IFSC Code</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{partner.ifscCode || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank Name</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{partner.bankName || 'Not provided'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                {[
                  { label: 'Aadhaar Front', type: 'af' },
                  { label: 'Aadhaar Back', type: 'ab' },
                  { label: 'PAN Card', type: 'pc' },
                  { label: 'Bank Document', type: 'cc' },
                  { label: 'Consent Form', type: 'cf' }
                ].map((doc, idx) => {
                  const fileData = partner.kycDocuments?.[idx];
                  return (
                    <div key={idx} className="space-y-4">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">{doc.label}</p>
                      <div
                        onClick={() => fileData && setZoomedImage(fileData)}
                        className={`relative group cursor-pointer overflow-hidden rounded-[2.5rem] border-2 border-dashed h-56 flex flex-col items-center justify-center transition-all duration-500 ${fileData ? 'border-[#2E7D32] bg-white dark:bg-gray-900' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-40'
                          }`}>
                        {fileData ? (
                          fileData.startsWith('data:image') ? (
                            <>
                              <img src={fileData} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={doc.label} />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="material-icons-outlined text-white text-4xl">zoom_in</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-6">
                              <span className="material-icons-outlined text-red-500 text-5xl mb-2">picture_as_pdf</span>
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">PDF Document</p>
                            </div>
                          )
                        ) : (
                          <span className="material-icons-outlined text-gray-200 text-4xl">block</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminKYC;
