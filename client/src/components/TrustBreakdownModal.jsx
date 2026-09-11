import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Star,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Award,
  Info,
  QrCode,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Check,
  ShieldAlert
} from 'lucide-react';
import { getUserReputation } from '../services/userService';
import { getAdminUserReputation } from '../services/adminService';

export default function TrustBreakdownModal({ userId, userName, initialData, onClose, isAdmin = false }) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    if (!userId) return;

    let isMounted = true;
    const fetchBreakdown = async () => {
      setLoading(true);
      setError('');
      try {
        const fetcher = isAdmin ? getAdminUserReputation : getUserReputation;
        const res = await fetcher(userId);
        if (isMounted) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError('Failed to retrieve reputation breakdown.');
          }
        }
      } catch (err) {
        console.error('Error fetching reputation breakdown:', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Unable to load reputation breakdown.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBreakdown();
    return () => { isMounted = false; };
  }, [userId, initialData, isAdmin]);

  const getTierColor = (tierBadge) => {
    switch (tierBadge) {
      case 'elite':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          gradient: 'from-emerald-400 to-teal-500',
          gauge: '#10b981'
        };
      case 'trusted':
        return {
          bg: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
          gradient: 'from-teal-400 to-cyan-500',
          gauge: '#14b8a6'
        };
      case 'active':
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          gradient: 'from-cyan-400 to-blue-500',
          gauge: '#06b6d4'
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          gradient: 'from-amber-400 to-orange-500',
          gauge: '#f59e0b'
        };
      case 'restricted':
      default:
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          gradient: 'from-rose-500 to-red-600',
          gauge: '#f43f5e'
        };
    }
  };

  const tierColors = getTierColor(data?.tier_badge);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Reputation & Trust Breakdown
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  M17
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Transparent multi-factor audit for <span className="text-slate-200 font-medium">{userName || data?.user_name || 'Member'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-400">Calculating transparent reputation score...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Score Hero Card */}
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-850 to-slate-900 border border-slate-700/70 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  {/* Score Gauge & Number */}
                  <div className="flex items-center gap-5">
                    <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-slate-950/70 border-4 border-slate-800 shadow-inner">
                      <div className="text-center">
                        <span className={`text-3xl font-extrabold bg-gradient-to-r ${tierColors.gradient} bg-clip-text text-transparent`}>
                          {data.reputation_score !== undefined ? data.reputation_score.toFixed(1) : '--'}
                        </span>
                        <span className="block text-[10px] uppercase font-semibold text-slate-400">/ 100</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${tierColors.bg}`}>
                          {data.tier || 'Member'}
                        </span>
                        {data.factors?.account_standing?.account_status === 'SUSPENDED' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Suspended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-snug">
                        {data.summary || 'Verified campus reputation score.'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <span>Legacy Review Score:</span>
                        <span className="font-semibold text-slate-200">
                          {data.trust_score !== undefined ? data.trust_score.toFixed(1) : '--'} / 100
                        </span>
                        <span className="text-[10px] text-slate-500" title="Maintained for backward compatibility with M8 reviews">(M8 formula)</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action / Formula Toggle */}
                  <div className="sm:self-start flex sm:flex-col items-end gap-2">
                    <button
                      onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      {showFormulaDetails ? 'Hide Formula' : 'View Formula'}
                    </button>
                  </div>
                </div>

                {/* Formula Breakdown Panel */}
                {showFormulaDetails && (
                  <div className="mt-5 pt-4 border-t border-slate-700/80 text-xs text-slate-300 space-y-2 animate-fade-in bg-slate-950/40 p-3.5 rounded-xl">
                    <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Transparent Weighted Calculation Formula:
                    </div>
                    <p className="text-slate-400">
                      Score = (Review Quality × 40%) + (Completed Exchanges × 30%) + (Reliability × 20%) + (Account Standing × 10%)
                    </p>
                    <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
                      <li><strong className="text-slate-200">Review Quality (40 pts):</strong> Based on peer ratings out of 5★. (New accounts start with neutral 100% baseline).</li>
                      <li><strong className="text-slate-200">Completed Exchanges (30 pts):</strong> 5 completed exchanges reach 100% maturity, with bonus for QR verified handovers.</li>
                      <li><strong className="text-slate-200">Reliability & Fulfillment (20 pts):</strong> Non-cancellation rate on initiated exchanges. Zero cancellations = 100%.</li>
                      <li><strong className="text-slate-200">Account Standing (10 pts):</strong> 100 pts baseline; severe penalties for resolved or pending moderation reports.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* 4 Factor Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Factor 1: Review Quality */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Review Quality (40%)
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        {data.factors?.review_quality?.earned_points?.toFixed(1) || '0.0'} / 40.0 pts
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-amber-400 transition-all duration-500" 
                        style={{ width: `${Math.min(100, data.factors?.review_quality?.factor_score || 0)}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-300">
                      {data.factors?.review_quality?.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Average Rating: <strong className="text-slate-200">{data.factors?.review_quality?.average_rating?.toFixed(1)}★</strong></span>
                    <span>Reviews: <strong className="text-slate-200">{data.factors?.review_quality?.review_count}</strong></span>
                  </div>
                </div>

                {/* Factor 2: Completed Exchanges */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-400">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Completed Exchanges (30%)
                        </span>
                      </div>
                      <span className="text-xs font-bold text-teal-400">
                        {data.factors?.completed_exchanges?.earned_points?.toFixed(1) || '0.0'} / 30.0 pts
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-teal-400 transition-all duration-500" 
                        style={{ width: `${Math.min(100, data.factors?.completed_exchanges?.factor_score || 0)}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-300">
                      {data.factors?.completed_exchanges?.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Completed: <strong className="text-slate-200">{data.factors?.completed_exchanges?.completed_count}</strong></span>
                    <span className="flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-cyan-400" />
                      QR Verified: <strong className="text-slate-200">{data.factors?.completed_exchanges?.qr_verified_count}</strong>
                    </span>
                  </div>
                </div>

                {/* Factor 3: Reliability & Fulfillment */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Reliability & Fulfillment (20%)
                        </span>
                      </div>
                      <span className="text-xs font-bold text-cyan-400">
                        {data.factors?.reliability?.earned_points?.toFixed(1) || '0.0'} / 20.0 pts
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-cyan-400 transition-all duration-500" 
                        style={{ width: `${Math.min(100, data.factors?.reliability?.factor_score || 0)}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-300">
                      {data.factors?.reliability?.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Fulfillment: <strong className="text-slate-200">{data.factors?.reliability?.factor_score?.toFixed(0)}%</strong></span>
                    <span>Cancellations: <strong className="text-slate-200">{data.factors?.reliability?.cancelled_count}</strong></span>
                  </div>
                </div>

                {/* Factor 4: Account Standing */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Account Standing (10%)
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">
                        {data.factors?.account_standing?.earned_points?.toFixed(1) || '0.0'} / 10.0 pts
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-emerald-400 transition-all duration-500" 
                        style={{ width: `${Math.min(100, data.factors?.account_standing?.factor_score || 0)}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-300">
                      {data.factors?.account_standing?.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Status: <strong className="text-slate-200">{data.factors?.account_standing?.account_status}</strong></span>
                    <span>Reports: <strong className="text-slate-200">{data.factors?.account_standing?.total_reports}</strong></span>
                  </div>
                </div>
              </div>

              {/* Badges Section */}
              {Array.isArray(data.badges) && data.badges.length > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/40 via-slate-800/20 to-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Earned Community Badges ({data.badges.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {data.badges.map((badge) => (
                      <div 
                        key={badge.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-xs"
                      >
                        <div className="p-1 rounded bg-amber-500/10 text-amber-400 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{badge.name}</p>
                          <p className="text-[11px] text-slate-400 leading-tight">{badge.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Anti-manipulation protected: server-side audited</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
