import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  RefreshCw, 
  AlertCircle, 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Star, 
  Ban,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '../services/notificationService';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL' or 'UNREAD'
  const [processingId, setProcessingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getNotifications({ limit: 50 });
      if (res && res.success) {
        setNotifications(res.data || []);
      } else {
        setError(res?.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Could not connect to notification service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setProcessingId(id);
      await markNotificationRead(id);
      
      // Update local state optimistically
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      
      // Notify navbar to refresh unread count
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsRead();
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      
      // Notify navbar to refresh unread count
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Handle clicking on notification card
  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }
    // Navigate to related resource or request if available
    if (n.related_id) {
      navigate('/exchange-requests');
    }
  };

  // Format timestamp helper
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Type metadata helper
  const getTypeMeta = (type) => {
    switch (type) {
      case 'EXCHANGE_REQUEST':
        return {
          icon: ArrowRightLeft,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10 border-indigo-500/30',
          label: 'Request'
        };
      case 'REQUEST_ACCEPTED':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          label: 'Accepted'
        };
      case 'REQUEST_REJECTED':
        return {
          icon: XCircle,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/30',
          label: 'Declined'
        };
      case 'REQUEST_CANCELLED':
        return {
          icon: Ban,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
          label: 'Cancelled'
        };
      case 'QR_VERIFIED':
        return {
          icon: QrCode,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10 border-cyan-500/30',
          label: 'QR Verified'
        };
      case 'EXCHANGE_COMPLETED':
        return {
          icon: Sparkles,
          color: 'text-purple-400',
          bg: 'bg-purple-500/10 border-purple-500/30',
          label: 'Completed'
        };
      case 'REVIEW_RECEIVED':
        return {
          icon: Star,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
          label: 'Review'
        };
      default:
        return {
          icon: Bell,
          color: 'text-slate-400',
          bg: 'bg-slate-800/50 border-slate-700/50',
          label: 'Notification'
        };
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = filter === 'UNREAD' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161d30]/60 p-6 rounded-3xl border border-[#242f4c] shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Bell className="h-7 w-7" />
            </span>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 animate-pulse">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time updates for exchange requests, physical handovers, and peer reviews.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            title="Refresh notifications"
            className="p-2.5 rounded-xl bg-[#1f2942] hover:bg-[#283556] text-slate-300 hover:text-white border border-[#2d3a5d] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              <span>{markingAll ? 'Marking...' : 'Mark all read'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#242f4c] pb-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filter === 'UNREAD'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filter === 'UNREAD' ? 'bg-pink-800 text-white' : 'bg-pink-500/20 text-pink-300'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="flex-1">{error}</p>
          <button 
            onClick={fetchNotifications} 
            className="text-xs underline hover:text-rose-200 font-semibold"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && notifications.length === 0 && (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading your notifications...</p>
        </div>
      )}

      {/* Notification List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => {
            const meta = getTypeMeta(n.type || n.notification_type);
            const IconComponent = meta.icon;

            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-4 ${
                  !n.is_read
                    ? 'bg-gradient-to-r from-[#192238] to-[#141b2d] border-indigo-500/40 shadow-lg shadow-indigo-950/20 hover:border-indigo-400'
                    : 'bg-[#161d30]/40 border-[#242f4c]/70 hover:bg-[#161d30]/80 hover:border-[#2d3a5d] opacity-90'
                }`}
              >
                {/* Left side: Icon and content */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-2xl border ${meta.bg} flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                    <IconComponent className={`h-5 w-5 ${meta.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <h3 className={`font-bold text-sm ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </h3>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" title="Unread" />
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed break-words">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(n.created_at)}
                      </span>
                      {n.related_id && (
                        <span className="flex items-center gap-1 text-indigo-400 group-hover:underline">
                          <span>View exchange</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Mark Read action */}
                {!n.is_read && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      disabled={processingId === n.id}
                      title="Mark as read"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-slate-700/50 hover:border-emerald-500/40 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          !loading && (
            <div className="text-center py-20 bg-[#161d30]/30 border border-[#242f4c] rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#1f2942] border border-[#2d3a5d] flex items-center justify-center mx-auto text-slate-500">
                <Bell className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-300 font-semibold text-base">
                  {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {filter === 'UNREAD' 
                    ? "You've read all your notifications. Check the 'All' tab to view past activity." 
                    : 'When you request or offer resources, updates about approvals, QR verification, and reviews will show up here.'}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
