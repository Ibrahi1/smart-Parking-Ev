import React, { useState } from 'react';
import { Parking } from '../types';

interface ControlPanelProps {
  onCreateCar: (carData: {
    owner: string;
    evCompatible: boolean;
    batteryLevel: number;
    parkingId: string;
  }) => void;
  onReservePlace: (carId: string, desiredType: 'regular' | 'ev') => void;
  onCreateParking?: (parkingData: {
    parkingId: string;
    name: string;
    location: string;
    totalPlaces: number;
    evStations: number;
  }) => void;
  parkings: Parking[];
  availableCars: string[];
  loading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onCreateCar,
  onReservePlace,
  onCreateParking,
  parkings,
  availableCars,
  loading,
}) => {
  const [owner, setOwner] = useState('');
  const [evCompatible, setEvCompatible] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(50);
  const [selectedCar, setSelectedCar] = useState('');
  const [desiredType, setDesiredType] = useState<'regular' | 'ev'>('regular');
  const [selectedParkingForCar, setSelectedParkingForCar] = useState('');

  // Parking creation state
  const [parkingName, setParkingName] = useState('');
  const [location, setLocation] = useState('');
  const [totalPlaces, setTotalPlaces] = useState(10);
  const [evStations, setEvStations] = useState(2);

  const handleCreateCar = () => {
    if (!owner || !selectedParkingForCar) {
      alert('Please enter owner name and select a parking');
      return;
    }
    onCreateCar({ owner, evCompatible, batteryLevel, parkingId: selectedParkingForCar });
    setOwner('');
    setSelectedParkingForCar('');
  };

  const handleReserve = () => {
    if (!selectedCar) {
      alert('Please select a car');
      return;
    }
    onReservePlace(selectedCar, desiredType);
  };

  const handleCreateParking = () => {
    if (!parkingName || !location || !totalPlaces || !evStations) {
      alert('Please fill in all parking fields');
      return;
    }
    
    // Generate unique parking ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const generatedParkingId = `P${timestamp}${randomSuffix}`;
    
    if (onCreateParking) {
      onCreateParking({ 
        parkingId: generatedParkingId, 
        name: parkingName, 
        location, 
        totalPlaces, 
        evStations 
      });
      setParkingName('');
      setLocation('');
      setTotalPlaces(10);
      setEvStations(2);
    }
  };

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Control Panel</h2>

      {/* Create Parking Section */}
      {onCreateParking && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Create New Parking</h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={parkingName}
              onChange={(e) => setParkingName(e.target.value)}
              style={styles.input}
              placeholder="Enter parking name"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={styles.input}
              placeholder="Enter location"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Total Places</label>
            <input
              type="number"
              value={totalPlaces}
              onChange={(e) => setTotalPlaces(Number(e.target.value))}
              style={styles.input}
              min="1"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>EV Stations</label>
            <input
              type="number"
              value={evStations}
              onChange={(e) => setEvStations(Number(e.target.value))}
              style={styles.input}
              min="0"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleCreateParking}
            style={styles.primaryButton}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Parking'}
          </button>
        </div>
      )}

      {/* Create Car Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Create New Car</h3>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Owner Name</label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            style={styles.input}
            placeholder="Enter owner name"
            disabled={loading}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={evCompatible}
              onChange={(e) => setEvCompatible(e.target.checked)}
              style={styles.checkbox}
              disabled={loading}
            />
            EV Compatible
          </label>
        </div>

        {evCompatible && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Battery Level: {batteryLevel}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={batteryLevel}
              onChange={(e) => setBatteryLevel(Number(e.target.value))}
              style={styles.slider}
              disabled={loading}
            />
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Select Parking</label>
          <select
            value={selectedParkingForCar}
            onChange={(e) => setSelectedParkingForCar(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            <option value="">-- Select a parking --</option>
            {parkings.map((parking) => (
              <option key={parking.parkingId} value={parking.parkingId}>
                {parking.name} ({parking.parkingId}) - {parking.location}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreateCar}
          style={styles.primaryButton}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Car'}
        </button>
      </div>

      {/* Reserve Place Section */}
      {availableCars.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Reserve Parking Place</h3>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Car</label>
            <select
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              <option value="">-- Select a car --</option>
              {availableCars.map((carId) => (
                <option key={carId} value={carId}>
                  {carId}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Place Type</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="regular"
                  checked={desiredType === 'regular'}
                  onChange={() => setDesiredType('regular')}
                  disabled={loading}
                />
                Regular
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="ev"
                  checked={desiredType === 'ev'}
                  onChange={() => setDesiredType('ev')}
                  disabled={loading}
                />
                EV Charging
              </label>
            </div>
          </div>

          <button
            onClick={handleReserve}
            style={styles.secondaryButton}
            disabled={loading}
          >
            {loading ? 'Reserving...' : 'Reserve Place'}
          </button>
        </div>
      )}

      {/* Legend */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Legend</h3>
        <div style={styles.legendItems}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.colorBox, backgroundColor: '#4caf50' }} />
            <span>Free</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.colorBox, backgroundColor: '#ff9800' }} />
            <span>Reserved</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.colorBox, backgroundColor: '#f44336' }} />
            <span>Occupied</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
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
  section: {
    backgroundColor: '#2d2d2d',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #3d3d3d',
  },
  sectionTitle: {
    fontSize: '18px',
    marginBottom: '15px',
    color: '#00bcd4',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#aaa',
  },
  input: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #3d3d3d',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
  },
  select: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #3d3d3d',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
  },
  slider: {
    width: '100%',
  },
  checkbox: {
    marginRight: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    cursor: 'pointer',
  },
  radioGroup: {
    display: 'flex',
    gap: '15px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  primaryButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#00bcd4',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4caf50',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  legendItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  colorBox: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
  },
};

export default ControlPanel;
