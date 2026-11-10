/* middleware/auth.js : التحقق من الـ JWT والصلاحيات. الصلاحية بتتقرا من الداتابيز مش من الـ token */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function loadUser(req){
  const h = req.headers.authorization || '';
  if(!h.startsWith('Bearer ')) return null;
  try{
    const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    return await User.findById(payload.sub);
  }catch(e){ return null; }
}

// أي مستخدم مسجّل دخول
async function auth(req, res, next){
  try{
    const u = await loadUser(req);
    if(!u) return res.status(401).json({ error: 'Please log in first.' });
    req.user = u; next();
  }catch(e){ next(e); }
}

// أدمن بس
async function adminOnly(req, res, next){
  try{
    const u = await loadUser(req);
    if(!u) return res.status(401).json({ error: 'Please log in first.' });
    if(u.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
    req.user = u; next();
  }catch(e){ next(e); }
}

const signToken = user => jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);   // بيوصّل أخطاء async لـ error handler

module.exports = { auth, adminOnly, signToken, wrap };
