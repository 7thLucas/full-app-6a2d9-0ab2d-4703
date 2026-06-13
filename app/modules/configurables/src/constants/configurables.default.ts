/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TUIColors = {
  background: string;
  surface: string;
  success: string;
  danger: string;
  warning: string;
  textPrimary: string;
  textSecondary: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  tagline: string;
  teamName: string;
  signalRefreshIntervalSeconds: number;
  minimumConfidenceThreshold: number;
  showTeamStats: boolean;
  showTrendChart: boolean;
  showSignalHistory: boolean;
  signalHistoryLimit: number;
  uiColors: TUIColors;
  heroCta: string;
  footerText: string;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "Avisignal",
  logoUrl: "FILL_LOGO_URL_HERE",
  brandColor: {
    primary: "#0A1628",
    secondary: "#1E293B",
    accent: "#00D4FF",
  },
  tagline: "AI-Powered Aviator Signal Intelligence",
  teamName: "Signal Team",
  signalRefreshIntervalSeconds: 15,
  minimumConfidenceThreshold: 60,
  showTeamStats: true,
  showTrendChart: true,
  showSignalHistory: true,
  signalHistoryLimit: 20,
  uiColors: {
    background: "#0A1628",
    surface: "#1E293B",
    success: "#22C55E",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },
  heroCta: "Get Latest Signal",
  footerText: "Avisignal — Internal Signal Intelligence Platform",
};
