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
        className="animate-glass-blob-a absolute -top-28 -left-24 w-[48rem] h-[48rem] sm:w-[60rem] sm:h-[60rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(242, 142, 180, 0.68) 0%, rgba(252, 194, 156, 0.4) 48%, rgba(242, 142, 180, 0) 75%)',
        }}
      />

      {/* Large Sky Blue ambient depth blob */}
      <div
        className="animate-glass-blob-b absolute -top-20 -right-28 w-[46rem] h-[46rem] sm:w-[58rem] sm:h-[58rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(120, 196, 248, 0.68) 0%, rgba(196, 166, 248, 0.38) 50%, rgba(120, 196, 248, 0) 76%)',
        }}
      />

      {/* Warm Peach & Lavender mid-viewport glow for template sections */}
      <div
        className="animate-pulse-glow absolute top-[32%] left-[14%] w-[36rem] h-[36rem] sm:w-[48rem] sm:h-[48rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(252, 188, 148, 0.56) 0%, rgba(244, 160, 192, 0.3) 50%, rgba(252, 188, 148, 0) 76%)',
        }}
      />

      {/* Soft Lavender / Sky mid-right glow */}
      <div
        className="animate-glass-blob-c absolute top-[38%] right-[8%] w-[34rem] h-[34rem] sm:w-[46rem] sm:h-[46rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(192, 160, 248, 0.58) 0%, rgba(126, 198, 248, 0.3) 50%, rgba(192, 160, 248, 0) 76%)',
        }}
      />

      {/* Soft Lavender / Peach lower depth blob */}
      <div
        className="animate-glass-blob-c absolute -bottom-36 left-1/3 w-[48rem] h-[48rem] sm:w-[60rem] sm:h-[60rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(196, 166, 248, 0.6) 0%, rgba(252, 190, 152, 0.38) 48%, rgba(196, 166, 248, 0) 75%)',
        }}
      />
    </div>
  );
};
