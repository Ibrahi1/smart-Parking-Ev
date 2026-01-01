import { Contract } from 'fabric-network';
import { fabricConnection } from '../config/fabric';
import { logger } from '../config/logger';
import {
  Parking,
  Place,
  Car,
  Reservation,
  PerformanceMetrics,
} from '../types';

export class BlockchainService {
  private contract: Contract | null = null;
  private metricsLog: PerformanceMetrics[] = [];

  async initialize(): Promise<void> {
    this.contract = await fabricConnection.connect();
    logger.info('Blockchain service initialized');
  }

  private getContract(): Contract {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }
    return this.contract;
  }

  private async submitWithMetrics(
    operation: string,
    ...args: string[]
  ): Promise<{ result: any; metrics: PerformanceMetrics }> {
    const startTime = Date.now();
    const contract = this.getContract();

    try {
      const result = await contract.submitTransaction(operation, ...args);
      const latency = Date.now() - startTime;

      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        operation,
        latency,
        txId: '', // Will be populated from transaction
      };

      this.metricsLog.push(metrics);

      return {
        result: result.toString() ? JSON.parse(result.toString()) : null,
        metrics,
      };
    } catch (error) {
      logger.error(`Error in ${operation}:`, error);
      throw error;
    }
  }

  private async evaluateWithMetrics(
    operation: string,
    ...args: string[]
  ): Promise<any> {
    const startTime = Date.now();
    const contract = this.getContract();

    try {
      const result = await contract.evaluateTransaction(operation, ...args);
      const latency = Date.now() - startTime;

      logger.info(`Query ${operation} completed in ${latency}ms`);

      return result.toString() ? JSON.parse(result.toString()) : null;
    } catch (error) {
      logger.error(`Error in ${operation}:`, error);
      throw error;
    }
  }

  // ==================== PARKING OPERATIONS ====================

  async createParking(
    parkingId: string,
    name: string,
    location: string,
    totalPlaces: number,
    evStations: number
  ): Promise<{ parking: Parking; metrics: PerformanceMetrics }> {
    const { result, metrics } = await this.submitWithMetrics(
      'CreateParking',
      parkingId,
      name,
      location,
      totalPlaces.toString(),
      evStations.toString()
    );

    return { parking: result, metrics };
  }

  async getParking(parkingId: string): Promise<Parking> {
    return await this.evaluateWithMetrics('QueryParking', parkingId);
  }

  async getAllParkings(): Promise<Parking[]> {
    return await this.evaluateWithMetrics('QueryAllParkings');
  }

  // ==================== PLACE OPERATIONS ====================

  async createPlace(
    placeId: string,
    parkingId: string,
    type: 'regular' | 'ev'
  ): Promise<{ place: Place; metrics: PerformanceMetrics }> {
    const { result, metrics } = await this.submitWithMetrics(
      'CreatePlace',
      placeId,
      parkingId,
      type
    );

    return { place: result, metrics };
  }

  async getPlaces(parkingId: string): Promise<Place[]> {
    return await this.evaluateWithMetrics('QueryPlaces', parkingId);
  }

  async getPlace(placeId: string): Promise<Place> {
    return await this.evaluateWithMetrics('QueryPlace', placeId);
  }

  // ==================== CAR OPERATIONS ====================

  async registerCar(
    carId: string,
    owner: string,
    batteryLevel: number,
    evCompatible: boolean,
    parkingId: string
  ): Promise<{ car: Car; metrics: PerformanceMetrics }> {
    const { result, metrics } = await this.submitWithMetrics(
      'RegisterCar',
      carId,
      owner,
      batteryLevel.toString(),
      evCompatible.toString(),
      parkingId
    );

    return { car: result, metrics };
  }

  async getCar(carId: string): Promise<Car> {
    return await this.evaluateWithMetrics('QueryCar', carId);
  }

  async getAllCars(): Promise<Car[]> {
    return await this.evaluateWithMetrics('QueryAllCars');
  }

  async updateCarBattery(
    carId: string,
    batteryLevel: number
  ): Promise<{ car: Car; metrics: PerformanceMetrics }> {
    const { result, metrics } = await this.submitWithMetrics(
      'UpdateCarBattery',
      carId,
      batteryLevel.toString()
    );

    return { car: result, metrics };
  }

  // ==================== RESERVATION OPERATIONS ====================

  async requestReservation(
    carId: string,
    parkingId: string,
    desiredType: 'regular' | 'ev'
  ): Promise<{ reservation: Reservation; place: Place; txId: string; metrics: PerformanceMetrics }> {
    const { result, metrics } = await this.submitWithMetrics(
      'RequestReservation',
      carId,
      parkingId,
      desiredType
    );

    return { reservation: result.reservation, place: result.place, txId: result.txId, metrics };
  }

  async confirmPayment(
    reservationId: string,
    amount: number
  ): Promise<{ reservation: Reservation; metrics: PerformanceMetrics }> {
    const { result, metrics } = await this.submitWithMetrics(
      'ConfirmPayment',
      reservationId,
      amount.toString()
    );

    return { reservation: result, metrics };
  }

  async startParking(
    reservationId: string
  ): Promise<{
    reservation: Reservation;
    place: Place;
    metrics: PerformanceMetrics;
  }> {
    const { result, metrics } = await this.submitWithMetrics(
      'StartParking',
      reservationId
    );

    return { ...result, metrics };
  }

  async endParking(
    reservationId: string
  ): Promise<{
    reservation: Reservation;
    place: Place;
    metrics: PerformanceMetrics;
  }> {
    const { result, metrics } = await this.submitWithMetrics(
      'EndParking',
      reservationId
    );

    return { ...result, metrics };
  }

  async getReservations(): Promise<Reservation[]> {
    return await this.evaluateWithMetrics('QueryReservations');
  }

  async getActiveReservations(): Promise<Reservation[]> {
    return await this.evaluateWithMetrics('QueryActiveReservations');
  }

  async getReservationsByParking(parkingId: string): Promise<Reservation[]> {
    return await this.evaluateWithMetrics(
      'QueryReservationsByParking',
      parkingId
    );
  }

  // ==================== HISTORY & ATTACK ====================

  async getHistory(assetId: string): Promise<any[]> {
    return await this.evaluateWithMetrics('GetHistory', assetId);
  }

  async detectAttack(
    attackType: string,
    details: string
  ): Promise<{ attack: any; metrics: PerformanceMetrics }> {
    const { result, metrics } = await this.submitWithMetrics(
      'DetectAttack',
      attackType,
      details
    );

    return { attack: result, metrics };
  }

  // ==================== METRICS ====================

  getMetrics(): PerformanceMetrics[] {
    return this.metricsLog;
  }

  clearMetrics(): void {
    this.metricsLog = [];
  }

  getAverageLatency(): number {
    if (this.metricsLog.length === 0) return 0;
    const sum = this.metricsLog.reduce((acc, m) => acc + m.latency, 0);
    return sum / this.metricsLog.length;
  }
}

export const blockchainService = new BlockchainService();
