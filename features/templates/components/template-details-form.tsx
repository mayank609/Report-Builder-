"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_TYPES } from "@/lib/constants";
import type { TemplateFormValues } from "@/features/templates/lib/template-schema";

interface TemplateDetailsFormProps {
  control: Control<TemplateFormValues>;
  errors: FieldErrors<TemplateFormValues>;
}

export function TemplateDetailsForm({ control, errors }: TemplateDetailsFormProps) {
  return (
    <Card className="py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Template Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Template Name</Label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input id="name" placeholder="e.g. Daily Progress Report - Residential" {...field} />
            )}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reportType">Report Type</Label>
          <Controller
            name="reportType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="reportType" className="w-full">
                  <SelectValue placeholder="Select a report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                id="description"
                rows={3}
                placeholder="Describe what this template is used for..."
                {...field}
              />
            )}
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
