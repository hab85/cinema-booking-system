/* models/ParkingLock.js : بيمنع حجز نفس مكان الـ parking مرتين لنفس العرض */
const mongoose = require('mongoose');

const parkingLockSchema = new mongoose.Schema({
  slotKey: { type: String, required: true },       // date|time
  space: { type: String, required: true },
  bookingCode: { type: String, required: true, index: true }
});
parkingLockSchema.index({ slotKey: 1, space: 1 }, { unique: true });

module.exports = mongoose.model('ParkingLock', parkingLockSchema);
