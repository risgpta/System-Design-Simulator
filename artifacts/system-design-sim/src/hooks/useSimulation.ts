import { useState, useEffect, useRef } from "react";
import { SystemTopology, NodeType } from "@/types/graph";

export type LockingMode = "row" | "table";

export interface SimulationParams {
  totalRPS: number;
  readRatio: number;
  cacheHitRate: number;
  dbPoolSize: number;
  lockingMode: LockingMode;
}

export interface SimulationMetrics {
  totalRPS: number;
  avgLatency: number;
  successRate: number;
  errorRate: number;
  throughput: number;

  readRPS: number;
  writeRPS: number;
  cacheHitRPS: number;
  cacheMissRPS: number;

  dbIncomingRPS: number;
  dbOverload: boolean;
  queueWait: number;

  queueIngestionRate: number;
  queueConsumptionRate: number;
  queueDepth: number;

  activeConnections: number;
  apiErrorRate: number;
  cacheMemoryPressure: number;
  dbActiveLocks: number;
  dbIops: number;

  // Topology-derived
  failoverActive: boolean;
  primaryCrashed: boolean;
  numActiveDbs: number;
  numActiveReplicas: number;
  numActiveApi: number;
  effectiveDbWriteCapacity: number;
  effectiveDbReadCapacity: number;
  cdnOffloadRPS: number;
}

const DB_RPC = 15; // requests per connection per second
const QUEUE_DRAIN = 3;

const DEFAULT_METRICS: SimulationMetrics = {
  totalRPS: 0, avgLatency: 0, successRate: 1, errorRate: 0, throughput: 0,
  readRPS: 0, writeRPS: 0, cacheHitRPS: 0, cacheMissRPS: 0,
  dbIncomingRPS: 0, dbOverload: false, queueWait: 5,
  queueIngestionRate: 0, queueConsumptionRate: 0, queueDepth: 0,
  activeConnections: 0, apiErrorRate: 0, cacheMemoryPressure: 0,
  dbActiveLocks: 0, dbIops: 0,
  failoverActive: false, primaryCrashed: false,
  numActiveDbs: 0, numActiveReplicas: 0, numActiveApi: 1,
  effectiveDbWriteCapacity: 0, effectiveDbReadCapacity: 0, cdnOffloadRPS: 0,
};

export function useSimulation(
  params: SimulationParams,
  topology: SystemTopology
): SimulationMetrics {
  const [metrics, setMetrics] = useState<SimulationMetrics>(DEFAULT_METRICS);
  const topologyRef = useRef(topology);
  const queueDepthRef = useRef(0);

  useEffect(() => { topologyRef.current = topology; }, [topology]);

  useEffect(() => {
    const tick = () => {
      const { totalRPS, readRatio, cacheHitRate, dbPoolSize, lockingMode } = params;
      const topo = topologyRef.current;

      const activeNodes = topo.nodes.filter(n => !n.crashed);
      const count = (type: NodeType) => activeNodes.filter(n => n.type === type).length;

      const numCdn = count('cdn');
      const numApi = Math.max(1, count('api_server'));
      const numCache = count('cache_redis');
      const numQueue = count('message_queue');
      const numPrimary = count('db_primary');
      const numReplica = count('db_replica');
      const numShard = count('db_shard');
      const numZk = count('zookeeper');

      // Failover detection
      const crashedPrimaries = topo.nodes.filter(n => n.type === 'db_primary' && n.crashed).length;
      const primaryCrashed = crashedPrimaries > 0;
      const failoverActive = primaryCrashed && numReplica > 0;

      // Traffic split
      const readRPS = totalRPS * readRatio;
      const writeRPS = totalRPS * (1 - readRatio);

      // CDN offloads a portion of reads
      const cdnOffload = numCdn > 0 ? 0.35 : 0;
      const effectiveReadRPS = readRPS * (1 - cdnOffload);
      const cdnOffloadRPS = readRPS * cdnOffload;

      // Cache layer
      const effectiveCacheHitRate = numCache > 0 ? cacheHitRate : 0;
      const cacheHitRPS = effectiveReadRPS * effectiveCacheHitRate;
      const cacheMissRPS = effectiveReadRPS * (1 - effectiveCacheHitRate);

      // DB effective capacity
      // Write: primary + shards (each shard = full independent pool)
      // Read: write units + replicas
      const writeUnits = Math.max(failoverActive ? 0 : numPrimary, numShard);
      const readUnits = writeUnits + numReplica;
      const lockMult = lockingMode === 'table' ? 0.15 : 1;
      const writeCapacity = Math.max(0.01, writeUnits * dbPoolSize * lockMult * DB_RPC);
      const readCapacity = Math.max(0.01, readUnits * dbPoolSize * lockMult * DB_RPC);

      // Queue smooths write burst
      const drainFactor = numQueue > 0 ? QUEUE_DRAIN : 1;
      const dbWriteRPS = writeRPS / drainFactor;
      const dbReadRPS = cacheMissRPS;
      const dbTotalRPS = dbWriteRPS + dbReadRPS;

      const writeOverload = dbWriteRPS > writeCapacity;
      const readOverload = dbReadRPS > readCapacity;
      const dbOverload = writeOverload || readOverload;

      // Drop rate varies by CAP mode
      let dropRate = 0;
      if (dbOverload) {
        if (topo.capMode === 'cp') {
          const overFactor = dbTotalRPS / (writeCapacity + readCapacity);
          dropRate = Math.min(0.65, (overFactor - 1) / overFactor);
        } else {
          // AP: serve stale / degraded, only tiny hard-failure rate
          dropRate = 0.02;
        }
      }
      // Primary crash with no failover: writes fail
      if (primaryCrashed && !failoverActive && numShard === 0) {
        dropRate = Math.max(dropRate, (1 - readRatio) * 0.95);
      }

      const successRate = Math.max(0, 1 - dropRate);
      const throughput = totalRPS * successRate;

      // Latency model
      const baseL = 15;
      const cdnL = numCdn > 0 ? -8 : 0;
      const cacheL = numCache > 0 ? (effectiveCacheHitRate > 0.5 ? 2 : 12) : 12;
      const zkL = numZk > 0 ? 2 : 0;
      const replicaL = numReplica > 0 ? -2 : 0;
      const shardL = numShard > 1 ? 3 : 0;
      const failoverL = failoverActive ? 30 : 0;
      const apL = topo.capMode === 'ap' && dbOverload ? 20 : 0;
      const dbWait = dbOverload
        ? Math.min(2000, (dbTotalRPS / (writeCapacity + readCapacity)) * 200)
        : 5;
      const avgLatency = Math.max(5, baseL + cdnL + cacheL + zkL + replicaL + shardL + failoverL + apL + dbWait);

      // Queue depth via ref (persists between ticks)
      const queueIngestionRate = numQueue > 0 ? writeRPS : 0;
      const queueConsumptionRate = numQueue > 0 ? Math.min(writeRPS, writeCapacity * 0.3) : 0;
      let qd = queueDepthRef.current;
      if (numQueue > 0 && dbOverload) {
        qd = Math.min(200_000, qd + (queueIngestionRate - queueConsumptionRate) * 0.2);
      } else {
        qd = Math.max(0, qd - 300);
      }
      queueDepthRef.current = qd;

      const activeConnections = Math.floor(totalRPS * 0.05 * numApi);
      const cacheMemoryPressure = numCache > 0 ? Math.min(100, (cacheHitRPS / 6000) * 80 + 10) : 0;
      const dbActiveLocks = dbOverload ? writeUnits * dbPoolSize : Math.floor(dbTotalRPS * 0.01);
      const dbIops = Math.floor(dbTotalRPS * successRate);

      setMetrics({
        totalRPS, avgLatency, successRate, errorRate: dropRate, throughput,
        readRPS, writeRPS, cacheHitRPS, cacheMissRPS,
        dbIncomingRPS: dbTotalRPS, dbOverload, queueWait: dbWait,
        queueIngestionRate, queueConsumptionRate, queueDepth: qd,
        activeConnections, apiErrorRate: dropRate,
        cacheMemoryPressure, dbActiveLocks, dbIops,
        failoverActive, primaryCrashed,
        numActiveDbs: writeUnits, numActiveReplicas: numReplica,
        numActiveApi: numApi,
        effectiveDbWriteCapacity: writeCapacity,
        effectiveDbReadCapacity: readCapacity,
        cdnOffloadRPS,
      });
    };

    const interval = setInterval(tick, 200);
    tick();
    return () => clearInterval(interval);
  }, [params]);

  return metrics;
}
