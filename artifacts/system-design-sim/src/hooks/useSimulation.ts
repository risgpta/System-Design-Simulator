import { useState, useEffect, useRef } from "react";

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
}

const DB_REQUESTS_PER_CONNECTION = 15;
const QUEUE_DRAIN_RATE_FACTOR = 3;

export function useSimulation(params: SimulationParams): SimulationMetrics {
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    totalRPS: 0, avgLatency: 0, successRate: 1, errorRate: 0, throughput: 0,
    readRPS: 0, writeRPS: 0, cacheHitRPS: 0, cacheMissRPS: 0,
    dbIncomingRPS: 0, dbOverload: false, queueWait: 0,
    queueIngestionRate: 0, queueConsumptionRate: 0, queueDepth: 0,
    activeConnections: 0, apiErrorRate: 0, cacheMemoryPressure: 0,
    dbActiveLocks: 0, dbIops: 0,
  });

  const prevQueueDepthRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const { totalRPS, readRatio, cacheHitRate, dbPoolSize, lockingMode } = params;
      
      const readRPS = totalRPS * readRatio;
      const writeRPS = totalRPS * (1 - readRatio);
      
      const cacheHitRPS = readRPS * cacheHitRate;
      const cacheMissRPS = readRPS * (1 - cacheHitRate);
      
      const dbIncomingRPS = cacheMissRPS + (writeRPS / QUEUE_DRAIN_RATE_FACTOR);
      const effectivePoolSize = lockingMode === 'table' ? Math.max(1, dbPoolSize * 0.15) : dbPoolSize;
      const dbCapacity = effectivePoolSize * DB_REQUESTS_PER_CONNECTION;
      const dbOverload = dbIncomingRPS > dbCapacity;
      
      const baseLatency = 20;
      const cacheAddedLatency = cacheHitRate > 0.5 ? 2 : 15;
      const dbQueueWait = dbOverload ? Math.min(2000, (dbIncomingRPS / dbCapacity) * 200) : 5;
      const avgLatency = baseLatency + cacheAddedLatency + dbQueueWait;
      
      const dropRate = dbOverload ? Math.min(0.5, (dbIncomingRPS - dbCapacity) / dbIncomingRPS) : 0;
      const successRate = 1 - dropRate;
      const errorRate = dropRate;
      const throughput = totalRPS * successRate;
      
      const queueIngestionRate = writeRPS;
      const queueConsumptionRate = Math.min(writeRPS, dbCapacity * 0.3);
      
      let newQueueDepth = prevQueueDepthRef.current;
      if (dbOverload) {
        newQueueDepth = Math.min(50000, newQueueDepth + (queueIngestionRate - queueConsumptionRate) * 0.2);
      } else {
        newQueueDepth = Math.max(0, newQueueDepth - 100);
      }
      prevQueueDepthRef.current = newQueueDepth;
      
      setMetrics({
        totalRPS,
        avgLatency,
        successRate,
        errorRate,
        throughput,
        readRPS,
        writeRPS,
        cacheHitRPS,
        cacheMissRPS,
        dbIncomingRPS,
        dbOverload,
        queueWait: dbQueueWait,
        queueIngestionRate,
        queueConsumptionRate,
        queueDepth: newQueueDepth,
        activeConnections: Math.floor(totalRPS * 0.05),
        apiErrorRate: errorRate,
        cacheMemoryPressure: Math.min(100, cacheHitRPS / 1000 + 10),
        dbActiveLocks: dbOverload ? effectivePoolSize : Math.floor(dbIncomingRPS * 0.01),
        dbIops: Math.floor(dbIncomingRPS * successRate),
      });
    };

    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [params]);

  return metrics;
}
