/* models/Snack.js : قايمة السناكس. الأدمن يقدر يخفي صنف (available=false) */
const mongoose = require('mongoose');

const snackSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]{1,80}$/ },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  type: { type: String, default: 'other', maxlength: 20 },
  price: { type: Number, required: true, min: 0.5, max: 1000 },
  emoji: { type: String, default: '', maxlength: 8 },
  available: { type: Boolean, default: true },
  position: { type: Number, default: 0 }
}, { timestamps: true });

snackSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.slug;
    ['_id', '__v', 'slug', 'position', 'createdAt', 'updatedAt'].forEach(k => delete ret[k]);
    return ret;
  }
});

module.exports = mongoose.model('Snack', snackSchema);
