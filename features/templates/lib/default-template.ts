import { generateId } from "@/lib/utils";
import { DEFAULT_THEME_COLORS } from "@/lib/constants";
import type { TemplateSection } from "@/types";
import type { TemplateFormValues } from "./template-schema";

export function createBlankTemplate(): TemplateFormValues {
  return {
    name: "",
    reportType: "daily_progress",
    description: "",
    status: "draft",
    documentKind: "report",
    origin: "manual",
    invoiceDefaults: null,
    layout: {
      coverPage: true,
      header: true,
      footer: true,
      logo: true,
      watermark: false,
      pageNumbers: true,
      orientation: "portrait",
      font: "Inter",
      themeColors: DEFAULT_THEME_COLORS,
    },
    sections: [],
  };
}

export function createBlankInvoiceDefaults(): NonNullable<TemplateFormValues["invoiceDefaults"]> {
  return {
    termsAndConditions:
      "Payment due within 30 days of invoice date. Late payments may attract interest at 1.5% per month.",
    notes: "Thank you for your business.",
    numberingPrefix: "INV",
    defaultGstBranchId: null,
  };
}

export function createSectionInstance(
  type: TemplateSection["type"],
  defaultTitle: string,
  defaultDescription: string,
  order: number,
  width: TemplateSection["width"] = "full"
): TemplateSection {
  return {
    id: generateId("section"),
    type,
    title: defaultTitle,
    description: defaultDescription,
    required: false,
    editable: true,
    visible: true,
    collapsed: false,
    order,
    width,
  };
}
