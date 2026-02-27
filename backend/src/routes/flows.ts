import { Router, Request, Response } from 'express';
import { flowService } from '../services/flowService';
import { executionService } from '../services/executionService';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';

const router = Router();

// GET /api/flows - list all flows
router.get('/', (req: Request, res: Response) => {
  try {
    const flows = flowService.getAllFlows();
    res.json({ success: true, data: flows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/flows/:id - get flow by id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const flow = flowService.getFlowById(req.params.id);
    if (!flow) {
      return res.status(404).json({ success: false, error: 'Flow not found' });
    }
    res.json({ success: true, data: flow });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/flows - create flow
router.post('/', (req: Request, res: Response) => {
  try {
    const flow = flowService.createFlow(req.body);
    res.status(201).json({ success: true, data: flow });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/flows/:id - update flow
router.put('/:id', (req: Request, res: Response) => {
  try {
    const flow = flowService.updateFlow(req.params.id, req.body);
    if (!flow) {
      return res.status(404).json({ success: false, error: 'Flow not found' });
    }
    res.json({ success: true, data: flow });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/flows/:id - delete flow
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = flowService.deleteFlow(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Flow not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/flows/:id/run - execute flow
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const flow = flowService.getFlowById(req.params.id);
    if (!flow) {
      return res.status(404).json({ success: false, error: 'Flow not found' });
    }

    const executionId = uuidv4();
    const startedAt = new Date().toISOString();

    // Save execution record
    db.prepare(`
      INSERT INTO execution_logs (id, flow_id, status, started_at)
      VALUES (?, ?, 'running', ?)
    `).run(executionId, flow.id, startedAt);

    const result = await executionService.executeFlow(flow.nodes, flow.edges);

    // Update execution record
    db.prepare(`
      UPDATE execution_logs
      SET status = ?, result = ?, logs = ?, finished_at = ?
      WHERE id = ?
    `).run(
      result.success ? 'success' : 'failed',
      JSON.stringify(result.data),
      JSON.stringify(result.logs),
      new Date().toISOString(),
      executionId
    );

    res.json({ success: true, data: result, executionId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/flows/run-preview - run flow from request body (without saving)
router.post('/run/preview', async (req: Request, res: Response) => {
  try {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) {
      return res.status(400).json({ success: false, error: 'nodes and edges are required' });
    }

    const result = await executionService.executeFlow(nodes, edges);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
