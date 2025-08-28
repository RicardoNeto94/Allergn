
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
const elsX = {
  shareBtn: document.getElementById('shareBtn'),
  qrBtn: document.getElementById('qrBtn'),
  qrDialog: document.getElementById('qrDialog'),
  qrCanvas: document.getElementById('qrCanvas'),
  qrUrl: document.getElementById('qrUrl'),
  qrClose: document.getElementById('qrClose'),
  sessionBanner: document.getElementById('sessionBanner'),
  sessionLabel: document.getElementById('sessionLabel'),
  sessionChips: document.getElementById('sessionChips'),
};

const elsX = {
  shareBtn: document.getElementById('shareBtn'),
  qrBtn: document.getElementById('qrBtn'),
  qrDialog: document.getElementById('qrDialog'),
  qrCanvas: document.getElementById('qrCanvas'),
  qrUrl: document.getElementById('qrUrl'),
  qrClose: document.getElementById('qrClose'),
};


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
    btn.dataset.cat = cat;
    btn.innerHTML = `${cat} <span class=\"count\"></span>`;
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
  // status class based on current filters
  let status = 'neutral';
  if (selectedAllergens.size){
    const al = item.allergens || [];
    const ok = [...selectedAllergens].every(x => !al.includes(x));
    status = ok ? 's-safe' : 's-no';
  }
  a.classList.add(status);
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

function countSafeByCategory(){
  const counts = new Map();
  data.forEach(d => {
    const ok = isSafe(d);
    if (!ok) return;
    const c = d.category || 'Other';
    counts.set(c, (counts.get(c)||0) + 1);
  });
  return counts;
}
function updateCategoryCounts(){
  if (!els.cat) return;
  const counts = countSafeByCategory();
  [...els.cat.children].forEach(btn => {
    const cat = btn.dataset.cat;
    const span = btn.querySelector('.count');
    if (span){
      const n = counts.get(cat) || 0;
      span.textContent = `(${n})`;
    }
  });
}
function renderGrid(){
  els.grid.innerHTML = '';
  const items = data.filter(d => isSafe(d) && inCategory(d));
  items.forEach(d => els.grid.appendChild(card(d)));
  els.result.textContent = `${items.length} dishes`;
}


function updateSessionChips(){
  if (!elsX.sessionChips) return;
  elsX.sessionChips.innerHTML = '';
  if (!selectedAllergens.size){
    const i = document.createElement('span');
    i.className = 'chip';
    i.textContent = 'No allergens set';
    i.style.opacity = '.7';
    elsX.sessionChips.appendChild(i);
    return;
  }
  [...selectedAllergens].forEach(code => {
    const b = document.createElement('button');
    b.className = 'chip active';
    b.textContent = code;
    b.title = 'Remove ' + code;
    b.addEventListener('click', ()=>{ selectedAllergens.delete(code); refresh(); }, {passive:true});
    elsX.sessionChips.appendChild(b);
  });
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

function refresh(){ renderGrid(); updateMeta(); updateCategoryCounts(); updateSessionChips(); }


// === Share & QR ===
function buildShareUrl(){
  const url = new URL(location.href);
  if (selectedAllergens.size) url.searchParams.set('a', [...selectedAllergens].join(',')); else url.searchParams.delete('a');
  if (selectedCategory) url.searchParams.set('c', selectedCategory); else url.searchParams.delete('c');
  return url.toString();
}
async function doShare(){
  const url = buildShareUrl();
  try{
    if (navigator.share){ await navigator.share({title:'Shang Shi SAFE list', url}); }
    else { await navigator.clipboard.writeText(url); alert('Link copied to clipboard'); }
  }catch(e){}
}
function showQR(){
  const url = buildShareUrl();
  if (elsX.qrUrl) elsX.qrUrl.textContent = url;
  if (window.QRCode && elsX.qrCanvas){
    window.QRCode.toCanvas(elsX.qrCanvas, url, {width:220, margin:1}, ()=>{});
  }
  elsX.qrDialog && elsX.qrDialog.showModal && elsX.qrDialog.showModal();
}
function initFromURL(){
  const p = new URLSearchParams(location.search);
  const a = (p.get('a')||'').split(',').filter(Boolean);
  const c = p.get('c');
  if (a.length){
    selectedAllergens = new Set(a);
    // reflect on chips after they render
    requestAnimationFrame(()=>{
      [...(els.chips?.children||[])].forEach(btn=>{
        btn.classList.toggle('active', selectedAllergens.has(btn.dataset.code));
      });
      refresh();
    });
  }
  if (c) {
    selectedCategory = c;
    requestAnimationFrame(()=>{
      [...(els.cat?.children||[])].forEach(btn=>{
        if (btn.dataset.cat === c) btn.classList.add('active');
      });
      refresh();
    });
  }
}

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
  initFromURL && initFromURL();
  refresh();
  if (typeof elsX!=='undefined'){ elsX.sessionLabel && elsX.sessionLabel.addEventListener('click',()=>{ const v=prompt('Table/Guest:', localStorage.getItem('ss_table')||''); if(v!==null){ localStorage.setItem('ss_table', v.trim()); elsX.sessionLabel.textContent = v.trim()||'Session'; }});
  elsX.sessionLabel && (elsX.sessionLabel.textContent = (localStorage.getItem('ss_table')||'Session'));
  elsX.shareBtn && elsX.shareBtn.addEventListener('click', doShare, {passive:true});
  elsX.qrBtn && elsX.qrBtn.addEventListener('click', showQR, {passive:true});
  elsX.qrClose && elsX.qrClose.addEventListener('click', ()=> elsX.qrDialog && elsX.qrDialog.close && elsX.qrDialog.close()); }
initFromURL();
  if (elsX.shareBtn) elsX.shareBtn.addEventListener('click', doShare, {passive:true});
  if (elsX.qrBtn) elsX.qrBtn.addEventListener('click', showQR, {passive:true});
  if (elsX.qrClose) elsX.qrClose.addEventListener('click', ()=> elsX.qrDialog && elsX.qrDialog.close && elsX.qrDialog.close());
if (els.filterToggle && els.filterPanel) els.filterToggle.addEventListener('click', () => toggle(els.filterToggle, els.filterPanel), {passive:true});
  if (els.categoryToggle && els.categoryPanel) els.categoryToggle.addEventListener('click', () => toggle(els.categoryToggle, els.categoryPanel), {passive:true});
  if (els.resetBtn) els.resetBtn.addEventListener('click', clearAll, {passive:true});
})();
