import { NextRequest, NextResponse } from "next/server";

import { generateReportSuggestion, resolveApiKey } from "@/lib/ai/gemini";
import type { Project, ProjectRecord, ReportTemplate } from "@/types";

interface GenerateReportRequestBody {
  template: ReportTemplate;
  project: Project;
  builderName: string;
  clientName: string | null;
  contractorName: string | null;
  engineerName: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  projectRecords?: ProjectRecord[];
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as GenerateReportRequestBody | null;

  if (!body?.template || !body?.project || !body.dateRangeStart || !body.dateRangeEnd) {
    return NextResponse.json(
      { error: "Missing required report generation data." },
      { status: 400 }
    );
  }

  const headerKey = request.headers.get("x-gemini-api-key");
  const apiKey = resolveApiKey(headerKey);

  try {
    const suggestion = await generateReportSuggestion({
      template: body.template,
      project: body.project,
      builderName: body.builderName,
      clientName: body.clientName,
      contractorName: body.contractorName,
      engineerName: body.engineerName,
      dateRangeStart: body.dateRangeStart,
      dateRangeEnd: body.dateRangeEnd,
      projectRecords: body.projectRecords,
      apiKey,
    });
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("generate-report error", error);
    return NextResponse.json(
      { error: "Failed to generate report content. Please try again." },
      { status: 500 }
    );
  }
}
