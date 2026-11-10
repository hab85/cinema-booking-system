/* routes/admin.js : كل اللي الأدمن بيعمله (محمي: لازم role = admin من الداتابيز) */
const router = require('express').Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Slide = require('../models/Slide');
const Snack = require('../models/Snack');
const SeatLock = require('../models/SeatLock');
const ParkingLock = require('../models/ParkingLock');
const { adminOnly, wrap } = require('../middleware/auth');
const { getSetting, setSetting } = require('../utils/settings');
const { RULES } = require('../utils/rules');

router.use(adminOnly);

/* ---------- الحجوزات والعملاء ---------- */

// GET /api/admin/bookings : كل الحجوزات + دليل العملاء (اسم وموبايل)
router.get('/bookings', wrap(async (req, res) => {
  const [bookings, users] = await Promise.all([Booking.find().sort({ createdAt: -1 }), User.find()]);
  res.json({ bookings, users });
}));

// PATCH /api/admin/bookings/:code : حالة السناكس، أو إلغاء الحجز من الأدمن (مع الاسترداد)
router.patch('/bookings/:code', wrap(async (req, res) => {
  const b = await Booking.findOne({ code: String(req.params.code) });
  if(!b) return res.status(404).json({ error: 'Booking not found.' });
  const body = req.body || {};

  if(body.snackStatus !== undefined && body.snackStatus !== null){
    if(!['new', 'preparing', 'ready', 'delivered'].includes(body.snackStatus)) return res.status(400).json({ error: 'Invalid snack status.' });
    if(!b.snacks.length) return res.status(400).json({ error: 'This booking has no snacks.' });
    b.snackStatus = body.snackStatus;
  }

  if(body.status === 'cancelled' && b.status !== 'cancelled'){
    const r = body.refund || {};
    const amount = Math.min(Math.max(Number(r.amount) || 0, 0), b.total);          // الاسترداد مايزيدش عن المدفوع
    b.status = 'cancelled';
    b.paymentStatus = amount >= b.total ? 'refunded' : 'partially_refunded';
    b.cancelledAt = new Date();
    b.cancelledBy = body.cancelledBy === 'customer' ? 'customer' : 'admin';
    b.refund = { amount, pct: b.total ? amount / b.total : 0, date: new Date(), status: 'processed' };
    await Promise.all([SeatLock.deleteMany({ bookingCode: b.code }), ParkingLock.deleteMany({ bookingCode: b.code })]);
  }
  await b.save();
  res.json({ booking: b });
}));

/* ---------- الأفلام والكروت والسناكس (استبدال القايمة كلها، بنفس ترتيب الأدمن) ---------- */
const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const strList = (v, n, len) => (Array.isArray(v) ? v : []).map(x => str(x, len)).filter(Boolean).slice(0, n);
const cleanPoster = p => /^(posters\/[\w.\- ]+|https?:\/\/\S+)$/i.test(p) ? p : '';

// PUT /api/admin/movies  { items: [ {id, title, ...} ] }
router.put('/movies', wrap(async (req, res) => {
  const items = Array.isArray((req.body || {}).items) ? req.body.items.slice(0, 300) : null;
  if(!items) return res.status(400).json({ error: 'items must be an array.' });
  const ops = [], slugs = [];
  for(const [i, m] of items.entries()){
    const slug = str(m.id, 80).toLowerCase();
    if(!/^[a-z0-9-]{1,80}$/.test(slug) || !str(m.title, 120)) return res.status(400).json({ error: `Movie #${i + 1} is invalid (id or title).` });
    slugs.push(slug);
    const doc = {
      slug, title: str(m.title, 120), description: str(m.description || m.desc, 1000), genre: str(m.genre, 40),
      language: str(m.language || m.lang, 40),
      category: ['arabic', 'international', 'animation'].includes(m.category) ? m.category : 'international',
      status: ['now', 'soon', 'premiere'].includes(m.status) ? m.status : 'now',
      duration: str(m.duration, 20), rating: str(m.rating, 6),
      showtimes: strList(m.showtimes || m.times, 12, 5).filter(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)),
      poster: cleanPoster(str(m.poster, 300)), cast: strList(m.cast, 12, 60),
      releaseDate: str(m.releaseDate || m.release, 10), trailer: /^https?:\/\/\S+$/i.test(str(m.trailer, 300)) ? str(m.trailer, 300) : '',
      position: i
    };
    if(Number.isFinite(Number(m.hue))) doc.hue = Number(m.hue);
    ops.push({ updateOne: { filter: { slug }, update: { $set: doc }, upsert: true } });
  }
  if(ops.length) await Movie.bulkWrite(ops);
  await Movie.deleteMany({ slug: { $nin: slugs } });
  res.json({ ok: true, count: items.length });
}));

// PUT /api/admin/slides  { items: [ {movieId, tagline, seconds, order, active} ] }  (حد أقصى 5 كروت)
router.put('/slides', wrap(async (req, res) => {
  const items = Array.isArray((req.body || {}).items) ? req.body.items : null;
  if(!items || items.length > 5) return res.status(400).json({ error: 'You can have up to 5 hero cards.' });
  const docs = items.map((s, i) => ({
    movieId: str(s.movieId, 80), tagline: str(s.tagline, 60),
    seconds: Math.min(30, Math.max(3, Number(s.seconds) || 4)), order: i + 1, active: s.active !== false
  })).filter(s => s.movieId);
  await Slide.deleteMany({});
  if(docs.length) await Slide.insertMany(docs);
  res.json({ ok: true, count: docs.length });
}));

// PUT /api/admin/snacks  { items: [ {id, name, type, price, emoji, available} ] }
router.put('/snacks', wrap(async (req, res) => {
  const items = Array.isArray((req.body || {}).items) ? req.body.items.slice(0, 100) : null;
  if(!items) return res.status(400).json({ error: 'items must be an array.' });
  const ops = [], slugs = [];
  for(const [i, s] of items.entries()){
    const slug = str(s.id, 80).toLowerCase(), price = Number(s.price);
    if(!/^[a-z0-9-]{1,80}$/.test(slug) || !str(s.name, 60) || !(price > 0 && price <= 1000)) return res.status(400).json({ error: `Snack #${i + 1} is invalid.` });
    slugs.push(slug);
    ops.push({ updateOne: { filter: { slug }, upsert: true, update: { $set: {
      slug, name: str(s.name, 60), type: str(s.type, 20) || 'other', price: Math.round(price * 100) / 100,
      emoji: str(s.emoji, 8), available: s.available !== false, position: i } } } });
  }
  if(ops.length) await Snack.bulkWrite(ops);
  await Snack.deleteMany({ slug: { $nin: slugs } });
  res.json({ ok: true, count: items.length });
}));

/* ---------- إعدادات الجراج وكراسي القاعات ---------- */
const SETTING_DEFAULTS = { parkingLive: { occupied: [], blocked: [] }, parkingCount: RULES.parking.defaultSpaces, seatBlocks: {} };

// GET /api/admin/settings
router.get('/settings', wrap(async (req, res) => {
  const out = {};
  for(const k of Object.keys(SETTING_DEFAULTS)) out[k] = await getSetting(k, SETTING_DEFAULTS[k]);
  res.json(out);
}));

// PUT /api/admin/settings/:key  { value }
router.put('/settings/:key', wrap(async (req, res) => {
  const key = req.params.key, v = (req.body || {}).value;
  if(!(key in SETTING_DEFAULTS)) return res.status(404).json({ error: 'Unknown setting.' });
  let clean;
  if(key === 'parkingCount'){
    const n = Math.floor(Number(v));
    if(!(n >= 1 && n <= 200)) return res.status(400).json({ error: 'Spaces must be between 1 and 200.' });
    clean = n;
  }else if(key === 'parkingLive'){
    const ok = p => typeof p === 'string' && /^P\d{1,3}$/.test(p);
    clean = { occupied: (Array.isArray(v && v.occupied) ? v.occupied : []).filter(ok), blocked: (Array.isArray(v && v.blocked) ? v.blocked : []).filter(ok) };
  }else{
    clean = {};
    for(const [showKey, seats] of Object.entries(v && typeof v === 'object' ? v : {})){
      if(!/^[a-z0-9-]{1,80}\|\d{4}-\d{2}-\d{2}\|\d{2}:\d{2}$/.test(showKey)) continue;
      clean[showKey] = (Array.isArray(seats) ? seats : []).filter(s => /^[A-H]\d{1,2}$/.test(s));
    }
  }
  await setSetting(key, clean);
  res.json({ ok: true });
}));

module.exports = router;
