import { useEffect, useRef } from "react";
import { SystemTopology, GraphEdge, GraphNode, TrafficType } from "@/types/graph";
import { SimulationMetrics, SimulationParams } from "@/hooks/useSimulation";
import { NODE_TYPE_META } from "@/data/nodeTypes";
import NodeCard from "./NodeCard";

const SVG_W = 1000;
const SVG_H = 560;
const MAX_PARTICLES = 250;

interface Particle {
  x0n: number; y0n: number;
  x1n: number; y1n: number;
  progress: number;
  type: string;
  speed: number;
}

const EDGE_COLORS: Record<TrafficType, string> = {
  read:         "#06b6d4",
  write:        "#f59e0b",
  mixed:        "#94a3b8",
  cacheHit:     "#22c55e",
  replication:  "#7c3aed",
  coordination: "#84cc16",
};

const PARTICLE_COLORS: Record<string, string> = {
  read:         "#06b6d4",
  write:        "#f59e0b",
  cacheHit:     "#22c55e",
  replication:  "#7c3aed",
  coordination: "#84cc16",
  error:        "#ef4444",
};

function getEdgeSpawnRate(edge: GraphEdge, m: SimulationMetrics): number {
  const s = 1 / 1600;
  const cap = 10;
  switch (edge.trafficType) {
    case "read":         return Math.min(cap, m.readRPS * s);
    case "write":        return Math.min(cap, m.writeRPS * s);
    case "mixed":        return Math.min(cap, m.totalRPS * s);
    case "cacheHit":     return Math.min(cap, m.cacheHitRPS * s);
    case "replication":  return Math.min(3, m.writeRPS * s * 0.5);
    case "coordination": return 0.7;
    default:             return 0;
  }
}

function getParticleType(edge: GraphEdge, m: SimulationMetrics): string {
  if (
    m.dbOverload &&
    Math.random() < 0.18 &&
    (edge.trafficType === "write" || edge.trafficType === "mixed")
  ) return "error";
  if (edge.trafficType === "mixed") {
    const total = m.readRPS + m.writeRPS + 0.001;
    return Math.random() < m.readRPS / total ? "read" : "write";
  }
  return edge.trafficType;
}

interface NodeGraphProps {
  topology: SystemTopology;
  metrics: SimulationMetrics;
  params: SimulationParams;
  onToggleCrash: (nodeId: string) => void;
}

export default function NodeGraph({ topology, metrics, params, onToggleCrash }: NodeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const metricsRef = useRef(metrics);
  const topologyRef = useRef(topology);
  const sizeRef = useRef({ w: 0, h: 0 });
  const lastTimeRef = useRef(0);
  const edgeAccRef = useRef<Map<string, number>>(new Map());

  useEffect(() => { metricsRef.current = metrics; }, [metrics]);
  useEffect(() => { topologyRef.current = topology; }, [topology]);

  // Reset accumulators when scenario changes
  useEffect(() => {
    edgeAccRef.current = new Map();
    particlesRef.current = [];
  }, [topology.scenarioId]);

  // Track canvas / container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sync = (w: number, h: number) => {
      sizeRef.current = { w, h };
      const c = canvasRef.current;
      if (c) { c.width = Math.round(w); c.height = Math.round(h); }
    };
    sync(container.clientWidth, container.clientHeight);
    const obs = new ResizeObserver(([e]) => sync(e.contentRect.width, e.contentRect.height));
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Animation loop — reads only from refs
  useEffect(() => {
    const animate = (time: number) => {
      const dt = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 100) : 16;
      lastTimeRef.current = time;

      const m = metricsRef.current;
      const topo = topologyRef.current;
      const { w, h } = sizeRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || w === 0 || h === 0) { animRef.current = requestAnimationFrame(animate); return; }

      const speed = Math.min(0.003, Math.max(0.0004, 0.016 / (m.avgLatency / 10)));

      // Build fast lookup
      const nodeMap = new Map<string, GraphNode>(topo.nodes.map(n => [n.id, n]));
      const crashedIds = new Set(topo.nodes.filter(n => n.crashed).map(n => n.id));

      // Spawn particles per edge
      for (const edge of topo.edges) {
        if (crashedIds.has(edge.from) || crashedIds.has(edge.to)) continue;
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) continue;

        const rate = getEdgeSpawnRate(edge, m);
        const acc = (edgeAccRef.current.get(edge.id) ?? 0) + rate * dt / 1000;
        const toSpawn = Math.floor(acc);
        edgeAccRef.current.set(edge.id, acc - toSpawn);

        for (let i = 0; i < Math.min(toSpawn, 3); i++) {
          if (particlesRef.current.length >= MAX_PARTICLES) break;
          particlesRef.current.push({
            x0n: fromNode.x, y0n: fromNode.y,
            x1n: toNode.x,   y1n: toNode.y,
            progress: 0,
            type: getParticleType(edge, m),
            speed,
          });
        }
      }

      // Advance & cull
      const next: Particle[] = [];
      for (const p of particlesRef.current) {
        const prog = p.progress + p.speed * dt;
        if (prog < 1.0) next.push({ ...p, progress: prog });
      }
      particlesRef.current = next;

      // Draw
      ctx.clearRect(0, 0, w, h);
      const r = Math.max(2.5, 3.2 * (w / 1000));

      for (const p of particlesRef.current) {
        const px = (p.x0n + (p.x1n - p.x0n) * p.progress) * w;
        const py = (p.y0n + (p.y1n - p.y0n) * p.progress) * h;
        const fade = p.progress < 0.08 ? p.progress / 0.08 : p.progress > 0.92 ? (1 - p.progress) / 0.08 : 1;
        const alpha = Math.max(0, Math.min(1, fade));
        const col = PARTICLE_COLORS[p.type] ?? "#06b6d4";

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowBlur = 12;
        ctx.shadowColor = col;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = alpha * 0.55;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const nodeMap = new Map(topology.nodes.map(n => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 50%, #0c1428 0%, #070b14 60%, #050810 100%)" }}
      data-testid="node-graph"
    >
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a2640" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />
      </svg>

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
        {topology.edges.map(edge => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const crashed = from.crashed || to.crashed;
          const col = EDGE_COLORS[edge.trafficType];
          return (
            <g key={edge.id}>
              <line
                x1={from.x * SVG_W} y1={from.y * SVG_H}
                x2={to.x * SVG_W}   y2={to.y * SVG_H}
                stroke={col} strokeWidth="4" strokeOpacity={crashed ? "0.02" : "0.06"}
              />
              <line
                x1={from.x * SVG_W} y1={from.y * SVG_H}
                x2={to.x * SVG_W}   y2={to.y * SVG_H}
                stroke={col} strokeWidth="1.2"
                strokeOpacity={crashed ? "0.06" : "0.25"}
                strokeDasharray="10 7"
              />
            </g>
          );
        })}
      </svg>

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }} />

      {/* Node cards */}
      {topology.nodes.map(node => {
        const meta = NODE_TYPE_META[node.type];
        return (
          <div
            key={node.id}
            className="absolute group"
            style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}
          >
            <NodeCard node={node} metrics={metrics} params={params} topology={topology} />
            {node.type !== "clients" && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCrash(node.id); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 border border-white/20 cursor-pointer select-none"
                style={{
                  background: node.crashed ? "#16a34a" : "#dc2626",
                  boxShadow: node.crashed ? "0 0 6px #16a34a88" : "0 0 6px #dc262688",
                }}
                title={node.crashed ? `Recover ${meta.label}` : `Crash ${meta.label}`}
              >
                {node.crashed ? "+" : "x"}
              </button>
            )}
          </div>
        );
      })}

      {topology.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-slate-600 font-mono text-sm">
            Load a scenario or add components from the Topology tab
          </p>
        </div>
      )}
    </div>
  );
}
