#!/bin/bash

# Smart Parking - Simple Network Setup Script
# Run this from the scripts directory

set -e

echo "=================================================="
echo "Smart Parking & EV Charging - Network Setup"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="parking"
CHAINCODE_VERSION="1.0"

# Check we're in the right directory
if [ ! -f "start-network.sh" ]; then
    echo -e "${RED}Error: Please run this script from the scripts directory${NC}"
    echo "cd scripts && ./setup-simple.sh"
    exit 1
fi

# Check if chaincode exists
if [ ! -d "../chaincode/parking-js" ]; then
    echo -e "${RED}Error: Chaincode not found at ../chaincode/parking-js${NC}"
    echo "Please ensure the project structure is correct"
    exit 1
fi

echo -e "${GREEN}✓ Chaincode found${NC}"

# Download fabric-samples if needed
if [ ! -d "fabric-samples" ]; then
    echo -e "${YELLOW}Downloading Fabric binaries and samples...${NC}"
    echo "This may take a few minutes..."
    curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
    echo -e "${GREEN}✓ Fabric downloaded${NC}"
fi

# Navigate to test-network
cd fabric-samples/test-network

# Stop any existing network
echo -e "${YELLOW}Stopping any existing network...${NC}"
./network.sh down

# Start the network
echo -e "${GREEN}Starting Fabric network...${NC}"
./network.sh up createChannel -c $CHANNEL_NAME -ca

# Install chaincode
echo -e "${GREEN}Installing chaincode...${NC}"

# Copy chaincode
echo "Copying chaincode..."
rm -rf chaincode/parking-js
cp -r ../../../chaincode/parking-js chaincode/

# Install npm dependencies in chaincode
echo "Installing chaincode dependencies..."
cd chaincode/parking-js
npm install
cd ../..

# Package chaincode
echo "Packaging chaincode..."
peer lifecycle chaincode package parking.tar.gz \
    --path chaincode/parking-js \
    --lang node \
    --label parking_1.0

# Set environment for Org1
. scripts/envVar.sh
setGlobals 1

# Install on Org1
echo "Installing on Org1..."
peer lifecycle chaincode install parking.tar.gz

# Set environment for Org2
setGlobals 2

# Install on Org2
echo "Installing on Org2..."
peer lifecycle chaincode install parking.tar.gz

# Get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="parking_1.0") | .package_id')
echo "Package ID: $PACKAGE_ID"

# Approve for Org2
echo "Approving for Org2..."
peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence 1

# Approve for Org1
setGlobals 1
echo "Approving for Org1..."
peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence 1

# Commit chaincode
echo "Committing chaincode..."
peer lifecycle chaincode commit \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence 1 \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"

# Initialize ledger
echo "Initializing ledger..."
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
    -c '{"function":"InitLedger","Args":[]}'

# Test the chaincode
echo "Testing chaincode..."
peer chaincode query -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{"Args":["QueryParking","P1"]}'

echo ""
echo -e "${GREEN}=================================================="
echo "✓ Network setup complete!"
echo "=================================================="
echo -e "${YELLOW}Network Details:${NC}"
echo "  Channel: $CHANNEL_NAME"
echo "  Chaincode: $CHAINCODE_NAME"
echo "  Version: $CHAINCODE_VERSION"
echo ""
echo -e "${YELLOW}Running containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "peer|orderer|ca"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Open a new terminal"
echo "  2. cd backend && npm install && npm run dev"
echo ""
echo "  3. Open another terminal"
echo "  4. cd frontend && npm install && npm run dev"
echo ""
echo "  5. Open browser: http://localhost:3000"
echo -e "${NC}"
