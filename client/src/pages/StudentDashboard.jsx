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
  ChevronRight,
  TrendingUp,
  FolderHeart,
  MessageSquare,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStudentAnalytics } from '../services/analyticsService';
import TrustBreakdownModal from '../components/TrustBreakdownModal';
import RecommendationsSection from '../components/RecommendationsSection';
import TrustScoreRadial from '../components/ui/TrustScoreRadial';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';
import AnimatedButton from '../components/ui/AnimatedButton';
import GradientText from '../components/ui/GradientText';

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
      setError(err.response?.data?.message || 'Could not load dashboard analytics.');
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
      <div className="space-y-8 pb-16 animate-pulse">
        <div className="h-32 bg-[#111528]/60 rounded-3xl border border-white/10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-[#111528]/50 rounded-2xl border border-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-72 bg-[#111528]/50 rounded-3xl border border-white/5" />
          <div className="h-72 bg-[#111528]/50 rounded-3xl border border-white/5" />
        </div>
      </div>
    );
  }

  // Error State
  if (error && !analytics) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel border border-rose-500/30 rounded-3xl text-center space-y-4 shadow-xl">
        <AlertCircle className="h-12 w-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white font-heading">Dashboard Unavailable</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <AnimatedButton onClick={fetchAnalytics} variant="primary" size="md">
          <RefreshCw className="h-4 w-4 mr-2" />
          <span>Retry Loading</span>
        </AnimatedButton>
      </div>
    );
  }

  // Unpack analytics data
  const totalListings = analytics?.total_listings ?? 0;
  const availableListings = analytics?.available_listings ?? 0;
  const completedExchanges = analytics?.completed_exchanges ?? 0;
  const pendingRequests = analytics?.pending_requests ?? 0;
  const successfulQrHandovers = analytics?.successful_qr_handovers ?? 0;
  const reviewsReceived = analytics?.reviews_received ?? 0;
  const averageRating = analytics?.average_rating_received ?? 0;
  const wishlistCount = analytics?.wishlist_count ?? 0;
  const trustScore = analytics?.trust_score ?? 100;
  const reputationScore = analytics?.reputation_score ?? 100;
  const reputationTier = analytics?.reputation_tier ?? 'VERIFIED_STUDENT';

  const actionableRequests = analytics?.actionable_pending_requests ?? [];
  const recentListings = analytics?.recent_active_listings ?? [];

  const statCards = [
    {
      title: 'Active Listings',
      value: availableListings,
      subtext: `${totalListings} total listed`,
      icon: BookOpen,
      color: 'text-indigo-400',
      border: 'hover:border-indigo-500/40',
      link: '/my-listings'
    },
    {
      title: 'Completed Exchanges',
      value: completedExchanges,
      subtext: `${successfulQrHandovers} QR handovers`,
      icon: ArrowRightLeft,
      color: 'text-cyan-400',
      border: 'hover:border-cyan-500/40',
      link: '/history'
    },
    {
      title: 'Pending Requests',
      value: pendingRequests,
      subtext: `${actionableRequests.length} incoming actions`,
      icon: Clock,
      color: 'text-amber-400',
      border: 'hover:border-amber-500/40',
      link: '/exchange-requests'
    },
    {
      title: 'Wishlist Items',
      value: wishlistCount,
      subtext: 'Tracked for alerts',
      icon: Heart,
      color: 'text-pink-400',
      border: 'hover:border-pink-500/40',
      link: '/wishlist'
    }
  ];

  return (
    <div className="space-y-10 pb-16">
      
      {/* 1. SAAS DASHBOARD HERO HEADER */}
      <GlassCard variant="neon" className="border-indigo-500/30 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Student Exchange Workspace
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
              Welcome Back, <GradientText gradient="accent">{user?.name || 'Student'}</GradientText>
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              {user?.department || 'Academic'} Department • Year {user?.year_of_study || 1} • {user?.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/resources/create">
              <AnimatedButton variant="primary" size="md" icon={PlusCircle}>
                New Listing
              </AnimatedButton>
            </Link>
            <Link to="/resources">
              <AnimatedButton variant="secondary" size="md">
                Browse
              </AnimatedButton>
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* 2. PRIMARY METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => (
          <Link key={idx} to={card.link} className="block">
            <GlassCard
              variant="interactive"
              className={`border border-white/10 ${card.border} p-5 flex items-center justify-between`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">{card.title}</p>
                <p className="text-3xl font-extrabold text-white font-heading">{card.value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{card.subtext}</p>
              </div>
              <div className={`p-3 rounded-2xl bg-[#080A12] border border-white/10 ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* 3. TRUST SCORE & REPUTATION BREAKDOWN CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left: Trust Score Radial Visualizer */}
        <div className="lg:col-span-5 flex">
          <GlassCard
            variant="default"
            className="w-full flex flex-col items-center justify-center text-center p-6 border-indigo-500/20"
          >
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Peer Reputation Metrics</span>
            </div>

            <TrustScoreRadial
              score={trustScore}
              rating={averageRating}
              reviewsCount={reviewsReceived}
              size={150}
              strokeWidth={10}
            />

            <div className="mt-4 pt-4 border-t border-white/10 w-full flex items-center justify-around text-xs">
              <div>
                <p className="text-slate-400">Reviews</p>
                <p className="text-base font-bold text-white font-heading">{reviewsReceived}</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-slate-400">Handovers</p>
                <p className="text-base font-bold text-emerald-400 font-heading">{successfulQrHandovers}</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-slate-400">Rep Score</p>
                <p className="text-base font-bold text-cyan-400 font-heading">{reputationScore}</p>
              </div>
            </div>

            <button
              onClick={() => setShowTrustModal(true)}
              className="mt-5 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-indigo-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              View Full Trust Breakdown
            </button>
          </GlassCard>
        </div>

        {/* Right: Actionable Pending Feeds */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <GlassCard variant="default" className="flex-1 flex flex-col p-6 border-white/10">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white font-heading">Incoming Exchange Requests</h3>
              </div>
              <Link to="/exchange-requests" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1">
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {actionableRequests.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-400">
                <CheckCircle className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No pending handover requests awaiting your review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionableRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-[#080A12]/80 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{req.resource_title}</p>
                      <p className="text-xs text-slate-400">
                        From <span className="text-indigo-300 font-medium">{req.requester_name}</span> • {req.request_type}
                      </p>
                    </div>
                    <Link to="/exchange-requests">
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-bold border border-indigo-500/30 transition-all">
                        Review
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* 4. RECENT ACTIVE LISTINGS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white font-heading">Your Active Listings</h3>
          <Link to="/my-listings" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1">
            <span>Manage All Listings</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentListings.length === 0 ? (
          <GlassCard variant="default" className="text-center py-10 border-white/10">
            <BookOpen className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No active listings</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Share textbooks or course notes to help peer students.</p>
            <Link to="/resources/create">
              <AnimatedButton variant="primary" size="sm">
                Create First Listing
              </AnimatedButton>
            </Link>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentListings.map((item) => (
              <GlassCard
                key={item.id}
                variant="interactive"
                className="p-5 flex flex-col justify-between border-white/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {item.exchange_type}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {item.status}
                    </span>
                  </div>
                  <Link to={`/resources/${item.id}`} className="hover:text-indigo-300 transition-colors">
                    <h4 className="text-base font-bold text-white line-clamp-1 font-heading">{item.title}</h4>
                  </Link>
                </div>

                <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{item.item_condition || 'Good'}</span>
                  <Link to={`/resources/${item.id}/edit`} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                    Edit
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* 5. RECOMMENDATIONS CAROUSEL */}
      <RecommendationsSection />

      {/* Trust Breakdown Modal */}
      {showTrustModal && (
        <TrustBreakdownModal
          userId={user?.id}
          isOpen={showTrustModal}
          onClose={() => setShowTrustModal(false)}
        />
      )}

    </div>
  );
}
