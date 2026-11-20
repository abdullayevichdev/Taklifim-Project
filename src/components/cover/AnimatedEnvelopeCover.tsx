import React, { useId, useMemo } from 'react';
import type { CoverEmblem, CoverLayout, CoverOrnament, CoverParticles, CoverTheme } from './coverThemes';
import { getMonogram } from './coverThemes';

/**
 * Crisp, lightweight animated envelope cover (SVG + CSS), themed per template.
 * Layout mirrors the cinematic cover video: folded envelope flaps forming an "X",
 * light running along the flap edges, a breathing wax seal and floating particles.
 * All motion is transform/opacity based and disabled under prefers-reduced-motion.
 */

interface AnimatedEnvelopeCoverProps {
  theme: CoverTheme;
  hostNames?: string;
  fadingOut?: boolean;
  className?: string;
}

// Envelope geometry in a 400×860 portrait viewBox (scaled with "slice", centre stays centred).
const W = 400;
const H = 860;
const CX = 200;
const CY = 430;

/* ------------------------------------------------------------------ */
/* Ornament primitives                                                  */
/* ------------------------------------------------------------------ */

const Leaf: React.FC<{ x: number; y: number; r: number; s?: number }> = ({ x, y, r, s = 1 }) => (
  <path
    d="M0 0 C 5 -6, 13 -6, 18 0 C 13 6, 5 6, 0 0 Z"
    transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
  />
);

const Blossom: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx="0" cy="-6" rx="4" ry="6.5" transform={`rotate(${a})`} />
    ))}
    <circle r="2.6" className="tk-cover-ornament-center" />
  </g>
);

const FloralSprig: React.FC = () => (
  <g>
    <path d="M0 78 C 16 40, -14 4, 4 -62" fill="none" strokeWidth="1.6" className="tk-cover-stroke" />
    <path d="M2 30 C 18 22, 26 10, 30 -4" fill="none" strokeWidth="1.2" className="tk-cover-stroke" />
    <path d="M-2 0 C -18 -8, -24 -20, -26 -34" fill="none" strokeWidth="1.2" className="tk-cover-stroke" />
    <Leaf x={4} y={58} r={-30} />
    <Leaf x={0} y={46} r={-150} s={0.9} />
    <Leaf x={6} y={14} r={-20} s={0.85} />
    <Leaf x={-4} y={-14} r={-160} s={0.9} />
    <Leaf x={2} y={-36} r={-40} s={0.8} />
    <Blossom x={4} y={-66} s={1.15} />
    <Blossom x={31} y={-8} s={0.8} />
    <Blossom x={-27} y={-38} s={0.75} />
    <circle cx="16" cy="34" r="2" />
    <circle cx="-12" cy="22" r="1.6" />
    <circle cx="20" cy="-30" r="1.5" />
  </g>
);

const LeafBranch: React.FC = () => (
  <g>
    <path d="M0 80 C 6 30, -6 -20, 2 -76" fill="none" strokeWidth="1.6" className="tk-cover-stroke" />
    {[-64, -44, -24, -4, 16, 36, 56].map((y, i) => (
      <React.Fragment key={y}>
        <Leaf x={1} y={y} r={-35 - i * 2} s={1.25 - i * 0.04} />
        <Leaf x={0} y={y + 9} r={-145 + i * 2} s={1.2 - i * 0.04} />
      </React.Fragment>
    ))}
    <Leaf x={2} y={-78} r={-90} s={1.1} />
  </g>
);

const DecoFan: React.FC = () => (
  <g fill="none" strokeWidth="1.3" className="tk-cover-stroke">
    {[18, 32, 46, 60].map((r) => (
      <path key={r} d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`} />
    ))}
    {[-75, -50, -25, 0, 25, 50, 75].map((a) => (
      <line key={a} x1="0" y1="0" x2="0" y2="-66" transform={`rotate(${a})`} />
    ))}
    <path d="M -66 6 L 66 6" />
    <path d="M -50 14 L 50 14" />
    <circle cx="0" cy="0" r="5" className="tk-cover-fill" stroke="none" />
    <path d="M 0 22 L 6 34 L 0 46 L -6 34 Z" className="tk-cover-fill" stroke="none" />
  </g>
);

const Sparkle: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <path
    d="M0 -10 C 1.4 -1.4, 1.4 -1.4, 10 0 C 1.4 1.4, 1.4 1.4, 0 10 C -1.4 1.4, -1.4 1.4, -10 0 C -1.4 -1.4, -1.4 -1.4, 0 -10 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
  />
);

const StarCluster: React.FC = () => (
  <g>
    <Sparkle x={0} y={0} s={1.9} />
    <Sparkle x={34} y={-30} s={1} />
    <Sparkle x={-30} y={-46} s={0.8} />
    <Sparkle x={-26} y={30} s={1.1} />
    <Sparkle x={30} y={42} s={0.7} />
    <circle cx="16" cy="-58" r="2" />
    <circle cx="-44" cy="0" r="1.8" />
    <circle cx="46" cy="6" r="1.5" />
    <circle cx="-8" cy="62" r="1.8" />
    <path d="M -50 70 Q 0 40 50 70" fill="none" strokeWidth="1" className="tk-cover-stroke" strokeDasharray="2 5" />
  </g>
);

const EightPointStar: React.FC<{ r: number; sw?: number }> = ({ r, sw = 1.3 }) => (
  <g fill="none" strokeWidth={sw} className="tk-cover-stroke">
    <rect x={-r} y={-r} width={r * 2} height={r * 2} />
    <rect x={-r} y={-r} width={r * 2} height={r * 2} transform="rotate(45)" />
    <circle r={r * 0.55} />
  </g>
);

const GeometricRosette: React.FC = () => (
  <g>
    <EightPointStar r={30} sw={1.5} />
    <EightPointStar r={16} />
    <circle r="4" />
    {[0, 90, 180, 270].map((a) => (
      <g key={a} transform={`rotate(${a}) translate(0 -58)`}>
        <EightPointStar r={9} sw={1} />
      </g>
    ))}
  </g>
);

const LaceRosette: React.FC = () => (
  <g>
    {Array.from({ length: 16 }).map((_, i) => (
      <circle key={`o${i}`} cx="0" cy="-46" r="7" fill="none" strokeWidth="1.1" className="tk-cover-stroke" transform={`rotate(${i * 22.5})`} />
    ))}
    {Array.from({ length: 12 }).map((_, i) => (
      <ellipse key={`p${i}`} cx="0" cy="-24" rx="4" ry="11" transform={`rotate(${i * 30})`} />
    ))}
    {Array.from({ length: 24 }).map((_, i) => (
      <circle key={`d${i}`} cx="0" cy="-60" r="1.4" transform={`rotate(${i * 15})`} />
    ))}
    <circle r="6" />
  </g>
);

const MinimalAccent: React.FC = () => (
  <g fill="none" strokeWidth="1.2" className="tk-cover-stroke">
    <line x1="-70" y1="0" x2="-14" y2="0" />
    <line x1="14" y1="0" x2="70" y2="0" />
    <path d="M 0 -8 L 8 0 L 0 8 L -8 0 Z" className="tk-cover-fill" stroke="none" />
    <circle cx="-78" cy="0" r="2" className="tk-cover-fill" stroke="none" />
    <circle cx="78" cy="0" r="2" className="tk-cover-fill" stroke="none" />
  </g>
);

function renderOrnament(style: CoverOrnament): React.ReactNode {
  switch (style) {
    case 'leaf':
      return <LeafBranch />;
    case 'deco':
      return <DecoFan />;
    case 'star':
      return <StarCluster />;
    case 'geometric':
      return <GeometricRosette />;
    case 'lace':
      return <LaceRosette />;
    case 'minimal':
      return <MinimalAccent />;
    case 'floral':
    default:
      return <FloralSprig />;
  }
}

// Ornament placements per flap (x, y, rotation, scale, mirrored)
const ORNAMENT_SPOTS: Array<[number, number, number, number, boolean]> = [
  [96, 118, 28, 0.95, false],
  [304, 118, -28, 0.95, true],
  [54, 352, 8, 1.05, false],
  [346, 352, -8, 1.05, true],
  [54, 640, -12, 1.1, false],
  [346, 640, 12, 1.1, true],
  [118, 778, -62, 0.9, false],
  [282, 778, 62, 0.9, true],
];

const MINIMAL_SPOTS: Array<[number, number, number, number, boolean]> = [
  [200, 92, 0, 1, false],
  [200, 792, 0, 1, false],
  [52, 430, 90, 0.8, false],
  [348, 430, 90, 0.8, false],
];

/* ------------------------------------------------------------------ */
/* Wax seal                                                             */
/* ------------------------------------------------------------------ */

function buildSealPath(): string {
  const n = 18;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 56 + Math.sin(i * 2.3) * 3.2 + Math.cos(i * 1.7) * 2.4 + (i % 2 === 0 ? 2.2 : -1.6);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // Closed Catmull-Rom → cubic Bézier for an organic wax outline
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

const SEAL_PATH = buildSealPath();

const Emblem: React.FC<{ type: CoverEmblem; color: string; monogram: string }> = ({ type, color, monogram }) => {
  const stroke = { fill: 'none', stroke: color, strokeWidth: 3.2, strokeLinecap: 'round' as const };
  switch (type) {
    case 'rings':
      return (
        <g>
          <circle cx="-8" cy="2" r="15" {...stroke} />
          <circle cx="9" cy="-2" r="15" {...stroke} />
          <path d="M 5 -21 l 4 -6 l 4 6 z" fill={color} />
        </g>
      );
    case 'heart':
      return (
        <path
          d="M0 18 C -26 2, -24 -18, -11 -20 C -4 -21, 0 -15, 0 -11 C 0 -15, 4 -21, 11 -20 C 24 -18, 26 2, 0 18 Z"
          fill={color}
        />
      );
    case 'star':
      return (
        <path
          d="M0 -24 L 6 -7 L 24 -7 L 10 4 L 15 22 L 0 11 L -15 22 L -10 4 L -24 -7 L -6 -7 Z"
          fill={color}
        />
      );
    case 'crescent':
      return (
        <g fill={color}>
          <path d="M 6 -22 A 22 22 0 1 0 6 22 A 26 26 0 0 1 6 -22 Z" />
          <path d="M 14 -6 l 2.4 5 l 5.4 .6 l -4 3.6 l 1.2 5.4 l -5 -2.8 l -5 2.8 l 1.2 -5.4 l -4 -3.6 l 5.4 -.6 z" />
        </g>
      );
    case 'leaf':
      return (
        <g>
          <path d="M -16 18 C -18 -6, 0 -22, 20 -20 C 20 2, 4 20, -16 18 Z" fill={color} />
          <path d="M -16 18 C -4 6, 6 -6, 14 -14" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.6" />
        </g>
      );
    case 'flower':
      return (
        <g fill={color}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx="0" cy="-12" rx="6.5" ry="11" transform={`rotate(${a})`} />
          ))}
          <circle r="5" fill="rgba(0,0,0,0.18)" />
        </g>
      );
    case 'butterfly':
      return (
        <g fill={color}>
          <path d="M -2 -2 C -14 -26, -32 -16, -22 -2 C -32 10, -16 22, -2 6 Z" />
          <path d="M 2 -2 C 14 -26, 32 -16, 22 -2 C 32 10, 16 22, 2 6 Z" />
          <rect x="-1.6" y="-14" width="3.2" height="26" rx="1.6" />
        </g>
      );
    case 'monogram':
    default:
      return (
        <text
          x="0"
          y="1"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          style={{
            fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
            fontWeight: 700,
            fontSize: monogram.length > 2 ? 24 : 30,
            letterSpacing: '0.02em',
          }}
        >
          {monogram}
        </text>
      );
  }
};

/* ------------------------------------------------------------------ */
/* Particles                                                            */
/* ------------------------------------------------------------------ */

// Deterministic spread: left %, top %, size px, duration s, delay s, drift px
const PARTICLE_SPOTS: Array<[number, number, number, number, number, number]> = [
  [8, 12, 14, 11, 0, 18],
  [22, 64, 10, 13, 2.4, -14],
  [36, 24, 8, 10, 4.1, 12],
  [78, 16, 12, 12, 1.2, -16],
  [90, 46, 9, 14, 3.3, 10],
  [66, 78, 13, 11.5, 0.6, -12],
  [14, 86, 11, 12.5, 5.2, 14],
  [52, 8, 9, 13.5, 6.4, -10],
  [84, 88, 10, 10.5, 2.9, 12],
  [44, 92, 8, 12, 7.1, -8],
  [4, 40, 7, 15, 1.8, 10],
  [96, 70, 8, 13, 4.8, -12],
];

const ParticleShape: React.FC<{ type: CoverParticles; color: string }> = ({ type, color }) => {
  switch (type) {
    case 'petals':
      return (
        <svg viewBox="-10 -10 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M0 -9 C 7 -6, 7 5, 0 9 C -7 5, -7 -6, 0 -9 Z" fill={color} opacity="0.9" />
          <path d="M0 -7 C 1.5 -2, 1.5 3, 0 7" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" fill="none" />
        </svg>
      );
    case 'leaves':
      return (
        <svg viewBox="-10 -10 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M -8 6 C -8 -4, 0 -9, 8 -8 C 8 2, 1 8, -8 6 Z" fill={color} opacity="0.85" />
          <path d="M -8 6 C -2 1, 3 -3, 7 -7" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" fill="none" />
        </svg>
      );
    case 'stars':
    case 'sparkles':
      return (
        <svg viewBox="-10 -10 20 20" width="100%" height="100%" aria-hidden="true">
          <path
            d="M0 -10 C 1.2 -1.2, 1.2 -1.2, 10 0 C 1.2 1.2, 1.2 1.2, 0 10 C -1.2 1.2, -1.2 1.2, -10 0 C -1.2 -1.2, -1.2 -1.2, 0 -10 Z"
            fill={color}
          />
        </svg>
      );
    case 'butterflies':
      return (
        <svg viewBox="-12 -10 24 20" width="100%" height="100%" aria-hidden="true" className="tk-cover-flap-wings">
          <path d="M -1 -1 C -7 -12, -15 -7, -11 -1 C -15 5, -7 10, -1 3 Z" fill={color} />
          <path d="M 1 -1 C 7 -12, 15 -7, 11 -1 C 15 5, 7 10, 1 3 Z" fill={color} />
        </svg>
      );
    case 'bokeh':
    default:
      return <span className="block w-full h-full rounded-full" style={{ background: color, filter: 'blur(1.5px)' }} />;
  }
};

/* ------------------------------------------------------------------ */
/* Envelope constructions                                               */
/* ------------------------------------------------------------------ */

interface FlapSpec {
  /** CSS class suffix → drives the opening animation (see index.css) */
  name: string;
  d: string;
  /** Gradient key: top | left | right | bottom | fabric | satinV | satinH */
  fill: string;
  origin: string;
  ornaments?: boolean;
  shadow?: boolean;
  /** Extra SVG drawn inside the flap (door frames, curtain folds, …) */
  extra?: (t: CoverTheme) => React.ReactNode;
}

interface LayoutSpec {
  /** Moving layers, back → front */
  flaps: FlapSpec[];
  /** Static layer drawn above the flaps (e.g. arch wall with a window cut out) */
  front?: FlapSpec;
  /** Paths for the glowing light along edges */
  glow: string[];
  /** Pocket envelope: separate inner card that slides up */
  slidingCard?: boolean;
  /** Ribbon layout uses a bow instead of the wax seal */
  bow?: boolean;
}

const DOOR_FRAME = (x: number) => (t: CoverTheme) => (
  <g fill="none" stroke={t.ornament} opacity={Math.min(0.9, t.ornamentOpacity + 0.25)}>
    <rect x={x + 18} y={22} width={164} height={816} rx={16} strokeWidth={2} />
    <rect x={x + 30} y={34} width={140} height={792} rx={10} strokeWidth={1} />
    <rect x={x + 44} y={70} width={112} height={250} rx={56} strokeWidth={1.2} />
    <rect x={x + 44} y={560} width={112} height={220} rx={10} strokeWidth={1.2} />
  </g>
);

const CURTAIN_FOLDS = (x0: number, dir: 1 | -1) => (t: CoverTheme) => (
  <g>
    {Array.from({ length: 9 }).map((_, i) => (
      <rect
        key={i}
        x={x0 + i * 18}
        y={60}
        width={9}
        height={800}
        fill={i % 2 === 0 ? '#FFFFFF' : '#000000'}
        opacity={i % 2 === 0 ? 0.1 : 0.12}
      />
    ))}
    <path
      d={dir === 1 ? `M${x0} 846 Q ${x0 + 80} 826 ${x0 + 162} 846` : `M${x0} 846 Q ${x0 + 82} 826 ${x0 + 162} 846`}
      stroke={t.ornament}
      strokeWidth={3}
      fill="none"
      opacity={0.8}
    />
  </g>
);

const ARCH_PATH = 'M56 860 V300 C56 168 116 104 200 78 C284 104 344 168 344 300 V860 Z';

const LAYOUTS: Record<CoverLayout, LayoutSpec> = {
  cross: {
    flaps: [
      { name: 'cross-bottom', d: `M0 ${H} L${W} ${H} L${CX} ${CY - 30} Z`, fill: 'bottom', origin: 'bottom center', ornaments: true },
      { name: 'cross-left', d: `M0 0 L${CX} ${CY} L0 ${H} Z`, fill: 'left', origin: 'left center', ornaments: true, shadow: true },
      { name: 'cross-right', d: `M${W} 0 L${CX} ${CY} L${W} ${H} Z`, fill: 'right', origin: 'right center', ornaments: true, shadow: true },
      { name: 'cross-top', d: `M0 0 L${W} 0 L${CX} ${CY + 40} Z`, fill: 'top', origin: 'top center', ornaments: true, shadow: true },
    ],
    glow: [`M0 0 L${CX} ${CY + 40}`, `M${W} 0 L${CX} ${CY + 40}`],
  },
  pocket: {
    slidingCard: true,
    flaps: [
      {
        name: 'pocket-front',
        d: `M0 300 L${CX} 560 L${W} 300 L${W} ${H} L0 ${H} Z`,
        fill: 'left',
        origin: 'bottom center',
        ornaments: true,
        shadow: true,
        extra: (t) => (
          <path d={`M0 ${H} L${CX} 600 L${W} ${H}`} fill="none" stroke={t.ornament} strokeWidth={1.2} opacity={0.35} />
        ),
      },
      { name: 'pocket-flap', d: `M0 0 L${W} 0 L${W} 250 Q${CX} 640 0 250 Z`, fill: 'top', origin: 'top center', ornaments: true, shadow: true },
    ],
    glow: [`M${W} 250 Q${CX} 640 0 250`, `M0 300 L${CX} 560 L${W} 300`],
  },
  gatefold: {
    flaps: [
      { name: 'door-left', d: `M0 0 H${CX} V${H} H0 Z`, fill: 'left', origin: 'left center', ornaments: true, shadow: true, extra: DOOR_FRAME(0) },
      { name: 'door-right', d: `M${CX} 0 H${W} V${H} H${CX} Z`, fill: 'right', origin: 'right center', ornaments: true, shadow: true, extra: DOOR_FRAME(CX) },
    ],
    glow: [`M${CX} 0 L${CX} ${H}`],
  },
  ribbon: {
    bow: true,
    flaps: [
      { name: 'ribbon-v-top', d: `M182 0 H218 V${CY} H182 Z`, fill: 'satinV', origin: 'top center', shadow: true },
      { name: 'ribbon-v-bottom', d: `M182 ${CY} H218 V${H} H182 Z`, fill: 'satinV', origin: 'bottom center', shadow: true },
      { name: 'ribbon-h-left', d: `M0 ${CY - 18} H${CX} V${CY + 18} H0 Z`, fill: 'satinH', origin: 'left center', shadow: true },
      { name: 'ribbon-h-right', d: `M${CX} ${CY - 18} H${W} V${CY + 18} H${CX} Z`, fill: 'satinH', origin: 'right center', shadow: true },
    ],
    glow: ['M182 0 L182 860', 'M218 0 L218 860'],
  },
  arch: {
    flaps: [
      { name: 'curtain-left', d: `M40 40 H${CX + 2} V${H} H40 Z`, fill: 'fabric', origin: 'left center', extra: CURTAIN_FOLDS(40, 1) },
      { name: 'curtain-right', d: `M${CX - 2} 40 H360 V${H} H${CX - 2} Z`, fill: 'fabric', origin: 'right center', extra: CURTAIN_FOLDS(CX, -1) },
    ],
    front: {
      name: 'arch-wall',
      d: `M0 0 H${W} V${H} H0 Z ${ARCH_PATH}`,
      fill: 'top',
      origin: 'center',
      ornaments: true,
      shadow: true,
      extra: (t) => (
        <g fill="none" stroke={t.ornament}>
          <path d={ARCH_PATH} strokeWidth={6} opacity={Math.min(0.9, t.ornamentOpacity + 0.35)} />
          <path d="M44 860 V298 C44 160 110 90 200 64 C290 90 356 160 356 298 V860" strokeWidth={1.4} opacity={0.5} />
          <circle cx={CX} cy={52} r={7} fill={t.ornament} stroke="none" opacity={0.75} />
        </g>
      ),
    },
    glow: ['M56 860 V300 C56 168 116 104 200 78 C284 104 344 168 344 300 V860'],
  },
  lotus: {
    flaps: [
      { name: 'lotus-left', d: `M0 0 C 150 110, 214 300, 176 ${CY} C 214 560, 150 750, 0 ${H} Z`, fill: 'left', origin: 'left center', ornaments: true, shadow: true },
      { name: 'lotus-right', d: `M${W} 0 C 250 110, 186 300, 224 ${CY} C 186 560, 250 750, ${W} ${H} Z`, fill: 'right', origin: 'right center', ornaments: true, shadow: true },
      { name: 'lotus-bottom', d: `M0 ${H} L${W} ${H} C 390 700, 300 520, ${CX} 470 C 100 520, 10 700, 0 ${H} Z`, fill: 'bottom', origin: 'bottom center', ornaments: true, shadow: true },
      { name: 'lotus-top', d: `M0 0 L${W} 0 C 390 170, 300 340, ${CX} 392 C 100 340, 10 170, 0 0 Z`, fill: 'top', origin: 'top center', ornaments: true, shadow: true },
    ],
    glow: [`M0 0 C 10 170, 100 340, ${CX} 392`, `M${W} 0 C 390 170, 300 340, ${CX} 392`, `M0 ${H} C 10 700, 100 520, ${CX} 470`, `M${W} ${H} C 390 700, 300 520, ${CX} 470`],
  },
};

/* ------------------------------------------------------------------ */
/* Bow (ribbon layout)                                                  */
/* ------------------------------------------------------------------ */

const Bow: React.FC<{ theme: CoverTheme; gid: string }> = ({ theme, gid }) => (
  <svg viewBox="-80 -70 160 140" className="w-full h-full overflow-visible">
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={theme.seal} />
        <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="55%" stopColor={theme.seal} />
        <stop offset="100%" stopColor={theme.sealDeep} />
      </linearGradient>
    </defs>
    <g style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.28))' }}>
      <path d="M-6 6 L-34 64 L-22 60 L-16 72 L4 12 Z" fill={theme.sealDeep} />
      <path d="M6 6 L34 64 L22 60 L16 72 L-4 12 Z" fill={theme.sealDeep} />
      <path d="M-4 -2 C -30 -46, -76 -40, -70 -6 C -66 24, -26 18, -4 4 Z" fill={`url(#${gid})`} />
      <path d="M4 -2 C 30 -46, 76 -40, 70 -6 C 66 24, 26 18, 4 4 Z" fill={`url(#${gid})`} />
      <path d="M-14 -4 C -34 -24, -56 -22, -54 -8" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M14 -4 C 34 -24, 56 -22, 54 -8" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      <rect x="-12" y="-14" width="24" height="24" rx="8" fill={theme.seal} />
      <rect x="-12" y="-14" width="24" height="24" rx="8" fill={`url(#${gid})`} opacity="0.7" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export const AnimatedEnvelopeCover: React.FC<AnimatedEnvelopeCoverProps> = ({
  theme,
  hostNames,
  fadingOut = false,
  className = '',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const monogram = useMemo(() => getMonogram(hostNames), [hostNames]);
  const id = (name: string) => `tkc-${uid}-${name}`;
  const highlight = theme.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)';
  const spots = theme.ornamentStyle === 'minimal' ? MINIMAL_SPOTS : ORNAMENT_SPOTS;
  const layout = LAYOUTS[theme.layout] || LAYOUTS.cross;

  const ornamentLayer = (dx: number, dy: number, fill: string, opacity: number) => (
    <g fill={fill} stroke={fill} opacity={opacity} style={{ ['--tk-ornament' as any]: fill }} transform={`translate(${dx} ${dy})`}>
      {spots.map(([x, y, r, s, mirror], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${mirror ? -s : s} ${s})`}>
          {renderOrnament(theme.ornamentStyle)}
        </g>
      ))}
    </g>
  );

  const svgProps = {
    className: 'absolute inset-0 w-full h-full',
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: 'xMidYMid slice',
  };

  const renderFlap = (flap: FlapSpec, extraClass = '') => (
    <div key={flap.name} className={`tk-layer tk-l-${flap.name} ${extraClass}`} style={{ transformOrigin: flap.origin }}>
      <svg {...svgProps}>
        <defs>
          <clipPath id={id(`clip-${flap.name}`)}>
            <path d={flap.d} clipRule="evenodd" />
          </clipPath>
        </defs>
        <path
          d={flap.d}
          fillRule="evenodd"
          fill={`url(#${id(flap.fill)})`}
          filter={flap.shadow ? `url(#${id('shadow')})` : undefined}
        />
        {(flap.ornaments || flap.extra) && (
          <g clipPath={`url(#${id(`clip-${flap.name}`)})`}>
            {flap.ornaments && ornamentLayer(0.9, 1.1, highlight, 1)}
            {flap.ornaments && ornamentLayer(0, 0, theme.ornament, theme.ornamentOpacity)}
            {flap.extra?.(theme)}
            <rect width={W} height={H} filter={`url(#${id('paper')})`} />
          </g>
        )}
      </svg>
    </div>
  );

  return (
    <div
      aria-hidden="true"
      className={`tk-cover tk-cover--${theme.layout} absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${
        fadingOut ? 'tk-cover--opening' : ''
      } ${className}`}
      style={{ backgroundColor: theme.paperDeep, perspective: theme.layout === 'gatefold' ? '760px' : '1400px' }}
    >
      {/* Base: shared gradients/filters + the inner card revealed when the envelope opens */}
      <svg {...svgProps}>
        <defs>
          <linearGradient id={id('top')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.paper} />
            <stop offset="100%" stopColor={theme.paperMid} />
          </linearGradient>
          <linearGradient id={id('left')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.paperMid} />
            <stop offset="100%" stopColor={theme.paperDeep} />
          </linearGradient>
          <linearGradient id={id('right')} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor={theme.paperMid} />
            <stop offset="100%" stopColor={theme.paperDeep} />
          </linearGradient>
          <linearGradient id={id('bottom')} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={theme.paperMid} />
            <stop offset="100%" stopColor={theme.paperDeep} />
          </linearGradient>
          <linearGradient id={id('fabric')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.seal} />
            <stop offset="100%" stopColor={theme.sealDeep} />
          </linearGradient>
          <linearGradient id={id('satinV')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.sealDeep} />
            <stop offset="45%" stopColor={theme.seal} />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="70%" stopColor={theme.seal} />
            <stop offset="100%" stopColor={theme.sealDeep} />
          </linearGradient>
          <linearGradient id={id('satinH')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.sealDeep} />
            <stop offset="45%" stopColor={theme.seal} />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="70%" stopColor={theme.seal} />
            <stop offset="100%" stopColor={theme.sealDeep} />
          </linearGradient>
          <linearGradient id={id('card')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={theme.dark ? 0.16 : 0.85} />
            <stop offset="100%" stopColor={theme.paper} stopOpacity={theme.dark ? 0.1 : 0.95} />
          </linearGradient>
          <radialGradient id={id('vignette')} cx="50%" cy="48%" r="75%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity={theme.dark ? 0.45 : 0.16} />
          </radialGradient>
          <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#000" floodOpacity={theme.dark ? 0.45 : 0.16} />
          </filter>
          <filter id={id('paper')} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope={theme.dark ? 0.06 : 0.05} />
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width={W} height={H} fill={`url(#${id('bottom')})`} />
        {theme.layout === 'ribbon' && (
          <g>
            <rect width={W} height={H} fill={`url(#${id('top')})`} />
            {ornamentLayer(0.9, 1.1, highlight, 1)}
            {ornamentLayer(0, 0, theme.ornament, theme.ornamentOpacity)}
            <rect x="18" y="18" width={W - 36} height={H - 36} rx="24" fill="none" stroke={theme.ornament} strokeWidth="2" opacity={Math.min(0.9, theme.ornamentOpacity + 0.3)} />
            <rect x="30" y="30" width={W - 60} height={H - 60} rx="16" fill="none" stroke={theme.ornament} strokeWidth="1" opacity={theme.ornamentOpacity} />
          </g>
        )}
        {theme.layout !== 'ribbon' && !layout.slidingCard && (
          <g>
            <rect x="48" y="150" width="304" height="560" rx="18" fill={`url(#${id('card')})`} stroke={theme.ornament} strokeOpacity="0.35" />
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fill={theme.ornament} opacity="0.55"
              style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: 46 }}>
              {monogram}
            </text>
          </g>
        )}
        <rect width={W} height={H} filter={`url(#${id('paper')})`} />
      </svg>

      {/* Pocket envelope: inner card slides up when the flap opens */}
      {layout.slidingCard && (
        <div className="tk-layer tk-l-pocket-card">
          <svg {...svgProps}>
            <rect x="46" y="120" width="308" height="600" rx="16" fill={theme.paper} filter={`url(#${id('shadow')})`} />
            <rect x="60" y="134" width="280" height="572" rx="10" fill="none" stroke={theme.ornament} strokeOpacity="0.45" />
            <text x={CX} y="250" textAnchor="middle" dominantBaseline="central" fill={theme.ornament}
              style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: 40 }}>
              {monogram}
            </text>
            <path d="M150 300 H250" stroke={theme.ornament} strokeOpacity="0.5" />
          </svg>
        </div>
      )}

      {/* Moving envelope parts */}
      {layout.flaps.map((flap) => renderFlap(flap))}
      {layout.front && renderFlap(layout.front, 'tk-layer--static')}

      {/* Vignette over the artwork */}
      <svg {...svgProps} className="absolute inset-0 w-full h-full tk-cover-fx">
        <rect width={W} height={H} fill={`url(#${id('vignette')})`} />
      </svg>

      {/* Glowing edges */}
      <svg {...svgProps} className="tk-cover-glow tk-cover-fx absolute inset-0 w-full h-full">
        <defs>
          <filter id={id('blur')} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <g stroke={theme.glow} strokeLinecap="round" fill="none">
          <g filter={`url(#${id('blur')})`} strokeWidth="9" opacity="0.7">
            {layout.glow.map((d) => <path key={d} d={d} />)}
          </g>
          <g strokeWidth="1.6" opacity="0.95">
            {layout.glow.map((d) => <path key={d} d={d} />)}
          </g>
        </g>
      </svg>

      {/* Light travelling along the edges */}
      <svg {...svgProps} className="tk-cover-fx absolute inset-0 w-full h-full">
        <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9">
          {layout.glow.map((d, i) => (
            <path key={d} d={d} pathLength={100} className={`tk-cover-runner ${i % 2 ? 'tk-cover-runner--late' : ''}`} />
          ))}
        </g>
      </svg>

      {/* Floating particles */}
      {PARTICLE_SPOTS.map(([left, top, size, dur, delay, drift], i) => (
        <span key={i} className="tk-cover-fx absolute block" style={{ left: `${left}%`, top: `${top}%` }}>
          <span
            className={`tk-cover-particle block ${theme.particles === 'stars' || theme.particles === 'sparkles' ? 'tk-cover-particle--twinkle' : ''}`}
            style={{
              width: theme.particles === 'butterflies' ? size * 1.7 : size,
              height: theme.particles === 'butterflies' ? size * 1.4 : size,
              animationDuration: `${dur}s`,
              animationDelay: `-${delay}s`,
              ['--tk-drift' as any]: `${drift}px`,
            }}
          >
            <ParticleShape type={theme.particles} color={theme.particleColor} />
          </span>
        </span>
      ))}

      {/* Wax seal or bow */}
      <div className="tk-cover-seal-wrap absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] max-w-[168px] aspect-square">
        <div className="tk-cover-seal relative w-full h-full">
          {layout.bow ? (
            <Bow theme={theme} gid={id('bow')} />
          ) : (
            <svg viewBox="-70 -70 140 140" className="w-full h-full overflow-visible">
              <defs>
                <radialGradient id={id('seal')} cx="38%" cy="32%" r="78%">
                  <stop offset="0%" stopColor={theme.seal} stopOpacity="1" />
                  <stop offset="55%" stopColor={theme.seal} />
                  <stop offset="100%" stopColor={theme.sealDeep} />
                </radialGradient>
                <radialGradient id={id('sealShine')} cx="34%" cy="26%" r="40%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </radialGradient>
                <filter id={id('sealShadow')} x="-40%" y="-40%" width="180%" height="190%">
                  <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#000" floodOpacity="0.34" />
                </filter>
                <clipPath id={id('sealClip')}>
                  <path d={SEAL_PATH} />
                </clipPath>
              </defs>
              <path d={SEAL_PATH} fill={`url(#${id('seal')})`} filter={`url(#${id('sealShadow')})`} />
              <circle r="41" fill="none" stroke={theme.sealDeep} strokeWidth="5" opacity="0.55" />
              <circle r="41" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.28" transform="translate(-0.8 -0.8)" />
              <g transform="translate(0.8 1.2)" opacity="0.35">
                <Emblem type={theme.emblem} color="#000000" monogram={monogram} />
              </g>
              <Emblem type={theme.emblem} color={theme.emblemColor} monogram={monogram} />
              <path d={SEAL_PATH} fill={`url(#${id('sealShine')})`} />
              <g clipPath={`url(#${id('sealClip')})`}>
                <rect className="tk-cover-seal-shine" x="-120" y="-80" width="36" height="160" fill="#FFFFFF" opacity="0.35" transform="rotate(20)" />
              </g>
            </svg>
          )}
        </div>
      </div>

      {/* Bottom fade for CTA legibility */}
      <div
        className="tk-cover-fx absolute inset-x-0 bottom-0 h-[28%]"
        style={{ background: `linear-gradient(to top, ${theme.dark ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.14)'}, transparent)` }}
      />
    </div>
  );
};

export default AnimatedEnvelopeCover;
