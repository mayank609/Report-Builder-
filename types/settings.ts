export interface AppSettings {
  organizationName: string;
  defaultFont: string;
  defaultOrientation: "portrait" | "landscape";
  geminiApiKey: string;
  autoIncludeAiSummary: boolean;
  defaultTheme: "light" | "dark" | "system";
  invoiceNumberPrefix: string;
  reportNumberPrefix: string;
  defaultCurrency: string;
  defaultInvoiceTerms: string;
  defaultInvoiceNotes: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  organizationName: "Sinclair Construction Group",
  defaultFont: "Inter",
  defaultOrientation: "portrait",
  geminiApiKey: "",
  autoIncludeAiSummary: true,
  defaultTheme: "system",
  invoiceNumberPrefix: "INV",
  reportNumberPrefix: "REP",
  defaultCurrency: "INR",
  defaultInvoiceTerms:
    "Payment due within 30 days of invoice date. Late payments may attract interest at 1.5% per month.",
  defaultInvoiceNotes: "Thank you for your business.",
};
