#!/bin/bash

# Smart Parking - Fabric Network Setup Script
# This script sets up a Hyperledger Fabric test network with the parking chaincode

set -e

echo "=================================================="
echo "Smart Parking & EV Charging - Network Setup"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="parking"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"

# Get the absolute path of the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CHAINCODE_SOURCE="$PROJECT_ROOT/chaincode/parking-js"

echo "Project root: $PROJECT_ROOT"
echo "Chaincode source: $CHAINCODE_SOURCE"

# Check if chaincode exists
if [ ! -d "$CHAINCODE_SOURCE" ]; then
    echo -e "${RED}Error: Chaincode not found at $CHAINCODE_SOURCE${NC}"
    exit 1
fi

# Check if fabric-samples exists
if [ ! -d "$SCRIPT_DIR/fabric-samples" ]; then
    echo -e "${YELLOW}Fabric samples not found. Downloading...${NC}"
    cd "$SCRIPT_DIR/fabric-samples"
    curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
fi

cd "$SCRIPT_DIR/fabric-samples/test-network"

echo -e "${GREEN}Step 1: Bringing down any existing network${NC}"
./network.sh down

echo -e "${GREEN}Step 2: Starting the network with CouchDB${NC}"
./network.sh up createChannel -c $CHANNEL_NAME -ca -s couchdb

echo -e "${GREEN}Step 3: Deploying chaincode${NC}"

# Set Fabric configuration path
export FABRIC_CFG_PATH=${PWD}/../config

# Copy chaincode to fabric-samples
echo "Copying chaincode from $CHAINCODE_SOURCE..."
rm -rf chaincode/parking-js
cp -r "$CHAINCODE_SOURCE" chaincode/

# Package chaincode
echo "Packaging chaincode..."
peer lifecycle chaincode package parking.tar.gz \
    --path chaincode/parking-js \
    --lang node \
    --label parking_1.0

# Install on Org1
echo "Installing chaincode on Org1..."
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode install parking.tar.gz

# Install on Org2
echo "Installing chaincode on Org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install parking.tar.gz

# Get package ID
export CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep parking_1.0 | awk '{print $3}' | sed 's/,$//')
echo "Package ID: $CC_PACKAGE_ID"

# Approve for Org2
echo "Approving chaincode for Org2..."
peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $CC_PACKAGE_ID \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Approve for Org1
echo "Approving chaincode for Org1..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $CC_PACKAGE_ID \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Check commit readiness
echo "Checking commit readiness..."
peer lifecycle chaincode checkcommitreadiness \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --output json

# Commit chaincode
echo "Committing chaincode..."
peer lifecycle chaincode commit \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

# Initialize ledger
echo "Initializing ledger..."
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    -c '{"function":"InitLedger","Args":[]}'

echo ""
echo -e "${GREEN}=================================================="
echo "Network setup complete!"
echo "=================================================="
echo -e "${YELLOW}Network Details:${NC}"
echo "Channel: $CHANNEL_NAME"
echo "Chaincode: $CHAINCODE_NAME"
echo "Version: $CHAINCODE_VERSION"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. cd $PROJECT_ROOT/backend && npm install && npm run dev"
echo "2. In a new terminal: cd $PROJECT_ROOT/frontend && npm install && npm run dev"
echo -e "${NC}"
