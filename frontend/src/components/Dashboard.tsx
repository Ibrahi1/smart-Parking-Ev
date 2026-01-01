import React from 'react';
import { Transaction, Reservation, Place, Parking } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  reservations: Reservation[];
  parkings: Parking[];
  places: Place[];
  selectedParkingId: string;
  onSelectParking: (parkingId: Parking) => void;
  metrics: {
    totalTransactions: number;
    averageLatency: number;
    successRate: number;
    lastBlockNumber?: number;
  };
  onUpdate: () => void; // Callback to refresh data
  onRemoveCar?: (reservationId: string) => void;
  loading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, reservations, parkings, places, selectedParkingId, onSelectParking, metrics, onRemoveCar, loading = false }) => {

  const availablePlaces = places.filter(place => place.status === 'free').length;
  const occupiedPlaces = places.filter(place => place.status === 'occupied').length;
  const reservedPlaces = places.filter(place => place.status === 'reserved').length;

  return (
    <div style={styles.dashboard}>
      <h2 style={styles.title}>Smart Parking Dashboard</h2>

      {/* Parking Places Overview */}
      <div style={styles.placesOverview}>
        <h3 style={styles.sectionTitle}>Parking Places Status</h3>
        <div style={styles.placesGrid}>
          <div style={styles.placeCard}>
            <div style={{ ...styles.placeIndicator, backgroundColor: '#4caf50' }} />
            <div>
              <div style={styles.placeCount}>{availablePlaces}</div>
              <div style={styles.placeLabel}>Available</div>
            </div>
          </div>
          <div style={styles.placeCard}>
            <div style={{ ...styles.placeIndicator, backgroundColor: '#ff9800' }} />
            <div>
              <div style={styles.placeCount}>{reservedPlaces}</div>
              <div style={styles.placeLabel}>Reserved</div>
            </div>
          </div>
          <div style={styles.placeCard}>
            <div style={{ ...styles.placeIndicator, backgroundColor: '#f44336' }} />
            <div>
              <div style={styles.placeCount}>{occupiedPlaces}</div>
              <div style={styles.placeLabel}>Occupied</div>
            </div>
          </div>
        </div>
      </div>

      {/* Parkings List */}
      <div style={styles.parkingsSection}>
        <h3 style={styles.sectionTitle}>Available Parkings ({parkings.length})</h3>
        <div style={styles.parkingsList}>
          {parkings && parkings.length > 0 ? (
            parkings.map((parking, index) => (
              <div 
                key={index} 
                style={{
                  ...styles.parkingItem,
                  ...(selectedParkingId === parking.parkingId ? styles.selectedParkingItem : {}),
                  cursor: 'pointer'
                }}
                onClick={() => onSelectParking(parking)}
              >
                <div style={styles.parkingHeader}>
                  <span style={styles.parkingId}>{parking.parkingId}</span>
                  <span style={styles.parkingName}>{parking.name}</span>
                </div>
                <div style={styles.parkingDetails}>
                  <span>📍 {parking.location}</span>
                  <span>🏢 {parking.totalPlaces} places</span>
                  <span>🔌 {parking.evStations} EV stations</span>
                </div>
              </div>
            ))
          ) : (
            <div style={styles.emptyMessage}>No parkings available</div>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Total Transactions</div>
          <div style={styles.metricValue}>{metrics.totalTransactions}</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Avg Latency</div>
          <div style={styles.metricValue}>{metrics.averageLatency.toFixed(2)}ms</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Success Rate</div>
          <div style={styles.metricValue}>{(metrics.successRate * 100).toFixed(1)}%</div>
        </div>

        {metrics.lastBlockNumber && (
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Last Block</div>
            <div style={styles.metricValue}>#{metrics.lastBlockNumber}</div>
          </div>
        )}
      </div>

      {/* Reservations Section */}
      <div style={styles.reservationsSection}>
        <h3 style={styles.sectionTitle}>Active Reservations ({reservations.filter(r => r.active).length})</h3>
        <div style={styles.reservationsList}>
          {reservations && reservations.filter(r => r.active).length > 0 ? (
            reservations.filter(r => r.active).map((res, index) => (
              <div key={index} style={styles.reservationItem}>
                <div style={styles.resHeader}>
                  <span style={styles.resId}>{res.reservationId}</span>
                  <span
                    style={{
                      ...styles.resStatus,
                      backgroundColor: res.active ? '#4caf50' : '#f44336',
                    }}
                  >
                    {res.active ? 'ACTIVE' : 'ENDED'}
                  </span>
                </div>
                <div style={styles.resDetails}>
                  <span>🚗 {res.carId}</span>
                  <span>📍 {res.placeId}</span>
                  <span>🏢 {res.parkingId}</span>
                </div>
                <div style={styles.resTime}>
                  <span>Start: {new Date(res.startTime).toLocaleTimeString()}</span>
                  {res.endTime && <span>End: {new Date(res.endTime).toLocaleTimeString()}</span>}
                </div>
                {res.active && onRemoveCar && (
                  <button 
                    onClick={() => onRemoveCar(res.reservationId)} 
                    style={styles.removeButton}
                    disabled={loading}
                  >
                    End Session
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={styles.emptyMessage}>No active reservations</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={styles.transactionsSection}>
        <h3 style={styles.sectionTitle}>Recent Transactions</h3>
        <div style={styles.transactionsList}>
          {transactions.slice(-10).reverse().map((tx, index) => (
            <div key={index} style={styles.transactionItem}>
              <div style={styles.txOperation}>{tx.operation}</div>
              <div style={styles.txDetails}>
                <span style={styles.txId}>{tx.txId.substring(0, 12)}...</span>
                <span style={styles.txLatency}>{tx.latency}ms</span>
                <span
                  style={{
                    ...styles.txStatus,
                    color: tx.status === 'success' ? '#4caf50' : '#f44336',
                  }}
                >
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboard: {
    padding: '20px',
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    height: '100%',
    overflowY: 'auto',
  },
  title: {
    marginBottom: '20px',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  placesOverview: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
  },
  placesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
  },
  placeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#1e1e1e',
    borderRadius: '6px',
  },
  placeIndicator: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
  },
  placeCount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#00bcd4',
  },
  placeLabel: {
    fontSize: '14px',
    color: '#aaa',
  },
  formSection: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginBottom: '10px',
  },
  input: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#1e1e1e',
    color: '#fff',
  },
  select: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#1e1e1e',
    color: '#fff',
  },
  radioGroup: {
    display: 'flex',
    gap: '15px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#fff',
  },
  checkboxContainer: {
    marginBottom: '10px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#fff',
  },
  button: {
    padding: '10px 15px',
    backgroundColor: '#00bcd4',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  metricCard: {
    backgroundColor: '#2d2d2d',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#aaa',
    marginBottom: '5px',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#00bcd4',
  },
  reservationsSection: {
    marginBottom: '20px',
  },
  sectionTitle: {
    marginBottom: '10px',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  reservationsList: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  reservationItem: {
    backgroundColor: '#2d2d2d',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '8px',
  },
  resHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
  },
  resId: {
    fontWeight: 'bold',
    color: '#00bcd4',
  },
  resStatus: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#fff',
  },
  resDetails: {
    display: 'flex',
    gap: '10px',
    fontSize: '14px',
    marginBottom: '5px',
  },
  resTime: {
    fontSize: '12px',
    color: '#aaa',
  },
  removeButton: {
    marginTop: '10px',
    padding: '5px 10px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  parkingsSection: {
    marginBottom: '20px',
  },
  parkingsList: {
    maxHeight: '200px',
    overflowY: 'auto',
  },
  parkingItem: {
    backgroundColor: '#2d2d2d',
    padding: '15px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #3d3d3d',
  },
  selectedParkingItem: {
    border: '2px solid #00bcd4',
    backgroundColor: '#1e2d2d',
  },
  parkingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  parkingId: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#00bcd4',
  },
  parkingName: {
    fontSize: '14px',
    color: '#aaa',
  },
  parkingDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    color: '#ccc',
  },
};

export default Dashboard;
