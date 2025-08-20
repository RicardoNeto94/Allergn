
async function loadMenu() {
  try {const r=await fetch('menu.json'); if(!r.ok) throw 0; return await r.json();}
  catch(e){return JSON.parse(document.getElementById('menu-data').textContent);}
}
function codeToLabel(c){return LEGEND[c]||c;}
function buildChips(cont,onChange){Object.keys(LEGEND).forEach(code=>{
  const b=document.createElement('button');b.className='chip';b.dataset.code=code;b.textContent=code+' '+codeToLabel(code);
  b.onclick=()=>{b.classList.toggle('active');onChange();};cont.appendChild(b);
});}
function getActiveFilters(){return[...document.querySelectorAll('.chip.active')].map(c=>c.dataset.code);}
function filterDishes(data,sel,q){q=(q||'').toLowerCase();return data.filter(it=>sel.every(c=>!(it.allergens||[]).includes(c)) && (!q||it.name.toLowerCase().includes(q)));}
function renderGrid(el,data,sel){el.innerHTML='';data.forEach(it=>{const c=document.createElement('div');c.className='card';c.innerHTML='<h3>'+it.name+'</h3>'+(it.description?'<p class=desc>'+it.description+'</p>':'');const bd=document.createElement('div');bd.className='badges';(it.allergens||[]).forEach(a=>{const s=document.createElement('span');s.className='badge';s.textContent=a;bd.appendChild(s);});if(sel.length){const s=document.createElement('span');s.className='badge safe';s.textContent='SAFE';bd.appendChild(s);}c.appendChild(bd);el.appendChild(c);});}
function updateMeta(n,sel){document.getElementById('resultCount').textContent=n+' dishes';document.getElementById('activeFilter').textContent=sel.length?'Safe for: '+sel.join(', '):'No filters active';}
function setupIntro(){const intro=document.getElementById('intro');const app=document.getElementById('app');document.getElementById('enterBtn').onclick=()=>{intro.classList.add('fade-out');setTimeout(()=>{intro.remove();app.classList.remove('hidden');},600);};}
(async()=>{setupIntro();const data=await loadMenu();const grid=document.getElementById('grid');const chips=document.getElementById('chips');const search=document.getElementById('search');const clear=document.getElementById('clearFilters');const rer=()=>{const sel=getActiveFilters();const f=filterDishes(data,sel,search.value);renderGrid(grid,f,sel);updateMeta(f.length,sel);};buildChips(chips,rer);search.oninput=rer;clear.onclick=()=>{document.querySelectorAll('.chip.active').forEach(c=>c.classList.remove('active'));search.value='';rer();};rer();})();