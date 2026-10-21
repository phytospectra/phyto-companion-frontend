"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, FileText, X, FileBox, FlaskRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { WORKFLOWS, PRICING_TABLE } from "@/lib/phyto/constants";
import { mockApi, newIdempotencyKey } from "@/lib/phyto/mock-api";
import type { WorkflowId } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/phyto/layout/PageHeader";

const ACCEPTED_EXTS = [".zip", ".mgf", ".mzML", ".mzXML", ".csv", ".jdx"];

const schema = z.object({
  species: z.string().min(1, "Species is required (genus species)"),
  plant_part: z.string().optional(),
  extraction_method: z.string().optional(),
  solvent: z.string().optional(),
  collection_site: z.string().optional(),
  voucher_specimen: z.string().optional(),
  notes: z.string().max(2000).optional(),
  user_goal: z
    .string()
    .min(10, "Tell us what you want to learn (min 10 chars)"),
  compound_formula: z.string().optional(),
  compound_hrms_mz: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  compound_adduct: z.string().optional(),
  compound_smiles: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface UploadPageProps {
  onRunStarted: (run_id: string) => void;
}

export function UploadPage({ onRunStarted }: UploadPageProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [workflow, setWorkflow] = React.useState<WorkflowId>("identify");
  const [submitting, setSubmitting] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      species: "Camellia sinensis",
      plant_part: "leaf",
      extraction_method: "maceration",
      solvent: "EtOH/H2O 7:3",
      collection_site: "",
      voucher_specimen: "",
      notes: "",
      user_goal:
        "Identify the flavonoid composition of the leaf EtOH extract; flag any novelty.",
    },
  });

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const filtered = Array.from(newFiles).filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      return ACCEPTED_EXTS.includes(ext);
    });
    if (filtered.length < Array.from(newFiles).length) {
      toast({
        title: "Some files skipped",
        description: `Accepted: ${ACCEPTED_EXTS.join(", ")}`,
        variant: "destructive",
      });
    }
    setFiles((prev) => [
      ...prev,
      ...filtered.filter((f) => !prev.some((p) => p.name === f.name)),
    ]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function onSubmit(values: FormValues) {
    if (files.length === 0) {
      toast({
        title: "No spectra uploaded",
        description: "Drop at least one .mzML / .mgf / .csv / .jdx file.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const idempotencyKey = newIdempotencyKey();
    try {
      const { run_id } = await mockApi.startRun(
        {
          user_goal: values.user_goal,
          workflow,
        },
        idempotencyKey
      );
      toast({
        title: "Run started",
        description: `run_id: ${run_id} · workflow: ${workflow}`,
      });
      onRunStarted(run_id);
    } catch (e) {
      // 402 is handled by the global modal; any other error toast here.
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (e instanceof Error && e.name !== "InsufficientTokensError") {
        toast({
          title: "Could not start run",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedWorkflow = WORKFLOWS.find((w) => w.id === workflow)!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workflow"
        title="Upload a sample"
        description="Drop your spectra, describe the sample, and choose what you want Phytospectra to investigate. Estimated token cost is shown before you commit."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* File drop + metadata */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileBox aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
                Spectra files
              </CardTitle>
              <CardDescription>
                Accepted: {ACCEPTED_EXTS.join(", ")}. Multiple files supported.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                role="button"
                tabIndex={0}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                aria-label="Drop spectra files here, or click to open file picker"
                className={cn(
                  "grid place-items-center rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-slate-300 hover:border-emerald-400 dark:border-slate-700"
                )}
              >
                <Upload
                  aria-hidden="true"
                  className="text-muted-foreground"
                  style={{ width: "1.5rem", height: "1.5rem" }}
                />
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  .mzML · .mzXML · .mgf · .csv · .jdx · .zip
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTS.join(",")}
                  className="sr-only"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
                    >
                      <FileText
                        aria-hidden="true"
                        className="text-muted-foreground shrink-0"
                        style={{ width: "0.9rem", height: "0.9rem" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(f.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(f.name)}
                        aria-label={`Remove ${f.name}`}
                      >
                        <X aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskRound aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
                Sample metadata
              </CardTitle>
              <CardDescription>
                All fields optional but encouraged — better metadata → better
                MSI level assignment in the network.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <Field label="Species (binomial)" required error={form.formState.errors.species?.message}>
                  <Input {...form.register("species")} placeholder="Camellia sinensis" />
                </Field>
                <Field label="Plant part" error={form.formState.errors.plant_part?.message}>
                  <Input {...form.register("plant_part")} placeholder="leaf, root, bark…" />
                </Field>
                <Field label="Extraction method" error={form.formState.errors.extraction_method?.message}>
                  <Input {...form.register("extraction_method")} placeholder="maceration, Soxhlet…" />
                </Field>
                <Field label="Solvent" error={form.formState.errors.solvent?.message}>
                  <Input {...form.register("solvent")} placeholder="EtOH/H2O 7:3" />
                </Field>
                <Field label="Collection site" error={form.formState.errors.collection_site?.message}>
                  <Input {...form.register("collection_site")} placeholder="Yunnan, China · 2024-05" />
                </Field>
                <Field label="Voucher specimen #" error={form.formState.errors.voucher_specimen?.message}>
                  <Input {...form.register("voucher_specimen")} placeholder="voucher ID" />
                </Field>
                <Field
                  label="What do you want to learn? (min 10 chars)"
                  required
                  error={form.formState.errors.user_goal?.message}
                  className="sm:col-span-2"
                >
                  <Textarea
                    {...form.register("user_goal")}
                    rows={3}
                    placeholder="Identify flavonoids in the leaf extract; flag novelty against LOTUS."
                  />
                </Field>
                <Field label="Notes (max 2000)" className="sm:col-span-2" error={form.formState.errors.notes?.message}>
                  <Textarea
                    {...form.register("notes")}
                    rows={2}
                    placeholder="any prep notes, instrument config, etc."
                  />
                </Field>

                {/* Optional compound metadata (single-compound workflows) */}
                {(workflow === "novelty" || workflow === "mechanism_hypothesis") && (
                  <div className="sm:col-span-2 mt-2 rounded-md border border-dashed p-3 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Compound metadata (optional, for novelty / mechanism)
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Molecular formula" error={form.formState.errors.compound_formula?.message}>
                        <Input {...form.register("compound_formula")} placeholder="C15H10O7" />
                      </Field>
                      <Field label="HRMS m/z" error={form.formState.errors.compound_hrms_mz?.message}>
                        <Input
                          type="number"
                          step="0.0001"
                          {...form.register("compound_hrms_mz")}
                          placeholder="302.0427"
                        />
                      </Field>
                      <Field label="Adduct" error={form.formState.errors.compound_adduct?.message}>
                        <Input {...form.register("compound_adduct")} placeholder="[M+H]+" />
                      </Field>
                      <Field label="Expected SMILES" error={form.formState.errors.compound_smiles?.message}>
                        <Input {...form.register("compound_smiles")} placeholder="O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2" />
                      </Field>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="gap-1.5"
                  >
                    {submitting ? "Starting run…" : "Start analysis"}
                    {!submitting && (
                      <Badge
                        variant="outline"
                        className="ml-1 gap-1 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                      >
                        <CostBadge cost={PRICING_TABLE.run_analysis} operation="Start analysis" size="sm" />
                      </Badge>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Estimated total for this workflow:{" "}
                    <span className="font-medium text-foreground">
                      {selectedWorkflow.estimated_tokens} tokens
                    </span>{" "}
                    across all phases
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Workflow selector */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base">Choose a workflow</CardTitle>
            <CardDescription>
              Each workflow runs a different plan. The estimated total
              includes every phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {WORKFLOWS.map((w) => {
              const active = w.id === workflow;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWorkflow(w.id)}
                  aria-pressed={active}
                  className={cn(
                    "w-full text-left rounded-md border p-3 transition-colors",
                    active
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                      : "border-slate-200 hover:border-emerald-400 dark:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm">{w.label}</div>
                    <Badge
                      variant="outline"
                      className="text-[10px] tabular-nums"
                    >
                      ~{w.estimated_tokens} tokens
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {w.description}
                  </div>
                  <ol className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    {w.steps.map((s, i) => (
                      <React.Fragment key={s}>
                        <span className="font-mono">{i + 1}. {s}</span>
                        {i < w.steps.length - 1 && <span aria-hidden="true">→</span>}
                      </React.Fragment>
                    ))}
                  </ol>
                </button>
              );
            })}
          </CardContent>
        </Card>
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
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-[11px] text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
