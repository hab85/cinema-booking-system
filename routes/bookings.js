/* routes/bookings.js : إنشاء حجز، حجوزاتي، تفاصيل حجز، وإلغاء حجز
   السيرفر هو اللي بيحسب الأسعار والخصم ويمنع الـ double booking ويطلّع رقم السناكس. */
const router = require('express').Router();
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Movie = require('../models/Movie');
const Snack = require('../models/Snack');
const SeatLock = require('../models/SeatLock');
const ParkingLock = require('../models/ParkingLock');
const Counter = require('../models/Counter');
const { auth, wrap } = require('../middleware/auth');
const { getSetting } = require('../utils/settings');
const R = require('../utils/rules');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => 'CIN-' + Array.from(crypto.randomBytes(6), b => CODE_CHARS[b % CODE_CHARS.length]).join('');

// بيفك أي قفل (كراسي + parking) اتعمل للحجز ده
async function releaseLocks(code){
  await Promise.all([SeatLock.deleteMany({ bookingCode: code }), ParkingLock.deleteMany({ bookingCode: code })]);
}

/* POST /api/bookings
   body: { movieId, date, time, seats:[], snacks:[{id,qty}], parking:'P3'|null, couponCode, payment:{method, ref4, hint} } */
router.post('/', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const movieId = String(b.movieId || ''), date = String(b.date || ''), time = String(b.time || '');

  // ---------- 1) التحقق من المدخلات ----------
  const movie = await Movie.findOne({ slug: movieId });
  if(!movie) return res.status(404).json({ error: 'Movie not found.' });
  if(movie.status === 'soon') return res.status(400).json({ error: 'This movie is not showing yet.' });
  if(!R.isDate(date) || !R.isTime(time) || !movie.showtimes.includes(time)) return res.status(400).json({ error: 'Invalid showtime.' });
  if(R.showDateTime(date, time) <= new Date()) return res.status(400).json({ error: 'This show has already started. Please choose another show.' });

  const seats = Array.isArray(b.seats) ? [...new Set(b.seats.map(String))] : [];
  if(!seats.length || seats.length > R.RULES.maxSeats) return res.status(400).json({ error: `Choose between 1 and ${R.RULES.maxSeats} seats.` });
  if(!seats.every(R.isValidSeat)) return res.status(400).json({ error: 'Invalid seat.' });

  const showKey = `${movieId}|${date}|${time}`;
  const blocked = (await getSetting('seatBlocks', {}))[showKey] || [];
  const blockedHit = seats.filter(s => blocked.includes(s));
  if(blockedHit.length) return res.status(409).json({ error: `Seat(s) ${blockedHit.join(', ')} are not available. Please choose other seats.` });

  // السناكس: السعر من الداتابيز مش من المتصفح
  const snackLines = [];
  for(const item of (Array.isArray(b.snacks) ? b.snacks : [])){
    const qty = Math.floor(Number(item && item.qty));
    if(!qty) continue;
    if(qty < 1 || qty > R.RULES.maxSnackQty) return res.status(400).json({ error: `Snack quantity must be between 1 and ${R.RULES.maxSnackQty}.` });
    const snack = await Snack.findOne({ slug: String(item.id), available: true });
    if(!snack) return res.status(400).json({ error: 'One of the snacks is not available.' });
    snackLines.push({ snackId: snack.slug, name: snack.name, qty, price: snack.price });
  }

  // الـ parking
  let parking = null, parkingFee = 0;
  if(b.parking){
    parking = String(b.parking);
    const count = Number(await getSetting('parkingCount', R.RULES.parking.defaultSpaces)) || R.RULES.parking.defaultSpaces;
    const n = /^P(\d+)$/.exec(parking);
    if(!n || +n[1] < 1 || +n[1] > count) return res.status(400).json({ error: 'Invalid parking space.' });
    const live = await getSetting('parkingLive', { occupied: [], blocked: [] });
    if((live.blocked || []).includes(parking)) return res.status(409).json({ error: `Parking space ${parking} is not available.` });
    parkingFee = movie.status === 'premiere' ? 0 : R.RULES.parking.fee;       // مجاني مع تذاكر Premiere
  }

  // ---------- 2) حساب السعر (في السيرفر) ----------
  const seatPrices = seats.map(R.seatPrice);
  const seatsTotal = seatPrices.reduce((a, c) => a + c, 0);
  const snacksTotal = snackLines.reduce((a, s) => a + s.qty * s.price, 0);
  let coupon;
  if(b.couponCode){
    const c = R.evalCoupon(b.couponCode, { date, time, seatPrices, snacksTotal });
    if(!c.ok) return res.status(400).json({ error: c.reason });
    coupon = { code: c.code, discount: c.discount };
  }
  const total = R.round2(seatsTotal + snacksTotal + parkingFee - (coupon ? coupon.discount : 0));

  // ---------- 3) حجز الكراسي (بالـ unique index) ----------
  const code = newCode();
  const lockedSeats = [];
  try{
    for(const s of seats){ await SeatLock.create({ showKey, seat: s, bookingCode: code }); lockedSeats.push(s); }
  }catch(e){
    await SeatLock.deleteMany({ bookingCode: code });
    if(e && e.code === 11000){
      const taken = (await SeatLock.find({ showKey, seat: { $in: seats } })).map(l => l.seat);
      return res.status(409).json({ error: `Sorry, seat(s) ${(taken.length ? taken : seats).join(', ')} were just taken. Please choose other seats.` });
    }
    throw e;
  }

  // ---------- 4) حجز مكان الـ parking ----------
  if(parking){
    try{ await ParkingLock.create({ slotKey: `${date}|${time}`, space: parking, bookingCode: code }); }
    catch(e){
      await releaseLocks(code);
      if(e && e.code === 11000) return res.status(409).json({ error: `Parking space ${parking} was just taken. Please choose another space.` });
      throw e;
    }
  }

  // ---------- 5) الدفع (محاكاة) ----------
  const pay = b.payment || {};
  const gw = R.simulatePayment(String(pay.method), pay.ref4);
  if(!gw.ok){ await releaseLocks(code); return res.status(402).json({ error: gw.reason }); }

  // ---------- 6) حفظ الحجز ----------
  try{
    const hasSnacks = snackLines.length > 0;
    const booking = await Booking.create({
      code, userId: req.user._id, movieId, title: movie.title, date, time, hall: R.hallFor(movieId, date, time),
      seats, snacks: snackLines, parking, parkingFee, coupon, total, currency: R.RULES.currency,
      status: 'confirmed', paymentStatus: 'paid', paymentMethod: String(pay.method),
      payerHint: String(pay.hint || '').replace(/[<>]/g, '').slice(0, 24),        // آخر 4 أرقام بس
      snackNo: hasSnacks ? await Counter.next('snack|' + date) : null,
      snackStatus: hasSnacks ? 'new' : null
    });
    res.status(201).json({ booking });
  }catch(e){
    await releaseLocks(code);
    throw e;
  }
}));

// GET /api/bookings/mine : حجوزات العميل المسجّل
router.get('/mine', auth, wrap(async (req, res) => {
  res.json({ bookings: await Booking.find({ userId: req.user._id }).sort({ createdAt: -1 }) });
}));

// GET /api/bookings/:code : تفاصيل حجز (صاحبه أو الأدمن)
router.get('/:code', auth, wrap(async (req, res) => {
  const b = await Booking.findOne({ code: String(req.params.code) });
  if(!b || (!b.userId.equals(req.user._id) && req.user.role !== 'admin')) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ booking: b });
}));

// POST /api/bookings/:code/cancel : إلغاء حجز بسياسة الاسترداد، وبيرجّع الكراسي والـ parking
router.post('/:code/cancel', auth, wrap(async (req, res) => {
  const b = await Booking.findOne({ code: String(req.params.code) });
  if(!b || (!b.userId.equals(req.user._id) && req.user.role !== 'admin')) return res.status(404).json({ error: 'Booking not found.' });
  if(b.status === 'cancelled') return res.status(400).json({ error: 'This booking is already cancelled.' });

  const ci = R.cancelInfo(b);
  if(!ci.allowed) return res.status(400).json({ error: ci.reason });

  b.status = 'cancelled';
  b.paymentStatus = ci.pct === 1 ? 'refunded' : 'partially_refunded';
  b.cancelledAt = new Date();
  b.cancelledBy = 'customer';
  b.refund = { amount: ci.refund, pct: ci.pct, date: new Date(), status: 'processed' };
  await b.save();
  await releaseLocks(b.code);
  res.json({ booking: b });
}));

module.exports = router;
