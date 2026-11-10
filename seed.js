/* =====================================================
   seed.js : بيعبّي الداتابيز ببيانات البداية (أفلام، كروت هيرو، سناكس، وحساب الأدمن)
   تشغيل:  npm run seed          (بيستبدل الأفلام والكروت والسناكس بس)
           npm run seed:reset    (كمان بيمسح الحجوزات والعملاء والإعدادات. للبداية من الصفر)
   ===================================================== */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Movie = require('./models/Movie');
const Slide = require('./models/Slide');
const Snack = require('./models/Snack');
const Booking = require('./models/Booking');
const SeatLock = require('./models/SeatLock');
const ParkingLock = require('./models/ParkingLock');
const Counter = require('./models/Counter');
const Setting = require('./models/Setting');

const movies = [
  // ----- عربي -----
  { slug: 'kira-and-el-gin', title: 'Kira & El Gin', genre: 'Action', language: 'Arabic', duration: '2h 05m', rating: '7.6', status: 'now', category: 'arabic', poster: 'posters/kira-and-el-gin.jpg', description: 'A story of resistance in 1919 Egypt, mixing history, action, and a touch of the supernatural.', showtimes: ['15:00', '18:00', '21:00'], hue: 35 },
  { slug: 'blue-elephant-2', title: 'The Blue Elephant 2', genre: 'Thriller', language: 'Arabic', duration: '2h 10m', rating: '7.8', status: 'soon', category: 'arabic', poster: 'posters/blue-elephant-2.jpg', description: 'A psychiatrist is pulled back into a dark psychological mystery.', showtimes: [], hue: 215 },
  { slug: 'clash', title: 'Clash', genre: 'Drama', language: 'Arabic', duration: '1h 37m', rating: '7.4', status: 'now', category: 'arabic', poster: 'posters/clash.jpg', description: 'The whole story unfolds inside a police truck packed with protesters during a tense day in Cairo.', showtimes: ['16:30', '19:30'], hue: 10 },
  { slug: 'yacoubian-building', title: 'The Yacoubian Building', genre: 'Drama', language: 'Arabic', duration: '2h 41m', rating: '7.5', status: 'now', category: 'arabic', poster: 'posters/yacoubian-building.jpg', description: 'Residents of a famous Cairo apartment building, each from a different walk of life, see their stories intertwine.', showtimes: ['17:00', '20:30'], hue: 45 },
  // ----- أجنبي -----
  { slug: 'spider-man-no-way-home', title: 'Spider-Man: No Way Home', genre: 'Action', language: 'English', duration: '2h 28m', rating: '8.7', status: 'now', category: 'international', poster: 'posters/spider-man-no-way-home.jpg', description: 'Peter Parker asks for help to make the world forget his identity, and the spell opens the door to dangerous visitors from other universes.', showtimes: ['14:00', '17:00', '20:00', '23:00'], hue: 355 },
  { slug: 'the-batman', title: 'The Batman', genre: 'Action', language: 'English', duration: '2h 56m', rating: '8.9', status: 'premiere', category: 'international', poster: 'posters/the-batman.jpg', description: 'Batman investigates a serial killer who targets Gotham’s elite and leaves riddles behind.', showtimes: ['19:00', '22:30'], hue: 0 },
  { slug: 'joker', title: 'Joker', genre: 'Drama', language: 'English', duration: '2h 02m', rating: '8.5', status: 'now', category: 'international', poster: 'posters/joker.jpg', description: 'A struggling clown in Gotham slowly turns into the city’s most feared villain.', showtimes: ['16:00', '21:30'], hue: 140 },
  { slug: 'interstellar', title: 'Interstellar', genre: 'Sci-Fi', language: 'English', duration: '2h 49m', rating: '9.0', status: 'now', category: 'international', poster: 'posters/interstellar.jpg', description: 'A group of explorers travels through a wormhole in search of a new home for humanity.', showtimes: ['15:30', '19:15'], hue: 225 },
  { slug: 'the-conjuring', title: 'The Conjuring', genre: 'Horror', language: 'English', duration: '1h 52m', rating: '7.9', status: 'now', category: 'international', poster: 'posters/the-conjuring.jpg', description: 'Paranormal investigators help a family terrorized by a dark presence in their farmhouse.', showtimes: ['21:00', '23:15'], hue: 260 },
  // ----- كرتون -----
  { slug: 'frozen-ii', title: 'Frozen II', genre: 'Animation', language: 'English', duration: '1h 43m', rating: '8.4', status: 'now', category: 'animation', poster: 'posters/frozen-ii.jpg', description: 'Elsa follows a mysterious voice to find the source of her powers and save her kingdom.', showtimes: ['12:00', '14:30', '17:00'], hue: 205 },
  { slug: 'moana-2', title: 'Moana 2', genre: 'Animation', language: 'English', duration: '1h 40m', rating: '8.2', status: 'soon', category: 'animation', poster: 'posters/moana-2.jpg', description: 'Moana sets sail again on a new voyage across distant seas.', showtimes: [], hue: 185 },
  { slug: 'the-garfield-movie', title: 'The Garfield Movie', genre: 'Animation', language: 'English', duration: '1h 41m', rating: '7.4', status: 'now', category: 'animation', poster: 'posters/the-garfield-movie.jpg', description: 'Garfield is pulled into a heist with his long-lost father.', showtimes: ['11:30', '13:30', '15:30'], hue: 30 }
];

const slides = [
  { movieId: 'kira-and-el-gin', tagline: 'حكاية من زمن المقاومة', seconds: 4, order: 1, active: true },
  { movieId: 'the-batman', tagline: 'Unmask the truth', seconds: 4, order: 2, active: true },
  { movieId: 'spider-man-no-way-home', tagline: 'The multiverse is open', seconds: 4, order: 3, active: true },
  { movieId: 'interstellar', tagline: 'Love transcends time', seconds: 4, order: 4, active: true },
  { movieId: 'joker', tagline: 'Put on a happy face', seconds: 4, order: 5, active: true }
];

const snacks = [
  { slug: 'popcorn-s', name: 'Popcorn (Small)', type: 'popcorn', price: 40, emoji: '🍿' },
  { slug: 'popcorn-l', name: 'Popcorn (Large)', type: 'popcorn', price: 70, emoji: '🍿' },
  { slug: 'drink', name: 'Soft Drink', type: 'drink', price: 30, emoji: '🥤' },
  { slug: 'water', name: 'Water', type: 'drink', price: 15, emoji: '💧' },
  { slug: 'combo', name: 'Combo: Large Popcorn + 2 Drinks', type: 'combo', price: 120, emoji: '🎉' }
];

async function main(){
  await connectDB();
  const reset = process.argv.includes('--reset');

  await Promise.all([Movie.deleteMany({}), Slide.deleteMany({}), Snack.deleteMany({})]);
  await Movie.insertMany(movies.map((m, i) => ({ ...m, position: i })));
  await Slide.insertMany(slides);
  await Snack.insertMany(snacks.map((s, i) => ({ ...s, position: i })));

  if(reset){
    await Promise.all([Booking.deleteMany({}), SeatLock.deleteMany({}), ParkingLock.deleteMany({}), Counter.deleteMany({}), Setting.deleteMany({}), User.deleteMany({ role: 'customer' })]);
    console.log('Reset: bookings, locks, counters, settings and customers cleared.');
  }

  // حساب الأدمن (بيتعمل لو مش موجود، وكلمة سره بتتحدّث من .env)
  const email = (process.env.ADMIN_EMAIL || 'admin@cinema.test').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin1234';
  const passwordHash = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate({ email }, { name: 'Cinema Admin', email, phone: '01000000000', passwordHash, role: 'admin' }, { upsert: true, new: true });

  console.log(`Seeded: ${movies.length} movies, ${slides.length} hero cards, ${snacks.length} snacks.`);
  console.log(`Admin login: ${email} / ${password}`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
