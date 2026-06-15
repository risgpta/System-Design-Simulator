import { SystemTopology, GraphNode, GraphEdge, NodeType, TrafficType } from '@/types/graph';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  topology: SystemTopology;
  defaultRPS: number;
  defaultReadRatio: number;
  defaultCacheHitRate: number;
  defaultDbPool: number;
}

function n(id: string, type: NodeType, x: number, y: number): GraphNode {
  return { id, type, x, y, crashed: false };
}

function e(id: string, from: string, to: string, trafficType: TrafficType): GraphEdge {
  return { id, from, to, trafficType };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'basic',
    name: 'Basic CRUD',
    description: 'Simple request-response with a single primary database. The canonical starting point for any system.',
    defaultRPS: 1000,
    defaultReadRatio: 0.7,
    defaultCacheHitRate: 0,
    defaultDbPool: 30,
    topology: {
      scenarioId: 'basic',
      capMode: 'cp',
      nodes: [
        n('c1',   'clients',       0.08, 0.50),
        n('lb1',  'load_balancer', 0.30, 0.50),
        n('api1', 'api_server',    0.55, 0.50),
        n('db1',  'db_primary',    0.82, 0.50),
      ],
      edges: [
        e('e1', 'c1',   'lb1',  'mixed'),
        e('e2', 'lb1',  'api1', 'mixed'),
        e('e3', 'api1', 'db1',  'mixed'),
      ],
    },
  },
  {
    id: 'cache_aside',
    name: 'Cache-Aside + Queue',
    description: 'Adds Redis for reads and Kafka for write smoothing. The go-to pattern for read-heavy apps.',
    defaultRPS: 3000,
    defaultReadRatio: 0.8,
    defaultCacheHitRate: 0.7,
    defaultDbPool: 80,
    topology: {
      scenarioId: 'cache_aside',
      capMode: 'cp',
      nodes: [
        n('c1',     'clients',       0.07, 0.50),
        n('lb1',    'load_balancer', 0.24, 0.50),
        n('api1',   'api_server',    0.43, 0.50),
        n('cache1', 'cache_redis',   0.63, 0.26),
        n('q1',     'message_queue', 0.63, 0.74),
        n('db1',    'db_primary',    0.84, 0.50),
      ],
      edges: [
        e('e1', 'c1',     'lb1',   'mixed'),
        e('e2', 'lb1',    'api1',  'mixed'),
        e('e3', 'api1',   'cache1','read'),
        e('e4', 'cache1', 'api1',  'cacheHit'),
        e('e5', 'cache1', 'db1',   'read'),
        e('e6', 'api1',   'q1',    'write'),
        e('e7', 'q1',     'db1',   'write'),
      ],
    },
  },
  {
    id: 'twitter',
    name: 'Twitter-like',
    description: 'CDN + dual API tier + event-driven queue + workers + read replicas. High-scale fan-out architecture.',
    defaultRPS: 8000,
    defaultReadRatio: 0.9,
    defaultCacheHitRate: 0.82,
    defaultDbPool: 100,
    topology: {
      scenarioId: 'twitter',
      capMode: 'ap',
      nodes: [
        n('c1',    'clients',       0.05, 0.50),
        n('cdn1',  'cdn',           0.13, 0.24),
        n('lb1',   'load_balancer', 0.24, 0.50),
        n('api1',  'api_server',    0.38, 0.30),
        n('api2',  'api_server',    0.38, 0.70),
        n('cache1','cache_redis',   0.55, 0.17),
        n('q1',    'message_queue', 0.55, 0.73),
        n('w1',    'worker',        0.70, 0.73),
        n('db1',   'db_primary',    0.85, 0.32),
        n('rep1',  'db_replica',    0.85, 0.67),
      ],
      edges: [
        e('e1',  'c1',    'cdn1',  'read'),
        e('e2',  'c1',    'lb1',   'mixed'),
        e('e3',  'cdn1',  'lb1',   'read'),
        e('e4',  'lb1',   'api1',  'read'),
        e('e5',  'lb1',   'api2',  'write'),
        e('e6',  'api1',  'cache1','read'),
        e('e7',  'cache1','api1',  'cacheHit'),
        e('e8',  'cache1','db1',   'read'),
        e('e9',  'api1',  'rep1',  'read'),
        e('e10', 'api2',  'q1',    'write'),
        e('e11', 'q1',    'w1',    'write'),
        e('e12', 'w1',    'db1',   'write'),
        e('e13', 'db1',   'rep1',  'replication'),
      ],
    },
  },
  {
    id: 'sharded',
    name: 'Sharded DB + Zookeeper',
    description: 'Horizontally partitioned DB with Zookeeper for coordination. Each shard adds independent full capacity.',
    defaultRPS: 20000,
    defaultReadRatio: 0.6,
    defaultCacheHitRate: 0.5,
    defaultDbPool: 50,
    topology: {
      scenarioId: 'sharded',
      capMode: 'cp',
      nodes: [
        n('c1',  'clients',       0.05, 0.50),
        n('lb1', 'load_balancer', 0.19, 0.50),
        n('api1','api_server',    0.35, 0.50),
        n('ch1', 'cache_redis',   0.52, 0.22),
        n('zk1', 'zookeeper',     0.52, 0.78),
        n('sh1', 'db_shard',      0.76, 0.22),
        n('sh2', 'db_shard',      0.76, 0.50),
        n('sh3', 'db_shard',      0.76, 0.78),
      ],
      edges: [
        e('e1',  'c1',  'lb1',  'mixed'),
        e('e2',  'lb1', 'api1', 'mixed'),
        e('e3',  'api1','ch1',  'read'),
        e('e4',  'ch1', 'api1', 'cacheHit'),
        e('e5',  'api1','sh1',  'mixed'),
        e('e6',  'api1','sh2',  'mixed'),
        e('e7',  'api1','sh3',  'mixed'),
        e('e8',  'ch1', 'sh1',  'read'),
        e('e9',  'zk1', 'sh1',  'coordination'),
        e('e10', 'zk1', 'sh2',  'coordination'),
        e('e11', 'zk1', 'sh3',  'coordination'),
      ],
    },
  },
  {
    id: 'microservices',
    name: 'Microservices',
    description: 'API gateway routing to independent user/feed/notification services with dedicated data stores.',
    defaultRPS: 5000,
    defaultReadRatio: 0.75,
    defaultCacheHitRate: 0.6,
    defaultDbPool: 60,
    topology: {
      scenarioId: 'microservices',
      capMode: 'ap',
      nodes: [
        n('c1',   'clients',       0.04, 0.50),
        n('gw1',  'api_server',    0.18, 0.50),
        n('svc1', 'api_server',    0.34, 0.22),
        n('svc2', 'api_server',    0.34, 0.50),
        n('svc3', 'api_server',    0.34, 0.78),
        n('ch1',  'cache_redis',   0.53, 0.18),
        n('q1',   'message_queue', 0.53, 0.73),
        n('db1',  'db_primary',    0.76, 0.22),
        n('w1',   'worker',        0.68, 0.85),
        n('db2',  'db_primary',    0.84, 0.62),
      ],
      edges: [
        e('e1',  'c1',   'gw1',  'mixed'),
        e('e2',  'gw1',  'svc1', 'read'),
        e('e3',  'gw1',  'svc2', 'mixed'),
        e('e4',  'gw1',  'svc3', 'write'),
        e('e5',  'svc1', 'ch1',  'read'),
        e('e6',  'ch1',  'svc1', 'cacheHit'),
        e('e7',  'ch1',  'db1',  'read'),
        e('e8',  'svc1', 'db1',  'mixed'),
        e('e9',  'svc2', 'q1',   'write'),
        e('e10', 'svc3', 'q1',   'write'),
        e('e11', 'q1',   'w1',   'write'),
        e('e12', 'w1',   'db2',  'write'),
        e('e13', 'db1',  'db2',  'replication'),
      ],
    },
  },
  {
    id: 'file_storage',
    name: 'Media / File Storage',
    description: 'CDN + object storage pattern. Optimised for large binary content delivery (Netflix-like).',
    defaultRPS: 4000,
    defaultReadRatio: 0.92,
    defaultCacheHitRate: 0.75,
    defaultDbPool: 40,
    topology: {
      scenarioId: 'file_storage',
      capMode: 'ap',
      nodes: [
        n('c1',  'clients',       0.05, 0.50),
        n('cdn1','cdn',           0.17, 0.27),
        n('lb1', 'load_balancer', 0.30, 0.50),
        n('api1','api_server',    0.47, 0.50),
        n('ch1', 'cache_redis',   0.64, 0.24),
        n('fs1', 'file_storage',  0.64, 0.73),
        n('db1', 'db_primary',    0.83, 0.50),
      ],
      edges: [
        e('e1', 'c1',  'cdn1', 'read'),
        e('e2', 'c1',  'lb1',  'mixed'),
        e('e3', 'cdn1','lb1',  'read'),
        e('e4', 'lb1', 'api1', 'mixed'),
        e('e5', 'api1','ch1',  'read'),
        e('e6', 'ch1', 'api1', 'cacheHit'),
        e('e7', 'ch1', 'db1',  'read'),
        e('e8', 'api1','fs1',  'mixed'),
        e('e9', 'api1','db1',  'write'),
      ],
    },
  },
];

export const DEFAULT_SCENARIO_ID = 'cache_aside';
