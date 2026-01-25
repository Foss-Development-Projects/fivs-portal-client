import React, { useMemo } from 'react';
import { User, NotificationType } from '@/types';
import { useGlobalState } from '@/context';

// Utility component to make URLs in text clickable
const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all font-bold"
            onClick={(e) => e.stopPropagation()} // Prevent card click when clicking link
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
};

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  switch (type) {
    case 'meeting': return <div className="p-4 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-2xl"><span className="material-icons-outlined">event_note</span></div>;
    case 'product': return <div className="p-4 bg-purple-100 text-purple-600 dark:bg-purple-900/30 rounded-2xl"><span className="material-icons-outlined">new_releases</span></div>;
    case 'update': return <div className="p-4 bg-orange-100 text-orange-600 dark:bg-orange-900/30 rounded-2xl"><span className="material-icons-outlined">sync</span></div>;
    case 'alert': return <div className="p-4 bg-red-100 text-red-600 dark:bg-red-900/30 rounded-2xl"><span className="material-icons-outlined">priority_high</span></div>;
    default: return <div className="p-4 bg-gray-100 text-gray-600 dark:bg-gray-900/30 rounded-2xl"><span className="material-icons-outlined">info</span></div>;
  }
};

const PartnerNotifications: React.FC<{ user: User }> = ({ user }) => {
  const { notifications, markNotificationAsRead } = useGlobalState();

  const myNotifications = useMemo(() => {
    return notifications
      .filter(n => n.recipientId === 'all' || n.recipientId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, user.id]);

  const unreadCount = myNotifications.filter(n => !n.readBy.includes(user.id)).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-none">Notification Hub</h2>
          <p className="text-gray-500 mt-2 font-medium">Keep up with updates, meetings, and product launches.</p>
        </div>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100">
            {unreadCount} UNREAD
          </span>
        )}
      </div>

      <div className="space-y-4">
        {myNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-20 rounded-[3rem] border border-gray-100 dark:border-gray-700 text-center flex flex-col items-center">
            <span className="material-icons-outlined text-gray-200 dark:text-gray-700 text-8xl mb-6">notifications_off</span>
            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Your inbox is clear!</p>
          </div>
        ) : (
          myNotifications.map(notif => {
            const isRead = notif.readBy.includes(user.id);
            return (
              <div
                key={notif.id}
                onClick={() => !isRead && markNotificationAsRead(notif.id)}
                className={`bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border transition-all cursor-pointer group flex items-start space-x-8 ${isRead
                    ? 'opacity-60 border-gray-100 dark:border-gray-700 grayscale-[0.5]'
                    : 'border-[#2E7D32]/20 dark:border-green-800 shadow-md ring-1 ring-[#2E7D32]/10'
                  }`}
              >
                <NotificationIcon type={notif.type} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className={`text-xl font-black tracking-tight ${isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                        {notif.title}
                      </h3>
                      {notif.priority === 'high' && !isRead && (
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse">Urgent</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isRead ? 'text-gray-500' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                    <LinkifiedText text={notif.message} />
                  </div>
                  {!isRead && (
                    <button className="mt-4 text-[10px] font-black text-[#2E7D32] uppercase tracking-widest hover:underline flex items-center">
                      Mark as Read <span className="material-icons-outlined text-sm ml-1">check</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PartnerNotifications;