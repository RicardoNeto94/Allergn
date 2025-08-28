// Floor map (local-first; optional realtime with Firestore)
import { LEGEND } from './shared.js?v=1';

const HIGH_RISK = new Set(['NU','PE','SE']);
const floorEl = document.getElementById('floor');
const dlg = document.getElementById('editDialog');
const waiterSelect = document.getElementById('waiterSelect');
const dlgAllergens = document.getElementById('dlgAllergens');
const notesEl = document.getElementById('notes');
const layoutToggle = document.getElementById('layoutToggle');
const clearStateBtn = document.getElementById('clearState');
const liveStatus = document.getElementById('liveStatus');

// Default waiters (editable)
const WAITERS = (JSON.parse(localStorage.getItem('ss_waiters')||'null')) || [
  "Alina","Angela","Ryu","Eerika","Michael","Ricardo","Vladimir"
];

// Default floor layout (editable). x,y are percentages.
const DEFAULT_LAYOUT = [
  {id:"R1", x:10, y:20, seats:4}, {id:"R2", x:26, y:20, seats:4}, {id:"R3", x:42, y:20, seats:4},
  {id:"R4", x:58, y:20, seats:4}, {id:"R5", x:74, y:20, seats:4},
  {id:"R6", x:12, y:50, seats:4}, {id:"R7", x:28, y:50, seats:4}, {id:"R8", x:44, y:50, seats:4},
  {id:"R9", x:60, y:50, seats:4}, {id:"R10", x:76, y:50, seats:4}
];

const STATE_KEY = 'ss_floor_state_v1';
const LAYOUT_KEY = 'ss_floor_layout_v1';

let layout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null') || DEFAULT_LAYOUT;
let state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); // per-table: { waiter, allergies:[], notes, ts }

let editMode = false;
let drag = null; // {id, dx, dy}

function saveLocal(){
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function renderWaiterSelect(){
  waiterSelect.innerHTML = '<option value="">—</option>' + WAITERS.map(w => `<option value="${w}">${w}</option>`).join('');
}

function allergenChip(code, active){
  const b = document.createElement('button');
  b.className = 'chip' + (active ? ' active' : '');
  b.textContent = code;
  b.title = LEGEND[code] || code;
  b.dataset.code = code;
  b.addEventListener('click', () => { b.classList.toggle('active'); }, {passive:true});
  return b;
}

function buildDialog(tableId){
  renderWaiterSelect();
  dlgAllergens.innerHTML = '';
  const st = state[tableId] || { allergies:[] };
  waiterSelect.value = st.waiter || '';
  (Object.keys(LEGEND)).forEach(code => {
    const btn = allergenChip(code, (st.allergies||[]).includes(code));
    dlgAllergens.appendChild(btn);
  });
  notesEl.value = st.notes || '';
  document.getElementById('dlgTitle').textContent = `Table ${tableId}`;
}

function openDialog(tableId){
  dlg.dataset.table = tableId;
  buildDialog(tableId);
  dlg.showModal();
}

function saveDialog(){
  const tbl = dlg.dataset.table;
  const selected = [...dlgAllergens.querySelectorAll('.chip.active')].map(x=>x.dataset.code);
  state[tbl] = {
    waiter: waiterSelect.value || null,
    allergies: selected,
    notes: notesEl.value || '',
    ts: Date.now()
  };
  saveLocal();
  paint();
  sync('tables/'+tbl, state[tbl]); // realtime (optional)
  dlg.close();
}

function clearDialog(){
  const tbl = dlg.dataset.table;
  delete state[tbl];
  saveLocal();
  paint();
  sync('tables/'+tbl, null);
  dlg.close();
}

// Render floor
function tableCard(t){
  const st = state[t.id] || {};
  const el = document.createElement('div');
  el.className = 'table';
  const risk= (st.allergies||[]);
  el.classList.toggle('has-allergy', risk.length>0);
  el.classList.toggle('has-highrisk', risk.some(c=>HIGH_RISK.has(c)));
  el.style.left = t.x + '%';
  el.style.top = t.y + '%';
  el.dataset.id = t.id;

  const risk = (st.allergies||[]);
  el.classList.toggle('has-allergy', risk.length>0);

  el.innerHTML = `
    <div class="table-id">${t.id}</div>
    <div class="table-meta">
      ${(st.waiter? `<span class="pill">${st.waiter}</span>`:'')}
      ${risk.map(c=>`<span class="pill a">${c}</span>`).join('')}
    </div>
    ${st.notes? `<div class="table-notes">${st.notes}</div>`:''}
  `;

  el.addEventListener('dblclick', ()=> openDialog(t.id), {passive:true});
  el.addEventListener('pointerdown', (e)=>{
    if(!editMode) return;
    el.setPointerCapture(e.pointerId);
    const rect = floorEl.getBoundingClientRect();
    const baseX = (t.x/100)*rect.width, baseY = (t.y/100)*rect.height;
    drag = { id: t.id, startX: e.clientX, startY: e.clientY, baseX, baseY, rect };
  });

  el.addEventListener('pointermove', (e)=>{
    if(!drag || drag.id !== t.id) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const nx = Math.min(Math.max(0, drag.baseX + dx), drag.rect.width);
    const ny = Math.min(Math.max(0, drag.baseY + dy), drag.rect.height);
    t.x = +(nx / drag.rect.width * 100).toFixed(2);
    t.y = +(ny / drag.rect.height * 100).toFixed(2);
    el.style.left = t.x + '%';
    el.style.top = t.y + '%';
  });

  el.addEventListener('pointerup', ()=>{
    if (drag && drag.id === t.id){
      drag = null;
      saveLocal();
      sync('layout', layout); // optional realtime
    }
  });

  return el;
}

function paint(){
  floorEl.innerHTML = '';
  layout.forEach(t => floorEl.appendChild(tableCard(t)));
}

document.getElementById('dlgSave').addEventListener('click', saveDialog);
document.getElementById('dlgCancel').addEventListener('click', ()=> dlg.close());
document.getElementById('dlgClear').addEventListener('click', clearDialog);

layoutToggle.addEventListener('click', ()=>{
  editMode = !editMode;
  layoutToggle.classList.toggle('active', editMode);
  layoutToggle.textContent = editMode ? 'Done layout' : 'Edit layout';
});

clearStateBtn.addEventListener('click', ()=>{
  if(confirm('Clear all table assignments?')){
    state = {};
    saveLocal();
    paint();
    sync('state', state);
  }
});

// Click on empty area to create a new table (in layout edit)
floorEl.addEventListener('dblclick', (e)=>{
  if(!editMode) return;
  const rect = floorEl.getBoundingClientRect();
  const x = +( (e.clientX - rect.left) / rect.width * 100 ).toFixed(2);
  const y = +( (e.clientY - rect.top) / rect.height * 100 ).toFixed(2);
  const next = 'T' + (layout.length+1);
  layout.push({id: next, x, y, seats:4});
  saveLocal();
  paint();
  sync('layout', layout);
});

// Real-time (optional): Firestore
let db = null;
async function initRealtime(){
  try{
    if(!window.FB_CONFIG) return;
    const app = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const fs = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const fbApp = app.initializeApp(window.FB_CONFIG);
    db = fs.getFirestore(fbApp);
    try{ const auth = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'); await auth.signInAnonymously(auth.getAuth(fbApp)); }catch(_){}
    const docRef = fs.doc(db, 'shangshi-floor', 'state');
    // Merge local into cloud on first load
    const snap = await fs.getDoc(docRef);
    if (snap.exists()){
      const cloud = snap.data();
      if (cloud.layout) layout = cloud.layout;
      if (cloud.state) state = cloud.state;
      saveLocal();
      paint();
    }else{
      await fs.setDoc(docRef, {layout, state});
    }
    fs.onSnapshot(docRef, (s)=>{
      const d = s.data()||{};
      layout = d.layout || layout;
      state = d.state || state;
      saveLocal();
      paint();
      liveStatus.textContent = 'Live: synced';
    });
    liveStatus.textContent = 'Live: connected';
  }catch(err){
    console.warn('Realtime disabled', err);
    liveStatus.textContent = 'Live: offline';
  }
}

async function sync(key, val){
  if (!db) return;
  try{
    const fs = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const docRef = fs.doc(db, 'shangshi-floor', 'state');
    const patch = {};
    if (key === 'layout'){ patch.layout = layout; }
    else if (key === 'state'){ patch.state = state; }
    else if (key.startsWith('tables/')){
      const id = key.split('/')[1];
      patch.state = {...state};
    }
    await fs.updateDoc(docRef, patch);
    liveStatus.textContent = 'Live: updated';
  }catch(e){ console.warn('sync failed', e); liveStatus.textContent = 'Live: error'; }
}

// Init
(function init(){
  renderWaiterSelect();
  paint();
  initRealtime();
})();