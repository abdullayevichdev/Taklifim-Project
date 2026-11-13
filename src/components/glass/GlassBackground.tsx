import React from 'react';

export interface GlassBackgroundProps {
  id?: string;
  className?: string;
}

/**
 * Taklifim Liquid Glass ambient backdrop.
 * - Zero-network CSS gradients & large organic pastel blobs (pink, peach, sky, lavender).
 * - Radial/linear-gradient sits directly on `#taklifim-backdrop` so
 *   `liquidglass.dev` (`data-lg-backdrop="#taklifim-backdrop"`) clones it
 *   cleanly across Chromium, Safari, and Firefox.
 * - Animated blobs strictly use `transform` and `opacity`.
 */
export const GlassBackground: React.FC<GlassBackgroundProps> = ({
  id = 'taklifim-backdrop',
  className = '',
}) => {
  return (
    <div
      id={id}
      aria-hidden="true"
      className={`taklifim-glass-backdrop fixed inset-0 -z-20 overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* Large Soft Rose Pink ambient depth blob */}
      <div
        className="animate-glass-blob-a absolute -top-32 -left-28 w-[48rem] h-[48rem] sm:w-[58rem] sm:h-[58rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(242, 148, 182, 0.62) 0%, rgba(252, 198, 162, 0.36) 46%, rgba(242, 148, 182, 0) 74%)',
        }}
      />

      {/* Large Sky Blue ambient depth blob */}
      <div
        className="animate-glass-blob-b absolute -top-24 -right-32 w-[46rem] h-[46rem] sm:w-[56rem] sm:h-[56rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(125, 198, 248, 0.6) 0%, rgba(196, 166, 248, 0.34) 48%, rgba(125, 198, 248, 0) 75%)',
        }}
      />

      {/* Warm Peach center-horizon glow for glass refraction */}
      <div
        className="animate-pulse-glow absolute top-1/3 left-1/4 w-[38rem] h-[38rem] sm:w-[46rem] sm:h-[46rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(252, 194, 154, 0.48) 0%, rgba(245, 201, 216, 0.24) 50%, rgba(252, 194, 154, 0) 74%)',
        }}
      />

      {/* Soft Lavender / Peach lower depth blob */}
      <div
        className="animate-glass-blob-c absolute -bottom-36 left-1/3 w-[48rem] h-[48rem] sm:w-[60rem] sm:h-[60rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(196, 166, 248, 0.56) 0%, rgba(252, 190, 152, 0.34) 48%, rgba(196, 166, 248, 0) 74%)',
        }}
      />
    </div>
  );
};
