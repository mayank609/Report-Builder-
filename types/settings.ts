export interface AppSettings {
  organizationName: string;
  defaultFont: string;
  defaultOrientation: "portrait" | "landscape";
  geminiApiKey: string;
  autoIncludeAiSummary: boolean;
  defaultTheme: "light" | "dark" | "system";
}

export const DEFAULT_SETTINGS: AppSettings = {
  organizationName: "Sinclair Construction Group",
  defaultFont: "Inter",
  defaultOrientation: "portrait",
  geminiApiKey: "",
  autoIncludeAiSummary: true,
  defaultTheme: "system",
};
