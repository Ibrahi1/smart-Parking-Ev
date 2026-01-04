import express, { Application } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import routes from './routes';
import { blockchainService } from './services/blockchain.service';
import { eventListenerService } from './services/event.service';
import { logger } from './config/logger';
import * as fs from 'fs';
import * as path from 'path';
import { securityService } from './services/security.service';
import { siemService } from './services/siem.service';
import { alertService } from './services/alert.service';
import { incidentService } from './services/incident.service';
import { socLogger } from './middleware/soc-logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/api', socLogger);
// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('subscribe', (channel: string) => {
    socket.join(channel);
    logger.info(`Client ${socket.id} subscribed to ${channel}`);
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Initialize application
async function initialize() {
  try {
    // Initialize SOC services
    logger.info('Initializing SOC services...');
    await securityService.initialize();
    await siemService.start();
    logger.info('SOC services started');

    // Connect SOC to WebSocket
    alertService.on('alert', (alert) => {
      io.emit('securityAlert', alert);
    });

    siemService.on('threatDetected', (data) => {
      io.emit('threatDetected', data);
    });

    incidentService.on('incidentCreated', (incident) => {
      io.emit('incidentCreated', incident);
    });
    
    // Create logs directory
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    logger.info('Starting Smart Parking Backend...');

    // Initialize blockchain connection
    await blockchainService.initialize();
    logger.info('Blockchain service initialized');

    // Setup event listeners
    eventListenerService.setSocketServer(io);
    await eventListenerService.startListening();
    logger.info('Event listeners started');

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`WebSocket server ready`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API endpoint: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  eventListenerService.stopListening();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  eventListenerService.stopListening();
  process.exit(0);
});

// Start the application
initialize();

export { app, io };
