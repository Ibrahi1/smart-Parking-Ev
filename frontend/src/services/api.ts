import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const parkingAPI = {
  createParking: async (data: {
    parkingId: string;
    name: string;
    location: string;
    totalPlaces: number;
    evStations: number;
  }) => {
    const response = await api.post('/parking', data);
    return response.data;
  },

  getParking: async (parkingId: string) => {
    const response = await api.get(`/parking/${parkingId}`);
    return response.data;
  },

  getAllParkings: async () => {
    const response = await api.get('/parking');
    return response.data;
  },

  getPlaces: async (parkingId: string) => {
    const response = await api.get(`/parking/${parkingId}/places`);
    return response.data;
  },
};

export const carAPI = {
  registerCar: async (data: {
    carId: string;
    owner: string;
    batteryLevel: number;
    evCompatible: boolean;
    parkingId: string;
  }) => {
    const response = await api.post('/car', data);
    return response.data;
  },

  getAllCars: async () => {
    const response = await api.get('/car');
    return response.data;
  },

  getCar: async (carId: string) => {
    const response = await api.get(`/car/${carId}`);
    return response.data;
  },

  updateBattery: async (carId: string, batteryLevel: number) => {
    const response = await api.put(`/car/${carId}/battery`, { batteryLevel });
    return response.data;
  },
};

export const reservationAPI = {
  requestReservation: async (data: {
    carId: string;
    parkingId: string;
    desiredType: 'regular' | 'ev';
  }) => {
    const response = await api.post('/reservation', data);
    return response.data;
  },

  getReservations: async () => {
    const response = await api.get('/reservation');
    return response.data;
  },

  getActiveReservations: async () => {
    const response = await api.get('/reservation/active');
    return response.data;
  },

  confirmPayment: async (reservationId: string, amount: number) => {
    const response = await api.post(`/reservation/${reservationId}/pay`, { amount });
    return response.data;
  },

  startParking: async (reservationId: string) => {
    const response = await api.post(`/reservation/${reservationId}/start`);
    return response.data;
  },

  endParking: async (reservationId: string) => {
    const response = await api.post(`/reservation/${reservationId}/end`);
    return response.data;
  },
};

export const metricsAPI = {
  getMetrics: async () => {
    const response = await api.get('/metrics');
    return response.data;
  },

  clearMetrics: async () => {
    const response = await api.delete('/metrics');
    return response.data;
  },
};

export const historyAPI = {
  getHistory: async (assetId: string) => {
    const response = await api.get(`/history/${assetId}`);
    return response.data;
  },
};

export default api;
