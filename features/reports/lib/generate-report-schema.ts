import { z } from "zod";

export const generateReportSchema = z
  .object({
    builderId: z.string().min(1, "Select a builder"),
    projectId: z.string().min(1, "Select a project"),
    contractorId: z.string().optional(),
    clientId: z.string().optional(),
    engineerId: z.string().optional(),
    templateId: z.string().min(1, "Select a template"),
    dateRangeStart: z.string().min(1, "Select a start date"),
    dateRangeEnd: z.string().min(1, "Select an end date"),
  })
  .refine((data) => new Date(data.dateRangeStart) <= new Date(data.dateRangeEnd), {
    message: "Start date must be before the end date",
    path: ["dateRangeEnd"],
  });

export type GenerateReportFormValues = z.infer<typeof generateReportSchema>;
