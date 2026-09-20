"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  HardDrive,
  Mail,
  Phone,
  Pencil,
  Trash2,
  MoreHorizontal,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsync } from "@/hooks/use-async";
import { engineerService } from "@/services";
import type { Engineer } from "@/types";

export default function EngineersPage() {
  const { data: engineers, loading, error, refetch } = useAsync(() => engineerService.list());
  const [deleteTarget, setDeleteTarget] = useState<Engineer | null>(null);
  const router = useRouter();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between"><Skeleton className="h-8 w-40" /><Skeleton className="h-9 w-36" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Engineers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage engineers for your projects.</p>
        </div>
        <Button asChild><Link href="/engineers/new"><Plus className="size-4" /> Add Engineer</Link></Button>
      </div>

      {!engineers || engineers.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="No engineers yet"
          description="Add engineers to assign them to projects."
          action={<Button asChild><Link href="/engineers/new"><Plus className="size-4" /> Add Engineer</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {engineers.map((e) => (
            <Card key={e.id} className="group cursor-pointer py-4 transition-shadow hover:shadow-md" onClick={() => router.push(`/engineers/${e.id}/edit`)}>
              <CardContent className="space-y-3 px-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">{e.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.designation || e.discipline}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-7 opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/engineers/${e.id}/edit`}><Pencil className="mr-2 size-3.5" /> Edit</Link></DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e); }}><Trash2 className="mr-2 size-3.5" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {e.email && <p className="flex items-center gap-1.5 truncate"><Mail className="size-3 shrink-0" /> {e.email}</p>}
                  {e.phone && <p className="flex items-center gap-1.5"><Phone className="size-3 shrink-0" /> {e.phone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {e.discipline && <Badge variant="outline" className="text-[10px]">{e.discipline}</Badge>}
                  {e.yearsExperience > 0 && (
                    <Badge variant="secondary" className="gap-0.5 text-[10px]"><GraduationCap className="size-2.5" /> {e.yearsExperience} yrs</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete engineer?"
        description={`This will permanently remove "${deleteTarget?.name}".`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteTarget) { await engineerService.remove(deleteTarget.id); toast.success("Engineer deleted"); refetch(); } }}
      />
    </div>
  );
}
