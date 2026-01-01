import { io, Socket } from 'socket.io-client';
import { BlockchainEvent } from '../types';

const SOCKET_URL = 'http://localhost:3001';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) {
      console.log('Already connected to WebSocket');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    const events = [
      'reservationCreated',
      'paymentConfirmed',
      'parkingStarted',
      'parkingEnded',
      'blockCommitted',
      'attackDetected',
    ];

    events.forEach((eventType) => {
      this.socket!.on(eventType, (data: BlockchainEvent) => {
        console.log(`Received ${eventType} event:`, data);
        this.notifyListeners(eventType, data);
      });
    });
  }

  on(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private notifyListeners(eventType: string, data: any): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  subscribe(channel: string): void {
    if (this.socket) {
      this.socket.emit('subscribe', channel);
    }
  }
}

export const wsService = new WebSocketService();
export default wsService;
