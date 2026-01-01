import { Contract, ContractEvent } from 'fabric-network';
import { fabricConnection } from '../config/fabric';
import { logger } from '../config/logger';
import { Server as SocketServer } from 'socket.io';

export class EventListenerService {
  private io: SocketServer | null = null;

  setSocketServer(io: SocketServer): void {
    this.io = io;
  }

  async startListening(): Promise<void> {
    try {
      const contract = fabricConnection.getContract();

      logger.info('Starting blockchain event listeners...');

      // Single listener that handles all events
      await contract.addContractListener(
        async (event: ContractEvent) => {
          try {
            if (!event.payload) {
              return;
            }

            const payload = JSON.parse(event.payload.toString());
            const eventName = event.eventName || '';

            switch (eventName) {
              case 'ReservationCreated':
                logger.info('ReservationCreated event received');
                this.broadcastEvent('reservationCreated', payload);
                break;
              case 'PaymentConfirmed':
                logger.info('PaymentConfirmed event received');
                this.broadcastEvent('paymentConfirmed', payload);
                break;
              case 'ParkingStarted':
                logger.info('ParkingStarted event received');
                this.broadcastEvent('parkingStarted', payload);
                break;
              case 'ParkingEnded':
                logger.info('ParkingEnded event received');
                this.broadcastEvent('parkingEnded', payload);
                break;
              case 'AttackDetected':
                logger.info('AttackDetected event received');
                this.broadcastEvent('attackDetected', payload);
                break;
              default:
                logger.debug(`Received event: ${eventName}`);
            }
          } catch (error) {
            logger.error('Error processing contract event:', error);
          }
        }
      );

      logger.info('Contract event listener started successfully');
    } catch (error) {
      logger.error('Failed to start event listeners:', error);
      // Don't throw - allow backend to start even if event listeners fail
      logger.warn('Backend will continue without event listeners');
    }
  }

  private broadcastEvent(eventType: string, data: any): void {
    if (this.io) {
      this.io.emit(eventType, {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
      });
      logger.info(`Broadcasted ${eventType} event to WebSocket clients`);
    }
  }

  stopListening(): void {
    logger.info('Event listeners stopped');
  }
}

export const eventListenerService = new EventListenerService();
