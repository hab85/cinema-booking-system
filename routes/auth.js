/* routes/auth.js : التسجيل وتسجيل الدخول (bcrypt + JWT) */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, signToken, wrap } = require('../middleware/auth');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^01[0125]\d{8}$/;
const PASS_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// POST /api/auth/register  { name, email, phone, password }
router.post('/register', wrap(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').trim();
  const password = String(b.password || '');

  if(name.length < 3) return res.status(400).json({ error: 'Please enter your full name.' });
  if(!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if(!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Mobile number must be 11 digits and start with 010, 011, 012 or 015.' });
  if(!PASS_RE.test(password)) return res.status(400).json({ error: 'Password needs at least 8 characters, with letters and numbers.' });
  if(await User.findOne({ email })) return res.status(409).json({ error: 'This email is already registered. Try logging in.' });

  // الدور دايمًا customer. مش بنقبل role من المتصفح أبدًا
  const user = await User.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 10), role: 'customer' });
  res.status(201).json({ token: signToken(user), user });
}));

// POST /api/auth/login  { email, password }
router.post('/login', wrap(async (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const password = String((req.body || {}).password || '');
  const bad = { error: 'Email or password is incorrect.' };      // نفس الرسالة للاتنين عشان ما نكشفش مين مسجّل
  const user = await User.findOne({ email });
  if(!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json(bad);
  res.json({ token: signToken(user), user });
}));

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json({ user: req.user }));

module.exports = router;
