# Interactive System Design Simulator

An interactive, browser-based simulator for learning distributed systems architecture. Build system topologies visually, watch real-time traffic flow as animated particles, and observe how design choices affect latency, throughput, and error rates.

**Live Demo:** https://risgpta.github.io/Interactive-System-Design/

---

## What It Does

You drag-and-drop components (API servers, caches, databases, CDNs, message queues) onto a canvas, tune parameters like requests-per-second, cache hit rate, and read/write ratio, and watch the system respond in real time. Crash a node and see failover kick in. Switch between CP and AP modes and observe how the CAP theorem plays out under load.

### Features

- **Visual topology builder** — 10 node types (CDN, API Server, Cache, Message Queue, DB Primary, Read Replica, Shard, Zookeeper, Object Storage, Worker)
- **6 pre-built scenarios** — Basic CRUD, Cache-Aside + Queue, Twitter-like, Sharded DB + Zookeeper, Microservices, Media/File Storage
- **Real-time particle animation** — color-coded request flows (reads, writes, cache hits, replication, coordination, errors)
- **Live metrics dashboard** — throughput, latency, success rate, error rate, IOPS, active connections, queue depth
- **Per-node stats** — each node card shows type-specific metrics (e.g. API servers show req/sec & error rate; DBs show IOPS & active locks)
- **Crash simulation** — crash any node and observe system resilience and failover
- **CAP theorem modes** — toggle between CP (consistency-preferred) and AP (availability-preferred) and see different failure behaviors
- **Capacity calculator** — estimate storage, bandwidth, DB sizing, and cache impact for your system
- **Learn panel** — built-in tutorials on cache-aside patterns, CAP theorem, sharding, replication, and more

---

## Scenarios

| Scenario | Description |
|---|---|
| Basic CRUD | Single primary DB — the baseline to understand bottlenecks |
| Cache-Aside + Queue | Redis + Kafka for read/write optimization |
| Twitter-like | CDN + dual API + queue + workers + replicas (high-scale read-heavy) |
| Sharded DB + Zookeeper | Horizontal partitioning with coordination (write-heavy) |
| Microservices | API gateway + 3 independent services + dual DBs |
| Media/File Storage | CDN + object storage (Netflix-like) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI + shadcn/ui |
| Animation | HTML Canvas (particles), Framer Motion |
| Routing | Wouter |
| Icons | Lucide React |
| Package Manager | pnpm (workspaces) |

---

## Running Locally

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
# Clone the repo
git clone https://github.com/risgpta/Interactive-System-Design.git
cd Interactive-System-Design

# Install dependencies
pnpm install
```

> **macOS note:** The project was built on Replit (Linux) and excludes macOS native binaries. Install them manually:
> ```bash
> pnpm add -w --save-dev \
>   @rollup/rollup-darwin-arm64 \
>   @esbuild/darwin-arm64@0.27.3 \
>   lightningcss-darwin-arm64@1.32.0 \
>   '@tailwindcss/oxide-darwin-arm64@4.3.0'
> ```

### Start the dev server

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/system-design-sim run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
Interactive-System-Design/
├── artifacts/
│   ├── system-design-sim/       # Frontend React app (the simulator)
│   │   └── src/
│   │       ├── pages/           # Simulator.tsx — main page
│   │       ├── components/
│   │       │   ├── simulator/   # TopBar, ScenarioBar, NodeGraph, ControlPanel, NodeCard
│   │       │   └── ui/          # Radix UI wrappers (Button, Slider, Switch, etc.)
│   │       ├── hooks/
│   │       │   └── useSimulation.ts  # Core simulation engine
│   │       ├── data/
│   │       │   ├── scenarios.ts      # 6 pre-built scenario templates
│   │       │   └── nodeTypes.ts      # Node metadata (colors, labels, tiers)
│   │       ├── types/
│   │       │   └── graph.ts          # Core types: NodeType, GraphNode, SystemTopology
│   │       └── utils/
│   │           └── topologyHelpers.ts # Auto-positioning and edge generation
│   └── api-server/              # Express backend (not required for the simulator)
├── lib/                         # Shared workspace libraries
└── package.json                 # Workspace root
```

---

## How the Simulation Works

The simulation engine (`useSimulation.ts`) runs every 200ms and models:

- **Traffic distribution** — splits RPS into reads/writes; CDN offloads ~35% of reads
- **Database capacity** — modeled from pool size, locking mode (row vs table), and shard/replica count
- **Queue smoothing** — message queues provide 3× drain factor, absorbing write spikes
- **Overload & error rates** — CP mode drops requests when overloaded (up to 65%); AP mode serves stale data with only ~2% hard failure
- **Latency modeling** — base 15ms adjusted by CDN (−8ms), cache hit rate, replication (−2ms), failover (+30ms), queue depth (up to +2000ms)
- **Failover** — detects crashed primaries, promotes replicas, adds failover latency

The particle system renders up to 250 animated dots across edges, color-coded by traffic type, with speed tied to system latency.

---

## License

MIT
