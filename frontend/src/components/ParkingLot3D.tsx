import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Place, Car, Reservation } from '../types';

interface ParkingSpotProps {
  place: Place;
  position: [number, number, number];
  onClick?: () => void;
}

const ParkingSpot: React.FC<ParkingSpotProps> = ({ place, position, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const getColor = () => {
    if (hovered) return '#ffeb3b';
    switch (place.status) {
      case 'free':
        return '#4caf50'; // Green
      case 'reserved':
        return '#ff9800'; // Orange
      case 'occupied':
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Grey
    }
  };

  const getStatusText = () => {
    switch (place.status) {
      case 'free':
        return 'FREE';
      case 'reserved':
        return 'RESERVED';
      case 'occupied':
        return 'OCCUPIED';
      default:
        return 'UNKNOWN';
    }
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.8, 0.1, 2.8]} />
        <meshStandardMaterial color={getColor()} />
      </mesh>
      
      {/* Parking lines */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.9, 0.01, 2.9]} />
        <meshStandardMaterial color="#ffffff" opacity={0.8} transparent />
      </mesh>
      
      {place.type === 'ev' && (
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.3]} />
          <meshStandardMaterial color="#00bcd4" emissive="#00bcd4" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {/* Place ID */}
      {/* <Text
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {place.placeId}
      </Text> */}

      {/* Status text */}
      <Text
        position={[0, 0.15, 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {getStatusText()}
      </Text>

      {/* EV charging indicator */}
      {place.type === 'ev' && (
        <Text
          position={[0, 0.15, -1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.15}
          color="#00bcd4"
          anchorX="center"
          anchorY="middle"
        >
          ⚡ EV
        </Text>
      )}
    </group>
  );
};

interface CarModelProps {
  car: Car;
  position: [number, number, number];
  targetPosition?: [number, number, number];
}

const CarModel: React.FC<CarModelProps> = ({ car, position, targetPosition }) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((_state) => {
    if (meshRef.current && targetPosition) {
      const target = new THREE.Vector3(...targetPosition);
      const current = meshRef.current.position;
      
      // Smooth movement
      current.lerp(target, 0.05);
      
      // Rotation towards target
      const direction = new THREE.Vector3().subVectors(target, current);
      if (direction.length() > 0.01) {
        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;
      }
    }

    // Remove continuous rotation - only rotate when moving towards target
    // meshRef.current.rotation.y += 0.005;
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Car body */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.4, 1.4]} />
        <meshStandardMaterial color={car.evCompatible ? '#2196f3' : '#607d8b'} />
      </mesh>
      
      {/* Car top */}
      <mesh position={[0, 0.6, -0.2]}>
        <boxGeometry args={[0.7, 0.3, 0.8]} />
        <meshStandardMaterial color={car.evCompatible ? '#1976d2' : '#455a64'} />
      </mesh>
      
      {/* Wheels */}
      {[[-0.4, 0.15, 0.5], [0.4, 0.15, 0.5], [-0.4, 0.15, -0.5], [0.4, 0.15, -0.5]].map(
        (pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.1]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
        )
      )}
      
      {/* EV indicator */}
      {car.evCompatible && (
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Car ID label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {car.carId}
      </Text>
    </group>
  );
};

interface ParkingLot3DProps {
  places: Place[];
  cars: Car[];
  reservations: Reservation[];
  onPlaceClick?: (place: Place) => void;
}

const ParkingLot3D: React.FC<ParkingLot3DProps> = ({ places, cars, reservations, onPlaceClick }) => {
  const calculatePosition = (index: number): [number, number, number] => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    return [col * 2.5 - 5, 0, row * 3.5 - 5];
  };
  
  // Get all cars with their positions
  const carsWithPositions = cars.map(car => {
    // Check if car has an active reservation
    const activeReservation = reservations.find(res => res.carId === car.carId && res.active);
    
    let position: [number, number, number];
    if (activeReservation) {
      // Car is at its reserved place
      const placeIndex = places.findIndex(p => p.placeId === activeReservation.placeId);
      position = placeIndex >= 0 ? calculatePosition(placeIndex) : [-15, 0.5, 0];
    } else if (car.position) {
      // Car has a stored position
      position = [car.position.x, car.position.y, car.position.z];
    } else {
      // Default position for cars without reservations
      position = [-15, 0.5, 0];
    }
    
    return { ...car, currentPosition: position };
  });

  return (
    <Canvas
      camera={{ position: [0, 15, 15], fov: 60 }}
      style={{ width: '100%', height: '100%', background: '#263238' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, 10, -5]} intensity={0.5} />
      <pointLight position={[10, 10, -5]} intensity={0.3} color="#00bcd4" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#37474f" />
      </mesh>

      {/* Parking area boundary */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[12, 12.5, 32]} />
        <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
      </mesh>

      {/* Legend */}
      <group position={[-12, 2, -12]}>
        <Text position={[0, 1, 0]} fontSize={0.4} color="white" anchorX="left">
          Parking Status Legend:
        </Text>
        <Text position={[0, 0.5, 0]} fontSize={0.3} color="#4caf50" anchorX="left">
          🟢 Free
        </Text>
        <Text position={[0, 0, 0]} fontSize={0.3} color="#ff9800" anchorX="left">
          🟠 Reserved
        </Text>
        <Text position={[0, -0.5, 0]} fontSize={0.3} color="#f44336" anchorX="left">
          🔴 Occupied
        </Text>
        <Text position={[0, -1, 0]} fontSize={0.3} color="#00bcd4" anchorX="left">
          ⚡ EV Charging
        </Text>
      </group>

      {/* Parking spots */}
      {places.map((place, index) => {
        console.log("places",place);
        
        const position = calculatePosition(index);
        return (
          <ParkingSpot
            key={place.placeId}
            place={place}
            position={position}
            onClick={() => onPlaceClick && onPlaceClick(place)}
          />
        );
      })}

      {/* Cars */}
      {carsWithPositions.map((car) => {
        const pos: [number, number, number] = car.currentPosition;
        const targetPos = car.targetPlace ? 
          places.findIndex(p => p.placeId === car.targetPlace) >= 0 ? 
            calculatePosition(places.findIndex(p => p.placeId === car.targetPlace)) : 
            undefined : 
          undefined;
        
        return (
          <CarModel
            key={car.carId}
            car={car}
            position={pos}
            targetPosition={targetPos}
          />
        );
      })}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
      />
    </Canvas>
  );
};

export default ParkingLot3D;
