import { GraphNode, GraphEdge, NodeType } from '@/types/graph';
import { NODE_TYPE_META } from '@/data/nodeTypes';

let edgeCounter = Date.now();
function eid() { return `ae${++edgeCounter}`; }

export function getDefaultPosition(
  type: NodeType,
  nodes: GraphNode[]
): { x: number; y: number } {
  const tier = NODE_TYPE_META[type].tier;
  const x = Math.min(0.91, 0.08 + tier * 0.12);

  const sameArea = nodes.filter(n => Math.abs(n.x - x) < 0.10);
  const taken = sameArea.map(n => n.y);

  const candidates = [0.50, 0.30, 0.70, 0.20, 0.80, 0.40, 0.60, 0.15, 0.85];
  for (const y of candidates) {
    if (!taken.some(oy => Math.abs(oy - y) < 0.14)) return { x, y };
  }
  return { x, y: 0.5 + (Math.random() * 0.3 - 0.15) };
}

export function getAutoEdges(
  newNode: GraphNode,
  nodes: GraphNode[],
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  const find = (type: NodeType) => nodes.find(n => n.type === type && !n.crashed);
  const findAll = (...types: NodeType[]) =>
    nodes.filter(n => (types as string[]).includes(n.type) && !n.crashed);

  const add = (
    from: string,
    to: string,
    trafficType: GraphEdge['trafficType']
  ) => edges.push({ id: eid(), from, to, trafficType });

  switch (newNode.type) {
    case 'cdn': {
      const clients = find('clients');
      const lb = find('load_balancer');
      const api = find('api_server');
      if (clients) add(clients.id, newNode.id, 'read');
      if (lb) add(newNode.id, lb.id, 'read');
      else if (api) add(newNode.id, api.id, 'read');
      break;
    }
    case 'load_balancer': {
      const clients = find('clients');
      const cdn = find('cdn');
      if (clients && !cdn) add(clients.id, newNode.id, 'mixed');
      if (cdn) add(cdn.id, newNode.id, 'read');
      findAll('api_server').forEach(a => add(newNode.id, a.id, 'mixed'));
      break;
    }
    case 'api_server': {
      const lb = find('load_balancer');
      if (lb) add(lb.id, newNode.id, 'mixed');
      findAll('cache_redis').forEach(c => add(newNode.id, c.id, 'read'));
      findAll('message_queue').forEach(q => add(newNode.id, q.id, 'write'));
      findAll('db_primary', 'db_shard').forEach(db => add(newNode.id, db.id, 'write'));
      findAll('file_storage', 'search_engine').forEach(s => add(newNode.id, s.id, 'mixed'));
      break;
    }
    case 'cache_redis': {
      findAll('api_server').forEach(a => {
        add(a.id, newNode.id, 'read');
        add(newNode.id, a.id, 'cacheHit');
      });
      const db = find('db_primary') ?? find('db_shard');
      if (db) add(newNode.id, db.id, 'read');
      break;
    }
    case 'message_queue': {
      findAll('api_server').forEach(a => add(a.id, newNode.id, 'write'));
      const worker = find('worker');
      if (worker) {
        add(newNode.id, worker.id, 'write');
      } else {
        const db = find('db_primary') ?? find('db_shard');
        if (db) add(newNode.id, db.id, 'write');
      }
      break;
    }
    case 'worker': {
      const q = find('message_queue');
      if (q) add(q.id, newNode.id, 'write');
      const db = find('db_primary') ?? find('db_shard');
      if (db) add(newNode.id, db.id, 'write');
      break;
    }
    case 'db_primary': {
      findAll('api_server').forEach(a => add(a.id, newNode.id, 'write'));
      findAll('worker').forEach(w => add(w.id, newNode.id, 'write'));
      findAll('cache_redis').forEach(c => add(c.id, newNode.id, 'read'));
      findAll('db_replica').forEach(r => add(newNode.id, r.id, 'replication'));
      break;
    }
    case 'db_replica': {
      const primary = find('db_primary');
      if (primary) add(primary.id, newNode.id, 'replication');
      findAll('api_server').forEach(a => add(a.id, newNode.id, 'read'));
      break;
    }
    case 'db_shard': {
      findAll('api_server', 'worker').forEach(s => add(s.id, newNode.id, 'mixed'));
      const zk = find('zookeeper');
      if (zk) add(zk.id, newNode.id, 'coordination');
      break;
    }
    case 'zookeeper': {
      findAll('db_primary', 'db_replica', 'db_shard').forEach(db =>
        add(newNode.id, db.id, 'coordination')
      );
      break;
    }
    case 'file_storage': {
      findAll('api_server').forEach(a => add(a.id, newNode.id, 'mixed'));
      break;
    }
    case 'search_engine': {
      findAll('api_server').forEach(a => add(a.id, newNode.id, 'read'));
      findAll('db_primary').forEach(db => add(db.id, newNode.id, 'write'));
      break;
    }
  }

  return edges;
}
