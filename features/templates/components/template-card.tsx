"use client";

import Link from "next/link";
import { MoreVertical, Copy, Trash2, Pencil, FileStack, Sparkles, Receipt, FileUp } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, titleCase } from "@/lib/utils";
import type { ReportTemplate } from "@/types";

interface TemplateCardProps {
  template: ReportTemplate;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function TemplateCard({ template, onDelete, onDuplicate }: TemplateCardProps) {
  return (
    <Card className="group py-5 transition-shadow hover:shadow-md">
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {template.documentKind === "invoice" ? (
              <Receipt className="size-4.5" />
            ) : (
              <FileStack className="size-4.5" />
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/templates/${template.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                <Copy className="size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(template.id)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-5">
        <Link href={`/templates/${template.id}/edit`} className="block">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
            {template.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {template.description || "No description provided."}
          </p>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant={template.status === "published" ? "success" : "secondary"} className="capitalize">
            {template.status}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {template.documentKind === "invoice" ? "Invoice" : titleCase(template.reportType)}
          </Badge>
          {template.origin === "imported" && (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <FileUp className="size-3" /> Imported
            </Badge>
          )}
          {template.origin === "ai" && (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <Sparkles className="size-3" /> AI
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="px-5 text-xs text-muted-foreground">
        <span>
          {template.documentKind === "invoice"
            ? "Invoice template"
            : `${template.sections.length} sections`}
        </span>
        <span className="mx-1.5">·</span>
        <span>Updated {formatDate(template.updatedAt)}</span>
      </CardFooter>
    </Card>
  );
}
