import { Router } from 'express';
import {
  parkingController,
  carController,
  reservationController,
  metricsController,
  historyController,
} from '../controllers';

const router = Router();

// ==================== PARKING ROUTES ====================
router.post('/parking', (req, res) => parkingController.createParking(req, res));
router.get('/parking', (req, res) => parkingController.getAllParkings(req, res));
router.get('/parking/:id', (req, res) => parkingController.getParking(req, res));
router.get('/parking/:id/places', (req, res) => parkingController.getPlaces(req, res));

// ==================== CAR ROUTES ====================
router.post('/car', (req, res) => carController.registerCar(req, res));
router.get('/car', (req, res) => carController.getAllCars(req, res));
router.get('/car/:id', (req, res) => carController.getCar(req, res));
router.put('/car/:id/battery', (req, res) => carController.updateBattery(req, res));
router.delete('/car/:id', (req, res) => carController.removeCar(req, res));

// ==================== RESERVATION ROUTES ====================
router.post('/reservation', (req, res) => reservationController.requestReservation(req, res));
router.get('/reservation', (req, res) => reservationController.getReservations(req, res));
router.get('/reservation/active', (req, res) => reservationController.getActiveReservations(req, res));
router.post('/reservation/:id/pay', (req, res) => reservationController.confirmPayment(req, res));
router.post('/reservation/:id/start', (req, res) => reservationController.startParking(req, res));
router.post('/reservation/:id/end', (req, res) => reservationController.endParking(req, res));

// ==================== METRICS ROUTES ====================
router.get('/metrics', (req, res) => metricsController.getMetrics(req, res));
router.delete('/metrics', (req, res) => metricsController.clearMetrics(req, res));

// ==================== HISTORY ROUTES ====================
router.get('/history/:id', (req, res) => historyController.getHistory(req, res));

export default router;
