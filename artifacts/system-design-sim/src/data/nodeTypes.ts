import { NodeType } from '@/types/graph';

export interface NodeTypeMeta {
  label: string;
  tag: string;
  color: string;
  tier: number;
  canAdd: boolean;
  description: string;
  category: string;
}

export const NODE_TYPE_META: Record<NodeType, NodeTypeMeta> = {
  clients:       { label: 'Clients',        tag: 'CLIENT', color: '#8b5cf6', tier: 0, canAdd: false, description: 'End users sending traffic to the system',                           category: 'network'      },
  cdn:           { label: 'CDN',            tag: 'CDN',    color: '#7c3aed', tier: 1, canAdd: true,  description: 'Content Delivery Network — offloads ~35% of reads, cuts latency',  category: 'network'      },
  load_balancer: { label: 'Load Balancer',  tag: 'LB',     color: '#3b82f6', tier: 2, canAdd: true,  description: 'Distributes traffic evenly across all API servers',                  category: 'network'      },
  api_server:    { label: 'API Server',     tag: 'API',    color: '#06b6d4', tier: 3, canAdd: true,  description: 'Processes requests — add more to scale horizontally',                category: 'compute'      },
  cache_redis:   { label: 'Cache (Redis)',  tag: 'REDIS',  color: '#22c55e', tier: 4, canAdd: true,  description: 'In-memory cache — reduces DB load dramatically for repeated reads',  category: 'cache'        },
  message_queue: { label: 'Queue (Kafka)',  tag: 'KAFKA',  color: '#f59e0b', tier: 4, canAdd: true,  description: 'Decouples writes, smooths burst traffic — drains at 3x rate',        category: 'messaging'    },
  worker:        { label: 'Worker',         tag: 'WORKER', color: '#f97316', tier: 5, canAdd: true,  description: 'Background processor consuming from the message queue',               category: 'compute'      },
  db_primary:    { label: 'DB Primary',     tag: 'PRIMARY',color: '#ef4444', tier: 6, canAdd: true,  description: 'Handles all writes and consistency-critical reads',                  category: 'database'     },
  db_replica:    { label: 'Read Replica',   tag: 'REPLICA',color: '#dc2626', tier: 6, canAdd: true,  description: 'Scales reads horizontally — promotes to primary on crash',           category: 'database'     },
  db_shard:      { label: 'DB Shard',       tag: 'SHARD',  color: '#b91c1c', tier: 7, canAdd: true,  description: 'Horizontal partitioning — each shard adds full independent capacity',category: 'database'     },
  zookeeper:     { label: 'Zookeeper',      tag: 'ZK',     color: '#84cc16', tier: 5, canAdd: true,  description: 'Leader election, coordination, config management (+2ms overhead)',   category: 'coordination' },
  file_storage:  { label: 'File Storage',   tag: 'BLOB',   color: '#0ea5e9', tier: 6, canAdd: true,  description: 'Cheap durable object storage (S3-like) for files and backups',      category: 'storage'      },
  search_engine: { label: 'Search Engine',  tag: 'SRCH',   color: '#e879f9', tier: 6, canAdd: true,  description: 'Full-text search (Elasticsearch-like) — indexed from primary DB',   category: 'storage'      },
};

export const PALETTE_CATEGORIES: { label: string; types: NodeType[] }[] = [
  { label: 'Network',      types: ['cdn', 'load_balancer']               },
  { label: 'Compute',      types: ['api_server', 'worker']               },
  { label: 'Cache',        types: ['cache_redis']                         },
  { label: 'Messaging',    types: ['message_queue']                       },
  { label: 'Database',     types: ['db_primary', 'db_replica', 'db_shard'] },
  { label: 'Coordination', types: ['zookeeper']                           },
  { label: 'Storage',      types: ['file_storage', 'search_engine']      },
];
