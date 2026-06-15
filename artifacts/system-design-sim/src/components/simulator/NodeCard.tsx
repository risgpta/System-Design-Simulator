import { GraphNode } from "@/types/graph";
import { SimulationMetrics, SimulationParams } from "@/hooks/useSimulation";
import { NODE_TYPE_META } from "@/data/nodeTypes";
import { SystemTopology } from "@/types/graph";

interface NodeCardProps {
  node: GraphNode;
  metrics: SimulationMetrics;
  params: SimulationParams;
  topology: SystemTopology;
}

function fmt(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 10_000) return Math.round(v / 1_000) + "K";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.round(v).toString();
}

function StatRow({ label, value, unit, bar, barColor }: {
  label: string; value: string | number; unit?: string; bar?: number; barColor?: string;
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
              backgroundColor: barColor ?? (bar > 80 ? "#ef4444" : bar > 60 ? "#f59e0b" : "#22c55e"),
            }}
          />
        </div>
      )}
    </div>
  );
}

function NodeStats({ node, metrics, params, topology }: NodeCardProps) {
  const active = (type: GraphNode["type"]) =>
    topology.nodes.filter(n => n.type === type && !n.crashed).length;

  switch (node.type) {
    case "clients":
      return (
        <>
          <StatRow label="Active" value={metrics.totalRPS * 5} unit="users" />
          <StatRow label="Sending" value={metrics.totalRPS} unit="RPS" />
        </>
      );
    case "cdn": {
      const offloadPct = metrics.cdnOffloadRPS > 0
        ? Math.round((metrics.cdnOffloadRPS / (metrics.readRPS + 0.001)) * 100)
        : 0;
      return (
        <>
          <StatRow label="Offload" value={metrics.cdnOffloadRPS} unit="RPS" />
          <StatRow label="Coverage" value={offloadPct} unit="%" bar={offloadPct} barColor="#7c3aed" />
        </>
      );
    }
    case "load_balancer":
      return (
        <>
          <StatRow label="Connections" value={metrics.activeConnections} />
          <StatRow label="Throughput" value={metrics.throughput} unit="RPS" />
        </>
      );
    case "api_server": {
      const numApi = metrics.numActiveApi;
      const perServer = numApi > 0 ? metrics.throughput / numApi : 0;
      return (
        <>
          <StatRow label="Req/Sec" value={perServer} />
          <StatRow label="Error Rate" value={(metrics.errorRate * 100).toFixed(1)} unit="%" bar={metrics.errorRate * 100} barColor="#ef4444" />
        </>
      );
    }
    case "cache_redis": {
      const readRPS = metrics.readRPS;
      const hitPct = readRPS > 0 ? (metrics.cacheHitRPS / readRPS) * 100 : 0;
      return (
        <>
          <StatRow label="Hit Rate" value={hitPct.toFixed(1)} unit="%" bar={hitPct} barColor="#22c55e" />
          <StatRow label="Miss Rate" value={(100 - hitPct).toFixed(1)} unit="%" />
          <StatRow label="Memory" value={metrics.cacheMemoryPressure.toFixed(0)} unit="%" bar={metrics.cacheMemoryPressure} />
        </>
      );
    }
    case "message_queue":
      return (
        <>
          <StatRow label="Ingest" value={metrics.queueIngestionRate} unit="/s" />
          <StatRow label="Consume" value={metrics.queueConsumptionRate} unit="/s" />
          <StatRow label="Backlog" value={Math.round(metrics.queueDepth)} />
        </>
      );
    case "worker": {
      const numW = Math.max(1, active("worker"));
      return (
        <>
          <StatRow label="Processing" value={metrics.queueConsumptionRate / numW} unit="/s" />
          <StatRow label="Queue Feed" value={metrics.queueIngestionRate} unit="/s" />
        </>
      );
    }
    case "db_primary": {
      const overload = metrics.dbOverload;
      return (
        <>
          <StatRow label="IOPS" value={metrics.dbIops} />
          <StatRow label="Locks" value={metrics.dbActiveLocks} />
          <StatRow label="Wait" value={Math.round(metrics.queueWait)} unit="ms" />
          {metrics.failoverActive && (
            <div className="text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1 py-0.5 mt-0.5">
              FAILOVER ACTIVE
            </div>
          )}
          {overload && !metrics.failoverActive && (
            <div className="text-[8px] font-mono text-red-400 bg-red-500/10 border border-red-500/30 rounded px-1 py-0.5 mt-0.5">
              {params.lockingMode === "table" ? "TBL LOCKED" : "STALLED"}
            </div>
          )}
        </>
      );
    }
    case "db_replica": {
      const numR = Math.max(1, active("db_replica"));
      const perReplica = metrics.effectiveDbReadCapacity / (numR + metrics.numActiveDbs);
      return (
        <>
          <StatRow label="Read Cap" value={Math.round(perReplica)} unit="RPS" />
          <StatRow label="Replicas" value={metrics.numActiveReplicas} unit="active" />
          <StatRow label="Lag" value={metrics.failoverActive ? "PROMOTED" : "~5ms"} />
        </>
      );
    }
    case "db_shard": {
      const numS = Math.max(1, active("db_shard"));
      return (
        <>
          <StatRow label="IOPS" value={Math.round(metrics.dbIops / numS)} unit="/shard" />
          <StatRow label="Shards" value={numS} unit="active" />
          <StatRow label="Wait" value={Math.round(metrics.queueWait)} unit="ms" />
        </>
      );
    }
    case "zookeeper":
      return (
        <>
          <StatRow label="Coord Ops" value={Math.round(metrics.totalRPS * 0.02)} unit="/s" />
          <StatRow label="Overhead" value="+2ms" />
        </>
      );
    case "file_storage":
      return (
        <>
          <StatRow label="Read Ops" value={Math.round(metrics.readRPS * 0.3)} unit="/s" />
          <StatRow label="Write Ops" value={Math.round(metrics.writeRPS * 0.2)} unit="/s" />
        </>
      );
    case "search_engine":
      return (
        <>
          <StatRow label="Queries" value={Math.round(metrics.readRPS * 0.4)} unit="/s" />
          <StatRow label="Index Ops" value={Math.round(metrics.writeRPS * 0.15)} unit="/s" />
        </>
      );
    default:
      return null;
  }
}

export default function NodeCard({ node, metrics, params, topology }: NodeCardProps) {
  const meta = NODE_TYPE_META[node.type];
  const isDbOverloaded = metrics.dbOverload &&
    (node.type === "db_primary" || node.type === "db_replica" || node.type === "db_shard") &&
    !node.crashed;

  const borderColor = node.crashed
    ? "rgba(239,68,68,0.6)"
    : isDbOverloaded
    ? "rgba(239,68,68,0.4)"
    : `${meta.color}30`;

  const bg = node.crashed
    ? "rgba(20,4,4,0.92)"
    : isDbOverloaded
    ? "rgba(10,5,5,0.88)"
    : "rgba(8,13,26,0.88)";

  const shadow = node.crashed
    ? "0 0 24px rgba(239,68,68,0.35), 0 0 8px rgba(239,68,68,0.15)"
    : isDbOverloaded
    ? "0 0 24px rgba(239,68,68,0.2)"
    : `0 0 16px ${meta.color}14, 0 0 4px ${meta.color}08`;

  return (
    <div
      className="rounded-lg border backdrop-blur-md p-1.5 md:p-2 transition-all duration-300 select-none relative overflow-hidden"
      style={{ borderColor, background: bg, boxShadow: shadow, minWidth: "120px" }}
      data-testid={`node-card-${node.type}`}
    >
      {/* Crashed overlay */}
      {node.crashed && (
        <div className="absolute inset-0 bg-red-950/40 flex items-center justify-center rounded-lg z-10">
          <div className="text-[11px] font-mono font-bold text-red-400 bg-red-950/80 border border-red-500/50 px-2 py-1 rounded">
            CRASHED
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: node.crashed ? "#ef4444" : isDbOverloaded ? "#ef4444" : meta.color,
              animation: (node.crashed || isDbOverloaded) ? "pulse 0.8s ease-in-out infinite" : "pulse 2s ease-in-out infinite",
            }}
          />
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-widest"
            style={{ color: node.crashed ? "#ef4444" : meta.color }}
          >
            {meta.tag}
          </span>
        </div>
        {isDbOverloaded && !node.crashed && (
          <span className="text-[7px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 px-1 py-0.5 rounded leading-tight flex-shrink-0">
            STALLED
          </span>
        )}
        {metrics.failoverActive && node.type === "db_replica" && (
          <span className="text-[7px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1 py-0.5 rounded leading-tight flex-shrink-0">
            PRIMARY
          </span>
        )}
      </div>

      <div className="text-[10px] text-slate-300 font-medium mb-2 leading-tight">
        {node.label ?? meta.label}
      </div>

      <div className="space-y-1.5">
        <NodeStats node={node} metrics={metrics} params={params} topology={topology} />
      </div>
    </div>
  );
}
