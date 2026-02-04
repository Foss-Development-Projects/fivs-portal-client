
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useGlobalState } from '@/context';
import { LeadStatus, Lead, PayoutStatus, LeadMessage } from '@/types';
import { WEB_AGGREGATORS, INSURANCE_COMPANIES } from '@/constants';

const AdminLeads: React.FC = () => {
  const { leads, users, updateLead, currentUser, showAlert } = useGlobalState();

  // Bug Fix: Store lead ID instead of the whole object to ensure the UI updates reactively 
  // when the global 'leads' array changes (e.g. when a new message is received).
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);

  // Derive the currently viewing lead from the global state
  const viewingLead = useMemo(() => leads.find(l => l.id === viewingLeadId), [leads, viewingLeadId]);

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(0);

  const [issueData, setIssueData] = useState({
    policyUrl: '',
    adminCommission: '' as string | number,
    partnerCommission: '' as string | number,
    adminNotes: '',
    payoutStatus: 'credited' as PayoutStatus,
    payoutTransactionId: '',
    // Additional structured fields for Audit/Edit
    aggregator: '',
    insuranceCompany: '',
    policyType: 'TP',
    renewalDate: '' // New Mandatory Field
  });

  // Re-synchronize issueData when viewingLeadId changes to ensure Audit Form is stable
  useEffect(() => {
    if (viewingLead) {
      setIssueData({
        policyUrl: viewingLead.policyUrl || '',
        adminCommission: viewingLead.adminCommission || '',
        partnerCommission: viewingLead.partnerCommission || '',
        adminNotes: viewingLead.adminNotes || '',
        payoutStatus: viewingLead.payoutStatus || 'credited',
        payoutTransactionId: viewingLead.payoutTransactionId || '',
        aggregator: viewingLead.aggregator || '',
        insuranceCompany: viewingLead.insuranceCompany || '',
        policyType: viewingLead.policyType || 'TP',
        renewalDate: viewingLead.renewalDate || ''
      });
      prevMessageCountRef.current = viewingLead.messages?.length || 0;
    }
  }, [viewingLeadId]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  // Performance Fix: Only scroll to bottom when new messages are added, not on every re-render or scroll event
  useLayoutEffect(() => {
    const currentCount = viewingLead?.messages?.length || 0;
    if (viewingLead && currentCount > prevMessageCountRef.current) {
      scrollToBottom('smooth');
      prevMessageCountRef.current = currentCount;
    }
  }, [viewingLead?.messages]);

  const handleStatusUpdate = async (id: string, status: LeadStatus) => {
    try {
      await updateLead(id, {
        status,
        adminNotes: issueData.adminNotes
      });
      showAlert('Update Successful', `Lead status updated to ${status.replace('-', ' ')}`, 'success');
      if (status !== LeadStatus.POLICY_ISSUED) setViewingLeadId(null);
    } catch (err) {
      showAlert('Update Failed', "Error updating status.", 'error');
    }
  };

  const handleSendMessage = async (fileUrl?: string) => {
    if ((!chatMessage.trim() && !fileUrl) || !viewingLead || !currentUser) return;

    const newMessage: LeadMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: chatMessage,
      timestamp: new Date().toISOString(),
      fileUrl: fileUrl
    };

    const updatedMessages = [...(viewingLead.messages || []), newMessage];
    try {
      await updateLead(viewingLead.id, { messages: updatedMessages });
      setChatMessage('');
    } catch (err) {
      showAlert('Message Error', "Failed to send message.", 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      handleSendMessage(base64);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleIssuePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingLead) return;

    if (issueData.payoutStatus === 'credited' && !issueData.payoutTransactionId) {
      showAlert('Missing Information', "Transaction ID is required for 'Credited' status.", 'warning');
      return;
    }

    if (!issueData.renewalDate) {
      showAlert('Missing Information', "Mandatory: Please enter the Next Renewal Date.", 'warning');
      return;
    }

    try {
      await updateLead(viewingLead.id, {
        status: LeadStatus.POLICY_ISSUED,
        policyUrl: issueData.policyUrl,
        adminNotes: issueData.adminNotes,
        adminCommission: Number(issueData.adminCommission) || 0,
        partnerCommission: Number(issueData.partnerCommission) || 0,
        payoutStatus: issueData.payoutStatus,
        payoutTransactionId: issueData.payoutTransactionId,
        payoutDate: issueData.payoutStatus === 'credited' ? new Date().toISOString() : undefined,
        // Save audited fields
        aggregator: issueData.aggregator,
        insuranceCompany: issueData.insuranceCompany,
        policyType: issueData.policyType,
        renewalDate: issueData.renewalDate // Save mandatory renewal date
      });
      showAlert('Policy Issued', "Policy Issued! Lead marked as Approved, Payout status updated, and Renewal scheduled.", 'success');
      setViewingLeadId(null);
    } catch (err) {
      showAlert('Operational Error', "Error issuing policy.", 'error');
    }
  };

  const netAdminProfit = useMemo(() => {
    return (Number(issueData.adminCommission) || 0) - (Number(issueData.partnerCommission) || 0);
  }, [issueData.adminCommission, issueData.partnerCommission]);

  const isFinalized = viewingLead?.status === LeadStatus.POLICY_ISSUED || viewingLead?.status === LeadStatus.CONVERTED;

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
                <a href={zoomedImage} download="lead_document.pdf" className="mt-8 bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest">Download PDF to View</a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white tracking-tight">Lead Processing Hub</h2>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">Audit submissions and manage payouts.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase tracking-widest font-black text-gray-400 border-b dark:border-gray-700">
            <tr>
              <th className="px-6 py-4">Customer Details</th>
              <th className="px-6 py-4">Partner</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Policy Copy</th>
              <th className="px-6 py-4 text-right">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700 text-sm">
            {leads.slice().reverse().map(lead => {
              const partner = users.find(u => u.id === lead.partnerId);
              const isApproved = lead.status === LeadStatus.POLICY_ISSUED || lead.status === LeadStatus.CONVERTED;
              return (
                <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900 transition-all group">
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-800 dark:text-white text-sm tracking-tight">{lead.customerName}</p>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">#{lead.id} • {lead.leadType}</span>
                    {lead.isRenewal && <span className="ml-2 bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">RENEWAL</span>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600 dark:text-gray-300 font-black text-xs">{partner?.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isApproved ? 'bg-green-50 text-green-700 border-green-100' :
                      lead.status === LeadStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                      {isApproved ? 'Approved' : lead.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {lead.policyUrl ? (
                      <a href={lead.policyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-[#2E7D32] hover:underline font-black text-[10px] uppercase tracking-widest">
                        <span className="material-icons-outlined text-sm mr-1">file_download</span>
                        Download
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-bold uppercase">Not Issued</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setViewingLeadId(lead.id)}
                      className="bg-[#2E7D32] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#1b5e20] transition-all"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewingLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 w-full sm:rounded-[3rem] sm:max-w-6xl h-full sm:max-h-[92vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden border border-gray-100">
            <div className="p-6 md:p-10 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center z-10 sticky top-0">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-[#2E7D32]">
                  <span className="material-icons-outlined text-3xl">fact_check</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight leading-none">
                    {viewingLead.customerName}
                  </h3>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ID: #{viewingLead.id}</span>
                    <span className="text-[10px] text-[#2E7D32] font-black uppercase tracking-widest flex items-center">
                      <span className="material-icons-outlined text-xs mr-1">phone</span>
                      {viewingLead.customerMobile}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingLeadId(null)} className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3 space-y-10">
                  <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submission Details</h4>
                      <span className="text-[10px] font-black text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">{viewingLead.leadType}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Aggregator</p>
                        <p className="text-sm font-bold dark:text-white">{viewingLead.aggregator || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Insurance Company</p>
                        <p className="text-sm font-bold dark:text-white">{viewingLead.insuranceCompany || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Policy Type</p>
                        <p className="text-sm font-bold dark:text-white uppercase">{viewingLead.policyType || 'N/A'}</p>
                      </div>
                      <div className="col-span-full border-t dark:border-gray-700 pt-4">
                        <p className="text-[9px] font-black text-[#2E7D32] uppercase tracking-widest mb-1">Partner Preferred Insurers</p>
                        <div className="flex flex-wrap gap-2">
                          {viewingLead.preferredInsurers && viewingLead.preferredInsurers.length > 0 ? (
                            viewingLead.preferredInsurers.map(pi => (
                              <span key={pi} className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-[#2E7D32] text-[9px] font-bold rounded border border-green-100">{pi}</span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No specific preferences listed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Documents</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {viewingLead.documents?.map((doc, i) => (
                        <div key={i} onClick={() => setZoomedImage(doc)} className="aspect-square rounded-2xl overflow-hidden cursor-pointer bg-white border border-gray-200">
                          {(doc.startsWith('data:image') || doc.toLowerCase().includes('.jpg') || doc.toLowerCase().includes('.jpeg') || doc.toLowerCase().includes('.png') || doc.toLowerCase().includes('.webp')) ? (
                            <img src={doc} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-icons-outlined text-red-500">picture_as_pdf</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[450px]">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Query Discussion</h4>
                      {isFinalized && <span className="text-[8px] font-black uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Archive Only</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/20">
                      {viewingLead.messages?.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : msg.senderId === 'system' ? 'items-center' : 'items-start'}`}>
                          {msg.senderId === 'system' ? (
                            <div className="w-full text-center my-2">
                              <span className="text-[10px] font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase tracking-widest">{msg.text}</span>
                            </div>
                          ) : (
                            <>
                              <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${msg.senderId === currentUser?.id ? 'bg-[#2E7D32] text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'}`}>
                                <p className="text-[9px] font-black opacity-60 uppercase mb-1 tracking-widest">{msg.senderName}</p>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                {msg.fileUrl && (
                                  <div className="mt-2 rounded-xl overflow-hidden cursor-pointer bg-black/10 p-1" onClick={(e) => { e.stopPropagation(); setZoomedImage(msg.fileUrl!); }}>
                                    {msg.fileUrl.startsWith('data:image') ? (
                                      <img src={msg.fileUrl} className="max-w-full h-auto rounded-lg" />
                                    ) : (
                                      <div className="flex items-center p-3 text-white">
                                        <span className="material-icons-outlined mr-2">insert_drive_file</span>
                                        <span className="text-[10px] font-bold uppercase">View Document</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    {!isFinalized && (
                      <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex items-center gap-2">
                        <input
                          type="file"
                          id="admin-chat-file"
                          name="chatFile"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-400 hover:text-[#2E7D32] transition-colors bg-gray-50 dark:bg-gray-800 rounded-xl"
                          title="Request/Upload Additional Document"
                        >
                          <span className="material-icons-outlined">attach_file</span>
                        </button>
                        <input
                          type="text"
                          id="admin-chat-input"
                          name="chatMessage"
                          placeholder="Ask partner for details..."
                          className="flex-1 px-4 py-2 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white rounded-xl outline-none focus:ring-1 focus:ring-[#2E7D32]"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button onClick={() => handleSendMessage()} className="bg-[#2E7D32] text-white p-2 rounded-xl shadow-lg hover:bg-[#256628] transition-all">
                          <span className="material-icons-outlined">send</span>
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                    {viewingLead.policyUrl && (
                      <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-3xl border border-green-100 dark:border-green-800 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="material-icons-outlined text-green-600 mr-2">verified_user</span>
                            <p className="text-[10px] font-black text-green-800 dark:text-green-400 uppercase tracking-widest">Policy Document Active</p>
                          </div>
                          <a href={viewingLead.policyUrl} target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-gray-700 p-2 rounded-xl text-[#2E7D32] shadow-sm hover:scale-105 transition-transform">
                            <span className="material-icons-outlined">download</span>
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      <button onClick={() => handleStatusUpdate(viewingLead.id, LeadStatus.IN_REVIEW)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">Reviewing</button>
                      <button onClick={() => handleStatusUpdate(viewingLead.id, LeadStatus.REJECTED)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border-red-100">Reject</button>
                    </div>

                    <form onSubmit={handleIssuePolicy} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Edit Aggregator</label>
                          <select id="issue-aggregator" name="aggregator" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none font-bold text-sm" value={issueData.aggregator} onChange={e => setIssueData({ ...issueData, aggregator: e.target.value })}>
                            <option value="">-- Select Aggregator --</option>
                            {WEB_AGGREGATORS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Edit Insurance Company</label>
                          <select id="issue-insurance-company" name="insuranceCompany" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none font-bold text-sm" value={issueData.insuranceCompany} onChange={e => setIssueData({ ...issueData, insuranceCompany: e.target.value })}>
                            <option value="">-- Select Company --</option>
                            {INSURANCE_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Edit Policy Type</label>
                          <select id="issue-policy-type" name="policyType" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none font-bold text-sm" value={issueData.policyType} onChange={e => setIssueData({ ...issueData, policyType: e.target.value })}>
                            <option value="TP">TP</option>
                            <option value="OD">OD</option>
                            <option value="Comprehensive">Comprehensive</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t dark:border-gray-700 pt-6">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Policy Copy URL</label>
                        <input type="url" id="issue-policy-url" name="policyUrl" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:border-[#2E7D32] outline-none" placeholder="https://..." value={issueData.policyUrl} onChange={e => setIssueData({ ...issueData, policyUrl: e.target.value })} />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 ml-1">Next Renewal Date (Mandatory)</label>
                        <input
                          type="date"
                          id="issue-renewal-date"
                          name="renewalDate"
                          required
                          className="w-full px-5 py-3 rounded-2xl border-2 border-red-100 dark:bg-gray-800 dark:border-red-900/50 dark:text-white focus:border-red-500 outline-none"
                          value={issueData.renewalDate}
                          onChange={e => setIssueData({ ...issueData, renewalDate: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Admin Comm.</label>
                          <input type="number" id="issue-admin-comm" name="adminCommission" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:border-[#2E7D32] outline-none font-black text-xl appearance-none" placeholder="0.00" value={issueData.adminCommission} onChange={e => setIssueData({ ...issueData, adminCommission: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Partner Comm.</label>
                          <input type="number" id="issue-partner-comm" name="partnerCommission" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:border-orange-500 outline-none font-black text-xl appearance-none" placeholder="0.00" value={issueData.partnerCommission} onChange={e => setIssueData({ ...issueData, partnerCommission: e.target.value })} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Payout Disposition</label>
                        <div className="flex flex-col gap-2">
                          <select id="issue-payout-status" name="payoutStatus" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none font-bold text-sm bg-white dark:bg-gray-900" value={issueData.payoutStatus} onChange={e => setIssueData({ ...issueData, payoutStatus: e.target.value as any })}>
                            <option value="credited">Credited</option>
                            <option value="pending">Pending</option>
                            <option value="pre-payout">Pre-Payout</option>
                          </select>
                          {(issueData.payoutStatus === 'credited' || issueData.payoutStatus === 'pending') && (
                            <input type="text" id="issue-tx-id" name="payoutTransactionId" placeholder="Bank Transaction ID / UTR" className="w-full px-5 py-3 rounded-2xl border-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:border-blue-500 outline-none font-bold text-sm" value={issueData.payoutTransactionId} onChange={e => setIssueData({ ...issueData, payoutTransactionId: e.target.value })} />
                          )}
                        </div>
                      </div>

                      <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-3xl flex justify-between items-center">
                        <span className="text-[10px] font-black text-green-700 uppercase">Net Profit</span>
                        <span className="text-xl font-black text-green-800 dark:text-green-400">₹{netAdminProfit.toLocaleString()}</span>
                      </div>

                      <button type="submit" className="w-full bg-[#2E7D32] text-white py-4 rounded-[2rem] font-black shadow-xl hover:bg-[#1b5e20] transition-all">Finalize & Update Registry</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
