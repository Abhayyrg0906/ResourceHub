import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Heart, 
  Star, 
  RefreshCw, 
  BookOpen, 
  ArrowRightLeft, 
  QrCode, 
  Award, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Leaf
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStudentAnalytics } from '../services/analyticsService';
import TrustBreakdownModal from '../components/TrustBreakdownModal';
import RecommendationsSection from '../components/RecommendationsSection';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrustModal, setShowTrustModal] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStudentAnalytics();
      if (res && res.success) {
        setAnalytics(res.data);
      } else {
        setError(res?.message || 'Failed to load analytics.');
      }
    } catch (err) {
      console.error('Error loading student dashboard analytics:', err);
      setError(err.response?.data?.message || 'Could not load dashboard analytics. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Loading Skeleton State
  if (loading && !analytics) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-pulse">
        <div className="h-32 bg-[#161d30]/60 rounded-3xl border border-[#242f4c]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-[#161d30]/50 rounded-2xl border border-[#242f4c]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-72 bg-[#161d30]/50 rounded-3xl border border-[#242f4c]" />
          <div className="h-72 bg-[#161d30]/50 rounded-3xl border border-[#242f4c]" />
        </div>
      </div>
    );
  }

  // Error State
  if (error && !analytics) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#161d30]/80 border border-rose-500/30 rounded-3xl text-center space-y-4 shadow-xl">
        <AlertCircle className="h-12 w-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Dashboard Unavailable</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // Data unwrapping with safe defaults
  const totalListings = analytics?.total_listings ?? 0;
  const availableListings = analytics?.available_listings ?? 0;
  const completedExchanges = analytics?.completed_exchanges ?? 0;
  const pendingRequests = analytics?.pending_requests ?? 0;
  const successfulQrHandovers = analytics?.successful_qr_handovers ?? 0;
  const reviewsReceived = analytics?.reviews_received ?? 0;
  const averageRating = analytics?.average_rating_received ?? 0;
  const trustScore = analytics?.trust_score ?? (user?.trust_score || 100);
  const reputationScore = analytics?.reputation_score ?? trustScore;
  const reputationTier = analytics?.reputation_tier ?? 'Trusted Peer';
  const wishlistCount = analytics?.wishlist_count ?? 0;

  const actionableRequests = analytics?.actionable_pending_requests || [];
  const recentListings = analytics?.recent_active_listings || [];
  const exchangesBreakdown = analytics?.exchanges_breakdown || {};

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* 1. Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-indigo-950/60 via-[#161d30]/80 to-purple-950/40 border border-[#242f4c] rounded-3xl p-6 md:p-8 gap-6 shadow-2xl backdrop-blur-md">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user ? user.name : 'Student'}!
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {reputationTier}
            </span>
          </div>
          <p className="text-slate-400 text-xs md:text-sm max-w-2xl">
            {user?.department ? `${user.department} • Year ${user.year_of_study || 1}` : 'Verified Campus Peer'}
            {' — Track your active academic exchanges, verification performance, and reputation metrics.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-3 rounded-2xl bg-[#1f2942] hover:bg-[#283556] text-slate-300 hover:text-white border border-[#2d3a5d] transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <Link 
            to="/resources/create"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-semibold px-5 py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-600/25 hover:scale-[1.02]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>List a Resource</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary 8 KPI Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* Metric 1: Total Listings */}
        <Link 
          to="/my-listings"
          className="group bg-[#161d30]/60 hover:bg-[#1a233a] border border-[#242f4c] hover:border-indigo-500/40 rounded-2xl p-5 transition-all duration-200 shadow-lg hover:shadow-indigo-500/5 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Listings</p>
              <p className="text-3xl font-extrabold text-white mt-1">{totalListings}</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>{availableListings} Available now</span>
            <ArrowRight className="h-3 w-3 text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Metric 2: Available Listings */}
        <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Available Listings</p>
              <p className="text-3xl font-extrabold text-emerald-400 mt-1">{availableListings}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ready for peer exchange</span>
            <span className="text-emerald-400 font-medium">Active</span>
          </div>
        </div>

        {/* Metric 3: Completed Exchanges */}
        <Link 
          to="/history"
          className="group bg-[#161d30]/60 hover:bg-[#1a233a] border border-[#242f4c] hover:border-purple-500/40 rounded-2xl p-5 transition-all duration-200 shadow-lg hover:shadow-purple-500/5 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Completed Trades</p>
              <p className="text-3xl font-extrabold text-purple-400 mt-1">{completedExchanges}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>{exchangesBreakdown.completed_as_owner || 0} owner • {exchangesBreakdown.completed_as_requester || 0} borrower</span>
            <ArrowRight className="h-3 w-3 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Metric 4: Pending Requests */}
        <Link 
          to="/exchange-requests"
          className={`group bg-[#161d30]/60 hover:bg-[#1a233a] border rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between ${
            pendingRequests > 0 
              ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60' 
              : 'border-[#242f4c] hover:border-slate-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Requests</p>
              <p className={`text-3xl font-extrabold mt-1 ${pendingRequests > 0 ? 'text-amber-400' : 'text-white'}`}>
                {pendingRequests}
              </p>
            </div>
            <div className={`p-3 rounded-xl border group-hover:scale-110 transition-transform ${
              pendingRequests > 0 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300 animate-pulse' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px]">
            {pendingRequests > 0 ? (
              <span className="text-amber-300 font-medium">Action Required!</span>
            ) : (
              <span className="text-slate-500">All caught up</span>
            )}
            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Metric 5: Successful QR Handovers */}
        <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Verified QR Handovers</p>
              <p className="text-3xl font-extrabold text-teal-400 mt-1">{successfulQrHandovers}</p>
            </div>
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <QrCode className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Secure physical handovers</span>
            <span className="text-teal-400 font-semibold">100% Secure</span>
          </div>
        </div>

        {/* Metric 6: Reviews Received */}
        <Link 
          to="/profile"
          className="group bg-[#161d30]/60 hover:bg-[#1a233a] border border-[#242f4c] hover:border-pink-500/40 rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Reviews Received</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-extrabold text-pink-400">{reviewsReceived}</p>
                {reviewsReceived > 0 && (
                  <span className="text-xs font-bold text-amber-400 flex items-center">
                    <Star className="h-3 w-3 fill-current mr-0.5" />
                    {averageRating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
              <Star className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>{reviewsReceived > 0 ? 'Peer feedback rating' : 'No reviews yet'}</span>
            <ArrowRight className="h-3 w-3 text-pink-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Metric 7: Trust & Reputation Score */}
        <button
          onClick={() => setShowTrustModal(true)}
          className="group text-left bg-[#161d30]/60 hover:bg-[#1a233a] border border-[#242f4c] hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Reputation Score</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-3xl font-extrabold text-amber-400">{reputationScore.toFixed(0)}</p>
                <span className="text-xs text-slate-500 font-medium">/ 100</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-indigo-300 font-medium">Audit breakdown</span>
            <Sparkles className="h-3 w-3 text-amber-400" />
          </div>
        </button>

        {/* Metric 8: Wishlist Count */}
        <Link 
          to="/wishlist"
          className="group bg-[#161d30]/60 hover:bg-[#1a233a] border border-[#242f4c] hover:border-rose-500/40 rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Wishlist Items</p>
              <p className="text-3xl font-extrabold text-rose-400 mt-1">{wishlistCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
              <Heart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Saved for availability alerts</span>
            <ArrowRight className="h-3 w-3 text-rose-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

      </div>

      {/* 3. Actionable Queues & Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Actionable Feeds */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Queue: Pending Incoming Requests */}
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <span>Action Queue: Pending Exchange Requests</span>
                {actionableRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {actionableRequests.length}
                  </span>
                )}
              </h2>
              <Link 
                to="/exchange-requests" 
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                <span>View all</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {actionableRequests.length > 0 ? (
              <div className="space-y-3">
                {actionableRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-4 bg-[#0d111c]/80 border border-[#242f4c] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-500/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {req.exchange_type}
                        </span>
                        {req.price && <span className="text-xs font-semibold text-emerald-400">${req.price}</span>}
                      </div>
                      <h3 className="text-sm font-bold text-slate-200">{req.resource_title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Requested by <span className="text-slate-300 font-semibold">{req.requester_name}</span> (Trust: {req.requester_trust_score}%)
                      </p>
                    </div>

                    <Link
                      to="/exchange-requests"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                    >
                      <span>Review Request</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-[#0d111c]/40 rounded-2xl border border-dashed border-[#242f4c] p-6 space-y-2">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-slate-300">All Caught Up!</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You have no pending requests awaiting your approval. New exchange proposals will appear here immediately.
                </p>
              </div>
            )}
          </div>

          {/* Active Listings Feed */}
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                <span>Your Active Marketplace Listings</span>
              </h2>
              <Link 
                to="/my-listings" 
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                <span>Manage listings</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {recentListings.length > 0 ? (
              <div className="divide-y divide-[#242f4c]/60">
                {recentListings.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl overflow-hidden bg-slate-900 border border-[#242f4c] flex-shrink-0 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="h-5 w-5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200 line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-slate-400">
                          {item.category_name} • Condition: {item.item_condition}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] uppercase font-extrabold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.exchange_type}
                      </span>
                      <Link
                        to={`/resources/${item.id}`}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2942] transition-colors"
                        title="View Resource"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-[#0d111c]/40 rounded-2xl border border-dashed border-[#242f4c] p-6 space-y-3">
                <BookOpen className="h-8 w-8 text-slate-500 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-slate-300">No Active Listings</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You don't have any items listed in the marketplace right now. Share an academic resource to earn community credits!
                </p>
                <Link
                  to="/resources/create"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>List Your First Resource</span>
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Visual Meters & Sustainability Impact */}
        <div className="space-y-6">
          
          {/* Exchange Fulfillment Progress Card */}
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Exchange Fulfillment Rate</span>
            </h3>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs text-slate-400 font-medium">Reliability Meter</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  {completedExchanges + (exchangesBreakdown.cancelled || 0) > 0
                    ? `${((completedExchanges / (completedExchanges + (exchangesBreakdown.cancelled || 0))) * 100).toFixed(0)}%`
                    : '100%'}
                </span>
              </div>
              <div className="w-full bg-[#0d111c] rounded-full h-3 overflow-hidden border border-[#242f4c]">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${completedExchanges + (exchangesBreakdown.cancelled || 0) > 0
                      ? ((completedExchanges / (completedExchanges + (exchangesBreakdown.cancelled || 0))) * 100)
                      : 100}%` 
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
              <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                <p className="text-slate-400 font-medium">Completed</p>
                <p className="text-lg font-bold text-white mt-0.5">{completedExchanges}</p>
              </div>
              <div className="p-3 bg-[#0d111c]/60 rounded-xl border border-[#242f4c]">
                <p className="text-slate-400 font-medium">Cancelled</p>
                <p className="text-lg font-bold text-rose-400 mt-0.5">{exchangesBreakdown.cancelled || 0}</p>
              </div>
            </div>
          </div>

          {/* Campus Sustainability Factor */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-[#161d30]/60 to-emerald-950/30 border border-emerald-500/20 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Environmental Credit</h3>
                <p className="text-[11px] text-emerald-300 font-medium">Circular Campus Economy</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              By reusing, borrowing, and swapping {completedExchanges} academic items on campus, you have helped divert approximately{' '}
              <span className="text-emerald-300 font-bold">{(completedExchanges * 2.8).toFixed(1)} kg</span> of textbook, paper, and electronic waste!
            </p>

            <div className="pt-2">
              <Link 
                to="/resources"
                className="w-full py-2.5 px-4 rounded-xl bg-[#0d111c] hover:bg-[#1a233a] border border-[#242f4c] hover:border-emerald-500/30 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <span>Browse Campus Listings</span>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* Personalized Recommendations Section (M20) */}
      <RecommendationsSection
        title="✨ Recommended for Your Academic Term"
        subtitle="Curated listings based on your study wishlist, exchange preferences, and campus activity"
        type="personalized"
        limit={3}
        className="mt-8"
      />

      {/* Trust & Reputation Breakdown Modal */}
      {showTrustModal && (
        <TrustBreakdownModal
          userId={user?.id}
          userName={user?.name}
          onClose={() => setShowTrustModal(false)}
        />
      )}

    </div>
  );
}
