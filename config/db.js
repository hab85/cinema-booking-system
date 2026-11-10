/* config/db.js : الاتصال بـ MongoDB (Atlas أو محلي) */
const mongoose = require('mongoose');

async function connectDB(){
  const uri = process.env.MONGODB_URI;
  if(!uri) throw new Error('MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  // بنتأكد إن الـ indexes (زي منع حجز نفس الكرسي مرتين) اتعملت
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
  console.log('MongoDB connected:', mongoose.connection.name);
}

module.exports = connectDB;
