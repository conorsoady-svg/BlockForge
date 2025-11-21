/* ===== TETRIS.JS - Tetris mode (#game screen) logic ===== */

// ---------- Game state (for #game screen) ----------
let width=8,height=8,grid=[],score=0,tray=[],dragging=null,hoverCell=null,currentMode=null;
/* Ghost: 0 Off, 1 Outline, 2 Solid */
let ghostMode = 1;
/* Scoring / combo */
let comboLevel = 0, rackPieceUses = 0, rackCleared = false;
const CLEAR_MULTI = [0, 1.00, 1.80, 2.60, 3.20];
const COMBO_GROWTH = 1.25;

// ---------- Game data for Classic/Adventure modes (used in #game screen) ----------
const COLORS=['#00e5ff','#ff3bff','#39ff14','#ffd166','#b784f5','#ff9f1c'];
const MODE_SHAPES=[[[1]],[[1,1]],[[1],[1]],[[1,1,1]],[[1],[1],[1]],[[1,1],[1,1]],[[1,1,1],[0,1,0]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]];
const randColor=()=>COLORS[window.randi(COLORS.length)];

(function(){
  function key(s){ return s.map(r=>r.join('')).join(';'); } // simple key is enough if shapes have no padding
  const TIER_INDICES_MODE = { easy:[], medium:[], hard:[] };

  // If you're using your explicit lists, reuse that code here but feed MODE_SHAPES instead.
  for (let i=0;i<MODE_SHAPES.length;i++){
    // simplest: dump all into 'easy' if you like; or call your tierOfExact for MODE_SHAPES[i]
    TIER_INDICES_MODE.easy.push(i);
  }

  // 40/35/25 (or whatever you want for Mode)
  window.modePick = function(){
    // example uses only 'easy' bucket above — adjust if you classified MODE_SHAPES
    const pool = TIER_INDICES_MODE.easy;
    return MODE_SHAPES[(Math.random()*pool.length)|0];
  };
})();

function cellsInShape(shape){ let n=0; for(let r=0;r<shape.length;r++)for(let c=0;c<shape[0].length;c++) if(shape[r][c]) n++; return n; }
function cellsClearedFrom(lines){ const rows=lines.rows.length, cols=lines.cols.length; if(!rows && !cols) return 0; return rows*width + cols*height - (rows*cols); }
function scoreForClear(lines){
  const linesCleared = (lines.rows?.length||0) + (lines.cols?.length||0);
  if(!linesCleared) return 0;
  const cellsCleared = cellsClearedFrom(lines);
  const multiIndex = Math.min(linesCleared, CLEAR_MULTI.length-1);
  const simultaneousMulti = CLEAR_MULTI[multiIndex];
  const comboBoost = Math.pow(COMBO_GROWTH, comboLevel);
  const perCell = 5;
  return Math.round(cellsCleared * perCell * simultaneousMulti * comboBoost);
}
function afterPlacementUpdateRack(didClear){
  if (currentMode === 'tetris') return;
  rackPieceUses++; if(didClear) rackCleared=true;
  if (rackPieceUses >= 3){
    const old = comboLevel;
    comboLevel = rackCleared ? (comboLevel+1) : 0;
    if (comboLevel>0){
      showComboBanner(Math.pow(COMBO_GROWTH, comboLevel));
      const b=window.$('comboBanner'); if(b){ b.classList.remove('levelUp'); void b.offsetWidth; b.classList.add('levelUp'); }
    } else if (old>0){ hideComboBanner(); }
    rackPieceUses=0; rackCleared=false;
  }
}

let gameOverQueued=false, isPaused=false;
function pauseGame(){ if(isPaused) return; isPaused=true; if(currentMode==='tetris' && tDropTimer){ clearInterval(tDropTimer); tDropTimer=null; } }
function resumeGame(){ if(!isPaused) return; isPaused=false; if(currentMode==='tetris' && !tDropTimer) tScheduleDrop(); }
function updateGhostBtn(){ const txt=['Off','Outline','Solid'][ghostMode]||'Outline'; const btn=window.$('ghostToggle'); if(btn) btn.textContent='Ghost: '+txt; }
function toggleGhostMode(){ ghostMode=(ghostMode+1)%3; updateGhostBtn(); tRenderGhost(); }

// ---------- Tetris ----------
const TCOLORS={I:'#00e5ff',O:'#ffd166',T:'#b784f5',S:'#39ff14',Z:'#ff3bff',J:'#1ea7ff',L:'#ff9f1c'};
const TETROMINOES={I:[[1,1,1,1]],O:[[1,1],[1,1]],T:[[1,1,1],[0,1,0]],S:[[0,1,1],[1,1,0]],Z:[[1,1,0],[0,1,1]],J:[[1,0,0],[1,1,1]],L:[[0,0,1],[1,1,1]]};
let tActive=null,tX=0,tY=0,tRot=0,tDropTimer=null,tDropMs=900,tNext=null,tLines=0,tBag=[];
function tMatrixRotate(m){const h=m.length,w=m[0].length,r=Array.from({length:w},()=>Array(h).fill(0));for(let y=0;y<h;y++)for(let x=0;x<w;x++)r[x][h-1-y]=m[y][x];return r}
function tGetShape(name,rot){let m=TETROMINOES[name];for(let i=0;i<(rot%4+4)%4;i++)m=tMatrixRotate(m);return m}
function tShuffle(a){for(let i=a.length-1;i>0;i--){const j=window.randi(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function tRefillBag(){ tBag=tShuffle(['I','O','T','S','Z','J','L']) }
function tDrawFromBag(){ if(!tBag.length) tRefillBag(); return tBag.shift() }
/* SRS kicks */
const SRS_JLSTZ={'0>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'1>0':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'1>2':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'2>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'2>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'3>2':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'3>0':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'0>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]]}
const SRS_I={'0>1':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'1>0':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'1>2':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],'2>1':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'2>3':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'3>2':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'3>0':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'0>3':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]}
function srsKicks(name,from,to){const k=`${from}>${to}`;if(name==='I')return SRS_I[k]||[[0,0]];if(name==='O')return [[0,0]];return SRS_JLSTZ[k]||[[0,0]]}

function tNewPiece(){
  if(tNext==null) tNext=tDrawFromBag();
  tActive=tNext; tRot=0;
  tX=Math.floor((width - tGetShape(tActive,0)[0].length)/2); tY=0;
  tNext=tDrawFromBag();
  if(tCollide(tX,tY,tActive,tRot)){ gameOverWithWave(); tStop(); return;}
  renderBoard(); tRenderNext();
}
function tCollide(nx,ny,name,rot){
  const s=tGetShape(name,rot);
  for(let y=0;y<s.length;y++)for(let x=0;x<s[0].length;x++){
    if(!s[y][x]) continue;
    const gx=nx+x, gy=ny+y;
    if(gx<0||gx>=width||gy>=height) return true;
    if(gy>=0 && grid[gy][gx]) return true;
  }
  return false;
}
function tMerge(){const s=tGetShape(tActive,tRot);for(let y=0;y<s.length;y++)for(let x=0;x<s[0].length;x++)if(s[y][x]){const gy=tY+y,gx=tX+x;if(gy>=0)grid[gy][gx]=TCOLORS[tActive]}};
function tClearLines(){
  let cleared=0;
  for(let y=height-1;y>=0;){
    if(grid[y].every(v=>!!v)){grid.splice(y,1);grid.unshift(Array(width).fill(0));cleared++} else y--;
  }
  if(cleared){
    tLines+=cleared;
    const gain=[0,100,300,500,800][cleared]||cleared*200;
    score+=gain; updateScore();
    if(tLines>=10){tLines-=10; tDropMs=Math.max(120,tDropMs-80); tScheduleDrop()}
    renderBoard();
  }
}
function tTick(){ if(!tActive) return; if(!tCollide(tX,tY+1,tActive,tRot)){ tY++; } else { tMerge(); tClearLines(); tNewPiece(); } renderBoard() }
function tScheduleDrop(){ if(tDropTimer) clearInterval(tDropTimer); tDropTimer=setInterval(tTick,tDropMs) }
function tStart(){ window.$('tetrisControls').style.display='flex'; tDropMs=900; tLines=0; tBag=[]; tRefillBag(); tNext=tDrawFromBag(); tNewPiece(); tScheduleDrop(); document.addEventListener('keydown',tKeydown) }
function tStop(){ window.$('tetrisControls').style.display='none'; if(tDropTimer){clearInterval(tDropTimer); tDropTimer=null} document.removeEventListener('keydown',tKeydown); window.$('preview').innerHTML=''}

function tKeydown(e){
  const k=e.key;
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','z','Z','x','X'].includes(k)) e.preventDefault();
  if(k==='ArrowLeft') tMove(-1);
  if(k==='ArrowRight') tMove(1);
  if(k==='ArrowDown') tSoft();
  if(k===' '||k==='ArrowUp') tHard();
  if(k==='z'||k==='Z') tRotate(-1);
  if (isPaused) return;
  if(k==='x'||k==='X') tRotate(1);
  renderBoard();
}
function tKey(btn){ if(btn==='Left') tMove(-1); if(btn==='Right') tMove(1); if(btn==='Down') tSoft(); if(btn==='Drop') tHard(); if (isPaused) return; if(btn==='Rotate') tRotate(1); renderBoard() }
function tMove(dx){ if(!tCollide(tX+dx,tY,tActive,tRot)) { tX+=dx; tRenderGhost(); } }
function tSoft(){ if(!tCollide(tX,tY+1,tActive,tRot)){ tY++; score+=1; updateScore(); tRenderGhost(); } }
function tHard(){ let dy=0; while(!tCollide(tX,tY+dy+1,tActive,tRot)) dy++; tY+=dy; score+=2*dy; updateScore(); tTick() }
function tRotate(dir){
  const from=tRot,to=(tRot+dir+4)%4,kicks=srsKicks(tActive,from,to);
  for(const [dx,dy] of kicks){
    const nx=tX+dx, ny=tY+dy;
    if(!tCollide(nx,ny,tActive,to)){ tX=nx; tY=ny; tRot=to; tRenderGhost(); return; }
  }
}
function tRenderNext(){
  const el=window.$('tray'); el.innerHTML=''; if(!tNext) return;
  const s=tGetShape(tNext,0);
  const table=document.createElement('table'); table.cellSpacing=0;
  for(let r=0;r<s.length;r++){
    const tr=document.createElement('tr');
    for(let c=0;c<s[0].length;c++){
      const td=document.createElement('td');
      td.style.width=td.style.height=Math.floor(window.cellSize()*0.5)+'px';
      if(s[r][c]){ td.className='block'; td.style.backgroundColor=TCOLORS[tNext]; }
      tr.appendChild(td);
    }
    tr.style.lineHeight=0; table.appendChild(tr);
  }
  const wrap=document.createElement('div'); wrap.className='piece slot'; wrap.appendChild(table); el.appendChild(wrap);
  fitTetrisToViewport();
}

/* Ghost */
function tRenderGhost(){
  const layer=window.$('preview');
  if (currentMode!=='tetris' || !tActive || ghostMode===0){ if(layer) layer.innerHTML=''; return; }
  let gy=tY; while(!tCollide(tX,gy+1,tActive,tRot)) gy++;
  if (gy===tY){ layer.innerHTML=''; return; }
  layer.classList.remove('valid','invalid'); layer.innerHTML='';
  const s=window.cellSize(), p=window.pad(), g=window.gap();
  const shape=tGetShape(tActive,tRot), color=TCOLORS[tActive];
  for(let r=0;r<shape.length;r++)for(let c=0;c<shape[0].length;c++){
    if(!shape[r][c]) continue;
    const pb=document.createElement('div');
    pb.className='preview-block';
    pb.style.width  = s + 'px';
    pb.style.height = s + 'px';
    pb.style.left=(p+(tX+c)*(s+g))+'px';
    pb.style.top =(p+(gy+r)*(s+g))+'px';
    if(ghostMode===1){
      pb.style.backgroundColor='transparent';
      pb.style.opacity='1';
      pb.style.boxShadow='none';
      pb.style.border='2px solid '+color;
    }else{
      pb.style.backgroundColor=color;
      pb.style.opacity='.35';
    }
    layer.appendChild(pb);
  }
}

// ---------- Core helpers ----------
function clearTetrisOverrides(){
  window.$('boardWrap')?.classList.remove('tetris');
  window.$('game')?.classList.remove('tetris');
  window.$('board')?.style.removeProperty('--cell');
  document.documentElement.style.removeProperty('--cell');
}

/* Fit Tetris board only */
function fitTetrisToViewport(){
  if (currentMode !== 'tetris') return;
  const boardEl = window.$('board'); if (!boardEl) return;
  const cols = width, rows = height, padPx = window.pad(), gapPx = window.gap();
  const trayH = window.$('tray') ? window.$('tray').offsetHeight : 0;
  const ctrlsEl = window.$('tetrisControls');
  const ctrlsH  = (ctrlsEl && ctrlsEl.style.display !== 'none') ? ctrlsEl.offsetHeight : 0;
  const headerH = 56;
  const vh = window.innerHeight, vw = window.innerWidth;
  const availH = Math.max(220, vh - trayH - ctrlsH - headerH - 16);
  const availW = Math.max(260, vw - 32);
  const cellFromH = Math.floor((availH - 2*padPx - (rows-1)*gapPx) / rows);
  const cellFromW = Math.floor((availW - 2*padPx - (cols-1)*gapPx) / cols);
  const size = Math.max(12, Math.min(cellFromH, cellFromW, 40));
  boardEl.style.setProperty('--cell', String(size));
  document.documentElement.style.removeProperty('--cell');
  sizePreviewLayer();
  renderBoard();
}

/* Score animation */
function animNumberOn(id, to, ms=600){
  const el = window.$(id); if(!el) return;
  const from = parseInt(el.textContent||'0',10) || 0;
  if(from === to){ el.textContent = String(to); return; }
  const t0 = performance.now();
  const ease = t=> t<.5 ? (4*t*t*t) : (1 - Math.pow(-2*t+2,3)/2);
  function tick(ts){
    const u = Math.min(1,(ts - t0)/ms);
    el.textContent = String(Math.round(from + (to - from) * ease(u)));
    if(u < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------- UI feedback helpers ---------- */
function pulseScore(){ const el=window.$('score'); if(!el) return; el.classList.remove('score-pulse'); void el.offsetWidth; el.classList.add('score-pulse'); }
function showToast(text){ const hud=window.$('hudLayer'); if(!hud) return; const t=document.createElement('div'); t.className='toast'; t.textContent=text; hud.appendChild(t); setTimeout(()=>t.remove(), 750); }
function showComboBanner(mult){ const b=window.$('comboBanner'); if(!b) return; b.textContent=`Combo x${mult.toFixed(2)}`; if(!b.classList.contains('show')) b.classList.add('show'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
function floatPoints(text){ const hud=window.$('hudLayer'); if(!hud) return; const el=document.createElement('div'); el.className='float-score'; el.textContent=text; hud.appendChild(el); setTimeout(()=>el.remove(), 900); }
function hideComboBanner(){ const b=window.$('comboBanner'); if(b) b.classList.remove('show'); }
function uiPiecePlaced(cells){ if(cells>0){ floatPoints('+'+cells); pulseScore(); } }
function uiLinesCleared(lines, bonus){ if(lines<=0) return; const label=(lines===1?'Line':'Lines'); floatPoints(`${lines} ${label}! +${bonus}`); pulseScore(); }

function setBoardDimensions(cols,rows){ width=cols;height=rows; window.$('board').style.setProperty('--cols', String(cols)); }
function hideAll(){['home','game'].forEach(x=>window.$(x).classList.add('hidden'))}
function showHome(){ tStop(); if(typeof startDemo === 'function') startDemo(); hideAll(); window.$('home').classList.remove('hidden'); clearTetrisOverrides(); }
function toggleTheme(){ document.body.classList.toggle('light') }

/* Start modes */
function startMode(mode){
  currentMode = mode;
  tStop(); 
  if(typeof stopDemo === 'function') stopDemo();
  hideAll(); window.$('game').classList.remove('hidden');

  if (mode==='classic' || mode==='adventure'){
    clearTetrisOverrides();
    setBoardDimensions(8,8);
    resetGame();
    window.$('preview').innerHTML='';
    return;
  }
  if (mode==='tetris'){
    clearTetrisOverrides();
    setBoardDimensions(10,20);
    resetGame(); tStart(); sizePreviewLayer();
    window.$('boardWrap').classList.add('tetris');
    window.$('game').classList.add('tetris');
    fitTetrisToViewport();
    return;
  }
}

function retryGame(){ hideGameOverOverlay(); startMode(currentMode) }
function goHome(){ hideGameOverOverlay(); showHome() }
function showBackMenu(){ pauseGame(); window.$('backMenu').classList.remove('hidden'); updateGhostBtn(); }
function hideBackMenu(){ window.$('backMenu').classList.add('hidden'); resumeGame(); }
function showGameOverOverlay(){ window.$('overlay').classList.remove('hidden') }
function hideGameOverOverlay(){ window.$('overlay').classList.add('hidden') }

/* Render & gameplay */
function resetGame(){ grid=Array.from({length:height},()=>Array(width).fill(0)); score=0; updateScore(false); refillTray(); renderBoard(); renderTray(); sizePreviewLayer(); requestAnimationFrame(()=>boardWave('in')) }
function updateScore(animate=true){ if(animate) animNumberOn('score', score, 400); else window.$('score').textContent=String(score) }
function renderBoard(){
  const b=window.$('board'); b.innerHTML='';
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const d=document.createElement('div');const v=grid[y][x];
    d.className='cell '+(v?'block':''); if(v) d.style.backgroundColor=v;
    b.appendChild(d);
  }
  if(currentMode==='tetris'){
    tRenderGhost();
    if(tActive){
      const s=tGetShape(tActive,tRot);
      for(let r=0;r<s.length;r++)for(let c=0;c<s[0].length;c++){
        if(!s[r][c]) continue; const gy=tY+r,gx=tX+c;
        if(gy>=0 && gy<height && gx>=0 && gx<width){
          const idx=gy*width+gx, cell=b.children[idx];
          if(cell){ cell.classList.add('block'); cell.style.backgroundColor=TCOLORS[tActive]; cell.style.outline='2px dashed rgba(255,255,255,.22)'; cell.style.outlineOffset='-3px'; }
        }
      }
    }
  }
}

function makePiece(shape, color, scale){
  const p = document.createElement('div');
  p.className = 'bfmini-piece';
  const PALETTE = window.PALETTE || [];
  p.dataset.tint = String(PALETTE.indexOf(color));  // 0..5 based on your palette

  const w = shape[0].length, h = shape.length;
  p.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
  p._shape = shape;
  p.dataset.shape = JSON.stringify(shape);
  // color vars
  p.dataset.fill      = color.fill;
  p.dataset.stroke    = color.stroke;
  p.dataset.glow      = color.glow;
  p.dataset.glowInset = color.glowInset;
  p.style.setProperty('--fill', color.fill);
  p.style.setProperty('--stroke', color.stroke);
  p.style.setProperty('--glow', color.glow);
  p.style.setProperty('--glow-inset', color.glowInset);

  // NEW: per-piece size
  const s = (typeof scale === 'number' ? scale : 0.8); // fallback to 0.8
  p.dataset.scale = String(s);
  p.style.setProperty('--piece-scale', s);

  for (let r=0; r<h; r++){
    for (let c=0; c<w; c++){
      if (shape[r][c]) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        p.appendChild(cell);
      } else {
        const spacer = document.createElement('div');
        spacer.style.width='0'; spacer.style.height='0';
        p.appendChild(spacer);
      }
    }
  }
  (window.enableDrag || (()=>{}))(p);

  return p;
}

function renderTray(){
  if(currentMode==='tetris'){ tRenderNext(); return; }
  const el=window.$('tray'); el.innerHTML='';
  for(let i=0;i<3;i++){
    const p=tray[i]; const card=document.createElement('div'); card.className='piece slot';
    const sizeHalf=Math.floor(window.cellSize()*0.5);
    if(p&&!p.used){
      const t=document.createElement('table'); t.cellSpacing=0;
      p.shape.forEach(row=>{
        const tr=document.createElement('tr');
        row.forEach(v=>{
          const td=document.createElement('td');
          td.style.width=td.style.height=sizeHalf+'px';
          if(v){ td.className='block'; td.style.backgroundColor=p.color }
          tr.appendChild(td);
        });
        tr.style.lineHeight=0; t.appendChild(tr);
      });
      card.appendChild(t);
      card.addEventListener('pointerdown',e=>{e.preventDefault();startDrag(p,e.clientX,e.clientY)},{passive:false});
      card.addEventListener('touchstart',e=>{if(!e.touches||!e.touches[0])return;e.preventDefault();const t=e.touches[0];startDrag(p,t.clientX,t.clientY)},{passive:false});
    }else{
      card.classList.add('placeholder'); card.style.minWidth='120px'; card.style.minHeight='120px';
      const ghost=document.createElement('div'); ghost.style.width=ghost.style.height=sizeHalf+'px'; ghost.style.opacity='0'; card.appendChild(ghost);
    }
    el.appendChild(card);
  }
}

function sizePreviewLayer(){
  const board = window.$('board');
  const layer = window.$('preview');
  const wrap  = window.$('boardWrap');
  if(!board || !layer || !wrap) return;
  layer.style.width  = board.clientWidth + 'px';
  layer.style.height = board.clientHeight + 'px';
  layer.style.left = board.offsetLeft + 'px';
  layer.style.top  = board.offsetTop  + 'px';
}

/* Drag logic (non-Tetris) */
/* Drag logic (non-Tetris) */
function clearPreview(){
  // Clear the overlay ghost
  const layer = window.$('preview');
  if (layer) {
    layer.classList.remove('valid', 'invalid');
    layer.innerHTML = '';
  }

  // Also clear any "about-to-clear" glow on the board itself
  const boardEl = window.$('board');
  if (boardEl) {
    Array.from(boardEl.children).forEach(cell => {
      cell.classList.remove('about-to-clear');
    });
  }
}

function drawPreview(piece, ax, ay){
  if (currentMode === 'tetris') return;

  const layer = window.$('preview');
  clearPreview();
  if (ax == null || ay == null || !layer) return;

  const valid = canPlace(piece.shape, ax, ay);
  layer.classList.add(valid ? 'valid' : 'invalid');

  const s = window.cellSize();
  const p = window.pad();
  const g = window.gap();

  // --- Always draw the ghost blocks (same as before) ---
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[0].length; c++) {
      if (!piece.shape[r][c]) continue;
      const pb = document.createElement('div');
      pb.className = 'preview-block';
      pb.style.left = (p + (ax + c) * (s + g)) + 'px';
      pb.style.top  = (p + (ay + r) * (s + g)) + 'px';
      pb.style.backgroundColor = piece.color;
      layer.appendChild(pb);
    }
  }

  // Only bother with line prediction if the placement is legal
  if (!valid) return;

  // --- Simulate this placement on a copy of the grid ---
  const sim = grid.map(row => row.slice());
  const h = piece.shape.length;
  const w = piece.shape[0].length;

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!piece.shape[r][c]) continue;
      const yy = ay + r;
      const xx = ax + c;
      if (yy < 0 || yy >= height || xx < 0 || xx >= width) continue;
      // Just store a truthy value; we only care about "filled vs empty"
      sim[yy][xx] = sim[yy][xx] || piece.color || 1;
    }
  }

  // --- Find rows / cols that WOULD be full after placing ---
  const fullRows = [];
  const fullCols = [];

  for (let y = 0; y < height; y++) {
    if (sim[y].every(v => !!v)) fullRows.push(y);
  }

  for (let x = 0; x < width; x++) {
    let full = true;
    for (let y = 0; y < height; y++) {
      if (!sim[y][x]) { full = false; break; }
    }
    if (full) fullCols.push(x);
  }

  if (!fullRows.length && !fullCols.length) return;

  // --- Apply the "about-to-clear" glow to the underlying board cells ---
  const boardEl = window.$('board');
  if (!boardEl) return;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!fullRows.includes(y) && !fullCols.includes(x)) continue;
      const idx = y * width + x;
      const cell = boardEl.children[idx];
      if (cell) {
        cell.classList.add('about-to-clear');
      }
    }
  }
}

function canPlace(shape,x,y){
  if (!shape || !shape[0]) return false;
  for(let r=0;r<shape.length;r++)for(let c=0;c<shape[0].length;c++){
    if(!shape[r][c])continue; const yy=y+r,xx=x+c;
    if(xx<0||yy<0||xx>=width||yy>=height) return false;
    if(grid[yy][xx]) return false;
  } return true;
}
function applyPiece(piece,x,y){
  const placed=[]; for(let r=0;r<piece.shape.length;r++)for(let c=0;c<piece.shape[0].length;c++){
    if(!piece.shape[r][c])continue; grid[y+r][x+c]=piece.color; placed.push({x:x+c,y:y+r});
  } return placed;
}
function detectFullLines(){
  const rows=[],cols=[];
  for(let y=0;y<height;y++){ if(grid[y].every(v=>!!v)) rows.push(y) }
  for(let x=0;x<width;x++){ let full=true; for(let y=0;y<height;y++){ if(!grid[y][x]){full=false;break} } if(full) cols.push(x) }
  return {rows,cols}
}
function animatePlacedCells(cells){ if(currentMode==='tetris') return; const b=window.$('board'); cells.forEach(({x,y})=>{const idx=y*width+x; const cell=b.children[idx]; if(cell){ cell.style.animation='pop .26s ease'; setTimeout(()=>{cell.style.animation=''},280) }}) }

function getAudioCtx() {
  if (window.__audioCtx) return window.__audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null; // no WebAudio support
  window.__audioCtx = new AC();
  return window.__audioCtx;
}

// Unlock audio on first user gesture (mobile needs this)
function __unlockAudio() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  // Tiny silent tick to satisfy some browsers
  try {
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch {}
  window.audioOK = true;
  document.removeEventListener('pointerdown', __unlockAudio);
  document.removeEventListener('touchstart', __unlockAudio);
  document.removeEventListener('click', __unlockAudio);
}
document.addEventListener('pointerdown', __unlockAudio, { once: true });
document.addEventListener('touchstart', __unlockAudio, { once: true });
document.addEventListener('click', __unlockAudio, { once: true });

function playClearSound(){
  const ctx = getAudioCtx();
  if (!ctx) return; // skip until audio context exists
  // skip until user taps/clicks

  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.type = 'triangle';
  const t = ctx.currentTime;

  o.frequency.setValueAtTime(660, t);
  o.frequency.exponentialRampToValueAtTime(990, t + 0.08);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.2);
}

function animateAndClear(lines){
  if (currentMode === 'tetris') return Promise.resolve(0);
  const { rows, cols } = lines;
  if (!rows.length && !cols.length) return Promise.resolve(0);

  const b = window.$('board'); // classic board element
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const isRow = rows.includes(y), isCol = cols.includes(x);
    if (isRow || isCol) {
      const idx = y * width + x;
      const cell = b.children[idx];
      if (cell && grid[y][x]) {
        cell.style.animation = 'jumpOut .2s ease both';
        cell.style.setProperty('--cDelay', '140ms');
        cell.classList.add('clearing', isRow ? 'row' : 'col');
      }
    }
  }

  try { playClearSound(); } catch (_) {}

  // read CSS var and fall back if missing
  const cssMs = parseInt(getComputedStyle(document.documentElement)
                   .getPropertyValue('--clear-ms')) || 420;
  const delay = cssMs + 160;

  return new Promise(res => setTimeout(() => {
    // 1) ZERO DATA IN-PLACE (don't replace row arrays)
    for (const y of rows) for (let x = 0; x < width; x++) grid[y][x] = 0;
    for (const x of cols) for (let y = 0; y < height; y++) grid[y][x] = 0;

    // 2) RE-RENDER FROM DATA
    renderBoard();

    // 3) BELT & BRACES: strip any lingering classes/attrs from cleared cells
    //    (prevents visuals staying filled if renderBoard missed anything)
    const boardEl = window.$('board') || document;
    for (const y of rows) for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const el = boardEl.children[idx];
      if (el) {
        el.classList.remove('clearing','row','col','filled','placed','block');
        el.removeAttribute?.('data-filled');
        el.style.removeProperty?.('--cDelay');
      }
    }
    for (const x of cols) for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      const el = boardEl.children[idx];
      if (el) {
        el.classList.remove('clearing','row','col','filled','placed','block');
        el.removeAttribute?.('data-filled');
        el.style.removeProperty?.('--cDelay');
      }
    }

    res(rows.length + cols.length);
  }, delay));
}

function startDrag(piece,cx,cy){
  if(currentMode==='tetris') return;
  dragging={piece};
  document.addEventListener('pointermove',onDragMove,{passive:false});
  document.addEventListener('touchmove',onTouchMove,{passive:false});
  const end=e=>{onDragEnd(e);cleanup()};
  const cancel=()=>{dragging=null;clearPreview();cleanup()};
  function cleanup(){
    document.removeEventListener('pointermove',onDragMove);
    document.removeEventListener('touchmove',onTouchMove);
    document.removeEventListener('pointerup',end);
    document.removeEventListener('pointercancel',cancel);
    document.removeEventListener('touchend',end);
    document.removeEventListener('touchcancel',cancel);
  }
  document.addEventListener('pointerup',end,{once:true});
  document.addEventListener('pointercancel',cancel,{once:true});
  document.addEventListener('touchend',end,{once:true});
  document.addEventListener('touchcancel',cancel,{once:true});
  onDragMove({clientX:cx,clientY:cy,preventDefault(){}});
}
function onTouchMove(e){ if(!dragging)return; if(!e.touches||!e.touches[0])return; e.preventDefault(); const t=e.touches[0]; onDragMove({clientX:t.clientX,clientY:t.clientY,preventDefault(){}}) }
function onDragMove(e){
  if(!dragging)return; if(e&&e.preventDefault) e.preventDefault();
  const rect=window.$('board').getBoundingClientRect(), s=window.cellSize(),p=window.pad(),g=window.gap();
  const inside=e.clientX>=rect.left+p&&e.clientX<rect.right-p&&e.clientY>=rect.top+p&&e.clientY<rect.bottom-p;
  if(!inside){hoverCell=null;clearPreview();return}
  const x=Math.floor((e.clientX-rect.left-p)/(s+g));
  const y=Math.floor((e.clientY-rect.top -p)/(s+g));
  hoverCell={x,y}; drawPreview(dragging.piece,x,y);
}
async function onDragEnd(e){
  if(!dragging){ clearPreview(); return; }
  const p = dragging.piece; dragging = null;
  if(!hoverCell){ clearPreview(); return; }
  const { x, y } = hoverCell;
  if (!canPlace(p.shape, x, y)) { clearPreview(); return; }

  /* 1) Place */
  const placed = applyPiece(p, x, y);
  p.used = true;

  /* 2) Base score */
  const placedCells = cellsInShape(p.shape);
  score += placedCells;
  uiPiecePlaced(placedCells);
  renderBoard();
  animatePlacedCells(placed);

  /* 3) Clear detection + bonus */
  const lines = detectFullLines();
  const clearedCount = (lines.rows.length + lines.cols.length);
  if (clearedCount > 0) {
    await animateAndClear(lines);
    renderBoard();
    const bonus = scoreForClear(lines);
    score += bonus;

    const linesCleared = clearedCount;
    const simMultiIndex = Math.min(linesCleared, CLEAR_MULTI.length-1);
    const simMulti = CLEAR_MULTI[simMultiIndex];
    const comboMulti = Math.pow(COMBO_GROWTH, comboLevel);
    let tag = `+${bonus}`;
    if (linesCleared > 1) tag += ` (x${simMulti.toFixed(2)})`;
    if (comboLevel > 0)   tag += ` (combo x${comboMulti.toFixed(2)})`;
    floatPoints(tag);
  }

  /* 4) Combo bookkeeping */
  afterPlacementUpdateRack(clearedCount > 0);

  /* 5) Refill / check moves */
  if (currentMode && (currentMode === 'classic' || currentMode === 'adventure')) {
    refillTray(); renderTray(); updateScore(); ensureMovesOrGameOver();
  } else {
    refillTray(); renderTray(); updateScore();
  }
  clearPreview();
}
function hasAnyValidMove(){
  const pieces = tray.filter(p => !p.used);
  if (pieces.length === 0) return true;
  for (const piece of pieces){
    for (let y=0; y<height; y++){
      for (let x=0; x<width; x++){
        if (canPlace(piece.shape, x, y)) return true;
      }
    }
  }
  return false;
}
function ensureMovesOrGameOver(){
  if(currentMode==='classic'||currentMode==='adventure'){
    const anyUnused=tray.some(p=>!p.used);
    if(anyUnused && !hasAnyValidMove()){ setTimeout(()=>gameOverWithWave(),200) }
  }
}

function refillTray(){
  if(currentMode==='tetris') return;
  tray=[];
  for(let i=0;i<3;i++){
    const shape = window.modePick ? window.modePick() : MODE_SHAPES[window.randi(MODE_SHAPES.length)];
    tray.push({shape:window.copyShape(shape),color:randColor(),used:false});
  }
}

/* Waves / Game over */
function boardWave(type){
  const cells=[...window.$('board').children], base=type==='out'?520:420, step=38, jumpOffset=type==='in'?140:100;
  cells.forEach((cell,i)=>{const x=i%width,y=(i/width)|0,d=(x+y)*step;cell.style.animation='';
    if(type==='in'){cell.style.animation=`waveIn .42s ease both ${d}ms, jumpOut .2s ease both ${d+jumpOffset}ms`;}
    else{cell.style.animation=`waveOut .52s ease both ${d}ms, jumpOut .2s ease both ${d+jumpOffset}ms`;}
  });
  const total=(width+height)*step+base+jumpOffset+260;
  return new Promise(res=>setTimeout(()=>{cells.forEach(c=>c.style.animation='');res()},total))
}
async function gameOverWithWave(){ if(gameOverQueued) return; gameOverQueued=true; await boardWave('out'); showGameOverOverlay(); tStop(); gameOverQueued=false }

// openClassicGrid moved to classic.js to avoid conflicts

// Hard clear for Classic: zeros grid + cleans DOM + re-renders
function classicHardClear(lines) {
  const rows = lines?.rows || [];
  const cols = lines?.cols || [];
  const n = grid.length;

  // A) zero out DATA on the same grid Classic uses
  for (const r of rows) for (let c = 0; c < n; c++) grid[r][c] = 0;
  for (const c of cols) for (let r = 0; r < n; r++) grid[r][c] = 0;

  // B) clean up the DOM (classes/attrs) so visuals match data immediately
  const boardEl =
    document.querySelector('#board') ||           // try id=board
    document.querySelector('.classic-grid') ||    // try class=classic-grid
    document;                                     // fallback (still works)
  
  // clear row cells
  for (const r of rows) {
    for (let c = 0; c < n; c++) {
      const el = boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (el) {
        el.classList.remove('clearing', 'row', 'col', 'filled', 'placed', 'block');
        el.removeAttribute('data-filled');
        el.style.removeProperty('--cDelay');
      }
    }
  }
  // clear col cells
  for (const c of cols) {
    for (let r = 0; r < n; r++) {
      const el = boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (el) {
        el.classList.remove('clearing', 'row', 'col', 'filled', 'placed', 'block');
        el.removeAttribute('data-filled');
        el.style.removeProperty('--cDelay');
      }
    }
  }

  // C) re-render from data (forces UI ↔ data sync)
  try { renderBoard(); } catch {}
}

/* expose for inline onclick */
Object.assign(window,{ showHome, startMode, retryGame, goHome, toggleTheme, showBackMenu, hideBackMenu, tKey, openClassicGrid });

/* ---------------- Self Tests ---------------- */
function runSelfTests(){
  const results=[]; const pass=(name)=>results.push({test:name, pass:true}); const fail=(name,msg)=>results.push({test:name, pass:false, msg});
  const fns=['showHome','startMode','retryGame','goHome','toggleTheme','openClassicGrid'];
  try{ let ok=true; for(const k of Object.keys(TETROMINOES)){ for(let r=0;r<4;r++){ const m=tGetShape(k,r); const cnt=m.flat().reduce((a,b)=>a+(b?1:0),0); if(cnt!==4) ok=false; } } ok?pass('tetromino counts'):fail('tetromino counts','not 4') }catch(e){ fail('tetromino counts', e.message)}
  try{ tRefillBag(); const set=new Set(tBag); (tBag.length===7 && set.size===7) ? pass('7-bag size & uniqueness') : fail('7-bag size & uniqueness', JSON.stringify(tBag)); }catch(e){ fail('7-bag', e.message) }
  try{ setBoardDimensions(10,20); grid=Array.from({length:height},()=>Array(width).fill(0)); tActive='J'; tRot=0; tX=0; tY=0; const before=tCollide(tX,tY,tActive,1); tRotate(1); const after=!tCollide(tX,tY,tActive,tRot); (before && after) ? pass('SRS wall kick J 0>1 at wall') : fail('SRS wall kick J 0>1 at wall', JSON.stringify({before,after,tX,tY,tRot})) }catch(e){ fail('SRS wall kick J', e.message)}
  try{ setBoardDimensions(10,20); grid=Array.from({length:height},()=>Array(width).fill(0)); tActive='I'; tRot=0; tX=width-4; tY=0; const before=tCollide(tX,tY,tActive,1); tRotate(1); const after=!tCollide(tX,tY,tActive,tRot); (before && after) ? pass('SRS wall kick I 0>1 at wall') : fail('SRS wall kick I 0>1 at wall', JSON.stringify({before,after,tX,tY,tRot})) }catch(e){ fail('SRS wall kick I', e.message)}
  console.log('%cBlock Forge self-tests', 'color:#39ff14;font-weight:700'); console.table(results);
}

/* Listeners */
window.addEventListener('resize', () => {
  if (typeof sizePreviewLayer === 'function') sizePreviewLayer();
  const host = document.getElementById('homeMiniDemo');
  if (host && typeof sizeDemoPreviewFixed === 'function') sizeDemoPreviewFixed();
  if (typeof fitTetrisToViewport === 'function') fitTetrisToViewport();
}, { passive: true });

// Initialize on DOMContentLoaded
window.addEventListener('DOMContentLoaded', ()=>{
  if(typeof showHome === 'function') showHome();
  runSelfTests();
  if(typeof fitTetrisToViewport === 'function') fitTetrisToViewport();
});

