/* =====================================================
   server.js : نقطة تشغيل الباك (Express)
   تشغيل:  npm start   (أو npm run dev أثناء التطوير)
   ===================================================== */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16){
  console.error('JWT_SECRET is missing or too short. Set a long random value in .env');
  process.exit(1);
}

const app = express();

// CORS: الموقع (Live Server) بيكلم الباك من بورت تاني. localhost و127.0.0.1 بأي بورت مسموحين، ومعاهم اللي في CLIENT_ORIGINS
const allowed = (process.env.CLIENT_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if(!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || allowed.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '200kb' }));

// فحص الصحة: الفرونت بيسأل عليه عشان يعرف الباك شغال ومتوصّل بالداتابيز ولا لأ
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api', require('./routes/catalog'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// أي خطأ غير متوقع: بنسجّله في الـ terminal ونرد برسالة عامة (من غير تفاصيل داخلية)
app.use((err, req, res, next) => {
  if(err && err.message === 'Origin not allowed by CORS') return res.status(403).json({ error: err.message });
  if(err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch(err => { console.error('Could not start:', err.message); process.exit(1); });

module.exports = app;
