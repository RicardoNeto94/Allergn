
// ===== Shang Shi Menu (clean baseline) =====
const LEGEND = {
  CE:"Celery", GL:"Gluten", CR:"Crustaceans", EG:"Eggs", FI:"Fish", MO:"Molluscs", Mi:"Milk",
  MU:"Mustard", NU:"Nuts", SE:"Sesame", SO:"Soya", GA:"Garlic", ON:"Onion", MR:"Mushrooms"
};

let data = [];
let selectedAllergens = new Set();
let selectedCategory = null;

const els = {
  grid: document.getElementById('grid'),
  chips: document.getElementById('chips'),
  cat: document.getElementById('categories'),
  result: document.getElementById('resultCount'),
  active: document.getElementById('activeFilter'),
  filterPanel: document.getElementById('filterPanel'),
  categoryPanel: document.getElementById('categoryPanel'),
  filterToggle: document.getElementById('filterToggle'),
  categoryToggle: document.getElementById('categoryToggle'),
  resetBtn: document.getElementById('resetBtn')
};

// ===== Sessions / Presets / Recents =====
const DEFAULT_PRESETS = {
  "Gluten-free": ["GL"],
  "Shellfish-free": ["CR","MO"],
  "Allium-free": ["GA","ON"]
};
const MAX_RECENTS = 3;

let tableLabel = null;
let lastComboKey = '';

const els2 = {
  presetChips: document.getElementById('presetChips'),
  recentChips: document.getElementById('recentChips'),
  savePresetBtn: document.getElementById('savePresetBtn'),
  sessionBanner: document.getElementById('sessionBanner'),
  sessionLabel: document.getElementById('sessionLabel'),
  sessionAllergens: document.getElementById('sessionAllergens'),
  shareBtn: document.getElementById('shareBtn'),
  qrBtn: document.getElementById('qrBtn'),
  qrDialog: document.getElementById('qrDialog'),
  qrCanvas: document.getElementById('qrCanvas'),
  qrUrl: document.getElementById('qrUrl'),
  qrClose: document.getElementById('qrClose'),
};

const store = {
  get presets(){ try{ return JSON.parse(localStorage.getItem('ss_presets')||'[]'); }catch{return[]}},
  set presets(v){ localStorage.setItem('ss_presets', JSON.stringify(v)); },
  get recents(){ try{ return JSON.parse(localStorage.getItem('ss_recents')||'[]'); }catch{return[]}},
  set recents(v){ localStorage.setItem('ss_recents', JSON.stringify(v)); }
};

function comboKey(codes){
  const arr = Array.from(new Set((codes||[]).map(c=>c.toUpperCase()))).sort();
  return arr.join(',');
}
function applyAllergenSet(codes){
  selectedAllergens = new Set((codes||[]).map(c=>c.toUpperCase()));
  [...(els.chips?.children||[])].forEach(btn=>{
    if (!btn.dataset) return;
    btn.classList.toggle('active', selectedAllergens.has(btn.dataset.code));
  });
  refresh();
}
function pushRecent(){
  if (!selectedAllergens.size) return;
  const key = comboKey([...selectedAllergens]);
  if (key === lastComboKey) return;
  lastComboKey = key;
  const list = (store.recents||[]).filter(x=>x!==key);
  list.unshift(key);
  store.recents = list.slice(0, MAX_RECENTS);
  renderRecentChips();
}
function renderRecentChips(){
  if(!els2.recentChips) return;
  els2.recentChips.innerHTML = '';
  (store.recents||[]).forEach(key=>{
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = key.replaceAll(',', ', ');
    chip.title = 'Apply: '+chip.textContent;
    chip.addEventListener('click', ()=> applyAllergenSet(key.split(',')), {passive:true});
    els2.recentChips.appendChild(chip);
  });
}

function renderPresetChips(){
  if(!els2.presetChips) return;
  els2.presetChips.innerHTML = '';
  const defaults = {...DEFAULT_PRESETS};
  Object.entries(defaults).forEach(([name,codes])=>{
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = name;
    chip.title = `${name}: ${codes.join(', ')}`;
    chip.addEventListener('click', ()=> applyAllergenSet(codes), {passive:true});
    els2.presetChips.appendChild(chip);
  });
  (store.presets||[]).forEach(p => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = p.name;
    chip.title = `${p.name}: ${p.codes.join(', ')}`;
    chip.dataset.user = '1';
    chip.addEventListener('click', ()=> applyAllergenSet(p.codes), {passive:true});
    chip.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      if (confirm(`Delete preset "${p.name}"?`)){
        store.presets = (store.presets||[]).filter(x=>x.name!==p.name);
        renderPresetChips();
      }
    });
    els2.presetChips.appendChild(chip);
  });
}

function saveCurrentPreset(){
  const codes = [...selectedAllergens];
  if (!codes.length){ alert('Select at least one allergen first.'); return; }
  const name = prompt('Preset name (e.g., Sofia GF / Table R3):', tableLabel||'');
  if (!name) return;
  const list = (store.presets||[]).filter(p=>p.name!==name);
  list.unshift({name, codes});
  store.presets = list;
  renderPresetChips();
}
function updateSessionBanner(){
  if(!els2.sessionBanner) return;
  const text = (tableLabel && tableLabel.trim()) ? `Table ${tableLabel.trim()}` : 'Session';
  els2.sessionLabel.textContent = text;
  els2.sessionAllergens.textContent = selectedAllergens.size ? [...selectedAllergens].join(', ') : '—';
}
function buildShareUrl(){
  const url = new URL(location.href);
  if (selectedAllergens.size) url.searchParams.set('a', [...selectedAllergens].join(',')); else url.searchParams.delete('a');
  if (selectedCategory) url.searchParams.set('c', selectedCategory); else url.searchParams.delete('c');
  if (tableLabel) url.searchParams.set('t', tableLabel); else url.searchParams.delete('t');
  return url.toString();
}
async function shareCurrent(){
  const url = buildShareUrl();
  try{
    if (navigator.share){ await navigator.share({title:'Shang Shi SAFE list', url}); }
    else { await navigator.clipboard.writeText(url); alert('Link copied to clipboard.'); }
  }catch(e){/*noop*/}
}
function showQR(){
  const url = buildShareUrl();
  if (els2.qrUrl) els2.qrUrl.textContent = url;
  if (window.QRCode && els2.qrCanvas){
    window.QRCode.toCanvas(els2.qrCanvas, url, {width:220, margin:1}, ()=>{});
  }
  els2.qrDialog && els2.qrDialog.showModal && els2.qrDialog.showModal();
}
function initFromURL(){
  const p = new URLSearchParams(location.search);
  const a = (p.get('a')||'').split(',').filter(Boolean);
  const c = p.get('c');
  const t = p.get('t') || p.get('table');
  if (a.length) applyAllergenSet(a);
  if (c) selectedCategory = c;
  if (t) tableLabel = t;
  updateSessionBanner();
}


// Load
async function loadMenu(){ const r = await fetch('./menu.json', {cache:'no-store'}); return r.ok ? r.json() : []; }

// Build chips
function renderAllergenChips(){
  els.chips.innerHTML = '';
  const codes = Array.from(Object.keys(LEGEND)).filter(c => data.some(d => (d.allergens||[]).includes(c)));
  codes.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.code = code;
    btn.innerHTML = `<b>${code}</b> ${LEGEND[code] || code}`; // Dock shows code + full name
    btn.addEventListener('click', () => {
      if (selectedAllergens.has(code)){ selectedAllergens.delete(code); btn.classList.remove('active'); }
      else { selectedAllergens.add(code); btn.classList.add('active'); }
      refresh();
    }, {passive:true});
    els.chips.appendChild(btn);
  });
}

function renderCategoryChips(){
  els.cat.innerHTML = '';
  const categories = Array.from(new Set(data.map(d => d.category))).filter(Boolean);
  categories.forEach(cat => {
    const key = cat.toLowerCase().replace(/\s+/g,'');
    const btn = document.createElement('button');
    btn.className = `chip category chip-${key}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      if (selectedCategory === cat){ selectedCategory = null; btn.classList.remove('active'); }
      else { selectedCategory = cat; [...els.cat.children].forEach(c=>c.classList.remove('active')); btn.classList.add('active'); }
      refresh();
    }, {passive:true});
    els.cat.appendChild(btn);
  });
}

// Cards
function card(item){
  const a = document.createElement('article');
  a.className = 'card';
  a.setAttribute('data-category', item.category||'');
  a.setAttribute('data-allergens', JSON.stringify(item.allergens||[]));

  const labels = document.createElement('div');
  labels.className = 'labels';

  const key = (item.category||'').toLowerCase().replace(/\s+/g,'');
  const cPill = document.createElement('span');
  cPill.className = `pill pill-${key || 'mains'}`;
  cPill.textContent = item.category || 'Dish';
  labels.appendChild(cPill);

  // SAFE only if allergens selected and dish safe
  if (selectedAllergens.size){
    const al = item.allergens || [];
    const ok = [...selectedAllergens].every(x => !al.includes(x));
    if (ok){
      const s = document.createElement('span');
      s.className = 'safe-pill';
      s.textContent = 'SAFE';
      labels.appendChild(s);
    }
  }

  const h = document.createElement('h3'); h.textContent = item.name;

  const p = document.createElement('p'); p.className = 'desc'; p.textContent = item.description || '';

  const badges = document.createElement('div'); badges.className = 'badges';
  (item.allergens || []).forEach(code => {
    const b = document.createElement('span'); b.className = 'badge';
    b.textContent = code;             // cards show code only
    b.title = LEGEND[code] || code;   // tooltip
    badges.appendChild(b);
  });

  a.append(labels, h, p, badges);
  return a;
}

// Filtering
function isSafe(item){
  const A = item.allergens || [];
  return !selectedAllergens.size || [...selectedAllergens].every(x => !A.includes(x));
}
function inCategory(item){ return !selectedCategory || item.category === selectedCategory; }

function renderGrid(){
  els.grid.innerHTML = '';
  const items = data.filter(d => isSafe(d) && inCategory(d));
  items.forEach(d => els.grid.appendChild(card(d)));
  els.result.textContent = `${items.length} dishes`;
}

function updateMeta(){
  const parts = [];
  if (selectedAllergens.size) parts.push(`SAFE from: ${[...selectedAllergens].join(', ')}`);
  if (selectedCategory) parts.push(selectedCategory);
  els.active && (els.active.textContent = parts.length ? parts.join(' • ') : 'No filters active');
  // dock highlight
  if (els.filterToggle) els.filterToggle.dataset.active = selectedAllergens.size ? 'true' : 'false';
  if (els.categoryToggle) els.categoryToggle.dataset.active = selectedCategory ? 'true' : 'false';
}

function toggle(panelBtn, panelEl){
  const open = panelEl.classList.toggle('open');
  panelBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  // Close the other
  if (panelEl === els.filterPanel && els.categoryPanel){ els.categoryPanel.classList.remove('open'); els.categoryToggle && els.categoryToggle.setAttribute('aria-expanded','false'); }
  if (panelEl === els.categoryPanel && els.filterPanel){ els.filterPanel.classList.remove('open'); els.filterToggle && els.filterToggle.setAttribute('aria-expanded','false'); }
}

function clearAll(){
  selectedAllergens.clear();
  selectedCategory = null;
  // clear chip actives
  [...(els.chips?.children || [])].forEach(c => c.classList.remove('active'));
  [...(els.cat?.children || [])].forEach(c => c.classList.remove('active'));
  // spin icon briefly
  if (els.resetBtn){
    els.resetBtn.classList.add('spin');
    setTimeout(()=> els.resetBtn.classList.remove('spin'), 420);
  }
  refresh();
  // close panels
  els.filterPanel && els.filterPanel.classList.remove('open');
  els.categoryPanel && els.categoryPanel.classList.remove('open');
  els.filterToggle && els.filterToggle.setAttribute('aria-expanded','false');
  els.categoryToggle && els.categoryToggle.setAttribute('aria-expanded','false');
}

function refresh(){ renderGrid(); updateMeta(); updateSessionBanner(); pushRecent(); }

// Theme toggle kept minimal
(function theme(){
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  if (localStorage.getItem('theme') === 'light'){ document.body.classList.add('light'); btn.textContent = '☀️'; }
  btn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    const L = document.body.classList.contains('light');
    localStorage.setItem('theme', L ? 'light' : 'dark');
    btn.textContent = L ? '☀️' : '🌙';
  }, {passive:true});
})();

// Init
(async function(){
  data = await loadMenu();
  renderAllergenChips();
  renderCategoryChips();
  refresh();

  if (els.filterToggle && els.filterPanel) els.filterToggle.addEventListener('click', () => toggle(els.filterToggle, els.filterPanel), {passive:true});
  if (els.categoryToggle && els.categoryPanel) els.categoryToggle.addEventListener('click', () => toggle(els.categoryToggle, els.categoryPanel), {passive:true});
  if (els.resetBtn) els.resetBtn.addEventListener('click', clearAll, {passive:true});

  initFromURL();
  renderPresetChips();
  renderRecentChips();
  if (els2.savePresetBtn) els2.savePresetBtn.addEventListener('click', saveCurrentPreset, {passive:true});
  if (els2.sessionLabel) els2.sessionLabel.addEventListener('click', () => {
    const v = prompt('Table / Guest name:', tableLabel || '');
    if (v !== null){ tableLabel = v.trim(); updateSessionBanner(); }
  }, {passive:true});
  if (els2.shareBtn) els2.shareBtn.addEventListener('click', shareCurrent, {passive:true});
  if (els2.qrBtn) els2.qrBtn.addEventListener('click', showQR, {passive:true});
  if (els2.qrClose) els2.qrClose.addEventListener('click', ()=> els2.qrDialog && els2.qrDialog.close && els2.qrDialog.close(), {passive:true});

})();