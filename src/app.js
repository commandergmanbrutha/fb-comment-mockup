/* ===================== Facebook Comment Mockup Generator =====================
   Geometry, type scale and colours below are measured from a live facebook.com
   comment thread (captured 2026-08-27, light mode, Chrome/Mac) by reading
   computed styles off the real DOM — not eyeballed. See README.

   FACES is injected by build.py: [{id,gender,heritage,age,src(dataURI)}...]
============================================================================ */

/* Facebook's own font stack on macOS (--font-family-apple, verbatim). */
const FB_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", sans-serif';

/* ---- measured metrics -------------------------------------------------- */
const M = {
  PAD_X: 12, PAD_RIGHT: 40, PAD_TOP: 6, PAD_BOTTOM: 4,
  AV: 40, AV_REPLY: 24, GAP: 14,
  NAME_FS: 13, NAME_LH: 16, NAME_W: 600,
  TIME_FS: 12, DOT_PAD: 5,
  BODY_FS: 15, BODY_LH: 20,
  FOOTER_GAP: 8, FOOTER_H: 16,
  ACT_FS: 12, ACT_W: 600, ACT_GAP: 16, ICON_GAP: 40,
  RX: 16, RX_STEP: 14, RX_LEAD: 24, COUNT_FS: 13, COUNT_GAP: 3,
  REPLY_INDENT: 53,
  /* classic (grey-bubble) style */
  BUB_R: 16, BUB_PX: 12, BUB_PT: 8, BUB_PB: 10
};

/* ---- measured palettes (CSS custom properties read off facebook.com) ---- */
const THEMES = {
  light: {
    page:'#FFFFFF', text:'#080809', secondary:'#65686C', bubble:'#F0F2F5',
    mention:'#0064D1', thread:'#E2E5E9', icon:'#65686C'
  },
  dark: {
    page:'#242526', text:'#E4E6EB', secondary:'#B0B3B8', bubble:'#3A3B3C',
    mention:'#5AA7FF', thread:'#46484B', icon:'#B0B3B8'
  }
};

/* ================================ utilities ================================ */
const rnd  = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const chance = p => Math.random() < p;

/* ============================== demographics =============================== */
const AGES = ["18-29","30-44","45-59","60+"];
const HERITAGES = ["white","black","hispanic","eastasian","southasian","mideast","mixed"];

function surnamePools(region, heritage){
  const H = {
    white:["white_us"], black:["black"], hispanic:["hispanic"],
    eastasian:["eastasian"], southasian:["southasian"], mideast:["mideast"],
    mixed:["white_us","black","hispanic"]
  };
  if (region === "uk") return heritage === "white" ? ["uk"]    : H[heritage].concat(["uk"]);
  if (region === "ie") return heritage === "white" ? ["irish"] : H[heritage].concat(["irish"]);
  if (region === "au") return heritage === "white" ? ["aus"]   : H[heritage].concat(["aus"]);
  if (region === "ca") return heritage === "white" ? ["white_us","uk"] : H[heritage].concat(["white_us"]);
  return H[heritage];
}

function makeName(gender, heritage, age, region){
  const g = gender === "any" ? (chance(0.78) ? "f" : "m") : gender;
  const h = heritage === "any" ? pick(HERITAGES) : heritage;
  const a = age === "any" ? pick(AGES) : age;
  const first = pick(FIRST[g][h][a]);
  const pools = surnamePools(region, h);
  const last  = pick(SURNAMES[pick(pools)]);
  const r = Math.random();
  if (r < 0.06) return `${first} ${pick(SURNAMES[pick(pools)])}-${last}`;
  if (r < 0.10) return `${first} ${pick(["A.","J.","M.","L.","R.","K.","E.","D."])} ${last}`;
  return `${first} ${last}`;
}

function matchFaces(gender, heritage, age){
  const gOk = f => gender   === "any" || f.gender   === gender;
  const hOk = f => heritage === "any" || f.heritage === heritage;
  let m = FACES.filter(f => gOk(f) && hOk(f) && (age === "any" || f.age === age));
  if (m.length) return m;
  if (age !== "any"){
    const i = AGES.indexOf(age);
    for (let d = 1; d < AGES.length; d++)
      for (const j of [i - d, i + d]){
        if (j < 0 || j >= AGES.length) continue;
        const near = FACES.filter(f => gOk(f) && hOk(f) && f.age === AGES[j]);
        if (near.length) return near;
      }
  }
  m = FACES.filter(f => gOk(f) && hOk(f));
  if (m.length) return m;
  m = FACES.filter(gOk);
  return m.length ? m : FACES;
}

function makeTime(){
  const r = Math.random();
  if (r < 0.08) return "Just now";
  if (r < 0.45) return `${1 + rnd(59)}m`;
  return `${1 + rnd(23)}h`;
}

/* Sad and Angry never come up at random — wrong tone for social proof.
   Both stay selectable by hand on each card. */
const RX_WEIGHTS = [["like",54],["love",28],["care",10],["haha",6],["wow",2]];
function weightedRx(exclude){
  const pool = RX_WEIGHTS.filter(([k]) => !exclude.includes(k));
  const tot = pool.reduce((s,[,w]) => s+w, 0);
  let r = Math.random() * tot;
  for (const [k,w] of pool) if ((r -= w) <= 0) return k;
  return pool[0][0];
}
function makeReactions(count){
  const n = count < 8 ? (chance(0.55) ? 1 : 2) : count < 18 ? (chance(0.5) ? 2 : 3) : 3;
  const out = [];
  while (out.length < n) out.push(weightedRx(out));
  return out;
}

function activePool(){
  const custom = document.getElementById('customPool').value.trim();
  if (custom){
    const parts = custom.split(/\n\s*\n|\n---\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts;
  }
  const tones = [...document.querySelectorAll('.tone:checked')].map(c => c.value);
  let pool = [];
  for (const t of tones) pool = pool.concat(MESSAGES[t] || []);
  return pool.length ? pool : MESSAGES.medium;
}

/* ============================== comment model ============================== */
let SEQ = 0;
const F = id => document.getElementById(id);

/* used* are Sets carried across one batch so a bulk run never repeats itself. */
function makeComment(used){
  const gender = F('fGender').value, heritage = F('fHeritage').value;
  const age = F('fAge').value, region = F('fRegion').value;
  const faces = matchFaces(gender, heritage, age);

  let face = null;
  if (used){
    const free = faces.filter(f => !used.faces.has(f.id));
    face = free.length ? pick(free) : pick(faces);
    used.faces.add(face.id);
  } else face = pick(faces);

  const nameFor = () => makeName(
      gender   === "any" ? face.gender   : gender,
      heritage === "any" ? face.heritage : heritage,
      age      === "any" ? face.age      : age, region);
  let name = nameFor();
  if (used){
    // Two "Valerie ... Garrett"s in one thread reads as fake even though the
    // full strings differ, so first names and every surname component are
    // reserved too — not just the whole name.
    const partsOf = n => {
      const t = n.split(' ');
      const last = t[t.length - 1];
      return { first: t[0], lasts: last.split('-').filter(Boolean) };
    };
    const clashes = n => {
      const { first, lasts } = partsOf(n);
      return used.names.has(n) || used.first.has(first) || lasts.some(l => used.last.has(l));
    };
    for (let i = 0; i < 60 && clashes(name); i++) name = nameFor();
    const { first, lasts } = partsOf(name);
    used.names.add(name); used.first.add(first);
    for (const l of lasts) used.last.add(l);
  }

  const pool = activePool();
  let text = pick(pool);
  if (used){
    const free = pool.filter(t => !used.texts.has(t));
    text = free.length ? pick(free) : pick(pool);
    used.texts.add(text);
  }

  const reacts = 5 + rnd(26);                        // 5..30
  return { id: ++SEQ, name, text, time: makeTime(), reacts,
           rx: makeReactions(reacts), avatar: face.src, faceId: face.id, isReply: false };
}

/* ================================ rendering ================================ */
const RX_IMG = {};
const loadReactionImages = () => Promise.all(RX_ORDER.map(k => new Promise(res => {
  const img = new Image();
  img.onload = () => { RX_IMG[k] = img; res(); };
  img.onerror = () => res();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(RX_SVG[k]);
})));

const AV_IMG = new Map();
function loadAvatar(src){
  if (AV_IMG.has(src)) return Promise.resolve(AV_IMG.get(src));
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { AV_IMG.set(src, img); res(img); };
    img.onerror = () => res(null);
    img.src = src;
  });
}

function wrapText(ctx, text, maxW){
  const out = [];
  for (const para of String(text).split('\n')){
    if (!para.trim()){ out.push(''); continue; }
    let line = '';
    for (const word of para.split(/\s+/)){
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

/* Facebook's own footer thumb icons — real path data, 24x24 source, drawn as Path2D. */
const THUMB_PATH = {};
function thumbIcon(ctx, x, y, s, down, color){
  const key = down ? 'thumbDown' : 'thumbUp';
  if (!THUMB_PATH[key]) THUMB_PATH[key] = new Path2D(FB_ICONS[key]);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 24, s / 24);
  ctx.fillStyle = color;
  ctx.fill(THUMB_PATH[key]);
  ctx.restore();
}

function opts(){
  return {
    W:      +F('oWidth').value,
    scale:  +F('oScale').value,
    body:   +F('oFont').value,
    avatar: +F('oAvatar').value,
    style:  F('oStyle').value,          // modern | classic
    footer: F('oFooter').value,         // text | thumbs
    theme:  F('oTheme').value,          // light | dark
    bg:     F('oBg').value              // theme | white | transparent
  };
}

/* Split "@Name rest of comment" so the mention renders blue like FB does. */
function splitMention(text){
  const m = /^@([^\s][^\n]{0,38}?)\s+(?=\S)/.exec(text);
  return m ? { mention: m[1], rest: text.slice(m[0].length) } : { mention: null, rest: text };
}

function drawComment(canvas, c, o){
  const S = o.scale, W = o.W, T = THEMES[o.theme];
  const ctx = canvas.getContext('2d');
  const classic = o.style === 'classic';

  const bodyFS = o.body;
  const nameFS = Math.max(11, bodyFS - 2);
  const bodyLH = Math.round(bodyFS * (M.BODY_LH / M.BODY_FS));
  const nameLH = Math.round(nameFS * (M.NAME_LH / M.NAME_FS));
  const av = c.isReply ? Math.round(o.avatar * (M.AV_REPLY / M.AV)) : o.avatar;
  const indent = c.isReply ? M.REPLY_INDENT : 0;

  const avX = M.PAD_X + indent;
  const colX = avX + av + M.GAP;
  const availW = W - colX - M.PAD_RIGHT;   // FB reserves a right gutter, so text wraps early

  const { mention, rest } = splitMention(c.text);

  /* ---------------- measure ---------------- */
  ctx.font = `${M.NAME_W} ${nameFS}px ${FB_FONT}`;
  const nameW = ctx.measureText(c.name).width;
  ctx.font = `400 ${M.TIME_FS}px ${FB_FONT}`;
  const timeW = ctx.measureText(c.time).width;
  const dotW  = ctx.measureText('·').width;

  const textMax = classic ? availW - M.BUB_PX * 2 : availW;
  ctx.font = `400 ${bodyFS}px ${FB_FONT}`;
  let mentionW = 0;
  if (mention){
    ctx.font = `600 ${bodyFS}px ${FB_FONT}`;
    mentionW = ctx.measureText(mention + ' ').width;
    ctx.font = `400 ${bodyFS}px ${FB_FONT}`;
  }
  const lines = wrapText(ctx, rest, textMax - (mention ? mentionW : 0));
  let maxLineW = 0;
  for (const l of lines) maxLineW = Math.max(maxLineW, ctx.measureText(l).width);
  if (mention) maxLineW = Math.max(maxLineW, mentionW + (lines[0] ? ctx.measureText(lines[0]).width : 0));

  const bodyH = lines.length * bodyLH;

  /* header line: modern = name · time together; classic = name only (time moves to footer) */
  const headH = nameLH;
  const bubbleW = classic
      ? Math.min(availW, Math.max(nameW, maxLineW) + M.BUB_PX * 2) : 0;
  const bubbleH = classic ? M.BUB_PT + headH + bodyH + M.BUB_PB : 0;

  const contentTop = M.PAD_TOP;
  const footerTop  = contentTop + (classic ? bubbleH : headH + bodyH) + M.FOOTER_GAP;
  const contentH   = (footerTop - contentTop) + M.FOOTER_H;
  const H = M.PAD_TOP + Math.max(av, contentH) + M.PAD_BOTTOM;

  canvas.width = Math.round(W * S); canvas.height = Math.round(H * S);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(S, 0, 0, S, 0, 0);

  /* ---------------- paint ---------------- */
  const bg = o.bg === 'theme' ? T.page : o.bg;
  if (bg !== 'transparent'){ ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
  else ctx.clearRect(0, 0, W, H);

  /* reply threading elbow */
  if (c.isReply){
    ctx.strokeStyle = T.thread; ctx.lineWidth = 2;
    const lx = M.PAD_X + o.avatar / 2, by = contentTop + av / 2;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, by - 12);
    ctx.quadraticCurveTo(lx, by, lx + 12, by);
    ctx.lineTo(avX - 6, by);
    ctx.stroke();
  }

  /* avatar */
  const aImg = AV_IMG.get(c.avatar);
  ctx.save();
  ctx.beginPath(); ctx.arc(avX + av/2, contentTop + av/2, av/2, 0, Math.PI*2); ctx.clip();
  if (aImg){
    const s = Math.max(av / aImg.width, av / aImg.height);
    const dw = aImg.width * s, dh = aImg.height * s;
    ctx.drawImage(aImg, avX + (av - dw)/2, contentTop + (av - dh)/2, dw, dh);
  } else { ctx.fillStyle = T.bubble; ctx.fillRect(avX, contentTop, av, av); }
  ctx.restore();

  /* classic bubble */
  if (classic){
    ctx.fillStyle = T.bubble;
    roundRect(ctx, colX, contentTop, bubbleW, bubbleH, M.BUB_R);
    ctx.fill();
  }

  const textX = classic ? colX + M.BUB_PX : colX;
  const textTop = classic ? contentTop + M.BUB_PT : contentTop;

  /* header: name (+ · time in modern) */
  ctx.textBaseline = 'middle';
  ctx.font = `${M.NAME_W} ${nameFS}px ${FB_FONT}`;
  ctx.fillStyle = T.text;
  ctx.fillText(c.name, textX, textTop + headH/2);
  if (!classic){
    let hx = textX + nameW + M.DOT_PAD;
    ctx.font = `400 ${M.TIME_FS}px ${FB_FONT}`;
    ctx.fillStyle = T.secondary;
    ctx.fillText('·', hx, textTop + headH/2);
    hx += dotW + M.DOT_PAD;
    ctx.fillText(c.time, hx, textTop + headH/2);
  }

  /* body */
  const bodyTop = textTop + headH;
  lines.forEach((l, i) => {
    const y = bodyTop + i*bodyLH + bodyLH/2;
    let x = textX;
    if (i === 0 && mention){
      ctx.font = `600 ${bodyFS}px ${FB_FONT}`;
      ctx.fillStyle = T.mention;
      ctx.fillText(mention + ' ', x, y);
      x += mentionW;
    }
    ctx.font = `400 ${bodyFS}px ${FB_FONT}`;
    ctx.fillStyle = T.text;
    ctx.fillText(l, x, y);
  });

  /* footer */
  const fy = footerTop + M.FOOTER_H/2;
  let fx = colX;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = T.secondary;

  if (classic){
    ctx.font = `400 ${M.ACT_FS}px ${FB_FONT}`;
    ctx.fillText(c.time, fx, fy);
    fx += ctx.measureText(c.time).width + M.ACT_GAP;
  }
  if (o.footer === 'thumbs' && !classic){
    thumbIcon(ctx, fx, footerTop, M.RX, false, T.icon); fx += M.ICON_GAP;
    thumbIcon(ctx, fx, footerTop, M.RX, true,  T.icon); fx += M.ICON_GAP;
  } else {
    ctx.font = `${M.ACT_W} ${M.ACT_FS}px ${FB_FONT}`;
    ctx.fillStyle = T.secondary;
    ctx.fillText('Like', fx, fy);
    fx += ctx.measureText('Like').width + M.ACT_GAP;
  }
  ctx.font = `${M.ACT_W} ${M.ACT_FS}px ${FB_FONT}`;
  ctx.fillStyle = T.secondary;
  ctx.fillText('Reply', fx, fy);
  fx += ctx.measureText('Reply').width;

  if (c.reacts > 0 && c.rx.length){
    fx += M.RX_LEAD;
    const icons = c.rx.slice(0, 3);
    icons.forEach((k, i) => {
      const img = RX_IMG[k]; if (!img) return;
      ctx.drawImage(img, fx + i*M.RX_STEP, fy - M.RX/2, M.RX, M.RX);
    });
    const clusterW = M.RX + (icons.length - 1) * M.RX_STEP;
    ctx.font = `400 ${M.COUNT_FS}px ${FB_FONT}`;
    ctx.fillStyle = T.secondary;
    ctx.fillText(fmtCount(c.reacts), fx + clusterW + M.COUNT_GAP, fy);
  }
  return { w: W, h: H };
}

const fmtCount = n => n >= 1000 ? (n/1000).toFixed(n % 1000 >= 100 ? 1 : 0).replace('.0','') + 'K' : String(n);

/* ================================== state ================================== */
let COMMENTS = [];

/* Flag any name / face / message used more than once in the current stack. */
function markDuplicates(){
  const byName = {}, byFace = {}, byText = {};
  for (const c of COMMENTS){
    const t = c.name.split(' ');
    (byName[t[0] + '|' + t[t.length-1]] ||= []).push(c.id);
    (byFace[c.faceId] ||= []).push(c.id);
    (byText[c.text] ||= []).push(c.id);
  }
  let nDup = 0, fDup = 0, tDup = 0;
  for (const c of COMMENTS){
    const t = c.name.split(' ');
    c.dupName = byName[t[0] + '|' + t[t.length-1]].length > 1;
    c.dupFace = byFace[c.faceId] && byFace[c.faceId].length > 1;
    c.dupText = byText[c.text].length > 1;
    if (c.dupName) nDup++;
    if (c.dupFace) fDup++;
    if (c.dupText) tDup++;
  }
  return { nDup, fDup, tDup,
           names: Object.values(byName).filter(a => a.length > 1).length,
           faces: Object.values(byFace).filter(a => a.length > 1).length,
           texts: Object.values(byText).filter(a => a.length > 1).length };
}

function renderWarning(d){
  const el = F('dupWarn');
  const parts = [];
  if (d.faces) parts.push(`${d.faces} face${d.faces>1?'s':''} reused`);
  if (d.names) parts.push(`${d.names} name${d.names>1?'s':''} reused`);
  if (d.texts) parts.push(`${d.texts} message${d.texts>1?'s':''} reused`);
  if (!parts.length){ el.style.display = 'none'; return; }
  const g = F('fGender').value, h = F('fHeritage').value, a = F('fAge').value;
  const avail = matchFaces(g,h,a).length;
  const why = d.faces
    ? ` Only ${avail} face${avail>1?'s':''} match the current filter, so ${COMMENTS.length} comments can't all be unique — add more faces or widen the filter.`
    : '';
  el.style.display = 'block';
  el.innerHTML = `<strong>Duplicates in this batch:</strong> ${parts.join(' · ')}.${why}
                  <span class="dupkey">Reused cards are outlined below.</span>`;
}

async function renderAll(){
  const o = opts();
  const d = markDuplicates();
  await Promise.all([...new Set(COMMENTS.map(c => c.avatar))].map(loadAvatar));
  for (const c of COMMENTS){
    const cv = F('cv-' + c.id);
    if (cv) drawComment(cv, c, o);
    const card = F('card-' + c.id);
    if (card){
      card.classList.toggle('dup', !!(c.dupName || c.dupFace || c.dupText));
      const badge = card.querySelector('.dupbadge');
      const tags = [];
      if (c.dupFace) tags.push('same face');
      if (c.dupName) tags.push('same name');
      if (c.dupText) tags.push('same message');
      if (badge){
        badge.textContent = tags.join(' · ');
        badge.style.display = tags.length ? 'inline-block' : 'none';
      }
    }
  }
  F('count').textContent = COMMENTS.length;
  F('empty').style.display = COMMENTS.length ? 'none' : 'block';
  renderWarning(d);
}

const escapeHTML = s => String(s).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
const escapeAttr = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

function cardHTML(c){
  const rxBtns = RX_ORDER.map(k =>
    `<button class="rxb ${c.rx.includes(k) ? 'on' : ''}" data-id="${c.id}" data-rx="${k}" title="${RX_LABEL[k]}">
       <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(RX_SVG[k])}" alt="${RX_LABEL[k]}"></button>`).join('');
  return `
  <div class="card" id="card-${c.id}">
    <span class="dupbadge" style="display:none"></span>
    <div class="preview"><canvas id="cv-${c.id}"></canvas></div>
    <details class="editor">
      <summary>Edit</summary>
      <div class="erow"><label>Name</label><input class="f-name" data-id="${c.id}" value="${escapeAttr(c.name)}"></div>
      <div class="erow"><label>Comment</label><textarea class="f-text" data-id="${c.id}" rows="4">${escapeHTML(c.text)}</textarea>
        <div class="hint">Start with <code>@Name</code> to render a blue tagged mention.</div></div>
      <div class="erow grid3">
        <div><label>When</label><input class="f-time" data-id="${c.id}" value="${escapeAttr(c.time)}"></div>
        <div><label>Reacts</label><input class="f-reacts" data-id="${c.id}" type="number" min="0" value="${c.reacts}"></div>
        <div><label>Photo</label><input class="f-av" data-id="${c.id}" type="file" accept="image/*"></div>
      </div>
      <div class="erow"><label>Reactions shown</label><div class="rxrow">${rxBtns}</div></div>
      <div class="erow"><label class="chk"><input type="checkbox" class="f-reply" data-id="${c.id}" ${c.isReply?'checked':''}> Indent as a reply</label></div>
    </details>
    <div class="cardbar">
      <button class="mini" data-act="reroll" data-id="${c.id}">↻ Reroll</button>
      <button class="mini" data-act="face"   data-id="${c.id}">Face</button>
      <button class="mini" data-act="text"   data-id="${c.id}">Text</button>
      <button class="mini" data-act="dl"     data-id="${c.id}">↓ PNG</button>
      <button class="mini danger" data-act="del" data-id="${c.id}">✕</button>
    </div>
  </div>`;
}

function paint(){
  F('stack').innerHTML = COMMENTS.map(cardHTML).join('');
  renderAll();
}

/* Reserve everything one existing comment already occupies. */
function reserve(used, c){
  used.faces.add(c.faceId); used.names.add(c.name); used.texts.add(c.text);
  const t = c.name.split(' ');
  used.first.add(t[0]);
  for (const l of t[t.length-1].split('-')) if (l) used.last.add(l);
}

/* Build a batch with no repeated face / name / message where the pools allow. */
function addComments(n, fresh){
  const used = { faces:new Set(), names:new Set(), first:new Set(), last:new Set(), texts:new Set() };
  if (!fresh) for (const c of COMMENTS) reserve(used, c);
  for (let i = 0; i < n; i++) COMMENTS.push(makeComment(used));
  paint();
}
function rerollAll(){ const n = COMMENTS.length || 1; COMMENTS = []; addComments(n, true); }

/* ================================ ZIP writer =============================== */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){ let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0; }
  return t;
})();
function crc32(buf){
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(files){
  const chunks = [], central = [];
  let offset = 0;
  const enc = new TextEncoder();
  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  for (const f of files){
    const nameBytes = enc.encode(f.name), crc = crc32(f.data);
    const local = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length), u16(nameBytes.length), u16(0));
    chunks.push(new Uint8Array(local), nameBytes, f.data);
    central.push({ crc, size: f.data.length, nameBytes, offset });
    offset += local.length + nameBytes.length + f.data.length;
  }
  const cdStart = offset;
  for (const e of central){
    const hdr = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(e.crc), u32(e.size), u32(e.size), u16(e.nameBytes.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset));
    chunks.push(new Uint8Array(hdr), e.nameBytes);
    offset += hdr.length + e.nameBytes.length;
  }
  chunks.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0),
    u16(central.length), u16(central.length), u32(offset - cdStart), u32(cdStart), u16(0))));
  return new Blob(chunks, { type: 'application/zip' });
}

/* ================================= exports ================================= */
const canvasBlob = (cv, type, q) => new Promise(r => cv.toBlob(r, type, q));
function download(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'comment';

function flattenForJpeg(cv){
  const out = document.createElement('canvas');
  out.width = cv.width; out.height = cv.height;
  const c = out.getContext('2d');
  c.fillStyle = THEMES[opts().theme].page; c.fillRect(0, 0, out.width, out.height);
  c.drawImage(cv, 0, 0);
  return out;
}

async function exportZip(type){
  if (!COMMENTS.length) return;
  const ext = type === 'image/jpeg' ? 'jpg' : 'png';
  const transparent = opts().bg === 'transparent';
  const files = [], seen = {};
  for (let i = 0; i < COMMENTS.length; i++){
    const c = COMMENTS[i], cv = F('cv-' + c.id);
    if (!cv) continue;
    const src = (type === 'image/jpeg' && transparent) ? flattenForJpeg(cv) : cv;
    const blob = await canvasBlob(src, type, 0.95);
    let base = `${String(i+1).padStart(2,'0')}-${slug(c.name)}`;
    seen[base] = (seen[base] || 0) + 1;
    if (seen[base] > 1) base += '-' + seen[base];
    files.push({ name: `${base}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  download(makeZip(files), `fb-comments-${COMMENTS.length}.zip`);
}

async function exportStacked(type){
  if (!COMMENTS.length) return;
  const o = opts();
  const cvs = COMMENTS.map(c => F('cv-' + c.id)).filter(Boolean);
  const w = Math.max(...cvs.map(c => c.width));
  const h = cvs.reduce((s, c) => s + c.height, 0);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  if (o.bg !== 'transparent' || type === 'image/jpeg'){
    ctx.fillStyle = o.bg === 'transparent' ? THEMES[o.theme].page
                  : (o.bg === 'theme' ? THEMES[o.theme].page : o.bg);
    ctx.fillRect(0, 0, w, h);
  }
  let y = 0;
  for (const c of cvs){ ctx.drawImage(c, 0, y); y += c.height; }
  download(await canvasBlob(out, type, 0.95), `fb-comment-thread.${type === 'image/jpeg' ? 'jpg' : 'png'}`);
}

/* ================================== wiring ================================= */
function wire(){
  F('btnGenerate').onclick = () => { COMMENTS = []; addComments(+F('batchN').value || 1, true); };
  F('btnAppend').onclick   = () => addComments(+F('batchN').value || 1, false);
  F('btnAddOne').onclick   = () => addComments(1, false);
  F('btnReroll').onclick   = rerollAll;
  F('btnClear').onclick    = () => { COMMENTS = []; paint(); };

  F('btnZipPng').onclick   = () => exportZip('image/png');
  F('btnZipJpg').onclick   = () => exportZip('image/jpeg');
  F('btnStackPng').onclick = () => exportStacked('image/png');
  F('btnStackJpg').onclick = () => exportStacked('image/jpeg');

  ['oWidth','oScale','oAvatar','oFont','oStyle','oFooter','oTheme','oBg'].forEach(id => {
    F(id).addEventListener('input', renderAll);
    F(id).addEventListener('change', renderAll);
  });

  F('stack').addEventListener('click', async e => {
    const rx = e.target.closest('.rxb');
    if (rx){
      const c = COMMENTS.find(x => x.id == rx.dataset.id), k = rx.dataset.rx;
      const i = c.rx.indexOf(k);
      if (i >= 0){ if (c.rx.length > 1) c.rx.splice(i,1); }
      else if (c.rx.length < 3) c.rx.push(k);
      else c.rx[c.rx.length-1] = k;
      paint(); return;
    }
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = +b.dataset.id, idx = COMMENTS.findIndex(c => c.id === id);
    if (idx < 0) return;
    const act = b.dataset.act;
    if (act === 'del'){ COMMENTS.splice(idx,1); paint(); }
    if (act === 'reroll'){
      const used = { faces:new Set(), names:new Set(), first:new Set(), last:new Set(), texts:new Set() };
      COMMENTS.forEach((c,i) => { if (i !== idx) reserve(used, c); });
      const nc = makeComment(used); nc.isReply = COMMENTS[idx].isReply;
      COMMENTS[idx] = nc; paint();
    }
    if (act === 'text'){ COMMENTS[idx].text = pick(activePool()); paint(); }
    if (act === 'face'){
      const g = F('fGender').value, h = F('fHeritage').value, a = F('fAge').value;
      const used = new Set(COMMENTS.filter((_,i)=>i!==idx).map(c => c.faceId));
      const pool = matchFaces(g,h,a);
      const free = pool.filter(f => !used.has(f.id));
      const f2 = pick(free.length ? free : pool);
      COMMENTS[idx].avatar = f2.src; COMMENTS[idx].faceId = f2.id;
      renderAll();
    }
    if (act === 'dl') download(await canvasBlob(F('cv-' + id), 'image/png'), `${slug(COMMENTS[idx].name)}.png`);
  });

  F('stack').addEventListener('input', e => {
    const t = e.target, c = COMMENTS.find(x => x.id === +t.dataset.id);
    if (!c) return;
    if (t.classList.contains('f-name'))   c.name = t.value;
    if (t.classList.contains('f-text'))   c.text = t.value;
    if (t.classList.contains('f-time'))   c.time = t.value;
    if (t.classList.contains('f-reacts')) c.reacts = Math.max(0, +t.value || 0);
    if (t.classList.contains('f-reply'))  c.isReply = t.checked;
    renderAll();
  });

  F('stack').addEventListener('change', e => {
    const t = e.target;
    if (!t.classList.contains('f-av')) return;
    const c = COMMENTS.find(x => x.id === +t.dataset.id);
    const file = t.files && t.files[0]; if (!c || !file) return;
    const fr = new FileReader();
    fr.onload = () => { c.avatar = fr.result; c.faceId = 'upload-' + c.id; renderAll(); };
    fr.readAsDataURL(file);
  });

  function cov(){
    const g = F('fGender').value, h = F('fHeritage').value, a = F('fAge').value;
    const exact = FACES.filter(f => (g==="any"||f.gender===g) && (h==="any"||f.heritage===h) && (a==="any"||f.age===a));
    const el = F('coverage');
    if (exact.length){ el.textContent = `${exact.length} matching face${exact.length>1?'s':''} — unique up to ${exact.length} comments`; el.className='cov ok'; }
    else { el.textContent = 'No exact face match — will fall back to the nearest age band'; el.className='cov warn'; }
  };
  ['fGender','fHeritage','fAge'].forEach(id => F(id).addEventListener('change', cov));
  cov();
}

loadReactionImages().then(() => {
  wire();
  F('poolTotal').textContent = FACES.length;
  addComments(3, true);
});
