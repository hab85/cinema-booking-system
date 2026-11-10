/* models/User.js : المستخدمين (Customer / Admin). كلمة السر بتتخزن مشفّرة (bcrypt) */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, match: /^01[0125]\d{8}$/ },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, { timestamps: true });

// الرد للمتصفح من غير الـ hash
userSchema.set('toJSON', {
  transform: (doc, ret) => ({ id: String(ret._id), name: ret.name, email: ret.email, phone: ret.phone, role: ret.role })
});

module.exports = mongoose.model('User', userSchema);
