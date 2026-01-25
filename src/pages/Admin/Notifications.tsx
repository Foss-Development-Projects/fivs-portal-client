
import React, { useState, useMemo } from 'react';
import { useGlobalState } from '@/context';
import { NotificationType } from '@/types';

const AdminNotifications: React.FC = () => {
  const { users, sendNotification, notifications } = useGlobalState();
  const [isBroadcasting, setIsBroadcasting] = useState(true);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('general');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [isSending, setIsSending] = useState(false);

  const partners = useMemo(() => users.filter(u => u.role === 'partner'), [users]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    if (!isBroadcasting && !selectedRecipient) return alert("Select a recipient.");

    setIsSending(true);
    try {
      await sendNotification({
        recipientId: isBroadcasting ? 'all' : selectedRecipient,
        type,
        title,
        message,
        priority
      });
      setTitle('');
      setMessage('');
      alert("Notification broadcasted successfully!");
    } catch (err) {
      alert("Failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-none">Communications Center</h2>
          <p className="text-gray-500 mt-2 font-medium">Broadcast system updates or message individual partners.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-black text-gray-800 dark:text-white mb-8 flex items-center">
            <span className="material-icons-outlined text-blue-500 mr-3">create</span>
            Draft Message
          </h3>

          <form onSubmit={handleSend} className="space-y-8">
            <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 mb-8">
              <button
                type="button"
                onClick={() => setIsBroadcasting(true)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isBroadcasting ? 'bg-white dark:bg-gray-700 shadow-md text-[#2E7D32]' : 'text-gray-400'}`}
              >
                Broadcast to All
              </button>
              <button
                type="button"
                onClick={() => setIsBroadcasting(false)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isBroadcasting ? 'bg-white dark:bg-gray-700 shadow-md text-[#2E7D32]' : 'text-gray-400'}`}
              >
                Target Specific Partner
              </button>
            </div>

            {!isBroadcasting && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Select Recipient</label>
                <select
                  id="notif-recipient"
                  name="recipientId"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-all font-bold"
                  value={selectedRecipient}
                  onChange={e => setSelectedRecipient(e.target.value)}
                >
                  <option value="">-- Search Partners --</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Message Type</label>
                <select
                  id="notif-type"
                  name="notifType"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-all font-bold"
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="general">Information</option>
                  <option value="meeting">Meeting / Training</option>
                  <option value="product">New Product Launch</option>
                  <option value="update">System Update</option>
                  <option value="alert">Urgent Alert</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Urgency</label>
                <select
                  id="notif-priority"
                  name="priority"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-white outline-none focus:border-red-500 transition-all font-bold"
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High (Mark as Urgent)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Header / Title</label>
              <input
                type="text"
                id="notif-title"
                name="title"
                required
                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-white outline-none focus:border-[#2E7D32] transition-all font-bold"
                placeholder="e.g. Mandatory Training for Motor Insurance"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Message Content</label>
              <textarea
                id="notif-message"
                name="message"
                required
                rows={5}
                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-white outline-none focus:border-[#2E7D32] transition-all font-bold"
                placeholder="Detail the update, provide meeting links, or explain new product features..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-[#2E7D32] text-white py-5 rounded-[2rem] font-black shadow-2xl hover:bg-[#1b5e20] transition-all flex items-center justify-center space-x-3 transform hover:-translate-y-1"
            >
              {isSending ? (
                <span className="material-icons-outlined animate-spin">sync</span>
              ) : (
                <>
                  <span className="material-icons-outlined">campaign</span>
                  <span>Push Notification Live</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-10">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-8">Sent Logs</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-10">No messages sent yet.</p>
              ) : (
                notifications.slice(0, 10).map(notif => (
                  <div key={notif.id} className="p-5 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] font-black px-2 py-0.5 bg-white dark:bg-gray-800 rounded-lg text-blue-600 uppercase tracking-widest border border-blue-100">{notif.type}</span>
                      <span className="text-[8px] text-gray-400 font-bold">{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs font-black dark:text-white truncate">{notif.title}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                      Target: {notif.recipientId === 'all' ? 'BROADCAST' : `UID: ${notif.recipientId}`}
                    </p>
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

export default AdminNotifications;
