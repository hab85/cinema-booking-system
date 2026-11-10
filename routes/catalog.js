/* routes/catalog.js : قراءة الأفلام والكروت والسناكس + الكراسي المحجوزة + حالة الـ parking (عامة، من غير تسجيل دخول) */
const router = require('express').Router();
const Movie = require('../models/Movie');
const Slide = require('../models/Slide');
const Snack = require('../models/Snack');
const SeatLock = require('../models/SeatLock');
const ParkingLock = require('../models/ParkingLock');
const { wrap } = require('../middleware/auth');
const { getSetting } = require('../utils/settings');
const { RULES, isDate, isTime, hallFor } = require('../utils/rules');

router.get('/movies', wrap(async (req, res) => {
  res.json({ movies: await Movie.find().sort({ position: 1, createdAt: -1 }) });
}));

router.get('/slides', wrap(async (req, res) => {
  res.json({ slides: await Slide.find().sort({ order: 1 }) });
}));

router.get('/snacks', wrap(async (req, res) => {
  res.json({ snacks: await Snack.find().sort({ position: 1 }) });
}));

// GET /api/seats/taken?movie=slug&date=2026-11-10&time=20:00  ←  { hall, taken: ['A1','C5'] }
// المحجوز = كراسي محجوزة فعلًا + كراسي الأدمن قفلها (صيانة). التوفر مرتبط بالعرض مش بالقاعة
router.get('/seats/taken', wrap(async (req, res) => {
  const movie = String(req.query.movie || ''), date = String(req.query.date || ''), time = String(req.query.time || '');
  if(!movie || !isDate(date) || !isTime(time)) return res.status(400).json({ error: 'movie, date and time are required.' });
  const key = `${movie}|${date}|${time}`;
  const booked = await SeatLock.find({ showKey: key }).distinct('seat');
  const blocked = (await getSetting('seatBlocks', {}))[key] || [];
  res.json({ hall: hallFor(movie, date, time), taken: [...new Set([...booked, ...blocked])] });
}));

// GET /api/parking/status?date=...&time=...  ←  { spaces: ['P1',...], taken: ['P3'] }
router.get('/parking/status', wrap(async (req, res) => {
  const date = String(req.query.date || ''), time = String(req.query.time || '');
  if(!isDate(date) || !isTime(time)) return res.status(400).json({ error: 'date and time are required.' });
  const count = Number(await getSetting('parkingCount', RULES.parking.defaultSpaces)) || RULES.parking.defaultSpaces;
  const spaces = Array.from({ length: count }, (_, i) => 'P' + (i + 1));
  const reserved = await ParkingLock.find({ slotKey: `${date}|${time}` }).distinct('space');
  const live = await getSetting('parkingLive', { occupied: [], blocked: [] });
  const taken = [...new Set([...reserved, ...(live.occupied || []), ...(live.blocked || [])])].filter(p => spaces.includes(p));
  res.json({ spaces, taken });
}));

module.exports = router;
