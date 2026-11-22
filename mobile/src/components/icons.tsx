import type { ReactNode } from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

import type { DepoIconName } from "@/lib/finance/depos";

// Paths are copied from the web app's inline SVG icons so both apps draw the same glyphs.
const ICONS = {
  home: (
    <>
      <Path d="m3 10 9-7 9 7" />
      <Path d="M5 9v11h14V9" />
      <Path d="M9 20v-7h6v7" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3" y="5" width="18" height="16" rx="3" />
      <Path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  budget: (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="3" />
      <Path d="M7 9h10M7 14h4M15 14h2" />
    </>
  ),
  transactions: (
    <>
      <Path d="m7 4-4 4 4 4" />
      <Path d="M3 8h14" />
      <Path d="m17 20 4-4-4-4" />
      <Path d="M21 16H7" />
    </>
  ),
  subscription: (
    <>
      <Path d="M20 7h-9" />
      <Path d="m15 3-4 4 4 4" />
      <Path d="M4 17h9" />
      <Path d="m9 13 4 4-4 4" />
    </>
  ),
  debt: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M15.5 8.5c-.7-.8-1.8-1.2-3.2-1.2-1.8 0-3.1.9-3.1 2.3 0 3.5 6.2 1.5 6.2 4.9 0 1.4-1.3 2.4-3.3 2.4-1.5 0-2.8-.5-3.6-1.5M12 5.5v13" />
    </>
  ),
  goal: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="5" />
      <Circle cx="12" cy="12" r="1" />
    </>
  ),
  history: (
    <>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  logout: <Path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />,
  chevronLeft: <Path d="m15 18-6-6 6-6" />,
  chevronRight: <Path d="m9 18 6-6-6-6" />,
  chevronDown: <Path d="m6 9 6 6 6-6" />,
  check: <Path d="M5 12.5 10 17.5 19 7" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  camera: (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  refresh: (
    <>
      <Path d="M20 11a8 8 0 0 0-14.9-3.5L4 9" />
      <Path d="M4 4v5h5M4 13a8 8 0 0 0 14.9 3.5L20 15" />
      <Path d="M20 20v-5h-5" />
    </>
  ),
  moon: <Path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </>
  ),
  arrowIn: <Path d="M12 4v14m0 0 5-5m-5 5-5-5M5 21h14" />,
  arrowOut: <Path d="M12 20V6m0 0-5 5m5-5 5 5M5 3h14" />,
  trend: <Path d="M3 16.5 9.5 10l3.5 3.5L21 6m0 0h-5.5M21 6v5.5" />,
  dollar: <Path d="M12 3v18M17 6.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  sparkle: (
    <Path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9 12 3.5ZM5 4.5v3M3.5 6h3M18.5 15.5v3M17 17h3" />
  ),
  alert: <Path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.5v5.5M12 16.5h.01" />,
  card: <Path d="M3 7h18v10H3zM3 11h18M7 15h3" />,
  cloudOff: <Path d="M3 3l18 18M8.5 8.6A5 5 0 0 0 7 18h10M19.5 15.6A4 4 0 0 0 17 9h-.5A6 6 0 0 0 10 5.2" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 18,
  color,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}

const DEPO_PATHS: Record<DepoIconName, ReactNode> = {
  cash: (
    <>
      <Rect x="2.5" y="6" width="19" height="12" rx="2" />
      <Circle cx="12" cy="12" r="2.5" />
      <Path d="M6 9.5v.01M18 14.5v.01" />
    </>
  ),
  bank: (
    <>
      <Path d="m3 9 9-5 9 5" />
      <Path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8" />
      <Path d="M3 20h18" />
    </>
  ),
  "credit-union": (
    <>
      <Circle cx="8" cy="8" r="3" />
      <Circle cx="16" cy="8" r="3" />
      <Path d="M2.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M10.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
    </>
  ),
  card: (
    <>
      <Rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <Path d="M2.5 10h19M6.5 15h4" />
    </>
  ),
  wallet: (
    <>
      <Path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-12A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h14a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 19.5 7H5.5A2.5 2.5 0 0 1 3 6.5" />
      <Path d="M16.5 13.5h.01" />
    </>
  ),
  piggy: (
    <>
      <Path d="M19 10.5c1 .4 2 1 2 2.5M5 11a6.5 5.5 0 0 1 12.6-1.8c.9.6 1.4 1.4 1.4 2.3v2.5l-2 1V19h-3v-1.5h-4V19H7v-2.8A5.4 5.4 0 0 1 5 11Z" />
      <Path d="M10 7.5h3M15 11.5h.01" />
    </>
  ),
  safe: (
    <>
      <Rect x="3" y="3.5" width="18" height="16" rx="2" />
      <Circle cx="12" cy="11.5" r="3.5" />
      <Path d="M12 8v1M12 14v1M7 21v-1.5M17 21v-1.5" />
    </>
  ),
  phone: (
    <>
      <Rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <Path d="M11 18.5h2" />
    </>
  ),
  coins: (
    <>
      <Ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
      <Path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5" />
      <Ellipse cx="15" cy="13" rx="5.5" ry="2.5" />
      <Path d="M9.5 13v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
    </>
  ),
  home: (
    <>
      <Path d="m3 10.5 9-7 9 7" />
      <Path d="M5.5 9v11h13V9" />
      <Path d="M10 20v-6h4v6" />
    </>
  ),
  briefcase: (
    <>
      <Rect x="3" y="7" width="18" height="13" rx="2" />
      <Path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18" />
    </>
  ),
  star: <Path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />,
};

export function DepoGlyph({ name, size = 16, color }: { name: string; size?: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {DEPO_PATHS[name as DepoIconName] ?? DEPO_PATHS.wallet}
    </Svg>
  );
}

export function BrandMark({ size = 36, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="138 142 238 216" fill="none">
      <Path
        fill={color}
        fillRule="evenodd"
        d="M374 230L339 230L304 300L271 246L236 299L210 254L177 254L231 357L270 300L309 357Z M247 145L235 142L138 142L138 308L167 329L168 246L240 244L259 235L270 224L276 213L279 201L279 185L276 174L268 160L261 153Z M250 187L248 205L235 218L229 220L169 220L167 218L168 168L229 167L240 172Z"
      />
      <Path fill="#45B97C" d="M239 187L234 180L224 178L178 191L177 210L229 209L239 199Z" />
    </Svg>
  );
}
