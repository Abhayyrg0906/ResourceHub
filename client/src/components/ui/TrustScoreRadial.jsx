import React from 'react';
import { ShieldCheck, Star, Award, Sparkles } from 'lucide-react';

/**
 * Premium circular SVG progress meter displaying verified trust score (0-100%), rating, and badge.
 */
export default function TrustScoreRadial({
  score = 100,
  size = 140,
  strokeWidth = 10,
  showBadge = true,
  showLabel = true,
  rating = 5.0,
  reviewsCount = 0,
  onClick,
  className = ''
}) {
  const numericScore = Math.min(100, Math.max(0, parseFloat(score) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (numericScore / 100) * circumference;

  let scoreColor = '#10B981'; // Emerald >= 90
  let scoreGlow = 'rgba(16, 185, 129, 0.4)';
  let tierLabel = 'Elite Trader';

  if (numericScore < 60) {
    scoreColor = '#EF4444';
    scoreGlow = 'rgba(239, 68, 68, 0.4)';
    tierLabel = 'Needs Attention';
  } else if (numericScore < 80) {
    scoreColor = '#F59E0B';
    scoreGlow = 'rgba(245, 158, 11, 0.4)';
    tierLabel = 'Active Student';
  } else if (numericScore < 95) {
    scoreColor = '#3B82F6';
    scoreGlow = 'rgba(59, 130, 246, 0.4)';
    tierLabel = 'Trusted Peer';
  }

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Ambient Glow */}
        <div
          className="absolute inset-0 rounded-full blur-xl transition-all duration-500 opacity-40 group-hover:opacity-75"
          style={{ background: scoreGlow }}
        />

        {/* SVG Progress Meter */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 relative z-10"
        >
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${scoreGlow})`
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight group-hover:scale-105 transition-transform">
            {numericScore}%
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Trust Score
          </span>
        </div>
      </div>

      {/* Optional Rating and Tier Badge */}
      {showBadge && (
        <div className="mt-3 flex flex-col items-center space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#111528] border border-white/10 text-slate-200 shadow-md">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: scoreColor }} />
            <span>{tierLabel}</span>
          </div>

          {reviewsCount > 0 && (
            <div className="flex items-center space-x-1 text-xs text-slate-400 pt-0.5">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="font-semibold text-slate-200">{rating.toFixed(1)}</span>
              <span>({reviewsCount} reviews)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
