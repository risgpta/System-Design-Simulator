import { SCENARIOS } from "@/data/scenarios";

interface ScenarioBarProps {
  currentScenarioId: string;
  onLoadScenario: (id: string) => void;
  totalRPS: number;
}

export default function ScenarioBar({
  currentScenarioId,
  onLoadScenario,
  totalRPS,
}: ScenarioBarProps) {
  // Approximate: 1 particle ≈ rpsPerParticle RPS
  const spawnPerSec = Math.min(10, totalRPS / 1600);
  const rpsPerParticle = spawnPerSec > 0 ? Math.round(totalRPS / Math.max(1, spawnPerSec)) : 160;

  return (
    <div
      className="flex items-center gap-1.5 px-4 h-9 border-b border-white/10 bg-black/30 flex-shrink-0 overflow-x-auto"
      data-testid="scenario-bar"
    >
      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mr-1 flex-shrink-0">
        Scenario
      </span>

      {SCENARIOS.map(s => (
        <button
          key={s.id}
          onClick={() => onLoadScenario(s.id)}
          className={`flex-shrink-0 text-[9px] font-mono px-2.5 py-1 rounded border transition-all duration-150 ${
            currentScenarioId === s.id
              ? "bg-cyan-400/10 border-cyan-400/40 text-cyan-300"
              : "border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20"
          }`}
          title={s.description}
        >
          {s.name}
        </button>
      ))}

      <button
        className={`flex-shrink-0 text-[9px] font-mono px-2.5 py-1 rounded border transition-all duration-150 ${
          currentScenarioId === 'custom'
            ? "bg-purple-400/10 border-purple-400/40 text-purple-300"
            : "border-white/10 text-slate-600 cursor-default"
        }`}
        disabled={currentScenarioId !== 'custom'}
      >
        Custom
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Particle density legend */}
      <div className="flex items-center gap-2 flex-shrink-0 border-l border-white/10 pl-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 4px #06b6d4" }} />
          <span className="text-[9px] font-mono text-slate-500">Read</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: "0 0 4px #f59e0b" }} />
          <span className="text-[9px] font-mono text-slate-500">Write</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 4px #22c55e" }} />
          <span className="text-[9px] font-mono text-slate-500">Cache Hit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-violet-400" style={{ boxShadow: "0 0 4px #7c3aed" }} />
          <span className="text-[9px] font-mono text-slate-500">Replication</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" style={{ boxShadow: "0 0 4px #ef4444" }} />
          <span className="text-[9px] font-mono text-slate-500">Error</span>
        </div>
        <div className="h-3 w-px bg-white/10 mx-1" />
        <span className="text-[9px] font-mono text-slate-600">
          1 dot ≈ <span className="text-slate-400">{rpsPerParticle.toLocaleString()}</span> RPS
        </span>
      </div>
    </div>
  );
}
