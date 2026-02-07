
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { User, LeadStatus, Lead, LeadMessage } from '@/types';
import { useGlobalState } from '@/context';
import { compressLossless } from '@quicktoolsone/pdf-compress';
import { LEAD_TYPES, INSURANCE_REQUIREMENTS, WEB_AGGREGATORS, INSURANCE_COMPANIES } from '@/constants';

const PartnerLeads: React.FC<{ user: User }> = ({ user }) => {
  const { leads, addLead, updateLead } = useGlobalState();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<'motor' | 'health' | 'life' | 'sme'>('motor');
  const [selectedCategory, setSelectedCategory] = useState<'self' | 'admin'>('admin');

  // Enhanced Form State - Ensuring required fields are initialized
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    specialNote: '',
    aggregator: '',
    insuranceCompany: '',
    policyType: 'TP',
    isNameTransfer: false,
    nameTransferDate: '',
    preferredInsurers: [] as string[]
  });

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<LeadMessage[]>([]);
  const [showDocsDialog, setShowDocsDialog] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const editingLead = useMemo(() => leads.find(l => l.id === editingLeadId), [leads, editingLeadId]);
  const partnerLeads = useMemo(() => leads.filter(l => l.partnerId === user.id), [leads, user.id]);

  useEffect(() => {
    if (editingLead) {
      setLocalMessages(editingLead.messages || []);
    } else {
      setLocalMessages([]);
    }
  }, [editingLeadId, editingLead?.messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    if (editingLeadId && localMessages.length > 0) {
      const timer = setTimeout(() => scrollToBottom('smooth'), 100);
      return () => clearTimeout(timer);
    }
  }, [localMessages.length, editingLeadId, scrollToBottom]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const promises = filesArray.map(async file => {
        let finalFile = file;
        if (file.type === 'application/pdf') {
          try {
            const buffer = await file.arrayBuffer();
            const result = await compressLossless(buffer);
            finalFile = new File([result.pdf], file.name, { type: 'application/pdf' });
            console.log(`[Compression] ${file.name}: ${file.size} -> ${finalFile.size} bytes`);
          } catch (err) {
            console.error("[Compression Failed]", err);
          }
        }

        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(finalFile);
        });
      });
      const base64Files = await Promise.all(promises);
      setUploadedFiles(prev => [...prev, ...base64Files]);
    }
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      handleSendMessage(base64);
    };
    reader.readAsDataURL(file);
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  };

  const handleSendMessage = async (fileUrl?: string) => {
    if ((!chatMessage.trim() && !fileUrl) || !editingLead) return;

    const newMessage: LeadMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      text: chatMessage,
      timestamp: new Date().toISOString(),
      fileUrl: fileUrl
    };

    setLocalMessages(prev => [...prev, newMessage]);
    setChatMessage('');

    try {
      const updatedMessages = [...(editingLead.messages || []), { ...newMessage, id: `msg-${Date.now()}` }];
      await updateLead(editingLead.id, { messages: updatedMessages });
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const toggleInsurer = (insurer: string) => {
    const current = [...formData.preferredInsurers];
    const idx = current.indexOf(insurer);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(insurer);
    }
    setFormData({ ...formData, preferredInsurers: current });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return;

    setIsSubmitting(true);
    try {
      await addLead({
        partnerId: user.id,
        leadType: selectedType,
        leadCategory: selectedCategory,
        customerName: formData.name,
        customerMobile: formData.mobile,
        status: LeadStatus.SUBMITTED,
        commission: 0,
        partnerCommission: 0,
        adminCommission: 0,
        specialNote: formData.specialNote,
        documents: uploadedFiles,
        aggregator: formData.aggregator,
        insuranceCompany: formData.insuranceCompany,
        policyType: formData.policyType,
        isNameTransfer: formData.isNameTransfer,
        nameTransferDate: formData.nameTransferDate,
        preferredInsurers: formData.preferredInsurers
      });
      setShowForm(false);
      setFormData({
        name: '', mobile: '', specialNote: '',
        aggregator: '', insuranceCompany: '',
        policyType: 'TP', isNameTransfer: false, nameTransferDate: '',
        preferredInsurers: []
      });
      setUploadedFiles([]);
    } catch (err) {
      console.error("Lead submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isFinalized = editingLead?.status === LeadStatus.POLICY_ISSUED || editingLead?.status === LeadStatus.CONVERTED;

  return (
    <div className="space-y-8 animate-fadeIn h-full">
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

      {showDocsDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-100 dark:border-gray-700">
            <div className="p-6 bg-[#2E7D32] text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-widest">Document Requirements Guide</h3>
              <button onClick={() => setShowDocsDialog(false)} className="hover:bg-black/10 rounded-full p-1">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {Object.entries(INSURANCE_REQUIREMENTS).map(([type, docs]) => (
                <div key={type} className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <h4 className="text-[10px] font-black text-[#2E7D32] uppercase tracking-[0.2em] mb-3 flex items-center">
                    <span className="material-icons-outlined text-sm mr-2">description</span>
                    {type} Insurance
                  </h4>
                  <ul className="space-y-2">
                    {docs.map((doc, i) => (
                      <li key={i} className="flex items-start space-x-2 text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                        <span className="material-icons-outlined text-green-500 text-[14px] mt-0.5">check_circle</span>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-center">
              <button
                onClick={() => setShowDocsDialog(false)}
                className="bg-[#2E7D32] text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Lead Management</h2>
          <p className="text-sm text-gray-500">Track status and discuss requirements with Admin.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowForm(true)}
            disabled={user.status === 'frozen'}
            className="bg-[#2E7D32] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center disabled:opacity-50 transition-all hover:bg-[#1b5e20]"
          >
            <span className="material-icons-outlined mr-2">add</span>
            Submit Lead
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase tracking-widest font-black text-gray-400 border-b dark:border-gray-700">
            <tr>
              <th className="px-6 py-4">Customer Details</th>
              <th className="px-6 py-4">Handling</th>
              <th className="px-6 py-4">Current Status</th>
              <th className="px-6 py-4">Policy Copy</th>
              <th className="px-6 py-4 text-right">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700 text-sm">
            {partnerLeads.slice().reverse().map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-black text-gray-800 dark:text-white text-sm">{lead.customerName}</p>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{lead.leadType} insurance</p>
                    <span className="text-[8px] text-gray-300">•</span>
                    <button
                      onClick={() => handleCopyId(lead.id)}
                      className="text-[10px] text-blue-500 font-bold uppercase hover:underline flex items-center"
                    >
                      ID: #{lead.id}
                      <span className="material-icons-outlined text-[12px] ml-1">content_copy</span>
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${lead.leadCategory === 'self' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {lead.leadCategory === 'self' ? 'Self' : 'Admin'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${lead.status === LeadStatus.POLICY_ISSUED ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {lead.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {lead.policyUrl ? (
                    <a
                      href={lead.policyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-[#2E7D32] font-black text-[10px] uppercase tracking-widest hover:underline"
                    >
                      <span className="material-icons-outlined text-sm">download</span>
                      <span>Download Policy</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-300 font-bold uppercase">Awaiting Issue</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setEditingLeadId(lead.id)}
                    className="p-2 text-[#2E7D32] hover:bg-green-50 rounded-xl flex items-center ml-auto transition-all"
                  >
                    <span className="material-icons-outlined mr-1">chat</span>
                    <span className="text-[10px] font-black uppercase">Discussion</span>
                  </button>
                </td>
              </tr>
            ))}
            {partnerLeads.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-gray-400 italic">No leads submitted yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-gray-800 w-full md:rounded-3xl md:max-w-4xl max-h-[95vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-20">
              <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">New Prospect Submission</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <form id="submission-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 mb-6">
                  <button type="button" onClick={() => setSelectedCategory('admin')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'admin' ? 'bg-[#2E7D32] text-white shadow-md' : 'text-gray-400'}`}>Admin Handling</button>
                  <button type="button" onClick={() => setSelectedCategory('self')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'self' ? 'bg-[#2E7D32] text-white shadow-md' : 'text-gray-400'}`}>Self Handling</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Full Name</label>
                      <input type="text" id="lead-customer-name" name="customerName" required placeholder="Enter Name" className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-[#2E7D32]" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                      <input type="tel" id="lead-customer-mobile" name="customerMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-[#2E7D32]" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Lead Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {LEAD_TYPES.map(t => (
                          <button key={t.id} type="button" onClick={() => setSelectedType(t.id as any)} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${selectedType === t.id ? 'bg-green-50 text-[#2E7D32] border-[#2E7D32]' : 'border-gray-100 text-gray-400'}`}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preferred Companies Name</label>
                      <div className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white overflow-y-auto h-48 custom-scrollbar bg-gray-50 dark:bg-gray-900/30">
                        <div className="space-y-2">
                          {INSURANCE_COMPANIES.map(company => (
                            <label key={company} className="flex items-center space-x-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                id={`insurer-${company}`}
                                name="preferredInsurers"
                                className="w-4 h-4 rounded border-gray-300 text-[#2E7D32] focus:ring-[#2E7D32]"
                                checked={formData.preferredInsurers.includes(company)}
                                onChange={() => toggleInsurer(company)}
                              />
                              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 group-hover:text-[#2E7D32] transition-colors">{company}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Select multiple insurers you prefer for this lead.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Special Instructions</label>
                  <textarea
                    id="lead-special-note"
                    name="specialNote"
                    placeholder="Special Note / Instructions (Optional)"
                    rows={4}
                    className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none"
                    value={formData.specialNote}
                    onChange={e => setFormData({ ...formData, specialNote: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div className="p-8 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 rounded-2xl text-center flex flex-col items-center justify-center min-h-[180px] relative transition-all hover:border-[#2E7D32]">
                      <input type="file" multiple onChange={handleFileUpload} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        <span className="material-icons-outlined text-gray-300 text-4xl block mb-2">cloud_upload</span>
                        <p className="text-[10px] font-black text-gray-500 uppercase">Upload Identity & Policy Docs</p>
                        <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{uploadedFiles.length} files selected</p>
                      </label>
                    </div>

                    {/* Requirement 2: Document Preview Section */}
                    {uploadedFiles.length > 0 && (
                      <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 animate-fadeIn">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Upload Previews</h4>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                          {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
                              {file.startsWith('data:image') ? (
                                <img src={file} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                  <span className="material-icons-outlined text-red-500 text-lg">picture_as_pdf</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <span className="material-icons-outlined text-[10px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center h-full">
                    <button
                      type="button"
                      onClick={() => setShowDocsDialog(true)}
                      className="w-full flex items-center justify-center space-x-3 p-6 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800 group hover:bg-blue-100 transition-all"
                    >
                      <span className="material-icons-outlined text-3xl group-hover:scale-110 transition-transform">info</span>
                      <div className="text-left">
                        <p className="text-xs font-black uppercase tracking-widest">Required Documents Guide</p>
                        <p className="text-[10px] font-medium opacity-80">Click to view checklist for {selectedType} insurance</p>
                      </div>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-8 border-t dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 z-20">
              <button
                type="submit"
                form="submission-form"
                disabled={isSubmitting}
                className="w-full bg-[#2E7D32] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transform active:scale-[0.98] transition-all"
              >
                {isSubmitting ? 'Processing Submission...' : 'Confirm & Submit Prospect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLeadId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-gray-800 w-full md:rounded-[3rem] md:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleIn border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center sticky top-0 z-20">
              <div>
                <h3 className="text-xl font-black dark:text-white tracking-tight">{editingLead?.customerName || 'Lead Discussion'}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status: {editingLead?.status.replace('-', ' ')}</p>
              </div>
              <button onClick={() => setEditingLeadId(null)} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition-colors"><span className="material-icons-outlined">close</span></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white dark:bg-gray-950 scroll-smooth">
              {localMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.senderId === user.id ? 'bg-[#2E7D32] text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-200 rounded-tl-none border dark:border-gray-700 shadow-sm'}`}>
                    <p className="text-[9px] font-black opacity-60 uppercase mb-1 tracking-widest">{msg.senderId === user.id ? 'You' : msg.senderName}</p>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
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
                  <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
              {localMessages.length === 0 && (
                <p className="text-center text-gray-400 italic text-xs py-20 uppercase tracking-widest opacity-60">No messages yet. Send a query to the admin.</p>
              )}
              <div ref={chatEndRef} />
            </div>

            {!isFinalized ? (
              <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center gap-3 sticky bottom-0 z-20">
                <input
                  type="file"
                  id="chat-file-upload"
                  name="chatFile"
                  ref={chatFileInputRef}
                  className="hidden"
                  onChange={handleChatFileUpload}
                />
                <button
                  onClick={() => chatFileInputRef.current?.click()}
                  className="p-3 text-gray-400 hover:text-[#2E7D32] transition-colors bg-white dark:bg-gray-800 rounded-2xl shadow-sm"
                  title="Upload Document"
                >
                  <span className="material-icons-outlined">attach_file</span>
                </button>
                <input
                  type="text"
                  id="chat-message-input"
                  name="chatMessage"
                  placeholder="Type your question..."
                  className="flex-1 px-5 py-3 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white rounded-2xl outline-none focus:ring-1 focus:ring-[#2E7D32] transition-all bg-white dark:bg-gray-950"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={() => handleSendMessage()} className="bg-[#2E7D32] text-white p-3 rounded-2xl shadow-lg transform active:scale-95 transition-all">
                  <span className="material-icons-outlined">send</span>
                </button>
              </div>
            ) : (
              <div className="p-6 border-t dark:border-gray-800 bg-green-50 dark:bg-green-900/10 text-center sticky bottom-0 z-20">
                <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-[0.15em]">Discussion closed. Policy has been generated.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerLeads;
