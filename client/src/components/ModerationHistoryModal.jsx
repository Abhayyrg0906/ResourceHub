import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Clock, User, ArrowRight, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { getUserModerationHistory, getResourceModerationHistory } from '../services/adminService';

export default function ModerationHistoryModal({ isOpen, onClose, entityType, entityId, entityTitle }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !entityId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        let res;
        if (entityType === 'USER') {
          res = await getUserModerationHistory(entityId);
        } else if (entityType === 'RESOURCE') {
          res = await getResourceModerationHistory(entityId);
        }

        if (res && res.success) {
          setHistory(res.data || []);
        } else {
          setHistory([]);
        }
      } catch (err) {
        console.error('Error fetching moderation history:', err);
        setError(err.response?.data?.message || 'Failed to load moderation history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, entityType, entityId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121826] border border-[#242f4c] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#242f4c] bg-[#161d30]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Moderation & Audit History</h2>
              <p className="text-xs text-slate-400">
                {entityType}: <span className="text-slate-200 font-semibold">{entityTitle || `#${entityId}`}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Loading audit records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No prior moderation actions recorded.</p>
              <p className="text-xs text-slate-600 mt-1">This entity has no administrative modifications on record.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#242f4c]">
              {history.map((record) => (
                <div key={record.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1.5 w-4.5 h-4.5 rounded-full border-2 border-[#121826] bg-indigo-500 flex items-center justify-center text-[9px] text-white">
                    <Clock className="h-2.5 w-2.5" />
                  </div>

                  <div className="p-4 rounded-2xl bg-[#161d30]/70 border border-[#242f4c] space-y-2.5 group-hover:border-indigo-500/40 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {record.action_type}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Status Transition */}
                    {(record.previous_status || record.new_status) && (
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-2 py-0.5 rounded bg-[#0d111c] text-slate-400 border border-slate-800">
                          {record.previous_status || 'INITIAL'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {record.new_status}
                        </span>
                      </div>
                    )}

                    {/* Reason */}
                    {record.reason && (
                      <div className="p-2.5 rounded-xl bg-[#0d111c]/60 border border-[#242f4c] text-xs text-slate-300">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Reason / Resolution:</span>
                        <p>{record.reason}</p>
                      </div>
                    )}

                    {/* Admin Actor */}
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-[#242f4c]/40">
                      <User className="h-3 w-3 text-slate-500" />
                      <span>Admin: <span className="text-slate-300 font-medium">{record.admin_name}</span> ({record.admin_email})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#242f4c] bg-[#161d30]/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1f2942] hover:bg-[#283556] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
