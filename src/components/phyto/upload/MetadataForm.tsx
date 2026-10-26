"use client";

import * as React from "react";
import { FlaskRound } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UploadFormValues } from "@/lib/phyto/upload-schema";

interface MetadataFormProps {
  form: UseFormReturn<UploadFormValues>;
}

/**
 * Sample metadata. Everything is optional by design — a run is still
 * useful without a voucher number — but the fields are surfaced prominently
 * because better metadata yields better MSI level assignment downstream.
 * `user_goal` is the exception: the orchestrator cannot plan without it.
 */
export function MetadataForm({ form }: MetadataFormProps) {
  const { register, formState } = form;
  const errors = formState.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskRound aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
          Sample metadata
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-1">
          All fields optional but encouraged — better metadata → better MSI
          level assignment in the network.
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2"
                aria-label="How should I prepare my metadata?"
              >
                How should I prepare my metadata?
              </button>
            </TooltipTrigger>
            <TooltipContent role="tooltip" className="max-w-xs">
              <p>
                Use the binomial species name, standard plant-part vocabulary,
                and record the extraction solvent ratio exactly as prepared. A
                voucher specimen number is the single highest-value field: it
                anchors the MSI level-2 assignment to a physical specimen.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Species (binomial)" error={errors.species?.message}>
            <Input {...register("species")} placeholder="Camellia sinensis" />
          </Field>
          <Field label="Plant part" error={errors.plant_part?.message}>
            <Input {...register("plant_part")} placeholder="leaf, root, bark…" />
          </Field>
          <Field label="Extraction method" error={errors.extraction_method?.message}>
            <Input {...register("extraction_method")} placeholder="maceration, Soxhlet…" />
          </Field>
          <Field label="Solvent" error={errors.solvent?.message}>
            <Input {...register("solvent")} placeholder="EtOH/H2O 7:3" />
          </Field>
          <Field label="Collection site" error={errors.collection_site?.message}>
            <Input {...register("collection_site")} placeholder="Yunnan, China · 2024-05" />
          </Field>
          <Field label="Voucher specimen #" error={errors.voucher_specimen?.message}>
            <Input {...register("voucher_specimen")} placeholder="voucher ID" />
          </Field>
          <Field
            label="What do you want to learn? (min 10 chars)"
            required
            error={errors.user_goal?.message}
            className="sm:col-span-2"
          >
            <Textarea
              {...register("user_goal")}
              rows={3}
              placeholder="Identify flavonoids in the leaf extract; flag novelty against LOTUS."
            />
          </Field>
          <Field label="Notes (max 2000)" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea
              {...register("notes")}
              rows={2}
              placeholder="any prep notes, instrument config, etc."
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

interface CompoundMetadataFormProps {
  form: UseFormReturn<UploadFormValues>;
}

/**
 * Extra metadata for the single-compound workflows (novelty, mechanism
 * hypothesis). Optional: `expected SMILES` sharpens novelty detection but
 * the run is valid without it.
 */
export function CompoundMetadataForm({ form }: CompoundMetadataFormProps) {
  const errors = form.formState.errors;
  return (
    <div className="mt-2 rounded-md border border-dashed p-3 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Compound metadata (optional, for novelty / mechanism)
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Molecular formula" error={errors.compound_formula?.message}>
          <Input {...form.register("compound_formula")} placeholder="C15H10O7" />
        </Field>
        <Field label="HRMS m/z" error={errors.compound_hrms_mz?.message}>
          <Input
            type="number"
            step="0.0001"
            {...form.register("compound_hrms_mz")}
            placeholder="302.0427"
          />
        </Field>
        <Field label="Adduct" error={errors.compound_adduct?.message}>
          <Input {...form.register("compound_adduct")} placeholder="[M+H]+" />
        </Field>
        <Field label="Expected SMILES" error={errors.compound_smiles?.message}>
          <Input
            {...form.register("compound_smiles")}
            placeholder="O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const errorId = `${id}-error`;
  // Associate the label with the control so it is announced and clickable.
  const control = React.isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(children)
    ? React.cloneElement(children, {
        id,
        "aria-describedby": error ? errorId : undefined,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </Label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-[11px] text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
