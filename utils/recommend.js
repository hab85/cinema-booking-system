/* =====================================================
   utils/recommend.js : مرشّح الأفلام للشات بوت (بسيط وبدون خدمات خارجية)
   الملف ده نفسه بيتنسخ في الفرونت (js/recommend.js)، فبيشتغل في Node وفي المتصفح بنفس المنطق.
   بيفهم عربي وإنجليزي: النوع (أكشن، كوميدي...)، عربي/أجنبي، قصير، الأعلى تقييمًا، واسم فيلم.
   ===================================================== */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.CinemaRecommend = factory();
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  // توحيد الكتابة: حروف صغيرة، حذف التشكيل، توحيد (أ إ آ ← ا) و (ى ← ي) و (ة ← ه)
  const norm = s => String(s || '').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const K = list => list.map(norm);

  // الكلمة الإنجليزية لازم تتطابق ككلمة كاملة، والعربي بنبحث عنه كجزء من الجملة
  const has = (text, kw) => /^[a-z0-9 -]+$/.test(kw)
    ? new RegExp('(^|\\s)' + kw.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&') + '($|\\s)').test(text)
    : text.includes(kw);

  const GENRES = {
    'action':    K(['أكشن', 'اكشن', 'حركة', 'قتال', 'مطاردات', 'action', 'fight', 'fighting']),
    'comedy':    K(['كوميدي', 'كوميديا', 'ضحك', 'مضحك', 'هزار', 'comedy', 'funny', 'laugh', 'hilarious']),
    'drama':     K(['دراما', 'درامي', 'مؤثر', 'حزين', 'drama', 'emotional', 'sad', 'touching']),
    'horror':    K(['رعب', 'مرعب', 'مخيف', 'خوف', 'horror', 'scary', 'creepy']),
    'sci-fi':    K(['خيال علمي', 'فضاء', 'مستقبل', 'sci-fi', 'scifi', 'space', 'science fiction']),
    'animation': K(['كرتون', 'انيميشن', 'رسوم متحركة', 'اطفال', 'للاطفال', 'عيال', 'عائلي', 'عيلة', 'animation', 'cartoon', 'kids', 'family', 'children']),
    'thriller':  K(['تشويق', 'غموض', 'اثارة', 'إثارة', 'thriller', 'suspense', 'mystery']),
    'adventure': K(['مغامرة', 'مغامرات', 'adventure'])
  };
  const LANGS = {
    arabic: K(['عربي', 'مصري', 'عربية', 'بالعربي', 'arabic', 'egyptian']),
    international: K(['اجنبي', 'اجنبية', 'انجليزي', 'انجليزية', 'امريكي', 'اوروبي', 'foreign', 'english', 'hollywood', 'international'])
  };
  const FLAGS = {
    short: K(['قصير', 'قصيرة', 'سريع', 'مش طويل', 'short', 'quick']),
    top:   K(['احسن', 'افضل', 'اعلى تقييم', 'تقييم', 'مشهور', 'best', 'top', 'rated', 'popular']),
    soon:  K(['قريبا', 'الجاي', 'upcoming', 'soon', 'coming']),
    greet: K(['مرحبا', 'اهلا', 'هاي', 'هلو', 'السلام', 'hello', 'hi', 'hey'])
  };
  // كلمات عامة ما بنحسبهاش في مطابقة الوصف
  const STOP = new Set(K(['فيلم', 'افلام', 'عايز', 'عاوز', 'عايزه', 'ممكن', 'ايه', 'فيه', 'من', 'ده', 'دي', 'مع', 'علي', 'الي', 'رشحلي', 'رشح', 'اقترح',
    'لو', 'سمحت', 'انا', 'محتاج', 'اريد', 'the', 'and', 'for', 'movie', 'movies', 'film', 'want', 'some', 'show', 'what', 'with', 'about', 'like',
    'please', 'give', 'recommend', 'suggest', 'something', 'watch', 'نفسي', 'بحب', 'احب']));

  // كل كلمات المفاتيح (نوع، لغة، علامات): ما بنحسبهاش كـ "كلمات بحث" في الوصف
  const ALLKW = new Set([].concat(...Object.values(GENRES), ...Object.values(LANGS), ...Object.values(FLAGS)).flatMap(w => w.split(' ')));

  const minutes = d => { const h = /(\d+)\s*h/.exec(d || ''), m = /(\d+)\s*m/.exec(d || ''); return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0); };
  const found = (dict, t) => Object.keys(dict).filter(k => dict[k].some(w => has(t, w)));
  const anyFlag = (name, t) => FLAGS[name].some(w => has(t, w));

  // بيقبل الأفلام بشكل الباك (language/showtimes/description) أو شكل الفرونت (lang/times/desc)
  function recommend(text, movies){
    const t = norm(text);
    const lang = /[\u0600-\u06FF]/.test(String(text || '')) ? 'ar' : 'en';
    const list = (movies || []).map(m => ({
      m, title: norm(m.title), genre: norm(m.genre), cat: m.category || '', language: norm(m.language || m.lang),
      times: m.showtimes || m.times || [], status: m.status || 'now', mins: minutes(m.duration),
      rating: parseFloat(m.rating) || 0, text: norm([m.title, m.description || m.desc, m.genre].join(' '))
    }));

    const intent = { genres: found(GENRES, t), langs: found(LANGS, t), short: anyFlag('short', t), top: anyFlag('top', t), soon: anyFlag('soon', t) };
    const greet = anyFlag('greet', t);

    // الأفلام المعروضة (ليها مواعيد). لو العميل سأل عن "قريبًا" بنرشّح اللي لسه نازل
    const pool = list.filter(x => intent.soon ? x.status === 'soon' : (x.status !== 'soon' && x.times.length > 0));
    // لو ذكر اسم فيلم موجود (حتى لو لسه نازل) بنرجّعه
    const titleHit = list.filter(x => x.title.length >= 3 && t.includes(x.title));
    const base = [...new Set([...pool, ...titleHit])];

    const tokens = [...new Set(t.split(' ').filter(w => w.length >= 3 && !STOP.has(w) && !ALLKW.has(w)))];

    base.forEach(x => {
      let s = 0, hit = false;
      x.langOk = false;
      intent.genres.forEach(g => {
        if(x.genre === g || (g === 'sci-fi' && x.genre.includes('sci')) || (g === 'animation' && x.cat === 'animation')){ s += 4; hit = true; }
      });
      if(intent.langs.includes('arabic') && (x.cat === 'arabic' || x.language === 'arabic')){ s += 3; hit = true; x.langOk = true; }
      if(intent.langs.includes('international') && x.cat !== 'arabic' && x.language !== 'arabic'){ s += 3; hit = true; x.langOk = true; }
      if(intent.short && x.mins && x.mins <= 105){ s += 2; hit = true; }
      const overlap = tokens.filter(w => x.text.includes(w)).length;
      if(overlap){ s += Math.min(overlap, 3) * 2; hit = true; }
      if(titleHit.includes(x)){ s += 10; hit = true; }
      s += (x.rating / 10) * (intent.top ? 4 : 1);          // التقييم بيفصل بين المتساويين
      x.score = s; x.hit = hit;
    });

    const byScore = (a, b) => b.score - a.score;
    const byRating = (a, b) => b.rating - a.rating;
    const hasIntent = !!(intent.genres.length || intent.langs.length || intent.short || titleHit.length || tokens.length);

    let note, picks;
    let matched = base.filter(x => x.hit).sort(byScore);
    // لو العميل حدد عربي أو أجنبي، منرشّحش فيلم من اللغة التانية طالما فيه نتايج من اللغة اللي طلبها
    if(intent.langs.length){ const strict = matched.filter(x => x.langOk); if(strict.length) matched = strict; }
    if(matched.length){ note = 'match'; picks = matched; }
    else if(intent.soon && pool.length){ note = 'soon'; picks = pool.slice().sort(byRating); }
    else if(greet && t.split(' ').length <= 3){ note = 'greet'; picks = []; }
    else if(hasIntent && !intent.top){ note = 'none'; picks = pool.slice().sort(byRating); }
    else { note = 'top'; picks = pool.slice().sort(byRating); }
    if(!pool.length && !matched.length) note = 'empty';

    return { lang, note, intent, picks: picks.slice(0, 3).map(x => x.m) };
  }

  const TEXT = {
    ar: {
      greet: 'أهلاً بيك! 🍿 قولّي بتحب إيه (أكشن، كوميدي، كرتون، رعب…) أو فيلم عربي ولا أجنبي، وأرشحلك من المعروض دلوقتي.',
      match: 'دي أنسب الأفلام ليك:',
      top: 'دي أعلى الأفلام تقييمًا دلوقتي:',
      none: 'مش لاقي فيلم مطابق بالظبط في العروض الحالية، بس دي أحسن اختيارات متاحة:',
      soon: 'دي الأفلام اللي نازلة قريبًا:',
      empty: 'مفيش أفلام معروضة دلوقتي. جرّب تاني بعد شوية.'
    },
    en: {
      greet: 'Hi! 🍿 Tell me what you feel like watching (action, comedy, cartoon, horror…) or Arabic or foreign, and I will pick from what is showing.',
      match: 'These match what you asked for:',
      top: 'Here are the top rated movies right now:',
      none: 'I could not find an exact match in the current lineup, but these are the best picks available:',
      soon: 'These movies are coming soon:',
      empty: 'There are no movies showing right now. Please try again later.'
    }
  };

  const compose = r => ({ text: TEXT[r.lang][r.note], picks: r.picks, note: r.note, lang: r.lang });
  const run = (text, movies) => compose(recommend(text, movies));

  return { norm, recommend, compose, run };
});
