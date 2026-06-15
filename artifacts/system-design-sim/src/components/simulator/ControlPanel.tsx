import { useState } from "react";
import { SimulationParams, SimulationMetrics } from "@/hooks/useSimulation";
import { SystemTopology, NodeType, CapMode } from "@/types/graph";
import { NODE_TYPE_META, PALETTE_CATEGORIES } from "@/data/nodeTypes";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ControlPanelProps {
  params: SimulationParams;
  topology: SystemTopology;
  metrics: SimulationMetrics;
  onParamsChange: (p: SimulationParams) => void;
  onAddNode: (type: NodeType) => void;
  onRemoveNode: (nodeId: string) => void;
  onToggleCrash: (nodeId: string) => void;
  onLoadScenario: (id: string) => void;
  onSetCapMode: (mode: CapMode) => void;
}

type Tab = "controls" | "topology" | "calc" | "learn";
const TABS: { id: Tab; label: string }[] = [
  { id: "controls",  label: "Controls"  },
  { id: "topology",  label: "Topology"  },
  { id: "calc",      label: "Calc"      },
  { id: "learn",     label: "Learn"     },
];

function fmt(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${Math.round(v)}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-2 mt-1">{children}</div>
  );
}

function Divider() { return <div className="h-px bg-white/8 my-3" />; }

function SliderRow({ label, valueLabel, min, max, step, value, onChange, leftLabel, rightLabel, testId }: {
  label: string; valueLabel: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; leftLabel?: string; rightLabel?: string; testId: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-300 font-medium">{label}</span>
        <span className="text-[11px] font-mono text-cyan-400 font-bold">{valueLabel}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} data-testid={testId} className="cursor-pointer" />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-[9px] text-slate-600">
          {leftLabel && <span>{leftLabel}</span>}
          {rightLabel && <span>{rightLabel}</span>}
        </div>
      )}
    </div>
  );
}

function CalcRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-[10px] font-mono ${highlight ? "text-cyan-400 font-bold" : "text-slate-300"}`}>{value}</span>
    </div>
  );
}

function Tip({ type, text }: { type: "danger" | "warning" | "info" | "success"; text: string }) {
  const cls = {
    danger:  "bg-red-900/20 border-red-500/30 text-red-300",
    warning: "bg-amber-900/20 border-amber-500/30 text-amber-300",
    info:    "bg-blue-900/20 border-blue-500/30 text-blue-300",
    success: "bg-green-900/20 border-green-500/30 text-green-300",
  }[type];
  return <div className={`text-[10px] font-mono p-2 rounded border leading-relaxed ${cls}`}>{text}</div>;
}

function ConceptRow({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/8 rounded overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-white/5">
        <span className="text-[10px] font-mono text-slate-300">{label}</span>
        <span className="text-[9px] text-slate-600">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 text-[9px] text-slate-500 font-mono leading-relaxed border-t border-white/8">
          {text}
        </div>
      )}
    </div>
  );
}

/* ─── Controls Tab ─────────────────────────────────────────── */
function ControlsTab({ params, metrics, topology, onParamsChange, onSetCapMode }: {
  params: SimulationParams; metrics: SimulationMetrics; topology: SystemTopology;
  onParamsChange: (p: SimulationParams) => void; onSetCapMode: (m: CapMode) => void;
}) {
  const set = (u: Partial<SimulationParams>) => onParamsChange({ ...params, ...u });
  const readPct  = Math.round(params.readRatio * 100);
  const writePct = 100 - readPct;

  return (
    <div className="p-4 space-y-4">
      <div>
        <SectionLabel>Traffic</SectionLabel>
        <SliderRow label="Traffic Volume" valueLabel={`${fmt(params.totalRPS)} RPS`}
          min={100} max={50000} step={100} value={params.totalRPS}
          onChange={v => set({ totalRPS: v })} leftLabel="100" rightLabel="50K" testId="slider-rps" />
      </div>
      <Divider />
      <div>
        <SectionLabel>Read / Write Ratio</SectionLabel>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-medium">Split</span>
            <span className="text-[11px] font-mono font-bold">
              <span className="text-cyan-400">{readPct}% R</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-amber-400">{writePct}% W</span>
            </span>
          </div>
          <Slider value={[params.readRatio * 100]} onValueChange={([v]) => set({ readRatio: v / 100 })} min={0} max={100} step={1} data-testid="slider-read-ratio" className="cursor-pointer" />
          <div className="flex justify-between text-[9px]">
            <span className="text-amber-500/70">All Write</span>
            <span className="text-cyan-500/70">All Read</span>
          </div>
        </div>
      </div>
      <Divider />
      <div>
        <SectionLabel>Cache Layer</SectionLabel>
        <SliderRow label="Cache Hit Rate" valueLabel={`${Math.round(params.cacheHitRate * 100)}%`}
          min={0} max={100} step={1} value={params.cacheHitRate * 100}
          onChange={v => set({ cacheHitRate: v / 100 })} leftLabel="0% (all miss)" rightLabel="100% (all hit)" testId="slider-cache-hit-rate" />
      </div>
      <Divider />
      <div>
        <SectionLabel>Database</SectionLabel>
        <div className="space-y-4">
          <SliderRow label="Connection Pool" valueLabel={`${params.dbPoolSize}`}
            min={1} max={200} step={1} value={params.dbPoolSize}
            onChange={v => set({ dbPoolSize: v })} leftLabel="1" rightLabel="200 conns" testId="slider-db-pool" />
          <div className="rounded-lg border border-white/10 bg-white/4 p-3 space-y-2.5">
            <Label className="text-[11px] text-slate-400 uppercase tracking-wider block">Locking Mode</Label>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium text-slate-200">
                  {params.lockingMode === "row" ? "Row-Level" : "Table-Level"}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {params.lockingMode === "row" ? "Fine-grained, high concurrency" : "Coarse-grained, pool at 15%"}
                </div>
              </div>
              <Switch checked={params.lockingMode === "row"} onCheckedChange={c => set({ lockingMode: c ? "row" : "table" })} data-testid="toggle-locking-mode" />
            </div>
          </div>
        </div>
      </div>
      <Divider />
      <div>
        <SectionLabel>Consistency Model</SectionLabel>
        <div className="rounded-lg border border-white/10 bg-white/4 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium text-slate-200">
                {topology.capMode === "cp" ? "CP — Consistent" : "AP — Available"}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {topology.capMode === "cp"
                  ? "Drop requests when overloaded; never return stale data"
                  : "Serve stale data under load; near-zero drop rate"}
              </div>
            </div>
            <Switch checked={topology.capMode === "ap"} onCheckedChange={c => onSetCapMode(c ? "ap" : "cp")} />
          </div>
          <div className="flex gap-1.5 text-[9px] font-mono">
            <span className={`px-1.5 py-0.5 rounded border ${topology.capMode === "cp" ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" : "text-slate-600 border-white/10"}`}>CP</span>
            <span className={`px-1.5 py-0.5 rounded border ${topology.capMode === "ap" ? "text-green-400 border-green-500/40 bg-green-500/10" : "text-slate-600 border-white/10"}`}>AP</span>
          </div>
        </div>
      </div>
      <Divider />
      <div>
        <SectionLabel>Live Capacity</SectionLabel>
        <div className="rounded-lg border border-white/10 bg-white/4 p-3 space-y-1.5">
          <CalcRow label="Write Capacity" value={`${fmt(metrics.effectiveDbWriteCapacity)} RPS`} />
          <CalcRow label="Read Capacity"  value={`${fmt(metrics.effectiveDbReadCapacity)} RPS`} />
          <CalcRow label="Active DB Units" value={`${metrics.numActiveDbs + metrics.numActiveReplicas}`} />
          <CalcRow label="CDN Offload"    value={metrics.cdnOffloadRPS > 0 ? `${fmt(metrics.cdnOffloadRPS)} RPS` : "none"} />
        </div>
      </div>
    </div>
  );
}

/* ─── Topology Tab ─────────────────────────────────────────── */
function TopologyTab({ topology, onAddNode, onRemoveNode, onToggleCrash }: {
  topology: SystemTopology;
  onAddNode: (t: NodeType) => void;
  onRemoveNode: (id: string) => void;
  onToggleCrash: (id: string) => void;
}) {
  return (
    <div className="p-3 space-y-4">
      <div>
        <SectionLabel>Add Component</SectionLabel>
        <div className="space-y-2">
          {PALETTE_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div className="text-[8px] font-mono uppercase tracking-widest text-slate-700 mb-1">{cat.label}</div>
              <div className="flex flex-wrap gap-1">
                {cat.types.map(type => {
                  const meta = NODE_TYPE_META[type];
                  return (
                    <button
                      key={type}
                      onClick={() => onAddNode(type)}
                      title={meta.description}
                      className="text-[9px] font-mono px-2 py-1 rounded border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all duration-100 flex items-center gap-1"
                      style={{ color: meta.color }}
                    >
                      <span className="font-bold">{meta.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      <div>
        <SectionLabel>Active Nodes ({topology.nodes.length})</SectionLabel>
        <div className="space-y-1">
          {topology.nodes.map(node => {
            const meta = NODE_TYPE_META[node.type];
            return (
              <div
                key={node.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${node.crashed ? "border-red-500/30 bg-red-950/20" : "border-white/8 bg-white/3"}`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: node.crashed ? "#ef4444" : meta.color }}
                />
                <span className="text-[9px] font-mono text-slate-400 flex-1 truncate">
                  <span style={{ color: meta.color }} className="font-bold">{meta.tag}</span>
                  {" "}{meta.label}
                </span>
                {node.crashed && (
                  <span className="text-[7px] font-mono text-red-400 border border-red-500/40 px-1 rounded flex-shrink-0">CRASH</span>
                )}
                {node.type !== "clients" && (
                  <>
                    <button
                      onClick={() => onToggleCrash(node.id)}
                      className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${node.crashed ? "border-green-500/40 text-green-400 hover:bg-green-500/10" : "border-red-500/30 text-red-400 hover:bg-red-500/10"}`}
                      title={node.crashed ? "Recover node" : "Crash node"}
                    >
                      {node.crashed ? "Rec" : "Crash"}
                    </button>
                    <button
                      onClick={() => onRemoveNode(node.id)}
                      className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-slate-600 hover:text-slate-400 hover:border-white/20 transition-colors flex-shrink-0"
                      title="Remove node"
                    >
                      Del
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded border border-cyan-500/15 bg-cyan-500/5 p-2.5">
        <div className="text-[9px] text-cyan-400/80 leading-relaxed font-mono">
          Hover any node card on the graph to see the crash button. Crash a DB Primary to trigger failover if replicas exist.
        </div>
      </div>
    </div>
  );
}

/* ─── Calculations Tab ─────────────────────────────────────── */
function CalcTab({ params, metrics, topology }: {
  params: SimulationParams; metrics: SimulationMetrics; topology: SystemTopology;
}) {
  const [recordSizeKB, setRecordSizeKB] = useState(1);
  const [retention, setRetention] = useState(5);
  const [reqSizeKB, setReqSizeKB] = useState(5);

  const writesPerDay = metrics.writeRPS * 86400;
  const dailyStorageGB = (writesPerDay * recordSizeKB * 1024) / (1024 ** 3);
  const totalStorageGB = dailyStorageGB * 365 * retention;
  const replicaFactor = metrics.numActiveReplicas + Math.max(1, metrics.numActiveDbs);
  const storageWithReplicas = totalStorageGB * Math.max(1, metrics.numActiveReplicas + 1);

  const bandwidthMbps = (metrics.totalRPS * reqSizeKB * 8) / 1024;
  const bandwidthGbps = bandwidthMbps / 1024;

  const numShards = topology.nodes.filter(n => n.type === "db_shard" && !n.crashed).length;
  const numReplicas = metrics.numActiveReplicas;

  const cacheReqSavedPerDay = metrics.cacheHitRPS * 86400;

  return (
    <div className="p-3 space-y-3">
      <div>
        <SectionLabel>Traffic</SectionLabel>
        <div className="rounded border border-white/10 bg-white/3 p-2.5 space-y-0.5">
          <CalcRow label="Incoming RPS"    value={`${fmt(metrics.totalRPS)} /s`} highlight />
          <CalcRow label="Read RPS"        value={`${fmt(metrics.readRPS)} /s`} />
          <CalcRow label="Write RPS"       value={`${fmt(metrics.writeRPS)} /s`} />
          <CalcRow label="CDN offload"     value={metrics.cdnOffloadRPS > 0 ? `${fmt(metrics.cdnOffloadRPS)} /s` : "—"} />
          <CalcRow label="Cache serves"    value={metrics.cacheHitRPS > 0 ? `${fmt(metrics.cacheHitRPS)} /s` : "—"} />
          <CalcRow label="DB reads/s"      value={`${fmt(metrics.dbIncomingRPS)} /s`} highlight={metrics.dbOverload} />
        </div>
      </div>

      <div>
        <SectionLabel>Storage (record size: {recordSizeKB}KB)</SectionLabel>
        <div className="mb-2">
          <Slider value={[recordSizeKB]} onValueChange={([v]) => setRecordSizeKB(v)} min={0.1} max={100} step={0.1} className="cursor-pointer" />
          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
            <span>0.1KB</span><span>100KB</span>
          </div>
        </div>
        <div className="rounded border border-white/10 bg-white/3 p-2.5 space-y-0.5">
          <CalcRow label="Writes/day"      value={writesPerDay > 1e9 ? `${(writesPerDay / 1e9).toFixed(1)}B` : `${(writesPerDay / 1e6).toFixed(0)}M`} />
          <CalcRow label="Storage/day"     value={`${dailyStorageGB < 1 ? `${(dailyStorageGB * 1024).toFixed(0)} MB` : `${dailyStorageGB.toFixed(1)} GB`}`} />
          <CalcRow label={`${retention}yr raw`} value={totalStorageGB > 1024 ? `${(totalStorageGB / 1024).toFixed(1)} TB` : `${totalStorageGB.toFixed(0)} GB`} highlight />
          <CalcRow label={`×${metrics.numActiveReplicas + 1} replication`} value={storageWithReplicas > 1024 ? `${(storageWithReplicas / 1024).toFixed(1)} TB` : `${storageWithReplicas.toFixed(0)} GB`} />
        </div>
        <div className="mt-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-500 font-mono">Retention: {retention} yrs</span>
          </div>
          <Slider value={[retention]} onValueChange={([v]) => setRetention(v)} min={1} max={20} step={1} className="cursor-pointer" />
        </div>
      </div>

      <div>
        <SectionLabel>Bandwidth (req size: {reqSizeKB}KB)</SectionLabel>
        <div className="mb-2">
          <Slider value={[reqSizeKB]} onValueChange={([v]) => setReqSizeKB(v)} min={0.5} max={500} step={0.5} className="cursor-pointer" />
        </div>
        <div className="rounded border border-white/10 bg-white/3 p-2.5 space-y-0.5">
          <CalcRow label="Ingress/Egress" value={bandwidthGbps > 1 ? `${bandwidthGbps.toFixed(2)} Gbps` : `${bandwidthMbps.toFixed(0)} Mbps`} highlight />
          <CalcRow label="Per req"        value={`${reqSizeKB} KB`} />
        </div>
      </div>

      <div>
        <SectionLabel>Database Sizing</SectionLabel>
        <div className="rounded border border-white/10 bg-white/3 p-2.5 space-y-0.5">
          <CalcRow label="Write capacity"   value={`${fmt(metrics.effectiveDbWriteCapacity)} RPS`} highlight={metrics.dbOverload} />
          <CalcRow label="Read capacity"    value={`${fmt(metrics.effectiveDbReadCapacity)} RPS`} />
          <CalcRow label="Pool per node"    value={`${params.dbPoolSize} conns`} />
          <CalcRow label="Shards"           value={numShards > 0 ? `${numShards}` : "—"} />
          <CalcRow label="Read replicas"    value={numReplicas > 0 ? `${numReplicas}` : "—"} />
          <CalcRow label="Conn needed"      value={`~${Math.ceil(metrics.totalRPS / 15)}`} highlight />
        </div>
      </div>

      <div>
        <SectionLabel>Cache Impact</SectionLabel>
        <div className="rounded border border-white/10 bg-white/3 p-2.5 space-y-0.5">
          <CalcRow label="Requests saved/day" value={cacheReqSavedPerDay > 1e9 ? `${(cacheReqSavedPerDay / 1e9).toFixed(1)}B` : `${(cacheReqSavedPerDay / 1e6).toFixed(0)}M`} highlight />
          <CalcRow label="DB load reduction"  value={metrics.cacheHitRPS > 0 ? `${Math.round((metrics.cacheHitRPS / (metrics.readRPS + 0.001)) * 100)}%` : "—"} />
        </div>
      </div>
    </div>
  );
}

/* ─── Learn Tab ─────────────────────────────────────────────── */
function LearnTab({ params, metrics, topology }: {
  params: SimulationParams; metrics: SimulationMetrics; topology: SystemTopology;
}) {
  const tips: { type: "danger" | "warning" | "info" | "success"; text: string }[] = [];

  const hasCache    = topology.nodes.some(n => n.type === "cache_redis" && !n.crashed);
  const hasQueue    = topology.nodes.some(n => n.type === "message_queue" && !n.crashed);
  const hasReplica  = metrics.numActiveReplicas > 0;
  const hasShards   = topology.nodes.some(n => n.type === "db_shard" && !n.crashed);
  const hasCDN      = topology.nodes.some(n => n.type === "cdn" && !n.crashed);
  const noDB        = metrics.numActiveDbs === 0 && !hasShards;

  if (noDB) {
    tips.push({ type: "danger", text: "No active database nodes. Add a DB Primary or DB Shard — the system cannot persist data without one." });
  }
  if (metrics.dbOverload && !hasCache && params.readRatio > 0.5) {
    tips.push({ type: "warning", text: `DB is overloaded with ${Math.round(params.readRatio * 100)}% reads. Add a Redis cache: at 70% hit rate it reduces DB read load by ~3.3×.` });
  }
  if (metrics.dbOverload && !hasReplica && !hasShards && params.readRatio > 0.5) {
    tips.push({ type: "warning", text: "Add Read Replicas to scale read throughput. Each replica adds a full independent pool — reads scale linearly." });
  }
  if (metrics.dbOverload && !hasQueue && (1 - params.readRatio) > 0.4) {
    tips.push({ type: "warning", text: "Write-heavy load is stressing the DB. Add a Kafka queue to buffer and drain writes at a controlled rate (3× smoothing factor)." });
  }
  if (metrics.dbOverload && !hasShards && metrics.numActiveDbs <= 1) {
    tips.push({ type: "info", text: "DB is at capacity. Add Shards to distribute load horizontally — each shard provides a full independent write pool." });
  }
  if (metrics.primaryCrashed && !hasReplica) {
    tips.push({ type: "danger", text: "DB Primary crashed with no read replicas. Zero redundancy: all data writes are failing. Add Read Replicas for HA." });
  }
  if (metrics.failoverActive) {
    tips.push({ type: "warning", text: "Failover in progress. A replica is acting as primary. Writes may be 30ms slower. Add a new Primary to restore full capacity." });
  }
  if (params.lockingMode === "table") {
    tips.push({ type: "info", text: "Table-level locking cuts effective pool to 15%. Row-level locking recovers 6× DB concurrency at the cost of slightly more overhead." });
  }
  if (!hasCDN && params.readRatio > 0.7 && metrics.totalRPS > 5000) {
    tips.push({ type: "info", text: "Read-heavy high-traffic system with no CDN. A CDN offloads ~35% of reads globally, saving both bandwidth and origin latency." });
  }
  if (metrics.cdnOffloadRPS > 0) {
    tips.push({ type: "success", text: `CDN is serving ${fmt(metrics.cdnOffloadRPS)} RPS without hitting your origin. At scale this saves significant bandwidth cost.` });
  }
  if (metrics.successRate === 1 && metrics.errorRate === 0 && metrics.totalRPS > 0) {
    tips.push({ type: "success", text: "System healthy. Increase RPS, crash nodes, or switch locking mode to observe failure patterns." });
  }

  return (
    <div className="p-3 space-y-4">
      <div>
        <SectionLabel>System Analysis</SectionLabel>
        <div className="space-y-2">
          {tips.map((t, i) => <Tip key={i} type={t.type} text={t.text} />)}
        </div>
      </div>

      <Divider />

      <div>
        <SectionLabel>CAP Theorem</SectionLabel>
        <div className="rounded border border-white/10 bg-white/3 p-2.5 space-y-2">
          <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
            Any distributed system can guarantee only 2 of: <strong className="text-slate-200">Consistency</strong>, <strong className="text-slate-200">Availability</strong>, <strong className="text-slate-200">Partition Tolerance</strong>. Network partitions are unavoidable — so you always choose CP or AP.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-cyan-900/20 border border-cyan-500/30 rounded p-2">
              <div className="text-[9px] font-mono text-cyan-400 font-bold">CP Mode</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">Drop requests when overloaded. Never return stale data. Good for financial systems.</div>
            </div>
            <div className="flex-1 bg-green-900/20 border border-green-500/30 rounded p-2">
              <div className="text-[9px] font-mono text-green-400 font-bold">AP Mode</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">Serve stale data under load. Near-zero drop rate. Good for social feeds.</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Key Concepts</SectionLabel>
        <div className="space-y-1.5">
          <ConceptRow label="Cache-Aside Pattern" text="App checks cache first; on miss, reads from DB and writes result back to cache. At 80% hit rate, you make ~5× fewer DB calls. Cache invalidation is the hard part." />
          <ConceptRow label="Horizontal Sharding" text="Partition data by a key (user ID, region). Each shard holds 1/N of the dataset and serves 1/N of the load. Enables near-unlimited write scale but adds routing complexity." />
          <ConceptRow label="Read Replicas" text="Async replication from primary to read replicas. Reads distribute across all replicas; writes always go to primary. Effective for 80%+ read workloads." />
          <ConceptRow label="Message Queue Buffering" text="Producers write to queue; consumers process at steady rate. Absorbs write bursts, prevents DB spikes, decouples services. Kafka retains messages for replay." />
          <ConceptRow label="CDN Edge Caching" text="Static/semi-static content cached at PoPs worldwide. Reduces origin load, cuts latency (request served <50ms away), and provides DDoS protection." />
          <ConceptRow label="Leader Election (Zookeeper)" text="In distributed clusters, one node is designated leader for coordination. Zookeeper handles leader election, config distribution, and distributed locks." />
          <ConceptRow label="Failover & HA" text="When primary fails, a replica promotes to primary (automatic or manual). Zero data loss requires synchronous replication. Recovery time depends on health check interval." />
          <ConceptRow label="Connection Pool" text="DB connections are expensive to open. A pool pre-allocates N connections and re-uses them. Pool size limits max concurrent DB operations. Always tune this first." />
        </div>
      </div>
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────────── */
export default function ControlPanel({
  params, topology, metrics,
  onParamsChange, onAddNode, onRemoveNode, onToggleCrash, onLoadScenario: _onLoadScenario, onSetCapMode,
}: ControlPanelProps) {
  const [tab, setTab] = useState<Tab>("controls");

  return (
    <div className="w-80 flex-shrink-0 border-l border-white/10 bg-black/50 backdrop-blur-sm flex flex-col overflow-hidden" data-testid="control-panel">
      {/* Tab bar */}
      <div className="flex border-b border-white/10 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-[9px] py-2 font-mono uppercase tracking-wider transition-colors duration-150 ${
              tab === t.id
                ? "text-cyan-400 border-b border-cyan-400 bg-cyan-400/5"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "controls"  && <ControlsTab  params={params} metrics={metrics} topology={topology} onParamsChange={onParamsChange} onSetCapMode={onSetCapMode} />}
        {tab === "topology"  && <TopologyTab  topology={topology} onAddNode={onAddNode} onRemoveNode={onRemoveNode} onToggleCrash={onToggleCrash} />}
        {tab === "calc"      && <CalcTab      params={params} metrics={metrics} topology={topology} />}
        {tab === "learn"     && <LearnTab     params={params} metrics={metrics} topology={topology} />}
      </div>
    </div>
  );
}
