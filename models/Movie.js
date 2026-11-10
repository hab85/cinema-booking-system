/* models/Movie.js : الأفلام. الـ id اللي بيظهر للفرونت هو الـ slug (زي kira-and-el-gin) */
const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]{1,80}$/ },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  genre: { type: String, default: '', maxlength: 40 },
  language: { type: String, default: '', maxlength: 40 },
  category: { type: String, enum: ['arabic', 'international', 'animation'], default: 'international' },
  status: { type: String, enum: ['now', 'soon', 'premiere'], default: 'now' },
  duration: { type: String, default: '' },          // مثال: 2h 18m
  rating: { type: String, default: '' },
  showtimes: { type: [String], default: [] },       // مثال: ['14:30','20:00']
  poster: { type: String, default: '' },
  cast: { type: [String], default: [] },
  releaseDate: { type: String, default: '' },
  trailer: { type: String, default: '' },
  hue: Number,
  position: { type: Number, default: 0 }           // ترتيب الأدمن
}, { timestamps: true });

movieSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.slug;
    ['_id', '__v', 'slug', 'position', 'createdAt', 'updatedAt'].forEach(k => delete ret[k]);
    return ret;
  }
});

module.exports = mongoose.model('Movie', movieSchema);
