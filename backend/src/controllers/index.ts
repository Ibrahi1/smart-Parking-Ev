import { Request, Response } from 'express';
import { blockchainService } from '../services/blockchain.service';
import { logger } from '../config/logger';

export class ParkingController {
  async createParking(req: Request, res: Response): Promise<void> {
    try {
      const { parkingId, name, location, totalPlaces, evStations } = req.body;

      if (!parkingId || !name || !location || !totalPlaces || !evStations) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await blockchainService.createParking(
        parkingId,
        name,
        location,
        parseInt(totalPlaces),
        parseInt(evStations)
      );

      // Create places for the parking
      const places = [];
      const regularPlaces = parseInt(totalPlaces) - parseInt(evStations);
      
      // Create regular places
      for (let i = 1; i <= regularPlaces; i++) {
        const placeId = `${parkingId}-R${i.toString().padStart(3, '0')}`;
        const placeResult = await blockchainService.createPlace(placeId, parkingId, 'regular');
        places.push(placeResult.place);
      }
      
      // Create EV places
      for (let i = 1; i <= parseInt(evStations); i++) {
        const placeId = `${parkingId}-E${i.toString().padStart(3, '0')}`;
        const placeResult = await blockchainService.createPlace(placeId, parkingId, 'ev');
        places.push(placeResult.place);
      }

      res.status(201).json({
        success: true,
        parking: result.parking,
        places: places,
        metrics: result.metrics,
      });
    } catch (error: any) {
      logger.error('Error creating parking:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getParking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parking = await blockchainService.getParking(id);
      res.json({ success: true, parking });
    } catch (error: any) {
      logger.error('Error getting parking:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getAllParkings(req: Request, res: Response): Promise<void> {
    try {
      const parkings = await blockchainService.getAllParkings();
      res.json({ success: true, parkings });
    } catch (error: any) {
      logger.error('Error getting parkings:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPlaces(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // First try to get existing places
      let places: any[] = [];
      try {
        places = await blockchainService.getPlaces(id);
      } catch (e) {
        // Places might not exist yet
        places = [];
      }
      
      // If no places exist, create them based on parking data
      if (places.length === 0) {
        const parking = await blockchainService.getParking(id);
        const totalPlaces = parking.totalPlaces;
        const evStations = parking.evStations;
        const regularPlaces = totalPlaces - evStations;
        
        // Create regular places
        for (let i = 1; i <= regularPlaces; i++) {
          const placeId = `${id}-R${i.toString().padStart(3, '0')}`;
          try {
            const placeResult = await blockchainService.createPlace(placeId, id, 'regular');
            places.push(placeResult.place);
          } catch (e) {
            // Place might already exist, skip
          }
        }
        
        // Create EV places
        for (let i = 1; i <= evStations; i++) {
          const placeId = `${id}-E${i.toString().padStart(3, '0')}`;
          try {
            const placeResult = await blockchainService.createPlace(placeId, id, 'ev');
            places.push(placeResult.place);
          } catch (e) {
            // Place might already exist, skip
          }
        }
      }
      
      res.json({ success: true, places });
    } catch (error: any) {
      logger.error('Error getting places:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export class CarController {
  async registerCar(req: Request, res: Response): Promise<void> {
    try {
      const { carId, owner, batteryLevel, evCompatible, parkingId } = req.body;

      if (!carId || !owner || batteryLevel === undefined || evCompatible === undefined || !parkingId) {
        res.status(400).json({ error: 'Missing required fields: carId, owner, batteryLevel, evCompatible, parkingId' });
        return;
      }

      // Check available places in the parking
      const places = await blockchainService.getPlaces(parkingId);
      const availablePlaces = places.filter((place: any) => place.status === 'free');
      if (availablePlaces.length === 0) {
        res.status(400).json({ error: 'No available places in the parking' });
        return;
      }

      // Register the car
      const carResult = await blockchainService.registerCar(
        carId,
        owner,
        parseInt(batteryLevel),
        evCompatible === 'true' || evCompatible === true,
        parkingId
      );

      // Automatically create a reservation for the first available place
      const desiredType = evCompatible ? 'ev' : 'regular';
      const suitablePlaces = availablePlaces.filter((place: any) => place.type === desiredType);
      if (suitablePlaces.length === 0) {
        res.status(400).json({ error: `No available ${desiredType} places` });
        return;
      }

      const reservationResult = await blockchainService.requestReservation(
        carId,
        parkingId,
        desiredType
      );

      res.status(201).json({
        success: true,
        car: carResult.car,
        reservation: reservationResult.reservation,
        place: reservationResult.place,
        metrics: { ...carResult.metrics, ...reservationResult.metrics },
      });
    } catch (error: any) {
      logger.error('Error registering car and creating reservation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const car = await blockchainService.getCar(id);
      res.json({ success: true, car });
    } catch (error: any) {
      logger.error('Error getting car:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getAllCars(req: Request, res: Response): Promise<void> {
    try {
      const cars = await blockchainService.getAllCars();
      res.json({ success: true, cars });
    } catch (error: any) {
      logger.error('Error getting all cars:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateBattery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { batteryLevel } = req.body;

      if (batteryLevel === undefined) {
        res.status(400).json({ error: 'batteryLevel is required' });
        return;
      }

      const result = await blockchainService.updateCarBattery(
        id,
        parseInt(batteryLevel)
      );

      res.json({
        success: true,
        car: result.car,
        metrics: result.metrics,
      });
    } catch (error: any) {
      logger.error('Error updating battery:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export class ReservationController {
  async requestReservation(req: Request, res: Response): Promise<void> {
    try {
      const { carId, parkingId, desiredType } = req.body;

      if (!carId || !parkingId || !desiredType) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (desiredType !== 'regular' && desiredType !== 'ev') {
        res.status(400).json({ error: 'desiredType must be "regular" or "ev"' });
        return;
      }

      const result = await blockchainService.requestReservation(
        carId,
        parkingId,
        desiredType
      );

      res.status(201).json({
        success: true,
        reservation: result.reservation,
        place: result.place,
        txId: result.txId,
        metrics: result.metrics,
      });
    } catch (error: any) {
      logger.error('Error requesting reservation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (!amount) {
        res.status(400).json({ error: 'amount is required' });
        return;
      }

      const result = await blockchainService.confirmPayment(
        id,
        parseFloat(amount)
      );

      res.json({
        success: true,
        reservation: result.reservation,
        metrics: result.metrics,
      });
    } catch (error: any) {
      logger.error('Error confirming payment:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async startParking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await blockchainService.startParking(id);

      res.json({
        success: true,
        reservation: result.reservation,
        place: result.place,
        metrics: result.metrics,
      });
    } catch (error: any) {
      logger.error('Error starting parking:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async endParking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await blockchainService.endParking(id);

      res.json({
        success: true,
        reservation: result.reservation,
        place: result.place,
        metrics: result.metrics,
      });
    } catch (error: any) {
      logger.error('Error ending parking:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getReservations(req: Request, res: Response): Promise<void> {
    try {
      const reservations = await blockchainService.getReservations();
      res.json({ success: true, reservations });
    } catch (error: any) {
      logger.error('Error getting reservations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getActiveReservations(req: Request, res: Response): Promise<void> {
    try {
      const reservations = await blockchainService.getActiveReservations();
      res.json({ success: true, reservations });
    } catch (error: any) {
      logger.error('Error getting active reservations:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export class MetricsController {
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = blockchainService.getMetrics();
      const averageLatency = blockchainService.getAverageLatency();

      res.json({
        success: true,
        metrics,
        summary: {
          totalTransactions: metrics.length,
          averageLatency,
        },
      });
    } catch (error: any) {
      logger.error('Error getting metrics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async clearMetrics(req: Request, res: Response): Promise<void> {
    try {
      blockchainService.clearMetrics();
      res.json({ success: true, message: 'Metrics cleared' });
    } catch (error: any) {
      logger.error('Error clearing metrics:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export class HistoryController {
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const history = await blockchainService.getHistory(id);
      res.json({ success: true, history });
    } catch (error: any) {
      logger.error('Error getting history:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const parkingController = new ParkingController();
export const carController = new CarController();
export const reservationController = new ReservationController();
export const metricsController = new MetricsController();
export const historyController = new HistoryController();
