// Pokémon Gridiron: draft a 22-player football team from the Pokédex.
// Data comes from data/pokedex.json and artwork from img/art/, both built by scripts/build_data.py.
(async function () {
  'use strict';
  const img = (n) => 'img/art/' + n + '.webp';
  let DEX;
  try {
    const res = await fetch('data/pokedex.json');
    if (!res.ok) throw new Error(res.status);
    DEX = await res.json();
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'boot-error';
    p.textContent = 'The Pokédex data didn\'t load. Check your connection and reload the page. If you opened index.html straight from your computer, serve the folder instead (for example: python3 -m http.server).';
    document.querySelector('.wrap').prepend(p);
    return;
  }

  const mon = (n) => DEX[n - 1];
  const pad = (n) => '#' + String(n).padStart(3, '0');

  const TYPE_COLORS = { normal:'#a8a77a', fire:'#ee8130', water:'#6390f0', electric:'#f7d02c', grass:'#7ac74c', ice:'#96d9d6', fighting:'#c22e28', poison:'#a33ea1', ground:'#e2bf65', flying:'#a98ff3', psychic:'#f95587', bug:'#a6b91a', rock:'#b6a136', ghost:'#735797', dark:'#705746', dragon:'#6f35fc', steel:'#b7b7ce', fairy:'#d685ad' };

  const POSITIONS = [
    { id:'QB',  pos:'QB',  full:'Quarterback',        side:'off', x:50, y:71 },
    { id:'HB',  pos:'HB',  full:'Halfback',           side:'off', x:50, y:89 },
    { id:'FB',  pos:'FB',  full:'Fullback',           side:'off', x:42, y:81 },
    { id:'WR1', pos:'WR',  full:'Wide Receiver',      side:'off', x:9,  y:58 },
    { id:'WR2', pos:'WR',  full:'Wide Receiver',      side:'off', x:91, y:58 },
    { id:'TE',  pos:'TE',  full:'Tight End',          side:'off', x:79, y:59 },
    { id:'LT',  pos:'LT',  full:'Left Tackle',        side:'off', x:26, y:57 },
    { id:'LG',  pos:'LG',  full:'Left Guard',         side:'off', x:36, y:57 },
    { id:'C',   pos:'C',   full:'Center',             side:'off', x:46, y:56 },
    { id:'RG',  pos:'RG',  full:'Right Guard',        side:'off', x:56, y:57 },
    { id:'RT',  pos:'RT',  full:'Right Tackle',       side:'off', x:66, y:57 },
    { id:'DE1', pos:'DE',  full:'Defensive End',      side:'def', x:35, y:39 },
    { id:'NT',  pos:'NT',  full:'Nose Tackle',        side:'def', x:50, y:39 },
    { id:'DE2', pos:'DE',  full:'Defensive End',      side:'def', x:65, y:39 },
    { id:'OLB1',pos:'OLB', full:'Outside Linebacker', side:'def', x:25, y:24 },
    { id:'ILB1',pos:'ILB', full:'Inside Linebacker',  side:'def', x:41, y:24 },
    { id:'ILB2',pos:'ILB', full:'Inside Linebacker',  side:'def', x:59, y:24 },
    { id:'OLB2',pos:'OLB', full:'Outside Linebacker', side:'def', x:75, y:24 },
    { id:'CB1', pos:'CB',  full:'Cornerback',         side:'def', x:10, y:28 },
    { id:'CB2', pos:'CB',  full:'Cornerback',         side:'def', x:90, y:28 },
    { id:'S1',  pos:'S',   full:'Safety',             side:'def', x:35, y:10 },
    { id:'S2',  pos:'S',   full:'Safety',             side:'def', x:65, y:10 }
  ];
  const BY_ID = Object.fromEntries(POSITIONS.map((p) => [p.id, p]));
  const ORDER = POSITIONS.map((p) => p.id);
  const KEY = 'pokemon-gridiron-v1';

  // Sample lineup from the reference screenshot, shown until the viewer saves their own.
  const SAMPLE = { QB:94, HB:112, FB:128, WR1:135, WR2:85, TE:34, LT:9, LG:76, C:3, RG:89, RT:115,
    DE1:68, NT:143, DE2:67, OLB1:57, ILB1:24, ILB2:62, OLB2:28, CB1:123, CB2:141, S1:82, S2:105 };

  const GENS = [
    { g:1, roman:'I',    region:'Kanto',  from:1,   to:151 },
    { g:2, roman:'II',   region:'Johto',  from:152, to:251 },
    { g:3, roman:'III',  region:'Hoenn',  from:252, to:386 },
    { g:4, roman:'IV',   region:'Sinnoh', from:387, to:493 },
    { g:5, roman:'V',    region:'Unova',  from:494, to:649 },
    { g:6, roman:'VI',   region:'Kalos',  from:650, to:721 },
    { g:7, roman:'VII',  region:'Alola',  from:722, to:809 },
    { g:8, roman:'VIII', region:'Galar',  from:810, to:905 },
    { g:9, roman:'IX',   region:'Paldea', from:906, to:1025 }
  ];
  const state = { roster: {}, active: 'QB', team: '', q: '', type: 'all', sample: false, gens: new Set([1]) };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) || {};
        for (const k in d.roster || {}) {
          const n = Number(d.roster[k]);
          if (BY_ID[k] && n >= 1 && n <= DEX.length) state.roster[k] = n;
        }
        state.team = typeof d.team === 'string' ? d.team.slice(0, 40) : '';
        if (Array.isArray(d.gens)) state.gens = new Set(d.gens.map(Number).filter((g) => g >= 1 && g <= GENS.length));
        state.active = nextEmpty() || 'QB';
        return;
      }
    } catch (e) {}
    state.roster = { ...SAMPLE };
    state.team = 'Kanto Haunters';
    state.sample = true;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ roster: state.roster, team: state.team, gens: [...state.gens] })); } catch (e) {}
  }

  function nextEmpty(after) {
    const start = after ? ORDER.indexOf(after) + 1 : 0;
    for (let i = 0; i < ORDER.length; i++) {
      const id = ORDER[(start + i) % ORDER.length];
      if (!state.roster[id]) return id;
    }
    return null;
  }
  function takenMap() {
    const m = {};
    for (const k in state.roster) m[state.roster[k]] = k;
    return m;
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  /* ---------- Field ---------- */
  const field = document.getElementById('field');
  const slotEls = {};
  POSITIONS.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot ' + p.side;
    b.style.left = p.x + '%';
    b.style.top = p.y + '%';
    b.addEventListener('click', () => select(p.id));
    field.appendChild(b);
    slotEls[p.id] = b;
  });

  function renderField() {
    POSITIONS.forEach((p) => {
      const b = slotEls[p.id];
      const n = state.roster[p.id];
      const m = n && mon(n);
      b.classList.toggle('active', state.active === p.id);
      b.setAttribute('aria-label', p.full + ': ' + (m ? m.name : 'open'));
      b.setAttribute('aria-pressed', state.active === p.id ? 'true' : 'false');
      const key = String(n || 0);
      if (b.dataset.n !== key) {
        b.dataset.n = key;
        b.innerHTML =
          '<div class="slot-art">' + (m ? '<img alt="" decoding="async" src="' + img(n) + '">' : '<div class="slot-empty">' + PLUS + '</div>') + '</div>' +
          '<div class="tag"><span class="tag-name">' + (m ? esc(m.name) : 'Open') + '</span><span class="tag-pos">' + p.pos + '</span></div>';
      }
    });
  }

  /* ---------- Roster lists ---------- */
  function ovr(m) { return Math.round((m.hp + m.atk + m.def + m.spd) / 4); }
  function renderLists() {
    for (const side of ['off', 'def']) {
      const html = POSITIONS.filter((p) => p.side === side).map((p) => {
        const n = state.roster[p.id];
        const m = n && mon(n);
        return '<button type="button" class="row' + (state.active === p.id ? ' active' : '') + '" data-id="' + p.id + '">' +
          '<span class="chip' + (side === 'def' ? ' def' : '') + '">' + p.pos + '</span>' +
          (m ? '<span class="row-name">' + esc(m.name) + '</span><span class="row-ovr" title="Average of HP, Attack, Defense, Speed">' + ovr(m) + ' OVR</span>'
             : '<span class="row-open">Open · ' + p.full + '</span>') +
          '</button>';
      }).join('');
      document.getElementById('list-' + side).innerHTML = html;
    }
  }
  document.querySelector('.lists').addEventListener('click', (e) => {
    const b = e.target.closest('.row');
    if (b) select(b.dataset.id);
  });

  /* ---------- Scouting card ---------- */
  function renderNow() {
    const el = document.getElementById('now');
    const p = state.active && BY_ID[state.active];
    if (!p) {
      el.innerHTML = '<div class="eyebrow">Now picking</div><div class="now-head">Tap a position on the field</div>';
      return;
    }
    const n = state.roster[p.id];
    const m = n && mon(n);
    let html = '<div class="eyebrow">Now picking</div>' +
      '<div class="now-head"><span class="chip' + (p.side === 'def' ? ' def' : '') + '">' + p.pos + '</span>' + p.full + '</div>';
    if (m) {
      const inches = m.h * 3.937;
      const size = Math.floor(inches / 12) + '′' + Math.round(inches % 12) + '″ · ' + Math.round(m.w * 0.220462) + ' lbs';
      const stat = (k, v) => '<span class="k">' + k + '</span><span class="v">' + v + '</span><div class="track"><div class="fill" style="width:' + Math.min(100, Math.round(v / 160 * 100)) + '%"></div></div>';
      html += '<div class="mon">' +
        '<div class="mon-art"><img alt="' + esc(m.name) + '" src="' + img(n) + '"></div>' +
        '<div class="mon-info"><div><span class="mon-name">' + esc(m.name) + '</span> <span class="num">' + pad(n) + '</span></div>' +
        '<div class="types">' + m.types.map((t) => '<span class="type"><span class="dot" style="background:' + TYPE_COLORS[t] + '"></span>' + t + '</span>').join('') + '</div>' +
        '<span class="muted">' + size + '</span></div>' +
        '<button class="btn" type="button" id="clear-slot">Clear</button></div>' +
        '<div class="stats">' + stat('HP', m.hp) + stat('ATK', m.atk) + stat('DEF', m.def) + stat('SPD', m.spd) + '</div>';
    } else {
      html += '<p class="muted">Pick anyone below. A Pokémon already on your roster moves to this spot.</p>';
    }
    el.innerHTML = html;
    const c = document.getElementById('clear-slot');
    if (c) c.addEventListener('click', () => { delete state.roster[state.active]; commit(); });
  }

  /* ---------- Picker ---------- */
  const cardsEl = document.getElementById('cards');
  const cardEls = new Array(DEX.length);
  function makeCard(n) {
    const m = mon(n);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.innerHTML = '<span class="chip" hidden></span><span class="card-name">' + esc(m.name) + '</span><img alt="" loading="lazy" src="' + img(n) + '"><span class="num">' + pad(n) + '</span>';
    b.addEventListener('click', () => assign(n));
    b.style.order = String(n);
    return b;
  }
  const noResults = document.createElement('p');
  noResults.className = 'muted empty-results';
  noResults.style.order = '99999999';
  cardsEl.appendChild(noResults);
  // Cards for a generation are built the first time it is checked, so unchecked generations cost nothing.
  function ensureGen(g) {
    const G = GENS[g - 1];
    const frag = document.createDocumentFragment();
    for (let n = G.from; n <= G.to; n++) if (!cardEls[n - 1]) frag.appendChild(cardEls[n - 1] = makeCard(n));
    cardsEl.insertBefore(frag, noResults);
  }
  const genOn = (n) => state.gens.has(mon(n).g);
  const genList = document.getElementById('gens');
  GENS.forEach((G) => {
    const l = document.createElement('label');
    l.className = 'gen';
    l.innerHTML = '<input type="checkbox" id="gen-' + G.g + '" value="' + G.g + '"><span><b>Gen ' + G.roman + '</b><small>' + G.region + ' · ' + (G.to - G.from + 1) + '</small></span>';
    genList.appendChild(l);
  });
  function syncGenBoxes() {
    GENS.forEach((G) => { document.getElementById('gen-' + G.g).checked = state.gens.has(G.g); });
  }
  genList.addEventListener('change', (e) => {
    const g = Number(e.target.value);
    if (e.target.checked) state.gens.add(g); else state.gens.delete(g);
    save();
    renderCards();
  });
  document.getElementById('gens-all').addEventListener('click', () => { state.gens = new Set(GENS.map((G) => G.g)); syncGenBoxes(); save(); renderCards(); });
  document.getElementById('gens-one').addEventListener('click', () => { state.gens = new Set([1]); syncGenBoxes(); save(); renderCards(); });

  const typeSel = document.getElementById('type');
  Object.keys(TYPE_COLORS).forEach((t) => {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t[0].toUpperCase() + t.slice(1);
    typeSel.appendChild(o);
  });

  /* Fuzzy search: prefix > substring > letters in order (pkchu → Pikachu) > one typo (pikachoo → Pikachu). */
  const norm = (s) => s.toLowerCase().replace(/♀/g, 'f').replace(/♂/g, 'm').normalize('NFD').replace(/[^a-z0-9]/g, '');
  const NORM = DEX.map((m) => norm(m.name));
  function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  function fuzzyScore(i, q) {
    const name = NORM[i];
    if (/^\d+$/.test(q)) return Number(q) === i + 1 ? 2000 : (String(i + 1).startsWith(q) ? 1500 - (i + 1) : -1);
    if (name.startsWith(q)) return 1000 - name.length;
    const at = name.indexOf(q);
    if (at >= 0) return 800 - at;
    let pos = -1, gaps = 0, first = -1;
    for (const ch of q) {
      const nx = name.indexOf(ch, pos + 1);
      if (nx < 0) { pos = -2; break; }
      if (first < 0) first = nx;
      if (pos >= 0) gaps += nx - pos - 1;
      pos = nx;
    }
    if (pos !== -2 && q.length >= 2) return 500 - gaps * 6 - first * 3;
    if (q.length >= 3) {
      const tol = q.length >= 6 ? 2 : 1;
      let best = Infinity;
      for (const len of [q.length - 1, q.length, q.length + 1]) best = Math.min(best, editDistance(name.slice(0, len), q));
      if (best <= tol) return 300 - best * 50;
    }
    return -1;
  }

  function renderCards() {
    const taken = takenMap();
    const q = norm(state.q);
    let shown = 0;
    state.gens.forEach(ensureGen);
    DEX.forEach((m, i) => {
      const n = i + 1;
      const b = cardEls[i];
      if (!b) return;
      const sc = q && state.gens.has(m.g) ? fuzzyScore(i, q) : 0;
      const match = state.gens.has(m.g) && (state.type === 'all' || m.types.includes(state.type)) && sc >= 0;
      b.hidden = !match;
      b.style.order = String(q && match ? (3000 - sc) * 2000 + n : n);
      if (match) shown++;
      const pid = taken[n];
      const chip = b.firstChild;
      b.classList.toggle('taken', !!pid);
      if (pid) {
        chip.hidden = false;
        chip.textContent = BY_ID[pid].pos;
        chip.className = 'chip' + (BY_ID[pid].side === 'def' ? ' def' : '');
        b.setAttribute('aria-label', m.name + ', currently at ' + BY_ID[pid].full);
      } else {
        chip.hidden = true;
        b.setAttribute('aria-label', m.name);
      }
    });
    const on = GENS.filter((G) => state.gens.has(G.g));
    const eligible = on.reduce((t, G) => t + G.to - G.from + 1, 0);
    noResults.hidden = shown > 0;
    noResults.textContent = on.length ? 'No Pokémon match. Clear the search or pick another type.' : 'Check at least one generation to see Pokémon.';
    document.getElementById('results').textContent = shown === eligible ? 'All ' + eligible.toLocaleString() + ' Pokémon' : shown.toLocaleString() + ' of ' + eligible.toLocaleString() + ' Pokémon';
    document.getElementById('eligible').textContent = on.length
      ? (on.length === GENS.length ? 'All generations' : (on.length === 1 ? 'Gen ' : 'Gens ') + on.map((G) => G.roman).join(', ')) + ' · ' + eligible.toLocaleString() + ' eligible'
      : 'No generations selected';
  }

  /* ---------- Actions ---------- */
  function render() {
    renderField();
    renderLists();
    renderNow();
    renderCards();
    document.getElementById('count').textContent = Object.keys(state.roster).length;
  }
  function commit() { state.sample = false; save(); render(); }

  function select(id) { state.active = id; render(); }

  function assign(n) {
    const target = state.active || nextEmpty();
    if (!target) { toast('Roster is full. Tap a position to swap someone out.'); return; }
    for (const k in state.roster) if (state.roster[k] === n) delete state.roster[k];
    state.roster[target] = n;
    state.active = nextEmpty(target) || target;
    commit();
  }

  document.getElementById('autofill').addEventListener('click', () => {
    const used = new Set(Object.values(state.roster));
    const pool = DEX.map((_, i) => i + 1).filter((n) => !used.has(n) && genOn(n));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const before = Object.keys(state.roster).length;
    ORDER.forEach((id) => { if (!state.roster[id] && pool.length) state.roster[id] = pool.pop(); });
    if (before === 22) toast('Every position is already filled.');
    else if (!state.gens.size) toast('Check at least one generation first.');
    commit();
  });

  let clearArmed = false, clearTimer;
  document.getElementById('clear').addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (!clearArmed) {
      clearArmed = true;
      b.textContent = 'Tap again to clear';
      clearTimer = setTimeout(() => { clearArmed = false; b.textContent = 'Clear all'; }, 2500);
      return;
    }
    clearTimeout(clearTimer);
    clearArmed = false;
    b.textContent = 'Clear all';
    state.roster = {};
    state.active = 'QB';
    commit();
    toast('Roster cleared.');
  });

  document.getElementById('copy').addEventListener('click', () => {
    const line = (p) => p.pos.padEnd(4) + (state.roster[p.id] ? mon(state.roster[p.id]).name : '(open)');
    const text = [
      (state.team || 'My team') + ' · Pokémon Gridiron', '',
      'OFFENSE', ...POSITIONS.filter((p) => p.side === 'off').map(line), '',
      'DEFENSE', ...POSITIONS.filter((p) => p.side === 'def').map(line)
    ].join('\n');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      toast(ok ? 'Lineup copied. Paste it anywhere to share.' : 'Copying is blocked in this view. Open the page in a full browser tab to copy.');
    };
    try {
      navigator.clipboard.writeText(text).then(() => toast('Lineup copied. Paste it anywhere to share.'), fallback);
    } catch (e) { fallback(); }
  });

  const teamInput = document.getElementById('team');
  teamInput.addEventListener('input', () => { state.team = teamInput.value.slice(0, 40); state.sample = false; save(); });
  document.getElementById('q').addEventListener('input', (e) => { state.q = e.target.value; renderCards(); });
  typeSel.addEventListener('change', (e) => { state.type = e.target.value; renderCards(); });

  load();
  teamInput.value = state.team;
  syncGenBoxes();
  render();
  if (state.sample) toast('This is a sample lineup. Tap any position to start drafting your own, or Clear all.');
})();
