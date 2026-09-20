"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsync } from "@/hooks/use-async";
import { projectService } from "@/services";
import type { Project, ProjectStatus } from "@/types";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  on_hold: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  delayed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  delayed: "Delayed",
};

export default function ProjectsPage() {
  const { data: projects, loading, error, refetch } = useAsync(() => projectService.list());
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const router = useRouter();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between"><Skeleton className="h-8 w-40" /><Skeleton className="h-9 w-36" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage construction projects and track progress, reports, and invoices.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new"><Plus className="size-4" /> New Project</Link>
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start generating reports and invoices."
          action={
            <Button asChild>
              <Link href="/projects/new"><Plus className="size-4" /> Create Project</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer py-4 transition-shadow hover:shadow-md"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <CardContent className="space-y-3 px-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">{project.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.projectCode}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-7 opacity-0 transition-opacity group-hover:opacity-100">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}><Pencil className="mr-2 size-3.5" /> View / Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Badge className={`text-[10px] ${STATUS_COLORS[project.status]}`} variant="secondary">
                  {STATUS_LABELS[project.status]}
                </Badge>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {project.city && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="size-3 shrink-0" /> {project.city}{project.state ? `, ${project.state}` : ""}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Calendar className="size-3 shrink-0" /> {project.startDate || "Not set"}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="size-3" /> Progress</span>
                    <span className="font-medium text-foreground">{project.percentComplete ?? 0}%</span>
                  </div>
                  <Progress value={project.percentComplete ?? 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete project?"
        description={`This will permanently remove "${deleteTarget?.name}". All linked reports and invoices will remain.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleteTarget) {
            await projectService.remove(deleteTarget.id);
            toast.success("Project deleted");
            refetch();
          }
        }}
      />
    </div>
  );
}
