"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { FileDropZone } from "./FileDropZone";
import {
  CompoundMetadataForm,
  MetadataForm,
} from "./MetadataForm";
import { WorkflowSelector } from "./WorkflowSelector";
import { useTokenStore } from "@/lib/phyto/stores";
import { runsApi } from "@/api/runs";
import { InsufficientTokensError } from "@/api/client";
import { WORKFLOWS, PRICING_TABLE } from "@/lib/phyto/constants";
import {
  DEFAULT_UPLOAD_VALUES,
  SINGLE_COMPOUND_WORKFLOWS,
  uploadSchema,
  type UploadFormValues,
} from "@/lib/phyto/upload-schema";
import type { WorkflowId } from "@/lib/phyto/types";

interface UploadPageProps {
  onRunStarted: (run_id: string) => void;
}

export function UploadPage({ onRunStarted }: UploadPageProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [fileError, setFileError] = React.useState<string | undefined>();
  const [workflow, setWorkflow] = React.useState<WorkflowId>("identify");
  const [submitting, setSubmitting] = React.useState(false);

  const setInsufficient = useTokenStore((s) => s.setInsufficientTokensError);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema) as Resolver<UploadFormValues>,
    defaultValues: DEFAULT_UPLOAD_VALUES,
  });

  function addFiles(accepted: File[], rejectedNames: string[]) {
    const fresh = accepted.filter(
      (f) => !files.some((p) => p.name === f.name)
    );
    setRejected(rejectedNames);
    if (fresh.length > 0) {
      setFiles((prev) => [...prev, ...fresh]);
      setFileError(undefined);
    }
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function onSubmit(values: UploadFormValues) {
    if (files.length === 0) {
      setFileError("Add at least one spectra file before starting the analysis.");
      toast({
        title: "No spectra uploaded",
        description: "Drop at least one .mzML / .mgf / .csv / .jdx file.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const compound =
        (SINGLE_COMPOUND_WORKFLOWS as readonly string[]).includes(workflow)
          ? {
              formula: values.compound_formula,
              hrms_mz: values.compound_hrms_mz,
              adduct: values.compound_adduct,
              smiles: values.compound_smiles,
            }
          : undefined;

      const { run_id } = await runsApi.start({
        workflow,
        user_goal: values.user_goal,
        files: files.map((f) => f.name),
        metadata: {
          species: values.species,
          plant_part: values.plant_part,
          extraction_method: values.extraction_method,
          solvent: values.solvent,
          collection_site: values.collection_site,
          voucher_specimen: values.voucher_specimen,
          notes: values.notes,
        },
        compound_metadata: compound,
      });

      toast({
        title: "Run started",
        description: `run_id: ${run_id} · workflow: ${workflow}`,
      });
      onRunStarted(run_id);
    } catch (e) {
      if (e instanceof InsufficientTokensError) {
        // The global modal subscribes to the store; keep the retry wired so
        // the same click resumes after top-up.
        setInsufficient({
          operation_id: e.url,
          balance: e.balance,
          required: e.required,
          topup_url: e.topup_url,
        });
      } else {
        toast({
          title: "Could not start run",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedWorkflow = WORKFLOWS.find((w) => w.id === workflow)!;
  const showCompoundForm = (
    SINGLE_COMPOUND_WORKFLOWS as readonly string[]
  ).includes(workflow);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workflow"
        title="Upload a sample"
        description="Drop your spectra, describe the sample, and choose what you want Phytospectra to investigate. Estimated token cost is shown before you commit."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <FileDropZone
            files={files}
            onFilesAdded={addFiles}
            onRemove={removeFile}
            rejected={rejected}
            error={fileError}
          />

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            aria-label="Start an analysis run"
          >
            <MetadataForm form={form} />

            {showCompoundForm && <CompoundMetadataForm form={form} />}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? "Starting run…" : "Start analysis"}
                {!submitting && (
                  <Badge
                    variant="outline"
                    className="ml-1 gap-1 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                  >
                    <CostBadge
                      cost={PRICING_TABLE.run_analysis}
                      operation="Start analysis"
                      size="sm"
                    />
                  </Badge>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Estimated total for this workflow:{" "}
                <span
                  className="font-medium text-foreground"
                  data-testid="workflow-estimate"
                >
                  {selectedWorkflow.estimated_tokens} tokens
                </span>{" "}
                across all phases
              </span>
            </div>
          </form>
        </div>

        <WorkflowSelector value={workflow} onChange={setWorkflow} />
      </div>
    </div>
  );
}
