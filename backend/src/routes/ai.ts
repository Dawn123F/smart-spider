import { Router, Request, Response } from 'express';
import { aiService, FLOW_TEMPLATES } from '../services/aiService';

const router = Router();

// POST /api/ai/chat - chat with AI assistant
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, flowContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    const response = await aiService.chat(messages, flowContext);
    res.json({ success: true, data: { content: response } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/suggest-selector - suggest CSS selector for elements
router.post('/suggest-selector', async (req: Request, res: Response) => {
  try {
    const { html, description } = req.body;
    if (!html || !description) {
      return res.status(400).json({ success: false, error: 'html and description are required' });
    }

    const result = await aiService.suggestSelector(html, description);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ai/templates - get flow templates list
router.get('/templates', (req: Request, res: Response) => {
  res.json({ success: true, data: FLOW_TEMPLATES });
});

// POST /api/ai/generate-from-template - generate flow from template
router.post('/generate-from-template', async (req: Request, res: Response) => {
  try {
    const { templateKey, url, elements } = req.body;
    if (!templateKey) {
      return res.status(400).json({ success: false, error: 'templateKey is required' });
    }

    const flow = await aiService.generateFlowFromTemplate(templateKey, url, elements);
    res.json({ success: true, data: flow });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/analyze-anti-crawl - analyze anti-crawl strategies
router.post('/analyze-anti-crawl', async (req: Request, res: Response) => {
  try {
    const { url, errorInfo } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }

    const result = await aiService.analyzeAntiCrawl(url, errorInfo);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/generate-from-selection - generate flow from selected elements
router.post('/generate-from-selection', async (req: Request, res: Response) => {
  try {
    const { url, elements } = req.body;
    if (!url || !elements || !Array.isArray(elements)) {
      return res.status(400).json({ success: false, error: 'url and elements array are required' });
    }

    const flow = await aiService.generateFlowFromSelection(url, elements);
    res.json({ success: true, data: flow });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
