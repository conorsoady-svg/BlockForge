/* ===== CLASSIC.JS - Classic game screen (#screen-classic-grid) logic ===== */
// Show the Classic grid-only screen
window.openClassicGrid = function () {
  // Stop Tetris if running (tStop is defined in tetris.js)
  if (typeof tStop === 'function') {
    tStop();
  }
    // Hide the main Tetris board while in Classic
  const tetrisBoard = document.getElementById('board');
  if (tetrisBoard) {
    tetrisBoard.classList.add('hidden');
    tetrisBoard.style.display = 'none';
  }

  // Use the global show/hide functions
  // Use the global show/hide functions
  if (window.hide && window.show) {
    // Hide the home screen
    window.hide(document.getElementById('home'));

    // Make sure the game container is visible,
    // because Classic lives inside #game in your current DOM
    window.show(document.getElementById('game'));
  } else {
    // Fallback if helpers are missing
    const home = document.getElementById('home');
    const game = document.getElementById('game');

    if (home) {
      home.classList.add('hidden');
      home.setAttribute('aria-hidden', 'true');
      home.style.display = 'none';
    }

    if (game) {
      game.classList.remove('hidden');
      game.setAttribute('aria-hidden', 'false');
      game.style.display = 'block';
    }
  }

  
  const classic = document.getElementById('screen-classic-grid');
  if (classic) {
    classic.classList.remove('hidden');
    classic.setAttribute('aria-hidden','false');
    classic.style.setProperty('display', 'grid', 'important'); // Classic screen uses grid layout, override !important from .hidden
    
    // Ensure the board has cells (in case initialization didn't run or screen was hidden)
    const board = document.getElementById('classicBoard');
    if (board && board.querySelectorAll('.cell').length === 0) {
      // Board is empty, create cells
      const COLS = 8;
      const ROWS = 8;
      board.style.display = 'grid';
      board.style.setProperty('--cols', String(COLS));
      board.style.setProperty('--rows', String(ROWS));
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
    }
  }

  // Initialize drag and drop for Classic
  setTimeout(() => {
    if (window.initClassicDnD) {
      window.initClassicDnD();
    }
    // Also ensure tray is refilled
    const classicTray = document.getElementById('bfTrayClassic');
    if (classicTray && classicTray.querySelectorAll('.bfmini-piece').length === 0) {
      if (window.refillTrayClassic) {
        window.refillTrayClassic();
      }
    }
  }, 0);
};

// Global row/col clearer for Classic — never removes DOM cells
window.clearFullLines = function(){
  const board = document.getElementById('classicBoard');
  if (!board) return;

  const cells = Array.from(board.querySelectorAll('.cell'));
  const cs    = getComputedStyle(board);
  const COLS  = parseInt(cs.getPropertyValue('--cols')) || 8;
  const ROWS  = Math.max(1, Math.round(cells.length / COLS));
  const idx   = (r,c)=> r*COLS + c;

  // Rebuild occupancy from DOM so we're in sync with whatever placed the blocks
  const S = Array.from({length:ROWS}, (_,r)=>
            Array.from({length:COLS},(_,c)=>cells[idx(r,c)].classList.contains('filled')?1:0));

  const fullRows = [];
  const fullCols = [];

  for (let r=0; r<ROWS; r++) if (S[r].every(v=>v===1)) fullRows.push(r);
  for (let c=0; c<COLS; c++){
    let ok = true; for (let r=0; r<ROWS; r++){ if (S[r][c]===0){ ok=false; break; } }
    if (ok) fullCols.push(c);
  }
  if (!fullRows.length && !fullCols.length) return;

  // Visual pulse (keeps cells in the grid)
  [...fullRows, ...fullCols].forEach(() => {/* optional: you can add a class for FX if you want */});

  // After short delay, just unfill cells — DO NOT remove nodes
  setTimeout(()=>{
    fullRows.forEach(r=>{
      for (let c=0;c<COLS;c++){
        const el = cells[idx(r,c)]; if (!el) continue;
        el.classList.remove('filled','preview','hover-ok','hover-bad','clearing');
        el.style.removeProperty('--fill'); el.style.removeProperty('--stroke');
        el.style.removeProperty('--glow'); el.style.removeProperty('--glow-inset');
      }
    });
    fullCols.forEach(c=>{
      for (let r=0;r<ROWS;r++){
        const el = cells[idx(r,c)]; if (!el) continue;
        el.classList.remove('filled','preview','hover-ok','hover-bad','clearing');
        el.style.removeProperty('--fill'); el.style.removeProperty('--stroke');
        el.style.removeProperty('--glow'); el.style.removeProperty('--glow-inset');
      }
    });
  }, 240);
};

// Helper for clearFullLinesClassic (used by initClassicDnD)
window.clearFullLinesClassic = function(board, cells, S, ROWS, COLS, idx){
  const fullRows=[], fullCols=[];
  for (let r=0;r<ROWS;r++) if (S[r].every(v=>v===1)) fullRows.push(r);
  for (let c=0;c<COLS;c++){
    let ok=true; for (let r=0;r<ROWS;r++){ if (S[r][c]===0){ ok=false; break; } }
    if (ok) fullCols.push(c);
  }
  if (!fullRows.length && !fullCols.length) return;

  // mark for animation
  fullRows.forEach(r=>{ for(let c=0;c<COLS;c++) cells[idx(r,c)]?.classList.add('clearing'); });
  fullCols.forEach(c=>{ for(let r=0;r<ROWS;r++) cells[idx(r,c)]?.classList.add('clearing'); });

  setTimeout(()=>{
    // reset cells; NEVER remove DOM nodes
    fullRows.forEach(r=>{ for(let c=0;c<COLS;c++){ 
      S[r][c]=0; const el=cells[idx(r,c)]; if(!el) return;
      el.classList.remove('filled','clearing','preview','hover-ok','hover-bad');
      el.style.removeProperty('--fill'); el.style.removeProperty('--stroke');
      el.style.removeProperty('--glow'); el.style.removeProperty('--glow-inset');
    }});    
    fullCols.forEach(c=>{ for(let r=0;r<ROWS;r++){
      S[r][c]=0; const el=cells[idx(r,c)]; if(!el) return;
      el.classList.remove('filled','clearing','preview','hover-ok','hover-bad');
      el.style.removeProperty('--fill'); el.style.removeProperty('--stroke');
      el.style.removeProperty('--glow'); el.style.removeProperty('--glow-inset');
    }});
    // resync S from DOM so placements work immediately after clears
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        S[r][c] = cells[idx(r,c)].classList.contains('filled') ? 1 : 0;
      }
    }
  }, 240);
};

// Classic screen initialization
document.addEventListener('DOMContentLoaded', () => {
  // === CLASSIC: same engine as Mode/Home, pointed at Classic IDs ===
  const board = document.getElementById('classicBoard');
  const classicTray = document.getElementById('bfTrayClassic'); // SINGLE element

  if (!board || !classicTray) return;

  // Build 3 slots if they aren't in the HTML (same as Mode)
  (function ensureTraySlots(){
    if (!classicTray.querySelector('.slot')){
      for (let i = 0; i < 3; i++){
        const s = document.createElement('div');
        s.className = 'slot';
        s.dataset.slot = String(i);
        classicTray.appendChild(s);
      }
    }
  })();

  // Ensure grid cells exist (same pattern as Mode)
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

  // Board metrics (copied from Mode)
  const cs   = getComputedStyle(board);
  const GAP  = parseFloat(cs.getPropertyValue('gap'))     || 6;
  const PAD  = parseFloat(cs.getPropertyValue('padding')) || 8;
  const COLS = parseInt(cs.getPropertyValue('--cols'))    || Math.round(Math.sqrt(cellEls.length));
  const ROWS = Math.round(cellEls.length / COLS);
  const CELL = (()=>{ const one = cellEls[0]; return one ? parseFloat(getComputedStyle(one).width) : 38; })();
  const idx  = (r,c)=> r*COLS + c;

  // State from current board (0/1)
  const S = Array.from({length: ROWS}, (_,r)=> Array.from({length: COLS}, (_,c)=>
    cellEls[idx(r,c)].classList.contains('filled') ? 1 : 0
  ));

  // --- helpers copied from your Mode DOMContentLoaded block ---
function clearHover(){
  const els = board.querySelectorAll(
    '.cell.preview, .cell.hover-ok, .cell.hover-bad, .cell.about-to-clear'
  );
  els.forEach(el => {
    el.classList.remove('preview','hover-ok','hover-bad','about-to-clear');

    // IMPORTANT: only wipe colours on temporary preview cells.
    // Real placed blocks keep their fill / stroke so they don’t go black.
    if (!el.classList.contains('filled')) {
      el.style.removeProperty('--fill');
      el.style.removeProperty('--stroke');
      el.style.removeProperty('--glow');
      el.style.removeProperty('--glow-inset');
    }
  });
}

  function canPlace(shape, R, C){
    if (!shape || !shape[0]) return false;
    for (let r=0; r<shape.length; r++){
      for (let c=0; c<shape[0].length; c++){
        if (!shape[r][c]) continue;
        const rr = R+r, cc = C+c;
        if (rr<0||cc<0||rr>=ROWS||cc>=COLS) return false;
        const el = cellEls[idx(rr,cc)];                 // ← live DOM
        if (el && el.classList.contains('filled')) return false;
      }
    }
    return true;
  }

  // --- can this shape fit anywhere on the current Classic board? ---
  function shapeCanFitAnywhere(shape){
    if (!shape || !shape[0]) return false;
    for (let R = 0; R < ROWS; R++){
      for (let C = 0; C < COLS; C++){
        if (canPlace(shape, R, C)) return true;
      }
    }
    return false;
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
    place._currentColor = null;
  }

  function snap(clientX, clientY){
    // Anchor to the actual rendered cells to avoid any CSS/scale drift
    const first = cellEls && cellEls[0] ? cellEls[0] : null;
    if (!first) return null;
    const r0 = first.getBoundingClientRect();     // first cell (0,0)

    // Measure stepX from the next cell in the *same row*
    let stepX = 0;
    const top0 = r0.top;
    for (let i = 1; i < cellEls.length; i++){
      const ri = cellEls[i].getBoundingClientRect();
      if (Math.abs(ri.top - top0) < 0.5) { stepX = ri.left - r0.left; break; }
    }
    if (!stepX) stepX = r0.width + GAP;           // fallback

    // Measure stepY from the first cell in the *next row*
    let stepY = 0;
    for (let i = 1; i < cellEls.length; i++){
      const ri = cellEls[i].getBoundingClientRect();
      if (Math.abs(ri.left - r0.left) < 0.5 && ri.top > r0.top) { stepY = ri.top - r0.top; break; }
    }
    if (!stepY) stepY = r0.height + GAP;          // fallback

    // Center-aware rounding to the nearest cell under the pointer
    const c = Math.round((clientX - (r0.left + r0.width  / 2)) / stepX);
    const r = Math.round((clientY - (r0.top  + r0.height / 2)) / stepY);
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
    return { r, c };
  }

  function makePiece(shape, color, scale){
    const p = document.createElement('div');
    p.className = 'bfmini-piece';
    const w = shape[0].length, h = shape.length;
    p.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
    p._shape = shape;
    p.dataset.shape = JSON.stringify(shape);
    p.dataset.fill      = color.fill;      p.style.setProperty('--fill', color.fill);
    p.dataset.stroke    = color.stroke;    p.style.setProperty('--stroke', color.stroke);
    p.dataset.glow      = color.glow;      p.style.setProperty('--glow', color.glow);
    p.dataset.glowInset = color.glowInset; p.style.setProperty('--glow-inset', color.glowInset);

    const s = (typeof scale === 'number' ? scale : 0.8);
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

  function autoScaleForShape(shape){
    const w = shape[0].length, h = shape.length;
    const longest = Math.max(w, h);
    if (longest >= 5) return 0.7;
    if (longest >= 4) return 0.75;
    return 0.9;
  }

  // Make a shape matrix from a tray piece (robust for Classic ghost)
  function shapeFromPiece(piece){
    if (piece && piece._shape) return piece._shape;
    try {
      return piece?.dataset?.shape ? JSON.parse(piece.dataset.shape) : null;
    } catch { return null; }
  }

  function makeDragGhost(piece, CELL, GAP){
    const shape = piece? (piece._shape || shapeFromPiece(piece)) : null;
    if (!shape || !shape[0]) {
      // build a 1×1 minimal ghost as a safe fallback
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.style.setProperty('--cell', CELL + 'px');
      ghost.style.setProperty('--gap',  GAP + 'px');
      const d = document.createElement('div');
      d.className = 'ghost-cell';
      ghost.appendChild(d);
      return ghost;
    }
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.setProperty('--cell', CELL + 'px');
    ghost.style.setProperty('--gap',  GAP + 'px');
    ghost.style.gridTemplateColumns = `repeat(${shape[0].length}, var(--cell))`;

    // pull the piece's colors
    const fill   = piece.style.getPropertyValue('--fill')   || piece.dataset.fill;
    const stroke = piece.style.getPropertyValue('--stroke') || piece.dataset.stroke;

    ghost.style.setProperty('--fill',   fill);
    ghost.style.setProperty('--stroke', stroke);

    for (let r=0; r<shape.length; r++){
      for (let c=0; c<shape[0].length; c++){
        const d = document.createElement('div');
        if (shape[r][c]) d.className = 'ghost-cell';
        ghost.appendChild(d);
      }
    }
    return ghost;
  }

  function enableDrag(piece){
    
    let dragging = false;
    let ghost = null;
    let offsetX = 0, offsetY = 0;
    const BASE_OFFSET = 150;   // default lift above finger
    const MIN_OFFSET  = 0;    // how close it can get when you drag down
    const MAX_OFFSET  = 2600;
    const H_MAX_OFFSET = 800; // horizontal max offset (not used currently)
    let FINGER_OFFSET = BASE_OFFSET; // adjust as needed for finger size

    let startX = 0, startY = 0;
    piece.addEventListener('pointerdown', (e) => {
      dragging = true;
      piece.setPointerCapture?.(e.pointerId);
      // store click offset relative to piece center
    startX = e.clientX;
      startY = e.clientY;
      fingerOffset = BASE_OFFSET;

      offsetX = 0;
      offsetY = 0;

      // --- create the ghost at full grid-cell size ---
      ghost = makeDragGhost(piece, CELL, GAP);
      document.getElementById('screen-classic-grid').appendChild(ghost);
      // hide the original piece while dragging
      piece.style.opacity = '0.001';
      // position it immediately
      ghost.style.left = e.clientX + 'px';
      ghost.style.top  = e.clientY + 'px';
      ghost.style.transform = 'translate(-50%, calc(-50% - 150px))';
    });

    piece.addEventListener('pointermove', (e) => {
      if (!dragging) return;

 // --- update dynamic offsets based on drag direction ---
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // up = negative dy, down = positive dy
    const up   = Math.max(0, -dy);
    const down = Math.max(0,  dy);

    // === VERTICAL OFFSET (same as before, only vertical input) ===
    let offset = BASE_OFFSET;

    // move ghost further away as you drag up
    offset += up * 0.3;

    // bring ghost closer as you drag down
    offset -= down * 0.3;

    // clamp vertical
    offset = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, offset));
    fingerOffset = offset;

    // === HORIZONTAL OFFSET (new) ===
    // dx is signed: left < 0, right > 0
    let hOffset = dx * 0.3; // scale how fast it moves sideways

    // clamp horizontal
    if (hOffset >  H_MAX_OFFSET) hOffset =  H_MAX_OFFSET;
    if (hOffset < -H_MAX_OFFSET) hOffset = -H_MAX_OFFSET;

    offsetX = hOffset;

      // --- keep the ghost following the finger/mouse anywhere on page ---
    // --- keep the ghost following the finger/mouse anywhere on page ---
    if (ghost){
      ghost.style.left = e.clientX + 'px';
      ghost.style.top  = e.clientY + 'px';
      ghost.style.transform = `
        translate(
          calc(-50% + ${offsetX}px),
          calc(-50% - ${fingerOffset}px)
        )
      `;
    }

    // --- live preview on the board (Classic) ---
    const rect   = board.getBoundingClientRect();
    const startXBoard = rect.left + PAD;
    const startYBoard = rect.top  + PAD;
    const step   = CELL + GAP;

    // pointer in grid units, using the SAME offsets as the ghost
    const gx = ((e.clientX + offsetX) - startXBoard) / step;
    const gy = ((e.clientY - fingerOffset) - startYBoard) / step;



      clearHover();

      const m = piece._shape || shapeFromPiece(piece);
      const w = m ? m[0].length : 0;
      const h = m ? m.length    : 0;

      // center-anchored majority snap (works for odd & even widths/heights)
      const anchorC = Math.floor(gx - (w - 1) / 2);
      const anchorR = Math.floor(gy - (h - 1) / 2);
            const ok = (m && m[0]) ? canPlace(m, anchorR, anchorC) : false;
      if (!ok) { return; } // only draw preview when legal
// Simulate placing the shape on the current board to see which lines would clear
const sim = Array.from({length: ROWS}, (_, r) =>
  Array.from({length: COLS}, (_, c) =>
    cellEls[idx(r,c)].classList.contains('filled') ? 1 : 0
  )
);

const fullRow = new Array(ROWS).fill(false);
const fullCol = new Array(COLS).fill(false);

// Apply the preview shape into the simulated board
for (let r = 0; r < m.length; r++){
  for (let c = 0; c < m[0].length; c++){
    if (!m[r][c]) continue;
    const rr = anchorR + r, cc = anchorC + c;
    if (rr<0 || cc<0 || rr>=ROWS || cc>=COLS) continue;
    sim[rr][cc] = 1;
  }
}

// Find rows that would become full
for (let r = 0; r < ROWS; r++){
  if (sim[r].every(v => v === 1)) {
    fullRow[r] = true;
  }
}

// Find columns that would become full
for (let c = 0; c < COLS; c++){
  let colFull = true;
  for (let r = 0; r < ROWS; r++){
    if (sim[r][c] !== 1){
      colFull = false;
      break;
    }
  }
  if (colFull) {
    fullCol[c] = true;
  }
}

      const color = {
        fill: piece.dataset.fill,
        stroke: piece.dataset.stroke,
        glow: piece.dataset.glow,
        glowInset: piece.dataset.glowInset
      };

      for (let r = 0; r < (m ? m.length : 0); r++){
        for (let c = 0; c < (m ? m[0].length : 0); c++){
          if (!m[r][c]) continue;
          const rr = anchorR + r, cc = anchorC + c;
          if (rr<0||cc<0||rr>=ROWS||cc>=COLS) continue;
const cell = cellEls[idx(rr,cc)];
if (!cell || cell.classList.contains('filled')) continue;
cell.classList.add(ok ? 'hover-ok' : 'hover-bad');
cell.style.setProperty('--fill',   color.fill);
cell.style.setProperty('--stroke', color.stroke);

// Extra glow if this cell is on a row or column that will clear
if (fullRow[rr] || fullCol[cc]) {
  cell.classList.add('about-to-clear');
}

// (no about-to-clear here – we’ll glow real filled cells below)

// === NEW: make all existing filled cells in any full row/col glow ===
for (let r = 0; r < ROWS; r++){
  for (let c = 0; c < COLS; c++){
    if (!fullRow[r] && !fullCol[c]) continue; // only lines that will clear
    const cell = cellEls[idx(r,c)];
    if (!cell) continue;

    // Only glow real placed blocks, not empty board squares
    if (cell.classList.contains('filled')) {
      cell.classList.add('about-to-clear');
    }
  }
}

// Extra glow if this cell is on a row or column that will clear
if (fullRow[rr] || fullCol[cc]) {
  cell.classList.add('about-to-clear');
}
// After painting the hover, make every cell in any full row/col glow
for (let r = 0; r < ROWS; r++){
  for (let c = 0; c < COLS; c++){
    if (!fullRow[r] && !fullCol[c]) continue;
    const cell = cellEls[idx(r,c)];
    if (cell) {
      cell.classList.add('about-to-clear');
    }
  }
}


        }
      }
            // NEW: make all existing filled cells in any full row/col glow
      for (let r = 0; r < ROWS; r++){
        for (let c = 0; c < COLS; c++){
          if (!fullRow[r] && !fullCol[c]) continue;  // only lines that will clear
          const cell2 = cellEls[idx(r,c)];
          if (cell2 && cell2.classList.contains('filled')) {
            cell2.classList.add('about-to-clear');
          }
        }
      }

    });

    piece.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;

      // remove ghost & restore original piece visibility
      if (ghost){ ghost.remove(); ghost = null; }
      piece.style.opacity = '';

      // --- place on the board if valid (center-anchored, same ≥50% rule) ---
      const rectUp   = board.getBoundingClientRect();
      const startXUp = rectUp.left + PAD;
      const startYUp = rectUp.top  + PAD;
      const stepUp   = CELL + GAP;

const gxUp = ((e.clientX + offsetX)      - startXUp) / stepUp;
const gyUp = ((e.clientY - fingerOffset) - startYUp) / stepUp;


      const mUp = piece._shape || shapeFromPiece(piece);
      const wUp = mUp ? mUp[0].length : 0;
      const hUp = mUp ? mUp.length    : 0;

      const anchorUpC = Math.floor(gxUp - (wUp - 1) / 2);
      const anchorUpR = Math.floor(gyUp - (hUp - 1) / 2);

      clearHover();

      if (mUp && mUp[0] && canPlace(mUp, anchorUpR, anchorUpC)) {
        const colorUp = {
          fill: piece.dataset.fill,
          stroke: piece.dataset.stroke,
          glow: piece.dataset.glow,
          glowInset: piece.dataset.glowInset
        };
        place(mUp, anchorUpR, anchorUpC, colorUp);
        window.clearFullLines();
        piece.remove();
        if (document.querySelectorAll('#bfTrayClassic .slot > .bfmini-piece').length === 0) {
          refillTrayClassic();
        }
      } else {
        // invalid drop; just restore the piece
        piece.style.opacity = '';
      }
    });
  }
  window.enableDrag = enableDrag;

  // Expose initClassicDnD to be called when Classic screen is shown
  window.initClassicDnD = function() {
    // Re-enable drag for all existing pieces
    const classicTray = document.getElementById('bfTrayClassic');
    if (classicTray && window.enableDrag) {
      classicTray.querySelectorAll('.bfmini-piece').forEach(p => {
        if (!p._dndBound) {
          window.enableDrag(p);
          p._dndBound = true;
        }
      });
    }
  };

  function refillTrayClassic(){
    const classicTray = document.getElementById('bfTrayClassic');
    if (!classicTray) return;

    const slots = Array.from(classicTray.querySelectorAll('.slot'));

    // How many pieces are already on the tray?
    const existingPieces = classicTray.querySelectorAll('.bfmini-piece').length;
    // Only enforce the guarantee when the tray is fully empty
    const enforceGuarantee = (existingPieces === 0);

    const shapesForSlots = new Array(slots.length).fill(null);
    let hasPlayable = false;

    // First pass: pick shapes for empty slots
    slots.forEach((slot, i) => {
      if (slot.firstElementChild && slot.querySelector('.bfmini-piece')) return;

      const shape = window.weightedRandomShape();
      shapesForSlots[i] = shape;

      if (enforceGuarantee && !hasPlayable && shapeCanFitAnywhere(shape)) {
        hasPlayable = true;
      }
    });

    // If we're doing a full refill and none of the chosen shapes can fit, force one that can.
    if (enforceGuarantee && !hasPlayable) {
      const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
      const playable = allShapes.filter(s => shapeCanFitAnywhere(s));

      if (playable.length){
        // Put a guaranteed-playable shape into the first empty slot
        for (let i = 0; i < slots.length; i++){
          const slot = slots[i];
          if (slot.firstElementChild && slot.querySelector('.bfmini-piece')) continue;
          shapesForSlots[i] = playable[(Math.random()*playable.length)|0];
          hasPlayable = true;
          break;
        }
      }
    }

    // Second pass: actually build the pieces in the DOM
    slots.forEach((slot, i) => {
      if (slot.firstElementChild && slot.querySelector('.bfmini-piece')) return;
      slot.innerHTML = '';

      const shape = shapesForSlots[i] || window.weightedRandomShape();
      const color = (window.safeNextColor ? window.safeNextColor() : window.safeNextColor());
      const scale = autoScaleForShape(shape);
      const piece = makePiece(shape, color, scale);
      piece.dataset.slot = slot.dataset.slot;
      slot.appendChild(piece);
    });
  }

  // --- Classic tray guarantee self-tests (debug only, console output) ---
  function classicRefillSelfTestOnce(label){
    const classicTray = document.getElementById('bfTrayClassic');
    if (!classicTray) {
      console.warn('classicRefillSelfTestOnce: #bfTrayClassic not found');
      return;
    }
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    const anyShapeFits = allShapes.some(shape => shapeCanFitAnywhere(shape));

    console.group(label || 'Classic tray guarantee — single refill');
    console.log('shapeCanFitAnywhere exists?', typeof shapeCanFitAnywhere === 'function');
    console.log('refillTrayClassic uses shapeCanFitAnywhere?', /shapeCanFitAnywhere/.test(refillTrayClassic.toString()));
    console.log('Any shape fits on current board?', anyShapeFits);

    // Empty the tray, then do one guaranteed refill using the real function
    classicTray.querySelectorAll('.bfmini-piece').forEach(p => p.remove());
    refillTrayClassic();

    const trayPieces = Array.from(classicTray.querySelectorAll('.bfmini-piece'));
    const trayShapes = trayPieces
      .map(p => p.dataset.shape ? JSON.parse(p.dataset.shape) : null)
      .filter(Boolean);

    const trayHasPlayable = trayShapes.some(shape => shapeCanFitAnywhere(shape));
    console.log('Tray has at least one playable shape?', trayHasPlayable);

    if (anyShapeFits && !trayHasPlayable){
      console.warn('❌ Guarantee FAILED: board had at least one playable shape but tray has none.');
    } else if (anyShapeFits && trayHasPlayable){
      console.log('✅ Guarantee PASSED: tray includes a playable shape.');
    } else if (!anyShapeFits){
      console.log('ℹ️ Board is already dead: no shape can fit anywhere, guarantee not required.');
    }

    console.groupEnd();
  }

  function classicRefillStressTest(iterations = 50){
    const classicTray = document.getElementById('bfTrayClassic');
    if (!classicTray) {
      console.warn('classicRefillStressTest: #bfTrayClassic not found');
      return;
    }
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    const anyShapeFits = allShapes.some(shape => shapeCanFitAnywhere(shape));

    console.group('Classic tray guarantee — stress test');
    console.log('iterations:', iterations);
    console.log('shapeCanFitAnywhere exists?', typeof shapeCanFitAnywhere === 'function');
    console.log('refillTrayClassic uses shapeCanFitAnywhere?', /shapeCanFitAnywhere/.test(refillTrayClassic.toString()));
    console.log('Any shape fits on current board at start?', anyShapeFits);

    let failures = 0;

    for (let i = 0; i < iterations; i++){
      // Empty tray and refill with the real function
      classicTray.querySelectorAll('.bfmini-piece').forEach(p => p.remove());
      refillTrayClassic();

      const trayPieces = Array.from(classicTray.querySelectorAll('.bfmini-piece'));
      const trayShapes  = trayPieces
        .map(p => p.dataset.shape ? JSON.parse(p.dataset.shape) : null)
        .filter(Boolean);

      const trayHasPlayable = trayShapes.some(shape => shapeCanFitAnywhere(shape));
      if (anyShapeFits && !trayHasPlayable) failures++;
    }

    console.log('Total failures (board had playable shapes but tray did not):', failures);
    if (anyShapeFits && failures === 0){
      console.log('✅ Guarantee held for all', iterations, 'refills.');
    } else if (anyShapeFits){
      console.warn('❌ Guarantee failed', failures, 'times out of', iterations);
    } else {
      console.log('ℹ️ Board is dead for the test start state; no guarantee expected.');
    }

    console.groupEnd();
  }

  // expose for manual use from DevTools
  window.classicRefillSelfTestOnce = classicRefillSelfTestOnce;
  window.classicRefillStressTest   = classicRefillStressTest;

  // Expose refillTrayClassic on window for external access
  window.refillTrayClassic = refillTrayClassic;

  // Seed the Classic tray
  refillTrayClassic();
});

// Safety shim: if someone calls refillTrayClassic() from outside Classic scope
if (!window.refillTrayClassic) {
  window.refillTrayClassic = function(){
    const _ct = document.getElementById('bfTrayClassic');
    if (!_ct) return;
    const slots = Array.from(_ct.querySelectorAll('.slot'));
    slots.forEach(slot=>{
      if (slot.querySelector('.bfmini-piece')) return;
      slot.innerHTML = '';
      const shape = window.weightedRandomShape();
      const color = (window.safeNextColor ? window.safeNextColor() : (window.PALETTE||[])[0] || {fill:'',stroke:'',glow:'',glowInset:''});
      const scale = window.autoScaleForShape(shape);
      // Note: makePiece is not accessible here, so this shim may not work fully
      // This is a fallback only
    });
    _ct.querySelectorAll('.bfmini-piece').forEach(p=>{
      (window.enableDrag || (()=>{}))(p);
    });
  };
}

// Helper function for syncing tray from home
window.syncClassicTrayFromHome = function(){
  const src = document.getElementById('bfTrayHome') || document.getElementById('bfTray');
  const dst = document.getElementById('bfTrayClassic');
  if (!src || !dst) return;
  dst.innerHTML = src.innerHTML; // simple 1:1 copy of current pieces
};