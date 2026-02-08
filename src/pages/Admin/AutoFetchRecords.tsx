
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useGlobalState } from '@/context';
import { AutoFetchRecord, ContactPerson, AdminPayoutRecord } from '@/types';
import { portalApi as api, ROOT_URL } from '@/services/api.service';
import { clearPagePersistence } from '@/utils/formPersistence';
import { WEB_AGGREGATORS, INSURANCE_COMPANIES, RELATIONS_LIST } from '@/constants';
import { customAlphabet } from 'nanoid';
import { compressLossless } from '@quicktoolsone/pdf-compress';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16);

// Data Entry Ledger Component
const DataEntryLedger: React.FC = () => {
  const { autoFetchRecords, saveAutoFetchRecord, deleteAutoFetchRecord, saveAdminPayoutRecord, adminPayoutRecords, showAlert, showConfirm, showToast } = useGlobalState();
  const [activeView, setActiveView] = useState<'table' | 'wizard'>('table');
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterAggregator, setFilterAggregator] = useState<string>('all');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<AutoFetchRecord | null>(null);

  useEffect(() => {
    if (zoomedImage) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [zoomedImage]);

  const initialRecord: Partial<AutoFetchRecord> = {
    ownerName: '', ownerAddress: '', vehicleRegNo: '', engineNo: '', chassisNo: '',
    policyNo: '', policyIssueDate: '', policyStartDate: '', policyEndDate: '', renewalDate: '',
    vehicleType: '', vehicleClass: '', panNo: '', dob: '', aadhaarNo: '',
    remarks: '', ownerPhone: '', specialNotes: '', ownerProfession: '',
    contacts: [{ id: '1', name: '', relation: RELATIONS_LIST[0], phone: '' }],
    brokerName: '', brokerPhone: '', brokerProfession: '', brokerAddress: '',
    webAggregator: WEB_AGGREGATORS[0], insuranceCompany: INSURANCE_COMPANIES[0], insuranceType: 'OD',
    isNameTransfer: false, nameTransferDate: '',
    documents: {}, status: 'fresh'
  };

  const [fileObjects, setFileObjects] = useState<Record<string, File>>({});

  const [formData, setFormData] = useState<Partial<AutoFetchRecord>>(initialRecord);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'policy' | 'endorsement' | 'rc' | 'rcBack' | 'pan' | 'aadhaar' | 'aadhaarBack' | 'voterFront' | 'voterBack') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true); // Temporarily show loading for read
    setErrorMessage(null);

    const docKey = type === 'aadhaar' ? 'aadhaarCard' :
      type === 'policy' ? 'policyCopy' :
        type === 'endorsement' ? 'endorsementCopy' :
          type === 'rc' ? 'rcFront' :
            type === 'rcBack' ? 'rcBack' :
              type === 'pan' ? 'panCard' : type;

    let finalFile = file;
    if (file.type === 'application/pdf') {
      try {
        const buffer = await file.arrayBuffer();
        const result = await compressLossless(buffer);
        finalFile = new File([result.pdf], file.name, { type: 'application/pdf' });
        console.log(`[Compression] ${file.name}: ${file.size} -> ${finalFile.size} bytes`);
      } catch (err) {
        console.error("[Compression Failed]", err);
        // Fallback to original file if compression fails
      }
    }

    // Store raw file for upload
    setFileObjects(prev => ({ ...prev, [docKey]: finalFile }));

    // Clean up old preview if it was a blob
    const oldUrl = formData.documents?.[docKey];
    if (oldUrl?.startsWith('blob:')) URL.revokeObjectURL(oldUrl);

    // USE BLOB URL FOR NATIVE BROWSER PREVIEW
    const blobUrl = URL.createObjectURL(finalFile);
    setFormData(prev => ({
      ...prev,
      documents: { ...prev.documents, [docKey]: blobUrl }
    }));

    // Trigger Automated Extraction (Tesseract OCR)
    try {
      // Only run for relevant front-facing docs
      if (['policy', 'rc', 'pan', 'aadhaar'].includes(type as string)) {
        const extracted = await api.extractDocumentData(finalFile, type);
        if (extracted && Object.keys(extracted).length > 0) {
          setFormData(prev => ({ ...prev, ...extracted }));
          // Optional: Show success toast or small indicator
        }
      }
    } catch (err) {
      console.error("AutoFetch Extraction Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup Blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(formData.documents || {}).forEach(url => {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleAddContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), { id: Date.now().toString(), name: '', relation: RELATIONS_LIST[0], phone: '' }]
    }));
  };

  const handleRemoveContact = (id: string) => {
    setFormData(prev => {
      if ((prev.contacts?.length || 0) <= 1) return prev;
      return { ...prev, contacts: prev.contacts?.filter(c => c.id !== id) };
    });
  };

  const updateContact = (id: string, field: keyof ContactPerson, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts?.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const handleFinalSubmit = async () => {
    try {
      setIsProcessing(true);
      const id = formData.id;
      if (!id) throw new Error("Critical: Missing Entry ID");
      const now = new Date();

      // Prepare Final Record Object (Data Part)
      // STABILITY FIX: Preserve existing document URLs while stripping Blob/Base64 previews
      const existingDocuments = formData.documents || {};
      const cleanDocuments: Record<string, string> = {};
      Object.entries(existingDocuments).forEach(([key, val]) => {
        // Only keep if it's a real server URL (not a blob for preview)
        if (val && !val.startsWith('blob:') && !val.startsWith('data:')) {
          cleanDocuments[key] = val;
        }
      });

      const finalRecordData: AutoFetchRecord = {
        ...(formData as AutoFetchRecord),
        id,
        timestamp: formData.timestamp || `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
        lastUpdated: now.toISOString(),
        status: formData.status || 'fresh',
        documents: cleanDocuments
      };

      // Construct FormData
      const submissionData = new FormData();
      submissionData.append('data', JSON.stringify(finalRecordData));

      // Append Files
      Object.entries(fileObjects).forEach(([key, file]) => {
        submissionData.append(`doc_${key}`, file);
      });

      // Save Primary Record via Multipart
      await saveAutoFetchRecord(submissionData);

      // Create/Update Logic for Payout Record
      const existingPayout = adminPayoutRecords.find(p => p.id === id);
      const payoutPayload: AdminPayoutRecord = existingPayout
        ? {
          ...existingPayout,
          customerName: finalRecordData.ownerName || existingPayout.customerName,
          vehicleNumber: finalRecordData.vehicleRegNo || existingPayout.vehicleNumber,
          insuranceCompany: finalRecordData.insuranceCompany || existingPayout.insuranceCompany,
          aggregatorName: finalRecordData.webAggregator || existingPayout.aggregatorName,
          policyType: finalRecordData.insuranceType || existingPayout.policyType,
          lastUpdated: now.toISOString()
        }
        : {
          id,
          timestamp: finalRecordData.timestamp,
          customerName: finalRecordData.ownerName || 'N/A',
          vehicleNumber: finalRecordData.vehicleRegNo || 'N/A',
          insuranceCompany: finalRecordData.insuranceCompany || 'N/A',
          aggregatorName: finalRecordData.webAggregator || 'N/A',
          policyType: finalRecordData.insuranceType || 'N/A',
          premiumAmount: 0,
          commissionRate: 0,
          tdsRate: 2, // Default 2%
          commissionOn: 'N/A',
          discount: 0,
          brokerPayment: 0,
          netProfit: 0,
          paymentReceived: 'No',
          remarks: 'New',
          lastUpdated: now.toISOString()
        };

      await saveAdminPayoutRecord(payoutPayload);

      showAlert('Save Successful', "Intelligence record has been recorded and payout log generated.", 'success');
      setActiveView('table');
      setFormData(initialRecord);
      setFileObjects({});
      setCurrentStep(1);
      setErrorMessage(null);
      clearPagePersistence();
    } catch (err: any) {
      console.error("Submission Error", err);
      setErrorMessage(`Failed to save record: ${err.message || 'Unknown Server Error'}`);
      showAlert('Submission Critical', `System failed to save record: ${err.message}. Please check logs.`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      'Confirm Deletion',
      `Are you sure you want to permanently REMOVE record ${id}? Associated Payout Record will also be deleted.`,
      async () => {
        await deleteAutoFetchRecord(id);
        showToast(`Record ${id} removed successfully`, 'success');
      },
      'error'
    );
  };

  const filteredRecords = useMemo(() => {
    return autoFetchRecords.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = r.id.toLowerCase().includes(q) || (r.ownerName || "").toLowerCase().includes(q) || (r.vehicleRegNo || "").toLowerCase().includes(q) || (r.policyNo || "").toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchesAggregator = filterAggregator === 'all' || r.webAggregator === filterAggregator;

      const renewalDate = r.renewalDate ? new Date(r.renewalDate) : null;
      const matchesMonth = filterMonth === 'all' || (renewalDate && renewalDate.getMonth().toString() === filterMonth);

      let matchesDate = true;
      if (startDate || endDate) {
        const recordDate = new Date(r.lastUpdated);
        if (startDate && recordDate < new Date(startDate)) matchesDate = false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (recordDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesAggregator && matchesMonth && matchesDate;
    }).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }, [autoFetchRecords, searchQuery, filterStatus, filterAggregator, filterMonth, startDate, endDate]);

  const handleExcelExport = () => {
    if (filteredRecords.length === 0) {
      showAlert('Filter Alert', "No records match the current filters.", 'info');
      return;
    }

    const headers = ["Timestamp", "Lead ID", "Owner Name", "Mobile", "Vehicle Reg No", "Policy No", "Aggregator", "Insurance Co", "Renewal Date", "Status", "Last Updated"];

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          .title { font-size: 18px; font-weight: bold; text-align: center; color: #2E7D32; padding: 20px; }
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
          th { background-color: #f3f4f6; color: #374151; font-weight: bold; border: 1px solid #d1d5db; padding: 12px; text-transform: uppercase; font-size: 10px; }
          td { border: 1px solid #e5e7eb; padding: 10px; font-size: 11px; }
          .status-renewed { background-color: #ecfdf5; color: #065f46; font-weight: bold; }
          .status-missed { background-color: #fef2f2; color: #991b1b; font-weight: bold; }
          .status-fresh { background-color: #eff6ff; color: #1e40af; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${headers.length}" class="title">FIVS INTELLIGENCE REGISTRY REPORT - ${new Date().toLocaleDateString()}</td></tr>
          <tr></tr>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map(r => `
              <tr>
                <td>${r.timestamp}</td>
                <td>${r.id}</td>
                <td style="text-transform: uppercase;">${r.ownerName}</td>
                <td>${r.ownerPhone}</td>
                <td style="text-transform: uppercase;">${r.vehicleRegNo}</td>
                <td>${r.policyNo}</td>
                <td>${r.webAggregator}</td>
                <td>${r.insuranceCompany}</td>
                <td>${r.renewalDate}</td>
                <td class="status-${r.status}">${r.status.toUpperCase()}</td>
                <td>${new Date(r.lastUpdated).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Intelligence_Report_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowCsvDialog(false);
  };

  const stepLabels = ["Insurance Policy", "Endorsement Copy", "Vehicle RC", "PAN Card", "Aadhaar Card", "Voter ID", "Manual Details"];
  const totalSteps = 7;
  const nextStep = () => { setCurrentStep(prev => Math.min(prev + 1, totalSteps)); setErrorMessage(null); };
  const prevStep = () => { setCurrentStep(prev => Math.max(prev - 1, 1)); setErrorMessage(null); };

  return (
    <div className="space-y-8 animate-fadeIn h-full pb-20">
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[250] flex items-center justify-center p-4">
          {/* Global Close Button - Fixed Top Right */}
          <div className="fixed top-6 right-6 md:top-10 md:right-10 z-[300] flex flex-col gap-4">
            <button
              onClick={() => setZoomedImage(null)}
              className="bg-white text-black w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-500 hover:text-white transition-all transform active:scale-95"
              title="Close Preview"
            >
              <span className="material-icons-outlined text-2xl md:text-3xl">close</span>
            </button>
            <button
              onClick={() => setRotation(r => r + 90)}
              className="bg-white text-black w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-500 hover:text-white transition-all transform active:scale-95"
              title="Rotate 90°"
            >
              <span className="material-icons-outlined text-2xl md:text-3xl">rotate_right</span>
            </button>
          </div>

          <div className="max-w-6xl w-full h-full flex flex-col items-center justify-center relative animate-scaleIn">
            {(() => {
              const docKey = Object.entries(formData.documents || {}).find(([_, v]) => v === zoomedImage)?.[0];
              const file = docKey ? fileObjects[docKey] : null;

              // Detection Logic
              const isPdf = (file?.type === 'application/pdf') ||
                (!file && (zoomedImage.startsWith('data:application/pdf') || zoomedImage.toLowerCase().includes('.pdf')));

              const isImage = (file?.type.startsWith('image/')) ||
                (!file && (zoomedImage.startsWith('data:image') || /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(zoomedImage)));

              if (isImage) {
                return (
                  <div
                    className="relative overflow-hidden cursor-move flex items-center justify-center w-full h-full"
                    onWheel={(e) => {
                      e.stopPropagation();
                      const delta = -Math.sign(e.deltaY) * 0.2;
                      setZoomLevel(prev => Math.min(Math.max(0.5, prev + delta), 5));
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      e.preventDefault();
                      setPanPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                  >
                    <img
                      src={getDocUrl(zoomedImage || '')}
                      className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-2xl border-4 border-white/10 transition-transform duration-75 relative z-10"
                      style={{ transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px) rotate(${rotation}deg)` }}
                      alt="Zoomed View"
                      draggable={false}
                    />
                    {/* Zoom Indicator Pilled */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-xs font-black backdrop-blur-md pointer-events-none z-20">
                      {Math.round(zoomLevel * 100)}%
                    </div>
                  </div>
                );
              } else if (isPdf) {
                return (
                  <div className="w-full h-[88vh] bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                    <embed
                      src={zoomedImage}
                      type="application/pdf"
                      className="w-full h-full"
                    />
                  </div>
                );
              } else {
                return (
                  <div className="bg-white p-16 rounded-[3rem] flex flex-col items-center shadow-2xl text-center">
                    <span className="material-icons-outlined text-red-500 text-9xl mb-8">insert_drive_file</span>
                    <p className="text-2xl font-black text-gray-800 uppercase tracking-widest mb-4">Document Attachment</p>
                    <p className="text-gray-500 mb-8 max-w-xs">This file type is not supported for direct preview.</p>
                    <a href={zoomedImage} target="_blank" rel="noreferrer" className="bg-[#2E7D32] text-white px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#1b5e20] transition-all">Open in New Tab</a>
                  </div>
                );
              }
            })()}

            {/* Contextual Close Label */}
            <p className="mt-6 text-white/40 text-[10px] uppercase font-black tracking-[0.3em] hidden md:block absolute bottom-4 w-full text-center pointer-events-none">Click outside or use ESC to exit | Scroll to Zoom | Drag to Pan</p>
          </div>
        </div>
      )}

      {
        showCsvDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-scaleIn border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black uppercase tracking-widest text-blue-600">Excel Report Generator</h3>
                <button onClick={() => setShowCsvDialog(false)} className="text-gray-400 hover:text-red-500"><span className="material-icons-outlined">close</span></button>
              </div>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[8px] font-black uppercase text-gray-400 block mb-2 ml-1">Start Date</label>
                  <input type="date" className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-gray-400 block mb-2 ml-1">End Date</label>
                  <input type="date" className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <button onClick={handleExcelExport} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all">
                <span className="material-icons-outlined mr-2 text-sm">auto_graph</span> Generate & Download .XLS
              </button>
            </div>
          </div>
        )
      }

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Intelligence Record System</h2>
          <p className="text-sm text-gray-500">Document-driven automation for professional insurance lifecycle registry.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCsvDialog(true)} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center border-none">
            <span className="material-icons-outlined mr-2">analytics</span> Export Report
          </button>
          <button onClick={() => { setFormData({ ...initialRecord, id: nanoid() }); setActiveView('wizard'); setCurrentStep(1); setErrorMessage(null); }} className="bg-[#2E7D32] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#1b5e20] transition-all flex items-center">
            <span className="material-icons-outlined mr-2">keyboard</span> New Data Entry
          </button>
        </div>
      </div>

      {
        activeView === 'table' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="relative lg:col-span-2">
                <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input type="text" id="af-search-query" placeholder="Quick Search ID, Name, Vehicle..." className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:border-[#2E7D32] shadow-inner transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select id="af-filter-status" className="px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-700 dark:text-white font-bold text-xs outline-none focus:border-[#2E7D32] transition-all" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Lifecycles</option>
                <option value="fresh">Fresh Leads</option>
                <option value="renewal-due">Renewal Due</option>
                <option value="renewed">Renewed Cases</option>
                <option value="missed">Missed Cases</option>
              </select>
              <select id="af-filter-aggregator" className="px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-700 dark:text-white font-bold text-xs outline-none focus:border-[#2E7D32] transition-all" value={filterAggregator} onChange={e => setFilterAggregator(e.target.value)}>
                <option value="all">All Aggregators</option>
                {WEB_AGGREGATORS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
              <table className="w-full text-left min-w-[1200px]">
                <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-black text-gray-400 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-8 py-5">Timestamp / ID</th>
                    <th className="px-8 py-5 min-w-[200px]">Owner Details</th>
                    <th className="px-8 py-5 min-w-[200px]">Vehicle & Policy</th>
                    <th className="px-8 py-5 min-w-[350px]">Insurers</th>
                    <th className="px-8 py-5 min-w-[180px]">Renewal Timeline</th>
                    <th className="px-8 py-5">Lifecycle</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700 text-sm">
                  {filteredRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-black text-[#2E7D32] uppercase mb-1">{rec.id}</p>
                        <p className="text-[10px] font-mono text-gray-400">{rec.timestamp}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold dark:text-white">{rec.ownerName || 'N/A'}</p>
                        <p className="text-[10px] text-gray-400">{rec.ownerPhone || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold dark:text-white uppercase">{rec.vehicleRegNo || 'N/A'}</p>
                        <p className="text-[10px] text-gray-400">Pol: {rec.policyNo || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold dark:text-gray-300">{rec.insuranceCompany}</p>
                        <p className="text-[10px] text-blue-500 font-black uppercase">{rec.webAggregator}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-orange-600">{rec.renewalDate || 'N/A'}</span>
                            {(() => {
                              if (!rec.renewalDate) return null;
                              const days = Math.ceil((new Date(rec.renewalDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                              if (days <= 7 && days > 0 && rec.status !== 'renewed') return <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] animate-pulse">EXPIRING</span>;
                              return null;
                            })()}
                          </div>
                          <span className="text-[9px] font-mono text-gray-400 mt-0.5">{rec.timestamp}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${rec.status === 'renewed' ? 'bg-green-50 text-green-600 border-green-100' :
                          rec.status === 'missed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>{rec.status.replace('-', ' ')}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setSelectedRecord(rec)} className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/10 rounded-full text-blue-500 hover:text-blue-600 transition-all cursor-pointer" title="View Details">
                            <span className="material-icons-outlined text-base">visibility</span>
                          </button>
                          <button onClick={() => { setFormData(rec); setActiveView('wizard'); setCurrentStep(totalSteps); }} className="w-8 h-8 flex items-center justify-center bg-green-50 dark:bg-green-900/10 rounded-full text-green-600 hover:text-green-700 transition-all cursor-pointer" title="Edit/Audit">
                            <span className="material-icons-outlined text-base">edit_note</span>
                          </button>
                          <button onClick={() => handleDelete(rec.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-full text-red-400 hover:text-red-600 transition-all cursor-pointer" title="Remove Record">
                            <span className="material-icons-outlined text-base">delete_outline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
            <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div>
                <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight uppercase tracking-widest text-sm">Automated Record Wizard</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Step {currentStep}: {stepLabels[currentStep - 1]}</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="hidden md:flex space-x-2">
                  {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
                    <button
                      key={step}
                      onClick={() => { setCurrentStep(step); setErrorMessage(null); }}
                      className={`w-12 h-[11px] rounded-full transition-all ${currentStep === step ? 'bg-[#2E7D32] scale-105' : currentStep > step ? 'bg-green-200' : 'bg-gray-200 dark:bg-gray-700'} hover:opacity-80 cursor-pointer`}
                      title={`Go to Step ${step}: ${stepLabels[step - 1]}`}
                    />
                  ))}
                </div>
                <button onClick={() => setActiveView('table')} className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm">
                  <span className="material-icons-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="max-w-6xl mx-auto">
                {errorMessage && (
                  <div className="mb-8 p-4 bg-orange-50 text-orange-700 rounded-2xl border border-orange-100 flex items-center gap-3 animate-fadeIn">
                    <span className="material-icons-outlined">warning</span>
                    <p className="text-xs font-bold uppercase">{errorMessage}</p>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-10 animate-fadeIn">
                    <WizardUpload
                      label="Upload Insurance Policy Copy"
                      subtext="Multi-page PDFs supported. System will scan all pages."
                      file={formData.documents?.policyCopy}
                      fileType={fileObjects.policyCopy?.type}
                      onUpload={e => handleFileUpload(e, 'policy')}
                      onPreview={() => setZoomedImage(formData.documents?.policyCopy || null)}
                      processing={isProcessing}
                      onReset={() => {
                        setFormData(prev => ({ ...prev, documents: { ...prev.documents, policyCopy: undefined } }));
                        setFileObjects(prev => { const n = { ...prev }; delete n.policyCopy; return n; });
                      }}
                      onSkip={nextStep}
                    />
                    <section className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">Policy Data Audit</h4>
                        {!formData.documents?.policyCopy && <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-full border border-orange-100">Manual Entry Mode</span>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <SmartInput id="af-owner-name" label="Owner's Name" value={formData.ownerName} onChange={v => setFormData(prev => ({ ...prev, ownerName: v }))} />
                        <SmartInput id="af-policy-no" label="Policy No" value={formData.policyNo} onChange={v => setFormData(prev => ({ ...prev, policyNo: v }))} />
                        <SmartInput id="af-policy-issue-date" label="Policy Issue Date" value={formData.policyIssueDate} onChange={v => setFormData(prev => ({ ...prev, policyIssueDate: v }))} type="date" />
                        <SmartInput id="af-policy-start-date" label="Policy Start Date" value={formData.policyStartDate} onChange={v => setFormData(prev => ({ ...prev, policyStartDate: v }))} type="date" />
                        <SmartInput id="af-policy-end-date" label="Policy End Date" value={formData.policyEndDate} onChange={v => setFormData(prev => ({ ...prev, policyEndDate: v }))} type="date" />
                        <SmartInput id="af-renewal-date" label="Renewal Date" value={formData.renewalDate} onChange={v => setFormData(prev => ({ ...prev, renewalDate: v }))} type="date" className="bg-orange-50 border-orange-100" />
                      </div>
                      <SmartInput id="af-owner-address" label="Owner Address" value={formData.ownerAddress} onChange={v => setFormData(prev => ({ ...prev, ownerAddress: v }))} />
                      <div className="flex justify-end pt-4">
                        <button onClick={nextStep} className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center">
                          Confirm & Next: Endorsement Copy <span className="material-icons-outlined ml-2">arrow_forward</span>
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-10 animate-fadeIn">
                    <WizardUpload
                      label="Upload Policy Endorsement Copy"
                      subtext="Optional. Upload if there are endorsement details."
                      file={formData.documents?.endorsementCopy}
                      fileType={fileObjects.endorsementCopy?.type}
                      onUpload={e => handleFileUpload(e, 'endorsement')}
                      onPreview={() => setZoomedImage(formData.documents?.endorsementCopy || null)}
                      processing={isProcessing}
                      onReset={() => {
                        setFormData(prev => ({ ...prev, documents: { ...prev.documents, endorsementCopy: undefined } }));
                        setFileObjects(prev => { const n = { ...prev }; delete n.endorsementCopy; return n; });
                      }}
                      onSkip={nextStep}
                      onBack={prevStep}
                    />
                    <div className="flex justify-between items-center pt-4">
                      <button onClick={prevStep} className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Back</button>
                      <button onClick={nextStep} className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center">
                        Confirm & Next: Vehicle RC <span className="material-icons-outlined ml-2">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-10 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <WizardUpload
                        label="RC Front"
                        subtext="Front side."
                        file={formData.documents?.rcFront}
                        fileType={fileObjects.rcFront?.type}
                        onUpload={e => handleFileUpload(e, 'rc')}
                        onPreview={() => setZoomedImage(formData.documents?.rcFront || null)}
                        processing={isProcessing}
                        onReset={() => {
                          setFormData(prev => ({ ...prev, documents: { ...prev.documents, rcFront: undefined } }));
                          setFileObjects(prev => { const n = { ...prev }; delete n.rcFront; return n; });
                        }}
                      />
                      <WizardUpload
                        label="RC Back"
                        subtext="Back side."
                        file={formData.documents?.rcBack}
                        fileType={fileObjects.rcBack?.type}
                        onUpload={e => handleFileUpload(e, 'rcBack')}
                        onPreview={() => setZoomedImage(formData.documents?.rcBack || null)}
                        processing={isProcessing}
                        onReset={() => {
                          setFormData(prev => ({ ...prev, documents: { ...prev.documents, rcBack: undefined } }));
                          setFileObjects(prev => { const n = { ...prev }; delete n.rcBack; return n; });
                        }}
                      />
                    </div>
                    <section className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 space-y-6">
                      <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">RC Data Audit</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SmartInput id="af-vehicle-class" label="Vehicle Class" value={formData.vehicleClass} onChange={v => setFormData(prev => ({ ...prev, vehicleClass: v }))} />
                        <SmartInput id="af-vehicle-reg-no" label="Vehicle Reg No" value={formData.vehicleRegNo} onChange={v => setFormData(prev => ({ ...prev, vehicleRegNo: v }))} />
                        <SmartInput id="af-chassis-no" label="Chassis No" value={formData.chassisNo} onChange={v => setFormData(prev => ({ ...prev, chassisNo: v }))} />
                        <SmartInput id="af-engine-no" label="Engine No" value={formData.engineNo} onChange={v => setFormData(prev => ({ ...prev, engineNo: v }))} />
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <button onClick={prevStep} className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Back</button>
                        <button onClick={nextStep} className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center">
                          Confirm & Next: PAN Card <span className="material-icons-outlined ml-2">arrow_forward</span>
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-10 animate-fadeIn">
                    <WizardUpload
                      label="Upload Owner's PAN Card"
                      subtext="Used for KYC and income verification."
                      file={formData.documents?.panCard}
                      fileType={fileObjects.panCard?.type}
                      onUpload={e => handleFileUpload(e, 'pan')}
                      onPreview={() => setZoomedImage(formData.documents?.panCard || null)}
                      processing={isProcessing}
                      onReset={() => {
                        setFormData(prev => ({ ...prev, documents: { ...prev.documents, panCard: undefined } }));
                        setFileObjects(prev => { const n = { ...prev }; delete n.panCard; return n; });
                      }}
                      onSkip={nextStep}
                      onBack={prevStep}
                    />
                    <section className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 space-y-6">
                      <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">PAN Card Audit</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SmartInput id="af-pan-no" label="PAN Number" value={formData.panNo} onChange={v => setFormData(prev => ({ ...prev, panNo: v }))} />
                        <SmartInput id="af-dob" label="Date of Birth" value={formData.dob} onChange={v => setFormData(prev => ({ ...prev, dob: v }))} type="date" />
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <button onClick={prevStep} className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Back</button>
                        <button onClick={nextStep} className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center">
                          Confirm & Next: Aadhaar Card <span className="material-icons-outlined ml-2">arrow_forward</span>
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-10 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <WizardUpload
                        label="Aadhaar Front"
                        subtext="Front side with photo."
                        file={formData.documents?.aadhaarCard}
                        fileType={fileObjects.aadhaarCard?.type}
                        onUpload={e => handleFileUpload(e, 'aadhaar')}
                        onPreview={() => setZoomedImage(formData.documents?.aadhaarCard || null)}
                        processing={isProcessing}
                        onReset={() => {
                          setFormData(prev => ({ ...prev, documents: { ...prev.documents, aadhaarCard: undefined } }));
                          setFileObjects(prev => { const n = { ...prev }; delete n.aadhaarCard; return n; });
                        }}
                      />
                      <WizardUpload
                        label="Aadhaar Back"
                        subtext="Back side with address."
                        file={formData.documents?.aadhaarBack}
                        fileType={fileObjects.aadhaarBack?.type}
                        onUpload={e => handleFileUpload(e, 'aadhaarBack')}
                        onPreview={() => setZoomedImage(formData.documents?.aadhaarBack || null)}
                        processing={isProcessing}
                        onReset={() => {
                          setFormData(prev => ({ ...prev, documents: { ...prev.documents, aadhaarBack: undefined } }));
                          setFileObjects(prev => { const n = { ...prev }; delete n.aadhaarBack; return n; });
                        }}
                      />
                    </div>

                    <section className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 space-y-6">
                      <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">Aadhaar Audit</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SmartInput id="af-aadhaar-no" label="Aadhaar Number" value={formData.aadhaarNo} onChange={v => setFormData(prev => ({ ...prev, aadhaarNo: v }))} />
                        <div className="p-4 bg-[#2E7D32] text-white rounded-2xl flex flex-col justify-center">
                          <p className="text-[8px] font-black uppercase opacity-60">System Lead ID</p>
                          <p className="text-sm font-black tracking-tight break-all">{formData.id || 'AWAITING DATA'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <button onClick={prevStep} className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Back</button>
                        <button onClick={nextStep} className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center">
                          Confirm & Next: Voter ID <span className="material-icons-outlined ml-2">arrow_forward</span>
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="space-y-10 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <WizardUpload
                        label="Voter Front"
                        subtext="Optional ID."
                        file={formData.documents?.voterFront}
                        fileType={fileObjects.voterFront?.type}
                        onUpload={e => handleFileUpload(e, 'voterFront')}
                        onPreview={() => setZoomedImage(formData.documents?.voterFront || null)}
                        processing={isProcessing}
                        onReset={() => {
                          setFormData(prev => ({ ...prev, documents: { ...prev.documents, voterFront: undefined } }));
                          setFileObjects(prev => { const n = { ...prev }; delete n.voterFront; return n; });
                        }}
                      />
                      <WizardUpload
                        label="Voter Back"
                        subtext="Optional Address."
                        file={formData.documents?.voterBack}
                        fileType={fileObjects.voterBack?.type}
                        onUpload={e => handleFileUpload(e, 'voterBack')}
                        onPreview={() => setZoomedImage(formData.documents?.voterBack || null)}
                        processing={isProcessing}
                        onReset={() => {
                          setFormData(prev => ({ ...prev, documents: { ...prev.documents, voterBack: undefined } }));
                          setFileObjects(prev => { const n = { ...prev }; delete n.voterBack; return n; });
                        }}
                      />
                    </div>
                    {(formData.documents?.voterFront || formData.documents?.voterBack) && (
                      <div className="flex justify-between items-center pt-4">
                        <button onClick={prevStep} className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Back</button>
                        <button onClick={nextStep} className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center">
                          Next: Manual Details <span className="material-icons-outlined ml-2">arrow_forward</span>
                        </button>
                      </div>
                    )}
                    {/* Allow skip if no documents */}
                    {!formData.documents?.voterFront && !formData.documents?.voterBack && (
                      <div className="flex justify-between items-center pt-4">
                        <button onClick={prevStep} className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Back</button>
                        <button onClick={nextStep} className="bg-gray-100/50 text-gray-500 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center">
                          Skip Voter ID <span className="material-icons-outlined ml-2">fast_forward</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 7 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                    <div className="space-y-8">
                      <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin Audit Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32]">
                            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Web Aggregator</label>
                            <select id="af-web-aggregator" className="w-full bg-transparent outline-none font-bold text-xs dark:text-white" value={formData.webAggregator} onChange={e => setFormData(prev => ({ ...prev, webAggregator: e.target.value }))}>
                              {WEB_AGGREGATORS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32]">
                            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Insurance Company</label>
                            <select id="af-insurance-company" className="w-full bg-transparent outline-none font-bold text-xs dark:text-white" value={formData.insuranceCompany} onChange={e => setFormData(prev => ({ ...prev, insuranceCompany: e.target.value }))}>
                              {INSURANCE_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32]">
                            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Policy Type</label>
                            <select id="af-insurance-type" className="w-full bg-transparent outline-none font-bold text-xs dark:text-white" value={formData.insuranceType} onChange={e => setFormData(prev => ({ ...prev, insuranceType: e.target.value as any }))}>
                              <option value="TP">TP (Third Party)</option>
                              <option value="OD">OD (Own Damage)</option>
                              <option value="COMPREHENSIVE">COMPREHENSIVE</option>
                            </select>
                          </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <label className="text-sm font-black text-gray-700 dark:text-gray-200">Is Name Transfer Required?</label>
                            </div>
                            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100">
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, isNameTransfer: true }))} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${formData.isNameTransfer ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>Yes</button>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, isNameTransfer: false }))} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!formData.isNameTransfer ? 'bg-gray-500 text-white' : 'text-gray-400'}`}>No</button>
                            </div>
                          </div>
                          {formData.isNameTransfer && (
                            <div className="animate-fadeIn">
                              <SmartInput id="af-name-transfer-date" label="Estimated Name Transfer Date" value={formData.nameTransferDate} onChange={v => setFormData(prev => ({ ...prev, nameTransferDate: v }))} type="date" />
                            </div>
                          )}
                        </div>

                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 pt-6">Manual Business Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <SmartInput id="af-owner-phone" label="Owner Phone No" value={formData.ownerPhone} onChange={v => setFormData(prev => ({ ...prev, ownerPhone: v }))} />
                          <SmartInput id="af-owner-profession" label="Owner Profession" value={formData.ownerProfession} onChange={v => setFormData(prev => ({ ...prev, ownerProfession: v }))} />
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Persons Network</h5>
                            <button onClick={handleAddContact} className="text-[#2E7D32] text-[10px] font-black uppercase tracking-widest flex items-center hover:underline">
                              <span className="material-icons-outlined text-xs mr-1">add_circle</span> Add Contact
                            </button>
                          </div>
                          {formData.contacts?.map((contact) => (
                            <div key={contact.id} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-3 relative group">
                              <SmartInput id={`af-contact-name-${contact.id}`} label="Contact Name" value={contact.name} onChange={v => updateContact(contact.id, 'name', v)} />
                              <SmartInput id={`af-contact-relation-${contact.id}`} label="Relation" value={contact.relation} onChange={(v: string) => updateContact(contact.id, 'relation', v)} />
                              <SmartInput id={`af-contact-phone-${contact.id}`} label="Phone" value={contact.phone} onChange={v => updateContact(contact.id, 'phone', v)} />
                              <button onClick={() => handleRemoveContact(contact.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-gray-700 text-red-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="material-icons-outlined text-xs">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <div className="space-y-8">
                      <section className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Broker Registry</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <SmartInput id="af-broker-name" label="Broker Name" value={formData.brokerName} onChange={v => setFormData(prev => ({ ...prev, brokerName: v }))} />
                          <SmartInput id="af-broker-phone" label="Broker Phone" value={formData.brokerPhone} onChange={v => setFormData(prev => ({ ...prev, brokerPhone: v }))} />
                          <SmartInput id="af-broker-profession" label="Broker Profession" value={formData.brokerProfession} onChange={v => setFormData(prev => ({ ...prev, brokerProfession: v }))} />
                          <SmartInput id="af-broker-address" label="Broker Address" value={formData.brokerAddress} onChange={v => setFormData(prev => ({ ...prev, brokerAddress: v }))} />
                        </div>
                      </section>

                      <section className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes & Remarks</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SmartTextArea id="af-special-notes" label="Special Notes" value={formData.specialNotes} onChange={v => setFormData(prev => ({ ...prev, specialNotes: v }))} />
                          <SmartTextArea id="af-remarks" label="Remarks" value={formData.remarks} onChange={v => setFormData(prev => ({ ...prev, remarks: v }))} />
                        </div>
                      </section>

                      <div className="p-8 bg-orange-50 dark:bg-orange-900/10 rounded-[2.5rem] border border-orange-100 dark:border-orange-900/30 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest">Renewal Lifecycle Action</p>
                          <p className="text-xs text-orange-600 dark:text-orange-300 font-medium">Mark this record's business status.</p>
                        </div>
                        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30">
                          {['fresh', 'renewed', 'missed'].map(st => (
                            <button key={st} onClick={() => setFormData(prev => ({ ...prev, status: st as any }))} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${formData.status === st ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>{st}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button onClick={prevStep} className="flex-1 py-6 border-2 border-gray-100 dark:border-gray-700 rounded-[2rem] font-black text-gray-400 uppercase text-xs tracking-widest">Back</button>
                        <button onClick={handleFinalSubmit} className="flex-[2] bg-[#2E7D32] text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-[#1b5e20] transition-all transform active:scale-[0.98] text-lg uppercase tracking-widest">
                          Submit Business Record
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl animate-scaleIn border border-gray-100 dark:border-gray-700">
            <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md z-10">
              <div>
                <h3 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Record Details</h3>
                <p className="text-sm text-gray-400 font-mono mt-1">ID: {selectedRecord.id}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="p-10 space-y-10">
              {/* Section 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Owner Information</h4>
                  <DetailRow label="Owner Name" value={selectedRecord.ownerName} />
                  <DetailRow label="Phone" value={selectedRecord.ownerPhone} />
                  <DetailRow label="Address" value={selectedRecord.ownerAddress} />
                  <DetailRow label="Profession" value={selectedRecord.ownerProfession} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Vehicle Details</h4>
                  <DetailRow label="Registration No" value={selectedRecord.vehicleRegNo} />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Type" value={selectedRecord.vehicleType} />
                    <DetailRow label="Class" value={selectedRecord.vehicleClass} />
                  </div>
                  <DetailRow label="Chassis No" value={selectedRecord.chassisNo} />
                  <DetailRow label="Engine No" value={selectedRecord.engineNo} />
                </div>
              </div>

              {/* Section 2: Policy & Insurance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Policy Status</h4>
                  <DetailRow label="Policy No" value={selectedRecord.policyNo} />
                  <DetailRow label="Insurance Company" value={selectedRecord.insuranceCompany} />
                  <DetailRow label="Policy Type" value={selectedRecord.insuranceType} />
                  <DetailRow label="Web Aggregator" value={selectedRecord.webAggregator} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Key Dates</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Issue Date" value={selectedRecord.policyIssueDate} />
                    <DetailRow label="Renewal Date" value={selectedRecord.renewalDate} />
                    <DetailRow label="Start Date" value={selectedRecord.policyStartDate} />
                    <DetailRow label="End Date" value={selectedRecord.policyEndDate} />
                  </div>
                </div>
              </div>

              {/* Section 3: Identity & Contacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Identity Proofs</h4>
                  <DetailRow label="PAN Number" value={selectedRecord.panNo} />
                  <DetailRow label="Aadhaar Number" value={selectedRecord.aadhaarNo} />
                  <DetailRow label="Date of Birth" value={selectedRecord.dob} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Emergency Contacts</h4>
                  {selectedRecord.contacts?.map((c, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-xs">
                      <span className="font-bold">{c.name}</span> <span className="text-gray-400">({c.relation})</span>
                      <div className="text-gray-500 dark:text-gray-300 mt-1">{c.phone}</div>
                    </div>
                  )) || <span className="text-gray-400 italic text-xs">No contacts added</span>}
                </div>
              </div>

              {/* Section 4: Remarks */}
              {selectedRecord.remarks && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-2xl border border-yellow-100 dark:border-yellow-800">
                  <h4 className="text-xs font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-widest mb-2">Remarks</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{selectedRecord.remarks}</p>
                </div>
              )}

              {/* Section 5: Documents Links */}
              <div>
                <h4 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Attached Documents</h4>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(selectedRecord.documents || {}).map(([key, url]) => (
                    <a key={key} href={getDocUrl(url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors group">
                      <span className="material-icons-outlined text-gray-400 group-hover:text-green-600">description</span>
                      <div>
                        <div className="text-[10px] font-black uppercase text-gray-500 group-hover:text-green-700">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-[9px] text-gray-400">Click to View</div>
                      </div>
                    </a>
                  ))}
                  {(!selectedRecord.documents || Object.keys(selectedRecord.documents).length === 0) && (
                    <span className="text-gray-400 italic text-sm">No documents attached</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

const WizardUpload = ({ label, subtext, file, fileType, onUpload, processing, onReset, onPreview, onSkip, onBack }: any) => {
  const handleDownload = () => {
    if (!file) return;
    const link = document.createElement('a');
    link.href = file;
    link.download = `Document_${label.replace(/\s+/g, '_')}_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = (fileType?.startsWith('image/')) || (file && (file.startsWith('data:image') || /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(file)));
  const isPdf = (fileType === 'application/pdf') || (file && (file.startsWith('data:application/pdf') || file.toLowerCase().includes('.pdf')));

  return (
    <div className={`relative group p-10 rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center transition-all min-h-[300px] text-center ${file ? 'border-green-500 bg-green-50/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'}`}>
      {!file && (onBack || onSkip) && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
          <div>
            {onBack && (
              <button
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-[#2E7D32] rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-700 shadow-sm transition-all flex items-center"
              >
                <span className="material-icons-outlined mr-1 text-sm">arrow_back</span> Previous Step
              </button>
            )}
          </div>
          {onSkip && (
            <button
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-[#2E7D32] rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-700 shadow-sm transition-all flex items-center"
            >
              Skip This Step <span className="material-icons-outlined ml-1 text-sm">fast_forward</span>
            </button>
          )}
        </div>
      )}

      {file ? (
        <div className="animate-scaleIn flex flex-col items-center w-full">
          {isImage ? (
            <div onClick={onPreview} className="w-48 h-48 rounded-2xl overflow-hidden mb-4 border-4 border-white shadow-xl cursor-zoom-in group-hover:scale-105 transition-transform bg-gray-50/50 dark:bg-gray-900/50">
              <img src={getDocUrl(file)} className="w-full h-full object-contain" />
            </div>
          ) : isPdf ? (
            <div onClick={onPreview} className="w-48 h-64 rounded-2xl overflow-hidden mb-4 border-4 border-white shadow-xl cursor-zoom-in group-hover:scale-105 transition-transform relative bg-gray-50 flex flex-col items-center justify-center p-6 border border-gray-100">
              <span className="material-icons-outlined text-red-500 text-6xl mb-4 animate-pulse">picture_as_pdf</span>
              <p className="text-[10px] font-black uppercase text-gray-800 tracking-wider">PDF Ready</p>
              <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border">Tap to Preview</p>
              {/* Silent iframe background for quick load check */}
              <iframe src={`${file}#toolbar=0&view=FitH`} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" />
            </div>
          ) : (
            <div onClick={onPreview} className="w-48 h-48 rounded-2xl bg-white flex flex-col items-center justify-center mb-4 border shadow-xl cursor-pointer">
              <span className="material-icons-outlined text-gray-400 text-5xl mb-2">insert_drive_file</span>
              <p className="text-[10px] font-black uppercase text-gray-400">View Attachment</p>
            </div>
          )}
          <h4 className="text-xl font-black text-green-800 uppercase tracking-widest">{label} Active</h4>
          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            <button onClick={onPreview} className="px-5 py-2 bg-green-600 rounded-xl text-[10px] font-black text-white hover:bg-green-700 transition-colors uppercase tracking-widest flex items-center">
              <span className="material-icons-outlined text-xs mr-1">visibility</span> Preview
            </button>
            <button onClick={handleDownload} className="px-5 py-2 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 transition-colors uppercase tracking-widest flex items-center">
              <span className="material-icons-outlined text-xs mr-1">file_download</span> Download
            </button>
            <button onClick={onReset} className="px-5 py-2 bg-white rounded-xl text-[10px] font-black text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest border border-red-100 flex items-center">
              <span className="material-icons-outlined text-xs mr-1">refresh</span> Reset/Re-upload
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={onUpload} disabled={processing} />
          <span className="material-icons-outlined text-gray-300 text-7xl mb-6 group-hover:scale-110 transition-transform">{processing ? 'sync' : 'cloud_upload'}</span>
          <h4 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-widest">{processing ? 'Processing Document...' : label}</h4>
          <p className="text-sm text-gray-400 mt-3 font-medium">{processing ? 'Scrolling through entire document for precise extraction...' : subtext}</p>
          {processing && (
            <div className="mt-6 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#2E7D32] animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SmartInput = ({ id, label, value, onChange, type = "text", required = false, className = "" }: any) => (
  <div className={`p-4 bg-gray-50/50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32] focus-within:ring-4 focus-within:ring-green-500/5 ${className}`}>
    <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">{label} {required && '*'}</label>
    <input id={id} type={type} className="w-full bg-transparent outline-none font-bold text-xs dark:text-white" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

const SmartTextArea = ({ id, label, value, onChange, className = "" }: any) => (
  <div className={`p-4 bg-gray-50/50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32] focus-within:ring-4 focus-within:ring-green-500/5 ${className}`}>
    <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">{label}</label>
    <textarea id={id} rows={3} className="w-full bg-transparent outline-none font-bold text-xs dark:text-white resize-none" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

const DetailRow = ({ label, value }: { label: string, value?: string }) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{label}</span>
    <span className="text-sm font-bold text-gray-800 dark:text-white break-words">{value || '-'}</span>
  </div>
);

const getDocUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http')) return url;
  if (url.startsWith('/api/uploads')) return `${ROOT_URL}${url}`;
  return url;
};

export default DataEntryLedger;
