/* ===== MODE.JS - Mode selection screen (#home) logic ===== */

// Mini canvas animation for home page
(function(){
  const wrap   = document.getElementById('homeMiniDemo');
  const mini   = document.getElementById('miniBoardClone');
  const cvs    = document.getElementById('homeMiniCanvas');
  if (!wrap || !mini || !cvs) return;

  const ctx = cvs.getContext('2d');

  // 1) Copy skin from your real board if we can find one
  (function copySkin(){
    const real = document.querySelector('#game .board, .app .board'); // try to find any live board
    if (!real) return;
    const cs = getComputedStyle(real);
    ['background','boxShadow','borderRadius'].forEach(p=> mini.style[p] = cs[p]);
    ['--cell','--gap','--pad','--cols'].forEach(v=>{
      const val = cs.getPropertyValue(v);
      if (val) mini.style.setProperty(v, val.trim());
    });
  })();

  // 2) Build a DOM grid that matches your board's shape
  const COLS = parseInt(getComputedStyle(mini).getPropertyValue('--cols')) || 8;
  const GAP  = parseInt(getComputedStyle(mini).getPropertyValue('--gap'))  || 6;
  const PAD  = parseInt(getComputedStyle(mini).getPropertyValue('--pad'))  || 8;

  mini.style.display = 'grid';
  mini.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  mini.style.gap = `${GAP}px`;
  mini.style.padding = `${PAD}px`;

  // create cells so your .board/.cell CSS renders identically to Classic
  const frag = document.createDocumentFragment();
  const cells = COLS * COLS;  // square banner
  for (let i=0; i<cells; i++){
    const d = document.createElement('div');
    d.className = 'cell';
    frag.appendChild(d);
  }
  mini.innerHTML = ''; mini.appendChild(frag);

  // 3) Fit the canvas and animate a ghost piece aligned to the DOM grid
  let W=0,H=0, cellPx=0, raf=null;
  const fall = { x: 0, y: -2.5, speed: 0.016 };

  function readCellSize(){
    const one = mini.querySelector('.cell');
    if (!one) return 40;
    const cs = getComputedStyle(one);
    return Math.round(parseFloat(cs.width));
  }

  function fit(){
    const r = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cvs.width  = Math.max(320, Math.floor(r.width  * dpr));
    cvs.height = Math.max(160, Math.floor(r.height * dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    W = r.width; H = r.height;
    cellPx = readCellSize();
  }

  function gridOrigin(){
    const pad = PAD;
    const gridW = mini.clientWidth  - pad*2;
    const gridH = mini.clientHeight - pad*2;
    const startX = Math.round((W - gridW)/2 + pad);
    const startY = Math.round((H - gridH)/2 + pad);
    return { startX, startY };
  }

  function drawGhost(origin){
    const { startX, startY } = origin;
    const gap = GAP;
    const px = startX + fall.x*(cellPx+gap);
    const py = startY + fall.y*(cellPx+gap);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r=0; r<2; r++){
      for (let c=0; c<2; c++){
        const fx = px + c*(cellPx+gap);
        const fy = py + r*(cellPx+gap);
        ctx.fillStyle   = 'rgba(57,255,20,0.12)';
        ctx.strokeStyle = 'rgba(57,255,20,0.20)';
        ctx.lineWidth = 2;
        ctx.fillRect(fx, fy, cellPx, cellPx);
        ctx.strokeRect(fx+1, fy+1, cellPx-2, cellPx-2);
      }
    }
    ctx.restore();

    // update fall
    fall.y += fall.speed * (H/220);
    if (startY + (fall.y+2)*(cellPx+gap) > startY + COLS*(cellPx+gap)){
      fall.y = -2.5;
      fall.x = Math.floor(Math.random()*(COLS-1));
    }
  }

  function loop(){
    ctx.clearRect(0,0,W,H);   // DOM renders the grid; canvas draws only the ghost
    drawGhost(gridOrigin());
    raf = requestAnimationFrame(loop);
  }

  new ResizeObserver(fit).observe(wrap);
  fit(); loop();

  // Pause when Home is hidden
  const mo = new MutationObserver(()=>{
    const home = document.getElementById('home');
    const hidden = home?.classList.contains('hidden');
    if (hidden && raf){ cancelAnimationFrame(raf); raf=null; }
    else if (!hidden && !raf){ fit(); loop(); }
  });
  mo.observe(document.body, {subtree:true, attributes:true, attributeFilter:['class']});
})();

// Mode page autoplay bot and tray management
document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('miniBoardClone');
  const tray  = document.getElementById('bfTray');
  
  // Build 3 fixed slots if they aren't in the HTML
  (function ensureTraySlots(){
    if (!tray) return;
    if (!tray.querySelector('.slot')){
      for (let i = 0; i < 3; i++){
        const s = document.createElement('div');
        s.className = 'slot';
        s.dataset.slot = String(i);
        tray.appendChild(s);
      }
    }
  })();

  if (!board || !tray) return;

  // --- Z-INDEX SAFETY: grid above tray so placed cells show ---
  board.style.position = 'relative';
  board.style.zIndex = '3';
  const banner = document.getElementById('homeMiniDemo');
  if (banner) { banner.style.position = 'relative'; banner.style.zIndex = '2'; }
  tray.style.position = 'relative';
  tray.style.zIndex = '1';

  // --- Ensure grid cells exist (some older code used to create them) ---
  function ensureGridCells(){
    const current = board.querySelectorAll('.cell');
    if (current.length) return Array.from(current);

    const cs   = getComputedStyle(board);
    const COLS = parseInt(cs.getPropertyValue('--cols')) || 8;
    const ROWS = parseInt(cs.getPropertyValue('--rows')) || COLS;
  
    board.style.display = 'grid';
    board.style.gridTemplateColumns = `repeat(${COLS}, calc(var(--cell,40) * 1px))`;

    const frag = document.createDocumentFragment();
    for (let r=0; r<ROWS; r++){
      for (let c=0; c<COLS; c++){
        const d = document.createElement('div');
        d.className = 'cell';
        d.dataset.r = r; d.dataset.c = c;
        frag.appendChild(d);
      }
    }
    board.appendChild(frag);
    return Array.from(board.querySelectorAll('.cell'));
  }

  const cellEls = ensureGridCells();
  if (!cellEls.length) return;

  // --- Board metrics from the REAL DOM ---
  const cs   = getComputedStyle(board);
  const GAP  = parseFloat(cs.getPropertyValue('gap'))     || 6;
  const PAD  = parseFloat(cs.getPropertyValue('padding')) || 8;
  const COLS = parseInt(cs.getPropertyValue('--cols'))    || Math.round(Math.sqrt(cellEls.length));
  const ROWS = Math.round(cellEls.length / COLS);
  const CELL = (()=>{ const one = cellEls[0]; return one ? parseFloat(getComputedStyle(one).width) : 38; })();
  const idx  = (r,c)=> r*COLS + c;

  // --- State from current board (0/1) ---
  const S = Array.from({length: ROWS}, (_,r)=> Array.from({length: COLS}, (_,c)=>
    cellEls[idx(r,c)].classList.contains('filled') ? 1 : 0
  ));

  // Use shared PALETTE
  const PALETTE = window.PALETTE || [];

  // --- Piece factory (color + per-piece scale) ---
  function makePiece(shape, color, scale){
    const p = document.createElement('div');
    p.className = 'bfmini-piece';
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

    // per-piece scale
    const s = (typeof scale === 'number' ? scale : 0.8);
    p.dataset.scale = String(s);
    p.style.setProperty('--piece-scale', s);

    // build cells inside the piece
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

  // --- Placement helpers ---
  function canPlace(shape, R, C){
    if (!shape || !shape[0]) return false;
    for (let r=0; r<shape.length; r++){
      for (let c=0; c<shape[0].length; c++){
        if (!shape[r][c]) continue;
        const rr = R+r, cc = C+c;
        if (rr<0||cc<0||rr>=ROWS||cc>=COLS) return false;
        if (S[rr][cc]===1) return false;
      }
    }
    return true;
  }

  function place(shape, R, C, colorArg){
    const color = colorArg || place._currentColor || window.safeNextColor();
    for (let r=0; r<shape.length; r++){
      for (let c=0; c<shape[0].length; c++){
        if (!shape[r][c]) continue;
        const rr = R + r, cc = C + c;
        S[rr][cc] = 1;
        const cell = cellEls[idx(rr,cc)];
        cell.classList.remove('hover-ok','hover-bad');
        cell.style.setProperty('--fill', color.fill);
        cell.style.setProperty('--stroke', color.stroke);
        cell.style.setProperty('--glow', color.glow);
        cell.style.setProperty('--glow-inset', color.glowInset);
        cell.classList.add('filled');
      }
    }
    place._currentColor = null; // optional: clear after use
  }

  function clearHover(){
    const els = board.querySelectorAll('.cell.preview, .cell.hover-ok, .cell.hover-bad');
    els.forEach(el => {
      el.classList.remove('preview','hover-ok','hover-bad');
      // remove temp preview colors so next pass recolors cleanly
      el.style.removeProperty('--fill');
      el.style.removeProperty('--stroke');
    });
  }

  function snap(clientX, clientY){
    const rect = board.getBoundingClientRect();
    const startX = rect.left + PAD;
    const startY = rect.top  + PAD;
    const relX = clientX - startX;
    const relY = clientY - startY;
    if (relX<0 || relY<0) return null;
    const step = CELL + GAP;
    const c = Math.floor(relX / step);
    const r = Math.floor(relY / step);
    if (c<0||r<0||c>=COLS||r>=ROWS) return null;
    return {r,c};
  }

  // Home/Mode: simple tray refill (3 slots)
  function refillTray(){
    if (!tray) return;
    const slots = Array.from(tray.querySelectorAll('.slot'));
    slots.forEach(slot=>{
      if (slot.querySelector('.bfmini-piece')) return;
      slot.innerHTML = '';
      const easyIndices = window.TIER_INDICES?.easy || [];
const shape = easyIndices.length
  ? window.SHAPES[ easyIndices[Math.floor(Math.random()*easyIndices.length)] ]
  : window.weightedRandomShape(); // fallback if something’s weird
      const color = (window.safeNextColor ? window.safeNextColor() : PALETTE[ (Math.random()*PALETTE.length)|0 ]);
      const scale = window.autoScaleForShape(shape);
      const piece = makePiece(shape, color, scale);
      piece.dataset.slot = slot.dataset.slot;
      slot.appendChild(piece);
    });
    tray.querySelectorAll('.bfmini-piece').forEach(p=>{
      (window.enableDrag || (()=>{}))(p);
    });
  }

  // Clear full lines for mode page
  function clearFullLines(){
    const fullRows=[], fullCols=[];
    for (let r=0;r<ROWS;r++) if (S[r].every(v=>v===1)) fullRows.push(r);
    for (let c=0;c<COLS;c++){
      let ok=true; for (let r=0;r<ROWS;r++){ if (S[r][c]===0){ ok=false; break; } }
      if (ok) fullCols.push(c);
    }
    if (!fullRows.length && !fullCols.length) return;

    // mark for animation
    fullRows.forEach(r=>{ for(let c=0;c<COLS;c++) cellEls[idx(r,c)]?.classList.add('clearing'); });
    fullCols.forEach(c=>{ for(let r=0;r<ROWS;r++) cellEls[idx(r,c)]?.classList.add('clearing'); });

    setTimeout(()=>{
      // reset cells; NEVER remove DOM nodes
      fullRows.forEach(r=>{ for(let c=0;c<COLS;c++){ 
        S[r][c]=0; const el=cellEls[idx(r,c)]; if(!el) return;
        el.classList.remove('filled','clearing','preview','hover-ok','hover-bad');
        el.style.removeProperty('--fill'); el.style.removeProperty('--stroke');
        el.style.removeProperty('--glow'); el.style.removeProperty('--glow-inset');
      }});    
      fullCols.forEach(c=>{ for(let r=0;r<ROWS;r++){
        S[r][c]=0; const el=cellEls[idx(r,c)]; if(!el) return;
        el.classList.remove('filled','clearing','preview','hover-ok','hover-bad');
        el.style.removeProperty('--fill'); el.style.removeProperty('--stroke');
        el.style.removeProperty('--glow'); el.style.removeProperty('--glow-inset');
      }});
    }, 240);
  }

  // Render the tray once
  refillTray();

  // === AUTOPLAY BOT (must sit right after: refillTray(); ) ===
  (() => {
    // ---- config ----
    const AUTOPLAY = true;          // leave true to run
    const MOVE_MS  = 1800;          // drag duration
    const STEP_GAP = 600;           // pause between moves
    const SHOW_SNAP_PREVIEW = true;

    // ---- safety: ensure we see board/tray from outer scope ----
    if (!window || !board || !tray) {
      console.warn('[AutoPlay] missing board/tray – move this block inside DOMContentLoaded and keep it AFTER refillTray().');
      return;
    }

    // prevent double starts
    if (window.__bfAutoRunning) {
      console.log('[AutoPlay] already running, skipping re-init.');
      return;
    }
    window.__bfAutoRunning = false;

    // expose manual controls
    function startAuto(){ if (!window.__bfAutoRunning){ window.__bfAutoRunning = true; console.log('[AutoPlay] start'); setTimeout(autoStep, 400); } }
    function stopAuto(){  window.__bfAutoRunning = false; console.log('[AutoPlay] stop'); }
    window.bfAuto = { start: startAuto, stop: stopAuto };

    // ---------- helpers (unchanged logic) ----------
    function previewHover(shape, base, ok){
      clearHover();
      if (!ok || !base) return;
      for (let r=0; r<shape.length; r++){
        for (let c=0; c<shape[0].length; c++){
          if (!shape[r][c]) continue;
          const rr = base.r + r, cc = base.c + c;
          if (rr<0||cc<0||rr>=ROWS||cc>=COLS) continue;
          cellEls[idx(rr,cc)].classList.add('hover-ok'); // green only
        }
      }
    }

    function rowsColsCompletedIf(shape, R, C){
      const filledRows = new Set(), filledCols = new Set();
      const covers = (sr, sc) => (sr>=0 && sc>=0 && sr<shape.length && sc<shape[0].length && !!shape[sr][sc]);
      for (let r=0; r<shape.length; r++){
        for (let c=0; c<shape[0].length; c++){
          if (!shape[r][c]) continue;
          const rr = R + r, cc = C + c;
          if (rr<0||cc<0||rr>=ROWS||cc>=COLS) continue;
          if (!filledRows.has(rr)){
            let full = true; for (let x=0; x<COLS; x++) full = full && (S[rr][x]===1 || covers(rr-R, x-C));
            if (full) filledRows.add(rr);
          }
          if (!filledCols.has(cc)){
            let full = true; for (let y=0; y<ROWS; y++) full = full && (S[y][cc]===1 || covers(y-R, cc-C));
            if (full) filledCols.add(cc);
          }
        }
      }
      return { rows: filledRows, cols: filledCols, count: filledRows.size + filledCols.size };
    }

    function scorePlacement(shape, R, C){
      const { count } = rowsColsCompletedIf(shape, R, C);
      const lineScore = count * 100;
      const midR=(ROWS-1)/2, midC=(COLS-1)/2;
      const centerScore = -(Math.abs(R-midR)+Math.abs(C-midC));
      let adj=0;
      for (let r=0;r<shape.length;r++){
        for (let c=0;c<shape[0].length;c++){
          if (!shape[r][c]) continue;
          const rr=R+r, cc=C+c, N=[[-1,0],[1,0],[0,-1],[0,1]];
          for (const [dr,dc] of N){
            const r2=rr+dr, c2=cc+dc;
            if (r2<0||c2<0||r2>=ROWS||c2>=COLS) continue;
            if (S[r2][c2]===1) adj++;
          }
        }
      }
      return lineScore + centerScore + adj*2;
    }

    function pickBestMove(){
      let best=null;
      const pieces = Array.from(tray.querySelectorAll('.slot > .bfmini-piece'));
      for (let i=0;i<pieces.length;i++){
        const piece = pieces[i], shape = piece._shape;
        for (let R=0; R<ROWS; R++){
          for (let C=0; C<COLS; C++){
            if (!canPlace(shape,R,C)) continue;
            const sc = scorePlacement(shape,R,C);
            if (!best || sc>best.score) best = { piece, shape, R, C, score: sc, index: i };
          }
        }
      }
      return best;
    }

    function boardPopReset(done){
      clearHover?.(); // if you have this helper
      board.classList.add('resetting');

      // fade out only the filled cells
      for (let r=0;r<ROWS;r++){
        for (let c=0;c<COLS;c++){
          if (S[r][c]===1) cellEls[idx(r,c)].classList.add('reset-fade');
        }
      }

      // after the pop, wipe state and styles
      setTimeout(() => {
        for (let r=0;r<ROWS;r++){
          for (let c=0;c<COLS;c++){
            S[r][c] = 0;
            const cell = cellEls[idx(r,c)];
            cell.className = cell.className
              .replace(/\bfilled\b/g,'')
              .replace(/\bhover-ok\b/g,'')
              .replace(/\bhover-bad\b/g,'')
              .replace(/\bclearing\b/g,'')
              .replace(/\breset-fade\b/g,'');
            cell.style.removeProperty('--fill');
            cell.style.removeProperty('--stroke');
            cell.style.removeProperty('--glow');
            cell.style.removeProperty('--glow-inset');
          }
        }
        board.classList.remove('resetting');
        if (typeof done === 'function') done();
      }, 320); // match bfBoardPop duration
    }

    function animateDragAndPlace(piece, R, C, done){
      // hand off exact piece colors for placement
      place._currentColor = {
        fill:      piece.style.getPropertyValue('--fill')       || piece.dataset.fill,
        stroke:    piece.style.getPropertyValue('--stroke')     || piece.dataset.stroke,
        glow:      piece.style.getPropertyValue('--glow')       || piece.dataset.glow,
        glowInset: piece.style.getPropertyValue('--glow-inset') || piece.dataset.glowInset
      };

      const tCell = cellEls[idx(R,C)];
      const tRect = tCell.getBoundingClientRect();
      const pRect = piece.getBoundingClientRect();

      const clone = piece.cloneNode(true);
      clone.style.position='fixed';
      clone.style.left=pRect.left+'px';
      clone.style.top=pRect.top+'px';
      clone.style.width=pRect.width+'px';
      clone.style.height=pRect.height+'px';
      clone.style.zIndex='9999';
      clone.style.pointerEvents='none';

      // make clone match board grid exactly
      clone.style.padding='0'; clone.style.background='transparent'; clone.style.outline='none';
      clone.style.setProperty('--piece-scale', 1);
      clone.style.gap = (GAP)+'px';
      clone.querySelectorAll('.cell').forEach(c=>{ c.style.width=CELL+'px'; c.style.height=CELL+'px'; });

      document.getElementById('homeMiniDemo').appendChild(clone);

      piece.style.visibility='hidden';

      const startX=pRect.left, startY=pRect.top, endX=tRect.left, endY=tRect.top;
      const dx=endX-startX, dy=endY-startY;
      const t0 = performance.now();

      function frame(now){
        const t=Math.min(1,(now-t0)/MOVE_MS);
        const ease = t<.5 ? 2*t*t : -1+(4-2*t)*t;
        const curX=startX+dx*ease, curY=startY+dy*ease;
        clone.style.left=curX+'px'; clone.style.top=curY+'px';

        if (SHOW_SNAP_PREVIEW){
          clearHover();

          const rect = board.getBoundingClientRect();
          const sx = rect.left + PAD, sy = rect.top + PAD;
          const relX = curX - sx,     relY = curY - sy;
          const step = CELL + GAP;

          if (relX >= 0 && relY >= 0){
            const c0 = Math.floor(relX / step);
            const r0 = Math.floor(relY / step);

            if (c0>=0 && r0>=0 && c0<COLS && r0<ROWS){
              const ok = canPlace(piece._shape, r0, c0);
              if (ok){
                const fill   = piece.style.getPropertyValue('--fill')   || piece.dataset.fill;
                const stroke = piece.style.getPropertyValue('--stroke') || piece.dataset.stroke;

                for (let r=0; r<piece._shape.length; r++){
                  for (let c=0; c<piece._shape[0].length; c++){
                    if (!piece._shape[r][c]) continue;
                    const rr = r0 + r, cc = c0 + c;
                    if (rr<0||cc<0||rr>=ROWS||cc>=COLS) continue;

                    const cell = cellEls[idx(rr,cc)];
                    cell.style.setProperty('--fill',   fill);
                    cell.style.setProperty('--stroke', stroke);
                    cell.classList.add('preview'); // CSS paints from --fill
                  }
                }
              }
            }
          }
        }

        if (t<1){ requestAnimationFrame(frame); }
        else{
          clearHover(); clone.remove(); piece.style.visibility='';
          place(piece._shape, R, C); piece.remove();
          if (typeof done==='function') done();
        }
      }
      requestAnimationFrame(frame);
    }

    function autoStep(){
      if (!window.__bfAutoRunning) return;
      if (!tray || tray.children.length===0){ refillTray(); setTimeout(autoStep, STEP_GAP); return; }
      const move = pickBestMove();
      if (!move){
        // No legal placements: pop + reset board, then new set of tray pieces
        boardPopReset(() => {
          // remove ONLY the pieces, keep the 3 slots
          tray.querySelectorAll('.slot > .bfmini-piece').forEach(el => el.remove());
          refillTray();
          setTimeout(autoStep, STEP_GAP);
        });
        return;
      }

      animateDragAndPlace(move.piece, move.R, move.C, ()=>{
        clearFullLines();
        if (tray.querySelectorAll('.slot > .bfmini-piece').length === 0) {
          refillTray();  // only when all three are gone
        }
        setTimeout(autoStep, STEP_GAP);
      });
    }
    // kick it off once
    if (AUTOPLAY) startAuto();
  })();
});

