/* WorkStay chat. With WS_CONFIG.chatUrl set it talks to the Apps Script (Gemini, key kept server-side).
   Without it, or if the server fails, it takes the visitor's details step by step and lets them email them. */
(() => {
  const CFG = window.WS_CONFIG || {};
  const BASE = document.documentElement.dataset.base || '';
  const STORE = 'ws-chat-1';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^\w-]/g, '');
  const load = () => { try { return JSON.parse(sessionStorage.getItem(STORE)); } catch { return null; } };
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(S)); } catch { } };
  let S = load() || { sid: uid(), msgs: [], sector: '', step: 0, lead: {}, saved: false, teased: false, offline: false };
  let busy = false;

  const GREET = {
    'Mobile cranes and heavy lift': 'Crane and heavy-lift crews often need rooms at short notice, with parking for the vans. How many people, and where is the lift?',
    'Solar farms': 'Solar crews are often on a rural site for months, so a proper kitchen and laundry matter. How many people, and where is the site?',
    'Wind farms': 'Wind farm crews usually stay a good while. How many people, and where is the site?',
    'Grid, cabling and substations': 'Grid and cable work moves along the route, so being near the motorway helps. How many people, and where is the work?',
  };
  const greetFor = sec => sec ? (GREET[sec] || `We house ${sec.toLowerCase()} teams. How many people need rooms, and where is the job?`)
    : "Hi, I can help you find rooms for your team. How many people need accommodation, and where's the job?";
  const START_CHIPS = ['Crew of 5 to 10', '20 or more people', 'How much is it?', 'Where are you?'];

  /* ---------- DOM ---------- */
  const root = document.createElement('div');
  root.className = 'wc-root';
  root.innerHTML = `
    <div class="wc-tease" hidden><button type="button" class="wc-tx" aria-label="Dismiss"><svg class="ico"><use href="#i-x"/></svg></button>
      <b>Need rooms for a crew?</b><span>Ask here and we'll come back with a price.</span></div>
    <button type="button" class="wc-launch" aria-label="Chat about rooms" aria-expanded="false"><svg class="ico"><use href="#i-chat"/></svg><span>Ask about rooms</span></button>
    <section class="wc" role="dialog" aria-label="Chat with WorkStay" aria-modal="false" hidden>
      <header class="wc-h"><img src="${BASE}brand/ws-icon.svg" alt="" width="36" height="36">
        <div><b>WorkStay</b><span>Rooms for crews on the M1</span></div>
        <button type="button" class="wc-x" aria-label="Close chat"><svg class="ico"><use href="#i-x"/></svg></button></header>
      <div class="wc-log" role="log" aria-live="polite"></div>
      <div class="wc-chips"></div>
      <form class="wc-f"><textarea rows="1" maxlength="1200" placeholder="Type your message" aria-label="Your message"></textarea>
        <button type="submit" aria-label="Send"><svg class="ico"><use href="#i-send"/></svg></button></form>
      <p class="wc-note">We only use your details to reply.<span class="wc-ai"> Replies are written by AI, so the team will confirm details.</span></p>
    </section>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const panel = $('.wc'), log = $('.wc-log'), chips = $('.wc-chips'), ta = $('textarea'), launch = $('.wc-launch'), tease = $('.wc-tease');
  if (!CFG.chatUrl) root.classList.add('no-ai');

  /* ---------- rendering ---------- */
  function bubble(m) {
    const d = document.createElement('div');
    d.className = 'wc-m ' + (m.role === 'user' ? 'me' : m.role === 'note' ? 'note' : 'bot');
    d.innerHTML = esc(m.text).replace(/\n/g, '<br>');
    if (m.mail) {
      const a = document.createElement('a');
      a.className = 'wc-send'; a.href = m.mail;
      a.innerHTML = 'Send my details <svg class="ico"><use href="#i-arrow"/></svg>';
      d.appendChild(a);
    }
    log.appendChild(d);
  }
  function render() {
    log.innerHTML = ''; S.msgs.forEach(bubble);
    setChips(S.chips || []);
    log.scrollTop = log.scrollHeight;
  }
  function setChips(list) {
    S.chips = list;
    chips.innerHTML = list.map(c => `<button type="button">${esc(c)}</button>`).join('');
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  }
  function typing(on) {
    let t = $('.wc-typing');
    if (on && !t) { t = document.createElement('div'); t.className = 'wc-m bot wc-typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight; }
    if (!on && t) t.remove();
  }
  function push(m) { S.msgs.push(m); bubble(m); log.scrollTop = log.scrollHeight; save(); }

  /* ---------- open / close ---------- */
  function open(opts = {}) {
    tease.hidden = true; S.teased = true;
    panel.hidden = false; root.classList.add('open'); launch.setAttribute('aria-expanded', 'true');
    if (opts.sector && opts.sector !== S.sector) {
      S.sector = opts.sector;
      push({ role: 'bot', text: greetFor(S.sector) }); setChips(['Under 10 people', '10 to 30 people', 'More than 30']);
    } else if (!S.msgs.length) {
      push({ role: 'bot', text: greetFor('') }); setChips(START_CHIPS);
    }
    if (opts.prefill) { ta.value = opts.prefill; grow(); }
    save();
    setTimeout(() => ta.focus({ preventScroll: true }), 60);
  }
  function close() { panel.hidden = true; root.classList.remove('open'); launch.setAttribute('aria-expanded', 'false'); launch.focus(); }
  launch.addEventListener('click', () => panel.hidden ? open() : close());
  $('.wc-x').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  $('.wc-tx').addEventListener('click', e => { e.stopPropagation(); tease.hidden = true; S.teased = true; save(); });
  tease.addEventListener('click', () => open());
  if (!S.teased && CFG.teaserAfter) setTimeout(() => { if (panel.hidden && !S.teased) tease.hidden = false; }, CFG.teaserAfter);

  /* ---------- sending ---------- */
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('form').requestSubmit(); } });
  $('form').addEventListener('submit', e => { e.preventDefault(); send(ta.value); });
  chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(b.textContent); });

  async function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    ta.value = ''; grow(); setChips([]);
    push({ role: 'user', text });
    if (CFG.chatUrl && !S.offline) return ai();
    return scripted(text);
  }

  async function ai() {
    busy = true; typing(true);
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(CFG.chatUrl, {
        method: 'POST', signal: ctl.signal,
        body: JSON.stringify({ sid: S.sid, sector: S.sector, page: location.pathname.replace(/.*\/WorkStay/, ''),
          messages: S.msgs.filter(m => m.role !== 'note').map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text })) })
      });
      const j = await r.json();
      typing(false);
      if (!j.reply) throw new Error(j.error || 'no reply');
      push({ role: 'bot', text: j.reply });
      if (j.saved && !S.saved) { S.saved = true; push({ role: 'note', text: 'Your details have been passed to the team.' }); }
      setChips(j.chips || []);
    } catch (err) {
      typing(false);
      S.offline = true; S.step = Math.max(S.step, 0);
      push({ role: 'bot', text: "Sorry, our assistant isn't answering right now, but I can still take your details and pass them on." });
      scripted(null);
    } finally { clearTimeout(to); busy = false; save(); }
  }

  /* ---------- step-by-step fallback, no AI needed ---------- */
  const PROPS = window.WS_PROPS || [];
  const has = (t, re) => re.test(t.toLowerCase());
  function quickAnswer(t) {
    if (has(t, /price|cost|rate|how much|€|euro|cheap|budget/)) return 'Prices depend on numbers, dates and the property, so the team sends a quote once they have your details.';
    if (has(t, /where|location|address|located|area/)) return 'We have ' + PROPS.map(p => `${p.name} (${p.place})`).join(', ') + ', all close to the M1.';
    if (has(t, /park|van|truck|trailer/)) return 'Newgrange Lodge and An Grianán both have large on-site car parks with room for vans.';
    if (has(t, /ensuite|en-suite|bathroom|shower/)) return 'Newgrange Lodge has 27 ensuite rooms. An Grianán has shared bathrooms and is the budget option.';
    if (has(t, /cook|kitchen|food|meal|cater/)) return 'Yes. Newgrange Lodge has two fitted kitchens and An Grianán has a full catering kitchen.';
    return '';
  }
  function suggest(loc, people) {
    const l = (loc || '').toLowerCase();
    if (/dundalk|newry|armagh|carrick|ardee|monaghan|castleblayney|omeath|carlingford|border|banbridge/.test(l) && people <= 18) return PROPS.find(p => p.id === 'lismar');
    if (people > 0 && people <= 80 && /budget|cheap/.test(l)) return PROPS.find(p => p.id === 'grianan');
    return PROPS.find(p => p.id === 'newgrange') || PROPS[0];
  }
  function mailLink() {
    const L = S.lead;
    const body = [`Name: ${L.name || '-'}`, `Contact: ${L.contact || '-'}`, `Sector: ${S.sector || '-'}`, `People and job: ${L.need || '-'}`,
      `Start and how long: ${L.when || '-'}`, `Site / location: ${L.loc || '-'}`, `Suggested property: ${L.prop || '-'}`, L.notes ? `\nNotes: ${L.notes}` : '',
      '\nSent from the WorkStay website chat.'].join('\n');
    return `mailto:${CFG.email || 'bookings@workstay.ie'}?subject=${encodeURIComponent('Rooms enquiry' + (L.name ? ': ' + L.name : ''))}&body=${encodeURIComponent(body)}`;
  }
  function scripted(text) {
    const L = S.lead; let pre = '';
    if (text && text.includes('?')) pre = quickAnswer(text) || 'Good question. The team will answer that when they send your price.';
    const say = (t, c = []) => { push({ role: 'bot', text: (pre ? pre + ' ' : '') + t }); setChips(c); pre = ''; };
    if (text === null) { /* resume after an AI failure at the right question */ }
    else if (S.step === 0) { L.need = text; S.step = 1; }
    else if (S.step === 1) { L.when = text; S.step = 2; }
    else if (S.step === 2) { L.loc = text; S.step = 3; }
    else if (S.step === 3) { L.name = text; S.step = 4; }
    else if (S.step === 4) {
      if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text) || /\d[\d\s().+-]{7,}\d/.test(text)) { L.contact = text; S.step = 5; }
      else { say("I couldn't see a phone number or email there. What's the best one to reach you on?"); save(); return; }
    } else { L.notes = (L.notes ? L.notes + ' / ' : '') + text; }
    if (pre && S.step <= 4 && text && text.includes('?') && S.step >= 1) { /* a question, not an answer: undo the step */ S.step--; }
    const people = +((L.need || '').match(/\d+/) || [0])[0];
    if (S.step === 0) say(greetFor(S.sector), START_CHIPS);
    else if (S.step === 1) say('Thanks. When do they start, and roughly how long for?', ['Next month', 'Within 3 months', 'Not sure yet']);
    else if (S.step === 2) say("Where's the job? A town or site name is fine.", ['Drogheda', 'Dundalk', 'Navan', 'Dublin']);
    else if (S.step === 3) {
      const p = suggest(L.loc, people); L.prop = p ? p.name : '';
      say(p ? `${p.name} would suit that. ${p.headline} What's your name and company?` : "What's your name and company?");
    }
    else if (S.step === 4) say('And the best phone number or email for the price?');
    else if (S.step === 5) { push({ role: 'bot', text: `Thanks${L.name ? ', ' + L.name.split(/[ ,]/)[0] : ''}. Press the button to email this to the team and they'll come back with a price.`, mail: mailLink() }); setChips([]); S.step = 6; }
    else { push({ role: 'bot', text: (pre ? pre + ' ' : '') + "I've added that. Press the button to send everything to the team.", mail: mailLink() }); setChips([]); }
    save();
  }

  if (S.msgs.length) render();
  window.WSChat = { open };
})();
