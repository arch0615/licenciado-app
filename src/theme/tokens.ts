/**
 * ACVEL design tokens — source: licenciado-web/docs/mobile-design-system.md
 * (values extracted from the web app's globals.css; status tokens added for mobile).
 */

export type ColorTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  overlay: string;
  success: string;
  successBg: string;
  info: string;
  infoBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  dangerSolid: string;
  dangerSolidForeground: string;
  neutral: string;
  neutralBg: string;
  highlight: string;
  highlightBg: string;
  whatsapp: string;
};

export const brand = {
  primary: "#094496",
  secondary: "#183760",
  accent: "#43D5F6",
  neutral: "#1E1E1E",
  white: "#FFFFFF"
} as const;

export const lightColors: ColorTokens = {
  background: "#F7F9FC",
  foreground: "#1A1D23",
  card: "#FFFFFF",
  cardForeground: "#1A1D23",
  primary: "#094695",
  primaryForeground: "#FFFFFF",
  secondary: "#17335E",
  secondaryForeground: "#FFFFFF",
  accent: "#41D8F6",
  accentForeground: "#17335E",
  muted: "#EDF2F8",
  mutedForeground: "#525E6F",
  border: "#DAE2EC",
  ring: "#094695",
  overlay: "rgba(12, 19, 34, 0.5)",
  success: "#15803D",
  successBg: "#DCFCE7",
  info: "#1D4ED8",
  infoBg: "#DBEAFE",
  warning: "#B45309",
  warningBg: "#FEF3C7",
  danger: "#B91C1C",
  dangerBg: "#FEE2E2",
  dangerSolid: "#DC2626",
  dangerSolidForeground: "#FFFFFF",
  neutral: "#334155",
  neutralBg: "#F1F5F9",
  highlight: "#0E7490",
  highlightBg: "#CFF6FD",
  whatsapp: "#25D366"
};

export const darkColors: ColorTokens = {
  background: "#0C1322",
  foreground: "#F1F5F9",
  card: "#171D2B",
  cardForeground: "#F1F5F9",
  primary: "#41D8F6",
  primaryForeground: "#17335E",
  secondary: "#094695",
  secondaryForeground: "#F8FAFC",
  accent: "#17335E",
  accentForeground: "#F8FAFC",
  muted: "#1F2A3D",
  mutedForeground: "#ACB8C8",
  border: "#293851",
  ring: "#41D8F6",
  overlay: "rgba(0, 0, 0, 0.6)",
  success: "#86EFAC",
  successBg: "rgba(20, 83, 45, 0.4)",
  info: "#93C5FD",
  infoBg: "rgba(30, 58, 138, 0.3)",
  warning: "#FCD34D",
  warningBg: "rgba(120, 53, 15, 0.3)",
  danger: "#FCA5A5",
  dangerBg: "rgba(127, 29, 29, 0.3)",
  dangerSolid: "#F87171",
  dangerSolidForeground: "#450A0A",
  neutral: "#CBD5E1",
  neutralBg: "#1E293B",
  highlight: "#67E8F9",
  highlightBg: "#164E63",
  whatsapp: "#25D366"
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  /** Horizontal screen padding. */
  screen: 16
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  sheet: 20,
  full: 999
} as const;

/** Minimum touch target (iOS 44pt / Android 48dp). */
export const touchTarget = 48;

export const fontFamily = {
  regular: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  semibold: "Montserrat_600SemiBold",
  bold: "Montserrat_700Bold"
} as const;

export type TypographyVariant =
  | "display"
  | "title1"
  | "title2"
  | "title3"
  | "body"
  | "bodyStrong"
  | "callout"
  | "calloutStrong"
  | "caption"
  | "overline"
  | "micro";

export const typography: Record<
  TypographyVariant,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number; textTransform?: "uppercase" }
> = {
  display: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
  title1: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32 },
  title2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 28 },
  title3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  calloutStrong: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, textTransform: "uppercase" },
  micro: { fontFamily: fontFamily.semibold, fontSize: 10, lineHeight: 14 }
};

export const elevation = {
  shell: {
    shadowColor: brand.primary,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  card: {
    shadowColor: "#0C1322",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  }
} as const;

/** Semantic tones used by badges, alerts and status chips. */
export type Tone = "success" | "info" | "warning" | "danger" | "neutral" | "highlight" | "primary";

export function toneColors(colors: ColorTokens, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case "success":
      return { fg: colors.success, bg: colors.successBg };
    case "info":
      return { fg: colors.info, bg: colors.infoBg };
    case "warning":
      return { fg: colors.warning, bg: colors.warningBg };
    case "danger":
      return { fg: colors.danger, bg: colors.dangerBg };
    case "highlight":
      return { fg: colors.highlight, bg: colors.highlightBg };
    case "primary":
      return { fg: colors.primary, bg: colors.muted };
    case "neutral":
      return { fg: colors.neutral, bg: colors.neutralBg };
  }
}
