/* models/Counter.js : عدّاد ذري (atomic) لرقم استلام السناكس لكل يوم عرض. ما بيتكررش حتى لو اتنين حجزوا في نفس اللحظة */
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

counterSchema.statics.next = async function(key){
  const c = await this.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return c.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
