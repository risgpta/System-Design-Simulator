export type NodeType =
  | 'clients'
  | 'cdn'
  | 'load_balancer'
  | 'api_server'
  | 'cache_redis'
  | 'message_queue'
  | 'worker'
  | 'db_primary'
  | 'db_replica'
  | 'db_shard'
  | 'zookeeper'
  | 'file_storage'
  | 'search_engine';

export type TrafficType =
  | 'read'
  | 'write'
  | 'mixed'
  | 'cacheHit'
  | 'replication'
  | 'coordination';

export type CapMode = 'cp' | 'ap';

export interface GraphNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  crashed: boolean;
  label?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  trafficType: TrafficType;
}

export interface SystemTopology {
  nodes: GraphNode[];
  edges: GraphEdge[];
  scenarioId: string;
  capMode: CapMode;
}
