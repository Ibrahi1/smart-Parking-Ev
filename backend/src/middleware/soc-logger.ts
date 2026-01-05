// backend/src/middleware/soc-logger.ts

import { Request, Response, NextFunction } from 'express';
import { securityService } from '../services/security.service';

export const socLogger = (req: Request, res: Response, next: NextFunction) => {
  // Store original send function
  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody: any;

  // Override send
  res.send = function(body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Override json
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Capture response
  res.on('finish', () => {
    try {
      recordSecurityEvent(req, res, responseBody);
    } catch (error) {
      console.error('Error recording security event:', error);
    }
  });

  next();
};

function recordSecurityEvent(req: Request, res: Response, body: any) {
  const path = req.path;
  const method = req.method;
  const statusCode = res.statusCode;
  const success = statusCode >= 200 && statusCode < 300;

  // Get IP address
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             req.socket.remoteAddress || 
             'unknown';

  // Parse response body if string
  let parsedBody = body;
  if (typeof body === 'string') {
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      parsedBody = { raw: body };
    }
  }

  // Log ALL API access for rate limiting and DDoS detection
  securityService.recordEvent({
    type: 'info',
    severity: 'low',
    category: 'api_access',
    title: 'API Request',
    description: `${method} ${path}`,
    source: {
      ip,
      component: 'api',
    },
    details: {
      method,
      path,
      statusCode,
      success,
    },
  });

  // Log reservation attempts
  if (path.includes('/reservation') && method === 'POST' && !path.includes('/pay') && !path.includes('/start') && !path.includes('/end')) {
    securityService.recordEvent({
      type: success ? 'info' : 'warning',
      severity: success ? 'low' : 'medium',
      category: 'reservation',
      title: success ? 'Reservation Created' : 'Reservation Failed',
      description: success 
        ? `Reservation created for car ${req.body?.carId}` 
        : `Failed reservation attempt for car ${req.body?.carId}`,
      source: {
        ip,
        carId: req.body?.carId,
        component: 'api',
      },
      details: {
        success,
        statusCode,
        carId: req.body?.carId,
        placeId: req.body?.placeId,
        placeType: req.body?.placeType,
        error: parsedBody?.error,
      },
    });
  }

  // Log car creation
  if (path.includes('/car') && method === 'POST') {
    securityService.recordEvent({
      type: 'info',
      severity: 'low',
      category: 'car_registration',
      title: 'Car Registered',
      description: `New car registered: ${req.body?.carId || 'unknown'}`,
      source: {
        ip,
        carId: req.body?.carId,
        component: 'api',
      },
      details: {
        carId: req.body?.carId,
        owner: req.body?.owner,
        evCompatible: req.body?.evCompatible,
      },
    });
  }

  // Log payment confirmations
  if (path.includes('/pay') && method === 'POST') {
    securityService.recordEvent({
      type: success ? 'info' : 'warning',
      severity: 'low',
      category: 'payment',
      title: success ? 'Payment Confirmed' : 'Payment Failed',
      description: `Payment ${success ? 'confirmed' : 'failed'} for reservation`,
      source: {
        ip,
        component: 'api',
      },
      details: {
        success,
        reservationId: req.params?.id,
        error: parsedBody?.error,
      },
    });
  }

  // Log parking start attempts (CRITICAL for fraud detection)
  if (path.includes('/start') && method === 'POST') {
    const isFraud = !success && parsedBody?.error?.includes('payment');
    
    securityService.recordEvent({
      type: isFraud ? 'threat' : (success ? 'info' : 'warning'),
      severity: isFraud ? 'high' : (success ? 'low' : 'medium'),
      category: isFraud ? 'payment_fraud' : 'parking',
      title: isFraud ? 'Payment Fraud Attempt' : (success ? 'Parking Started' : 'Parking Start Failed'),
      description: isFraud 
        ? 'Attempted to start parking without confirmed payment'
        : (success ? 'Parking session started' : 'Failed to start parking'),
      source: {
        ip,
        component: 'api',
      },
      details: {
        success,
        fraud_attempt: isFraud,
        reservationId: req.params?.id,
        error: parsedBody?.error,
      },
    });
  }

  // Log parking end
  if (path.includes('/end') && method === 'POST') {
    securityService.recordEvent({
      type: 'info',
      severity: 'low',
      category: 'parking',
      title: 'Parking Ended',
      description: 'Parking session ended',
      source: {
        ip,
        component: 'api',
      },
      details: {
        success,
        reservationId: req.params?.id,
      },
    });
  }

  // Log blockchain transactions
  if (path.includes('/chaincode')) {
    securityService.recordEvent({
      type: 'info',
      severity: 'low',
      category: 'blockchain_transaction',
      title: 'Blockchain Transaction',
      description: `Chaincode invocation: ${method} ${path}`,
      source: {
        ip,
        component: 'blockchain',
      },
      details: {
        method,
        path,
        statusCode,
      },
    });
  }
}