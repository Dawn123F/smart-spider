import { Router, Request, Response } from 'express';
import { proxyService } from '../services/proxyService';
import axios from 'axios';

const router = Router();

// POST /api/proxy/fetch - fetch a webpage for preview
router.post('/fetch', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const result = await proxyService.fetchPage(url);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/proxy/extract - extract elements from a page
router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { url, selector } = req.body;
    if (!url || !selector) {
      return res.status(400).json({ success: false, error: 'URL and selector are required' });
    }

    const elements = await proxyService.extractElements(url, selector);
    res.json({ success: true, data: elements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/proxy/resource - proxy external resources (images, css, etc.)
router.get('/resource', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send('URL is required');
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.send(response.data);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

export default router;
