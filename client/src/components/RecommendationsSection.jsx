import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight, Layers, Flame } from 'lucide-react';
import RecommendationCard from './RecommendationCard';
import { 
  getPersonalizedRecommendations, 
  getSimilarResources, 
  getCategoryRecommendations 
} from '../services/recommendationService';
import wishlistService from '../services/wishlistService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function RecommendationsSection({
  title = "Recommended for You",
  subtitle = "Tailored suggestions based on your campus interests & wishlist",
  type = "personalized", // 'personalized' | 'similar' | 'category'
  resourceId = null,
  categoryId = null,
  limit = 6,
  className = ""
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set());

  // Load wishlist IDs
  useEffect(() => {
    if (!user) return;
    wishlistService.getWishlistIds().then(res => {
      if (res && res.success) {
        setWishlistIds(new Set(res.ids || []));
      }
    }).catch(() => {});
  }, [user]);

  // Load Recommendations
  useEffect(() => {
    let isMounted = true;
    const loadRecs = async () => {
      setLoading(true);
      try {
        let res;
        if (type === 'similar' && resourceId) {
          res = await getSimilarResources(resourceId, { limit });
        } else if (type === 'category' && categoryId) {
          res = await getCategoryRecommendations(categoryId, { limit });
        } else {
          res = await getPersonalizedRecommendations({ limit });
        }

        if (isMounted && res && res.success) {
          setRecommendations(res.data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load recommendations:', err);
          setRecommendations([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRecs();
    return () => { isMounted = false; };
  }, [type, resourceId, categoryId, limit, user]);

  const handleToggleWishlist = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user) {
      navigate('/login');
      return;
    }

    setWishlistIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      const res = await wishlistService.toggleWishlist(id);
      if (res && res.success) {
        setWishlistIds(prev => {
          const next = new Set(prev);
          if (res.inWishlist) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  if (!loading && recommendations.length === 0) {
    return null; // Gracefully hide if no recommendations
  }

  return (
    <section className={`rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#141b2d]/80 via-[#101626]/80 to-[#0c101c]/90 border border-indigo-500/20 shadow-xl relative overflow-hidden backdrop-blur-md ${className}`}>
      
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              {title}
            </h3>
            <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
              Smart Matches
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Grid of Recommendations */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 rounded-2xl bg-[#131929]/50 border border-slate-800 animate-pulse p-4 space-y-3">
              <div className="h-44 bg-slate-800/60 rounded-xl" />
              <div className="h-4 bg-slate-800/80 rounded w-2/3" />
              <div className="h-3 bg-slate-800/50 rounded w-full" />
              <div className="h-3 bg-slate-800/50 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map(item => (
            <RecommendationCard
              key={item.id}
              item={item}
              inWishlist={wishlistIds.has(item.id)}
              onToggleWishlist={handleToggleWishlist}
            />
          ))}
        </div>
      )}

    </section>
  );
}
