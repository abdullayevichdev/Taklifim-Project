import React from 'react';
import { GlassBackground } from './glass/GlassBackground';

/**
 * Compatibility wrapper preserving existing imports while completely replacing
 * external stock photo URLs with Taklifim's pure-CSS Liquid Glass gradient mesh.
 */
export const BackgroundCarousel: React.FC = () => {
  return <GlassBackground />;
};
