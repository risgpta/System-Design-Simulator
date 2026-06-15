import { SimulationMetrics } from "@/hooks/useSimulation";
import { Activity, Gauge, CheckCircle, AlertTriangle } from "lucide-react";

type Status = "normal" | "warning" | "critical";

function formatVal(v: number, isPercent?: boolean): string {
  if (isPercent) return v.toFixed(1);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.round(v).toString();
}

function MetricCard({ label, value, unit, icon, status }: {
  label: string; value: number; unit: string; icon: React.ReactNode; status: Status;
}) {
  const colors: Record<Status, string> = { normal: "text-cyan-400", warning: "text-amber-400", critical: "text-red-400" };
  const borders: Record<Status, string> = {
    normal: "border-white/10 bg-white/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    critical: "border-red-500/30 bg-red-500/5",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${borders[status]} transition-colors duration-500`} data-testid={`metric-card-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className={`${colors[status]} flex-shrink-0`}>{icon}</div>
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{label}</div>
        <div className={`text-lg font-mono font-bold leading-tight ${colors[status]}`}>
          {formatVal(value, unit === "%")}
          <span className="text-[10px] ml-1 opacity-60 font-normal">{unit}</span>
        </div>
      </div>
    </div>
  );
}

export default function TopBar({ metrics }: { metrics: SimulationMetrics }) {
  const latencyStatus: Status = metrics.avgLatency > 500 ? "critical" : metrics.avgLatency > 150 ? "warning" : "normal";
  const errorStatus: Status   = metrics.errorRate > 0.2  ? "critical" : metrics.errorRate > 0.05  ? "warning" : "normal";
  const successStatus: Status = metrics.successRate < 0.8 ? "critical" : metrics.successRate < 0.95 ? "warning" : "normal";

  return (
    <div className="flex items-center gap-3 px-5 h-[60px] border-b border-white/10 bg-black/50 backdrop-blur-sm flex-shrink-0" data-testid="top-bar">
      <div className="flex items-center gap-2.5 mr-3 flex-shrink-0">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-cyan-400/40 animate-pulse delay-75" />
          <div className="w-2 h-2 rounded-full bg-cyan-400/20 animate-pulse delay-150" />
        </div>
        <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">SDS</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">System Design Simulator</span>
      </div>

      <div className="h-6 w-px bg-white/10 flex-shrink-0" />

      <div className="flex gap-2 flex-1 overflow-x-auto">
        <MetricCard label="Throughput"  value={metrics.throughput}          unit="RPS" icon={<Activity className="w-4 h-4" />}       status="normal" />
        <MetricCard label="Avg Latency" value={metrics.avgLatency}          unit="ms"  icon={<Gauge className="w-4 h-4" />}           status={latencyStatus} />
        <MetricCard label="Success Rate"value={metrics.successRate * 100}   unit="%"   icon={<CheckCircle className="w-4 h-4" />}     status={successStatus} />
        <MetricCard label="Error Rate"  value={metrics.errorRate * 100}     unit="%"   icon={<AlertTriangle className="w-4 h-4" />}   status={errorStatus} />
      </div>

      {/* Failover / Crash indicator */}
      {metrics.failoverActive && (
        <div className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider">Failover Active</span>
        </div>
      )}
      {metrics.primaryCrashed && !metrics.failoverActive && (
        <div className="flex-shrink-0 flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">DB Crashed</span>
        </div>
      )}
    </div>
  );
}
