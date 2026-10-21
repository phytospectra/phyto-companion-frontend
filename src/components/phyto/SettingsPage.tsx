"use client";

import * as React from "react";
import { Settings as SettingsIcon, Cpu, Database, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { APP_META } from "@/lib/phyto/constants";
import { toast } from "@/hooks/use-toast";

export function SettingsPage() {
  const [provider, setProvider] = React.useState<"vertex" | "openrouter" | "local">("local");
  const [honestyMode, setHonestyMode] = React.useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Account & model preferences"
        description="Per-user model and provider preferences. The honesty-first defaults cannot be disabled (the verdict badge is always on); they are surfaced here for transparency, not as a toggle."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
            LLM provider
          </CardTitle>
          <CardDescription>
            Which LLM powers the explain / hypothesize / summarise routes.
            Production default is vertex; local is fine for development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as typeof provider)}
            className="grid gap-3 sm:grid-cols-3"
          >
            <ProviderCard
              id="vertex"
              value="vertex"
              label="Vertex AI"
              current={provider}
              description="Production. Gemini 1.5 Pro. Higher cost, higher quality."
            />
            <ProviderCard
              id="openrouter"
              value="openrouter"
              label="OpenRouter"
              current={provider}
              description="Mix of providers. Cheaper, slightly noisier."
            />
            <ProviderCard
              id="local"
              value="local"
              label="Local"
              current={provider}
              description="Self-hosted Llama 3. Dev only — do not use for publication-grade runs."
            />
          </RadioGroup>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => toast({ title: "Saved", description: `LLM provider set to ${provider}` })} size="sm">
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
            Honesty-first defaults
          </CardTitle>
          <CardDescription>
            These cannot be turned off — they exist to surface what the
            platform always does, not to give you a way to hide it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Show verdict badges"
            description="Every claim carries color + text + tooltip."
            checked
            disabled
          />
          <ToggleRow
            label="Show ranking intervals (ties)"
            description="Rank is an interval, not a point. Ties are first-class."
            checked
            disabled
          />
          <ToggleRow
            label="Show evidence buttons on every claim"
            description="One click from any claim to its evidence graph."
            checked
            disabled
          />
          <ToggleRow
            label="Show disclaimer on every mechanism hypothesis"
            description="Disclaimer at the top of the panel, never buried."
            checked
            disabled
          />
          <ToggleRow
            label="Require typed reason at every checkpoint"
            description="Both approve and reject require a min-10-char reason."
            checked
            disabled
          />
          <ToggleRow
            label="Show cost badges on every metered button"
            description="You see the token cost before you click, every time."
            checked
            disabled
          />
          <ToggleRow
            label="Surface 402 as a modal — never silently fail"
            description="Auto-retry queued operation after top-up."
            checked
            disabled
          />
          <ToggleRow
            label="Strict honesty mode (rejects claims below coverage threshold)"
            description="When on, candidates below 0.20 coverage get verdict ABSTAIN instead of CANDIDATE."
            checked={honestyMode}
            onChange={setHonestyMode}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
            Build info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-xs">
          <Info label="App version" value={APP_META.version} />
          <Info label="Model version" value={APP_META.model_version} mono />
          <Info label="Frontend repo" value="github.com/phytospectra/frontend" mono />
          <Info label="API base (dev)" value="MSW mock" mono />
          <Info label="API base (prod)" value="api.phytospectra.com" mono />
          <Info label="License" value="AGPL-3.0" />
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderCard({
  id,
  value,
  label,
  current,
  description,
}: {
  id: string;
  value: string;
  label: string;
  current: string;
  description: string;
}) {
  return (
    <Label
      htmlFor={id}
      className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors ${
        current === value
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-slate-200 hover:border-emerald-400 dark:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value={value} id={id} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
