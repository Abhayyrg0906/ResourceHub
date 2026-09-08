import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { getQrHistory } from '../services/exchangeService';

export default function QrHistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'EXPIRED' | 'GENERATED'
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getQrHistory();
      if (res.success && Array.isArray(res.data)) {
        setHistory(res.data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to load QR history:', err);
      setError('Unable to load handover verification history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(item => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'GENERATED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'EXPIRED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d111c]/85 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-[#141b2d] border border-[#242f4c] rounded-3xl p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl space-y-6 my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pr-8">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
                <History className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Audit Trail
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              QR Handover History
            </h2>
            <p className="text-xs text-slate-400">
              Complete log of all generated and verified campus exchange handovers.
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters and Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#242f4c]/60 py-3">
          <div className="flex items-center space-x-1.5 bg-[#0b0e17] p-1 rounded-xl border border-[#242f4c] text-xs">
            {['ALL', 'VERIFIED', 'GENERATED', 'EXPIRED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                  filter === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading handover audit records...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-400 text-xs">
              {error}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">No Handover Records Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {filter === 'ALL' 
                  ? 'You have not initiated or participated in any QR handovers yet.' 
                  : `No records matching filter "${filter}".`}
              </p>
            </div>
          ) : (
            filteredHistory.map(item => {
              const generatedDate = new Date(item.created_at).toLocaleString([], { 
                dateStyle: 'medium', 
                timeStyle: 'short' 
              });
              const verifiedDate = item.verified_at 
                ? new Date(item.verified_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                : null;
              const expiresDate = item.expires_at 
                ? new Date(item.expires_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                : null;

              return (
                <div 
                  key={item.id}
                  className="bg-[#0b0e17] border border-[#242f4c] hover:border-slate-700 rounded-2xl p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
                          {item.resource_exchange_type || 'EXCHANGE'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Partner: <strong className="text-slate-200">{item.partner_name || 'Exchange Partner'}</strong>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {item.resource_title || `Transaction #${item.transaction_id}`}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Audit details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Generated</span>
                      <span className="text-slate-300 font-medium">{generatedDate}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Expires</span>
                      <span className="text-slate-300 font-medium">{expiresDate || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Verified Status</span>
                      {verifiedDate ? (
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="h-3 w-3 inline" />
                          <span>{verifiedDate}</span>
                        </span>
                      ) : item.status === 'EXPIRED' ? (
                        <span className="text-rose-400 font-medium">Expired unverified</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Awaiting verification</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#242f4c]/60 flex justify-between items-center text-xs text-slate-500">
          <span>Security Guaranteed: Tokens are single-use & expire in 10 mins.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
