import React from 'react';
import GradientText from './GradientText';

/**
 * Editorial section header with optional pill badge, title, and descriptive subtitle.
 */
export default function SectionHeading({
  badge,
  badgeIcon: BadgeIcon,
  title,
  highlight,
  subtitle,
  align = 'center', // 'center' | 'left'
  className = '',
  gradient = 'accent'
}) {
  const isCenter = align === 'center';

  return (
    <div className={`mb-12 ${isCenter ? 'text-center max-w-3xl mx-auto' : 'max-w-2xl'} ${className}`}>
      {badge && (
        <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 mb-4 shadow-[0_0_15px_rgba(124,58,237,0.15)]`}>
          {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5 text-indigo-400" />}
          <span>{badge}</span>
        </div>
      )}
      
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight font-heading">
        {title}{' '}
        {highlight && (
          <GradientText gradient={gradient}>
            {highlight}
          </GradientText>
        )}
      </h2>

      {subtitle && (
        <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
