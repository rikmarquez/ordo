// Ordo API Server - Express + tRPC
// Backend principal para el sistema de restaurantes

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import dotenv from 'dotenv';

import { appRouter } from './trpc';
import { createContext } from './context';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares de seguridad y logging
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Configurar dominios en producción
    : ['http://localhost:3000', 'http://localhost:3001'], // Desarrollo
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Ordo API',
    version: '1.0.0'
  });
});

// tRPC endpoint
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ path, error }) => {
    console.error(`❌ tRPC failed on ${path}:`, error);
  },
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handler global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Ordo API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 tRPC endpoint: http://localhost:${PORT}/trpc`);
});

export default app;