"use client";

import * as React from "react";
import { researchApi, canRun, parsePeaks, type Capabilities, type ResearchRun } from "@/api/research";
import { ApiError, generateIdempotencyKey } from "@/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/phyto/layout/PageHeader";

/** Mounted by account UID: account transitions discard all private local state. */
export function ResearchWorkspace({ owner }: { owner: string }) {
  const [capabilities, setCapabilities] = React.useState<Capabilities | null>(null);
  const [error, setError] = React.useState("");
  const [sample, setSample] = React.useState("");
  const [formula, setFormula] = React.useState("");
  const [peaks, setPeaks] = React.useState("");
  const [run, setRun] = React.useState<ResearchRun | null>(null);
  const [runId, setRunId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [reviewed, setReviewed] = React.useState(false);
  const [requestKey, setRequestKey] = React.useState("");
  const active = React.useRef(true);
  const operation = React.useRef(false);
  const abort = React.useRef(new AbortController());

  React.useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    abort.current = controller;
    researchApi.capabilities(controller.signal).then(value => {
      if (!controller.signal.aborted) setCapabilities(value);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Cannot verify backend capabilities. Analysis is disabled. Reload to check again.");
    });
    return () => { active.current = false; controller.abort(); };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setError("");
    try { await action(); }
    catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : "Operation failed.");
    } finally {
      operation.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function load(id: string) {
    const value = await researchApi.get(id, abort.current.signal);
    if (active.current) { setRun(value); setReviewed(false); }
  }
  function start(event: React.FormEvent) {
    event.preventDefault();
    if (!canRun(capabilities) || uncertain) return;
    void perform(async () => {
      if (!sample.trim() || !/^(?:[A-Z][a-z]?\d*)+$/.test(formula.trim())) {
        throw new Error("Provide a sample identifier and a neutral elemental formula, for example C15H10O7.");
      }
      const values = parsePeaks(peaks);
      const key = generateIdempotencyKey();
      setRequestKey(key); setRun(null); setRunId(""); setReviewed(false);
      // Freeze submission before the request: a timeout may hide a completed run.
      setUncertain(true);
      let accepted = false;
      try {
        const created = await researchApi.start(sample.trim(), formula.trim(), values, key, abort.current.signal);
        accepted = true;
        if (!active.current) return;
        setRunId(created.run_id);
        await load(created.run_id);
        if (active.current) setUncertain(false);
      } catch (cause) {
        // Only an explicit, pre-handler client refusal permits a fresh request.
        if (!accepted && cause instanceof ApiError && [400, 401, 402, 403, 422].includes(cause.status) && active.current) {
          setUncertain(false);
        }
        throw cause;
      }
    });
  }
  function download() {
    if (!run) return;
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${run.run_id}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const field = "block w-full rounded-md border bg-background p-2 mt-1";
  const checkpoint = run?.tasks.find(task => task.id === run.awaiting_task_id)?.requires_checkpoint;
  return <section aria-label="HSQC workspace" className="space-y-6 max-w-5xl">
    <PageHeader title="HSQC reference workspace" eyebrow="Research preview"
      description="Rank measured references using a known molecular formula and observed HSQC cross-peaks." />
    <section className="rounded-lg border border-amber-400 p-4 space-y-2" aria-label="Readiness and limitations">
      <h2 className="font-semibold">Not scientifically validated · Not production-ready</h2>
      <p>Rankings and human review do not establish a confirmed identification. Export results before leaving: runs are held in server memory and can disappear on restart.</p>
      {!capabilities ? <p role="status">Capabilities have not been verified.</p> : <>
        <p>Execution: {capabilities.scientific_execution}. Analysis: {capabilities.analysis_tokens ?? "unavailable"} tokens{capabilities.pricing_provisional ? " (provisional price)" : ""}.</p>
        {!canRun(capabilities) && <p role="status">The connected backend cannot accept this real workflow. No demo fallback is used.</p>}
      </>}
    </section>
    {error && <p role="alert" className="rounded-md border border-red-400 p-3">{error}</p>}
    {uncertain && <section role="status" className="rounded-md border p-3">
      <p>The request outcome needs verification. Do not submit it again with a new key. {runId ? "Refresh the known run below." : "Ask the operator to reconcile this request key."}</p>
      <code className="break-all">{requestKey}</code>
    </section>}
    <form onSubmit={start} className="space-y-4">
      <fieldset disabled={busy || uncertain || !canRun(capabilities)} className="space-y-4 disabled:opacity-60">
        <legend className="text-lg font-semibold">Submit observed peaks</legend>
        <label className="block">Sample identifier<input className={field} required maxLength={200} value={sample} onChange={e => setSample(e.target.value)} /></label>
        <label className="block">Molecular formula<input className={field} required maxLength={100} value={formula} onChange={e => setFormula(e.target.value)} placeholder="C15H10O7" /></label>
        <label className="block">HSQC peaks<textarea className={field} required rows={7} maxLength={20000} value={peaks} onChange={e => setPeaks(e.target.value)} aria-describedby="peak-format" /></label>
        <p id="peak-format" className="text-sm text-muted-foreground">One peak per line: H ppm, C ppm, optional nonnegative intensity. No header; up to 256 peaks. Missing intensity is set to 1. Use only data you have permission to process.</p>
        <Button type="submit">{busy ? "Working…" : "Run reference ranking"}</Button>
      </fieldset>
    </form>
    <section className="space-y-3 border-t pt-4" aria-label="Retrieve a run">
      <h2 className="text-lg font-semibold">Review a run</h2>
      <label className="block">Run ID<input className={field} value={runId} maxLength={100} disabled={busy} onChange={e => { setRunId(e.target.value); setRun(null); setReviewed(false); }} /></label>
      <Button variant="outline" disabled={busy || !runId.trim()} onClick={() => void perform(() => load(runId.trim()))}>Load or refresh run</Button>
    </section>
    {run && <section className="space-y-4" aria-label="Scientific results">
      <h2 className="text-lg font-semibold">Run {run.run_id}: {run.status}</h2>
      <p>Execution: {run.scientific_execution} · Validation: {run.scientific_validation}</p>
      <p className="break-all">Provenance: {run.provenance_manifest_id}</p>
      {run.tasks.filter(task => task.error).map(task => <p role="alert" key={task.id}>{task.id}: {task.error}</p>)}
      {run.scientific_results.map(({ task_id, output }) => <div key={task_id} className="space-y-3">
        <h3 className="font-semibold">Assessment: {output.evidence_assessment.disposition.replaceAll("_", " ")}</h3>
        <ul className="list-disc pl-5">{output.evidence_assessment.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left py-2">Ranked candidates — not confirmed identifications</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Candidate</th><th scope="col">Reference</th><th scope="col">Solvent</th></tr></thead>
          <tbody>{output.hits.map((hit, i) => <tr key={`${hit.reference_id}-${i}`} className="border-t"><td className="py-2">{i + 1}</td><td>{hit.candidate.name} ({hit.candidate.id})</td><td>{hit.reference_id}</td><td>{hit.solvent}</td></tr>)}</tbody>
        </table></div>
        {!output.hits.length && <p>No ranked reference hits.</p>}
        <p>Unavailable references: {output.unavailable_references.join(", ") || "none reported"}. Missing references are unknown, not negative matches.</p>
        <ul className="list-disc pl-5">{output.limitations.map((limit, i) => <li key={i}>{limit}</li>)}</ul>
        <details><summary>Evidence, source attribution and provenance</summary><pre className="overflow-auto max-h-96 text-xs p-3">{JSON.stringify(output, null, 2)}</pre></details>
      </div>)}
      <Button variant="outline" onClick={download}>Export run evidence JSON</Button>
      {run.status === "awaiting_review" && checkpoint === "before_confirmed_claim" && run.scientific_execution === "real" && <div className="space-y-3 border p-4 rounded-md">
        <label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e => setReviewed(e.target.checked)} />I have reviewed the evidence and limitations. Completing this checkpoint does not scientifically validate the assignment.</label>
        <Button disabled={busy || !reviewed} onClick={() => void perform(async () => {
          await researchApi.approve(run.run_id, owner, abort.current.signal);
          await load(run.run_id);
        })}>Record review and complete checkpoint</Button>
      </div>}
    </section>}
  </section>;
}
