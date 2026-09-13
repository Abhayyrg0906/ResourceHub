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
  Activity,
  FileText,
  History,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminStats, 
  getAdminUsers, 
  updateUserStatus, 
  getAdminResources, 
  updateResourceStatus, 
  getAdminReports, 
  updateReportStatus,
  getAuditLogs
} from '../services/adminService';
import { triggerAutoArchive } from '../services/resourceService';
import TrustBreakdownModal from '../components/TrustBreakdownModal';
import ModerationHistoryModal from '../components/ModerationHistoryModal';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';
import AnimatedButton from '../components/ui/AnimatedButton';

export default function AdminDashboard() {
  const { user } = useAuth();

  // Active Tab: 'ANALYTICS', 'USERS', 'RESOURCES', 'REPORTS', 'AUDIT'
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
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportActionLoading, setReportActionLoading] = useState(null);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [archiveTargetResource, setArchiveTargetResource] = useState(false);

  // Audit Logs State (M23)
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [selectedHistoryEntity, setSelectedHistoryEntity] = useState(null);

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
      if (reportSearch.trim()) params.search = reportSearch.trim();
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
  }, [reportSearch, reportStatusFilter]);

  // 5. Fetch Audit Logs (M23)
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAuditLogs(true);
      const params = { limit: 50 };
      if (auditSearch.trim()) params.search = auditSearch.trim();
      if (auditEntityFilter) params.target_entity_type = auditEntityFilter;
      if (auditActionFilter) params.action_type = auditActionFilter;
      const res = await getAuditLogs(params);
      if (res && res.success) {
        setAuditLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      showNotification(err.response?.data?.message || 'Could not load audit logs.', true);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [auditSearch, auditEntityFilter, auditActionFilter]);

  // Initial load
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStats();
      fetchUsers();
      fetchResources();
      fetchReports();
      fetchAuditLogs();
    }
  }, [user, fetchStats, fetchUsers, fetchResources, fetchReports, fetchAuditLogs]);

  // Handle User Status Toggle
  const handleToggleUserStatus = async (targetUserId, newStatus) => {
    let reason = null;
    if (newStatus === 'SUSPENDED') {
      reason = window.prompt('Enter reason for user suspension (optional):');
      if (reason === null) return;
    }
    try {
      setUserActionLoading(targetUserId);
      const res = await updateUserStatus(targetUserId, newStatus, reason);
      if (res && res.success) {
        showNotification(`User status updated to ${newStatus}`);
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, status: newStatus } : u));
        fetchStats();
        fetchAuditLogs();
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
    const reason = window.prompt('Enter reason for archiving this resource listing (optional):');
    if (reason === null) return;
    try {
      setResourceActionLoading(resourceId);
      const res = await updateResourceStatus(resourceId, 'ARCHIVED', reason);
      if (res && res.success) {
        showNotification('Resource archived successfully.');
        setResources(prev => prev.map(r => r.id === resourceId ? { ...r, status: 'ARCHIVED' } : r));
        fetchStats();
        fetchAuditLogs();
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
        fetchAuditLogs();
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
        showNotification(`Report #${reportId} status updated to ${newStatus}`);
        setReports(prev => prev.map(rep => rep.id === reportId ? { ...rep, status: newStatus, admin_resolution: payload.admin_resolution || rep.admin_resolution } : rep));
        setResolvingReportId(null);
        setResolutionText('');
        fetchStats();
        fetchResources();
        fetchAuditLogs();
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
      <GlassCard className="max-w-xl mx-auto py-24 text-center space-y-4" glow="rose">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white font-display">Access Denied</h2>
        <p className="text-sm text-slate-400">
          You do not have administrative permissions to view this control panel.
        </p>
      </GlassCard>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? '-', sub: `${stats?.active_users ?? '-'} Active • ${stats?.suspended_users ?? 0} Suspended`, icon: Users, color: 'text-indigo-400', glow: 'indigo' },
    { label: 'Total Listings', value: stats?.total_resources ?? '-', sub: `${stats?.available_resources ?? '-'} Available`, icon: BookOpen, color: 'text-emerald-400', glow: 'emerald' },
    { label: 'Completion Rate', value: stats?.completion_rate !== undefined ? `${stats.completion_rate}%` : '-', sub: `${stats?.completed_exchanges ?? '-'} of ${stats?.total_exchange_requests ?? '-'} Trades`, icon: ArrowRightLeft, color: 'text-purple-400', glow: 'purple' },
    { label: 'Pending Reports', value: stats?.pending_reports ?? '-', sub: 'Needs Review', icon: Flag, color: 'text-rose-400', glow: 'rose' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <GlassCard className="p-6 sm:p-8" glow="pink">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <SectionHeading
              badge="Campus Governance"
              title="Administration Portal"
              description="Monitor platform metrics, manage user accounts, moderate listings, investigate flags, and review audit history."
            />
          </div>

          <AnimatedButton
            onClick={() => {
              fetchStats();
              fetchUsers();
              fetchResources();
              fetchReports();
              fetchAuditLogs();
            }}
            variant="secondary"
            icon={RefreshCw}
          >
            Refresh All
          </AnimatedButton>
        </div>
      </GlassCard>

      {/* Alerts */}
      {message && (
        <GlassCard className="p-4 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{message}</span>
        </GlassCard>
      )}
      {error && (
        <GlassCard className="p-4 bg-rose-500/10 border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm animate-fadeIn">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </GlassCard>
      )}

      {/* Platform Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((s, idx) => {
          const Icon = s.icon;
          return (
            <GlassCard key={idx} className="p-5 flex items-center gap-4" glow={s.glow} interactive>
              <div className={`p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] ${s.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white tracking-tight font-display">{s.value}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.sub}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'ANALYTICS'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Platform Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'USERS'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Management ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'RESOURCES'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Resource Moderation ({resources.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'REPORTS'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Flag className="h-4 w-4" />
          <span>Reports Queue ({reports.length})</span>
          {stats && stats.pending_reports > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {stats.pending_reports}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'AUDIT'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ANALYTICS & INSIGHTS                               */}
      {/* ========================================================= */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6 space-y-5" glow="indigo">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <span>User Distribution & Roles</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">Total: {stats?.users?.total ?? stats?.total_users ?? 0}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <span className="text-slate-400">Active Students:</span>
                  <span className="float-right font-black text-emerald-400">{stats?.users?.active ?? stats?.active_users ?? 0}</span>
                </div>
                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <span className="text-slate-400">Suspended Users:</span>
                  <span className="float-right font-black text-rose-400">{stats?.users?.suspended ?? stats?.suspended_users ?? 0}</span>
                </div>
                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <span className="text-slate-400">Administrators:</span>
                  <span className="float-right font-black text-indigo-300">{stats?.users?.roles?.admin ?? 1}</span>
                </div>
                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <span className="text-slate-400">Students:</span>
                  <span className="float-right font-black text-slate-300">{stats?.users?.roles?.student ?? 0}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 space-y-5" glow="purple">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                  <ArrowRightLeft className="h-5 w-5 text-purple-400" />
                  <span>Exchange Fulfillment & Completion</span>
                </h3>
                <span className="text-xs font-black text-purple-300">
                  {stats?.completion_rate !== undefined ? `${stats.completion_rate}%` : '100%'} Completion
                </span>
              </div>
              <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/[0.06]">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats?.completion_rate ?? 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-2">
                <div className="p-3 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <p className="text-slate-400 text-[11px]">Completed</p>
                  <p className="text-base font-black text-emerald-400 mt-0.5">{stats?.exchanges?.completed ?? stats?.completed_exchanges ?? 0}</p>
                </div>
                <div className="p-3 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <p className="text-slate-400 text-[11px]">Pending</p>
                  <p className="text-base font-black text-amber-400 mt-0.5">{stats?.exchanges?.pending ?? 0}</p>
                </div>
                <div className="p-3 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <p className="text-slate-400 text-[11px]">Accepted</p>
                  <p className="text-base font-black text-indigo-400 mt-0.5">{stats?.exchanges?.accepted ?? 0}</p>
                </div>
                <div className="p-3 bg-black/40 rounded-2xl border border-white/[0.06]">
                  <p className="text-slate-400 text-[11px]">Cancelled</p>
                  <p className="text-base font-black text-rose-400 mt-0.5">{stats?.exchanges?.cancelled ?? 0}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: USER MANAGEMENT                                    */}
      {/* ========================================================= */}
      {activeTab === 'USERS' && (
        <GlassCard className="p-6 space-y-6" glow="indigo">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#080A12] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING_VERIFICATION">Pending</option>
              </select>

              <button
                onClick={fetchUsers}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.06] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Department & Year</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Reputation Score</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {users.length > 0 ? (
                  users.map((u) => {
                    const isSelf = u.id === user.id;
                    const repScore = Math.round(u.reputation_score !== undefined ? u.reputation_score : (u.trust_score || 100));

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-200">{u.department || 'Unassigned'}</p>
                          <p className="text-[11px] text-slate-500">{u.year_of_study ? `Year ${u.year_of_study}` : '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className={`font-black text-sm ${repScore >= 80 ? 'text-emerald-400' : repScore >= 60 ? 'text-indigo-400' : 'text-amber-400'}`}>
                                {repScore}
                              </span>
                              <span className="text-slate-500 text-[10px]"> / 100</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedReputationUser(u)}
                              className="p-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                              title="Audit multi-factor reputation breakdown"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : u.status === 'SUSPENDED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedHistoryEntity({ type: 'USER', id: u.id, title: u.name })}
                            className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="View moderation history"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>History</span>
                          </button>

                          {isSelf ? (
                            <span className="text-[10px] text-slate-500 italic pl-1">Self (Protected)</span>
                          ) : u.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => handleToggleUserStatus(u.id, 'ACTIVE')}
                              disabled={userActionLoading === u.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5 inline mr-1" />
                              <span>Activate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleUserStatus(u.id, 'SUSPENDED')}
                              disabled={userActionLoading === u.id}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
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
        </GlassCard>
      )}

      {/* ========================================================= */}
      {/* TAB 3: RESOURCE MODERATION                                */}
      {/* ========================================================= */}
      {activeTab === 'RESOURCES' && (
        <GlassCard className="p-6 space-y-6" glow="indigo">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, description, or owner..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={resourceStatusFilter}
                onChange={(e) => setResourceStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#080A12] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="EXCHANGED">Exchanged</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <button
                onClick={fetchResources}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                title="Refresh resource list"
              >
                <RefreshCw className={`h-4 w-4 ${loadingResources ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleTriggerAutoArchive}
                disabled={autoArchiving}
                className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Scan and auto-archive inactive listings"
              >
                <Clock className={`h-3.5 w-3.5 ${autoArchiving ? 'animate-spin' : ''}`} />
                <span>{autoArchiving ? 'Archiving...' : 'Auto-Archive Inactive'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.06] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">Resource</th>
                  <th className="p-4">Owner & Trust</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Type & Condition</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {resources.length > 0 ? (
                  resources.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 max-w-xs">
                        <p className="font-bold text-white truncate">{r.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{r.description}</p>
                        {r.report_count > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                            <Flag className="h-3 w-3" />
                            <span>{r.report_count} Report{r.report_count > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-slate-200 font-semibold">{r.owner_name}</p>
                        <p className="text-[11px] text-slate-500">{r.owner_email}</p>
                        <p className="text-[10px] text-indigo-400 font-bold mt-0.5">Trust: {Math.round(r.owner_reputation_score || r.owner_trust_score || 100)}%</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">
                          {r.category_name || 'General'}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-indigo-300">{r.exchange_type}</p>
                        <p className="text-[10px] text-slate-500">{r.item_condition}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.status === 'ARCHIVED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryEntity({ type: 'RESOURCE', id: r.id, title: r.title })}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="View resource audit history"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>History</span>
                        </button>

                        {r.status === 'ARCHIVED' ? (
                          <button
                            onClick={() => {
                              if (window.confirm(`Reactivate and unarchive "${r.title}"?`)) {
                                updateResourceStatus(r.id, 'AVAILABLE', 'Admin reactivated listing')
                                  .then(() => {
                                    showNotification('Resource reactivated successfully.');
                                    fetchResources();
                                    fetchAuditLogs();
                                  })
                                  .catch(err => showNotification(err.response?.data?.message || 'Failed to unarchive.', true));
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                          >
                            <span>Unarchive</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveResource(r.id)}
                            disabled={resourceActionLoading === r.id || r.status === 'RESERVED'}
                            title={r.status === 'RESERVED' ? 'Cannot archive while an active transaction is ongoing' : 'Archive listing'}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                      {loadingResources ? 'Loading resources...' : 'No resources match the search criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ========================================================= */}
      {/* TAB 4: REPORTS QUEUE                                      */}
      {/* ========================================================= */}
      {activeTab === 'REPORTS' && (
        <GlassCard className="p-6 space-y-6" glow="rose">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports by reason, description, or reporter..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#080A12] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>

              <button
                onClick={fetchReports}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loadingReports ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((rep) => (
                <GlassCard key={rep.id} className="p-5 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {rep.reported_entity_type} #{rep.reported_entity_id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        rep.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' :
                        rep.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' :
                        rep.status === 'UNDER_REVIEW' ? 'bg-indigo-500/20 text-indigo-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {rep.status}
                      </span>
                      <span className="text-slate-500 text-xs">• {new Date(rep.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-bold text-white font-display">{rep.reason}</p>
                    {rep.description && <p className="text-xs text-slate-300 font-normal">{rep.description}</p>}
                    <p className="text-[11px] text-slate-400">Reporter: <span className="text-slate-200 font-semibold">{rep.reporter_name}</span> ({rep.reporter_email})</p>
                    {rep.admin_resolution && (
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] text-xs text-slate-300 mt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Admin Resolution:</span>
                        <p>{rep.admin_resolution}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between items-end gap-3 min-w-[220px]">
                    {rep.status === 'PENDING' || rep.status === 'UNDER_REVIEW' ? (
                      <div className="w-full">
                        {resolvingReportId === rep.id ? (
                          <div className="space-y-2 w-full">
                            <textarea
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              placeholder="Enter resolution notes..."
                              className="w-full p-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                              rows={2}
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
                                className="px-2.5 py-1 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateReport(rep.id, 'RESOLVED')}
                                disabled={reportActionLoading === rep.id}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
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
                              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5 inline mr-1" />
                              <span>Resolve</span>
                            </button>
                            <button
                              onClick={() => handleUpdateReport(rep.id, 'DISMISSED')}
                              disabled={reportActionLoading === rep.id}
                              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] text-xs font-bold transition-all cursor-pointer"
                            >
                              <span>Dismiss</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-xs">Closed ({rep.status})</span>
                    )}
                  </div>
                </GlassCard>
              ))
            ) : (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <ShieldCheck className="h-10 w-10 mx-auto text-slate-600" />
                <p>No moderation reports in queue.</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* ========================================================= */}
      {/* TAB 5: AUDIT TRAIL (M23)                                  */}
      {/* ========================================================= */}
      {activeTab === 'AUDIT' && (
        <GlassCard className="p-6 space-y-6" glow="indigo">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by reason, admin name, action..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                className="px-3 py-2 bg-[#080A12] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Entities</option>
                <option value="USER">User</option>
                <option value="RESOURCE">Resource</option>
                <option value="REPORT">Report</option>
                <option value="SYSTEM">System</option>
              </select>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="px-3 py-2 bg-[#080A12] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Actions</option>
                <option value="USER_STATUS_CHANGE">User Status Change</option>
                <option value="RESOURCE_STATUS_CHANGE">Resource Status Change</option>
                <option value="REPORT_RESOLUTION">Report Resolution</option>
                <option value="AUTO_ARCHIVE_TRIGGER">Auto-Archive Trigger</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                title="Refresh audit trail"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAuditLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.06] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Admin Actor</th>
                  <th className="p-4">Action & Target</th>
                  <th className="p-4">Status Transition</th>
                  <th className="p-4">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 whitespace-nowrap text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-bold text-white">{log.admin_name}</p>
                        <p className="text-[11px] text-slate-500">{log.admin_email}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 block w-max mb-1">
                          {log.action_type}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {log.target_entity_type} {log.target_entity_id ? `#${log.target_entity_id}` : ''}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {(log.previous_status || log.new_status) ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className="px-2 py-0.5 rounded-full bg-black/40 text-slate-400 border border-white/[0.06] text-[10px]">
                              {log.previous_status || 'INIT'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-600" />
                            <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
                              {log.new_status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-4 max-w-sm">
                        <p className="text-slate-200 text-xs break-words font-normal">{log.reason || '-'}</p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {loadingAuditLogs ? 'Loading audit records...' : 'No audit entries match the filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
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

      {/* Entity Moderation History Modal (M23) */}
      {selectedHistoryEntity && (
        <ModerationHistoryModal
          isOpen={Boolean(selectedHistoryEntity)}
          onClose={() => setSelectedHistoryEntity(null)}
          entityType={selectedHistoryEntity.type}
          entityId={selectedHistoryEntity.id}
          entityTitle={selectedHistoryEntity.title}
        />
      )}
    </div>
  );
}
