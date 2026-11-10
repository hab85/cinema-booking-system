/* models/SeatLock.js : بيمنع حجز نفس الكرسي مرتين لنفس العرض (double booking)
   الـ unique index المركّب (showKey + seat) هو الحماية: لو حجزين حاولوا في نفس اللحظة، واحد بس ينجح */
const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema({
  showKey: { type: String, required: true },       // movieSlug|date|time
  seat: { type: String, required: true },
  bookingCode: { type: String, required: true, index: true }
});
seatLockSchema.index({ showKey: 1, seat: 1 }, { unique: true });

module.exports = mongoose.model('SeatLock', seatLockSchema);
