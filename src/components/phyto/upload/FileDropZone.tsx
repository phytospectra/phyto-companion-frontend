"use client";

import * as React from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Accepted spectra extensions. The check is against a lower-cased Set:
 * browsers report `.mzML` as `.mzml` after lower-casing, and a mixed-case
 * allowlist silently rejected the platform's primary format (fixed in
 * Phase 1 — do not regress).
 */
export const ACCEPTED_EXTS = [".zip", ".mgf", ".mzML", ".mzXML", ".csv", ".jdx"];
const ACCEPTED_EXT_SET = new Set(ACCEPTED_EXTS.map((e) => e.toLowerCase()));

export interface FileDropZoneProps {
  files: File[];
  /** Called with accepted files and the names rejected by the extension filter. */
  onFilesAdded: (accepted: File[], rejectedNames: string[]) => void;
  onRemove: (name: string) => void;
  /** Rejected filenames from the most recent selection, if any. */
  rejected?: string[];
  error?: string;
}

export function FileDropZone({
  files,
  onFilesAdded,
  onRemove,
  rejected = [],
  error,
}: FileDropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const accepted: File[] = [];
    const rejectedNames: string[] = [];
    for (const f of incoming) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (ACCEPTED_EXT_SET.has(ext)) accepted.push(f);
      else rejectedNames.push(f.name);
    }
    onFilesAdded(accepted, rejectedNames);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
          Spectra files
        </CardTitle>
        <CardDescription>
          Accepted: {ACCEPTED_EXTS.join(", ")}. Multiple files or a single
          archive.
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
            onChange={(e) => {
              addFiles(e.target.files);
              // Allow re-selecting the same file after removal.
              e.target.value = "";
            }}
            data-testid="file-input"
          />
        </div>

        {rejected.length > 0 && (
          <p role="alert" className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
            Skipped {rejected.length} unsupported file
            {rejected.length === 1 ? "" : "s"}: {rejected.join(", ")}. Accepted:{" "}
            {ACCEPTED_EXTS.join(", ")}.
          </p>
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
      </CardContent>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
