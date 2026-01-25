
import React, { useState } from 'react';
import { User, Ticket } from '@/types';
import { useGlobalState } from '@/context';
import { TICKET_CATEGORIES } from '@/constants';

const PartnerTickets: React.FC<{ user: User }> = ({ user }) => {
  const { tickets, addTicket } = useGlobalState();
  const [isCreating, setIsCreating] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    category: TICKET_CATEGORIES[0],
    priority: 'low',
    description: ''
  });

  const partnerTickets = tickets.filter(t => t.partnerId === user.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) return;

    addTicket({
      partnerId: user.id,
      subject: formData.subject,
      category: formData.category,
      priority: formData.priority as any,
      description: formData.description
    } as any);

    setIsCreating(false);
    setFormData({
      subject: '',
      category: TICKET_CATEGORIES[0],
      priority: 'low',
      description: ''
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Support Desk</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Get assistance from our dedicated team for any portal issues.</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-[#2E7D32] text-white px-8 py-3.5 rounded-2xl font-black shadow-xl flex items-center hover:bg-[#256628] transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <span className="material-icons-outlined mr-2">contact_support</span>
            Create Ticket
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-700 animate-scaleIn">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight uppercase tracking-widest text-sm">Draft New Ticket</h3>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Problem Subject</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                  placeholder="Brief issue title"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Department / Category</label>
                <select
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none bg-white dark:bg-gray-800 transition-all font-bold"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Urgency</label>
                <select
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-red-500 outline-none bg-white dark:bg-gray-800 transition-all font-bold"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Detailed Description</label>
              <textarea
                rows={5}
                required
                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                placeholder="Explain the problem in detail so our team can help you faster..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-6">
              <button onClick={() => setIsCreating(false)} type="button" className="px-6 py-3 text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-xs hover:text-gray-600 transition-colors">Discard</button>
              <button type="submit" className="bg-[#2E7D32] text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:bg-[#256628] transition-all transform hover:-translate-y-1">Submit Ticket</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {partnerTickets.length === 0 ? (
          <div className="p-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center">
            <span className="material-icons-outlined text-gray-200 dark:text-gray-700 text-8xl mb-6">support_agent</span>
            <p className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] text-sm">No support history available.</p>
          </div>
        ) : (
          partnerTickets.slice().reverse().map(ticket => (
            <div
              key={ticket.id}
              onClick={() => setViewingTicket(ticket)}
              className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between hover:shadow-xl transition-all group cursor-pointer border-l-4 border-l-[#2E7D32]"
            >
              <div className="flex items-center space-x-6">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all group-hover:scale-110 ${ticket.status === 'open' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600' :
                    ticket.status === 'resolved' ? 'bg-green-50 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                  }`}>
                  <span className="material-icons-outlined text-3xl">confirmation_number</span>
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h4 className="text-xl font-black text-gray-800 dark:text-white tracking-tight leading-none">{ticket.subject}</h4>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${ticket.priority === 'high' ? 'bg-red-500 text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                      }`}>{ticket.priority}</span>
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">
                    ID: #{ticket.id} • {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-8 mt-6 md:mt-0">
                <div className="text-right">
                  <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${ticket.status === 'open' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                      ticket.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>{ticket.status.replace('-', ' ')}</span>
                  {ticket.adminResponse && (
                    <p className="text-[10px] text-[#2E7D32] font-black uppercase mt-2 tracking-tighter flex items-center justify-end">
                      <span className="material-icons-outlined text-xs mr-1">reply</span> Admin Replied
                    </p>
                  )}
                </div>
                <button className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-300 group-hover:text-[#2E7D32] group-hover:bg-green-50 transition-all flex items-center justify-center">
                  <span className="material-icons-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {viewingTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn border border-gray-100 dark:border-gray-700">
            <div className="p-10 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">{viewingTicket.subject}</h3>
                <p className="text-[10px] font-black uppercase text-gray-400 mt-1 tracking-widest">Support Request #{viewingTicket.id}</p>
              </div>
              <button onClick={() => setViewingTicket(null)} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 shadow-sm transition-colors">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="p-10 space-y-10">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Your Query</label>
                <div className="p-8 bg-white dark:bg-gray-700 rounded-[2rem] border border-gray-100 dark:border-gray-600">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">"{viewingTicket.description}"</p>
                </div>
              </div>

              {viewingTicket.adminResponse ? (
                <div>
                  <label className="block text-[10px] font-black text-[#2E7D32] uppercase tracking-widest mb-4 flex items-center">
                    <span className="material-icons-outlined text-sm mr-2">support_agent</span>
                    Admin Response
                  </label>
                  <div className="p-8 bg-green-50 dark:bg-green-900/20 rounded-[2rem] border border-green-100 dark:border-green-800 shadow-inner">
                    <p className="text-sm text-green-800 dark:text-green-300 font-bold leading-relaxed">{viewingTicket.adminResponse}</p>
                    <div className="mt-4 pt-4 border-t border-green-100 dark:border-green-800 flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-green-600 tracking-widest">Status: {viewingTicket.status}</span>
                      {viewingTicket.updatedAt && <span className="text-[9px] font-bold text-green-400">Updated: {new Date(viewingTicket.updatedAt).toLocaleTimeString()}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-800 text-center">
                  <span className="material-icons-outlined text-blue-500 mb-2">hourglass_top</span>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Waiting for Admin to Review</p>
                </div>
              )}
            </div>
            <div className="p-8 bg-gray-50 dark:bg-gray-900 flex justify-center">
              <button onClick={() => setViewingTicket(null)} className="bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transform transition-all hover:scale-105">Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerTickets;
