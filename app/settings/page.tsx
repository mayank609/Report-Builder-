import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/features/settings/components/settings-form";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Configure your organization defaults and AI integration." />
      <SettingsForm />
    </div>
  );
}
