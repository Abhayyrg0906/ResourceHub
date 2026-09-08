import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ShoppingBag, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Trash2, 
  ArrowRight, 
  MessageSquare, 
  RefreshCw, 
  AlertCircle,
  Tag
} from 'lucide-react';
import wishlistService from '../services/wishlistService';
import chatService from '../services/chatService';
import { useAuth } from '../context/AuthContext';

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await wishlistService.getWishlist();
      if (res && res.success) {
        setWishlistItems(res.data || []);
      } else {
        setError(res?.message || 'Failed to fetch wishlist.');
      }
    } catch (err) {
      console.error('Error loading wishlist:', err);
      setError(err.response?.data?.message || 'Could not connect to wishlist service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (resourceId, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(resourceId);
      const res = await wishlistService.removeFromWishlist(resourceId);
      if (res && res.success) {
        setWishlistItems(prev => prev.filter(item => item.id !== resourceId));
      }
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
      alert(err.response?.data?.message || 'Failed to remove item.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartChat = async (resourceId, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await chatService.getOrCreateConversation({ resourceId });
      if (res && res.success && res.conversation) {
        navigate(`/chat/${res.conversation.id}`);
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
      alert(err.response?.data?.message || 'Could not open chat.');
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'RESERVED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'EXCHANGED':
        return 'bg-slate-700/30 text-slate-400 border border-slate-700';
      default:
        return 'bg-slate-700/20 text-slate-400 border border-slate-700/40';
    }
  };

  const getBadgeStyle = (type) => {
    switch (type?.toUpperCase()) {
      case 'SELL': return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      case 'BORROW': return 'bg-blue-950/40 text-blue-300 border-blue-800/40';
      case 'DONATE': return 'bg-pink-950/40 text-pink-300 border-pink-800/40';
      case 'SWAP': return 'bg-purple-950/40 text-purple-300 border-purple-800/40';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#242f4c]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-600/15 text-rose-400 border border-rose-500/30">
            <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">My Wishlist</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1f2942] border border-[#2d3a5a] text-xs font-semibold text-slate-300">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Saved listings and smart availability alert tracking
            </p>
          </div>
        </div>

        <Link
          to="/resources"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#1f2942] hover:bg-[#242f4c] border border-[#2d3a5a] text-slate-200 text-xs font-semibold transition-colors"
        >
          <ShoppingBag className="h-4 w-4 text-indigo-400" />
          <span>Browse Marketplace</span>
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading your saved items...</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="p-5 rounded-full bg-[#161d30] border border-[#242f4c] text-rose-400/60 mb-4 shadow-inner">
            <Heart className="h-12 w-12" />
          </div>
          <h2 className="text-lg font-bold text-white">Your wishlist is empty</h2>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
            Bookmark resources in the Marketplace to keep track of their status and receive notifications when they become available.
          </p>
          <Link
            to="/resources"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg transition-all"
          >
            Explore Resources Now
          </Link>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <div
              key={item.id}
              className="group bg-[#161d30]/70 hover:bg-[#161d30]/95 border border-[#242f4c] hover:border-slate-600/80 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:shadow-indigo-950/20"
            >
              {/* Image & Badges */}
              <div className="h-44 bg-[#0d111c]/60 overflow-hidden relative border-b border-[#242f4c] flex items-center justify-center">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/20 to-purple-950/20">
                    <ShoppingBag className="h-10 w-10 text-slate-700 mb-1" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource</span>
                  </div>
                )}

                {/* Bookmark Remove Button (Top Left) */}
                <button
                  onClick={(e) => handleRemove(item.id, e)}
                  disabled={actionLoadingId === item.id}
                  className="absolute top-3 left-3 p-1.5 rounded-full bg-black/60 hover:bg-rose-600/80 text-rose-400 hover:text-white backdrop-blur-md transition-all shadow-md"
                  title="Remove from wishlist"
                >
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                </button>

                {/* Status Badge (Top Right) */}
                <span className={`absolute top-3 right-3 text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded shadow-sm ${getStatusBadgeStyle(item.status)}`}>
                  {item.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-grow space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded border ${getBadgeStyle(item.exchange_type)}`}>
                    {item.exchange_type}
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    {item.exchange_type === 'SELL' ? `₹${item.price}` : 'Free'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#242f4c]/60 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1 truncate max-w-[150px]">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{item.meetup_location}</span>
                  </div>

                  {item.owner_trust_score !== undefined && (
                    <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold">
                      <ShieldCheck className="h-3 w-3" />
                      <span>{Number(item.owner_trust_score).toFixed(0)} Trust</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="p-4 bg-[#111624] border-t border-[#242f4c] flex items-center space-x-2">
                <Link
                  to={`/resources/${item.id}`}
                  className="flex-1 py-2 text-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-sm"
                >
                  View Details
                </Link>

                {user && user.id !== item.owner_id && (
                  <button
                    onClick={(e) => handleStartChat(item.id, e)}
                    className="p-2 rounded-xl bg-[#1f2942] hover:bg-[#242f4c] text-indigo-400 hover:text-white border border-[#2d3a5a] transition-colors"
                    title="Chat with Owner"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={(e) => handleRemove(item.id, e)}
                  disabled={actionLoadingId === item.id}
                  className="p-2 rounded-xl bg-[#1f2942] hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-[#2d3a5a] transition-colors"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
