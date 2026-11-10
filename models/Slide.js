/* models/Slide.js : كروت الهيرو في الصفحة الرئيسية (الأدمن بيتحكم فيها) */
const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
  movieId: { type: String, required: true },        // slug الفيلم
  tagline: { type: String, default: '', maxlength: 60 },
  seconds: { type: Number, default: 4, min: 3, max: 30 },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

slideSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    ['_id', '__v', 'createdAt', 'updatedAt'].forEach(k => delete ret[k]);
    return ret;
  }
});

module.exports = mongoose.model('Slide', slideSchema);
