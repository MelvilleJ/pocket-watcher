// Mirrors the design tokens in the web app's app/globals.css so both apps share one look.
const light = {
  background: "#faf7f3",
  foreground: "#2e2925",
  primary: "#ff5c8d",
  primaryDeep: "#c2265a",
  primarySoft: "#ffe5f0",
  aqua: "#5bc0be",
  surface: "#ffffff",
  surfaceSoft: "#f8f4ef",
  surfaceInset: "#f0eae3",
  border: "#e8e0d7",
  borderStrong: "#cfc5ba",
  muted: "#665d53",
  mutedSoft: "#70675e",
  chartGridline: "#efe8e0",
  chartBaseline: "#e3dad0",
  chartTextMuted: "#70675e",
  chartTextSecondary: "#665d53",
  series: ["#ff5c8d", "#ff8a76", "#5bc0be", "#f5b040", "#ec5f9f", "#41a866", "#8a75e8", "#ef5c67"],
  // Pink ramp, lightest to deepest; every step is at least 3:1 against chartGridline.
  chartRamp: ["#e8457a", "#d8336b", "#c2265a", "#a61d4d", "#8a1640", "#6e1033"],
  good: "#0b785c",
  warning: "#e7a227",
  warningInk: "#8d6010",
  serious: "#b74416",
  critical: "#b93a3e",
  // Fills stay deep in both themes so white labels on them keep 4.5:1.
  fillPrimary: "#c2265a",
  fillGood: "#0b785c",
  fillCritical: "#b93a3e",
  onFill: "#ffffff",
  shadow: "#3b2a1a",
};

const dark: typeof light = {
  background: "#171412",
  foreground: "#f5efe8",
  primary: "#ff5c8d",
  primaryDeep: "#ff7ba3",
  primarySoft: "#45272c",
  aqua: "#2dd4bf",
  surface: "#211d1a",
  surfaceSoft: "#1c1916",
  surfaceInset: "#2a2521",
  border: "#363029",
  borderStrong: "#4a423a",
  muted: "#b7afa7",
  mutedSoft: "#978d81",
  chartGridline: "#2a2521",
  chartBaseline: "#363029",
  chartTextMuted: "#978d81",
  chartTextSecondary: "#b7afa7",
  series: ["#ff5c8d", "#ff8a76", "#5bc0be", "#f5be5a", "#f478ae", "#52c489", "#a99cff", "#ff6b70"],
  // Dark theme ramps toward lighter pink so bigger values read brighter on the dark track.
  chartRamp: ["#c93a6a", "#e04a7d", "#ff5c8d", "#ff7ba3", "#ff9dbb", "#ffc0d3"],
  good: "#2fd0a8",
  warning: "#f2bc4e",
  warningInk: "#f2bc4e",
  serious: "#f0986b",
  critical: "#ff6b70",
  fillPrimary: "#c2265a",
  fillGood: "#0b785c",
  fillCritical: "#b93a3e",
  onFill: "#ffffff",
  shadow: "#000000",
};

export const Palettes = { light, dark };
export type Palette = typeof light;

export const Fonts = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  bold: "Geist_700Bold",
  display: "Fraunces_600SemiBold",
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

// Hex colour with alpha, the native stand-in for CSS color-mix(... X%, transparent).
export function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 7)}${a}`;
}

// Approximates CSS color-mix(in srgb, a weight%, b).
export function mix(a: string, b: string, weight: number) {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x: number, y: number) =>
    Math.round(x * weight + y * (1 - weight))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}
