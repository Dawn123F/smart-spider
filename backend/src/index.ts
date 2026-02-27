import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './db';
import flowsRouter from './routes/flows';
import proxyRouter from './routes/proxy';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize database
initDB();

// Routes
app.use('/api/flows', flowsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🕷️  智蛛后端服务启动于 http://localhost:${PORT}`);
});

export default app;
