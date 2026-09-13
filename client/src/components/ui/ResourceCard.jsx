import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  MapPin, 
  ShieldCheck, 
  BookOpen, 
  Image as ImageIcon,
  RotateCw,
  Tag,
  Clock
} from 'lucide-react';

/**
 * Premium 3D-tilt marketplace ResourceCard component.
 */
export default function ResourceCard({
  resource,
  inWishlist = false,
  onToggleWishlist,
  showOwner = true,
  className = ''
}) {
  if (!resource) return null;

  const {
    id,
    title,
    category_name,
    category,
    exchange_type,
    price,
    item_condition,
    meetup_location,
    image_url,
    primary_image_url,
    status,
    owner_name,
    owner_trust_score,
    created_at
  } = resource;

  const displayImage = primary_image_url || image_url;
  const displayCategory = category_name || (typeof category === 'object' ? category?.name : category) || 'General';
  const trustScore = owner_trust_score !== undefined ? Math.round(Number(owner_trust_score)) : 100;

  // Exchange Type Colors
  const typeConfig = {
    SELL: { label: 'SELL', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    BORROW: { label: 'BORROW', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    DONATE: { label: 'DONATE', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    SWAP: { label: 'SWAP', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' }
  };
  const currentType = typeConfig[exchange_type] || typeConfig.SELL;

  // Status Badge
  const isAvailable = status === 'AVAILABLE';

  return (
    <div className={`group relative rounded-3xl bg-[#111528]/70 backdrop-blur-xl border border-white/10 hover:border-indigo-500/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(124,58,237,0.3)] flex flex-col overflow-hidden ${className}`}>
      
      {/* Top Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0d101d]">
        {displayImage ? (
          <img
            src={displayImage.startsWith('http') || displayImage.startsWith('/') ? displayImage : `/${displayImage}`}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#12172a] to-[#0a0d18] text-slate-500">
            <ImageIcon className="h-10 w-10 mb-2 opacity-50 text-indigo-400" />
            <span className="text-xs font-medium">No Image Provided</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111528] via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges Bar */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          {/* Exchange Type Badge */}
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md ${currentType.bg} ${currentType.text} border ${currentType.border} shadow-sm`}>
            {currentType.label}
          </span>

          {/* Wishlist Heart Button */}
          {onToggleWishlist && (
            <button
              type="button"
              onClick={(e) => onToggleWishlist(id, e)}
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 cursor-pointer ${
                inWishlist
                  ? 'bg-pink-600/30 text-pink-400 border border-pink-500/50 shadow-[0_0_12px_rgba(217,70,239,0.4)] scale-110'
                  : 'bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 border border-white/10'
              }`}
              title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart className={`h-4 w-4 ${inWishlist ? 'fill-pink-500 text-pink-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Status indicator if not available */}
        {!isAvailable && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              {status}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Category & Condition */}
          <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-400 mb-1.5">
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-indigo-300">
              {displayCategory}
            </span>
            {item_condition && (
              <span>• {item_condition.replace('_', ' ')}</span>
            )}
          </div>

          {/* Title */}
          <Link to={`/resources/${id}`} className="block group-hover:text-indigo-300 transition-colors">
            <h3 className="text-base font-bold text-white line-clamp-2 leading-snug font-heading">
              {title}
            </h3>
          </Link>
        </div>

        {/* Meetup Location */}
        {meetup_location && (
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{meetup_location}</span>
          </div>
        )}

        {/* Bottom Footer: Price + Owner Trust */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div>
            {exchange_type === 'SELL' && price ? (
              <span className="text-lg font-extrabold text-emerald-400 font-heading">
                ${parseFloat(price).toFixed(2)}
              </span>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">
                {exchange_type === 'DONATE' ? 'Free Gift' : exchange_type}
              </span>
            )}
          </div>

          {/* Owner Trust Pill */}
          {showOwner && (
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-300 font-semibold text-[11px]">{trustScore}% Trust</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
