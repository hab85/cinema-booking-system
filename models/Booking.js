/* models/Booking.js : الحجز (فيه الكراسي والسناكس والـ parking والدفع والاسترداد)
   الـ id اللي بيظهر للفرونت هو الكود (CIN-XXXXXX) */
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  movieId: { type: String, required: true, index: true },      // slug الفيلم
  title: { type: String, required: true },
  date: { type: String, required: true },                      // 2026-11-10
  time: { type: String, required: true },                      // 20:00
  hall: { type: String, required: true },
  seats: { type: [String], required: true },
  snacks: [{
    _id: false,
    snackId: String, name: String,
    qty: { type: Number, min: 1 }, price: Number              // السعر وقت الطلب (تغيير السعر مايأثرش على القديم)
  }],
  parking: { type: String, default: null },
  parkingFee: { type: Number, default: 0 },
  coupon: { _id: false, code: String, discount: Number },
  total: { type: Number, required: true },
  currency: { type: String, default: 'EGP' },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  paymentStatus: { type: String, enum: ['paid', 'refunded', 'partially_refunded'], default: 'paid' },
  paymentMethod: { type: String, enum: ['visa', 'wallet', 'instapay'], required: true },
  payerHint: { type: String, default: '' },                    // آخر 4 أرقام بس (مفيش بيانات دفع كاملة)
  snackNo: { type: Number, default: null },                    // رقم الاستلام من الكاونتر
  snackStatus: { type: String, enum: ['new', 'preparing', 'ready', 'delivered', null], default: null },
  cancelledAt: Date,
  cancelledBy: { type: String, enum: ['customer', 'admin', null], default: null },
  refund: { _id: false, amount: Number, pct: Number, date: Date, status: String }
}, { timestamps: true });

bookingSchema.index({ movieId: 1, date: 1, time: 1 });

bookingSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.code;
    ret.userId = String(ret.userId);
    ret.snacks = (ret.snacks || []).map(s => ({ id: s.snackId, name: s.name, qty: s.qty, price: s.price }));
    if(!ret.coupon || !ret.coupon.code) delete ret.coupon;
    if(!ret.refund || ret.refund.amount == null) delete ret.refund;
    ['_id', '__v', 'code', 'updatedAt'].forEach(k => delete ret[k]);
    return ret;
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
