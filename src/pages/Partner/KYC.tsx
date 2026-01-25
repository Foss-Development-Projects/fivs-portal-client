
import React, { useState, useEffect } from 'react';
import { User, KYCStatus } from '@/types';
import { useGlobalState } from '@/context';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const KYCStep = ({ number, title, active }: { number: number, title: string, active: boolean }) => (
  <div className={`flex flex-col items-center space-y-2 ${active ? 'opacity-100' : 'opacity-40'}`}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black border-2 transition-all ${active ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow-lg shadow-green-100' : 'text-gray-400 border-gray-200'
      }`}>
      {number}
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</span>
  </div>
);

const FileInput = ({ label, id, fileData, onUpload, disabled }: { label: string, id: string, fileData?: string, onUpload: (data: string) => void, disabled?: boolean }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onUpload(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <div className={`relative border-2 border-dashed rounded-3xl p-6 transition-colors flex items-center justify-center cursor-pointer group ${fileData ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-[#2E7D32]'
        } ${disabled ? 'cursor-not-allowed opacity-75' : ''}`}>
        {!disabled && <input type="file" accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id={id} name={id} onChange={handleFileChange} />}
        <div className="text-center overflow-hidden max-w-full">
          {fileData ? (
            <div className="flex flex-col items-center">
              {fileData.startsWith('data:image') ? (
                <img src={fileData} alt="Preview" className="w-16 h-16 object-cover rounded-xl mb-2 shadow-sm" />
              ) : (
                <span className="material-icons-outlined text-4xl mb-2 text-green-500">picture_as_pdf</span>
              )}
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">Document Uploaded</p>
            </div>
          ) : (
            <>
              <span className="material-icons-outlined text-4xl mb-2 text-gray-300 group-hover:text-[#2E7D32] transition-transform">file_upload</span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tap to upload</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const PartnerKYC: React.FC<{ user: User }> = ({ user }) => {
  const { updateUser } = useGlobalState();
  const [step, setStep] = useState(1);
  const [bankDetails, setBankDetails] = useState({
    accountHolder: user.accountHolder || user.name,
    accountNumber: user.accountNumber || '',
    ifscCode: user.ifscCode || '',
    bankName: user.bankName || ''
  });
  const [documents, setDocuments] = useState<Record<string, string>>(() => {
    const docs: Record<string, string> = {};
    if (user.kycDocuments && user.kycDocuments.length > 0) {
      const keys = ['af', 'ab', 'pc', 'cc', 'cf'];
      user.kycDocuments.forEach((doc, i) => {
        if (keys[i]) docs[keys[i]] = doc;
      });
    }
    return docs;
  });

  const handleUpload = (docType: string, data: string) => {
    const newDocs = { ...documents, [docType]: data };
    setDocuments(newDocs);
    const docArray = ['af', 'ab', 'pc', 'cc', 'cf'].map(k => newDocs[k]).filter(Boolean);
    updateUser(user.id, { kycDocuments: docArray });
  };

  const isLocked = user.kycStatus === KYCStatus.UNDER_REVIEW || user.kycStatus === KYCStatus.APPROVED;

  const submitKYC = () => {
    const required = ['af', 'ab', 'pc', 'cc', 'cf'];
    const missing = required.filter(k => !documents[k]);
    if (missing.length > 0) {
      alert("Please upload all required documents (Aadhaar Front/Back, PAN, Bank Proof, Consent Form) before final submission.");
      return;
    }
    if (!bankDetails.accountNumber || !bankDetails.ifscCode) {
      alert("Please provide valid bank account details.");
      return;
    }
    updateUser(user.id, {
      kycStatus: KYCStatus.UNDER_REVIEW,
      ...bankDetails
    });
    setStep(3);
  };

  const getStatusBanner = () => {
    switch (user.kycStatus) {
      case KYCStatus.UNDER_REVIEW:
        return (
          <div className="bg-yellow-50 border-2 border-yellow-100 rounded-3xl p-6 mb-8 flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 mr-4 animate-pulse">
              <span className="material-icons-outlined">lock_clock</span>
            </div>
            <div>
              <p className="text-yellow-800 font-black tracking-tight">KYC Locked - Under Review</p>
              <p className="text-yellow-600 text-sm font-medium">Your profile is locked for review. Our team will verify it shortly.</p>
            </div>
          </div>
        );
      case KYCStatus.APPROVED:
        return (
          <div className="bg-green-50 border-2 border-green-100 rounded-3xl p-6 mb-8 flex items-center shadow-lg shadow-green-50">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mr-4">
              <span className="material-icons-outlined text-3xl">verified</span>
            </div>
            <div>
              <p className="text-green-800 font-black tracking-tight">KYC Approved & Profile Verified</p>
              <p className="text-green-600 text-sm font-medium">Identity confirmed. All wallet features are now active.</p>
            </div>
          </div>
        );
      case KYCStatus.REJECTED:
        return (
          <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 mb-8">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 mr-4">
                <span className="material-icons-outlined">warning</span>
              </div>
              <p className="text-red-800 font-black tracking-tight">Verification Rejected</p>
            </div>
            <p className="text-red-600 text-sm font-bold ml-14">Reason: {user.kycReason || "Documents were not clear"}. Please re-upload.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {getStatusBanner()}

      {(user.kycStatus === KYCStatus.NOT_SUBMITTED || user.kycStatus === KYCStatus.REJECTED) && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-10 border-b bg-gray-50 flex justify-center space-x-12">
            <KYCStep number={1} title="Documents" active={step === 1} />
            <KYCStep number={2} title="Bank Details" active={step === 2} />
            <KYCStep number={3} title="Finalize" active={step === 3} />
          </div>

          <div className="p-12">
            {step === 1 && (
              <div className="space-y-10 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FileInput label="Aadhaar Card (Front)" id="af" fileData={documents.af} onUpload={(d) => handleUpload('af', d)} disabled={isLocked} />
                  <FileInput label="Aadhaar Card (Back)" id="ab" fileData={documents.ab} onUpload={(d) => handleUpload('ab', d)} disabled={isLocked} />
                  <FileInput label="PAN Card" id="pc" fileData={documents.pc} onUpload={(d) => handleUpload('pc', d)} disabled={isLocked} />
                  <FileInput label="Bank Passbook / Cheque" id="cc" fileData={documents.cc} onUpload={(d) => handleUpload('cc', d)} disabled={isLocked} />
                </div>

                <div className="p-8 bg-green-50 rounded-[2rem] border-2 border-dashed border-green-200 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h4 className="font-black text-green-800 tracking-tight">Signed Consent Form</h4>
                    <p className="text-sm text-green-600 font-medium">Essential for IRDAI compliance.</p>
                  </div>
                  <div className="w-full md:w-auto flex items-center space-x-4">
                    <button className="whitespace-nowrap bg-white text-[#2E7D32] px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-green-100 hover:bg-green-50 transition-all">Download PDF</button>
                    <div className="w-48">
                      <FileInput label="" id="cf" fileData={documents.cf} onUpload={(d) => handleUpload('cf', d)} disabled={isLocked} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all flex items-center transform hover:translate-x-1"
                  >
                    Enter Bank Info
                    <span className="material-icons-outlined ml-3">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Account Holder</label>
                    <input
                      type="text"
                      id="kyc-account-holder"
                      name="accountHolder"
                      disabled={isLocked}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#2E7D32] outline-none transition-all font-bold"
                      value={bankDetails.accountHolder}
                      onChange={e => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Account Number</label>
                    <input
                      type="text"
                      id="kyc-account-number"
                      name="accountNumber"
                      disabled={isLocked}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#2E7D32] outline-none transition-all font-bold"
                      placeholder="0000 0000 0000"
                      value={bankDetails.accountNumber}
                      onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">IFSC Code</label>
                    <input
                      type="text"
                      id="kyc-ifsc-code"
                      name="ifscCode"
                      disabled={isLocked}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#2E7D32] outline-none transition-all font-bold"
                      placeholder="SBIN0000..."
                      value={bankDetails.ifscCode}
                      onChange={e => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bank Name</label>
                    <input
                      type="text"
                      id="kyc-bank-name"
                      name="bankName"
                      disabled={isLocked}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#2E7D32] outline-none transition-all font-bold"
                      placeholder="State Bank of India"
                      value={bankDetails.bankName}
                      onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-10">
                  <button onClick={() => setStep(1)} className="text-gray-400 font-black uppercase tracking-widest text-xs hover:text-gray-600 transition-colors">Go Back</button>
                  <button
                    onClick={submitKYC}
                    disabled={isLocked}
                    className="bg-[#2E7D32] text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all flex items-center space-x-3"
                  >
                    <span className="material-icons-outlined">verified</span>
                    <span>Submit & Lock for Review</span>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-16 animate-scaleIn">
                <div className="w-24 h-24 bg-green-100 text-[#2E7D32] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-50">
                  <span className="material-icons-outlined text-6xl">cloud_done</span>
                </div>
                <h3 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">Documents Locked!</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-10 font-medium">
                  Identity verification is now in the hands of our compliance team. You'll be notified via portal once approved.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-[#2E7D32] text-white px-10 py-4 rounded-2xl font-black shadow-xl"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isLocked && (
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Aadhaar Front', 'Aadhaar Back', 'PAN Card', 'Bank Document', 'Consent Form'].map((label, i) => {
            const fileData = user.kycDocuments?.[i];
            return (
              <div key={i} className="bg-white p-4 rounded-3xl border border-gray-100 flex flex-col items-center">
                {fileData ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden mb-2">
                    {fileData.startsWith('data:image') ? (
                      <img src={fileData} alt={label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-red-50 text-red-500 flex items-center justify-center">
                        <span className="material-icons-outlined text-xl">picture_as_pdf</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="material-icons-outlined text-gray-200 text-3xl mb-2">block</span>
                )}
                <p className="text-[9px] font-black uppercase text-gray-400 text-center">{label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PartnerKYC;
