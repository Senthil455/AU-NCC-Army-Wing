import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: [env.FRONTEND_URL], credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('combined'));
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
