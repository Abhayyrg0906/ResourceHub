import React, { useState } from 'react';
import { Bell, Check, MessageSquare, AlertCircle, ShieldAlert, Trash2 } from 'lucide-react';

const initialNotifications = [
  { id: 1, title: 'Trade Request Approved', desc: 'Jordan Vance accepted your request for "Texas Instruments TI-84 Plus". Arrange the meetup location!', date: '3 hours ago', type: 'trade', read: false },
  { id: 2, title: 'New Message from Sarah Connor', desc: '"Hey, I can meet tomorrow at 10 AM in the Engineering lobby for the physics book."', date: '5 hours ago', type: 'message', read: false },
  { id: 3, title: 'Carbon Milestone Unlocked!', desc: 'Congratulations! You saved 15kg of CO2 and unlocked the "Eco Ambassador" badge.', date: '1 day ago', type: 'system', read: true },
  { id: 4, title: 'Email Verification Successful', desc: 'Your college email verified successfully. You now have full marketplace privileges.', date: '3 days ago', type: 'system', read: true }
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const toggleRead = (id) => {
    setNotifications(notifications.map(n => {
      if (n.id === id) {
        return { ...n, read: !n.read };
      }
      return n;
    }));
  };

  const handleDelete = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'trade': return <Check className="h-5 w-5 text-emerald-400" />;
      case 'message': return <MessageSquare className="h-5 w-5 text-indigo-400" />;
      case 'system': return <AlertCircle className="h-5 w-5 text-purple-400" />;
      default: return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Bell className="h-8 w-8 text-indigo-400" />
            <span>Notifications</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Stay updated with exchange requests, messages, and campus notifications.</p>
        </div>
        
        {notifications.length > 0 && (
          <button 
            onClick={markAllRead}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-5 rounded-2xl border transition-all duration-300 flex items-start justify-between gap-4 ${
                n.read 
                  ? 'bg-[#161d30]/30 border-[#242f4c]/60 opacity-75' 
                  : 'bg-[#161d30]/70 border-[#242f4c] shadow-md shadow-indigo-900/5'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 mt-0.5`}>
                  {getNotificationIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className={`font-bold text-sm ${n.read ? 'text-slate-300' : 'text-white'}`}>{n.title}</h3>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-pink-500 block" title="Unread" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.desc}</p>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1.5">{n.date}</span>
                </div>
              </div>

              <div className="flex space-x-1 flex-shrink-0">
                <button
                  onClick={() => toggleRead(n.id)}
                  title={n.read ? "Mark as unread" : "Mark as read"}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(n.id)}
                  title="Delete Notification"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-[#161d30]/30 border border-[#242f4c] rounded-3xl">
            <Bell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">You're all caught up! No notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}
