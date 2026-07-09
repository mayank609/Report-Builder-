"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, LayoutTemplate } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplates } from "@/features/templates/hooks/use-templates";
import { TemplateCard } from "@/features/templates/components/template-card";
import { TemplateListSkeleton } from "@/features/templates/components/template-list-skeleton";

export default function TemplatesPage() {
  const { templates, loading, error, refetch, remove, duplicate } = useTemplates();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [templates, search, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Templates"
        description="Create and manage reusable report templates."
        actions={
          <Button asChild>
            <Link href="/templates/new">
              <Plus className="size-4" /> New Template
            </Link>
          </Button>
        }
      />

      {!loading && !error && templates.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading && <TemplateListSkeleton />}

      {!loading && error && <ErrorState onRetry={refetch} />}

      {!loading && !error && templates.length === 0 && (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates yet"
          description="Create your first report template manually, or let AI generate one for you."
          action={
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/templates/new">
                  <Plus className="size-4" /> Create Template
                </Link>
              </Button>
            </div>
          }
        />
      )}

      {!loading && !error && templates.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={Search}
          title="No matching templates"
          description="Try adjusting your search or filters."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((template) => (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <TemplateCard
                  template={template}
                  onDelete={setPendingDeleteId}
                  onDuplicate={duplicate}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete template?"
        description="This will permanently remove the template. Reports already generated from it will not be affected."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await remove(pendingDeleteId);
        }}
      />
    </div>
  );
}
