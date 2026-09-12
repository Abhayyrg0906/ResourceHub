import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  ShieldCheck, 
  Calendar, 
  Leaf, 
  CheckCircle,
  MessageSquare,
  Image as ImageIcon,
  Edit2,
  Trash2,
  AlertTriangle,
  PlusCircle,
  X,
  Heart,
  Award,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react';
import { getResourceById, archiveResource, getResources } from '../services/resourceService';
import { createRequest } from '../services/exchangeService';
import chatService from '../services/chatService';
import wishlistService from '../services/wishlistService';
import { useAuth } from '../context/AuthContext';
import TrustBreakdownModal from '../components/TrustBreakdownModal';
import RecommendationsSection from '../components/RecommendationsSection';
import MeetupLocationCard from '../components/MeetupLocationCard';

export default function ResourceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Exchange Request Modal States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [borrowDurationDays, setBorrowDurationDays] = useState('');
  const [offeredResourceId, setOfferedResourceId] = useState('');
  const [myAvailableResources, setMyAvailableResources] = useState([]);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [initiatingChat, setInitiatingChat] = useState(false);
  const [showOwnerTrustModal, setShowOwnerTrustModal] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleStartChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setInitiatingChat(true);
      const res = await chatService.getOrCreateConversation({ resourceId: resource.id });
      if (res && res.success && res.conversation) {
        navigate(`/chat/${res.conversation.id}`);
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
      alert(err.response?.data?.message || 'Could not open chat.');
    } finally {
      setInitiatingChat(false);
    }
  };

  const [inWishlist, setInWishlist] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  useEffect(() => {
    if (user && id) {
      wishlistService.checkWishlistStatus(id).then(res => {
        if (res && res.success) {
          setInWishlist(res.inWishlist);
        }
      }).catch(() => {});
    }
  }, [user, id]);

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setTogglingWishlist(true);
      const res = await wishlistService.toggleWishlist(id);
      if (res && res.success) {
        setInWishlist(res.inWishlist);
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
    } finally {
      setTogglingWishlist(false);
    }
  };

  // Fetch resource details on mount
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await getResourceById(id);
        if (res.success) {
          setResource(res.data);
          if (res.data.images && res.data.images.length > 0) {
            const primaryIdx = res.data.images.findIndex(img => img.is_primary);
            setActiveImageIndex(primaryIdx !== -1 ? primaryIdx : 0);
          }
        }
      } catch (err) {
        console.error('Error loading listing details:', err.message);
        if (err.response && err.response.status === 404) {
          setError('Resource not found.');
        } else {
          setError('Something went wrong. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Fetch own available resources for SWAP exchange requests
  useEffect(() => {
    const fetchMyResources = async () => {
      if (user && resource && resource.exchange_type === 'SWAP' && resource.owner.id !== user.id) {
        try {
          const res = await getResources({ owner_id: user.id, status: 'AVAILABLE' });
          if (res.success) {
            setMyAvailableResources(res.data);
          }
        } catch (err) {
          console.error('Failed to load own available resources for swap:', err.message);
        }
      }
    };
    fetchMyResources();
  }, [user, resource]);

  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this resource?')) {
      try {
        const res = await archiveResource(id);
        if (res.success) {
          alert('Resource archived successfully.');
          navigate('/my-listings');
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to archive resource.');
      }
    }
  };

  const handleExchangeRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestSubmitting(true);
    setRequestError('');

    try {
      const payload = {
        resource_id: parseInt(id, 10),
        borrow_duration_days: resource.exchange_type === 'BORROW' ? parseInt(borrowDurationDays, 10) : null,
        offered_resource_id: resource.exchange_type === 'SWAP' ? parseInt(offeredResourceId, 10) : null
      };

      const res = await createRequest(payload);
      if (res.success) {
        setRequestSuccess(true);
        setTimeout(() => {
          setShowRequestModal(false);
          navigate('/exchange-requests');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to submit exchange request:', err.message);
      setRequestError(err.response?.data?.message || 'Failed to request exchange. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const getBadgeStyle = (type) => {
    if (!type) return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    switch (type.toUpperCase()) {
      case 'SELL': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'BORROW': return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'SWAP': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'DONATE': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusBadgeStyle = (status) => {
    if (!status) return 'bg-slate-500/10 text-slate-400 border border-slate-700';
    switch (status.toUpperCase()) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'RESERVED': return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case 'EXCHANGED': return 'bg-slate-500/10 text-slate-400 border border-slate-700';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto" />
        <p className="text-rose-400 font-semibold text-lg">{error || 'Resource not found.'}</p>
        <Link to="/resources" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all">
          Back to Resources
        </Link>
      </div>
    );
  }

  const isOwner = user && resource.owner && resource.owner.id === user.id;
  const imagesList = resource.images && resource.images.length > 0 ? resource.images : [];
  const currentImage = imagesList[activeImageIndex] || imagesList[0];

  const handlePrevImage = () => {
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-6 relative">
      {/* Back Button */}
      <Link to="/resources" className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Resources</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Interactive Image Gallery */}
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl overflow-hidden shadow-lg p-3 space-y-3">
            {/* Main Stage */}
            <div className="relative rounded-2xl overflow-hidden h-96 flex items-center justify-center bg-slate-950/80 border border-slate-800/80 group">
              {currentImage ? (
                <img 
                  src={currentImage.image_url} 
                  alt={`${resource.title} - Image ${activeImageIndex + 1}`} 
                  className="w-full h-full object-contain sm:object-cover transition-all duration-300"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x400/1e293b/white?text=Image+Unavailable';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 bg-gradient-to-br from-indigo-950/20 to-purple-950/20 w-full h-full">
                  <ImageIcon className="h-16 w-16 text-slate-700 mb-2" />
                  <span className="text-xs uppercase font-bold tracking-widest text-slate-500">No Image Available</span>
                </div>
              )}

              {/* Badges & Counter */}
              {currentImage && (
                <div className="absolute top-3 left-3 flex items-center space-x-2">
                  {currentImage.is_primary && (
                    <div className="bg-amber-500/90 backdrop-blur-md text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg">
                      <Star className="h-3 w-3 fill-current" />
                      <span>PRIMARY COVER</span>
                    </div>
                  )}
                </div>
              )}

              {imagesList.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-700/60 shadow">
                  {activeImageIndex + 1} / {imagesList.length}
                </div>
              )}

              {/* Navigation Arrows */}
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/60 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Previous Image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/60 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Next Image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {imagesList.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-1 px-1 custom-scrollbar">
                {imagesList.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                      idx === activeImageIndex
                        ? 'border-indigo-400 ring-2 ring-indigo-500/40 scale-105 shadow-md'
                        : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {img.is_primary && (
                      <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow">
                        <Star className="h-2.5 w-2.5 fill-current" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 md:p-8 space-y-6">
            
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full border ${getBadgeStyle(resource.exchange_type)}`}>
                  {resource.exchange_type}
                </span>
                <span className={`text-xs uppercase font-extrabold px-3 py-1 rounded-full border ${getStatusBadgeStyle(resource.status)}`}>
                  {resource.status}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Added on {new Date(resource.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{resource.title}</h1>
              <p className="text-sm text-indigo-300 font-medium">
                {resource.category} • Condition: <span className="text-slate-300">{resource.item_condition}</span>
              </p>
            </div>

            <div className="border-t border-[#242f4c] pt-6 space-y-4">
              <h3 className="font-bold text-slate-200 text-lg">Description</h3>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{resource.description}</p>
            </div>

            <div className="border-t border-[#242f4c] pt-6 space-y-4">
              {/* Meetup location card with map modal */}
              <MeetupLocationCard
                meetupLocation={resource.meetup_location}
                resourceTitle={resource.title}
              />

              {/* Sustainability Info */}
              <div className="flex items-start space-x-3 bg-emerald-950/10 p-4 rounded-2xl border border-emerald-500/10">
                <Leaf className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Sustainability Factor</h4>
                  <p className="text-sm text-slate-300 mt-1 font-semibold">CO2 Reuse Credit</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Opting for pre-owned prevents manufacturing carbon emissions.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Owner & Action Form Card */}
        <div className="space-y-6">
          
          {/* Owner details card */}
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 shadow-lg">
            <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-4">Listed By</h3>
            
            <Link 
              to={`/profile/${resource.owner.id}`}
              className="flex items-center space-x-3 mb-6 p-2 -m-2 rounded-2xl hover:bg-slate-800/40 transition-colors group"
              title={`View ${resource.owner.name}'s profile`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md text-lg group-hover:scale-105 transition-transform">
                {resource.owner.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">
                  {resource.owner.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                  <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Verified Student</span>
                  </div>
                  {resource.owner.reputation_score !== undefined ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowOwnerTrustModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
                      title="Click to view owner's transparent reputation breakdown"
                    >
                      <Award className="h-3 w-3 text-indigo-400" />
                      <span>Reputation: {Number(resource.owner.reputation_score).toFixed(0)}%</span>
                    </button>
                  ) : resource.owner.trust_score !== undefined ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      Trust: {Number(resource.owner.trust_score).toFixed(1)}%
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>

            <div className="border-t border-[#242f4c] pt-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Exchange Terms</span>
              <span className="text-2xl font-extrabold text-indigo-400">
                {resource.exchange_type === 'SELL' ? `₹${resource.price}` : 'Free'}
              </span>
            </div>

            {/* Check Owner Actions vs Peer Actions */}
            <div className="border-t border-[#242f4c] pt-6 mt-6">
              {isOwner ? (
                <div className="space-y-3">
                  <Link
                    to={`/resources/${resource.id}/edit`}
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:scale-[1.02]"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit Listing</span>
                  </Link>
                  <button
                    onClick={handleArchive}
                    className="w-full flex items-center justify-center space-x-2 bg-rose-600/10 border border-rose-500/30 hover:bg-rose-600/20 text-rose-300 font-semibold py-3 rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Archive Resource</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resource.status === 'AVAILABLE' ? (
                    <button
                      onClick={() => setShowRequestModal(true)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:scale-[1.01] text-sm uppercase tracking-wide cursor-pointer"
                    >
                      Request Exchange
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-[#1b233a] border border-[#2d3a5f] text-slate-500 font-bold py-3.5 rounded-xl cursor-not-allowed text-sm uppercase tracking-wide"
                    >
                      Exchange Unavailable ({resource.status})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStartChat}
                    disabled={initiatingChat}
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 font-semibold py-3 rounded-xl border border-indigo-500/30 transition-all shadow-sm disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{initiatingChat ? 'Opening Chat...' : `Chat with ${resource.owner.name.split(' ')[0]}`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    disabled={togglingWishlist}
                    className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl border transition-all shadow-sm font-semibold text-sm cursor-pointer ${
                      inWishlist
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                        : 'bg-slate-800/80 border-[#242f4c] text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{inWishlist ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Similar Resources Section (M20) */}
        <RecommendationsSection
          title="✨ Similar Resources on Campus"
          subtitle={`Other available items related to ${resource.title}`}
          type="similar"
          resourceId={resource.id}
          limit={3}
          className="mt-12"
        />

      </div>

      {/* Exchange Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d111c]/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#161d30] border border-[#242f4c] rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl space-y-6">
            
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Request Exchange</h2>
              <p className="text-xs text-slate-400">Confirm terms to request this item from {resource.owner.name}.</p>
            </div>

            {requestSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-200">Request Sent Successfully!</h3>
                <p className="text-xs text-slate-400">Redirecting to your requests dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleExchangeRequestSubmit} className="space-y-5">
                {requestError && (
                  <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-2.5 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{requestError}</span>
                  </div>
                )}

                {/* Sell adaptation */}
                {resource.exchange_type === 'SELL' && (
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Agreed Price Terms</span>
                    <span className="text-xl font-extrabold text-rose-300">₹{resource.price}</span>
                    <p className="text-[10px] text-slate-400 mt-1">This price is locked in for this exchange request.</p>
                  </div>
                )}

                {/* Borrow adaptation */}
                {resource.exchange_type === 'BORROW' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-300">Borrow Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 14"
                      value={borrowDurationDays}
                      onChange={(e) => setBorrowDurationDays(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none text-sm"
                    />
                  </div>
                )}

                {/* Donate adaptation */}
                {resource.exchange_type === 'DONATE' && (
                  <p className="text-sm text-slate-300">
                    This resource is listed as a donation (Free Gift). Press submit to request pick up coordinates.
                  </p>
                )}

                {/* Swap adaptation */}
                {resource.exchange_type === 'SWAP' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-300">Select Your Offered Resource</label>
                    {myAvailableResources.length > 0 ? (
                      <select
                        value={offeredResourceId}
                        onChange={(e) => setOfferedResourceId(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none text-sm cursor-pointer"
                      >
                        <option value="">-- Select an item to offer --</option>
                        {myAvailableResources.map(r => (
                          <option key={r.id} value={r.id}>{r.title} ({r.item_condition})</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl leading-relaxed">
                          You do not have any AVAILABLE listings to offer for swap. You must list an item first.
                        </div>
                        <Link
                          to="/resources/create"
                          className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl border border-slate-700 transition-colors"
                        >
                          <PlusCircle className="h-4 w-4" />
                          <span>Create a Listing</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={requestSubmitting || (resource.exchange_type === 'SWAP' && myAvailableResources.length === 0)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/15 disabled:opacity-50 cursor-pointer"
                >
                  {requestSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Owner Trust Breakdown Modal */}
      {showOwnerTrustModal && resource?.owner && (
        <TrustBreakdownModal
          userId={resource.owner.id}
          userName={resource.owner.name}
          onClose={() => setShowOwnerTrustModal(false)}
        />
      )}

    </div>
  );
}
