"use client";

import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/lib/phyto/formatting";
import type { AuditEntry } from "@/api/types";

interface LiveLogProps {
  entries: AuditEntry[];
}

/**
 * The last 20 audit entries. The run query drives it, so the log advances
 * with each poll while the run is active.
 */
export function LiveLog({ entries }: LiveLogProps) {
  const tail = entries.slice(-20);
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText
            aria-hidden="true"
            style={{ width: "1rem", height: "1rem" }}
          />
          Live audit tail
        </CardTitle>
        <CardDescription>
          Last 20 entries, refreshed every 2s while the run is active.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 rounded-md border">
          <ul className="space-y-0.5 p-2 text-xs" aria-label="Audit log">
            {tail.length === 0 && (
              <li className="px-1.5 py-1 text-muted-foreground">
                No entries yet.
              </li>
            )}
            {tail.map((e, i) => (
              <li
                key={`${e.ts}-${i}`}
                className="flex items-start gap-2 rounded-sm px-1.5 py-1 hover:bg-accent"
              >
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {formatRelativeTime(e.ts)}
                </span>
                <div className="min-w-0">
                  <span className="font-medium">{e.event}</span>{" "}
                  <span className="text-muted-foreground">· {e.actor}</span>
                  {e.detail && (
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      {e.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <p className="mt-2 text-[10px] text-muted-foreground">
          The audit log is append-only; entries are never edited or removed.
        </p>
      </CardContent>
    </Card>
  );
}
