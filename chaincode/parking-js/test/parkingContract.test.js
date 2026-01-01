'use strict';

const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

const ParkingContract = require('../lib/parkingContract.js');

let assert = sinon.assert;
chai.use(sinonChai);

describe('ParkingContract Tests', () => {
    let transactionContext, chaincodeStub, contract;

    beforeEach(() => {
        transactionContext = new Context();

        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.getStateByRange.callsFake(async () => {
            return Promise.resolve([]);
        });

        chaincodeStub.getTxID.returns('tx123');
        chaincodeStub.getTxTimestamp.returns({ seconds: { low: Date.now() / 1000 } });
        chaincodeStub.setEvent.returns();

        contract = new ParkingContract();
    });

    describe('Test InitLedger', () => {
        it('should initialize the ledger with default data', async () => {
            await contract.InitLedger(transactionContext);
            
            sinon.assert.called(chaincodeStub.putState);
            expect(chaincodeStub.putState.callCount).to.be.greaterThan(20);
        });
    });

    describe('Test CreateParking', () => {
        it('should create a new parking', async () => {
            const result = await contract.CreateParking(
                transactionContext,
                'P2',
                'Downtown Parking',
                'Zone B',
                '30',
                '10'
            );

            const parking = JSON.parse(result);
            expect(parking.parkingId).to.equal('P2');
            expect(parking.name).to.equal('Downtown Parking');
            expect(parking.totalPlaces).to.equal(30);
            expect(parking.evStations).to.equal(10);
        });

        it('should fail to create duplicate parking', async () => {
            await contract.CreateParking(
                transactionContext,
                'P2',
                'Downtown Parking',
                'Zone B',
                '30',
                '10'
            );

            try {
                await contract.CreateParking(
                    transactionContext,
                    'P2',
                    'Another Parking',
                    'Zone C',
                    '20',
                    '5'
                );
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('already exists');
            }
        });
    });

    describe('Test CreatePlace', () => {
        beforeEach(async () => {
            await contract.CreateParking(
                transactionContext,
                'P1',
                'Test Parking',
                'Zone A',
                '10',
                '3'
            );
        });

        it('should create a regular place', async () => {
            const result = await contract.CreatePlace(
                transactionContext,
                'PL1',
                'P1',
                'regular'
            );

            const place = JSON.parse(result);
            expect(place.placeId).to.equal('PL1');
            expect(place.parkingId).to.equal('P1');
            expect(place.type).to.equal('regular');
            expect(place.status).to.equal('free');
        });

        it('should create an EV place', async () => {
            const result = await contract.CreatePlace(
                transactionContext,
                'PL2',
                'P1',
                'ev'
            );

            const place = JSON.parse(result);
            expect(place.type).to.equal('ev');
        });

        it('should fail with invalid type', async () => {
            try {
                await contract.CreatePlace(
                    transactionContext,
                    'PL3',
                    'P1',
                    'invalid'
                );
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('Invalid place type');
            }
        });

        it('should fail if parking does not exist', async () => {
            try {
                await contract.CreatePlace(
                    transactionContext,
                    'PL4',
                    'P999',
                    'regular'
                );
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('does not exist');
            }
        });
    });

    describe('Test RegisterCar', () => {
        it('should register a regular car', async () => {
            const result = await contract.RegisterCar(
                transactionContext,
                'CAR1',
                'Alice',
                '0',
                'false'
            );

            const car = JSON.parse(result);
            expect(car.carId).to.equal('CAR1');
            expect(car.owner).to.equal('Alice');
            expect(car.evCompatible).to.be.false;
        });

        it('should register an EV car', async () => {
            const result = await contract.RegisterCar(
                transactionContext,
                'CAR2',
                'Bob',
                '80',
                'true'
            );

            const car = JSON.parse(result);
            expect(car.carId).to.equal('CAR2');
            expect(car.evCompatible).to.be.true;
            expect(car.batteryLevel).to.equal(80);
        });

        it('should fail to register duplicate car', async () => {
            await contract.RegisterCar(
                transactionContext,
                'CAR1',
                'Alice',
                '0',
                'false'
            );

            try {
                await contract.RegisterCar(
                    transactionContext,
                    'CAR1',
                    'Bob',
                    '50',
                    'true'
                );
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('already exists');
            }
        });
    });

    describe('Test RequestReservation (CRITICAL)', () => {
        beforeEach(async () => {
            // Setup parking, places, and cars
            await contract.CreateParking(
                transactionContext,
                'P1',
                'Test Parking',
                'Zone A',
                '10',
                '3'
            );

            await contract.CreatePlace(transactionContext, 'PL1', 'P1', 'regular');
            await contract.CreatePlace(transactionContext, 'PL2', 'P1', 'ev');
            
            await contract.RegisterCar(
                transactionContext,
                'CAR1',
                'Alice',
                '0',
                'false'
            );
            
            await contract.RegisterCar(
                transactionContext,
                'CAR2',
                'Bob',
                '80',
                'true'
            );
        });

        it('should successfully reserve a regular place', async () => {
            // Mock query result
            const mockIterator = {
                next: sinon.stub(),
                close: sinon.stub()
            };
            
            const place = {
                placeId: 'PL1',
                parkingId: 'P1',
                type: 'regular',
                status: 'free',
                currentCarId: null
            };
            
            mockIterator.next.onFirstCall().resolves({
                done: false,
                value: {
                    value: Buffer.from(JSON.stringify(place))
                }
            });
            
            chaincodeStub.getQueryResult.resolves(mockIterator);

            const result = await contract.RequestReservation(
                transactionContext,
                'CAR1',
                'P1',
                'regular'
            );

            const response = JSON.parse(result);
            expect(response.reservation).to.exist;
            expect(response.reservation.carId).to.equal('CAR1');
            expect(response.place.status).to.equal('reserved');
            expect(response.txId).to.exist;
        });

        it('should successfully reserve an EV place for EV car', async () => {
            const mockIterator = {
                next: sinon.stub(),
                close: sinon.stub()
            };
            
            const place = {
                placeId: 'PL2',
                parkingId: 'P1',
                type: 'ev',
                status: 'free',
                currentCarId: null
            };
            
            mockIterator.next.onFirstCall().resolves({
                done: false,
                value: {
                    value: Buffer.from(JSON.stringify(place))
                }
            });
            
            chaincodeStub.getQueryResult.resolves(mockIterator);

            const result = await contract.RequestReservation(
                transactionContext,
                'CAR2',
                'P1',
                'ev'
            );

            const response = JSON.parse(result);
            expect(response.reservation.carId).to.equal('CAR2');
            expect(response.place.type).to.equal('ev');
        });

        it('should fail when non-EV car tries to reserve EV place', async () => {
            try {
                await contract.RequestReservation(
                    transactionContext,
                    'CAR1',
                    'P1',
                    'ev'
                );
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('not EV compatible');
            }
        });

        it('should fail when no places available', async () => {
            const mockIterator = {
                next: sinon.stub().resolves({ done: true }),
                close: sinon.stub()
            };
            
            chaincodeStub.getQueryResult.resolves(mockIterator);

            try {
                await contract.RequestReservation(
                    transactionContext,
                    'CAR1',
                    'P1',
                    'regular'
                );
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('No available');
            }
        });

        it('should fail with invalid place type', async () => {
            try {
                await contract.RequestReservation(
                    transactionContext,
                    'CAR1',
                    'P1',
                    'invalid'
                );
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('Invalid place type');
            }
        });
    });

    describe('Test ConfirmPayment', () => {
        beforeEach(async () => {
            const reservation = {
                reservationId: 'RES1',
                carId: 'CAR1',
                placeId: 'PL1',
                parkingId: 'P1',
                paid: false,
                active: true,
                docType: 'reservation'
            };
            
            await chaincodeStub.putState('RES1', Buffer.from(JSON.stringify(reservation)));
        });

        it('should confirm payment for valid reservation', async () => {
            const result = await contract.ConfirmPayment(
                transactionContext,
                'RES1',
                '10.50'
            );

            const reservation = JSON.parse(result);
            expect(reservation.paid).to.be.true;
            expect(reservation.amount).to.equal(10.50);
            expect(reservation.paymentTime).to.exist;
        });

        it('should fail to pay twice', async () => {
            await contract.ConfirmPayment(transactionContext, 'RES1', '10.50');

            try {
                await contract.ConfirmPayment(transactionContext, 'RES1', '5.00');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('already paid');
            }
        });

        it('should fail for non-existent reservation', async () => {
            try {
                await contract.ConfirmPayment(transactionContext, 'RES999', '10.00');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('does not exist');
            }
        });
    });

    describe('Test StartParking', () => {
        beforeEach(async () => {
            const reservation = {
                reservationId: 'RES1',
                carId: 'CAR1',
                placeId: 'PL1',
                parkingId: 'P1',
                paid: true,
                active: true,
                docType: 'reservation'
            };
            
            const place = {
                placeId: 'PL1',
                parkingId: 'P1',
                type: 'regular',
                status: 'reserved',
                currentCarId: 'CAR1'
            };
            
            await chaincodeStub.putState('RES1', Buffer.from(JSON.stringify(reservation)));
            await chaincodeStub.putState('PL1', Buffer.from(JSON.stringify(place)));
        });

        it('should start parking after payment', async () => {
            const result = await contract.StartParking(transactionContext, 'RES1');

            const response = JSON.parse(result);
            expect(response.place.status).to.equal('occupied');
            expect(response.reservation.parkingStarted).to.exist;
        });

        it('should fail to start without payment', async () => {
            const reservation = {
                reservationId: 'RES2',
                carId: 'CAR2',
                placeId: 'PL2',
                paid: false,
                active: true,
                docType: 'reservation'
            };
            
            await chaincodeStub.putState('RES2', Buffer.from(JSON.stringify(reservation)));

            try {
                await contract.StartParking(transactionContext, 'RES2');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('Payment required');
            }
        });
    });

    describe('Test EndParking', () => {
        beforeEach(async () => {
            const reservation = {
                reservationId: 'RES1',
                carId: 'CAR1',
                placeId: 'PL1',
                parkingId: 'P1',
                paid: true,
                active: true,
                parkingStarted: new Date().toISOString(),
                docType: 'reservation'
            };
            
            const place = {
                placeId: 'PL1',
                parkingId: 'P1',
                type: 'regular',
                status: 'occupied',
                currentCarId: 'CAR1'
            };
            
            await chaincodeStub.putState('RES1', Buffer.from(JSON.stringify(reservation)));
            await chaincodeStub.putState('PL1', Buffer.from(JSON.stringify(place)));
        });

        it('should end parking and free the place', async () => {
            const result = await contract.EndParking(transactionContext, 'RES1');

            const response = JSON.parse(result);
            expect(response.place.status).to.equal('free');
            expect(response.place.currentCarId).to.be.null;
            expect(response.reservation.active).to.be.false;
            expect(response.reservation.endTime).to.exist;
        });

        it('should fail to end parking that has not started', async () => {
            const reservation = {
                reservationId: 'RES2',
                carId: 'CAR2',
                placeId: 'PL2',
                paid: true,
                active: true,
                docType: 'reservation'
            };
            
            await chaincodeStub.putState('RES2', Buffer.from(JSON.stringify(reservation)));

            try {
                await contract.EndParking(transactionContext, 'RES2');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('has not started');
            }
        });
    });

    describe('Test Complete Parking Cycle', () => {
        it('should complete full cycle: reserve -> pay -> start -> end', async () => {
            // Setup
            await contract.CreateParking(
                transactionContext,
                'P1',
                'Test Parking',
                'Zone A',
                '10',
                '3'
            );
            
            await contract.CreatePlace(transactionContext, 'PL1', 'P1', 'regular');
            await contract.RegisterCar(transactionContext, 'CAR1', 'Alice', '0', 'false');

            // Mock query for reservation
            const mockIterator = {
                next: sinon.stub(),
                close: sinon.stub()
            };
            
            const place = {
                placeId: 'PL1',
                parkingId: 'P1',
                type: 'regular',
                status: 'free',
                currentCarId: null
            };
            
            mockIterator.next.onFirstCall().resolves({
                done: false,
                value: {
                    value: Buffer.from(JSON.stringify(place))
                }
            });
            
            chaincodeStub.getQueryResult.resolves(mockIterator);

            // 1. Reserve
            const resResult = await contract.RequestReservation(
                transactionContext,
                'CAR1',
                'P1',
                'regular'
            );
            const resData = JSON.parse(resResult);
            const reservationId = resData.reservation.reservationId;

            // 2. Pay
            await contract.ConfirmPayment(transactionContext, reservationId, '15.00');

            // 3. Start
            await contract.StartParking(transactionContext, reservationId);

            // 4. End
            const endResult = await contract.EndParking(transactionContext, reservationId);
            const endData = JSON.parse(endResult);

            expect(endData.place.status).to.equal('free');
            expect(endData.reservation.active).to.be.false;
        });
    });

    describe('Test DetectAttack', () => {
        it('should record an attack', async () => {
            const result = await contract.DetectAttack(
                transactionContext,
                'DOUBLE_BOOKING',
                'Attempted double reservation on place PL1'
            );

            const attack = JSON.parse(result);
            expect(attack.attackType).to.equal('DOUBLE_BOOKING');
            expect(attack.details).to.include('double reservation');
            expect(attack.txId).to.exist;
        });
    });
});
