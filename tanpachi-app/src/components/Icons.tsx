import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number | undefined, props: P) => ({
  width: size ?? 22,
  height: size ?? 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const ChevronLeft = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const ChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const Bell = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);
export const Gear = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const Speaker = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
export const Play = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const Star = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size, p)} fill={filled ? "currentColor" : "none"}>
    <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
  </svg>
);
export const Home = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
);
export const Book = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" />
    <path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />
  </svg>
);
export const BookOpen = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <path d="M3 5.5C5.5 4.5 8.5 4.5 11 6v13c-2.5-1.5-5.5-1.5-8-.5z" opacity="0.9" />
    <path d="M21 5.5C18.5 4.5 15.5 4.5 13 6v13c2.5-1.5 5.5-1.5 8-.5z" />
  </svg>
);
export const Pachinko = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
);
export const Grid = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const User = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const Help = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" />
    <path d="M12 17h.01" />
  </svg>
);
export const Mail = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);
export const Doc = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 2h8l5 5v15H6z" />
    <path d="M14 2v5h5M9 13h6M9 17h6" />
  </svg>
);
export const Shield = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
export const Info = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const Target = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);
export const Palette = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2v-1a2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-9z" />
    <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
    <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="7.5" r="1" fill="currentColor" />
  </svg>
);
export const Flame = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />
  </svg>
);
export const Menu = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const Close = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Sun = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const Gift = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="8" width="18" height="4" />
    <path d="M5 12v9h14v-9M12 8v13" />
    <path d="M12 8c-2-3-5-3-5-1s3 1 5 1zm0 0c2-3 5-3 5-1s-3 1-5 1z" />
  </svg>
);
export const Trophy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4" />
  </svg>
);
export const X = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Zap = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
  </svg>
);
export const Sparkles = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
  </svg>
);
export const CheckCircle = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);
export const XCircle = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
);
export const ArrowRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const RotateCcw = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
export const Radio = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="2" />
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4" />
    <path d="M5 5a10 10 0 0 0 0 14M19 19a10 10 0 0 0 0-14" />
  </svg>
);
export const TrendingUp = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M15 8h5v5" />
  </svg>
);
export const Clock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
export const History = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5v4h4" />
    <path d="M12 8v4.5l3 1.8" />
  </svg>
);
export const Plus = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const ChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const ChevronUp = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);
export const Search = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
export const Filter = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </svg>
);
export const ArrowUpDown = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M7 4v16M3.5 16.5L7 20l3.5-3.5" />
    <path d="M17 20V4M13.5 7.5L17 4l3.5 3.5" />
  </svg>
);
export const List = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const Lock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);
export const Calendar = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const SearchX = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
    <path d="M9 9l4 4M13 9l-4 4" />
  </svg>
);
