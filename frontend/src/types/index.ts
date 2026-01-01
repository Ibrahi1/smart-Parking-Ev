export interface Parking {
  parkingId: string;
  name: string;
  location: string;
  totalPlaces: number;
  evStations: number;
}

export interface Place {
  placeId: string;
  parkingId: string;
  type: 'regular' | 'ev';
  status: 'free' | 'reserved' | 'occupied';
  currentCarId: string | null;
  lastUpdated: string;
  position?: { x: number; y: number; z: number };
}

export interface Car {
  carId: string;
  owner: string;
  batteryLevel: number;
  evCompatible: boolean;
  parkingId: string;
  position?: { x: number; y: number; z: number };
  targetPlace?: string;
}

export interface Reservation {
  reservationId: string;
  carId: string;
  placeId: string;
  parkingId: string;
  startTime: string;
  endTime: string | null;
  paid: boolean;
  active: boolean;
  amount?: number;
  paymentTime?: string;
  parkingStarted?: string;
  txId: string;
}

export interface BlockchainEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface PerformanceMetrics {
  timestamp: string;
  operation: string;
  latency: number;
  txId: string;
  blockNumber?: number;
}

export interface Transaction {
  txId: string;
  operation: string;
  timestamp: string;
  latency: number;
  status: 'success' | 'failed';
}
