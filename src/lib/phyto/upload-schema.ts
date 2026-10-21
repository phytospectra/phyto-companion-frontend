import { z } from "zod";

/**
 * Upload form contract.
 *
 * Sample metadata is deliberately optional — a researcher may not know the
 * voucher number at upload time, and blocking on it would be worse than
 * running with a recorded gap. Fields are still emphasised in the UI, and
 * `user_goal` stays required because the orchestrator cannot plan without
 * it.
 */
export const uploadSchema = z.object({
  species: z
    .string()
    .trim()
    .max(120, "Species must be 120 characters or fewer")
    .optional(),
  plant_part: z.string().trim().max(80, "Use 80 characters or fewer").optional(),
  extraction_method: z
    .string()
    .trim()
    .max(120, "Use 120 characters or fewer")
    .optional(),
  solvent: z.string().trim().max(120, "Use 120 characters or fewer").optional(),
  collection_site: z
    .string()
    .trim()
    .max(200, "Use 200 characters or fewer")
    .optional(),
  voucher_specimen: z
    .string()
    .trim()
    .max(120, "Use 120 characters or fewer")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or fewer")
    .optional(),
  user_goal: z
    .string()
    .trim()
    .min(10, "Describe what you want to learn (at least 10 characters)")
    .max(1000, "Keep the goal under 1000 characters"),

  // Single-compound workflows only.
  compound_formula: z
    .string()
    .trim()
    .max(120, "Use 120 characters or fewer")
    .optional(),
  compound_hrms_mz: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine(
      (v) =>
        v === undefined ||
        (typeof v === "number" && Number.isFinite(v) && v > 0) ||
        (typeof v === "string" && /^\d+(\.\d+)?$/.test(v) && Number(v) > 0),
      { message: "HRMS m/z must be a positive number" }
    ),
  compound_adduct: z
    .string()
    .trim()
    .max(40, "Use 40 characters or fewer")
    .optional(),
  compound_smiles: z
    .string()
    .trim()
    .max(500, "Use 500 characters or fewer")
    .optional(),
});

export type UploadFormValues = z.infer<typeof uploadSchema>;

/** Workflows that take a single compound's metadata. */
export const SINGLE_COMPOUND_WORKFLOWS = ["novelty", "mechanism_hypothesis"] as const;

export const DEFAULT_UPLOAD_VALUES: Partial<UploadFormValues> = {
  species: "Camellia sinensis",
  plant_part: "leaf",
  extraction_method: "maceration",
  solvent: "EtOH/H2O 7:3",
  collection_site: "",
  voucher_specimen: "",
  notes: "",
  user_goal:
    "Identify the flavonoid composition of the leaf EtOH extract; flag any novelty.",
};
