
async function loadMenu(){
  try{ const r=await fetch('menu.json',{cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }
  catch{ return JSON.parse(document.getElementById('menu-data').textContent); }
}
function codeToLabel(c){ return LEGEND[c] || c; }
function buildChips(container,onChange){
  const frag=document.createDocumentFragment();
  Object.keys(LEGEND).forEach(code=>{
    const chip=document.createElement('button');
    chip.className='chip'; chip.dataset.code=code;
    chip.innerHTML=`<b>${code}</b> ${codeToLabel(code)}`;
    chip.addEventListener('click',()=>{ chip.classList.toggle('active'); onChange(); });
    frag.appendChild(chip);
  });
  container.appendChild(frag);
}
function getActiveFilters(){ return [...document.querySelectorAll('.chip.active')].map(c=>c.dataset.code); }
function filterDishes(dishes,selected,query){
  const q=(query||'').trim().toLowerCase();
  return dishes.filter(item=>{
    const allergens=item.allergens||[];
    const safe=selected.every(code=>!allergens.includes(code));
    const matches=!q || (item.name && item.name.toLowerCase().includes(q));
    return safe && matches;
  });
}
function renderGrid(el,dishes,selected){
  el.innerHTML='';
  const frag=document.createDocumentFragment();
  dishes.forEach(item=>{
    const card=document.createElement('article'); card.className='card';
    const title=document.createElement('h3'); title.textContent=item.name; card.appendChild(title);
    if(item.description){ const d=document.createElement('p'); d.className='desc'; d.textContent=item.description; card.appendChild(d); }
    const badges=document.createElement('div'); badges.className='badges';
    (item.allergens||[]).forEach(code=>{ const b=document.createElement('span'); b.className='badge'; b.title=codeToLabel(code); b.textContent=code; badges.appendChild(b); });
    if(selected.length){ const s=document.createElement('span'); s.className='badge safe'; s.textContent='SAFE'; badges.appendChild(s); }
    // Touch lift for mobile
    card.addEventListener('touchstart',()=>card.classList.add('touch-active'),{passive:true});
    card.addEventListener('touchend',()=>card.classList.remove('touch-active'));
    card.addEventListener('touchcancel',()=>card.classList.remove('touch-active'));
    card.appendChild(badges);
    frag.appendChild(card);
  });
  el.appendChild(frag);
}
function updateMeta(count,selected){
  document.getElementById('resultCount').textContent = `${count} dish${count===1?'':'es'}`;
  document.getElementById('activeFilter').textContent = selected.length ? `Safe for: ${selected.join(', ')}` : 'No filters active';
}
function setupIntro(){
  const intro=document.getElementById('intro');
  const app=document.getElementById('app');
  const btn=document.getElementById('enterBtn');
  const enter=()=>{ intro.classList.add('fade-out'); setTimeout(()=>{ intro.remove(); app.classList.remove('hidden'); },600); };
  btn.addEventListener('click',enter);
  btn.addEventListener('keypress',e=>{ if(e.key==='Enter') enter(); });
}
(async function init(){
  setupIntro();
  const data=await loadMenu();
  const grid=document.getElementById('grid');
  const chips=document.getElementById('chips');
  const search=document.getElementById('search');
  const clear=document.getElementById('clearFilters');
  const rerender=()=>{ const sel=getActiveFilters(); const filtered=filterDishes(data,sel,(search && search.value) ? search.value : ''); renderGrid(grid,filtered,sel); updateMeta(filtered.length,sel); };
  buildChips(chips,rerender);
  search.addEventListener('input',rerender);
  clear.addEventListener('click',()=>{ document.querySelectorAll('.chip.active').forEach(c=>c.classList.remove('active')); (search && search.value) ? search.value : ''=''; rerender(); });
  renderGrid(grid,data,[]);
  updateMeta(data.length,[]);
})();

function centerChips() {
  const row = document.getElementById('chips');
  if (!row) return;
  // If overflowing, center the content by adjusting scrollLeft
  const extra = row.scrollWidth - row.clientWidth;
  if (extra > 4) {
    row.scrollLeft = Math.max(0, (row.scrollWidth - row.clientWidth) / 2);
  } else {
    row.scrollLeft = 0;
  }
}

window.addEventListener('resize', centerChips, {passive:true});
window.addEventListener('orientationchange', centerChips, {passive:true});