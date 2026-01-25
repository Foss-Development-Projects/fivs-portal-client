
import React, { useState, useMemo } from 'react';
import { useGlobalState } from '@/context';
import { Ticket } from '@/types';

const AdminTickets: React.FC = () => {
  const { tickets, updateTicket, users } = useGlobalState();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [newStatus, setNewStatus] = useState<Ticket['status']>('in-progress');

  const openTickets = useMemo(() => tickets.filter(t => t.status !== 'closed'), [tickets]);
  const closedTickets = useMemo(() => tickets.filter(t => t.status === 'closed'), [tickets]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminReply) return;

    try {
      await updateTicket(selectedTicket.id, {
        adminResponse: adminReply,
        status: newStatus
      });
      setSelectedTicket(null);
      setAdminReply('');
      alert("Response sent successfully!");
    } catch (err) {
      alert("Failed to update ticket.");
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Support Management</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Resolution hub for partner technical and financial queries.</p>
        </div>
        <div className="flex space-x-4">
          <div className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{openTickets.length} ACTIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest">Active Conversations</h3>
            <span className="material-icons-outlined text-gray-400">forum</span>
          </div>
          <div className="divide-y dark:divide-gray-700 max-h-[700px] overflow-y-auto custom-scrollbar">
            {openTickets.length === 0 ? (
              <div className="p-32 text-center text-gray-300">
                <span className="material-icons-outlined text-6xl mb-4">sentiment_very_satisfied</span>
                <p className="font-black uppercase tracking-widest text-sm">Inbox is empty!</p>
              </div>
            ) : (
              openTickets.slice().reverse().map(ticket => {
                const partner = users.find(u => u.id === ticket.partnerId);
                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setAdminReply(ticket.adminResponse || '');
                      setNewStatus(ticket.status);
                    }}
                    className={`p-8 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all cursor-pointer flex items-center justify-between group ${selectedTicket?.id === ticket.id ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}
                  >
                    <div className="flex items-center space-x-6">
                      <div className="w-14 h-14 bg-[#2E7D32] text-white rounded-[1.2rem] flex items-center justify-center font-black text-xl shadow-lg">
                        {partner?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-800 dark:text-white tracking-tight">{ticket.subject}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          By {partner?.name} • UID: {ticket.partnerId} • {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${ticket.status === 'open' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        {ticket.status}
                      </span>
                      <button className="text-gray-300 group-hover:text-[#2E7D32] transition-colors">
                        <span className="material-icons-outlined">chat_bubble_outline</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-10">
          {selectedTicket ? (
            <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] border border-[#2E7D32]/20 dark:border-green-800 shadow-2xl animate-scaleIn">
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-8 leading-none">Reply to Partner</h3>
              <div className="mb-8">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Partner's Message</p>
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 italic text-sm text-gray-600 dark:text-gray-400">
                  "{selectedTicket.description}"
                </div>
              </div>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Update Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['in-progress', 'resolved', 'closed'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setNewStatus(st as any)}
                        className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${newStatus === st ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow-md' : 'bg-white dark:bg-gray-700 text-gray-400 border-gray-100 dark:border-gray-600'
                          }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Your Response</label>
                  <textarea
                    id="admin-ticket-reply"
                    name="adminReply"
                    rows={6}
                    required
                    className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold text-sm"
                    placeholder="Type your resolution here..."
                    value={adminReply}
                    onChange={e => setAdminReply(e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-[#2E7D32] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-[#1b5e20] transition-all transform hover:-translate-y-1"
                  >
                    Send Response
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm text-center">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                <span className="material-icons-outlined text-4xl">touch_app</span>
              </div>
              <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Select a ticket to begin resolution</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-8">Resolution Archive</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              {closedTickets.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">No closed cases found.</p>
              ) : (
                closedTickets.slice().reverse().map(ticket => (
                  <div key={ticket.id} className="p-5 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 flex justify-between items-center opacity-60 grayscale">
                    <div>
                      <p className="text-xs font-black dark:text-white truncate max-w-[150px]">{ticket.subject}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">#{ticket.id}</p>
                    </div>
                    <span className="material-icons-outlined text-green-500 text-sm">verified</span>
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

export default AdminTickets;
