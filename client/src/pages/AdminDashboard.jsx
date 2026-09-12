import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Users, 
  BookOpen, 
  ArrowRightLeft, 
  Flag, 
  CheckCircle2, 
  Ban, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Search, 
  Filter, 
  Archive, 
  Sparkles,
  Clock,
  ShieldCheck,
  UserCheck,
  UserX,
  ExternalLink,
  MessageSquare,
  BarChart3,
  QrCode,
  Star,
  Bell,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminStats, 
  getAdminUsers, 
  updateUserStatus, 
  getAdminResources, 
  updateResourceStatus, 
  getAdminReports, 
  updateReportStatus 
} from '../services/adminService';
import { triggerAutoArchive } from '../services/resourceService';
import TrustBreakdownModal from '../components/TrustBreakdownModal';

export default function AdminDashboard() {
  const { user } = useAuth();

  // Active Tab: 'USERS', 'RESOURCES', 'REPORTS'
  const [activeTab, setActiveTab] = useState('USERS');

  // Stats State
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userActionLoading, setUserActionLoading] = useState(null);
  const [selectedReputationUser, setSelectedReputationUser] = useState(null);

  // Resources State
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceStatusFilter, setResourceStatusFilter] = useState('');
  const [resourceActionLoading, setResourceActionLoading] = useState(null);
  const [autoArchiving, setAutoArchiving] = useState(false);

  // Reports State
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportActionLoading, setReportActionLoading] = useState(null);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [archiveTargetResource, setArchiveTargetResource] = useState(false);

  // Feedback State
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setMessage(null);
    } else {
      setMessage(msg);
      setError(null);
    }
    setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 4000);
  };

  // 1. Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await getAdminStats();
      if (res && res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 2. Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const params = { limit: 50 };
      if (userSearch.trim()) params.search = userSearch.trim();
      if (userStatusFilter) params.status = userStatusFilter;
      const res = await getAdminUsers(params);
      if (res && res.success) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showNotification(err.response?.data?.message || 'Could not load users.', true);
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userStatusFilter]);

  // 3. Fetch Resources
  const fetchResources = useCallback(async () => {
    try {
      setLoadingResources(true);
      const params = { limit: 50 };
      if (resourceSearch.trim()) params.search = resourceSearch.trim();
      if (resourceStatusFilter) params.status = resourceStatusFilter;
      const res = await getAdminResources(params);
      if (res && res.success) {
        setResources(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch resources:', err);
      showNotification(err.response?.data?.message || 'Could not load resources.', true);
    } finally {
      setLoadingResources(false);
    }
  }, [resourceSearch, resourceStatusFilter]);

  // 4. Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const params = { limit: 50 };
      if (reportStatusFilter) params.status = reportStatusFilter;
      const res = await getAdminReports(params);
      if (res && res.success) {
        setReports(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      showNotification(err.response?.data?.message || 'Could not load reports.', true);
    } finally {
      setLoadingReports(false);
    }
  }, [reportStatusFilter]);

  // Initial load
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStats();
      fetchUsers();
      fetchResources();
      fetchReports();
    }
  }, [user, fetchStats, fetchUsers, fetchResources, fetchReports]);

  // Handle User Status Toggle
  const handleToggleUserStatus = async (targetUserId, newStatus) => {
    try {
      setUserActionLoading(targetUserId);
      const res = await updateUserStatus(targetUserId, newStatus);
      if (res && res.success) {
        showNotification(`User status updated to ${newStatus}`);
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, status: newStatus } : u));
        fetchStats();
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      showNotification(err.response?.data?.message || 'Failed to update user status.', true);
    } finally {
      setUserActionLoading(null);
    }
  };

  // Handle Resource Archive
  const handleArchiveResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to archive this resource listing?')) return;
    try {
      setResourceActionLoading(resourceId);
      const res = await updateResourceStatus(resourceId, 'ARCHIVED');
      if (res && res.success) {
        showNotification('Resource archived successfully.');
        setResources(prev => prev.map(r => r.id === resourceId ? { ...r, status: 'ARCHIVED' } : r));
        fetchStats();
      }
    } catch (err) {
      console.error('Error archiving resource:', err);
      showNotification(err.response?.data?.message || 'Failed to archive resource.', true);
    } finally {
      setResourceActionLoading(null);
    }
  };

  // Handle Trigger Auto-Archival Scan (M22)
  const handleTriggerAutoArchive = async () => {
    try {
      setAutoArchiving(true);
      const res = await triggerAutoArchive();
      if (res && res.success) {
        showNotification(res.message || 'Auto-archival process completed.');
        fetchResources();
        fetchStats();
      }
    } catch (err) {
      console.error('Error triggering auto-archival:', err);
      showNotification(err.response?.data?.message || 'Failed to execute auto-archival scan.', true);
    } finally {
      setAutoArchiving(false);
    }
  };

  // Handle Report Status Update
  const handleUpdateReport = async (reportId, newStatus) => {
    try {
      setReportActionLoading(reportId);
      const payload = {
        status: newStatus,
        admin_resolution: resolutionText.trim() || undefined,
        archive_resource: archiveTargetResource
      };
      const res = await updateReportStatus(reportId, payload);
      if (res && res.success) {
        showNotification(`Report marked as ${newStatus}.`);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus, admin_resolution: resolutionText.trim() || r.admin_resolution } : r));
        setResolvingReportId(null);
        setResolutionText('');
        setArchiveTargetResource(false);
        fetchStats();
        if (archiveTargetResource) fetchResources();
      }
    } catch (err) {
      console.error('Error updating report:', err);
      showNotification(err.response?.data?.message || 'Failed to update report.', true);
    } finally {
      setReportActionLoading(null);
    }
  };

  // Guard: if non-admin attempts to view
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Access Denied</h2>
        <p className="text-sm text-slate-400">
          You do not have administrative permissions to view this control panel.
        </p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? '-', sub: `${stats?.active_users ?? '-'} Active • ${stats?.suspended_users ?? 0} Suspended`, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Total Listings', value: stats?.total_resources ?? '-', sub: `${stats?.available_resources ?? '-'} Available`, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Completion Rate', value: stats?.completion_rate !== undefined ? `${stats.completion_rate}%` : '-', sub: `${stats?.completed_exchanges ?? '-'} of ${stats?.total_exchange_requests ?? '-'} Trades`, icon: ArrowRightLeft, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Pending Reports', value: stats?.pending_reports ?? '-', sub: 'Needs Review', icon: Flag, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161d30]/80 p-6 sm:p-8 rounded-3xl border border-[#242f4c] shadow-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400">
              <ShieldAlert className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Administration Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Monitor platform metrics, manage user accounts, moderate resource listings, and resolve user flags.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchUsers();
            fetchResources();
            fetchReports();
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1f2942] hover:bg-[#283556] text-slate-300 hover:text-white border border-[#2d3a5d] text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Alerts */}
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm animate-fadeIn">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Platform Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl p-5 flex items-center gap-4 hover:border-[#3b4b75] transition-all">
              <div className={`p-3.5 rounded-xl border ${s.bg} ${s.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#242f4c] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ANALYTICS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Platform Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'USERS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Management ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'RESOURCES'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Resource Moderation ({resources.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'REPORTS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          <Flag className="h-4 w-4" />
          <span>Reports Queue ({reports.length})</span>
          {stats && stats.pending_reports > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {stats.pending_reports}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 0: PLATFORM ANALYTICS                                 */}
      {/* ========================================================= */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* Row 1: User Health & Exchange Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* User Community Health */}
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <span>Campus User Community</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">Total: {stats?.users?.total ?? stats?.total_users ?? 0}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Active Accounts</span>
                    <span className="text-emerald-400 font-bold">{stats?.users?.active ?? stats?.active_users ?? 0}</span>
                  </div>
                  <div className="w-full bg-[#0d111c] h-2 rounded-full overflow-hidden border border-[#242f4c]">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${stats?.total_users ? ((stats.active_users / stats.total_users) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Suspended Accounts</span>
                    <span className="text-rose-400 font-bold">{stats?.users?.suspended ?? stats?.suspended_users ?? 0}</span>
                  </div>
                  <div className="w-full bg-[#0d111c] h-2 rounded-full overflow-hidden border border-[#242f4c]">
                    <div 
                      className="bg-rose-500 h-full rounded-full" 
                      style={{ width: `${stats?.total_users ? (((stats.suspended_users || 0) / stats.total_users) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Pending Verification</span>
                    <span className="text-amber-400 font-bold">{stats?.users?.pending_verification ?? stats?.pending_verification_users ?? 0}</span>
                  </div>
                  <div className="w-full bg-[#0d111c] h-2 rounded-full overflow-hidden border border-[#242f4c]">
                    <div 
                      className="bg-amber-500 h-full rounded-full" 
                      style={{ width: `${stats?.total_users ? (((stats.pending_verification_users || 0) / stats.total_users) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#242f4c]/60 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 font-medium">Students</p>
                  <p className="text-lg font-bold text-white mt-0.5">{stats?.users?.students ?? '-'}</p>
                </div>
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 font-medium">Administrators</p>
                  <p className="text-lg font-bold text-pink-400 mt-0.5">{stats?.users?.admins ?? '-'}</p>
                </div>
              </div>
            </div>

            {/* Exchange Lifecycle & Completion Rate */}
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-purple-400" />
                  <span>Exchange Fulfillment & Completion</span>
                </h3>
                <span className="text-xs font-bold text-purple-300">
                  {stats?.completion_rate !== undefined ? `${stats.completion_rate}%` : '100%'} Completion
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs text-slate-400 font-medium">Completed vs Cancelled Rate</span>
                  <span className="text-sm font-extrabold text-purple-400">{stats?.completion_rate ?? 100}%</span>
                </div>
                <div className="w-full bg-[#0d111c] rounded-full h-3 overflow-hidden border border-[#242f4c]">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats?.completion_rate ?? 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-2">
                <div className="p-2.5 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 text-[11px]">Completed</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{stats?.exchanges?.completed ?? stats?.completed_exchanges ?? 0}</p>
                </div>
                <div className="p-2.5 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 text-[11px]">Pending</p>
                  <p className="text-base font-bold text-amber-400 mt-0.5">{stats?.exchanges?.pending ?? 0}</p>
                </div>
                <div className="p-2.5 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 text-[11px]">Accepted</p>
                  <p className="text-base font-bold text-indigo-400 mt-0.5">{stats?.exchanges?.accepted ?? 0}</p>
                </div>
                <div className="p-2.5 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 text-[11px]">Cancelled</p>
                  <p className="text-base font-bold text-rose-400 mt-0.5">{stats?.exchanges?.cancelled ?? 0}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Resources Inventory & QR Handover Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Resources Inventory & Types */}
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  <span>Marketplace Resource Distribution</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">Total: {stats?.resources?.total ?? stats?.total_resources ?? 0}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <span className="text-slate-400">Available:</span>
                  <span className="float-right font-bold text-emerald-400">{stats?.resources?.available ?? stats?.available_resources ?? 0}</span>
                </div>
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <span className="text-slate-400">Reserved:</span>
                  <span className="float-right font-bold text-amber-400">{stats?.resources?.reserved ?? 0}</span>
                </div>
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <span className="text-slate-400">Exchanged:</span>
                  <span className="float-right font-bold text-purple-400">{stats?.resources?.exchanged ?? 0}</span>
                </div>
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <span className="text-slate-400">Archived:</span>
                  <span className="float-right font-bold text-slate-500">{stats?.resources?.archived ?? 0}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#242f4c]/60">
                <p className="text-xs text-slate-400 font-semibold mb-2">Exchange Types Breakdown:</p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    <p className="text-[10px] uppercase font-bold">Sell</p>
                    <p className="text-sm font-extrabold mt-0.5">{stats?.resources?.exchange_types?.sell ?? 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <p className="text-[10px] uppercase font-bold">Borrow</p>
                    <p className="text-sm font-extrabold mt-0.5">{stats?.resources?.exchange_types?.borrow ?? 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
                    <p className="text-[10px] uppercase font-bold">Swap</p>
                    <p className="text-sm font-extrabold mt-0.5">{stats?.resources?.exchange_types?.swap ?? 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300">
                    <p className="text-[10px] uppercase font-bold">Donate</p>
                    <p className="text-sm font-extrabold mt-0.5">{stats?.resources?.exchange_types?.donate ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Verification Statistics */}
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-teal-400" />
                  <span>QR Physical Handover Performance</span>
                </h3>
                <span className="text-xs font-bold text-teal-300">
                  {stats?.qr_verifications?.verification_rate !== undefined ? `${stats.qr_verifications.verification_rate}%` : '100%'} Verified
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs text-slate-400 font-medium">Handover Verification Success Rate</span>
                  <span className="text-sm font-extrabold text-teal-400">
                    {stats?.qr_verifications?.verification_rate ?? 100}%
                  </span>
                </div>
                <div className="w-full bg-[#0d111c] rounded-full h-3 overflow-hidden border border-[#242f4c]">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats?.qr_verifications?.verification_rate ?? 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs pt-2">
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400">Total Generated</p>
                  <p className="text-lg font-bold text-white mt-0.5">{stats?.qr_verifications?.total_generated ?? 0}</p>
                </div>
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400">Verified</p>
                  <p className="text-lg font-bold text-teal-400 mt-0.5">{stats?.qr_verifications?.verified ?? 0}</p>
                </div>
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400">Expired</p>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">{stats?.qr_verifications?.expired ?? 0}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Row 3: Reviews Sentiment, Moderation & Notifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Reviews Sentiment */}
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                <span>Reviews & Community Sentiment</span>
              </h4>

              <div className="flex items-center gap-3">
                <p className="text-3xl font-extrabold text-white">{stats?.reviews?.average_rating ?? 0}</p>
                <div>
                  <div className="flex items-center text-amber-400 text-xs">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stats?.reviews?.total ?? 0} Total Reviews</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 text-xs">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = stats?.reviews?.distribution?.[stars] || 0;
                  const total = stats?.reviews?.total || 1;
                  const pct = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={stars} className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className="w-3">{stars}★</span>
                      <div className="flex-1 bg-[#0d111c] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Moderation & Reports Pipeline */}
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Flag className="h-4 w-4 text-rose-400" />
                <span>Moderation Pipeline</span>
              </h4>

              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-rose-300 font-semibold uppercase">Pending Action</p>
                  <p className="text-2xl font-extrabold text-rose-400">{stats?.reports?.pending ?? stats?.pending_reports ?? 0}</p>
                </div>
                <button
                  onClick={() => setActiveTab('REPORTS')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
                >
                  Open Queue
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-[#242f4c]/60">
                  <span className="text-slate-400">Total Reports:</span>
                  <span className="font-bold">{stats?.reports?.total ?? 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#242f4c]/60">
                  <span className="text-slate-400">Resolved:</span>
                  <span className="font-bold text-emerald-400">{stats?.reports?.resolved ?? 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Dismissed:</span>
                  <span className="font-bold text-slate-500">{stats?.reports?.dismissed ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Notification Activity */}
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-400" />
                <span>Notification System Activity</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 text-[11px]">Total Dispatched</p>
                  <p className="text-lg font-bold text-white mt-0.5">{stats?.notifications?.total ?? 0}</p>
                </div>
                <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                  <p className="text-slate-400 text-[11px]">Unread Alert Ratio</p>
                  <p className="text-lg font-bold text-indigo-400 mt-0.5">
                    {stats?.notifications?.total ? `${(((stats.notifications.unread || 0) / stats.notifications.total) * 100).toFixed(0)}%` : '0%'}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[11px] text-slate-400 font-semibold mb-2">Top Notification Channels:</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats?.notifications?.by_type?.length > 0 ? (
                    stats.notifications.by_type.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0d111c] border border-[#242f4c] text-slate-300">
                        {t.notification_type}: <b className="text-indigo-300">{t.count}</b>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">No dispatch data</span>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: USER MANAGEMENT                                    */}
      {/* ========================================================= */}
      {activeTab === 'USERS' && (
        <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0d111c]/80 border border-[#242f4c] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#0d111c]/80 border border-[#242f4c] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
              </select>
              <button
                onClick={fetchUsers}
                className="p-2 rounded-xl bg-[#1f2942] hover:bg-[#283556] text-slate-300 hover:text-white border border-[#2d3a5d] transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#242f4c]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1f2942]/60 text-slate-400 border-b border-[#242f4c] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Department & Year</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Reputation & Trust</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242f4c]/60 text-slate-300">
                {users.length > 0 ? (
                  users.map((u) => {
                    const isSelf = Number(u.id) === Number(user.id);
                    return (
                      <tr key={u.id} className="hover:bg-[#1f2942]/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">
                              {u.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-white">{u.name} {isSelf && <span className="text-[10px] text-indigo-400 font-normal">(You)</span>}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-200">{u.department || 'N/A'}</p>
                          <p className="text-[11px] text-slate-500">Year {u.year_of_study || '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="font-bold text-emerald-400">
                                {u.reputation_score !== undefined ? Number(u.reputation_score).toFixed(0) : u.trust_score}
                              </span>
                              <span className="text-slate-500 text-[10px]"> / 100</span>
                              <p className="text-[10px] text-slate-400">M8 Review: {u.trust_score}%</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedReputationUser(u)}
                              className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                              title="Audit multi-factor reputation breakdown"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : u.status === 'SUSPENDED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReputationUser(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all mr-2 inline-flex items-center gap-1 cursor-pointer"
                            title="Audit user reputation factors"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Audit</span>
                          </button>
                          {isSelf ? (
                            <span className="text-[10px] text-slate-500 italic">Self (Protected)</span>
                          ) : u.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => handleToggleUserStatus(u.id, 'ACTIVE')}
                              disabled={userActionLoading === u.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all"
                            >
                              <UserCheck className="h-3.5 w-3.5 inline mr-1" />
                              <span>Activate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleUserStatus(u.id, 'SUSPENDED')}
                              disabled={userActionLoading === u.id}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition-all"
                            >
                              <UserX className="h-3.5 w-3.5 inline mr-1" />
                              <span>Suspend</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {loadingUsers ? 'Loading user database...' : 'No users match the search criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: RESOURCE MODERATION                                */}
      {/* ========================================================= */}
      {activeTab === 'RESOURCES' && (
        <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, description, or owner..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0d111c]/80 border border-[#242f4c] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={resourceStatusFilter}
                onChange={(e) => setResourceStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#0d111c]/80 border border-[#242f4c] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="EXCHANGED">Exchanged</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <button
                onClick={fetchResources}
                className="p-2 rounded-xl bg-[#1f2942] hover:bg-[#283556] text-slate-300 hover:text-white border border-[#2d3a5d] transition-colors"
                title="Refresh resource list"
              >
                <RefreshCw className={`h-4 w-4 ${loadingResources ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleTriggerAutoArchive}
                disabled={autoArchiving}
                className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Scan and auto-archive inactive listings"
              >
                <Clock className={`h-3.5 w-3.5 ${autoArchiving ? 'animate-spin' : ''}`} />
                <span>{autoArchiving ? 'Archiving...' : 'Auto-Archive Inactive'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#242f4c]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1f2942]/60 text-slate-400 border-b border-[#242f4c] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">Resource</th>
                  <th className="p-4">Owner</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Type & Condition</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242f4c]/60 text-slate-300">
                {resources.length > 0 ? (
                  resources.map((r) => (
                    <tr key={r.id} className="hover:bg-[#1f2942]/30 transition-colors">
                      <td className="p-4 max-w-xs">
                        <p className="font-bold text-white truncate">{r.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{r.description}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-200">{r.owner_name}</p>
                        <p className="text-[11px] text-slate-500">{r.owner_email}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {r.category_name || 'General'}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-indigo-300">{r.exchange_type}</p>
                        <p className="text-[10px] text-slate-500">{r.item_condition}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.status === 'ARCHIVED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {r.status === 'ARCHIVED' ? (
                          <span className="text-[11px] text-rose-400/80 italic">Archived</span>
                        ) : (
                          <button
                            onClick={() => handleArchiveResource(r.id)}
                            disabled={resourceActionLoading === r.id || r.status === 'RESERVED'}
                            title={r.status === 'RESERVED' ? 'Cannot archive while an active transaction is ongoing' : 'Archive listing'}
                            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Archive className="h-3.5 w-3.5 inline mr-1" />
                            <span>Archive</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {loadingResources ? 'Loading listings...' : 'No listings match filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: REPORTS QUEUE                                      */}
      {/* ========================================================= */}
      {activeTab === 'REPORTS' && (
        <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Community Moderation Reports</h2>
            <div className="flex items-center gap-2">
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#0d111c]/80 border border-[#242f4c] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Reports</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
              <button
                onClick={fetchReports}
                className="p-2 rounded-xl bg-[#1f2942] hover:bg-[#283556] text-slate-300 hover:text-white border border-[#2d3a5d] transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loadingReports ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((rep) => (
                <div key={rep.id} className="bg-[#0d111c]/60 border border-[#242f4c] rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-extrabold uppercase">
                        Report #{rep.id}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        Target: <span className="text-white">{rep.reported_entity_type} #{rep.reported_entity_id}</span>
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      rep.status === 'PENDING'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : rep.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : rep.status === 'DISMISSED'
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {rep.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-rose-300">Reason: {rep.reason}</p>
                    {rep.description && (
                      <p className="text-xs text-slate-300 bg-[#161d30] p-3 rounded-xl border border-[#242f4c]/60">
                        {rep.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-[#242f4c]/60 text-[11px] text-slate-500">
                    <div>
                      Reported by <span className="text-slate-300">{rep.reporter_name}</span> ({rep.reporter_email})
                    </div>

                    {rep.admin_resolution && (
                      <div className="text-emerald-400 text-xs">
                        Resolution: <span className="text-slate-300 italic">{rep.admin_resolution}</span>
                      </div>
                    )}

                    {rep.status === 'PENDING' || rep.status === 'UNDER_REVIEW' ? (
                      <div className="flex items-center gap-2">
                        {resolvingReportId === rep.id ? (
                          <div className="space-y-2 bg-[#161d30] p-3 rounded-xl border border-indigo-500/40 w-full sm:w-80">
                            <input
                              type="text"
                              placeholder="Resolution notes (e.g. Inappropriate item)..."
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              className="w-full px-2 py-1.5 bg-[#0d111c] border border-[#242f4c] rounded-lg text-xs text-white placeholder-slate-500"
                            />
                            {rep.reported_entity_type === 'RESOURCE' && (
                              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={archiveTargetResource}
                                  onChange={(e) => setArchiveTargetResource(e.target.checked)}
                                  className="rounded text-indigo-500"
                                />
                                <span>Also archive reported resource</span>
                              </label>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => setResolvingReportId(null)}
                                className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateReport(rep.id, 'RESOLVED')}
                                disabled={reportActionLoading === rep.id}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
                              >
                                Confirm Resolve
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setResolvingReportId(rep.id);
                                setResolutionText('');
                                setArchiveTargetResource(rep.reported_entity_type === 'RESOURCE');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all"
                            >
                              <Check className="h-3.5 w-3.5 inline mr-1" />
                              <span>Resolve</span>
                            </button>
                            <button
                              onClick={() => handleUpdateReport(rep.id, 'DISMISSED')}
                              disabled={reportActionLoading === rep.id}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
                            >
                              <span>Dismiss</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Closed</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <ShieldCheck className="h-10 w-10 mx-auto text-slate-600" />
                <p>No moderation reports in queue.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Reputation Inspection Modal */}
      {selectedReputationUser && (
        <TrustBreakdownModal
          userId={selectedReputationUser.id}
          userName={selectedReputationUser.name}
          onClose={() => setSelectedReputationUser(null)}
          isAdmin={true}
        />
      )}
    </div>
  );
}
