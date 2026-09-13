import React from 'react';

/**
 * AnimatedButton with glowing accents, subtle scale effects, and loading states.
 */
export default function AnimatedButton({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'cyan' | 'pink' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  let variantClass = 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 border border-purple-400/30';
  
  if (variant === 'secondary') {
    variantClass = 'bg-[#161b30] hover:bg-[#1f2642] text-slate-100 border border-white/10 hover:border-white/20 shadow-md';
  } else if (variant === 'cyan') {
    variantClass = 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30';
  } else if (variant === 'pink') {
    variantClass = 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/25 border border-pink-400/30';
  } else if (variant === 'ghost') {
    variantClass = 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white border border-transparent';
  } else if (variant === 'danger') {
    variantClass = 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 border border-rose-400/30';
  }

  let sizeClass = 'px-5 py-2.5 text-sm font-semibold rounded-xl';
  if (size === 'sm') sizeClass = 'px-3.5 py-1.5 text-xs font-semibold rounded-lg';
  if (size === 'lg') sizeClass = 'px-7 py-3.5 text-base font-bold rounded-2xl';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="h-4 w-4" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="h-4 w-4" />}
        </>
      )}
    </button>
  );
}
