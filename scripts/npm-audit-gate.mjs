#!/usr/bin/env node
/** npm audit gate: fail on critical findings, on high findings outside the
 * accepted baseline (see docs/DEPENDENCY-SECURITY-2026-11-12.md), and when
 * the documented baseline no longer matches reality.
 *
 * Moderate findings are reported but do not block (dev-tooling chain).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Accepted high-severity packages with their documented rationale. Any HIGH
// outside this set fails the gate.
const ACCEPTED_HIGH = new Set([
  "firebase",
  "@firebase/firestore",
  "@firebase/firestore-compat",
  "@grpc/grpc-js",
  "sharp",
  "js-yaml",
]);

let raw;
try {
  raw = execFileSync("npm", ["audit", "--json"], {
    cwd: root,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (error) {
  // npm audit exits 1 when findings exist; stdout still carries the JSON.
  raw = error.stdout || "";
  if (!raw) throw error;
}

const report = JSON.parse(raw);
const vulnerabilities = report.vulnerabilities ?? {};
const critical = [];
const unacceptedHigh = [];
const moderate = [];
for (const [name, entry] of Object.entries(vulnerabilities)) {
  if (entry.severity === "critical") critical.push(name);
  else if (entry.severity === "high" && !ACCEPTED_HIGH.has(name)) {
    unacceptedHigh.push(name);
  } else if (entry.severity === "moderate") moderate.push(name);
}

const doc = readFileSync(
  join(root, "docs", "DEPENDENCY-SECURITY-2026-11-12.md"),
  "utf-8",
);
for (const name of ACCEPTED_HIGH) {
  if (!doc.includes(name)) {
    console.error(
      `npm-audit-gate: accepted high package '${name}' is not documented in ` +
        "docs/DEPENDENCY-SECURITY-2026-11-12.md; update the rationale there.",
    );
    process.exit(1);
  }
}

console.log(
  `npm-audit-gate: ${critical.length} critical, ` +
    `${unacceptedHigh.length} unaccepted high, ` +
    `${moderate.length} moderate (reported, non-blocking), ` +
    `${ACCEPTED_HIGH.size} accepted high.`,
);
if (critical.length) {
  console.error(`Blocking: critical findings: ${critical.join(", ")}`);
  process.exit(1);
}
if (unacceptedHigh.length) {
  console.error(
    `Blocking: high findings outside the accepted baseline: ${unacceptedHigh.join(", ")}. ` +
      "Update docs/DEPENDENCY-SECURITY-2026-11-12.md with a reachability " +
      "analysis and explicit acceptance, or fix the dependency.",
  );
  process.exit(1);
}
process.exit(0);
