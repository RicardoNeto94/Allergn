
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
  Object.keys(LEGEND).forEach(code => {
    const chip = document.createElement('button');
    chip.className = 'chip'; chip.dataset.code = code; chip.innerHTML = `<b>${code}</b> ${codeToLabel(code)}`;
    chip.onclick = () => { chip.classList.toggle('active'); onChange(); };
    container.appendChild(chip);
  });
}
function getActiveFilters() { return [...document.querySelectorAll('.chip.active')].map(c => c.dataset.code); }
function filterDishes(dishes, selected, query) {
  query = query.trim().toLowerCase();
  return dishes.filter(item => {
    const allergens = item.allergens || [];
    const safe = selected.every(code => !allergens.includes(code));
    const matches = !query || (item.name && item.name.toLowerCase().includes(query));
    return safe && matches;
  });
}
function renderGrid(el, dishes, selected) {
  el.innerHTML = '';
  dishes.forEach(item => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3>${item.name}</h3>` + (item.description ? `<p>${item.description}</p>` : '');
    const badges = document.createElement('div'); badges.className = 'badges';
    (item.allergens||[]).forEach(code => { const b=document.createElement('span'); b.className='badge'; b.textContent=code; badges.appendChild(b); });
    if (selected.length) { const safe=document.createElement('span'); safe.className='badge safe'; safe.textContent='SAFE'; badges.appendChild(safe); }
    card.appendChild(badges); el.appendChild(card);
  });
}
(async function init() {
  const data = await loadMenu();
  const grid = document.getElementById('grid');
  const chips = document.getElementById('chips');
  const search = document.getElementById('search');
  const clear = document.getElementById('clearFilters');
  const rerender = () => { const sel=getActiveFilters(); const filtered=filterDishes(data,sel,search.value); renderGrid(grid,filtered,sel); document.getElementById('resultCount').textContent=`${filtered.length} dishes`; document.getElementById('activeFilter').textContent=sel.length?`Safe for: ${sel.join(', ')}`:'No filters active'; };
  buildChips(chips, rerender);
  search.oninput = rerender;
  clear.onclick = ()=>{ document.querySelectorAll('.chip.active').forEach(c=>c.classList.remove('active')); search.value=''; rerender(); };
  rerender();
})();