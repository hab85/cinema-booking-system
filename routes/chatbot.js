/* routes/chatbot.js : الشات بوت. بيرشّح ~3 أفلام من اللي معروضة (من الداتابيز) */
const router = require('express').Router();
const Movie = require('../models/Movie');
const { wrap } = require('../middleware/auth');
const { run } = require('../utils/recommend');

// POST /api/chatbot  { message }  ←  { text, movies:[...] }
router.post('/', wrap(async (req, res) => {
  const message = String((req.body || {}).message || '').slice(0, 300);
  if(!message.trim()) return res.status(400).json({ error: 'Type a message first.' });
  const movies = (await Movie.find().sort({ position: 1 })).map(m => m.toJSON());
  const out = run(message, movies);
  res.json({ text: out.text, movies: out.picks });
}));

module.exports = router;
