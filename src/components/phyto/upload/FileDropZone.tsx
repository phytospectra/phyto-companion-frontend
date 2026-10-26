"use client";

import * as React from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/phyto/constants";
import { cn } from "@/lib/utils";

/**
 * Accepted spectra extensions. The check is against a lower-cased Set:
 * browsers report `.mzML` as `.mzml` after lower-casing, and a mixed-case
 * allowlist silently rejected the platform's primary format (fixed in
 * Phase 1 — do not regress).
 *
 * Vendor `.raw` is NOT accepted: ingestion cannot read it yet, and the UI
 * must not promise a format the pipeline would reject downstream.
 */
export const ACCEPTED_EXTS = [".zip", ".mgf", ".mzML", ".mzXML", ".csv", ".jdx"];
const ACCEPTED_EXT_SET = new Set(ACCEPTED_EXTS.map((e) => e.toLowerCase()));

export interface FileRejection {
  name: string;
  reason: string;
}

export interface FileDropZoneProps {
  files: File[];
  /** Called with accepted files and the files rejected by validation. */
  onFilesAdded: (accepted: File[], rejected: FileRejection[]) => void;
  onRemove: (name: string) => void;
  error?: string;
}

export function FileDropZone({
  files,
  onFilesAdded,
  onRemove,
  error,
}: FileDropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [rejected, setRejected] = React.useState<FileRejection[]>([]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const accepted: File[] = [];
    const failed: FileRejection[] = [];
    for (const f of incoming) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_EXT_SET.has(ext)) {
        failed.push({
          name: f.name,
          reason: "unsupported format",
        });
        continue;
      }
      if (f.size > MAX_UPLOAD_FILE_BYTES) {
        failed.push({
          name: f.name,
          reason: `exceeds the ${formatFileSize(MAX_UPLOAD_FILE_BYTES)} per-file limit`,
        });
        continue;
      }
      accepted.push(f);
    }
    setRejected(failed);
    onFilesAdded(accepted, failed);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
          Spectra files
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-1">
          Accepted: {ACCEPTED_EXTS.join(", ")}. Multiple files or a single
          archive, up to {formatFileSize(MAX_UPLOAD_FILE_BYTES)} per file.
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2"
                aria-label="What file types are supported?"
              >
                What file types are supported?
              </button>
            </TooltipTrigger>
            <TooltipContent role="tooltip" className="max-w-xs">
              <p>
                LC-MS: .mzML, .mzXML, .mgf, or peak tables as .csv. NMR:
                JCAMP-DX .jdx. Multiple files or one .zip archive. Vendor
                .raw files must first be converted to .mzML (e.g. with
                MSConvert).
              </p>
            </TooltipContent>
          </Tooltip>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="button"
          tabIndex={0}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label="Drop spectra files here, or click to open file picker"
          className={cn(
            "grid place-items-center rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
            onChange={(e) => {
              addFiles(e.target.files);
              // Allow re-selecting the same file after removal.
              e.target.value = "";
            }}
            data-testid="file-input"
          />
        </div>

        {/* Validation outcome region: announced as a whole whenever a
            selection is made, so screen readers hear accepted + rejected
            counts without hunting individual rows. */}
        <div aria-live="polite">
          <p className="sr-only" data-testid="file-selection-status">
            {files.length > 0
              ? `${files.length} file${files.length === 1 ? "" : "s"} selected.`
              : "No files selected."}
            {rejected.length > 0
              ? ` ${rejected.length} file${rejected.length === 1 ? "" : "s"} skipped.`
              : ""}
          </p>

          {rejected.length > 0 && (
            <ul className="mt-2 space-y-1" role="alert">
              {rejected.map((r) => (
                <li
                  key={r.name}
                  className="text-[11px] text-amber-700 dark:text-amber-400"
                >
                  Skipped {r.name} — {r.reason}. Accepted:{" "}
                  {ACCEPTED_EXTS.join(", ")}.
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="mt-2 text-[11px] text-rose-600">
              {error}
            </p>
          )}

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5" aria-label="Selected spectra files">
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
                      {formatFileSize(f.size)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemove(f.name)}
                    aria-label={`Remove ${f.name}`}
                  >
                    <X aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 flex items-start gap-1.5 border-t pt-3 text-xs text-muted-foreground">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            style={{ width: "0.85rem", height: "0.85rem" }}
          >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
          <span>
            Your data stays yours. Files are used only for your analysis runs,
            are never sold or shared without your explicit permission, and raw
            uploads are excluded from shared evidence views.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}