/** Runtime-validated contracts for the real orchestrator (not the demo API). */
import { z } from "zod";
import { apiClient } from "./client";

export const capabilitiesSchema = z.object({
  schema_version: z.literal(1),
  scientific_execution: z.enum(["mock", "real"]),
  scientific_validation: z.literal("not_validated"),
  configuration_valid: z.boolean(),
  dependencies_available: z.boolean(),
  supported_workflows: z.array(z.string()),
  analysis_tokens: z.number().int().nonnegative().nullable(),
  pricing_provisional: z.boolean(),
  run_storage: z.literal("process_local"),
  production_ready: z.literal(false),
  limitations: z.array(z.string()),
});
export type Capabilities = z.infer<typeof capabilitiesSchema>;
const assessment = z.object({
  disposition: z.enum(["no_hits", "insufficient_evidence", "ambiguous", "ranked"]),
  reasons: z.array(z.string()),
}).passthrough();
const output = z.object({
  formula: z.string(),
  hits: z.array(z.object({
    candidate: z.object({ id: z.string(), name: z.string(), smiles: z.string() }).passthrough(),
    reference_id: z.string(), source: z.string(), solvent: z.string(), license: z.string(),
  }).passthrough()),
  unavailable_references: z.array(z.string()),
  limitations: z.array(z.string()),
  evidence_assessment: assessment,
  provenance: z.record(z.string(), z.unknown()),
}).passthrough();
const result = z.object({ task_id: z.string(), tool: z.literal("reference_hsqc.rank"), output });
export const runSchema = z.object({
  run_id: z.string(), workflow: z.string(),
  status: z.enum(["complete", "failed", "awaiting_review"]),
  scientific_execution: z.enum(["mock", "real"]),
  scientific_validation: z.literal("not_validated"),
  scientific_results: z.array(result),
  provenance_manifest_id: z.string(),
  awaiting_task_id: z.string().nullable(),
  tasks: z.array(z.object({
    id: z.string(), requires_checkpoint: z.string().nullable(),
    status: z.string(), error: z.string().nullable().optional(),
  }).passthrough()),
}).passthrough();
export type ResearchRun = z.infer<typeof runSchema>;
const started = z.object({ run_id: z.string() });

export function parsePeaks(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
  if (!text.trim() || lines.length > 256) throw new Error("Enter between 1 and 256 HSQC peaks.");
  return lines.map((line, index) => {
    // CSV delimiters must preserve missing cells; collapsing them can silently
    // move intensity into the carbon coordinate (e.g. "1.2,,100").
    const cells = /[,;]/.test(line)
      ? line.split(/[,;]/).map(cell => cell.trim())
      : line.trim().split(/\s+/);
    if (cells.length < 2 || cells.length > 3 || cells.some(c => c === "")) {
      throw new Error(`Line ${index + 1}: use H ppm, C ppm, and optional intensity.`);
    }
    const [h, c, intensity = 1] = cells.map(Number);
    if (![h, c, intensity].every(Number.isFinite) || h < -5 || h > 15 || c < -50 || c > 300 || intensity < 0) {
      throw new Error(`Line ${index + 1}: peak values are outside the supported ranges.`);
    }
    return { h_ppm: h, c_ppm: c, intensity, experiment_type: "HSQC" as const };
  });
}
export function canRun(c: Capabilities | null): boolean {
  return !!c && c.scientific_execution === "real" && c.configuration_valid &&
    c.dependencies_available && c.analysis_tokens !== null &&
    c.supported_workflows.includes("reference_hsqc_identify");
}
export const researchApi = {
  async capabilities(signal?: AbortSignal) {
    return capabilitiesSchema.parse(await apiClient.get("/capabilities", { signal }));
  },
  async start(sample: string, formula: string, peaks: ReturnType<typeof parsePeaks>, key: string, signal?: AbortSignal) {
    return started.parse(await apiClient.post("/analysis", {
      sample_id: sample, workflow: "reference_hsqc_identify", dry_run: false,
      modalities: ["hsqc"], parameters: { formula, peaks },
    }, { idempotencyKey: key, signal }));
  },
  async get(id: string, signal?: AbortSignal) {
    return runSchema.parse(await apiClient.get(`/runs/${encodeURIComponent(id)}`, { signal }));
  },
  async approve(id: string, actor: string, signal?: AbortSignal) {
    await apiClient.post(`/runs/${encodeURIComponent(id)}/approve`, {
      checkpoint: "before_confirmed_claim", actor,
    }, { signal });
  },
};
