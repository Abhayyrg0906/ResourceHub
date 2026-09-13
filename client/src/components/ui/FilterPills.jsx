import React from 'react';

/**
 * Modern pill-style selector for categories, exchange types, conditions, and sorting.
 */
export default function FilterPills({
  options = [],
  selected,
  onSelect,
  className = '',
  size = 'md' // 'sm' | 'md'
}) {
  const sizeClasses = size === 'sm' 
    ? 'px-3 py-1.5 text-xs font-medium' 
    : 'px-4 py-2 text-sm font-semibold';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((option) => {
        const value = typeof option === 'object' ? option.value : option;
        const label = typeof option === 'object' ? option.label : option;
        const icon = typeof option === 'object' ? option.icon : null;
        const count = typeof option === 'object' ? option.count : null;
        const isSelected = selected === value;

        return (
          <button
            key={String(value)}
            type="button"
            onClick={() => onSelect(value)}
            className={`inline-flex items-center space-x-1.5 rounded-xl transition-all duration-300 cursor-pointer ${sizeClasses} ${
              isSelected
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30 scale-105'
                : 'bg-[#111528]/80 hover:bg-[#181e38] text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
            }`}
          >
            {icon && <span className="opacity-90">{icon}</span>}
            <span>{label}</span>
            {count !== null && count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
