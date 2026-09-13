import React from 'react';

/**
 * Editorial GradientText component for headings and highlight phrases.
 */
export default function GradientText({
  children,
  className = '',
  gradient = 'accent', // 'primary' | 'accent' | 'cyan' | 'pink'
  as: Component = 'span',
  ...props
}) {
  let gradientClass = 'gradient-text-accent';
  if (gradient === 'primary') gradientClass = 'gradient-text-primary';
  if (gradient === 'cyan') gradientClass = 'gradient-text-cyan';
  if (gradient === 'pink') gradientClass = 'gradient-text-pink';

  return (
    <Component className={`${gradientClass} font-heading ${className}`} {...props}>
      {children}
    </Component>
  );
}
