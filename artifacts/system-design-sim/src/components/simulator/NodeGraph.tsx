import { useEffect, useRef } from "react";
import { SimulationMetrics, SimulationParams } from "@/hooks/useSimulation";
import NodeCard from "./NodeCard";

const SVG_W = 1000;
const SVG_H = 520;

const NODES = {
  clients: { key: "clients", x: 0.08, y: 0.50, label: "Clients", color: "#8b5cf6", tag: "CLIENT" },
  lb:      { key: "lb",      x: 0.26, y: 0.50, label: "Load Balancer", color: "#3b82f6", tag: "LB" },
  api:     { key: "api",     x: 0.44, y: 0.50, label: "API Gateway", color: "#06b6d4", tag: "APIGW" },
  cache:   { key: "cache",   x: 0.63, y: 0.26, label: "Cache (Redis)", color: "#22c55e", tag: "REDIS" },
  queue:   { key: "queue",   x: 0.63, y: 0.74, label: "Queue (Kafka)", color: "#f59e0b", tag: "KAFKA" },
  db:      { key: "db",      x: 0.84, y: 0.50, label: "Database", color: "#ef4444", tag: "DYNAMO" },
} as const;

type NodeKey = keyof typeof NODES;

interface PathDef {
  from: NodeKey;
  to: NodeKey;
  baseType: "read" | "write" | "cacheHit";
  mixed?: boolean;
}

const PATHS: PathDef[] = [
  { from: "clients", to: "lb",    baseType: "read",     mixed: true },
  { from: "lb",      to: "api",   baseType: "read",     mixed: true },
  { from: "api",     to: "cache", baseType: "read" },
  { from: "api",     to: "queue", baseType: "write" },
  { from: "cache",   to: "db",    baseType: "read" },
  { from: "queue",   to: "db",    baseType: "write" },
  { from: "cache",   to: "api",   baseType: "cacheHit" },
];

type ParticleType = "read" | "write" | "cacheHit" | "error";

const COLORS: Record<ParticleType, string> = {
  read:     "#06b6d4",
  write:    "#f59e0b",
  cacheHit: "#22c55e",
  error:    "#ef4444",
};

interface Particle {
  id: number;
  pathIdx: number;
  progress: number;
  type: ParticleType;
  speed: number;
}

let pid = 0;
const MAX_PARTICLES = 200;

function getSpawnRates(m: SimulationMetrics): number[] {
  const s = 1 / 1600;
  const cap = 10;
  const total = m.readRPS + m.writeRPS;
  return [
    Math.min(cap, total * s),
    Math.min(cap, total * s),
    Math.min(cap, m.readRPS * s),
    Math.min(cap, m.writeRPS * s),
    Math.min(cap, m.cacheMissRPS * s),
    Math.min(cap, m.queueConsumptionRate * s),
    Math.min(cap, m.cacheHitRPS * s),
  ];
}

export default function NodeGraph({
  metrics,
  params,
}: {
  metrics: SimulationMetrics;
  params: SimulationParams;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const metricsRef = useRef(metrics);
  const sizeRef = useRef({ w: 0, h: 0 });
  const lastTimeRef = useRef(0);
  const accRef = useRef<number[]>(PATHS.map(() => 0));

  // Keep metricsRef current
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Track container size and sync canvas pixel buffer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sync = (w: number, h: number) => {
      sizeRef.current = { w, h };
      const c = canvasRef.current;
      if (c) { c.width = Math.round(w); c.height = Math.round(h); }
    };

    sync(container.clientWidth, container.clientHeight);

    const obs = new ResizeObserver(([e]) => {
      sync(e.contentRect.width, e.contentRect.height);
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Animation loop — reads only from refs, no React deps needed
  useEffect(() => {
    const animate = (time: number) => {
      const dt = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 100) : 16;
      lastTimeRef.current = time;

      const m = metricsRef.current;
      const { w, h } = sizeRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (!ctx || w === 0 || h === 0) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      // Speed: inversely proportional to latency
      const speed = Math.min(0.003, Math.max(0.0004, 0.016 / (m.avgLatency / 10)));

      // Advance & cull particles
      const next: Particle[] = [];
      for (const p of particlesRef.current) {
        const prog = p.progress + p.speed * dt;
        if (prog < 1.0) next.push({ ...p, progress: prog });
      }
      particlesRef.current = next;

      // Spawn new particles
      const rates = getSpawnRates(m);
      accRef.current = accRef.current.map((acc, i) => {
        const newAcc = acc + rates[i] * dt / 1000;
        const count = Math.floor(newAcc);
        if (count > 0 && particlesRef.current.length < MAX_PARTICLES) {
          for (let j = 0; j < count; j++) {
            const pd = PATHS[i];
            let type: ParticleType = pd.baseType;

            // Mixed paths: randomly assign read or write based on ratio
            if (pd.mixed) {
              const total = m.readRPS + m.writeRPS + 0.001;
              type = Math.random() < m.readRPS / total ? "read" : "write";
            }

            // Error particles on DB-bound paths when overloaded
            if (m.dbOverload && (i === 4 || i === 5) && Math.random() < 0.35) {
              type = "error";
            }

            particlesRef.current.push({
              id: pid++,
              pathIdx: i,
              progress: 0,
              type,
              speed,
            });
          }
        }
        return newAcc - count;
      });

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      const r = Math.max(2.5, 3.5 * (w / 1000));

      // Draw particles
      for (const p of particlesRef.current) {
        const path = PATHS[p.pathIdx];
        const fn = NODES[path.from];
        const tn = NODES[path.to];

        const px = (fn.x + (tn.x - fn.x) * p.progress) * w;
        const py = (fn.y + (tn.y - fn.y) * p.progress) * h;

        // Fade in/out at endpoints
        const fade =
          p.progress < 0.08 ? p.progress / 0.08
          : p.progress > 0.92 ? (1 - p.progress) / 0.08
          : 1;
        const alpha = Math.max(0, Math.min(1, fade));

        const col = COLORS[p.type];

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowBlur = 12;
        ctx.shadowColor = col;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        // Bright white core
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
  }, []); // empty — reads from refs only

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, #0c1428 0%, #070b14 60%, #050810 100%)",
      }}
      data-testid="node-graph"
    >
      {/* Subtle grid background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#1a2640"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />
      </svg>

      {/* Connection lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        style={{ pointerEvents: "none" }}
      >
        {PATHS.map((path, i) => {
          const fn = NODES[path.from];
          const tn = NODES[path.to];
          const col = COLORS[path.baseType];
          return (
            <g key={i}>
              {/* Glow line behind */}
              <line
                x1={fn.x * SVG_W} y1={fn.y * SVG_H}
                x2={tn.x * SVG_W} y2={tn.y * SVG_H}
                stroke={col}
                strokeWidth="4"
                strokeOpacity="0.04"
              />
              {/* Dashed line */}
              <line
                x1={fn.x * SVG_W} y1={fn.y * SVG_H}
                x2={tn.x * SVG_W} y2={tn.y * SVG_H}
                stroke={col}
                strokeWidth="1.2"
                strokeOpacity="0.22"
                strokeDasharray="10 7"
              />
            </g>
          );
        })}
      </svg>

      {/* Canvas for particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Node cards — absolutely positioned using CSS percentages */}
      {(Object.values(NODES) as typeof NODES[NodeKey][]).map((node) => (
        <div
          key={node.key}
          className="absolute"
          style={{
            left: `${node.x * 100}%`,
            top: `${node.y * 100}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <NodeCard
            nodeKey={node.key}
            label={node.label}
            tag={node.tag}
            color={node.color}
            metrics={metrics}
            overloaded={node.key === "db" && metrics.dbOverload}
            lockingMode={params.lockingMode}
          />
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 flex-wrap" style={{ zIndex: 20 }}>
        {(Object.entries(COLORS) as [ParticleType, string][]).map(([type, col]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: col, boxShadow: `0 0 6px ${col}` }}
            />
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              {type === "cacheHit" ? "cache hit" : type}
            </span>
          </div>
        ))}
      </div>

      {/* Particle count debug */}
      <div
        className="absolute top-2 right-2 text-[9px] font-mono text-slate-700"
        style={{ zIndex: 20 }}
        data-testid="particle-count"
      />
    </div>
  );
}
