# 🚗 Smart Parking & EV Charging with Hyperledger Fabric

A complete blockchain-based smart parking and EV charging management system built with **Hyperledger Fabric**, featuring a **JavaScript chaincode**, **Node.js/TypeScript backend**, and **React + Three.js 3D frontend**.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Performance Analysis](#performance-analysis)
- [Attack Simulations](#attack-simulations)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)

## 🎯 Overview

This project demonstrates a complete smart parking solution secured by blockchain technology. It showcases:

- **Fraud Prevention**: Double-booking prevention through blockchain MVCC
- **Traceability**: Complete audit trail of all transactions
- **Real-time Updates**: WebSocket-based event streaming
- **3D Visualization**: Interactive parking lot view with Three.js
- **Performance Metrics**: Latency tracking and blockchain parameter experimentation

## ✨ Features

### Blockchain Features
- ✅ Atomic reservation system (prevents double-booking)
- ✅ Smart contract validation (payment required before parking)
- ✅ Complete transaction history and audit trail
- ✅ Real-time blockchain events
- ✅ Attack detection and simulation

### Application Features
- 🚗 Car registration (EV and regular vehicles)
- 🅿️ Automatic parking place reservation
- 💳 Payment processing
- 🔋 EV charging station support
- 📊 Real-time dashboard with metrics
- 🎮 Interactive 3D parking lot visualization
- 📈 Performance monitoring

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│            Three.js 3D + Real-time Updates           │
└─────────────────┬───────────────────────────────────┘
                  │ WebSocket + REST API
┌─────────────────▼───────────────────────────────────┐
│              Backend (Node.js + Express)             │
│         Fabric SDK + Event Listeners                 │
└─────────────────┬───────────────────────────────────┘
                  │ Fabric SDK
┌─────────────────▼───────────────────────────────────┐
│           Hyperledger Fabric Network                 │
│  Orderer + Peer Org1 + Peer Org2 + CouchDB          │
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │  Chaincode (JavaScript/Node.js)        │         │
│  │  - ParkingContract                     │         │
│  │  - Business Logic                      │         │
│  │  - MVCC Conflict Prevention            │         │
│  └────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Blockchain
- **Hyperledger Fabric 2.5**: Enterprise blockchain platform
- **JavaScript Chaincode**: Smart contracts in Node.js
- **CouchDB**: State database
- **Docker**: Containerization

### Backend
- **Node.js 18+**: Runtime environment
- **TypeScript**: Type-safe JavaScript
- **Express**: Web framework
- **Fabric Node SDK**: Blockchain interaction
- **Socket.IO**: Real-time communication
- **Winston**: Logging

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Three.js**: 3D rendering
- **@react-three/fiber**: React renderer for Three.js
- **Socket.IO Client**: Real-time events
- **Vite**: Build tool

## 📦 Prerequisites

- **Node.js**: v16+ (v18 recommended)
- **Docker**: v20+
- **Docker Compose**: v2+
- **Git**: Latest version
- **npm**: v8+

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 20GB free space
- **OS**: Linux, macOS, or Windows with WSL2

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd smart-parking-ev
```

### 2. Start Hyperledger Fabric Network

```bash
cd scripts
chmod +x start-network.sh
./start-network.sh
```

This script will:
- Download Fabric binaries (if not present)
- Start the test network
- Deploy the parking chaincode
- Initialize the ledger

**Expected output**: Network running with parking chaincode deployed.

### 3. Install Backend Dependencies

```bash
cd ../backend
npm install
```

### 4. Configure Backend

```bash
cp .env.example .env
# Edit .env if needed (default values should work)
```

### 5. Start Backend Server

```bash
npm run dev
```

**Expected output**: 
```
Server running on port 3001
Connected to Fabric Gateway
Event listeners started
```

### 6. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 7. Start Frontend Application

```bash
npm run dev
```

**Expected output**:
```
  VITE ready in XXX ms
  ➜  Local:   http://localhost:3000/
```

## 💻 Usage

### Accessing the Application

Open your browser and navigate to: `http://localhost:3000`

### Basic Workflow

1. **Create a Car**
   - Enter owner name
   - Select EV compatible (checkbox)
   - Adjust battery level (if EV)
   - Click "Create Car"

2. **Reserve a Parking Place**
   - Select a car from dropdown
   - Choose place type (Regular/EV)
   - Click "Reserve Place"
   - The system automatically:
     - Reserves the place
     - Confirms payment (after 2s)
     - Starts parking (after 4s)

3. **Monitor in Real-time**
   - Watch the 3D parking lot update
   - See transactions in the dashboard
   - Monitor blockchain metrics

### 3D Controls

- **Rotate**: Left mouse button + drag
- **Zoom**: Mouse wheel
- **Pan**: Right mouse button + drag

### Color Legend

- 🟢 **Green**: Free place
- 🟠 **Orange**: Reserved place
- 🔴 **Red**: Occupied place
- 🔵 **Blue sphere**: EV charging station

## 🧪 Testing

### Unit Tests (Chaincode)

```bash
cd chaincode/parking-js
npm install
npm test
```

**Tests include**:
- Parking and place creation
- Car registration
- Reservation logic (with double-booking scenarios)
- Payment confirmation
- Complete parking lifecycle

### Load Testing

```bash
cd scripts
node load-test.js [numCars] [concurrentReservations]

# Example: 20 cars, 5 concurrent reservations
node load-test.js 20 5
```

**Output**: CSV and JSON files with:
- Latency metrics
- Success/failure rates
- TPS (Transactions Per Second)

### Attack Simulations

```bash
cd scripts
node simulate-attacks.js
```

**Demonstrations**:
1. **Double Booking**: Concurrent reservation attempts (one succeeds)
2. **Payment Fraud**: Starting parking without payment (rejected)
3. **Unauthorized Modification**: Direct database access (protected)
4. **Audit Trail**: Complete transaction history

## 📊 Performance Analysis

### Measuring Blockchain Parameters

#### 1. Modify Block Parameters

Edit `fabric-samples/test-network/configtx/configtx.yaml`:

```yaml
Orderer:
  BatchTimeout: 2s      # Change to 1s, 5s, 10s
  BatchSize:
    MaxMessageCount: 10 # Change to 5, 20, 50
```

#### 2. Restart Network

```bash
cd scripts
./start-network.sh
```

#### 3. Run Load Tests

```bash
node load-test.js 50 10
```

#### 4. Collect Metrics

Results are saved in:
- `load-test-TIMESTAMP.csv`: For Excel analysis
- `load-test-TIMESTAMP.json`: Detailed results

### Key Metrics to Track

- **Latency**: Time from submission to confirmation
- **TPS**: Transactions per second
- **Block Size**: Number of transactions per block
- **Confirmation Time**: Time to block commitment

## 🎯 Attack Simulations

### 1. Double Reservation Attack

**Scenario**: Two users try to reserve the same place simultaneously.

**Protection**: Fabric's MVCC (Multi-Version Concurrency Control)

**How it works**:
- Both transactions read the place state (version N)
- First transaction commits, updating state to version N+1
- Second transaction fails with "MVCC_READ_CONFLICT"

**Test**:
```bash
node simulate-attacks.js
```

### 2. Payment Bypass Attack

**Scenario**: User tries to start parking without paying.

**Protection**: Chaincode validation

**How it works**:
- `StartParking` function checks `reservation.paid`
- If false, transaction is rejected
- Payment must be confirmed on-chain first

### 3. Direct Database Tampering

**Scenario**: Attacker tries to modify CouchDB directly.

**Protection**: State hash verification

**How it works**:
- Each state change is hashed
- Hash is stored on blockchain
- Any external modification invalidates the hash
- Next read operation detects tampering

## 📁 Project Structure

```
smart-parking-ev/
├── chaincode/
│   └── parking-js/               # JavaScript Chaincode
│       ├── lib/
│       │   └── parkingContract.js # Main contract
│       ├── test/
│       │   └── parkingContract.test.js
│       ├── index.js
│       └── package.json
│
├── backend/                       # Node.js Backend
│   ├── src/
│   │   ├── config/               # Configuration
│   │   │   ├── fabric.ts         # Fabric connection
│   │   │   └── logger.ts
│   │   ├── controllers/          # API controllers
│   │   │   └── index.ts
│   │   ├── routes/               # Express routes
│   │   │   └── index.ts
│   │   ├── services/             # Business logic
│   │   │   ├── blockchain.service.ts
│   │   │   └── event.service.ts
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts
│   │   └── index.ts              # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                      # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParkingLot3D.tsx  # 3D visualization
│   │   │   ├── Dashboard.tsx      # Metrics dashboard
│   │   │   └── ControlPanel.tsx   # User controls
│   │   ├── services/
│   │   │   ├── api.ts            # API client
│   │   │   └── websocket.ts      # WebSocket client
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx               # Main app
│   │   ├── main.tsx              # Entry point
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── scripts/
│   ├── start-network.sh          # Network deployment
│   ├── load-test.js              # Load testing
│   └── simulate-attacks.js       # Attack simulations
│
└── README.md
```

## 📡 API Documentation

### Parking Endpoints

#### Create Parking
```http
POST /api/parking
Content-Type: application/json

{
  "parkingId": "P1",
  "name": "Campus Parking",
  "location": "Zone A",
  "totalPlaces": 20,
  "evStations": 5
}
```

#### Get Parking
```http
GET /api/parking/:id
```

#### Get Places
```http
GET /api/parking/:id/places
```

### Car Endpoints

#### Register Car
```http
POST /api/car
Content-Type: application/json

{
  "carId": "CAR1",
  "owner": "Alice",
  "batteryLevel": 80,
  "evCompatible": true
}
```

#### Get Car
```http
GET /api/car/:id
```

### Reservation Endpoints

#### Request Reservation
```http
POST /api/reservation
Content-Type: application/json

{
  "carId": "CAR1",
  "parkingId": "P1",
  "desiredType": "ev"
}
```

#### Confirm Payment
```http
POST /api/reservation/:id/pay
Content-Type: application/json

{
  "amount": 10.50
}
```

#### Start Parking
```http
POST /api/reservation/:id/start
```

#### End Parking
```http
POST /api/reservation/:id/end
```

### WebSocket Events

Subscribe to real-time events:

```javascript
// Client-side
socket.on('reservationCreated', (data) => {
  console.log('New reservation:', data);
});

socket.on('paymentConfirmed', (data) => {
  console.log('Payment confirmed:', data);
});

socket.on('parkingStarted', (data) => {
  console.log('Parking started:', data);
});

socket.on('parkingEnded', (data) => {
  console.log('Parking ended:', data);
});

socket.on('blockCommitted', (data) => {
  console.log('New block:', data);
});

socket.on('attackDetected', (data) => {
  console.log('Attack detected:', data);
});
```

## 🐛 Troubleshooting

### Network Issues

**Problem**: Network fails to start
```bash
cd fabric-samples/test-network
./network.sh down
docker volume prune -f
./network.sh up createChannel -c mychannel -ca
```

### Backend Connection Issues

**Problem**: Cannot connect to Fabric
- Verify network is running: `docker ps`
- Check connection profile path in `.env`
- Ensure wallet is created: delete `backend/wallet` and restart

### Frontend Issues

**Problem**: API calls fail
- Check backend is running on port 3001
- Verify CORS settings
- Check browser console for errors

### Performance Issues

**Problem**: Slow transactions
- Increase `BatchTimeout` in configtx.yaml
- Reduce `MaxMessageCount`
- Check Docker resources (increase RAM)

## 📝 License

This project is for academic purposes.

## 🤝 Contributing

This is an academic project. Contributions and suggestions are welcome!

## 📧 Contact

For questions or issues, please open an issue in the repository.

---

**Made with ❤️ for blockchain education**
