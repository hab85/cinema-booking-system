/* =====================================================
   utils/rules.js : قواعد العمل (الأسعار، الكوبونات، سياسة الإلغاء، الدفع التجريبي)
   نفس الأرقام اللي في الفرونت (js/data.js)، لكن هنا السيرفر هو اللي بيحسب
   ومابيصدّقش اللي جاي من المتصفح.
   ===================================================== */
const RULES = {
  currency: 'EGP',
  rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],   // A قريب من الشاشة و H آخر القاعة
  seatsPerRow: 12,
  vipRows: ['D', 'E', 'F'],                           // النص = أحسن رؤية
  price: { standard: 120, vip: 180 },
  maxSeats: 8,
  maxSnackQty: 10,
  halls: 3,
  parking: { defaultSpaces: 20, fee: 25 },
  cancel: { cutoffHours: 2, fullRefundHours: 24, partialPct: 0.5 }
};

// كوبونات الخصم. السيرفر هو اللي بيفحصها ويحسب الخصم
const COUPONS = {
  NOVA2GO: { title: 'Second seat half price', days: [0, 1, 2, 3, 4], fromTime: '17:00', minSeats: 2, secondSeatPct: 0.5 },
  SNACKUP: { title: '20% off snacks', snacksPct: 0.2, needsSnacks: true }
};

const round2 = n => Math.round(n * 100) / 100;
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isTime = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));

// نفس دالة الفرونت بالظبط (عشان القاعة اللي تطلع للعرض تكون واحدة في الاتنين)
function hashStr(str){
  let h = 0;
  for(const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
const hallFor = (movieId, date, time) => 'Hall ' + (hashStr(`${movieId}|${date}|${time}`) % RULES.halls + 1);

const allSeats = () => RULES.rows.flatMap(r => Array.from({ length: RULES.seatsPerRow }, (_, i) => r + (i + 1)));
const SEAT_SET = new Set(allSeats());
const isValidSeat = id => SEAT_SET.has(id);
const seatPrice = id => RULES.vipRows.includes(id[0]) ? RULES.price.vip : RULES.price.standard;
const showDateTime = (date, time) => new Date(`${date}T${time}:00`);

/* فحص كوبون الخصم على السلة.
   cart = { date, time, seatPrices: [120, 120, 180], snacksTotal: 140 } */
function evalCoupon(code, cart){
  const key = String(code || '').trim().toUpperCase();
  const c = COUPONS[key];
  if(!c) return { ok: false, reason: 'This code is not valid.' };
  if(c.days && !c.days.includes(new Date(cart.date + 'T00:00').getDay()))
    return { ok: false, reason: `${key} is valid Sunday to Thursday only.` };
  if(c.fromTime && cart.time < c.fromTime)
    return { ok: false, reason: `${key} is valid on evening shows (from ${c.fromTime}).` };
  if(c.minSeats && cart.seatPrices.length < c.minSeats)
    return { ok: false, reason: `${key} needs at least ${c.minSeats} seats.` };
  if(c.needsSnacks && cart.snacksTotal <= 0)
    return { ok: false, reason: `${key} needs at least one snack in your order.` };

  let base = 0, pct = 0;
  if(c.secondSeatPct){ base = cart.seatPrices[1]; pct = c.secondSeatPct; }
  if(c.snacksPct){ base = cart.snacksTotal; pct = c.snacksPct; }
  return { ok: true, code: key, title: c.title, discount: round2(base * pct) };
}

/* سياسة الإلغاء: بتقفل قبل العرض بساعتين. 24 ساعة أو أكتر = استرداد كامل، أقل = 50% */
function cancelInfo(booking, now = new Date()){
  const hoursLeft = (showDateTime(booking.date, booking.time) - now) / 36e5;
  const p = RULES.cancel;
  if(hoursLeft <= p.cutoffHours) return { allowed: false, reason: `Cancellation closes ${p.cutoffHours} hours before the show.` };
  const pct = hoursLeft >= p.fullRefundHours ? 1 : p.partialPct;
  return { allowed: true, pct, refund: round2(booking.total * pct) };
}

/* بوابة الدفع التجريبية (Payment Gateway المحاكاة). مفيش بنك حقيقي.
   ref4: آخر 4 أرقام (Visa والمحفظة) أو أول 4 حروف من عنوان InstaPay */
function simulatePayment(method, ref4){
  const r = String(ref4 || '');
  if(!['visa', 'wallet', 'instapay'].includes(method)) return { ok: false, reason: 'Unknown payment method.' };
  const declined = method === 'instapay' ? /^fail/i.test(r) : r === '0000';
  return declined
    ? { ok: false, reason: `${{ visa: 'Visa', wallet: 'Mobile wallet', instapay: 'InstaPay' }[method]} payment declined (simulated). Try another method or number.` }
    : { ok: true };
}

module.exports = { RULES, COUPONS, round2, isDate, isTime, hashStr, hallFor, allSeats, isValidSeat, seatPrice, showDateTime, evalCoupon, cancelInfo, simulatePayment };
