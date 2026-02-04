
import React, { useState, useMemo, useRef } from 'react';
import { User, LeadStatus, Lead, LeadMessage } from '@/types';
import { useGlobalState } from '@/context';
import { WEB_AGGREGATORS, INSURANCE_COMPANIES } from '@/constants';

const PartnerRenewals: React.FC<{ user: User }> = ({ user }) => {
  const { leads, updateLead, showAlert, showConfirm } = useGlobalState();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'missed'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if a date is within X days from today
  const isWithinDays = (dateStr: string, days: number) => {
    const target = new Date(dateStr);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days && diffDays >= 0;
  };

  const isMissed = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    // Missed if date is in the past (yesterday or before)
    return target < now && target.getDate() !== now.getDate();
  };

  // Group leads by month
  const groupedRenewals = useMemo(() => {
    const myRenewals = leads.filter(l => {
      if (!l.renewalDate || l.partnerId !== user.id) return false;
      const matchesSearch = searchQuery === '' ||
        (l.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.customerName.toLowerCase().includes(searchQuery.toLowerCase())); // Note: Vehicle number not in Lead type yet, using Name/ID

      if (!matchesSearch) return false;

      if (activeTab === 'upcoming') {
        return !isMissed(l.renewalDate) && l.status !== LeadStatus.SUBMITTED; // Show if future date and NOT already submitted for renewal
      } else {
        return isMissed(l.renewalDate) && l.status !== LeadStatus.SUBMITTED;
      }
    });

    // Group by "Month Year"
    const groups: Record<string, Lead[]> = {};
    myRenewals.forEach(lead => {
      const date = new Date(lead.renewalDate!);
      const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(lead);
    });

    // Sort groups by date
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].renewalDate!);
      const dateB = new Date(b[1][0].renewalDate!);
      return dateA.getTime() - dateB.getTime();
    });
  }, [leads, user.id, activeTab, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const promises = filesArray.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      });
      const base64Files = await Promise.all(promises);
      setUploadedFiles(prev => [...prev, ...base64Files]);
    }
  };

  const handleStartRenewal = (lead: Lead) => {
    setEditingLead(lead);
    setUploadedFiles([]); // Reset files for new submission
  };

  const handleSubmitRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setIsSubmitting(true);

    try {
      // 1. Add System Message
      const renewalMessage: LeadMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'SYSTEM',
        text: `--- RENEWAL PROCESS STARTED ---\nLead reopened for renewal submission by partner.`,
        timestamp: new Date().toISOString()
      };

      // 2. Update Lead
      await updateLead(editingLead.id, {
        status: LeadStatus.SUBMITTED,
        isRenewal: true,
        submittedAt: new Date().toISOString(), // Update submission time
        documents: [...(editingLead.documents || []), ...uploadedFiles], // Append new docs
        messages: [...(editingLead.messages || []), renewalMessage],
        // Reset admin fields for new cycle
        policyUrl: undefined,
        payoutStatus: undefined,
        payoutTransactionId: undefined,
        adminCommission: 0,
        partnerCommission: 0
      });

      setEditingLead(null);
      showAlert('Renewal Submitted', "Renewal submitted successfully! The lead is now open for tracking.", 'success');
    } catch (err) {
      showAlert('Submission Failed', "Failed to submit renewal request. Please check your connection.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (lead: Lead) => {
    showConfirm(
      'Restore Lead',
      "Restore this missed lead for renewal submission?",
      () => {
        handleStartRenewal(lead);
      },
      'info'
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Renewal Manager</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Track expiring policies and ensure timely renewals to retain commissions.</p>
        </div>
        <div className="relative w-full md:w-auto">
          <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            id="renewal-search"
            name="renewalQuery"
            placeholder="Search Vehicle No or Name..."
            className="w-full md:w-80 pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-[#2E7D32]"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 w-full md:w-fit">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upcoming' ? 'bg-[#2E7D32] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Upcoming / Due
        </button>
        <button
          onClick={() => setActiveTab('missed')}
          className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'missed' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Missed / Expired
        </button>
      </div>

      {groupedRenewals.length === 0 ? (
        <div className="p-24 text-center bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700">
          <span className="material-icons-outlined text-6xl text-gray-200 dark:text-gray-700 mb-4">event_available</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No {activeTab} renewals found.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedRenewals.map(([month, leads]) => (
            <div key={month} className="space-y-4">
              <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest ml-2">{month}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {leads.map(lead => {
                  const isEditable = isWithinDays(lead.renewalDate!, 10) || activeTab === 'missed';
                  const daysLeft = Math.ceil((new Date(lead.renewalDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={lead.id} className="p-6 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-black text-gray-800 dark:text-white text-lg">{lead.customerName}</h4>
                          {daysLeft <= 10 && activeTab === 'upcoming' && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse">Due Soon</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: #{lead.id} • Exp: {new Date(lead.renewalDate!).toLocaleDateString()}</p>
                        <p className="text-xs font-medium text-gray-500 mt-2">{lead.insuranceCompany} - {lead.leadType}</p>
                      </div>
                      <div>
                        {activeTab === 'upcoming' ? (
                          <button
                            onClick={() => handleStartRenewal(lead)}
                            disabled={!isEditable}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditable
                              ? 'bg-[#2E7D32] text-white shadow-lg hover:bg-[#1b5e20] transform hover:-translate-y-1'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            {isEditable ? 'Renew Now' : `Opens in ${daysLeft - 10} Days`}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(lead)}
                            className="px-6 py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                          >
                            Restore & Renew
                          </button>
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

      {/* Renewal Modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-scaleIn border border-gray-100 dark:border-gray-700">
            <div className="p-8 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-widest text-sm">Renewal Submission</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{editingLead.customerName} • {editingLead.leadType}</p>
              </div>
              <button onClick={() => setEditingLead(null)} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition-colors"><span className="material-icons-outlined">close</span></button>
            </div>

            <form onSubmit={handleSubmitRenewal} className="p-10 space-y-8">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                <p className="text-xs text-yellow-800 dark:text-yellow-400 font-medium leading-relaxed">
                  You are renewing policy for <strong>{editingLead.customerName}</strong>. Previous documents are retained. Please upload new payment proof or updated documents if any.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload New Documents (Optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#2E7D32] transition-colors bg-gray-50 dark:bg-gray-900"
                >
                  <input type="file" multiple id="renewal-file-upload" name="renewalFiles" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  <span className="material-icons-outlined text-4xl text-gray-300 mb-2">cloud_upload</span>
                  <p className="text-[10px] font-black uppercase text-gray-400">Click to add files</p>
                  <p className="text-[9px] font-bold text-[#2E7D32] mt-2">{uploadedFiles.length} files added</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setEditingLead(null)} className="py-4 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-gray-600 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-[#2E7D32] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-[#1b5e20] transition-all transform active:scale-[0.98]">
                  {isSubmitting ? 'Submitting...' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerRenewals;
