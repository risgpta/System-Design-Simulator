import { SimulationParams } from "@/hooks/useSimulation";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ControlPanelProps {
  params: SimulationParams;
  onParamsChange: (p: SimulationParams) => void;
}

function formatRPS(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-2.5">
      {children}
    </div>
  );
}

function SliderRow({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  leftLabel,
  rightLabel,
  testId,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-300 font-medium">{label}</span>
        <span className="text-[11px] font-mono text-cyan-400 font-bold">{valueLabel}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        data-testid={testId}
        className="cursor-pointer"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-[9px] text-slate-600">
          {leftLabel && <span>{leftLabel}</span>}
          {rightLabel && <span>{rightLabel}</span>}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/8 my-1" />;
}

export default function ControlPanel({ params, onParamsChange }: ControlPanelProps) {
  const set = (update: Partial<SimulationParams>) =>
    onParamsChange({ ...params, ...update });

  const effectivePool =
    params.lockingMode === "table"
      ? Math.max(1, Math.floor(params.dbPoolSize * 0.15))
      : params.dbPoolSize;
  const maxDbCapacity = effectivePool * 15;
  const readPct = Math.round(params.readRatio * 100);
  const writePct = 100 - readPct;

  return (
    <div
      className="w-72 flex-shrink-0 border-l border-white/10 bg-black/50 backdrop-blur-sm flex flex-col overflow-hidden"
      data-testid="control-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
          Controls
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          Adjust simulation parameters
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Traffic Volume */}
        <div>
          <SectionLabel>Traffic</SectionLabel>
          <SliderRow
            label="Traffic Volume"
            valueLabel={`${formatRPS(params.totalRPS)} RPS`}
            min={100}
            max={50000}
            step={100}
            value={params.totalRPS}
            onChange={(v) => set({ totalRPS: v })}
            leftLabel="100"
            rightLabel="50K"
            testId="slider-rps"
          />
        </div>

        <Divider />

        {/* Read / Write Ratio */}
        <div>
          <SectionLabel>Read / Write Ratio</SectionLabel>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-medium">Split</span>
              <span className="text-[11px] font-mono font-bold">
                <span className="text-cyan-400">{readPct}% R</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-amber-400">{writePct}% W</span>
              </span>
            </div>
            <Slider
              value={[params.readRatio * 100]}
              onValueChange={([v]) => set({ readRatio: v / 100 })}
              min={0}
              max={100}
              step={1}
              data-testid="slider-read-ratio"
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[9px]">
              <span className="text-amber-500/70">All Write</span>
              <span className="text-cyan-500/70">All Read</span>
            </div>
          </div>
        </div>

        <Divider />

        {/* Cache */}
        <div>
          <SectionLabel>Cache Layer</SectionLabel>
          <SliderRow
            label="Cache Hit Rate"
            valueLabel={`${Math.round(params.cacheHitRate * 100)}%`}
            min={0}
            max={100}
            step={1}
            value={params.cacheHitRate * 100}
            onChange={(v) => set({ cacheHitRate: v / 100 })}
            leftLabel="0% (all miss)"
            rightLabel="100% (all hit)"
            testId="slider-cache-hit-rate"
          />
        </div>

        <Divider />

        {/* Database */}
        <div>
          <SectionLabel>Database</SectionLabel>
          <div className="space-y-4">
            <SliderRow
              label="Connection Pool"
              valueLabel={`${params.dbPoolSize}`}
              min={1}
              max={200}
              step={1}
              value={params.dbPoolSize}
              onChange={(v) => set({ dbPoolSize: v })}
              leftLabel="1"
              rightLabel="200 conns"
              testId="slider-db-pool"
            />

            {/* Locking Mode */}
            <div className="rounded-lg border border-white/10 bg-white/4 p-3 space-y-2.5">
              <Label className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Locking Mode
              </Label>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-slate-200">
                    {params.lockingMode === "row" ? "Row-Level" : "Table-Level"}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                    {params.lockingMode === "row"
                      ? "Fine-grained, high concurrency"
                      : "Coarse-grained, reduces pool to 15%"}
                  </div>
                </div>
                <Switch
                  checked={params.lockingMode === "row"}
                  onCheckedChange={(checked) =>
                    set({ lockingMode: checked ? "row" : "table" })
                  }
                  data-testid="toggle-locking-mode"
                />
              </div>
              {params.lockingMode === "table" && (
                <div className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded px-2 py-1.5 leading-relaxed">
                  Table-level locking reduces effective pool from {params.dbPoolSize} to {effectivePool} connections
                </div>
              )}
            </div>
          </div>
        </div>

        <Divider />

        {/* Live Status */}
        <div>
          <SectionLabel>Derived Limits</SectionLabel>
          <div className="rounded-lg border border-white/10 bg-white/4 p-3 space-y-2">
            <StatusRow
              label="Effective Pool"
              value={`${effectivePool}`}
              unit="conns"
              warn={params.lockingMode === "table"}
            />
            <StatusRow
              label="DB Max Capacity"
              value={formatRPS(maxDbCapacity)}
              unit="RPS"
              warn={false}
            />
            <StatusRow
              label="Queue Drain Rate"
              value={formatRPS(maxDbCapacity * 0.3)}
              unit="RPS"
              warn={false}
            />
          </div>
        </div>

        {/* Hint */}
        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3">
          <div className="text-[9px] text-cyan-400/80 leading-relaxed">
            Try: push RPS past DB capacity to trigger a bottleneck. Watch the Database node stall and error particles appear.
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  unit,
  warn,
}: {
  label: string;
  value: string;
  unit: string;
  warn: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[9px] text-slate-500">{label}</span>
      <span
        className={`text-[10px] font-mono ${warn ? "text-amber-400" : "text-slate-300"}`}
      >
        {value} <span className="text-slate-600">{unit}</span>
      </span>
    </div>
  );
}
