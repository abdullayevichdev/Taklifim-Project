import React from 'react';
import { GlassSurface } from './GlassSurface';

export interface GlassSkeletonProps {
  className?: string;
}

export const GlassSkeleton: React.FC<GlassSkeletonProps> = ({ className = 'h-4 w-full rounded-lg' }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse bg-white/55 border border-white/80 ${className}`}
  />
);

export const GlassStatSkeletonGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
    {Array.from({ length: count }).map((_, idx) => (
      <GlassSurface key={idx} variant="default" rounded="3xl" className="p-5 space-y-2.5">
        <GlassSkeleton className="h-3 w-20 rounded-md" />
        <GlassSkeleton className="h-8 w-24 rounded-xl" />
        <GlassSkeleton className="h-3 w-28 rounded-md" />
      </GlassSurface>
    ))}
  </div>
);

export const GlassCardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="glass-card-lite rounded-3xl overflow-hidden flex flex-col justify-between"
      >
        <GlassSkeleton className="h-44 w-full rounded-none" />
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <GlassSkeleton className="h-14 rounded-xl" />
            <GlassSkeleton className="h-14 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <GlassSkeleton className="h-10 flex-1 rounded-xl" />
            <GlassSkeleton className="h-10 w-10 rounded-xl" />
            <GlassSkeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const GlassTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <GlassSurface variant="elevated" rounded="3xl" className="overflow-hidden p-4 space-y-3">
    <GlassSkeleton className="h-9 w-full rounded-xl" />
    {Array.from({ length: rows }).map((_, idx) => (
      <GlassSkeleton key={idx} className="h-12 w-full rounded-xl" />
    ))}
  </GlassSurface>
);
