
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalState } from '@/context';
import { AdminPayoutRecord } from '@/types';
import { WEB_AGGREGATORS } from '@/constants';

const AdminPayoutRecords: React.FC = () => {
  const { adminPayoutRecords, saveAdminPayoutRecord, deleteAdminPayoutRecord, autoFetchRecords, showAlert, showConfirm } = useGlobalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPolicyType, setFilterPolicyType] = useState('all');
  const [filterAggregator, setFilterAggregator] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdminPayoutRecord | null>(null);
  const [selectedViewRecord, setSelectedViewRecord] = useState<AdminPayoutRecord | null>(null);

  const filteredRecords = useMemo(() => {
    return adminPayoutRecords.filter(r => {
      // Filter out if master record is missing (deleted) or 'missed' status
      const masterRecord = autoFetchRecords.find(ar => ar.id === r.id);
      if (!masterRecord || masterRecord.status === 'missed') return false;

      const q = searchQuery.toLowerCase();
      const matchesSearch = (r.id?.toLowerCase().includes(q) || r.vehicleNumber?.toLowerCase().includes(q) || r.customerName?.toLowerCase().includes(q));
      const matchesPolicy = filterPolicyType === 'all' || r.policyType?.toUpperCase() === filterPolicyType.toUpperCase();
      const matchesAggregator = filterAggregator === 'all' || r.aggregatorName === filterAggregator;

      const statusValue = r.paymentReceived === 'Yes' ? 'received' : 'pending';
      const matchesStatus = filterStatus === 'all' || statusValue === filterStatus;

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
      return matchesSearch && matchesPolicy && matchesAggregator && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }, [adminPayoutRecords, autoFetchRecords, searchQuery, filterPolicyType, filterAggregator, filterStatus, startDate, endDate]);

  const summary = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      const netProfit = Number(r.netProfit) || 0;
      const discount = Number(r.discount) || 0;
      const brokerPayment = Number(r.brokerPayment) || 0;

      return {
        totalIncome: acc.totalIncome + (netProfit + discount + brokerPayment),
        totalDiscounts: acc.totalDiscounts + discount,
        totalBrokerage: acc.totalBrokerage + brokerPayment,
        netProfit: acc.netProfit + netProfit
      };
    }, { totalIncome: 0, totalDiscounts: 0, totalBrokerage: 0, netProfit: 0 });
  }, [filteredRecords]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>FIVS Payout Ledger - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 4px solid #2E7D32; padding-bottom: 20px; }
            h1 { margin: 0; color: #2E7D32; text-transform: uppercase; letter-spacing: 2px; }
            .summary { display: grid; grid-template-cols: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat { padding: 20px; background: #f9f9f9; border-radius: 12px; text-align: center; }
            .stat p { font-size: 10px; font-weight: 800; color: #999; margin: 0 0 5px; text-transform: uppercase; }
            .stat h3 { font-size: 20px; margin: 0; color: #222; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #f5f5f5; text-align: left; padding: 12px; border-bottom: 2px solid #eee; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .received { color: #2E7D32; font-weight: bold; }
            .pending { color: #f59e0b; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FIVS Payout Ledger Statement</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          <div class="summary">
            <div class="stat"><p>Gross Revenue</p><h3>₹${summary.totalIncome.toLocaleString()}</h3></div>
            <div class="stat"><p>Total Discounts</p><h3>₹${summary.totalDiscounts.toLocaleString()}</h3></div>
            <div class="stat"><p>Brokerage Paid</p><h3>₹${summary.totalBrokerage.toLocaleString()}</h3></div>
            <div class="stat"><p>Net Company Profit</p><h3>₹${summary.netProfit.toLocaleString()}</h3></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Insurer</th>
                <th>Premium</th>
                <th>Net Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(r => `
                <tr>
                  <td><b>${r.id}</b></td>
                  <td>${r.customerName}</td>
                  <td>${r.vehicleNumber}</td>
                  <td>${r.insuranceCompany}</td>
                  <td>₹${(Number(r.premiumAmount) || 0).toLocaleString()}</td>
                  <td>₹${(Number(r.netProfit) || 0).toLocaleString()}</td>
                  <td class="${r.paymentReceived === 'Yes' ? 'received' : 'pending'}">${r.paymentReceived === 'Yes' ? 'Received' : 'Pending'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExcelExport = () => {
    if (filteredRecords.length === 0) {
      showAlert('Export Failed', "No records match the current filters.", 'info');
      return;
    }

    const headers = [
      "DATE", "LEAD ID", "CUSTOMER NAME", "VEHICLE NUMBER", "INSURER",
      "AGGREGATOR", "TYPE", "PREMIUM", "COMMISSION %",
      "COMM ON", "OD PREMIUM", "TP PREMIUM", "OD %", "TP %",
      "DISCOUNT", "BROKERAGE", "NET PROFIT", "STATUS", "REMARKS"
    ];

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          .title { background-color: #2E7D32; color: #ffffff; font-weight: bold; font-size: 14pt; padding: 10px; text-align: center; }
          th { background-color: #f3f4f6; color: #374151; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; }
          td { border: 1px solid #e5e7eb; padding: 6px; }
          .positive { color: #059669; font-weight: bold; }
          .negative { color: #dc2626; font-weight: bold; }
          .received { background-color: #ecfdf5; color: #065f46; font-weight: bold; text-align: center; }
          .pending { background-color: #fffbeb; color: #92400e; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${headers.length}" class="title">FIVS PAYOUT REGISTRY REPORT - ${new Date().toLocaleDateString()}</td></tr>
          <tr></tr>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map(r => `
              <tr>
                <td>${r.timestamp?.split(' ')[0]}</td>
                <td>${r.id}</td>
                <td style="text-transform: uppercase;">${r.customerName}</td>
                <td style="text-transform: uppercase;">${r.vehicleNumber}</td>
                <td>${r.insuranceCompany}</td>
                <td>${r.aggregatorName}</td>
                <td>${r.policyType}</td>
                <td>${(Number(r.premiumAmount) || 0).toFixed(2)}</td>
                <td>${r.commissionRate}%</td>
                <td>${r.commissionOn}</td>
                <td>${(r.odPremium || 0).toFixed(2)}</td>
                <td>${(r.tpPremium || 0).toFixed(2)}</td>
                <td>${r.odPercentage || 0}%</td>
                <td>${r.tpPercentage || 0}%</td>
                <td>${(Number(r.discount) || 0).toFixed(2)}</td>
                <td>${(Number(r.brokerPayment) || 0).toFixed(2)}</td>
                <td class="${r.netProfit >= 0 ? 'positive' : 'negative'}">${(Number(r.netProfit) || 0).toFixed(2)}</td>
                <td class="${r.paymentReceived === 'Yes' ? 'received' : 'pending'}">${r.paymentReceived === 'Yes' ? 'RECEIVED' : 'PENDING'}</td>
                <td>${r.remarks || ''}</td>
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
    link.download = `FIVS_Payout_Report_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowCsvDialog(false);
  };

  const handleCsvExport = () => {
    if (filteredRecords.length === 0) {
      showAlert('Export Failed', "No records match the current filters.", 'info');
      return;
    }

    const headers = [
      "DATE", "LEAD ID", "CUSTOMER NAME", "VEHICLE NUMBER", "INSURER",
      "AGGREGATOR", "TYPE", "PREMIUM", "COMMISSION %",
      "COMM ON", "OD PREMIUM", "TP PREMIUM", "OD %", "TP %",
      "DISCOUNT", "BROKERAGE", "NET PROFIT", "STATUS", "REMARKS"
    ];

    const rows = filteredRecords.map(r => [
      `"${r.timestamp?.split(' ')[0]}"`,
      `"${r.id}"`,
      `"${r.customerName?.toUpperCase()}"`,
      `"${r.vehicleNumber?.toUpperCase()}"`,
      `"${r.insuranceCompany}"`,
      `"${r.aggregatorName}"`,
      `"${r.policyType}"`,
      (Number(r.premiumAmount) || 0).toFixed(2),
      `${r.commissionRate}%`,
      `"${r.commissionOn}"`,
      (r.odPremium || 0).toFixed(2),
      (r.tpPremium || 0).toFixed(2),
      `${r.odPercentage || 0}%`,
      `${r.tpPercentage || 0}%`,
      (Number(r.discount) || 0).toFixed(2),
      (Number(r.brokerPayment) || 0).toFixed(2),
      (Number(r.netProfit) || 0).toFixed(2),
      `"${r.paymentReceived === 'Yes' ? 'RECEIVED' : 'PENDING'}"`,
      `"${r.remarks}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FIVS_Payout_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowCsvDialog(false);
  };

  // Upgraded Calculation Engine per specific requirements
  useEffect(() => {
    if (editingRecord) {
      let commissionAmount = 0;
      let calculatedTds = 0;
      let commissionWithoutTds = 0;

      // 1. Calculate Base Commission Amount (Inward)
      if (editingRecord.commissionOn === 'ONLINE POINTS') {
        commissionAmount = editingRecord.points || 0;
      }
      else if (editingRecord.commissionOn === 'OD+TP') {
        const odComm = (editingRecord.odPremium || 0) * ((editingRecord.odPercentage || 0) / 100);
        const tpComm = (editingRecord.tpPremium || 0) * ((editingRecord.tpPercentage || 0) / 100);
        commissionAmount = odComm + tpComm;
      }
      else {
        // NET, OD, TP, Fixed etc.
        // Determine the base amount
        let baseAmount = 0;
        if (editingRecord.commissionOn === 'Net' || editingRecord.commissionOn === 'Fixed') baseAmount = editingRecord.netPremium || 0;
        else if (editingRecord.commissionOn === 'OD') baseAmount = editingRecord.odPremium || 0;
        else if (editingRecord.commissionOn === 'TP') baseAmount = editingRecord.tpPremium || 0;
        else baseAmount = editingRecord.premiumAmount || 0; // Fallback

        commissionAmount = baseAmount * ((editingRecord.commissionRate || 0) / 100);
      }

      // 2. TDS Calculation based on Rate
      const tdsRate = editingRecord.tdsRate !== undefined ? editingRecord.tdsRate : 2; // Default 2%
      calculatedTds = commissionAmount * (tdsRate / 100);

      // 3. Commission Without TDS
      commissionWithoutTds = commissionAmount - calculatedTds;

      // 4. Final Profit Calculation
      // Formula: Commission Without TDS - (Discount + Broker Payment + Other Expense)
      const expenses = (editingRecord.discount || 0) + (editingRecord.brokerPayment || 0) + (editingRecord.otherExpense || 0);
      const profit = commissionWithoutTds - expenses;

      // Update state if calculation differs
      // Mapping to internal fields: earning = commissionAmount, amountAfterTds = commissionWithoutTds
      if (
        editingRecord.earning !== commissionAmount ||
        editingRecord.tds !== calculatedTds ||
        editingRecord.tdsRate !== (editingRecord.tdsRate !== undefined ? editingRecord.tdsRate : 2) ||
        editingRecord.amountAfterTds !== commissionWithoutTds ||
        Math.abs(editingRecord.netProfit - profit) > 0.01
      ) {
        setEditingRecord({
          ...editingRecord,
          earning: commissionAmount,
          tds: calculatedTds,
          tdsRate: editingRecord.tdsRate !== undefined ? editingRecord.tdsRate : 2,
          amountAfterTds: commissionWithoutTds,
          netProfit: profit
        });
      }
    }
  }, [
    editingRecord?.premiumAmount,
    editingRecord?.netPremium,
    editingRecord?.points,
    editingRecord?.commissionRate,
    editingRecord?.commissionOn,
    editingRecord?.odPremium,
    editingRecord?.tpPremium,
    editingRecord?.odPercentage,
    editingRecord?.tpPercentage,
    editingRecord?.discount,
    editingRecord?.brokerPayment,
    editingRecord?.otherExpense,
    editingRecord?.earning,
    editingRecord?.tdsRate
  ]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const finalRecord = { ...editingRecord, lastUpdated: new Date().toISOString() };
    await saveAdminPayoutRecord(finalRecord);
    setEditingRecord(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      {showCsvDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-scaleIn border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black uppercase tracking-widest dark:text-white">Generate Report</h3>
              <button onClick={() => setShowCsvDialog(false)} className="text-gray-400 hover:text-red-500"><span className="material-icons-outlined">close</span></button>
            </div>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[8px] font-black uppercase text-gray-400 block mb-2 ml-1">Start Date</label>
                <input type="date" id="export-start-date" name="startDate" className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:border-[#2E7D32]" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-gray-400 block mb-2 ml-1">End Date</label>
                <input type="date" id="export-end-date" name="endDate" className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:border-[#2E7D32]" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <button onClick={handleExcelExport} className="bg-[#2E7D32] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center col-span-full">
                <span className="material-icons-outlined mr-2 text-sm">auto_graph</span> Standard Excel Report (Formatted)
              </button>
              <button onClick={handleCsvExport} className="bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 flex items-center justify-center">
                <span className="material-icons-outlined mr-2 text-sm">download</span> Raw CSV
              </button>
              <button onClick={handlePrint} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center">
                <span className="material-icons-outlined mr-2 text-sm">print</span> Print PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-scaleIn border border-gray-100 dark:border-gray-700">
            <div className="p-8 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-widest text-sm">Payout Ledger Update</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Ref: {editingRecord.id}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition-colors"><span className="material-icons-outlined">close</span></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

              {/* 1. Total Premium */}
              <SmartEditInput
                label="1. Total Premium (Adjusted)"
                id="edit-payout-premium"
                name="premiumAmount"
                value={editingRecord.premiumAmount}
                onChange={v => setEditingRecord({ ...editingRecord, premiumAmount: Number(v) })}
                type="number"
                className="bg-green-50/20 border-green-100"
              />

              {/* 2. Commission Type */}
              <div className="p-4 bg-gray-50/50 dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32]">
                <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">2. Commission Type</label>
                <select id="payout-comm-type" name="commissionOn" className="w-full bg-transparent outline-none font-bold text-xs dark:text-white" value={editingRecord.commissionOn} onChange={e => setEditingRecord({ ...editingRecord, commissionOn: e.target.value as any })}>
                  <option value="Net">Net Premium</option>
                  <option value="OD">Only OD</option>
                  <option value="TP">Only TP</option>
                  <option value="OD+TP">OD + TP Split</option>
                  <option value="ONLINE POINTS">Online Points</option>
                </select>
              </div>

              {/* 3. Conditional Inputs based on Type */}
              {editingRecord.commissionOn === 'ONLINE POINTS' ? (
                <div className="col-span-full bg-purple-50/20 p-6 rounded-3xl border border-purple-100 border-dashed">
                  <SmartEditInput label="3. Online Points" id="edit-payout-points" name="points" value={editingRecord.points} onChange={v => setEditingRecord({ ...editingRecord, points: Number(v) })} type="number" />
                </div>
              ) : editingRecord.commissionOn === 'OD+TP' ? (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/20 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                  <div className="col-span-full">
                    <label className="text-[10px] font-black uppercase text-blue-600 mb-4 block">3. OD + TP Split</label>
                  </div>
                  <div className="space-y-4">
                    <SmartEditInput label="OD Premium" id="edit-payout-od-premium" name="odPremium" value={editingRecord.odPremium} onChange={v => setEditingRecord({ ...editingRecord, odPremium: Number(v) })} type="number" />
                    <SmartEditInput label="OD Commission (%)" id="edit-payout-od-percent" name="odPercentage" value={editingRecord.odPercentage} onChange={v => setEditingRecord({ ...editingRecord, odPercentage: Number(v) })} type="number" />
                  </div>
                  <div className="space-y-4">
                    <SmartEditInput label="TP Premium" id="edit-payout-tp-premium" name="tpPremium" value={editingRecord.tpPremium} onChange={v => setEditingRecord({ ...editingRecord, tpPremium: Number(v) })} type="number" />
                    <SmartEditInput label="TP Commission (%)" id="edit-payout-tp-percent" name="tpPercentage" value={editingRecord.tpPercentage} onChange={v => setEditingRecord({ ...editingRecord, tpPercentage: Number(v) })} type="number" />
                  </div>
                </div>
              ) : (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dynamic Label for Box 3 */}
                  <SmartEditInput
                    label={`3. ${editingRecord.commissionOn === 'Net' ? 'Net Premium' : editingRecord.commissionOn === 'OD' ? 'Only OD' : 'Only TP'}`}
                    id="edit-payout-base-premium"
                    name="basePremium"
                    value={
                      editingRecord.commissionOn === 'Net' ? editingRecord.netPremium :
                        editingRecord.commissionOn === 'OD' ? editingRecord.odPremium :
                          editingRecord.tpPremium
                    }
                    onChange={v => {
                      const val = Number(v);
                      if (editingRecord.commissionOn === 'Net') setEditingRecord({ ...editingRecord, netPremium: val });
                      else if (editingRecord.commissionOn === 'OD') setEditingRecord({ ...editingRecord, odPremium: val });
                      else setEditingRecord({ ...editingRecord, tpPremium: val });
                    }}
                    type="number"
                  />
                  <SmartEditInput label="4. Commission (%)" id="edit-payout-comm-rate" name="commissionRate" value={editingRecord.commissionRate} onChange={v => setEditingRecord({ ...editingRecord, commissionRate: Number(v) })} type="number" />
                </div>
              )}

              {/* 5. Commission Amount (Calculated) */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">5. Commission Amount</label>
                <p className="text-sm font-black dark:text-white">₹{(editingRecord.earning || 0).toLocaleString()}</p>
              </div>

              {/* 6. TDS Rate (%) */}
              <SmartEditInput
                label="6. TDS Rate (%)"
                id="edit-payout-tds-rate"
                name="tdsRate"
                value={editingRecord.tdsRate !== undefined ? editingRecord.tdsRate : 2}
                onChange={v => setEditingRecord({ ...editingRecord, tdsRate: Number(v) })}
                type="number"
                className="bg-yellow-50/20 border-yellow-100"
              />

              {/* 7. TDS Deducted (Calculated) */}
              <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                <label className="text-[8px] font-black uppercase text-red-400 block mb-1">7. TDS Deducted (Calculated)</label>
                <p className="text-sm font-black text-red-600">₹{(editingRecord.tds || 0).toLocaleString()}</p>
              </div>

              {/* 8. Comm. Without TDS */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <label className="text-[8px] font-black uppercase text-blue-400 block mb-1">8. Comm. Without TDS</label>
                <p className="text-sm font-black text-blue-600">₹{(editingRecord.amountAfterTds || 0).toLocaleString()}</p>
              </div>

              {/* 8, 9, 10. Manual Adjustments */}
              <SmartEditInput label="8. Discount" id="edit-payout-discount" name="discount" value={editingRecord.discount} onChange={v => setEditingRecord({ ...editingRecord, discount: Number(v) })} type="number" className="border-orange-100" />
              <SmartEditInput label="9. Broker Payment" id="edit-payout-brokerage" name="brokerPayment" value={editingRecord.brokerPayment} onChange={v => setEditingRecord({ ...editingRecord, brokerPayment: Number(v) })} type="number" className="border-purple-100" />
              <SmartEditInput label="10. Other Expense" id="edit-payout-expense" name="otherExpense" value={editingRecord.otherExpense} onChange={v => setEditingRecord({ ...editingRecord, otherExpense: Number(v) })} type="number" className="border-gray-200" />

              {/* 11. Final Profit */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800 col-span-full">
                <label className="text-[8px] font-black uppercase text-green-600 dark:text-green-400 block mb-1">11. Final Profit</label>
                <p className="text-3xl font-black text-green-800 dark:text-green-300 tracking-tight">₹{(editingRecord.netProfit || 0).toLocaleString()}</p>
              </div>

              <div className="p-4 bg-gray-50/50 dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32]">
                <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Payment Status</label>
                <select id="payout-payment-status" name="paymentReceived" className="w-full bg-transparent outline-none font-bold text-xs dark:text-white" value={editingRecord.paymentReceived} onChange={e => setEditingRecord({ ...editingRecord, paymentReceived: e.target.value as any })}>
                  <option value="Yes">Received</option>
                  <option value="No">Pending</option>
                </select>
              </div>

              <div className="p-4 bg-gray-50/50 dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32]">
                <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Remarks</label>
                <select id="payout-remarks" name="remarks" className="w-full bg-transparent outline-none font-bold text-xs dark:text-white" value={editingRecord.remarks} onChange={e => setEditingRecord({ ...editingRecord, remarks: e.target.value as any })}>
                  <option value="New">New Business</option>
                  <option value="Renewal">Renewal Case</option>
                </select>
              </div>

              <div className="lg:col-span-3 pt-6">
                <button type="submit" className="w-full bg-[#2E7D32] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center transform active:scale-[0.98] transition-all hover:bg-[#1b5e20]">
                  <span className="material-icons-outlined mr-2">verified</span> Update & Synchronize Payout Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedViewRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-scaleIn border border-gray-100 dark:border-gray-700 custom-scrollbar">
            <div className="p-8 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-widest text-sm">Payout Record Details</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Ref: {selectedViewRecord.id}</p>
              </div>
              <button onClick={() => setSelectedViewRecord(null)} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition-colors"><span className="material-icons-outlined">close</span></button>
            </div>

            <div className="p-10 space-y-8">
              {/* 1. Primary Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Customer & Vehicle</h4>
                  <DetailRow label="Customer Name" value={selectedViewRecord.customerName} />
                  <DetailRow label="Vehicle Number" value={selectedViewRecord.vehicleNumber} />
                  <DetailRow label="Aggregator" value={selectedViewRecord.aggregatorName} />
                  <DetailRow label="Policy Type" value={selectedViewRecord.policyType} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest border-b pb-2 mb-4">Financial Overview</h4>
                  <DetailRow label="Total Premium" value={`₹${(selectedViewRecord.premiumAmount || 0).toLocaleString()}`} />
                  <DetailRow label="Net Profit" value={`₹${(selectedViewRecord.netProfit || 0).toLocaleString()}`} highlightClass="text-green-600 font-black text-lg" />
                  <DetailRow label="Payment Status" value={selectedViewRecord.paymentReceived === 'Yes' ? 'RECEIVED' : 'PENDING'} highlightClass={selectedViewRecord.paymentReceived === 'Yes' ? 'text-green-600' : 'text-yellow-600'} />
                  <DetailRow label="Last Updated" value={new Date(selectedViewRecord.lastUpdated).toLocaleString()} />
                </div>
              </div>

              {/* 2. Commission Breakdown */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Commission Structure ({selectedViewRecord.commissionOn})</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <DetailRow label="OD Premium" value={`₹${(selectedViewRecord.odPremium || 0).toLocaleString()}`} />
                  <DetailRow label="TP Premium" value={`₹${(selectedViewRecord.tpPremium || 0).toLocaleString()}`} />
                  <DetailRow label="OD %" value={`${selectedViewRecord.odPercentage || 0}%`} />
                  <DetailRow label="TP %" value={`${selectedViewRecord.tpPercentage || 0}%`} />
                  <DetailRow label="Net Premium" value={`₹${(selectedViewRecord.netPremium || 0).toLocaleString()}`} />
                  <DetailRow label="Comm. Rate" value={`${selectedViewRecord.commissionRate || 0}%`} />
                  <DetailRow label="Points" value={selectedViewRecord.points?.toString()} />
                  <DetailRow label="Gross Commission" value={`₹${(selectedViewRecord.earning || 0).toLocaleString()}`} />
                </div>
              </div>

              {/* 3. Deductions & Final */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100">
                  <DetailRow label="TDS (2%)" value={`₹${(selectedViewRecord.tds || 0).toLocaleString()}`} highlightClass="text-red-500 font-bold" />
                </div>
                <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100">
                  <DetailRow label="Discount Given" value={`₹${(selectedViewRecord.discount || 0).toLocaleString()}`} highlightClass="text-orange-500 font-bold" />
                </div>
                <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-3xl border border-purple-100">
                  <DetailRow label="Brokerage Paid" value={`₹${(selectedViewRecord.brokerPayment || 0).toLocaleString()}`} highlightClass="text-purple-500 font-bold" />
                </div>
              </div>

              {selectedViewRecord.remarks && (
                <div className="p-6 bg-yellow-50 dark:bg-yellow-900/10 rounded-3xl border border-yellow-100">
                  <DetailRow label="Remarks" value={selectedViewRecord.remarks} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Payout Ledger</h2>
          <p className="text-sm text-gray-500 font-medium">Precision financial tracking with automated TDS and net profit auditing.</p>
        </div>
        <button onClick={() => setShowCsvDialog(true)} className="bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center shadow-sm">
          <span className="material-icons-outlined mr-2">print</span> Data Export Hub
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBox label="Gross Income" value={`₹${(Number(summary.totalIncome) || 0).toLocaleString()}`} color="text-blue-600" bg="bg-blue-50" icon="account_balance" />
        <StatBox label="Client Discounts" value={`₹${(Number(summary.totalDiscounts) || 0).toLocaleString()}`} color="text-red-600" bg="bg-red-50" icon="loyalty" />
        <StatBox label="Brokerage Expense" value={`₹${(Number(summary.totalBrokerage) || 0).toLocaleString()}`} color="text-orange-600" bg="bg-orange-50" icon="payments" />
        <StatBox label="Company Net Profit" value={`₹${(Number(summary.netProfit) || 0).toLocaleString()}`} color="text-green-600" bg="bg-green-50" icon="auto_graph" />
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 lg:grid-cols-6 gap-4">
        <div className="relative lg:col-span-2">
          <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input type="text" id="ledger-search" name="searchQuery" placeholder="Search Customer, ID or Vehicle..." className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:border-[#2E7D32] shadow-inner transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select id="ledger-filter-policy" name="filterPolicyType" className="px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-700 dark:text-white font-bold text-xs outline-none focus:border-[#2E7D32] transition-all" value={filterPolicyType} onChange={e => setFilterPolicyType(e.target.value)}>
          <option value="all">All Policies</option>
          <option value="TP">TP Only</option>
          <option value="OD">OD Only</option>
          <option value="COMPREHENSIVE">COMPREHENSIVE</option>
        </select>
        <select id="ledger-filter-aggregator" name="filterAggregator" className="px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-700 dark:text-white font-bold text-xs lg:col-span-2 outline-none focus:border-[#2E7D32] transition-all" value={filterAggregator} onChange={e => setFilterAggregator(e.target.value)}>
          <option value="all">All Aggregators</option>
          {WEB_AGGREGATORS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select id="ledger-filter-status" name="filterStatus" className="px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-700 dark:text-white font-bold text-xs outline-none focus:border-[#2E7D32] transition-all" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="received">Received</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1400px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-black text-gray-400 border-b dark:border-gray-700">
            <tr>
              <th className="px-8 py-5 min-w-[200px]">Record Details</th>
              <th className="px-8 py-5 min-w-[350px]">Vehicle & Carrier</th>
              <th className="px-8 py-5 min-w-[180px]">Revenue Source</th>
              <th className="px-8 py-5 min-w-[180px]">Financial Summary</th>
              <th className="px-8 py-5 min-w-[160px]">Split Info (OD/TP)</th>
              <th className="px-8 py-5 min-w-[160px]">Adjustments</th>
              <th className="px-8 py-5 min-w-[160px]">Net Profit</th>
              <th className="px-8 py-5 min-w-[140px]">Status</th>
              <th className="px-8 py-5 text-right min-w-[180px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700 text-sm">
            {filteredRecords.map(rec => (
              <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group">
                <td className="px-8 py-6">
                  <p className="font-black text-[#2E7D32] uppercase tracking-tighter">{rec.id}</p>
                  <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100 uppercase">{rec.customerName}</p>
                  <p className="text-[8px] text-gray-400 font-medium">{rec.timestamp}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="font-black dark:text-white uppercase tracking-wider">{rec.vehicleNumber}</p>
                  <p className="text-[9px] text-gray-400 font-bold whitespace-nowrap">{rec.insuranceCompany}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-black text-blue-600 uppercase">{rec.aggregatorName}</p>
                  <span className="text-[9px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg dark:text-gray-300 font-black">{rec.policyType}</span>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Premium (w/o GST)</p>
                  <p className="font-black text-gray-800 dark:text-gray-200">₹{(rec.premiumAmount || 0).toLocaleString()}</p>
                </td>
                <td className="px-8 py-6">
                  {rec.commissionOn === 'OD+TP' ? (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-blue-500">OD: {rec.odPercentage}%</p>
                      <p className="text-[8px] font-black uppercase text-orange-500">TP: {rec.tpPercentage}%</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-bold text-gray-600 dark:text-gray-400">{rec.commissionRate}%</p>
                      <p className="text-[8px] uppercase font-black text-gray-400">On: {rec.commissionOn}</p>
                    </div>
                  )}
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] text-red-500 font-black">Disc: ₹{(rec.discount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-orange-500 font-black">Bkr: ₹{(rec.brokerPayment || 0).toLocaleString()}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-2">
                    <p className={`text-base font-black ${rec.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{(rec.netProfit || 0).toLocaleString()}</p>
                    <span className="material-icons-outlined text-xs text-gray-300">{rec.netProfit >= 0 ? 'trending_up' : 'trending_down'}</span>
                  </div>
                  <p className="text-[8px] uppercase font-black text-gray-400 mt-1">{rec.remarks}</p>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${rec.paymentReceived === 'Yes' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                    {rec.paymentReceived === 'Yes' ? 'Received' : 'Pending'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2 transition-opacity">
                    <button onClick={() => setSelectedViewRecord(rec)} className="w-8 h-8 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center text-blue-500 hover:text-blue-600 transition-all shadow-sm cursor-pointer" title="View Details">
                      <span className="material-icons-outlined text-base">visibility</span>
                    </button>
                    <button onClick={() => setEditingRecord(rec)} className="w-8 h-8 bg-green-50 dark:bg-green-900/10 rounded-full flex items-center justify-center text-green-600 hover:text-green-700 transition-all shadow-sm cursor-pointer">
                      <span className="material-icons-outlined text-base">edit</span>
                    </button>
                    <button
                      onClick={() => showConfirm(
                        'Confirm Removal',
                        `Permanently delete payout record for ${rec.id}? This action cannot be undone.`,
                        () => deleteAdminPayoutRecord(rec.id),
                        'error'
                      )}
                      className="w-8 h-8 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 transition-all shadow-sm cursor-pointer"
                    >
                      <span className="material-icons-outlined text-base">delete_sweep</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={9} className="p-32 text-center text-gray-400 italic">No payout records matching selected criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color, bg, icon }: any) => (
  <div className={`p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-lg`}>
    <div>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
    <div className={`w-16 h-16 ${bg} rounded-[1.5rem] flex items-center justify-center ${color} shadow-inner`}>
      <span className="material-icons-outlined text-3xl">{icon}</span>
    </div>
  </div>
);

const SmartEditInput = ({ label, value, onChange, type = "text", className = "", id, name }: any) => (
  <div className={`p-4 bg-gray-50/50 dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm transition-all focus-within:border-[#2E7D32] ${className}`}>
    <label className="block text-[8px] font-black uppercase text-gray-400 mb-1" htmlFor={id}>{label}</label>
    <input id={id} name={name || id} type={type} className="w-full bg-transparent outline-none font-bold text-sm dark:text-white" value={value === 0 ? '' : (value ?? '')} onChange={e => onChange(e.target.value)} />
  </div>
);

const DetailRow = ({ label, value, highlightClass = "text-gray-800 dark:text-gray-200" }: { label: string, value?: string, highlightClass?: string }) => (
  <div className="flex flex-col">
    <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">{label}</span>
    <span className={`text-sm font-bold break-words ${highlightClass}`}>{value || '-'}</span>
  </div>
);

export default AdminPayoutRecords;
