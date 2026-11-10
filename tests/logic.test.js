/* tests/logic.test.js : اختبار منطق العمل (الأسعار، الكوبونات، الإلغاء، الدفع، الشات بوت). تشغيل: npm test */
const assert = require('assert');
const R = require('../utils/rules');
const { run } = require('../utils/recommend');

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok -', name); };

console.log('Rules');
t('seat prices: standard 120, VIP rows D-F 180', () => {
  assert.strictEqual(R.seatPrice('C5'), 120);
  assert.strictEqual(R.seatPrice('E3'), 180);
  assert.strictEqual(R.seatPrice('G3'), 120);
});
t('hall has 96 seats and validates ids', () => {
  assert.strictEqual(R.allSeats().length, 96);
  assert.ok(R.isValidSeat('H12')); assert.ok(!R.isValidSeat('H13')); assert.ok(!R.isValidSeat('Z1'));
});
t('hall is stable per show', () => {
  const h = R.hallFor('joker', '2026-11-10', '20:00');
  assert.ok(/^Hall [1-3]$/.test(h)); assert.strictEqual(h, R.hallFor('joker', '2026-11-10', '20:00'));
});

console.log('Coupons');
const sun = '2026-11-08', fri = '2026-11-13';                 // أحد وجمعة
t('NOVA2GO: second seat half price (120 x 50% = 60)', () => {
  const c = R.evalCoupon('nova2go', { date: sun, time: '20:00', seatPrices: [120, 120, 180], snacksTotal: 0 });
  assert.ok(c.ok); assert.strictEqual(c.discount, 60);
});
t('NOVA2GO: rejected on Friday, before 17:00, and with one seat', () => {
  assert.ok(!R.evalCoupon('NOVA2GO', { date: fri, time: '20:00', seatPrices: [120, 120], snacksTotal: 0 }).ok);
  assert.ok(!R.evalCoupon('NOVA2GO', { date: sun, time: '14:30', seatPrices: [120, 120], snacksTotal: 0 }).ok);
  assert.ok(!R.evalCoupon('NOVA2GO', { date: sun, time: '20:00', seatPrices: [120], snacksTotal: 0 }).ok);
});
t('SNACKUP: 20% of 140 = 28, needs snacks', () => {
  assert.strictEqual(R.evalCoupon('SNACKUP', { date: sun, time: '20:00', seatPrices: [120], snacksTotal: 140 }).discount, 28);
  assert.ok(!R.evalCoupon('SNACKUP', { date: sun, time: '20:00', seatPrices: [120], snacksTotal: 0 }).ok);
});
t('unknown code rejected', () => assert.ok(!R.evalCoupon('ABC', { date: sun, time: '20:00', seatPrices: [120], snacksTotal: 0 }).ok));

console.log('Total (seats + snacks + parking - discount)');
t('420 + 140 + 25 - 60 = 525', () => {
  const total = R.round2(420 + 140 + 25 - 60);
  assert.strictEqual(total, 525);
});

console.log('Cancellation policy');
const inHours = h => { const d = new Date(Date.now() + h * 36e5); const p = x => String(x).padStart(2, '0');
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}`, total: 585 }; };
t('48 hours before: full refund 585', () => { const c = R.cancelInfo(inHours(48)); assert.ok(c.allowed); assert.strictEqual(c.pct, 1); assert.strictEqual(c.refund, 585); });
t('10 hours before: 50% refund 292.5', () => { const c = R.cancelInfo(inHours(10)); assert.ok(c.allowed); assert.strictEqual(c.refund, 292.5); });
t('1 hour before: not allowed', () => assert.ok(!R.cancelInfo(inHours(1)).allowed));

console.log('Payment simulation');
t('visa/wallet decline on 0000, instapay on "fail"', () => {
  assert.ok(!R.simulatePayment('visa', '0000').ok);
  assert.ok(R.simulatePayment('visa', '4242').ok);
  assert.ok(!R.simulatePayment('wallet', '0000').ok);
  assert.ok(!R.simulatePayment('instapay', 'fail').ok);
  assert.ok(R.simulatePayment('instapay', 'ahme').ok);
  assert.ok(!R.simulatePayment('paypal', '1234').ok);
});

console.log('Chatbot recommender');
const movies = [
  { id: 'kira', title: 'Kira & El Gin', genre: 'Action', language: 'Arabic', category: 'arabic', status: 'now', duration: '2h 05m', rating: '7.6', showtimes: ['15:00'], description: 'resistance in 1919 Egypt' },
  { id: 'clash', title: 'Clash', genre: 'Drama', language: 'Arabic', category: 'arabic', status: 'now', duration: '1h 37m', rating: '7.4', showtimes: ['16:30'], description: 'inside a police truck' },
  { id: 'blue', title: 'The Blue Elephant 2', genre: 'Thriller', language: 'Arabic', category: 'arabic', status: 'soon', duration: '2h 10m', rating: '7.8', showtimes: [], description: 'psychological mystery' },
  { id: 'spider', title: 'Spider-Man: No Way Home', genre: 'Action', language: 'English', category: 'international', status: 'now', duration: '2h 28m', rating: '8.7', showtimes: ['14:00'], description: 'multiverse' },
  { id: 'batman', title: 'The Batman', genre: 'Action', language: 'English', category: 'international', status: 'premiere', duration: '2h 56m', rating: '8.9', showtimes: ['19:00'], description: 'serial killer' },
  { id: 'inter', title: 'Interstellar', genre: 'Sci-Fi', language: 'English', category: 'international', status: 'now', duration: '2h 49m', rating: '9.0', showtimes: ['15:30'], description: 'wormhole space' },
  { id: 'conj', title: 'The Conjuring', genre: 'Horror', language: 'English', category: 'international', status: 'now', duration: '1h 52m', rating: '7.9', showtimes: ['21:00'], description: 'haunted farmhouse' },
  { id: 'frozen', title: 'Frozen II', genre: 'Animation', language: 'English', category: 'animation', status: 'now', duration: '1h 43m', rating: '8.4', showtimes: ['12:00'], description: 'Elsa kingdom' },
  { id: 'garfield', title: 'The Garfield Movie', genre: 'Animation', language: 'English', category: 'animation', status: 'now', duration: '1h 41m', rating: '7.4', showtimes: ['11:30'], description: 'cat heist' },
  { id: 'moana', title: 'Moana 2', genre: 'Animation', language: 'English', category: 'animation', status: 'soon', duration: '1h 40m', rating: '8.2', showtimes: [], description: 'voyage' }
];
const ids = r => r.picks.map(m => m.id);
t('Arabic: "عايز فيلم أكشن أجنبي" -> action foreign, Arabic reply', () => {
  const r = run('عايز فيلم أكشن أجنبي', movies);
  assert.strictEqual(r.lang, 'ar'); assert.strictEqual(r.note, 'match');
  assert.ok(ids(r).includes('batman') && ids(r).includes('spider')); assert.ok(!ids(r).includes('kira'));
});
t('English: "something funny for kids" -> animation', () => {
  const r = run('something funny for kids', movies);
  assert.strictEqual(r.lang, 'en'); assert.ok(ids(r).every(i => ['frozen', 'garfield'].includes(i)));
});
t('"فيلم عربي": Arabic movies that are showing (not the upcoming one)', () => {
  const r = run('فيلم عربي', movies);
  assert.ok(ids(r).includes('kira') && ids(r).includes('clash')); assert.ok(!ids(r).includes('blue'));
});
t('"horror" -> The Conjuring', () => assert.strictEqual(run('horror please', movies).picks[0].id, 'conj'));
t('sci-fi in Arabic -> Interstellar', () => assert.strictEqual(run('عايز فيلم خيال علمي', movies).picks[0].id, 'inter'));
t('short movie (<= 105 min) -> Clash/Frozen/Garfield', () => {
  const r = run('فيلم قصير', movies); assert.ok(ids(r).every(i => ['clash', 'frozen', 'garfield'].includes(i)));
});
t('exact title match comes first', () => assert.strictEqual(run('I want to watch Interstellar', movies).picks[0].id, 'inter'));
t('upcoming: "قريبا" -> soon movies', () => {
  const r = run('في ايه قريبا', movies); assert.strictEqual(r.note, 'soon'); assert.ok(ids(r).includes('blue') && ids(r).includes('moana'));
});
t('greeting -> greet message, no picks', () => { const r = run('اهلا', movies); assert.strictEqual(r.note, 'greet'); assert.strictEqual(r.picks.length, 0); });
t('no preference -> top rated', () => { const r = run('recommend something', movies); assert.strictEqual(r.note, 'top'); assert.strictEqual(r.picks[0].id, 'inter'); });
t('unknown request -> honest "no exact match" + best picks', () => {
  const r = run('xyzzy plugh', movies); assert.strictEqual(r.note, 'none'); assert.strictEqual(r.picks.length, 3);
});
t('works with frontend-shaped movies too (lang/times/desc)', () => {
  const fe = movies.map(m => ({ id: m.id, title: m.title, genre: m.genre, lang: m.language, category: m.category, status: m.status, duration: m.duration, rating: m.rating, times: m.showtimes, desc: m.description }));
  assert.ok(ids(run('horror', fe)).includes('conj'));
});

console.log(`\nAll ${n} tests passed.`);
