import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Mail, 
  MapPin, 
  Award, 
  User, 
  Save, 
  CheckCircle, 
  Edit3, 
  Star, 
  Package, 
  ArrowRightLeft, 
  Phone, 
  GraduationCap, 
  Building, 
  Calendar, 
  MessageSquare, 
  X, 
  AlertCircle,
  ExternalLink,
  Sparkles,
  Camera
} from 'lucide-react';
import { getMyProfile, updateMyProfile, getUserProfile } from '../services/userService';
import chatService from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import TrustBreakdownModal from '../components/TrustBreakdownModal';

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();

  // State
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'listings', 'reviews'
  const [showTrustModal, setShowTrustModal] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    profile_photo_url: '',
    department: '',
    year_of_study: '',
    phone_number: '',
    bio: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Chat button loading
  const [chatLoading, setChatLoading] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = !userId || (currentUser && Number(userId) === Number(currentUser.id));

  // Fetch Profile Data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let res;
      if (isOwnProfile) {
        res = await getMyProfile();
      } else {
        res = await getUserProfile(userId);
      }

      if (res && res.success) {
        setProfileData(res.data);
        if (isOwnProfile) {
          setEditForm({
            name: res.data.name || '',
            profile_photo_url: res.data.profile_photo_url || '',
            department: res.data.department || '',
            year_of_study: res.data.year_of_study !== null && res.data.year_of_study !== undefined ? String(res.data.year_of_study) : '',
            phone_number: res.data.phone_number || '',
            bio: res.data.bio || ''
          });
        }
      } else {
        setError(res?.message || 'Failed to load profile.');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'User profile not found or could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Edit Profile Submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      setEditError(null);

      const payload = {
        name: editForm.name.trim(),
        profile_photo_url: editForm.profile_photo_url.trim() || null,
        department: editForm.department.trim() || null,
        year_of_study: editForm.year_of_study ? parseInt(editForm.year_of_study, 10) : null,
        phone_number: editForm.phone_number.trim() || null,
        bio: editForm.bio.trim() || null
      };

      const res = await updateMyProfile(payload);
      if (res && res.success) {
        setProfileData(res.data);
        // Sync with AuthContext so navbar avatar updates immediately
        if (updateUser) {
          updateUser({
            name: res.data.name,
            profile_photo_url: res.data.profile_photo_url,
            department: res.data.department,
            year_of_study: res.data.year_of_study,
            phone_number: res.data.phone_number,
            bio: res.data.bio
          });
        }
        setEditSuccess(true);
        setTimeout(() => {
          setEditSuccess(false);
          setIsEditOpen(false);
        }, 1200);
      } else {
        setEditError(res?.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setEditError(err.response?.data?.message || 'Could not save profile changes.');
    } finally {
      setEditLoading(false);
    }
  };

  // Start Chat with this user (for public profile)
  const handleStartChat = async () => {
    if (!profileData) return;
    try {
      setChatLoading(true);
      // Find active listing or open chat directly
      const firstListing = (profileData.active_listings || [])[0];
      if (firstListing) {
        const convRes = await chatService.getOrCreateConversation({
          resource_id: firstListing.id
        });
        if (convRes.success && convRes.data) {
          navigate(`/chat/${convRes.data.id}`);
          return;
        }
      }
      // Fallback navigate to chat
      navigate('/chat');
    } catch (err) {
      console.error('Error initiating conversation:', err);
      navigate('/chat');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading user profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-8 backdrop-blur-md">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Profile Unavailable</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">{error || 'This user profile could not be found.'}</p>
        </div>
        <button
          onClick={() => navigate('/resources')}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
        >
          Explore Marketplace
        </button>
      </div>
    );
  }

  const stats = profileData.stats || {
    completed_exchanges: 0,
    active_listings: 0,
    review_count: 0,
    average_rating: 5.0
  };

  const trustScore = Number(profileData.trust_score || 100.0).toFixed(1);
  const activeListings = profileData.active_listings || [];
  const reviews = profileData.reviews || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* Profile Header Hero */}
      <div className="relative bg-gradient-to-b from-[#19223a] to-[#141b2d] border border-[#242f4c] rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-pink-500/5 rounded-full blur-2xl -z-10" />

        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          
          {/* Left: Avatar & Identity Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              {profileData.profile_photo_url ? (
                <img
                  src={profileData.profile_photo_url}
                  alt={profileData.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-[#242f4c] shadow-2xl bg-[#0d111c]"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-white text-4xl shadow-2xl ring-4 ring-[#242f4c] ${profileData.profile_photo_url ? 'hidden' : 'flex'}`}
              >
                {profileData.name.charAt(0).toUpperCase()}
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setIsEditOpen(true)}
                  title="Change profile photo"
                  className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border border-indigo-400/40 transition-transform group-hover:scale-110"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* User Meta */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {profileData.name}
                </h1>
                <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Student</span>
                </span>
                {profileData.reputation_breakdown?.tier && (
                  <button
                    type="button"
                    onClick={() => setShowTrustModal(true)}
                    className="flex items-center gap-1.5 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer"
                    title="View detailed reputation and trust breakdown"
                  >
                    <Award className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{profileData.reputation_breakdown.tier}</span>
                    <span className="bg-indigo-500/20 px-1.5 py-0.5 rounded text-[10px] text-indigo-200">
                      {profileData.reputation_score !== undefined ? profileData.reputation_score.toFixed(0) : trustScore}%
                    </span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
                {profileData.department && (
                  <span className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{profileData.department}</span>
                  </span>
                )}
                {profileData.year_of_study && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-purple-400" />
                    <span>Year {profileData.year_of_study}</span>
                  </span>
                )}
                {profileData.email && isOwnProfile && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span>{profileData.email}</span>
                  </span>
                )}
                {profileData.phone_number && isOwnProfile && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{profileData.phone_number}</span>
                  </span>
                )}
              </div>

              {profileData.bio && (
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed mt-2 pt-1 font-normal">
                  {profileData.bio}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={handleStartChat}
                disabled={chatLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{chatLoading ? 'Connecting...' : 'Message Student'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlight Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-[#242f4c]/80">
          
          {/* Trust & Reputation Score */}
          <div 
            onClick={() => setShowTrustModal(true)}
            className="bg-[#0f1523]/80 hover:bg-[#141c2e] transition-colors p-4 rounded-2xl border border-[#242f4c] text-center sm:text-left cursor-pointer group"
            title="Click to view full reputation factors breakdown"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">
                Reputation Score
              </span>
              <span className="text-[10px] text-cyan-400 group-hover:underline flex items-center gap-0.5">
                Breakdown <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="flex items-baseline justify-center sm:justify-start gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                {profileData.reputation_score !== undefined ? profileData.reputation_score.toFixed(0) : trustScore}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Multi-factor campus audit (M17)
            </span>
          </div>

          {/* Completed Exchanges */}
          <div className="bg-[#0f1523]/80 p-4 rounded-2xl border border-[#242f4c] text-center sm:text-left">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block mb-1">
              Completed Exchanges
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {stats.completed_exchanges}
              </span>
              <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Verified handovers</span>
          </div>

          {/* Active Listings */}
          <div className="bg-[#0f1523]/80 p-4 rounded-2xl border border-[#242f4c] text-center sm:text-left">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block mb-1">
              Active Listings
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {stats.active_listings}
              </span>
              <Package className="h-4 w-4 text-purple-400" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">In marketplace</span>
          </div>

          {/* Peer Rating */}
          <div className="bg-[#0f1523]/80 p-4 rounded-2xl border border-[#242f4c] text-center sm:text-left">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block mb-1">
              Average Rating
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                {stats.average_rating > 0 ? Number(stats.average_rating).toFixed(1) : '5.0'}
              </span>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">{stats.review_count} reviews received</span>
          </div>

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#242f4c] pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          About & Bio
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'listings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          <span>Active Listings</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'listings' ? 'bg-indigo-800 text-white' : 'bg-[#1f2942] text-slate-300'}`}>
            {activeListings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d30]'
          }`}
        >
          <span>Peer Reviews</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'reviews' ? 'bg-indigo-800 text-white' : 'bg-[#1f2942] text-slate-300'}`}>
            {reviews.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: Overview & Bio */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bio card */}
          <div className="md:col-span-2 bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>About {profileData.name}</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {profileData.bio || "This student hasn't written a biography yet."}
            </p>

            <div className="pt-4 border-t border-[#242f4c] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0f1523]/80 border border-[#242f4c]">
                <Building className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Department</span>
                  <span className="text-xs font-semibold text-slate-200">{profileData.department || 'Not specified'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0f1523]/80 border border-[#242f4c]">
                <GraduationCap className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Year of Study</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {profileData.year_of_study ? `Year ${profileData.year_of_study}` : 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0f1523]/80 border border-[#242f4c]">
                <Calendar className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Member Since</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {new Date(profileData.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0f1523]/80 border border-[#242f4c]">
                <ShieldCheck className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Status</span>
                  <span className="text-xs font-semibold text-emerald-400">Active & Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Score & Badges Sidecard */}
          <div className="space-y-6">
            <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" />
                <span>Campus Badges</span>
              </h3>
              
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                  <span className="text-xl">🌱</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">Eco Contributor</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Actively participates in campus circular reuse.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-300">Verified Peer</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Maintains verified college credentials.</p>
                  </div>
                </div>

                {stats.completed_exchanges >= 5 && (
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
                    <span className="text-xl">🤝</span>
                    <div>
                      <h4 className="text-xs font-bold text-purple-300">Top Exchanger</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Completed 5+ successful exchanges.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: Active Listings */}
      {activeTab === 'listings' && (
        <div>
          {activeListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeListings.map((item) => (
                <Link
                  key={item.id}
                  to={`/resources/${item.id}`}
                  className="group bg-[#161d30]/60 border border-[#242f4c] hover:border-indigo-500/50 rounded-3xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-950/20 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Thumbnail or Icon */}
                    <div className="w-full h-40 rounded-2xl bg-[#0f1523] border border-[#242f4c]/80 flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.category || 'General'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {item.item_condition}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#242f4c]">
                    <span className="text-sm font-extrabold text-indigo-400">
                      {item.exchange_type === 'SELL' ? `₹${item.price}` : item.exchange_type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-white font-medium">
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-[#161d30]/40 border border-[#242f4c] rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#1f2942] border border-[#2d3a5d] flex items-center justify-center mx-auto text-slate-500">
                <Package className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-bold text-base">No active listings</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isOwnProfile ? "You haven't listed any resources currently available." : "This user doesn't have any active listings right now."}
                </p>
              </div>
              {isOwnProfile && (
                <Link
                  to="/resources/create"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
                >
                  List a Resource
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Peer Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <div
                key={r.id}
                className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl p-5 sm:p-6 space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md text-sm">
                      {r.reviewer_name ? r.reviewer_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {r.reviewer_name || 'Anonymous Student'}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Stars Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= r.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-extrabold text-amber-300 ml-1.5">
                      {r.rating}.0
                    </span>
                  </div>
                </div>

                {r.review_text && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                    "{r.review_text}"
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="py-16 text-center bg-[#161d30]/40 border border-[#242f4c] rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#1f2942] border border-[#2d3a5d] flex items-center justify-center mx-auto text-slate-500">
                <Star className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-bold text-base">No reviews yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Reviews are submitted by peer students following verified physical handovers.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#161d30] border border-[#242f4c] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#242f4c]">
              <div>
                <h3 className="text-xl font-extrabold text-white">Edit Student Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">Update your public campus information.</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1f2942] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error / Success Banners */}
            {editError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              
              {/* Photo Preview & URL */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Profile Photo URL
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0f1523] border border-[#242f4c] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {editForm.profile_photo_url ? (
                      <img
                        src={editForm.profile_photo_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="h-6 w-6 text-slate-500" />
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={editForm.profile_photo_url}
                    onChange={(e) => setEditForm({ ...editForm, profile_photo_url: e.target.value })}
                    className="flex-1 px-4 py-2.5 bg-[#0d111c] border border-slate-700/80 focus:border-indigo-500 rounded-xl text-white text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0d111c] border border-slate-700/80 focus:border-indigo-500 rounded-xl text-white text-xs outline-none transition-colors"
                />
              </div>

              {/* Department & Year Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0d111c] border border-slate-700/80 focus:border-indigo-500 rounded-xl text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Year of Study
                  </label>
                  <select
                    value={editForm.year_of_study}
                    onChange={(e) => setEditForm({ ...editForm, year_of_study: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0d111c] border border-slate-700/80 focus:border-indigo-500 rounded-xl text-white text-xs outline-none transition-colors"
                  >
                    <option value="">Select Year</option>
                    <option value="1">Year 1 (Freshman)</option>
                    <option value="2">Year 2 (Sophomore)</option>
                    <option value="3">Year 3 (Junior)</option>
                    <option value="4">Year 4 (Senior)</option>
                    <option value="5">Year 5 (Graduate)</option>
                    <option value="6">Year 6 (Doctoral)</option>
                  </select>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0d111c] border border-slate-700/80 focus:border-indigo-500 rounded-xl text-white text-xs outline-none transition-colors"
                />
                <span className="text-[10px] text-slate-500 block">Only visible to confirmed exchange partners.</span>
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Bio
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {editForm.bio.length} / 1000
                  </span>
                </div>
                <textarea
                  rows="3"
                  maxLength={1000}
                  placeholder="Share a short bio about what you study and items you are looking for..."
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0d111c] border border-slate-700/80 focus:border-indigo-500 rounded-xl text-white text-xs outline-none transition-colors resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#242f4c]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1f2942] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{editLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Trust & Reputation Breakdown Modal */}
      {showTrustModal && profileData && (
        <TrustBreakdownModal
          userId={profileData.id}
          userName={profileData.name}
          initialData={profileData.reputation_breakdown}
          onClose={() => setShowTrustModal(false)}
        />
      )}

    </div>
  );
}
