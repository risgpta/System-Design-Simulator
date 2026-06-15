---
name: System Design Simulator Architecture
description: Key decisions for the interactive system design simulator app
---

## Topology System
- `SystemTopology` in `src/types/graph.ts` is the single source of truth: nodes + edges + scenarioId + capMode
- `Simulator.tsx` owns topology state; passes to `useSimulation`, `NodeGraph`, `ControlPanel`
- `topologyRef` in `useSimulation.ts` updated via useEffect — simulation always reads current topology within 200ms without restarting the interval

## Node Positions
- All node positions are normalized fractions (0–1 of container width/height)
- SVG uses `viewBox="0 0 1000 560"` with `preserveAspectRatio="none"` — fractions × 1000/560
- Canvas uses fraction × canvas.width/canvas.height at draw time (handles resize)
- Node card CSS: `left: ${x*100}%`, `top: ${y*100}%`, `transform: translate(-50%, -50%)`

## Particle System
- Particles use normalized positions `(x0n, y0n) → (x1n, y1n)`, computed to pixels at draw time
- Speed formula: `min(0.003, max(0.0004, 0.016 / (avgLatency / 10)))` — fast when healthy, slow when overloaded
- Spawn accumulator per edge ID — avoids fractional spawn issues
- MAX_PARTICLES = 250; per-edge cap = 3 per frame to prevent burst
- Edge accumulators and particles reset when scenario changes (scenarioId effect dependency)

## Simulation Model
- topology.capMode CP: drop requests on DB overload; AP: serve stale, ~2% hard failure rate
- CDN: offloads 35% of reads, -8ms latency
- Queue: drains writes at 3× (QUEUE_DRAIN = 3)
- Replicas: add to read capacity; primary crash + replicas = failoverActive (+30ms latency)
- DB capacity: writeUnits × dbPoolSize × lockMult × 15 RPS/conn
- writeUnits = max(numPrimary if !failover, numShard); readUnits = writeUnits + numReplicas

## Auto-Edge Rules (topologyHelpers.ts)
- `getAutoEdges(newNode, existingNodes)` — adds typed edges based on newNode type
- Clients never added via palette (canAdd: false)
- Add CDN → clients→CDN + CDN→LB edge auto-wired
- Add db_replica → primary→replica replication edge auto-wired

## Key Files
- `src/types/graph.ts` — all shared types
- `src/data/nodeTypes.ts` — NODE_TYPE_META (color, tier, tag, canAdd)
- `src/data/scenarios.ts` — 6 SCENARIOS array; default: cache_aside
- `src/utils/topologyHelpers.ts` — getDefaultPosition, getAutoEdges
- `src/hooks/useSimulation.ts` — topology-aware simulation, 200ms tick
- `src/pages/Simulator.tsx` — state management, handler functions
- `src/components/simulator/ScenarioBar.tsx` — 6 preset buttons + particle legend
- `src/components/simulator/NodeGraph.tsx` — dynamic SVG edges + canvas particles + crash buttons on hover
- `src/components/simulator/NodeCard.tsx` — 13 node types, crashed overlay, per-node metrics
- `src/components/simulator/ControlPanel.tsx` — 4 tabs: Controls | Topology | Calc | Learn

**Why:** Separating topology state from simulation params lets scenarios set both visual layout and initial slider values independently without coupling concerns.
