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
  Star,
  Sparkles,
  Send,
  RotateCw
} from 'lucide-react';
import { getResourceById, archiveResource, getResources } from '../services/resourceService';
import { createRequest } from '../services/exchangeService';
import chatService from '../services/chatService';
import wishlistService from '../services/wishlistService';
import { useAuth } from '../context/AuthContext';
import TrustBreakdownModal from '../components/TrustBreakdownModal';
import RecommendationsSection from '../components/RecommendationsSection';
import MeetupLocationCard from '../components/MeetupLocationCard';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import GradientText from '../components/ui/GradientText';

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
          setError('Failed to load resource details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Fetch current user's available listings if exchange type is SWAP
  useEffect(() => {
    const fetchMyResources = async () => {
      if (user && resource && resource.exchange_type === 'SWAP') {
        try {
          const res = await getResources({ owner_id: user.id, status: 'AVAILABLE' });
          if (res.success) {
            // Filter out the currently viewed resource
            setMyAvailableResources(res.data.filter(r => r.id !== resource.id));
          }
        } catch (err) {
          console.error('Error loading user resources for swap:', err);
        }
      }
    };

    fetchMyResources();
  }, [user, resource]);

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this resource?')) return;
    try {
      await archiveResource(id);
      navigate('/my-listings');
    } catch (err) {
      console.error('Error archiving resource:', err);
      alert(err.response?.data?.message || 'Failed to archive resource.');
    }
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSubmitting(true);

    try {
      const payload = {
        resource_id: parseInt(id, 10),
        request_type: resource.exchange_type
      };

      if (resource.exchange_type === 'BORROW') {
        if (!borrowDurationDays || parseInt(borrowDurationDays, 10) <= 0) {
          setRequestError('Please specify a valid number of borrow days.');
          setRequestSubmitting(false);
          return;
        }
        payload.duration_days = parseInt(borrowDurationDays, 10);
      }

      if (resource.exchange_type === 'SWAP') {
        if (!offeredResourceId) {
          setRequestError('Please select a resource you want to offer in swap.');
          setRequestSubmitting(false);
          return;
        }
        payload.offered_resource_id = parseInt(offeredResourceId, 10);
      }

      const res = await createRequest(payload);
      if (res.success) {
        setRequestSuccess(true);
        setTimeout(() => {
          setShowRequestModal(false);
          setRequestSuccess(false);
          navigate('/exchange-requests');
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting exchange request:', err);
      setRequestError(err.response?.data?.message || 'Failed to submit exchange request.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const typeConfig = {
    SELL: { label: 'SELL', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    BORROW: { label: 'BORROW', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    DONATE: { label: 'DONATE', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    SWAP: { label: 'SWAP', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse">Loading listing details...</p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto" />
        <p className="text-rose-400 font-semibold text-lg">{error || 'Resource not found.'}</p>
        <Link to="/resources">
          <AnimatedButton variant="primary" size="md">
            Back to Marketplace
          </AnimatedButton>
        </Link>
      </div>
    );
  }

  const isOwner = user && resource.owner && resource.owner.id === user.id;
  const imagesList = resource.images && resource.images.length > 0 ? resource.images : [];
  const currentImage = imagesList[activeImageIndex] || imagesList[0];
  const currentType = typeConfig[resource.exchange_type] || typeConfig.SELL;

  const handlePrevImage = () => {
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-8 pb-16 relative">
      
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link to="/resources" className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Marketplace</span>
        </Link>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleWishlist}
            disabled={togglingWishlist}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              inWishlist
                ? 'bg-pink-500/20 text-pink-400 border-pink-500/40 shadow-sm shadow-pink-500/30'
                : 'bg-[#111528] text-slate-300 hover:text-white border-white/10'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-pink-500 text-pink-500' : ''}`} />
            <span>{inWishlist ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Gallery & Details */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Glass Image Gallery */}
          <GlassCard variant="default" className="p-3 sm:p-4 space-y-3 border-white/10">
            {/* Main Stage */}
            <div className="relative rounded-2xl overflow-hidden h-[380px] sm:h-[460px] flex items-center justify-center bg-[#080A12] border border-white/5 group">
              {currentImage ? (
                <img 
                  src={currentImage.image_url.startsWith('http') || currentImage.image_url.startsWith('/') ? currentImage.image_url : `/${currentImage.image_url}`} 
                  alt={`${resource.title} - Image ${activeImageIndex + 1}`} 
                  className="w-full h-full object-contain sm:object-cover transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 w-full h-full">
                  <ImageIcon className="h-16 w-16 text-indigo-400/40 mb-2" />
                  <span className="text-xs uppercase font-bold tracking-widest text-slate-500">No Image Available</span>
                </div>
              )}

              {/* Top Type Badge */}
              <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md ${currentType.bg} ${currentType.text} border ${currentType.border}`}>
                  {currentType.label}
                </span>
                {currentImage && currentImage.is_primary && (
                  <div className="bg-amber-500/90 backdrop-blur-md text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg">
                    <Star className="h-3 w-3 fill-current" />
                    <span>COVER</span>
                  </div>
                )}
              </div>

              {/* Counter */}
              {imagesList.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/10 shadow">
                  {activeImageIndex + 1} / {imagesList.length}
                </div>
              )}

              {/* Left/Right Arrows */}
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Previous Image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Next Image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {imagesList.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-1 px-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                      idx === activeImageIndex
                        ? 'border-indigo-400 ring-2 ring-indigo-500/40 scale-105 shadow-md'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.image_url.startsWith('http') || img.image_url.startsWith('/') ? img.image_url : `/${img.image_url}`}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Detailed Info Glass Panel */}
          <GlassCard variant="default" className="p-6 sm:p-8 space-y-6 border-white/10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30">
                  {resource.category}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 font-medium">
                  Condition: {resource.item_condition?.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-500 ml-auto">
                  Listed on {new Date(resource.created_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-heading tracking-tight">
                {resource.title}
              </h1>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-3">
              <h3 className="text-base font-bold text-white font-heading">Listing Description</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {resource.description}
              </p>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-4">
              {/* Meetup location card */}
              <MeetupLocationCard
                meetupLocation={resource.meetup_location}
                resourceTitle={resource.title}
              />
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Owner & Exchange Action Card */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Owner Details Card */}
          <GlassCard variant="elevated" className="border-indigo-500/30 p-6 space-y-5">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              Listing Owner
            </h3>

            <Link
              to={`/profile/${resource.owner.id}`}
              className="flex items-center space-x-3 p-2 -m-2 rounded-2xl hover:bg-white/5 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-lg group-hover:scale-105 transition-transform">
                {resource.owner.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                  {resource.owner.name}
                </h4>
                <div className="flex items-center space-x-1 text-emerald-400 font-semibold text-xs mt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Student</span>
                </div>
              </div>
            </Link>

            {/* Owner Trust & Rep */}
            <div className="p-3.5 rounded-2xl bg-[#080A12] border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Peer Trust Score</p>
                <p className="text-lg font-extrabold text-emerald-400 font-heading">
                  {resource.owner.trust_score !== undefined ? `${Math.round(resource.owner.trust_score)}%` : '100%'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOwnerTrustModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors cursor-pointer"
              >
                Inspect
              </button>
            </div>

            {/* Price Tag */}
            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Exchange Terms</span>
              <div className="text-3xl font-extrabold text-white font-heading">
                {resource.exchange_type === 'SELL' && resource.price ? (
                  <GradientText gradient="cyan">${parseFloat(resource.price).toFixed(2)}</GradientText>
                ) : (
                  <span className="text-emerald-400 uppercase text-2xl">{resource.exchange_type === 'DONATE' ? 'Free Gift' : resource.exchange_type}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {isOwner ? (
                <>
                  <Link to={`/resources/${resource.id}/edit`} className="block">
                    <AnimatedButton variant="primary" size="md" icon={Edit2} className="w-full">
                      Edit Listing
                    </AnimatedButton>
                  </Link>
                  <AnimatedButton
                    variant="danger"
                    size="md"
                    icon={Trash2}
                    onClick={handleArchive}
                    className="w-full"
                  >
                    Archive Resource
                  </AnimatedButton>
                </>
              ) : (
                <>
                  {resource.status === 'AVAILABLE' ? (
                    <AnimatedButton
                      variant="primary"
                      size="lg"
                      icon={Send}
                      onClick={() => setShowRequestModal(true)}
                      className="w-full shadow-[0_0_25px_rgba(124,58,237,0.35)]"
                    >
                      Request Exchange
                    </AnimatedButton>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-xl bg-[#111528] border border-white/10 text-slate-500 font-bold text-sm uppercase cursor-not-allowed"
                    >
                      Listing {resource.status}
                    </button>
                  )}

                  <AnimatedButton
                    variant="secondary"
                    size="md"
                    icon={MessageSquare}
                    onClick={handleStartChat}
                    loading={initiatingChat}
                    className="w-full"
                  >
                    Chat with Owner
                  </AnimatedButton>
                </>
              )}
            </div>
          </GlassCard>

        </div>

      </div>

      {/* Similar Resources Section */}
      <div className="pt-8">
        <RecommendationsSection />
      </div>

      {/* Owner Trust Modal */}
      {showOwnerTrustModal && (
        <TrustBreakdownModal
          userId={resource.owner.id}
          isOpen={showOwnerTrustModal}
          onClose={() => setShowOwnerTrustModal(false)}
        />
      )}

      {/* Exchange Request Submission Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <GlassCard variant="elevated" className="max-w-lg w-full p-6 sm:p-8 border-indigo-500/40 relative animate-scale-up">
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-2xl font-bold text-white font-heading mb-1">
              Request {resource.exchange_type}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Propose an exchange transaction for <span className="text-indigo-300 font-semibold">{resource.title}</span>.
            </p>

            {requestSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-white">Request Sent Successfully!</h4>
                <p className="text-xs text-slate-400">The owner will be notified to review your request.</p>
              </div>
            ) : (
              <form onSubmit={handleExchangeSubmit} className="space-y-4">
                {requestError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                    {requestError}
                  </div>
                )}

                {resource.exchange_type === 'BORROW' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Borrow Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={borrowDurationDays}
                      onChange={(e) => setBorrowDurationDays(e.target.value)}
                      placeholder="e.g. 14"
                      required
                      className="w-full px-4 py-2.5 bg-[#080A12] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {resource.exchange_type === 'SWAP' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Select Your Offered Item in Exchange
                    </label>
                    {myAvailableResources.length === 0 ? (
                      <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        You don't have any active available listings to offer in swap. Please list an item first.
                      </p>
                    ) : (
                      <select
                        value={offeredResourceId}
                        onChange={(e) => setOfferedResourceId(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-[#080A12] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Choose Listing to Offer --</option>
                        {myAvailableResources.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title} ({item.category})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <AnimatedButton
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setShowRequestModal(false)}
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={requestSubmitting}
                  >
                    Send Exchange Proposal
                  </AnimatedButton>
                </div>
              </form>
            )}
          </GlassCard>
        </div>
      )}

    </div>
  );
}
