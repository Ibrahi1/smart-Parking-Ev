export interface Parking {
  parkingId: string;
  name: string;
  location: string;
  totalPlaces: number;
  evStations: number;
  docType: 'parking';
}

export interface Place {
  placeId: string;
  parkingId: string;
  type: 'regular' | 'ev';
  status: 'free' | 'reserved' | 'occupied';
  currentCarId: string | null;
  lastUpdated: string;
  docType: 'place';
}

export interface Car {
  carId: string;
  owner: string;
  batteryLevel: number;
  evCompatible: boolean;
  docType: 'car';
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
  docType: 'reservation';
}

export interface BlockchainEvent {
  type: 'ReservationCreated' | 'PaymentConfirmed' | 'ParkingStarted' | 'ParkingEnded' | 'AttackDetected';
  data: any;
  txId: string;
  timestamp: string;
}

export interface AttackRecord {
  attackId: string;
  attackType: string;
  details: string;
  timestamp: string;
  txId: string;
  docType: 'attack';
}

export interface PerformanceMetrics {
  timestamp: string;
  operation: string;
  latency: number;
  txId: string;
  blockNumber?: number;
}
