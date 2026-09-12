import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart, Star, MapPin, Image as ImageIcon, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RecommendationCard({ 
  item, 
  inWishlist = false, 
  onToggleWishlist = null 
}) {
  if (!item) return null;

  const metadata = item.recommendation_metadata || {};
  const score = metadata.match_score || metadata.similarity_score || 0;
  const primaryReason = metadata.primary_reason || metadata.reasons?.[0] || 'Recommended for you';

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'SELL': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'BORROW': return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'DONATE': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SWAP': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="group relative bg-[#131929] hover:bg-[#182136] border border-indigo-500/20 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-[420px] shadow-lg hover:shadow-2xl hover:shadow-indigo-950/40">
      
      {/* Top Media Header */}
      <div className="h-44 bg-[#0d111c] relative overflow-hidden flex items-center justify-center border-b border-[#242f4c]">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/30 via-[#101626] to-purple-950/30">
            <ImageIcon className="h-9 w-9 text-slate-700 mb-1" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource</span>
          </div>
        )}

        {/* Wishlist Toggle Button */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => onToggleWishlist(item.id, e)}
            className={`absolute top-3 left-3 p-1.5 rounded-full backdrop-blur-md transition-all shadow-md z-10 cursor-pointer ${
              inWishlist
                ? 'bg-rose-950/80 text-rose-400 hover:bg-rose-900 ring-1 ring-rose-500/50'
                : 'bg-black/50 text-slate-300 hover:text-rose-400 hover:bg-black/70'
            }`}
            title={inWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'}
          >
            <Heart className={`h-4 w-4 transition-transform active:scale-125 ${
              inWishlist ? 'fill-rose-500 text-rose-500' : ''
            }`} />
          </button>
        )}

        {/* Match Score Badge */}
        <div className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white text-[10px] font-extrabold shadow-md backdrop-blur-md border border-indigo-400/30">
          <Sparkles className="h-3 w-3 text-amber-300" />
          <span>{score}% Match</span>
        </div>

        {/* Explainability Pill */}
        <div className="absolute bottom-2 inset-x-2 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-indigo-500/30 text-[10px] text-indigo-200 font-medium truncate flex items-center space-x-1 shadow-sm">
          <Sparkles className="h-2.5 w-2.5 text-indigo-400 flex-shrink-0" />
          <span className="truncate">{primaryReason}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-grow flex flex-col justify-between space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border ${getBadgeStyle(item.exchange_type)}`}>
              {item.exchange_type}
            </span>
            <span className="text-sm font-bold text-slate-100">
              {item.exchange_type === 'SELL' ? `₹${item.price}` : 'Free'}
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
            {item.title}
          </h4>

          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Owner & Action Footer */}
        <div className="pt-2 border-t border-[#242f4c]/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400 truncate">
            <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
              {item.owner_name?.charAt(0) || 'U'}
            </div>
            <span className="truncate text-[11px] text-slate-300 font-medium">{item.owner_name}</span>
            {item.owner_trust_score && (
              <span className="flex items-center text-[10px] text-amber-400 font-semibold ml-1">
                <Star className="h-2.5 w-2.5 fill-amber-400 mr-0.5" />
                {Math.round(item.owner_trust_score / 20 * 10) / 10}
              </span>
            )}
          </div>

          <Link
            to={`/resources/${item.id}`}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 group-hover:translate-x-0.5 transition-all"
          >
            <span>View</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
