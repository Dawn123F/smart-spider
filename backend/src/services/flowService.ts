import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { SpiderFlow, FlowNode, FlowEdge } from '../types';

export class FlowService {
  getAllFlows(): SpiderFlow[] {
    const rows = db.prepare('SELECT * FROM spider_flows ORDER BY updated_at DESC').all() as any[];
    return rows.map(this.rowToFlow);
  }

  getFlowById(id: string): SpiderFlow | null {
    const row = db.prepare('SELECT * FROM spider_flows WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.rowToFlow(row);
  }

  createFlow(data: Partial<SpiderFlow>): SpiderFlow {
    const now = new Date().toISOString();
    const flow: SpiderFlow = {
      id: uuidv4(),
      name: data.name || '未命名流程',
      description: data.description || '',
      nodes: data.nodes || [],
      edges: data.edges || [],
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO spider_flows (id, name, description, nodes, edges, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      flow.id,
      flow.name,
      flow.description,
      JSON.stringify(flow.nodes),
      JSON.stringify(flow.edges),
      flow.createdAt,
      flow.updatedAt
    );

    return flow;
  }

  updateFlow(id: string, data: Partial<SpiderFlow>): SpiderFlow | null {
    const existing = this.getFlowById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: now,
    };

    db.prepare(`
      UPDATE spider_flows
      SET name = ?, description = ?, nodes = ?, edges = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.description,
      JSON.stringify(updated.nodes),
      JSON.stringify(updated.edges),
      updated.updatedAt,
      id
    );

    return updated;
  }

  deleteFlow(id: string): boolean {
    const result = db.prepare('DELETE FROM spider_flows WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToFlow(row: any): SpiderFlow {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      nodes: JSON.parse(row.nodes || '[]'),
      edges: JSON.parse(row.edges || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const flowService = new FlowService();
