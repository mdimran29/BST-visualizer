export type Theme = "dark" | "light";

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  canvasBg: string;
  dot: string;
  edge: string;
}

export const darkTokens: ThemeTokens = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#182339",
  border: "rgba(255,255,255,0.08)",
  text: "#F1F5F9",
  muted: "#94A3B8",
  canvasBg: "#0B1220",
  dot: "rgba(148,163,184,0.12)",
  edge: "#334155",
};

export const lightTokens: ThemeTokens = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  border: "rgba(15,23,42,0.09)",
  text: "#0F172A",
  muted: "#64748B",
  canvasBg: "#F1F5F9",
  dot: "rgba(15,23,42,0.08)",
  edge: "#CBD5E1",
};

export function tokensFor(theme: Theme): ThemeTokens {
  return theme === "dark" ? darkTokens : lightTokens;
}
