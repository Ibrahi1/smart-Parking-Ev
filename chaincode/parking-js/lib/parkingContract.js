'use strict';

const { Contract } = require('fabric-contract-api');

class ParkingContract extends Contract {

    // ==================== INITIALIZATION ====================
    
    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        
        // Fixed timestamp for deterministic initialization across all peers
        const initTimestamp = '2025-12-28T00:00:00.000Z';
        
        // Create default parking
        const parking = {
            parkingId: 'P1',
            name: 'Campus Parking',
            location: 'Zone A',
            totalPlaces: 20,
            evStations: 5,
            docType: 'parking'
        };
        
        await ctx.stub.putState(parking.parkingId, Buffer.from(JSON.stringify(parking)));
        
        // Create some default places
        for (let i = 1; i <= 20; i++) {
            const place = {
                placeId: `PL${i}`,
                parkingId: 'P1',
                type: i <= 5 ? 'ev' : 'regular',
                status: 'free',
                currentCarId: null,
                lastUpdated: initTimestamp,
                docType: 'place'
            };
            await ctx.stub.putState(place.placeId, Buffer.from(JSON.stringify(place)));
        }
        
        console.info('============= END : Initialize Ledger ===========');
        return JSON.stringify({ success: true, message: 'Ledger initialized' });
    }

    // ==================== PARKING MANAGEMENT ====================
    
    async CreateParking(ctx, parkingId, name, location, totalPlaces, evStations) {
        console.info('============= START : Create Parking ===========');
        
        const exists = await this._assetExists(ctx, parkingId);
        if (exists) {
            throw new Error(`Parking ${parkingId} already exists`);
        }
        
        const parking = {
            parkingId,
            name,
            location,
            totalPlaces: parseInt(totalPlaces),
            evStations: parseInt(evStations),
            docType: 'parking'
        };
        
        await ctx.stub.putState(parkingId, Buffer.from(JSON.stringify(parking)));
        
        // Emit event
        const event = { type: 'ParkingCreated', parkingId, name };
        await ctx.stub.setEvent('ParkingCreated', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : Create Parking ===========');
        return JSON.stringify(parking);
    }
    
    async CreatePlace(ctx, placeId, parkingId, type) {
        console.info('============= START : Create Place ===========');
        
        // Verify parking exists
        const parkingExists = await this._assetExists(ctx, parkingId);
        if (!parkingExists) {
            throw new Error(`Parking ${parkingId} does not exist`);
        }
        
        const exists = await this._assetExists(ctx, placeId);
        if (exists) {
            throw new Error(`Place ${placeId} already exists`);
        }
        
        if (type !== 'regular' && type !== 'ev') {
            throw new Error(`Invalid place type: ${type}. Must be 'regular' or 'ev'`);
        }
        
        const place = {
            placeId,
            parkingId,
            type,
            status: 'free',
            currentCarId: null,
            lastUpdated: this._getTxTimestampString(ctx),
            docType: 'place'
        };
        
        await ctx.stub.putState(placeId, Buffer.from(JSON.stringify(place)));
        
        console.info('============= END : Create Place ===========');
        return JSON.stringify(place);
    }

    // ==================== CAR MANAGEMENT ====================
    
    async RegisterCar(ctx, carId, owner, batteryLevel, evCompatible, parkingId) {
        console.info('============= START : Register Car ===========');
        
        const exists = await this._assetExists(ctx, carId);
        if (exists) {
            throw new Error(`Car ${carId} already exists`);
        }
        
        // Verify parking exists
        const parkingExists = await this._assetExists(ctx, parkingId);
        if (!parkingExists) {
            throw new Error(`Parking ${parkingId} does not exist`);
        }
        
        const car = {
            carId,
            owner,
            batteryLevel: parseInt(batteryLevel),
            evCompatible: evCompatible === 'true' || evCompatible === true,
            parkingId,
            docType: 'car'
        };
        
        await ctx.stub.putState(carId, Buffer.from(JSON.stringify(car)));
        
        // Emit event
        const event = { type: 'CarRegistered', carId, owner, parkingId };
        await ctx.stub.setEvent('CarRegistered', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : Register Car ===========');
        return JSON.stringify(car);
    }
    
    async UpdateCarBattery(ctx, carId, batteryLevel) {
        const carAsBytes = await ctx.stub.getState(carId);
        if (!carAsBytes || carAsBytes.length === 0) {
            throw new Error(`Car ${carId} does not exist`);
        }
        
        const car = JSON.parse(carAsBytes.toString());
        car.batteryLevel = parseInt(batteryLevel);
        
        await ctx.stub.putState(carId, Buffer.from(JSON.stringify(car)));
        return JSON.stringify(car);
    }

    async RemoveCar(ctx, carId) {
        console.info('============= START : Remove Car ===========');
        
        const carAsBytes = await ctx.stub.getState(carId);
        if (!carAsBytes || carAsBytes.length === 0) {
            throw new Error(`Car ${carId} does not exist`);
        }
        
        const car = JSON.parse(carAsBytes.toString());
        
        // Check if car has active reservations and clean them up
        const queryString = {
            selector: {
                docType: 'reservation',
                carId: carId,
                active: true
            }
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        let result = await iterator.next();
        
        // Cancel all active reservations for this car
        while (!result.done) {
            const reservation = JSON.parse(result.value.value.toString());
            
            // If parking has been started, we cannot remove the car
            if (reservation.parkingStarted && !reservation.endTime) {
                await iterator.close();
                throw new Error(`Cannot remove car ${carId}: parking session is active (started but not ended)`);
            }
            
            // Free up the place if it's reserved or occupied
            if (reservation.placeId) {
                try {
                    const placeAsBytes = await ctx.stub.getState(reservation.placeId);
                    if (placeAsBytes && placeAsBytes.length > 0) {
                        const place = JSON.parse(placeAsBytes.toString());
                        place.status = 'free';
                        place.currentCarId = null;
                        place.lastUpdated = this._getTxTimestampString(ctx);
                        await ctx.stub.putState(reservation.placeId, Buffer.from(JSON.stringify(place)));
                    }
                } catch (error) {
                    console.warn(`Could not free place ${reservation.placeId}:`, error);
                }
            }
            
            // Mark reservation as cancelled
            reservation.active = false;
            reservation.endTime = this._getTxTimestampString(ctx);
            reservation.cancelledDueToCarRemoval = true;
            await ctx.stub.putState(reservation.reservationId, Buffer.from(JSON.stringify(reservation)));
            
            result = await iterator.next();
        }
        
        await iterator.close();
        
        // Delete the car from ledger
        await ctx.stub.deleteState(carId);
        
        // Emit event
        const event = {
            type: 'CarRemoved',
            carId: carId,
            owner: car.owner,
            txId: ctx.stub.getTxID()
        };
        await ctx.stub.setEvent('CarRemoved', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : Remove Car ===========');
        return JSON.stringify({ success: true, message: `Car ${carId} removed successfully`, carId });
    }

    // ==================== RESERVATION LOGIC (CRITICAL) ====================
    
    async RequestReservation(ctx, carId, parkingId, desiredType) {
        console.info('============= START : Request Reservation ===========');
        
        // Verify car exists
        const carExists = await this._assetExists(ctx, carId);
        if (!carExists) {
            throw new Error(`Car ${carId} does not exist`);
        }
        
        const carAsBytes = await ctx.stub.getState(carId);
        const car = JSON.parse(carAsBytes.toString());
        
        // Verify parking exists
        const parkingExists = await this._assetExists(ctx, parkingId);
        if (!parkingExists) {
            throw new Error(`Parking ${parkingId} does not exist`);
        }
        
        // Validate desired type
        if (desiredType !== 'regular' && desiredType !== 'ev') {
            throw new Error(`Invalid place type: ${desiredType}`);
        }
        
        // EV cars can only reserve EV places
        if (desiredType === 'ev' && !car.evCompatible) {
            throw new Error(`Car ${carId} is not EV compatible`);
        }
        
        // Find an available place (THIS IS THE CRITICAL SECTION)
        const queryString = {
            selector: {
                docType: 'place',
                parkingId: parkingId,
                type: desiredType,
                status: 'free'
            }
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const result = await iterator.next();
        
        if (result.done) {
            throw new Error(`No available ${desiredType} places in parking ${parkingId}`);
        }
        
        const place = JSON.parse(result.value.value.toString());
        await iterator.close();
        
        // ATOMIC OPERATION: Reserve the place
        // Fabric's MVCC will prevent double-booking automatically
        place.status = 'reserved';
        place.currentCarId = carId;
        place.lastUpdated = this._getTxTimestampString(ctx);
        
        await ctx.stub.putState(place.placeId, Buffer.from(JSON.stringify(place)));
        
        // Create reservation record
        const txTimestamp = ctx.stub.getTxTimestamp();
        const reservationId = `RES-${txTimestamp.seconds.toNumber()}-${txTimestamp.nanos}`;
        const reservation = {
            reservationId,
            carId,
            placeId: place.placeId,
            parkingId,
            startTime: this._getTxTimestampString(ctx),
            endTime: null,
            paid: false,
            active: true,
            txId: ctx.stub.getTxID(),
            docType: 'reservation'
        };
        
        await ctx.stub.putState(reservationId, Buffer.from(JSON.stringify(reservation)));
        
        // Emit event
        const event = {
            type: 'ReservationCreated',
            reservationId,
            carId,
            placeId: place.placeId,
            parkingId,
            txId: ctx.stub.getTxID(),
            timestamp: ctx.stub.getTxTimestamp()
        };
        await ctx.stub.setEvent('ReservationCreated', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : Request Reservation ===========');
        return JSON.stringify({
            reservation,
            place,
            txId: ctx.stub.getTxID()
        });
    }

    // ==================== PAYMENT ====================
    
    async ConfirmPayment(ctx, reservationId, amount) {
        console.info('============= START : Confirm Payment ===========');
        
        const resAsBytes = await ctx.stub.getState(reservationId);
        if (!resAsBytes || resAsBytes.length === 0) {
            throw new Error(`Reservation ${reservationId} does not exist`);
        }
        
        const reservation = JSON.parse(resAsBytes.toString());
        
        if (reservation.paid) {
            throw new Error(`Reservation ${reservationId} is already paid`);
        }
        
        if (!reservation.active) {
            throw new Error(`Reservation ${reservationId} is not active`);
        }
        
        // Update reservation
        reservation.paid = true;
        reservation.amount = parseFloat(amount);
        reservation.paymentTime = this._getTxTimestampString(ctx);
        reservation.paymentTxId = ctx.stub.getTxID();
        
        await ctx.stub.putState(reservationId, Buffer.from(JSON.stringify(reservation)));
        
        // Emit event
        const event = {
            type: 'PaymentConfirmed',
            reservationId,
            amount: parseFloat(amount),
            txId: ctx.stub.getTxID()
        };
        await ctx.stub.setEvent('PaymentConfirmed', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : Confirm Payment ===========');
        return JSON.stringify(reservation);
    }

    // ==================== PARKING LIFECYCLE ====================
    
    async StartParking(ctx, reservationId) {
        console.info('============= START : Start Parking ===========');
        
        const resAsBytes = await ctx.stub.getState(reservationId);
        if (!resAsBytes || resAsBytes.length === 0) {
            throw new Error(`Reservation ${reservationId} does not exist`);
        }
        
        const reservation = JSON.parse(resAsBytes.toString());
        
        if (!reservation.paid) {
            throw new Error(`Payment required before starting parking for reservation ${reservationId}`);
        }
        
        if (!reservation.active) {
            throw new Error(`Reservation ${reservationId} is not active`);
        }
        
        // Update place status to occupied
        const placeAsBytes = await ctx.stub.getState(reservation.placeId);
        const place = JSON.parse(placeAsBytes.toString());
        
        place.status = 'occupied';
        place.lastUpdated = this._getTxTimestampString(ctx);
        
        await ctx.stub.putState(reservation.placeId, Buffer.from(JSON.stringify(place)));
        
        // Update reservation
        reservation.parkingStarted = this._getTxTimestampString(ctx);
        reservation.parkingStartTxId = ctx.stub.getTxID();
        
        await ctx.stub.putState(reservationId, Buffer.from(JSON.stringify(reservation)));
        
        // Emit event
        const event = {
            type: 'ParkingStarted',
            reservationId,
            placeId: reservation.placeId,
            carId: reservation.carId,
            txId: ctx.stub.getTxID()
        };
        await ctx.stub.setEvent('ParkingStarted', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : Start Parking ===========');
        return JSON.stringify({ reservation, place });
    }
    
    async EndParking(ctx, reservationId) {
        console.info('============= START : End Parking ===========');
        
        const resAsBytes = await ctx.stub.getState(reservationId);
        if (!resAsBytes || resAsBytes.length === 0) {
            throw new Error(`Reservation ${reservationId} does not exist`);
        }
        
        const reservation = JSON.parse(resAsBytes.toString());
        
        if (!reservation.parkingStarted) {
            throw new Error(`Parking has not started for reservation ${reservationId}`);
        }
        
        if (!reservation.active) {
            throw new Error(`Reservation ${reservationId} is already ended`);
        }
        
        // Free the place
        const placeAsBytes = await ctx.stub.getState(reservation.placeId);
        const place = JSON.parse(placeAsBytes.toString());
        
        place.status = 'free';
        place.currentCarId = null;
        place.lastUpdated = this._getTxTimestampString(ctx);
        
        await ctx.stub.putState(reservation.placeId, Buffer.from(JSON.stringify(place)));
        
        // Complete reservation
        reservation.active = false;
        reservation.endTime = this._getTxTimestampString(ctx);
        reservation.parkingEndTxId = ctx.stub.getTxID();
        
        await ctx.stub.putState(reservationId, Buffer.from(JSON.stringify(reservation)));
        
        // Emit event
        const event = {
            type: 'ParkingEnded',
            reservationId,
            placeId: reservation.placeId,
            carId: reservation.carId,
            duration: Date.parse(reservation.endTime) - Date.parse(reservation.parkingStarted),
            txId: ctx.stub.getTxID()
        };
        await ctx.stub.setEvent('ParkingEnded', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : End Parking ===========');
        return JSON.stringify({ reservation, place });
    }

    // ==================== QUERY FUNCTIONS ====================
    
    async QueryParking(ctx, parkingId) {
        const parkingAsBytes = await ctx.stub.getState(parkingId);
        if (!parkingAsBytes || parkingAsBytes.length === 0) {
            throw new Error(`Parking ${parkingId} does not exist`);
        }
        return parkingAsBytes.toString();
    }
    
    async QueryAllParkings(ctx) {
        const queryString = {
            selector: {
                docType: 'parking'
            }
        };
        return await this._getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }
    
    async QueryPlaces(ctx, parkingId) {
        const queryString = {
            selector: {
                docType: 'place',
                parkingId: parkingId
            }
        };
        return await this._getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }
    
    async QueryPlace(ctx, placeId) {
        const placeAsBytes = await ctx.stub.getState(placeId);
        if (!placeAsBytes || placeAsBytes.length === 0) {
            throw new Error(`Place ${placeId} does not exist`);
        }
        return placeAsBytes.toString();
    }
    
    async QueryCar(ctx, carId) {
        const carAsBytes = await ctx.stub.getState(carId);
        if (!carAsBytes || carAsBytes.length === 0) {
            throw new Error(`Car ${carId} does not exist`);
        }
        return carAsBytes.toString();
    }
    
    async QueryAllCars(ctx) {
        const queryString = {
            selector: {
                docType: 'car'
            }
        };
        return await this._getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }
    
    async QueryReservations(ctx) {
        const queryString = {
            selector: {
                docType: 'reservation'
            }
        };
        return await this._getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }
    
    async QueryReservationsByParking(ctx, parkingId) {
        const queryString = {
            selector: {
                docType: 'reservation',
                parkingId: parkingId
            }
        };
        return await this._getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }
    
    async QueryActiveReservations(ctx) {
        const queryString = {
            selector: {
                docType: 'reservation',
                active: true
            }
        };
        return await this._getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }
    
    async GetHistory(ctx, assetId) {
        console.info('============= START : Get History ===========');
        
        const iterator = await ctx.stub.getHistoryForKey(assetId);
        const history = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const record = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete,
                value: result.value.value.toString('utf8')
            };
            history.push(record);
            result = await iterator.next();
        }
        await iterator.close();
        
        console.info('============= END : Get History ===========');
        return JSON.stringify(history);
    }

    // ==================== ATTACK DETECTION ====================
    
    async DetectAttack(ctx, attackType, details) {
        console.info('============= ATTACK DETECTED ===========');
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const attackRecord = {
            attackId: `ATK-${txTimestamp.seconds.toNumber()}-${txTimestamp.nanos}`,
            attackType,
            details,
            timestamp: this._getTxTimestampString(ctx),
            txId: ctx.stub.getTxID(),
            docType: 'attack'
        };
        
        await ctx.stub.putState(attackRecord.attackId, Buffer.from(JSON.stringify(attackRecord)));
        
        // Emit event
        const event = {
            type: 'AttackDetected',
            attackType,
            details,
            txId: ctx.stub.getTxID()
        };
        await ctx.stub.setEvent('AttackDetected', Buffer.from(JSON.stringify(event)));
        
        console.info('============= END : Attack Detection ===========');
        return JSON.stringify(attackRecord);
    }

    // ==================== HELPER FUNCTIONS ====================
    
    async _assetExists(ctx, assetId) {
        const assetBytes = await ctx.stub.getState(assetId);
        return assetBytes && assetBytes.length > 0;
    }
    
    _getTxTimestampString(ctx) {
        const timestamp = ctx.stub.getTxTimestamp();
        const millis = timestamp.seconds.toNumber() * 1000 + Math.floor(timestamp.nanos / 1000000);
        return new Date(millis).toISOString();
    }
    
    async _getQueryResultForQueryString(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            results.push(record);
            result = await iterator.next();
        }
        await iterator.close();
        
        return JSON.stringify(results);
    }
}

module.exports = ParkingContract;
