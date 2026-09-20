export interface AppSettings {
  // Organization
  organizationName: string;
  organizationEmail: string;
  organizationPhone: string;
  organizationAddress: string;
  organizationWebsite: string;
  organizationGstin: string;
  organizationLogoUrl: string;

  // User
  userName: string;
  userRole: string;
  userEmail: string;

  // Report defaults
  defaultFont: string;
  defaultOrientation: "portrait" | "landscape";
  geminiApiKey: string;
  autoIncludeAiSummary: boolean;
  defaultTheme: "light" | "dark" | "system";

  // Numbering & Invoicing
  invoiceNumberPrefix: string;
  reportNumberPrefix: string;
  defaultCurrency: string;
  defaultInvoiceTerms: string;
  defaultInvoiceNotes: string;

  // Onboarding
  onboardingCompleted: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  organizationName: "",
  organizationEmail: "",
  organizationPhone: "",
  organizationAddress: "",
  organizationWebsite: "",
  organizationGstin: "",
  organizationLogoUrl: "",

  userName: "",
  userRole: "",
  userEmail: "",

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

  onboardingCompleted: false,
};
