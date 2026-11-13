import React from 'react';

export type GlassSurfaceVariant =
  | 'default'
  | 'elevated'
  | 'subtle'
  | 'tinted-pink'
  | 'tinted-sky'
  | 'neutral';

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav';
  variant?: GlassSurfaceVariant;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  interactive?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<GlassSurfaceVariant, string> = {
  default: 'glass-surface',
  elevated: 'glass-surface-elevated',
  subtle: 'glass-surface-subtle',
  'tinted-pink': 'glass-surface-tinted-pink',
  'tinted-sky': 'glass-surface-tinted-sky',
  neutral: 'glass-surface-neutral',
};

const ROUNDED_CLASSES: Record<NonNullable<GlassSurfaceProps['rounded']>, string> = {
  sm: 'rounded-[var(--lg-radius-sm)]',
  md: 'rounded-[var(--lg-radius)]',
  lg: 'rounded-[var(--lg-radius-lg)]',
  xl: 'rounded-[var(--lg-radius-xl)]',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

/**
 * Custom CSS Liquid Glass surface for large cards, forms, modals, and sections.
 * Intentionally avoids <lg-panel> so large blocks never trigger WebKit's
 * SVG displacement filter tiling limit.
 */
export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  as: Component = 'div',
  variant = 'default',
  rounded = 'xl',
  interactive = false,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    VARIANT_CLASSES[variant],
    ROUNDED_CLASSES[rounded],
    interactive ? 'glass-card-hover' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
};
