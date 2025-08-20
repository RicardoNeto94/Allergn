
async function loadMenu() {
  try {
    const resp = await fetch('menu.json', {cache:'no-store'});
    if (!resp.ok) throw new Error('Fetch failed');
    return await resp.json();
  } catch (e) {
    const embedded = document.getElementById('menu-data').textContent;
    return JSON.parse(embedded);
  }
}
function codeToLabel(code) { return LEGEND[code] || code; }
function buildChips(container, onChange) {
  const frag = document.createDocumentFragment();
  Object.keys(LEGEND).forEach(code => {
    const chip = document.createElement('button');
    chip.className = 'chip'; chip.dataset.code = code;
    chip.innerHTML = `<span class="code"><b>${code}</b></span> <span class="label">${codeToLabel(code)}</span>`;
    chip.onclick = () => { chip.classList.toggle('active'); onChange(); };
    frag.appendChild(chip);
  });
  container.appendChild(frag);
}
function getActiveFilters() { return [...document.querySelectorAll('.chip.active')].map(c => c.dataset.code); }
function filterDishes(dishes, selected, query) {
  const q = (query || '').trim().toLowerCase();
  return dishes.filter(item => {
    const allergens = item.allergens || [];
    const safe = selected.every(code => !allergens.includes(code));
    const matches = !q || (item.name && item.name.toLowerCase().includes(q));
    return safe && matches;
  });
}
function renderGrid(el, dishes, selected) {
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  dishes.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    const title = document.createElement('h3');
    title.textContent = item.name;
    const badges = document.createElement('div');
    badges.className = 'badges';
    (item.allergens || []).forEach(code => {
      const b = document.createElement('span');
      b.className = 'badge';
      b.title = codeToLabel(code);
      b.textContent = code;
      badges.appendChild(b);
    });
    if (selected.length) {
      const sb = document.createElement('span');
      sb.className = 'badge safe';
      sb.textContent = 'SAFE';
      sb.title = 'This dish does not contain your selected allergen(s)';
      badges.appendChild(sb);
    }
    card.appendChild(title);
    if (item.description) {
      const desc = document.createElement('p');
      desc.textContent = item.description;
      desc.className = 'desc';
      card.appendChild(desc);
    }
    card.appendChild(badges);
    frag.appendChild(card);
  });
  el.appendChild(frag);
}
function updateMeta(count, selected) {
  document.getElementById('resultCount').textContent = `${count} dish${count === 1 ? '' : 'es'}`;
  const active = document.getElementById('activeFilter');
  active.textContent = selected.length ? `Safe for: ${selected.join(', ')}` : 'No filters active';
}
// Intro logic
function setupIntro() {
  const intro = document.getElementById('intro');
  const app = document.getElementById('app');
  const btn = document.getElementById('enterBtn');
  const enter = () => {
    if (!intro) return;
    intro.classList.add('fade-out');
    setTimeout(() => {
      intro.remove();
      app.classList.remove('hidden');
      // subtle focus on search for fast workflow
      const input = document.getElementById('search'); if (input) input.focus({preventScroll:true});
    }, 600);
  };
  btn.addEventListener('click', enter);
  // also allow Enter key
  btn.addEventListener('keypress', (e)=>{ if (e.key === 'Enter') enter(); });
}
(async function init() {
  setupIntro();
  const data = await loadMenu();
  const grid = document.getElementById('grid');
  const chips = document.getElementById('chips');
  const search = document.getElementById('search');
  const clear = document.getElementById('clearFilters');
  const rerender = () => {
    const selected = getActiveFilters();
    const filtered = filterDishes(data, selected, search.value || '');
    renderGrid(grid, filtered, selected);
    updateMeta(filtered.length, selected);
  };
  buildChips(chips, rerender);
  search.addEventListener('input', rerender);
  clear.addEventListener('click', () => {
    document.querySelectorAll('.chip.active').forEach(chip => chip.classList.remove('active'));
    search.value = '';
    rerender();
  });
  // Initial
  renderGrid(grid, data, []);
  updateMeta(data.length, []);
})();