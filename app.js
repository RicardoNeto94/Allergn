document.addEventListener('DOMContentLoaded', setupIntro);

function setupIntro() {
  const intro = document.getElementById('intro');
  const app = document.getElementById('app');
  if (!intro) return;

  const enter = () => {
    if (!document.body.contains(intro)) return;
    intro.classList.add('fade-out');
    setTimeout(() => { try{ intro.remove(); }catch(e){} if(app) app.classList.remove('hidden'); }, 350);
  };

  // Expose global fallback for inline onclick
  window.__enter = enter;

  // Bind multiple reliable events
  intro.addEventListener('click', enter, {passive:true});
  intro.addEventListener('touchend', enter, {passive:true});
  const btn = document.getElementById('enterBtn');
  if (btn) {
    btn.addEventListener('click', enter, {passive:true});
    btn.addEventListener('touchend', enter, {passive:true});
  }
  intro.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') enter(); });
  intro.tabIndex = 0;
}


async function loadMenu(){
  try{
    const r = await fetch('menu.json', {cache:'no-store'});
    if(!r.ok) throw 0;
    return await r.json();
  }catch(e){
    const el = document.getElementById('menu-data');
    return el ? JSON.parse(el.textContent) : [];
  }
}

const LEGEND = window.LEGEND || {};

function codeToLabel(c){ return LEGEND[c] || c; }

function buildChips(container, onChange){
  if(!container) return;
  const frag = document.createDocumentFragment();
  Object.keys(LEGEND).forEach(code => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.code = code;
    b.innerHTML = `<b>${code}</b> ${codeToLabel(code)}`;
    b.addEventListener('click', () => {
      b.classList.toggle('active');
      onChange();
    });
    frag.appendChild(b);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

function getActiveFilters(){
  return [...document.querySelectorAll('.chip.active')].map(c => c.dataset.code);
}

function filterDishes(dishes, selected, query){
  const q = (query || '').trim().toLowerCase();
  return dishes.filter(item => {
    const allergens = item.allergens || [];
    const safe = selected.every(code => !allergens.includes(code));
    const matches = !q || (item.name && item.name.toLowerCase().includes(q));
    return safe && matches;
  });
}

function renderGrid(el, dishes, selected){
  if(!el) return;
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  dishes.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    const title = document.createElement('h3');
    title.textContent = item.name || '';
    card.appendChild(title);
    if(item.description){
      const d = document.createElement('p');
      d.className = 'desc';
      d.textContent = item.description;
      card.appendChild(d);
    }
    const badges = document.createElement('div');
    badges.className = 'badges';
    (item.allergens || []).forEach(code => {
      const s = document.createElement('span');
      s.className = 'badge';
      s.title = codeToLabel(code);
      s.textContent = code;
      badges.appendChild(s);
    });
    if(selected.length){
      const s = document.createElement('span');
      s.className = 'badge safe';
      s.textContent = 'SAFE';
      badges.appendChild(s);
    }
    card.appendChild(badges);
    // Touch feedback
    card.addEventListener('touchstart', ()=>card.classList.add('touch-active'), {passive:true});
    card.addEventListener('touchend', ()=>card.classList.remove('touch-active'));
    card.addEventListener('touchcancel', ()=>card.classList.remove('touch-active'));

    frag.appendChild(card);
  });
  el.appendChild(frag);
}

function updateMeta(n, selected){
  const rc = document.getElementById('resultCount');
  const af = document.getElementById('activeFilter');
  if(rc) rc.textContent = `${n} dish${n===1?'':'es'}`;
  if(af) af.textContent = selected.length ? `Safe for: ${selected.join(', ')}` : 'No filters active';
}

function centerChips(){
  const row = document.getElementById('chips');
  if(!row) return;
  const extra = row.scrollWidth - row.clientWidth;
  row.scrollLeft = extra > 4 ? Math.max(0, extra/2) : 0;
}

function setupIntro(){
  const intro = document.getElementById('intro');
  const app = document.getElementById('app');
  if(!intro) return;
  const enter = () => {
    intro.classList.add('fade-out');
    setTimeout(() => { try{ intro.remove(); }catch(e){} if(app) app.classList.remove('hidden'); }, 450);
  };
  // Click anywhere on intro
  intro.addEventListener('click', enter, {passive:true});
  // Key support
  intro.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') enter(); });
  // Focus intro to receive keys
  intro.tabIndex = 0;
}

(async function init(){
  setupIntro();
  const data = await loadMenu();
  const grid = document.getElementById('grid');
  const chips = document.getElementById('chips');
  const search = document.getElementById('search'); // may not exist
  const clear = document.getElementById('clearFilters'); // may not exist

  const rerender = () => {
    const sel = getActiveFilters();
    const q = (search && search.value) ? search.value : '';
    const filtered = filterDishes(data, sel, q);
    renderGrid(grid, filtered, sel);
    updateMeta(filtered.length, sel);
  };

  buildChips(chips, rerender);
  if (search) search.addEventListener('input', rerender);
  if (clear) clear.addEventListener('click', () => {
    document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'));
    if (search) search.value = '';
    rerender();
  });

  window.addEventListener('resize', centerChips, {passive:true});
  window.addEventListener('orientationchange', centerChips, {passive:true});

  renderGrid(grid, data, []);
  updateMeta(data.length, []);
  centerChips();
})();


/* Defensive: remove any legacy header blocks if still present (cached HTML) */
(function forceStripLegacyHeader(){
  try{
    document.querySelectorAll('.brand, .controls').forEach(n=>n.remove());
  }catch(e){}
})();
