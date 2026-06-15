import { SimulationMetrics, LockingMode } from "@/hooks/useSimulation";

interface NodeCardProps {
  nodeKey: string;
  label: string;
  tag: string;
  color: string;
  metrics: SimulationMetrics;
  overloaded?: boolean;
  lockingMode?: LockingMode;
}

function fmt(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 10_000) return Math.round(v / 1_000) + "K";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.round(v).toString();
}

function StatRow({
  label,
  value,
  unit,
  bar,
  barColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  bar?: number;
  barColor?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center gap-2">
        <span className="text-[9px] text-slate-500 uppercase tracking-wider shrink-0">{label}</span>
        <span className="text-[10px] font-mono text-slate-200 tabular-nums">
          {typeof value === "number" ? fmt(value) : value}
          {unit && <span className="text-slate-500 ml-0.5 text-[8px]">{unit}</span>}
        </span>
      </div>
      {bar !== undefined && (
        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, bar))}%`,
              backgroundColor:
                barColor ??
                (bar > 80 ? "#ef4444" : bar > 60 ? "#f59e0b" : "#22c55e"),
            }}
          />
        </div>
      )}
    </div>
  );
}

function NodeStats({
  nodeKey,
  metrics,
}: {
  nodeKey: string;
  metrics: SimulationMetrics;
}) {
  switch (nodeKey) {
    case "clients":
      return (
        <>
          <StatRow label="Active" value={metrics.totalRPS * 5} unit="users" />
          <StatRow label="Sending" value={metrics.totalRPS} unit="RPS" />
        </>
      );
    case "lb":
      return (
        <>
          <StatRow label="Connections" value={metrics.activeConnections} />
          <StatRow label="Throughput" value={metrics.throughput} unit="RPS" />
        </>
      );
    case "api":
      return (
        <>
          <StatRow label="Req/sec" value={metrics.throughput} />
          <StatRow
            label="Error Rate"
            value={(metrics.errorRate * 100).toFixed(1)}
            unit="%"
            bar={metrics.errorRate * 100}
            barColor="#ef4444"
          />
        </>
      );
    case "cache": {
      const readRPS = metrics.readRPS;
      const hitPct = readRPS > 0 ? (metrics.cacheHitRPS / readRPS) * 100 : 0;
      return (
        <>
          <StatRow
            label="Hit Rate"
            value={hitPct.toFixed(1)}
            unit="%"
            bar={hitPct}
            barColor="#22c55e"
          />
          <StatRow
            label="Miss Rate"
            value={(100 - hitPct).toFixed(1)}
            unit="%"
          />
          <StatRow
            label="Memory"
            value={metrics.cacheMemoryPressure.toFixed(0)}
            unit="%"
            bar={metrics.cacheMemoryPressure}
          />
        </>
      );
    }
    case "queue":
      return (
        <>
          <StatRow label="Ingest" value={metrics.queueIngestionRate} unit="/s" />
          <StatRow label="Consume" value={metrics.queueConsumptionRate} unit="/s" />
          <StatRow label="Backlog" value={Math.round(metrics.queueDepth)} />
        </>
      );
    case "db":
      return (
        <>
          <StatRow label="Locks" value={metrics.dbActiveLocks} />
          <StatRow label="IOPS" value={metrics.dbIops} />
          <StatRow label="Wait" value={Math.round(metrics.queueWait)} unit="ms" />
        </>
      );
    default:
      return null;
  }
}

export default function NodeCard({
  nodeKey,
  label,
  tag,
  color,
  metrics,
  overloaded,
  lockingMode,
}: NodeCardProps) {
  const isStalled = overloaded;
  const stallLabel = lockingMode === "table" ? "TBL LOCKED" : "STALLED";

  return (
    <div
      className="rounded-lg border backdrop-blur-md p-2 transition-all duration-300 select-none"
      style={
        isStalled
          ? {
              borderColor: "rgba(239,68,68,0.5)",
              background: "rgba(10,5,5,0.85)",
              boxShadow: "0 0 24px rgba(239,68,68,0.25), 0 0 8px rgba(239,68,68,0.1)",
              minWidth: "148px",
            }
          : {
              borderColor: `${color}30`,
              background: "rgba(8,13,26,0.85)",
              boxShadow: `0 0 16px ${color}14, 0 0 4px ${color}08`,
              minWidth: "140px",
            }
      }
      data-testid={`node-card-${nodeKey}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isStalled ? "#ef4444" : color,
              animation: isStalled ? "pulse 0.8s ease-in-out infinite" : "pulse 2s ease-in-out infinite",
            }}
          />
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-widest"
            style={{ color: isStalled ? "#ef4444" : color }}
          >
            {tag}
          </span>
        </div>
        {isStalled && (
          <span className="text-[7px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 px-1 py-0.5 rounded leading-tight flex-shrink-0">
            {stallLabel}
          </span>
        )}
      </div>

      <div className="text-[10px] text-slate-300 font-medium mb-2 leading-tight">{label}</div>

      <div className="space-y-1.5">
        <NodeStats nodeKey={nodeKey} metrics={metrics} />
      </div>
    </div>
  );
}
