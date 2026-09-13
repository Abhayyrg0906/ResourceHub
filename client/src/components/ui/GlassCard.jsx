import React from 'react';

/**
 * Premium GlassCard component supporting customizable glow, elevation, and interactive hover states.
 */
export default function GlassCard({
  children,
  className = '',
  variant = 'default', // 'default' | 'elevated' | 'interactive' | 'neon'
  glow = 'none', // 'none' | 'purple' | 'blue' | 'cyan' | 'pink'
  onClick,
  ...props
}) {
  let baseClass = 'glass-panel rounded-2xl p-6 relative overflow-hidden ';

  if (variant === 'elevated') {
    baseClass = 'glass-panel-elevated rounded-3xl p-6 relative overflow-hidden ';
  } else if (variant === 'interactive') {
    baseClass = 'glass-card-interactive rounded-2xl p-6 relative overflow-hidden cursor-pointer ';
  } else if (variant === 'neon') {
    baseClass = 'bg-[#111528]/80 backdrop-blur-xl border border-indigo-500/30 shadow-[0_0_30px_rgba(124,58,237,0.15)] rounded-3xl p-6 relative overflow-hidden ';
  }

  let glowClass = '';
  if (glow === 'purple') glowClass = 'glow-purple ';
  if (glow === 'blue') glowClass = 'glow-blue ';
  if (glow === 'cyan') glowClass = 'glow-cyan ';
  if (glow === 'pink') glowClass = 'glow-pink ';

  return (
    <div
      className={`${baseClass}${glowClass}${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
