import React, { useState, useEffect } from 'react';
import ParkingLot3D from './components/ParkingLot3D';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import PaymentHistory from './components/PaymentHistory';
import { parkingAPI, carAPI, reservationAPI, metricsAPI } from './services/api';
import wsService from './services/websocket';
import { Place, Car, Transaction, Reservation, Parking } from './types';
import SOCDashboard from './components/SOCDashboard';
// import AIAnalysisDashboard from './components/AIAnalysisDashboard';

function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [activeTab, setActiveTab] = useState<'parking' | 'soc'>('parking');
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Load transactions from localStorage on initialization
    try {
      const saved = localStorage.getItem('smartParkingTransactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('smartParkingTransactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save transactions to localStorage:', error);
    }
  }, [transactions]);
  const [selectedParkingId, setSelectedParkingId] = useState<string>('P1');
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    averageLatency: 0,
    successRate: 1.0,
    lastBlockNumber: 0,
  });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [activeModal, setActiveModal] = useState<'dashboard' | 'payment' | null>(null);

  // Initialize parking and connect to WebSocket
  useEffect(() => {
    initialize();
    wsService.connect();

    // Setup WebSocket event listeners
    wsService.on('reservationCreated', handleReservationCreated);
    wsService.on('paymentConfirmed', handlePaymentConfirmed);
    wsService.on('parkingStarted', handleParkingStarted);
    wsService.on('parkingEnded', handleParkingEnded);
    wsService.on('blockCommitted', handleBlockCommitted);
    wsService.on('attackDetected', handleAttackDetected);

    return () => {
      wsService.disconnect();
    };
  }, []);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (initialized) {
        refreshPlaces();
        refreshReservations();
        refreshCars();
        refreshParkings();
        refreshTransactions();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [initialized]);

  const initialize = async () => {
    try {
      // Get all parkings first
      await refreshParkings();

      // Set default selected parking
      if (parkings.length > 0) {
        setSelectedParkingId(parkings[0].parkingId);
      }

      // Get places for all parkings
      await refreshPlaces();

      // Get reservations
      await refreshReservations();

      // Get cars
      await refreshCars();

      // Get transactions/metrics
      await refreshTransactions();

      setInitialized(true);
    } catch (error) {
      console.error('Initialization error:', error);
      alert('Failed to initialize. Make sure the backend and blockchain are running.');
    }
  };

  const refreshParkings = async () => {
    try {
      const parkingsData = await parkingAPI.getAllParkings();
      setParkings(parkingsData.parkings || []);
    } catch (error) {
      console.error('Error refreshing parkings:', error);
    }
  };

  const refreshPlaces = async () => {
    try {
      // Get places for all parkings
      const allPlaces: Place[] = [];
      for (const parking of parkings) {
        try {
          const placesData = await parkingAPI.getPlaces(parking.parkingId);
          allPlaces.push(...placesData.places);
        } catch (e) {
          // Skip if parking has no places yet
        }
      }
      setPlaces(allPlaces);
    } catch (error) {
      console.error('Error refreshing places:', error);
    }
  };

  const refreshReservations = async () => {
    try {
      const reservationsData = await reservationAPI.getReservations();
      setReservations(reservationsData.reservations || []);
    } catch (error) {
      console.error('Error refreshing reservations:', error);
    }
  };

  const refreshCars = async () => {
    try {
      const carsData = await carAPI.getAllCars();
      setCars(carsData.cars);
    } catch (error) {
      console.error('Error refreshing cars:', error);
    }
  };

  const refreshTransactions = async () => {
    try {
      const metricsData = await metricsAPI.getMetrics();
      // Convert PerformanceMetrics to Transaction format
      const backendTransactions: Transaction[] = metricsData.metrics.map((metric: any) => ({
        txId: metric.txId || 'N/A',
        operation: metric.operation,
        timestamp: metric.timestamp,
        latency: metric.latency,
        status: 'success' as const, // Assume success since they're logged
      }));

      // Merge with existing transactions, avoiding duplicates
      setTransactions(prevTransactions => {
        const existingTxIds = new Set(prevTransactions.map(tx => tx.txId));
        const newTransactions = backendTransactions.filter(tx => !existingTxIds.has(tx.txId));
        return [...prevTransactions, ...newTransactions];
      });
      
      // Update metrics summary
      setMetrics(prev => ({
        ...prev,
        totalTransactions: metricsData.summary.totalTransactions,
        averageLatency: metricsData.summary.averageLatency,
      }));
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    }
  };

  const refreshData = async () => {
    await refreshParkings();
    await refreshPlaces();
    await refreshReservations();
    await refreshCars();
    await refreshTransactions();
  };

  const handleCreateParking = async (parkingData: {
    parkingId: string;
    name: string;
    location: string;
    totalPlaces: number;
    evStations: number;
  }) => {
    setLoading(true);
    try {
      const result = await parkingAPI.createParking(parkingData);
      console.log('Parking created:', result);
      await refreshParkings(); // Refresh parkings list
      await refreshPlaces(); // Refresh places since new places were created
      alert(`Parking ${parkingData.parkingId} created successfully with ${parkingData.totalPlaces} places!`);
    } catch (error: any) {
      console.error('Error creating parking:', error);
      alert(`Failed to create parking: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCar = async (carData: {
    owner: string;
    evCompatible: boolean;
    batteryLevel: number;
    parkingId: string;
  }) => {
    setLoading(true);
    try {
      // First, check if there are available places for this car type
      const parkingPlaces = places.filter(p => p.parkingId === carData.parkingId);
      const desiredType = carData.evCompatible ? 'ev' : 'regular';
      const availablePlaces = parkingPlaces.filter(p => p.status === 'free' && p.type === desiredType);
      
      if (availablePlaces.length === 0) {
        // Check if there are any places of the desired type at all
        const totalPlacesOfType = parkingPlaces.filter(p => p.type === desiredType);
        if (totalPlacesOfType.length === 0) {
          alert(`❌ No ${desiredType.toUpperCase()} parking places exist in this parking lot. Please choose a different parking or car type.`);
        } else {
          alert(`❌ All ${desiredType.toUpperCase()} parking places are currently reserved or occupied. Please try again later.`);
        }
        setLoading(false);
        return;
      }

      const carId = `CAR-${Date.now()}`;
      const result = await carAPI.registerCar({
        carId,
        owner: carData.owner,
        batteryLevel: carData.batteryLevel,
        evCompatible: carData.evCompatible,
        parkingId: carData.parkingId,
      });

      const newCar: Car = {
        ...result.car,
        parkingId: carData.parkingId,
        position: { x: -15, y: 0.5, z: 0 },
      };

      setCars((prev) => [...prev, newCar]);

      addTransaction({
        txId: result.metrics.txId || 'N/A',
        operation: 'RegisterCar',
        timestamp: new Date().toISOString(),
        latency: result.metrics.latency,
        status: 'success',
      });

      setMetrics((prev) => ({
        ...prev,
        totalTransactions: prev.totalTransactions + 1,
      }));

      // Auto-confirm payment for the reservation created by the backend
      if (result.reservation && result.reservation.reservationId) {
        try {
          console.log('Auto-confirming payment for reservation:', result.reservation.reservationId);
          const paymentResult = await reservationAPI.confirmPayment(result.reservation.reservationId, 10.0);
          console.log('Payment confirmed:', paymentResult);
          
          // Auto-start parking after payment
          setTimeout(async () => {
            try {
              console.log('Auto-starting parking for reservation:', result.reservation.reservationId);
              await reservationAPI.startParking(result.reservation.reservationId);
              console.log('Parking started successfully');
              await refreshReservations();
              await refreshPlaces();
            } catch (startError) {
              console.error('Error auto-starting parking:', startError);
            }
          }, 1000);
        } catch (paymentError) {
          console.error('Payment confirmation failed:', paymentError);
          alert(`⚠️ Car registered but payment confirmation failed: ${paymentError instanceof Error ? paymentError.message : String(paymentError)}`);
        }
      }

      // Refresh data to show the new reservation
      await refreshData();

      alert(`✅ Car ${carId} registered, reserved, and payment confirmed successfully!`);
    } catch (error: any) {
      console.error('Error creating car:', error);
      
      // Check if error is about no available places
      if (error.message && (error.message.includes('No available') || error.message.includes('no available'))) {
        alert(`❌ No available parking places. All spots are currently reserved or occupied.`);
      } else {
        alert(`❌ Failed to create car: ${error.message}`);
      }
      
      addTransaction({
        txId: 'N/A',
        operation: 'RegisterCar',
        timestamp: new Date().toISOString(),
        latency: 0,
        status: 'failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReservePlace = async (carId: string, desiredType: 'regular' | 'ev') => {
    setLoading(true);
    try {
      // Find the car's parking
      const car = cars.find(c => c.carId === carId);
      const parkingId = car?.parkingId || 'P1';

      // Check if there are available places for this type
      const parkingPlaces = places.filter(p => p.parkingId === parkingId);
      const availablePlaces = parkingPlaces.filter(p => p.status === 'free' && p.type === desiredType);
      
      if (availablePlaces.length === 0) {
        const totalPlacesOfType = parkingPlaces.filter(p => p.type === desiredType);
        if (totalPlacesOfType.length === 0) {
          alert(`❌ No ${desiredType.toUpperCase()} parking places exist in this parking lot.`);
        } else {
          alert(`❌ All ${desiredType.toUpperCase()} parking places are currently reserved or occupied. Please try again later.`);
        }
        setLoading(false);
        return;
      }

      const result = await reservationAPI.requestReservation({
        carId,
        parkingId,
        desiredType,
      });

      // Update car target
      setCars((prev) =>
        prev.map((car) =>
          car.carId === carId
            ? { ...car, targetPlace: result.place.placeId }
            : car
        )
      );

      // Update places
      await refreshPlaces();

      // Refresh reservations
      await refreshReservations();

      addTransaction({
        txId: result.txId,
        operation: 'RequestReservation',
        timestamp: new Date().toISOString(),
        latency: result.metrics.latency,
        status: 'success',
      });

      setMetrics((prev) => ({
        ...prev,
        totalTransactions: prev.totalTransactions + 1,
      }));

      // Auto-confirm payment immediately
      try {
        console.log('Auto-confirming payment for reservation:', result.reservation.reservationId);
        console.log('Reservation before payment:', result.reservation);
        const paymentResult = await reservationAPI.confirmPayment(result.reservation.reservationId, 10.0);
        console.log('Payment confirmed result:', paymentResult);
        
        // The paymentResult.reservation should contain the updated reservation with paid=true
        if (paymentResult && paymentResult.reservation) {
          console.log('Updated reservation after payment confirmation:', paymentResult.reservation);
        }
        
        // Refresh reservations to ensure payment data is updated
        await refreshReservations();
      } catch (error) {
        console.error('Payment confirmation failed:', error);
        alert(`❌ Payment confirmation failed: ${error instanceof Error ? error.message : String(error)}`);
        // Even if payment fails, we still want to refresh to show the current state
        await refreshReservations();
      }

      // Auto-start after delay
      setTimeout(async () => {
        try {
          console.log('Auto-starting parking for reservation:', result.reservation.reservationId);
          const startResult = await reservationAPI.startParking(result.reservation.reservationId);
          console.log('Parking started:', startResult);
          alert(`✅ Parking started for reservation ${result.reservation.reservationId}`);
          
          // Refresh data after parking starts
          await refreshReservations();
        } catch (error) {
          console.error('Error in auto-start:', error);
          alert(`❌ Error in auto-start: ${error instanceof Error ? error.message : String(error)}`);
        }
      }, 1500);

      alert(`Reservation ${result.reservation.reservationId} created and payment confirmed successfully!`);
    } catch (error: any) {
      console.error('Error reserving place:', error);
      alert(`Failed to reserve: ${error.message}`);
      addTransaction({
        txId: 'N/A',
        operation: 'RequestReservation',
        timestamp: new Date().toISOString(),
        latency: 0,
        status: 'failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCar = async (reservationId: string) => {
    if (!confirm('Are you sure you want to end this parking session?')) {
      return;
    }

    setLoading(true);
    try {
      // First check the reservation status
      const allReservations = await reservationAPI.getReservations();
      const reservation = allReservations.reservations.find((r: Reservation) => r.reservationId === reservationId);
      
      if (!reservation) {
        alert('Reservation not found');
        return;
      }
      
      if (!reservation.parkingStarted) {
        // If parking hasn't started, remove the car instead
        console.log('Parking not started, removing car instead');
        await handleDeleteCar(reservation.carId);
        return;
      }
      
      if (!reservation.active) {
        alert('⚠️ This parking session has already ended');
        setLoading(false);
        return;
      }
      
      console.log('Calling endParking API with reservationId:', reservationId);
      await reservationAPI.endParking(reservationId);
      await refreshPlaces();
      await refreshReservations();
      alert('✅ Parking session ended successfully!');
    } catch (error: any) {
      console.error('Error ending parking:', error);
      alert(`Failed to end parking: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCar = async (carId: string) => {
    if (!confirm('Are you sure you want to remove this car and free the parking place?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/car/${carId}`, { method: 'DELETE' });
      if (!response.ok) {
        let errorMessage = 'Failed to remove car';
        try {
          const responseText = await response.text();
          // Try to parse as JSON if it looks like JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } else {
            errorMessage = responseText || errorMessage;
          }
        } catch (parseError) {
          // If parsing fails, use the status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      // Refresh data asynchronously
      setTimeout(async () => {
        try {
          await refreshPlaces();
          await refreshReservations();
          await refreshCars();
          alert('✅ Car removed successfully and parking place is now available!');
        } catch (refreshError) {
          console.error('Error refreshing data after car removal:', refreshError);
          // Still show success message even if refresh fails
          alert('✅ Car removed successfully and parking place is now available!');
        }
      }, 100);
    } catch (error: any) {
      console.error('Error removing car:', error);
      alert(`Failed to remove car: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCarClick = async (car: Car) => {
    setLoading(true);
    try {
      // Refresh reservations to ensure we have the latest data
      await refreshReservations();
      
      console.log('Current reservations:', reservations);
      console.log('Clicked car:', car);
      
      // Find the active reservation for this car
      const activeReservation = reservations.find(r => r.carId === car.carId && r.active);
      console.log('Active reservation found:', activeReservation);
      
      if (activeReservation) {
        console.log('Ending parking for reservation:', activeReservation.reservationId);
        await handleRemoveCar(activeReservation.reservationId);
      } else {
        alert(`Car ${car.carId} is not currently parked.`);
      }
    } catch (error) {
      console.error('Error handling car click:', error);
      alert('Failed to process car click. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReservationCreated = (data: any) => {
    console.log('Reservation created event:', data);
    refreshPlaces();
    refreshReservations();
  };

  const handlePaymentConfirmed = (data: any) => {
    console.log('Payment confirmed event:', data);
    console.log('Refreshing reservations due to payment confirmation...');
    refreshReservations();
  };

  const handleParkingStarted = (data: any) => {
    console.log('Parking started event:', data);
    refreshPlaces();
  };

  const handleParkingEnded = (data: any) => {
    console.log('Parking ended event:', data);
    refreshPlaces();
  };

  const handleBlockCommitted = (data: any) => {
    console.log('Block committed event:', data);
    setMetrics((prev) => ({
      ...prev,
      lastBlockNumber: parseInt(data.data.blockNumber),
    }));
  };

  const handleAttackDetected = (data: any) => {
    console.log('Attack detected event:', data);
    alert(`⚠️ Attack Detected: ${data.data.attackType}`);
  };

  const addTransaction = (tx: Transaction) => {
    setTransactions((prev) => [...prev, tx]);
  };

  const handleSelectParking = (parking: Parking) => {
    setSelectedParkingId(parking.parkingId);
  };

  const availableCars = cars.filter(car => !reservations.some(r => r.carId === car.carId && r.active)).map((car) => car.carId);

  const filteredPlaces = places.filter(p => p.parkingId === selectedParkingId);

  const filterCars = cars.filter(f => f.parkingId === selectedParkingId);  
  
  return (
  <div style={styles.app}>
    {/* Tab Navigation */}
    <div style={styles.tabNav}>
      <button
        style={{
          ...styles.tab,
          ...(activeTab === 'parking' ? styles.tabActive : {})
        }}
        onClick={() => setActiveTab('parking')}
      >
        🚗 Smart Parking
      </button>
      <button
        style={{
          ...styles.tab,
          ...(activeTab === 'soc' ? styles.tabActive : {})
        }}
        onClick={() => setActiveTab('soc')}
      >
        🛡️ SOC Dashboard
      </button>
      {/* <button onClick={() => setActiveTab('ai')}>🤖 AI Analysis</button> */}
    </div>

    {/* Parking Tab Content */}
    {activeTab === 'parking' && (
      <>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>Smart Parking & EV Charging</h1>
          <p style={styles.headerSubtitle}>Powered by Hyperledger Fabric</p>
        </header>
        <div style={styles.mainContainer}>
          <div style={styles.leftPanel}>
            <ControlPanel
              onCreateCar={handleCreateCar}
              onReservePlace={handleReservePlace}
              onCreateParking={handleCreateParking}
              parkings={parkings}
              availableCars={availableCars}
              loading={loading}
            />
          </div>
          <div style={styles.centerPanel}>
            <ParkingLot3D 
              places={filteredPlaces} 
              cars={filterCars} 
              reservations={reservations} 
              onCarClick={handleCarClick} 
            />
          </div>
          <div style={styles.rightPanel}>
            <div style={styles.rightPanelScroll}>
              {/* Dashboard Summary Card */}
              <div 
                style={styles.summaryCard}
                onClick={() => setActiveModal('dashboard')}
              >
                <div style={styles.summaryCardIcon}>📊</div>
                <div style={styles.summaryCardContent}>
                  <h3 style={styles.summaryCardTitle}>Dashboard</h3>
                  <div style={styles.summaryCardStats}>
                    <span>🚗 {reservations.filter(r => r.active).length} Active</span>
                    <span>📝 {transactions.length} Transactions</span>
                  </div>
                  <p style={styles.summaryCardHint}>Click to view details</p>
                </div>
                <div style={styles.summaryCardArrow}>→</div>
              </div>

              {/* Payment History Summary Card */}
              <div 
                style={styles.summaryCard}
                onClick={() => setActiveModal('payment')}
              >
                <div style={styles.summaryCardIcon}>💰</div>
                <div style={styles.summaryCardContent}>
                  <h3 style={styles.summaryCardTitle}>Payment History</h3>
                  <div style={styles.summaryCardStats}>
                    <span>✅ {reservations.filter(r => r.paid).length} Paid</span>
                    <span>💵 ${reservations.filter(r => r.paid).reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)}</span>
                  </div>
                  <p style={styles.summaryCardHint}>Click to view details</p>
                </div>
                <div style={styles.summaryCardArrow}>→</div>
              </div>

              {/* Quick Stats */}
              <div style={styles.quickStats}>
                <div style={styles.quickStatItem}>
                  <span style={styles.quickStatValue}>{filteredPlaces.filter(p => p.status === 'free').length}</span>
                  <span style={styles.quickStatLabel}>Free Spots</span>
                </div>
                <div style={styles.quickStatItem}>
                  <span style={styles.quickStatValue}>{filteredPlaces.filter(p => p.status === 'occupied').length}</span>
                  <span style={styles.quickStatLabel}>Occupied</span>
                </div>
                <div style={styles.quickStatItem}>
                  <span style={styles.quickStatValue}>{filteredPlaces.filter(p => p.type === 'ev').length}</span>
                  <span style={styles.quickStatLabel}>EV Stations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {!initialized && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}>Loading...</div>
          </div>
        )}

        {/* Modal for Dashboard */}
        {activeModal === 'dashboard' && (
          <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>📊 Dashboard</h2>
                <button 
                  style={styles.modalCloseBtn}
                  onClick={() => setActiveModal(null)}
                >
                  ✕
                </button>
              </div>
              <div style={styles.modalBody}>
                <Dashboard 
                  transactions={transactions} 
                  reservations={reservations} 
                  parkings={parkings} 
                  places={filteredPlaces}
                  selectedParkingId={selectedParkingId}
                  onSelectParking={handleSelectParking}
                  metrics={metrics} 
                  onUpdate={refreshData} 
                  onDeleteCar={handleDeleteCar}
                  loading={loading} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal for Payment History */}
        {activeModal === 'payment' && (
          <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>💰 Payment History</h2>
                <button 
                  style={styles.modalCloseBtn}
                  onClick={() => setActiveModal(null)}
                >
                  ✕
                </button>
              </div>
              <div style={styles.modalBody}>
                <PaymentHistory 
                  reservations={reservations}
                  cars={cars}
                />
              </div>
            </div>
          </div>
        )}
      </>
    )}

    {/* SOC Tab Content */}
    {activeTab === 'soc' && (
      <SOCDashboard />
    )}

    {/* {activeTab === 'ai' && <AIAnalysisDashboard />} */}
  </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#121212',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  // Add these new tab styles:
  tabNav: {
    display: 'flex',
    gap: '0',
    backgroundColor: '#1e1e1e',
    borderBottom: '2px solid #00bcd4',
    padding: '0',
  },
  tab: {
    padding: '15px 30px',
    backgroundColor: 'transparent',
    color: '#aaa',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.3s',
    outline: 'none',
  },
  tabActive: {
    color: '#00bcd4',
    backgroundColor: '#263238',
    borderBottomColor: '#00bcd4',
    fontWeight: 'bold',
  },
  // Keep all your existing styles:
  header: {
    backgroundColor: '#1e1e1e',
    padding: '20px',
    borderBottom: '2px solid #00bcd4',
    textAlign: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    margin: '5px 0 0 0',
    fontSize: '14px',
    color: '#aaa',
  },
  mainContainer: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '300px 1fr 350px',
    gap: 0,
    overflow: 'hidden',
  },
  leftPanel: {
    backgroundColor: '#1e1e1e',
    borderRight: '1px solid #3d3d3d',
    overflowY: 'auto',
  },
  centerPanel: {
    backgroundColor: '#263238',
    position: 'relative',
  },
  rightPanel: {
    backgroundColor: '#1e1e1e',
    borderLeft: '1px solid #3d3d3d',
    overflowY: 'auto',
  },
  rightPanelScroll: {
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingSpinner: {
    fontSize: '24px',
    color: '#00bcd4',
  },
  // Summary Card Styles
  summaryCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    cursor: 'pointer',
    border: '1px solid #404040',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  summaryCardIcon: {
    fontSize: '40px',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a3a3a',
    borderRadius: '12px',
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryCardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '8px',
  },
  summaryCardStats: {
    display: 'flex',
    gap: '15px',
    fontSize: '14px',
    color: '#4dd0e1',
    marginBottom: '5px',
  },
  summaryCardHint: {
    margin: 0,
    fontSize: '12px',
    color: '#888',
  },
  summaryCardArrow: {
    fontSize: '24px',
    color: '#4dd0e1',
    fontWeight: 'bold',
  },
  // Quick Stats Styles
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginTop: '10px',
  },
  quickStatItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: '10px',
    padding: '15px',
    textAlign: 'center' as const,
    border: '1px solid #404040',
  },
  quickStatValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#4dd0e1',
  },
  quickStatLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#888',
    marginTop: '5px',
    textTransform: 'uppercase' as const,
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '1px solid #00bcd4',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '1px solid #404040',
    backgroundColor: '#263238',
  },
  modalTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  modalBody: {
    padding: '25px',
    overflowY: 'auto' as const,
    flex: 1,
  },
};

export default App;
