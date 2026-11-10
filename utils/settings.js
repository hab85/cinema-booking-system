/* utils/settings.js : إعدادات الأدمن المحفوظة في الداتابيز (حالة الجراج، عدد الأماكن، كراسي مقفولة) */
const Setting = require('../models/Setting');

async function getSetting(key, fallback){
  const s = await Setting.findOne({ key }).lean();
  return s && s.value !== undefined && s.value !== null ? s.value : fallback;
}
async function setSetting(key, value){
  await Setting.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
}

module.exports = { getSetting, setSetting };
