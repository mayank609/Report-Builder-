import { PageHeader } from "@/components/shared/page-header";
import { ReportGeneratorForm } from "@/features/reports/components/report-generator-form";

export default function GenerateReportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Generate Report"
        description="Combine a template with live project data to generate a formatted report with AI."
      />
      <ReportGeneratorForm />
    </div>
  );
}
