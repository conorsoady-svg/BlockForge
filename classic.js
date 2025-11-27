/* ===== CLASSIC.JS - Classic game screen (#screen-classic-grid) logic ===== */
// Show the Classic grid-only screen
window.openClassicGrid = function () {
  // Stop Tetris if running (tStop is defined in tetris.js)
  if (typeof tStop === 'function') {
    tStop();
  }
  
  // Reset score when starting Classic mode
  if (typeof window.resetClassicScore === 'function') {
    window.resetClassicScore();
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
// Returns the number of lines cleared (rows + columns)
window.clearFullLinesWithCount = function(){
  const board = document.getElementById('classicBoard');
  if (!board) return 0;

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
  if (!fullRows.length && !fullCols.length) return 0;

  // Track lines cleared for perfect tray system
  const totalCleared = fullRows.length + fullCols.length;
  if (typeof window.trackLinesClearedClassic === 'function') {
    window.trackLinesClearedClassic(totalCleared);
  }
  
  // Check if board is now empty (perfect opportunity window should end)
  setTimeout(() => {
    if (typeof gameState !== 'undefined' && gameState.perfectOpportunityWindow) {
      const filledCount = cells.filter(c => c.classList.contains('filled')).length;
      if (filledCount === 0 || filledCount <= 3) {
        // Board is cleared or almost cleared - end perfect opportunity window
        gameState.perfectOpportunityWindow = null;
        if (window.DEBUG_PERFECT_TRAY) {
          console.log(`[Perfect Opportunity] ✅ Board cleared! Window ended.`);
        }
      }
    }
  }, 300);

  // Mark cells for clearing animation
  fullRows.forEach(r=>{ for(let c=0;c<COLS;c++) cells[idx(r,c)]?.classList.add('clearing'); });
  fullCols.forEach(c=>{ for(let r=0;r<ROWS;r++) cells[idx(r,c)]?.classList.add('clearing'); });

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
  
  return totalCleared;
};

// Legacy wrapper for compatibility
window.clearFullLines = function(){
  window.clearFullLinesWithCount();
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
  // Clear temporary hover previews (ghost cells)
  const hoverEls = board.querySelectorAll(
    '.cell.preview, .cell.hover-ok, .cell.hover-bad'
  );
  hoverEls.forEach(el => {
    el.classList.remove('preview','hover-ok','hover-bad');

    // Only wipe colours on *temporary* preview cells.
    // Real placed blocks keep their colours.
    if (!el.classList.contains('filled')) {
      el.style.removeProperty('--fill');
      el.style.removeProperty('--stroke');
      el.style.removeProperty('--glow');
      el.style.removeProperty('--glow-inset');
      el.style.removeProperty('--about-glow');
      

    }
  });

  // Clear highlighted rows/cols and restore original colours + glow
  const hlEls = board.querySelectorAll('.cell.about-to-clear');
  hlEls.forEach(el => {
    el.classList.remove('about-to-clear');

    if (el.dataset.origFillHighlight){
      el.style.setProperty('--fill', el.dataset.origFillHighlight);
      delete el.dataset.origFillHighlight;
    }
    if (el.dataset.origStrokeHighlight){
      el.style.setProperty('--stroke', el.dataset.origStrokeHighlight);
      delete el.dataset.origStrokeHighlight;
    }
    if (el.dataset.origGlowHighlight){
      el.style.setProperty('--glow', el.dataset.origGlowHighlight);
      delete el.dataset.origGlowHighlight;
    }
    if (el.dataset.origGlowInsetHighlight){
      el.style.setProperty('--glow-inset', el.dataset.origGlowInsetHighlight);
      delete el.dataset.origGlowInsetHighlight;
        el.style.removeProperty('--about-glow');

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
      // Highlight all existing filled blocks in any row/col that will clear,
      // tinting both colour *and glow* to the dragged piece.
      for (let r = 0; r < ROWS; r++){
        for (let c = 0; c < COLS; c++){
          if (!fullRow[r] && !fullCol[c]) continue;   // only lines that will clear

          const cell2 = cellEls[idx(r,c)];
          if (!cell2 || !cell2.classList.contains('filled')) continue;

          // Store original colours + glow once so we can restore later
          if (!cell2.dataset.origFillHighlight){
            const curFill      = cell2.style.getPropertyValue('--fill');
            const curStroke    = cell2.style.getPropertyValue('--stroke');
            const curGlow      = cell2.style.getPropertyValue('--glow');
            const curGlowInset = cell2.style.getPropertyValue('--glow-inset');

            if (curFill)      cell2.dataset.origFillHighlight        = curFill;
            if (curStroke)    cell2.dataset.origStrokeHighlight      = curStroke;
            if (curGlow)      cell2.dataset.origGlowHighlight        = curGlow;
            if (curGlowInset) cell2.dataset.origGlowInsetHighlight   = curGlowInset;
          }

          // Use the dragged piece's colour & glow
          const glowCol      = color.glow      || color.stroke || color.fill;
          const glowInsetCol = color.glowInset || color.stroke || color.fill;

          cell2.style.setProperty('--fill',        color.fill);
          cell2.style.setProperty('--stroke',      color.stroke);
          cell2.style.setProperty('--glow',        glowCol);
          cell2.style.setProperty('--glow-inset',  glowInsetCol);
          cell2.style.setProperty('--about-glow',  glowCol); 
          cell2.classList.add('about-to-clear');
          
        }
      }

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
  cell.style.setProperty('--about-glow', color.glow || color.stroke || color.fill);
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
        
        // Count piece squares for scoring
        const pieceSquares = mUp.flat().filter(v => v === 1).length;
        
        place(mUp, anchorUpR, anchorUpC, colorUp);
        
        // Score: add piece placement points
        if (typeof onPiecePlaced === 'function') {
          onPiecePlaced(pieceSquares);
        }
        
        // Clear lines and get count for scoring
        const linesCleared = window.clearFullLinesWithCount ? 
          window.clearFullLinesWithCount() : 
          (window.clearFullLines(), 0);
        
        // Score: add line clear points
        let linePointsWithCombo = 0;
        if (linesCleared > 0 && typeof onLinesCleared === 'function') {
          linePointsWithCombo = onLinesCleared(linesCleared);
        }
        
        // Check if board is completely empty (full clear bonus) - after line clear animation
        if (linesCleared > 0) {
          setTimeout(() => {
            const filledCount = Array.from(cellEls).filter(c => c.classList.contains('filled')).length;
            if (filledCount === 0) {
              if (typeof onBoardCleared === 'function') {
                onBoardCleared(linePointsWithCombo);
              }
            }
          }, 280); // After 240ms line clear animation
        }
        
        piece.remove();
        if (document.querySelectorAll('#bfTrayClassic .slot > .bfmini-piece').length === 0) {
          // Tray is empty - update combo and refill
          if (typeof onTrayComplete === 'function') {
            onTrayComplete();
          }
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

  // ===== GAME STATE TRACKING FOR GOOD TRAY & PERFECT TRAY SYSTEMS =====
  
  // Track game progression state
  let gameState = {
    trayCount: 0,           // Number of trays generated so far
    linesCleared: 0,        // Total lines cleared (rows + columns)
    lastClearCount: 0,      // Lines cleared in the most recent clear event
    perfectTrayUsed: false, // Has the player received a perfect opportunity yet?
    perfectTrayCount: 0,    // How many perfect opportunities have been given
    totalLinesClearedEver: 0, // Total lines cleared across all games (for 20+ line milestone)
    // Perfect tray sequence state (3+3 system)
    perfectSequence: null,  // { phase: 1|2, boardStateAfterFirst3: array, second3Shapes: array } or null
    // ===== SCORING SYSTEM =====
    score: 0,                    // Current score
    currentComboCount: 0,        // Current combo streak (trays with clears)
    currentTrayHadClear: false,  // Did current tray have any line clear?
    piecesPlacedThisTray: 0      // How many pieces placed in current tray
  };

  // Increment tray count when a new tray is generated
  function incrementTrayCount() {
    gameState.trayCount++;
    // Reset tray-specific tracking
    gameState.currentTrayHadClear = false;
    gameState.piecesPlacedThisTray = 0;
  }

  // Track lines cleared (called from clearFullLines or similar)
  function trackLinesCleared(count) {
    gameState.linesCleared += count;
    gameState.lastClearCount = count;
    gameState.totalLinesClearedEver += count;
    
    // Mark that this tray had a clear (for combo system)
    if (count > 0) {
      gameState.currentTrayHadClear = true;
    }
  }

  // Expose tracking function globally so clearFullLines can call it
  window.trackLinesClearedClassic = trackLinesCleared;
  
  // ===== SCORING SYSTEM =====
  
  // Animated score counter state
  let displayedScore = 0;
  let scoreAnimationId = null;
  
  // Update score display with fast counting animation
  function updateScoreDisplay() {
    const scoreEl = document.getElementById('classicScoreDisplay');
    if (!scoreEl) return;
    
    const targetScore = gameState.score;
    const diff = targetScore - displayedScore;
    
    if (diff <= 0) {
      displayedScore = targetScore;
      scoreEl.textContent = displayedScore.toLocaleString();
      return;
    }
    
    // Cancel any existing animation
    if (scoreAnimationId) {
      cancelAnimationFrame(scoreAnimationId);
    }
    
    // Calculate increment speed based on difference
    const duration = 400; // ms
    const startTime = performance.now();
    const startScore = displayedScore;
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out for smooth finish
      const eased = 1 - Math.pow(1 - progress, 3);
      displayedScore = Math.floor(startScore + diff * eased);
      scoreEl.textContent = displayedScore.toLocaleString();
      
      if (progress < 1) {
        scoreAnimationId = requestAnimationFrame(animate);
      } else {
        displayedScore = targetScore;
        scoreEl.textContent = displayedScore.toLocaleString();
        scoreAnimationId = null;
      }
    }
    
    scoreAnimationId = requestAnimationFrame(animate);
  }
  
  // Show floating popup that flies to score
  function showPopup(text, type = 'points') {
    const scoreEl = document.getElementById('classicScoreDisplay');
    const board = document.getElementById('classicBoard');
    if (!scoreEl || !board) return;
    
    const popup = document.createElement('div');
    popup.className = 'classic-popup';
    if (type === 'combo') popup.classList.add('combo');
    if (type === 'full-clear') popup.classList.add('full-clear');
    popup.textContent = text;
    
    // Position between row 1 and row 2 (about 1.5 rows from top), centered horizontally
    const boardRect = board.getBoundingClientRect();
    const scoreRect = scoreEl.getBoundingClientRect();
    const rowHeight = boardRect.height / 8; // 8 rows
    
    popup.style.position = 'fixed';
    popup.style.left = (boardRect.left + boardRect.width / 2) + 'px';
    popup.style.top = (boardRect.top + rowHeight * 1.5) + 'px'; // Between row 1 and 2
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '2000';
    popup.style.pointerEvents = 'none';
    
    document.body.appendChild(popup);
    
    // Calculate target position (score element)
    const targetX = scoreRect.left + scoreRect.width / 2;
    const targetY = scoreRect.top + scoreRect.height / 2;
    
    // Wait a moment, then animate flying to score
    setTimeout(() => {
      popup.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      popup.style.left = targetX + 'px';
      popup.style.top = targetY + 'px';
      popup.style.transform = 'translate(-50%, -50%) scale(0.5)';
      popup.style.opacity = '0.7';
    }, 400); // Stay visible for 400ms before flying
    
    // Update score when popup reaches target, then remove
    setTimeout(() => {
      updateScoreDisplay();
      popup.remove();
    }, 700); // 400ms wait + 300ms fly
  }
  
  // Delayed score update - score updates when popup hits
  let pendingScoreUpdate = false;
  
  // Calculate line clear points: 24 * (4 ^ (linesCleared - 1))
  function calculateLinePoints(linesCleared) {
    if (linesCleared <= 0) return 0;
    return 24 * Math.pow(4, linesCleared - 1);
  }
  
  // Get combo multiplier (starts at 3 consecutive trays with clears)
  function getComboMultiplier() {
    if (gameState.currentComboCount < 3) return 1;
    return gameState.currentComboCount;
  }
  
  // Called when a piece is successfully placed
  // pieceSquares = number of cells in the piece
  function onPiecePlaced(pieceSquares) {
    gameState.piecesPlacedThisTray++;
    
    // Add piece placement points (base points = number of squares)
    gameState.score += pieceSquares;
    // Immediate update for piece points (no popup)
    updateScoreDisplay();
  }
  
  // Called after lines are cleared for a placement
  // linesCleared = number of rows + columns cleared
  // Returns the points earned (for popup display)
  function onLinesCleared(linesCleared) {
    if (linesCleared <= 0) return 0;
    
    const linePoints = calculateLinePoints(linesCleared);
    const comboMultiplier = getComboMultiplier();
    const totalLinePoints = linePoints * comboMultiplier;
    
    // Add line clear points to score (display updates when popup hits)
    gameState.score += totalLinePoints;
    
    // Show points popup - score updates when it reaches the score display
    showPopup(`+${totalLinePoints.toLocaleString()}`);
    
    // Show combo popup if applicable
    if (comboMultiplier >= 3) {
      setTimeout(() => showPopup(`Combo x${comboMultiplier}`, 'combo'), 400);
    }
    
    return totalLinePoints;
  }
  
  // Called when board is completely cleared
  // linePointsWithCombo = the line points already earned this placement (with combo)
  function onBoardCleared(linePointsWithCombo) {
    // Full board clear bonus = 5x the line points with combo
    const fullClearBonus = linePointsWithCombo * 5;
    gameState.score += fullClearBonus;
    
    // Show full clear popup - score updates when it reaches the score display
    setTimeout(() => showPopup(`PERFECT! +${fullClearBonus.toLocaleString()}`, 'full-clear'), 300);
    
    return fullClearBonus;
  }
  
  // Called when tray is emptied (all 3 pieces placed) - update combo
  function onTrayComplete() {
    if (gameState.currentTrayHadClear) {
      // Tray had at least one clear - increment or maintain combo
      gameState.currentComboCount++;
    } else {
      // Tray had no clears - reset combo
      gameState.currentComboCount = 0;
    }
  }
  
  // Reset score for new game
  function resetScore() {
    gameState.score = 0;
    gameState.currentComboCount = 0;
    gameState.currentTrayHadClear = false;
    gameState.piecesPlacedThisTray = 0;
    displayedScore = 0;
    if (scoreAnimationId) {
      cancelAnimationFrame(scoreAnimationId);
      scoreAnimationId = null;
    }
    updateScoreDisplay();
  }
  
  // Expose reset function globally
  window.resetClassicScore = resetScore;

  // Get current board fill ratio (0 = empty, 1 = full)
  function getBoardFillRatio() {
    const totalCells = ROWS * COLS;
    let filledCells = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (cellEls[idx(r,c)].classList.contains('filled')) {
          filledCells++;
        }
      }
    }
    return filledCells / totalCells;
  }

  // Determine game phase based on tray count, board fill, and lines cleared
  // Phase is primarily driven by tray count, with board state as a modifier
  function getGamePhase() {
    const fillRatio = getBoardFillRatio();
    const trayCount = gameState.trayCount;
    const linesCleared = gameState.linesCleared;

    // Early game: first ~10-15 trays, or low tray count with open board
    if (trayCount <= 15 || (trayCount <= 25 && fillRatio < 0.3)) {
      return "early";
    }

    // Late game: many trays played (>50) OR high tray count with crowded board
    if (trayCount > 50 || (trayCount > 35 && fillRatio > 0.7)) {
      return "late";
    }

    // Mid game: everything else
    return "mid";
  }

  // Calculate probability of generating a GOOD tray (clears multiple lines with obvious fits)
  function getGoodTrayProbability(phase, fillRatio) {
    let baseProbability = 0;

    // Base probability by phase - increased to make good trays more frequent
    switch (phase) {
      case "early":
        // Early game: higher chance to hook the player
        baseProbability = 0.20; // 20% base (increased)
        // Boost if board is open
        if (fillRatio < 0.3) {
          baseProbability = 0.28; // Up to 28% for very open boards
        } else if (fillRatio < 0.5) {
          baseProbability = 0.24; // 24% for moderately open boards
        }
        break;

      case "mid":
        // Mid game: moderate chance
        baseProbability = 0.12; // 12% base (increased)
        // Boost if board is open or just cleared a lot
        if (fillRatio < 0.4) {
          baseProbability = 0.20; // Up to 20% for open boards
        } else if (gameState.lastClearCount >= 3) {
          // Just cleared multiple lines - slight boost
          baseProbability = 0.15;
        }
        break;

      case "late":
        // Late game: rare but not impossible
        baseProbability = 0.05; // 5% base (increased)
        // Slight boost only if board is very open (unlikely in late game)
        if (fillRatio < 0.3) {
          baseProbability = 0.08;
        }
        break;
    }

    // Universal boost for very open boards (regardless of phase)
    if (fillRatio < 0.25) {
      baseProbability = Math.max(baseProbability, 0.22);
    }

    // Cap at reasonable maximum
    return Math.min(baseProbability, 0.30);
  }

  // Calculate probability of generating a PERFECT OPPORTUNITY (single-tray or multi-tray board clear)
  function getPerfectOpportunityProbability(phase, fillRatio) {
    // Prevent perfect trays in first 5 trays
    if (gameState.trayCount < 5) {
      return 0;
    }
    
    // Perfect opportunity probability starts high in early game, then drops below good tray after first use
    let baseProbability = 0;
    
    switch (phase) {
      case "early":
        // Early game: high chance (but less than good tray)
        baseProbability = 0.12; // 12% base
        if (fillRatio < 0.3) {
          baseProbability = 0.18; // Up to 18% for very open boards
        } else if (fillRatio < 0.5) {
          baseProbability = 0.15; // 15% for moderately open boards
        }
        break;
        
      case "mid":
        // Mid game: moderate chance
        baseProbability = 0.06; // 6% base
        if (fillRatio < 0.4) {
          baseProbability = 0.10; // Up to 10% for open boards
        }
        break;
        
      case "late":
        // Late game: rare but not impossible
        baseProbability = 0.02; // 2% base
        if (fillRatio < 0.3) {
          baseProbability = 0.04; // Slight boost for open boards
        }
        break;
    }
    
    // BOOST: If player has cleared 20+ lines total, increase probability significantly
    if (gameState.totalLinesClearedEver >= 20) {
      const milestoneBoost = Math.min(0.15, baseProbability * 1.5); // Up to 15% boost or 1.5x, whichever is smaller
      baseProbability += milestoneBoost;
    }
    
    // If perfect opportunity has been used, reduce below good tray probability
    if (gameState.perfectTrayUsed) {
      baseProbability *= 0.3; // 70% reduction - should be lower than good tray now
    }
    
    // Additional reduction based on how many times it's been used
    if (gameState.perfectTrayCount > 0) {
      baseProbability *= Math.pow(0.7, gameState.perfectTrayCount); // 30% reduction per use
    }
    
    // Minimum probability (never impossible, but rare after multiple uses)
    // This ensures perfect trays can still appear randomly by luck
    return Math.max(baseProbability, 0.005); // 0.5% minimum (pure luck chance)
  }

  // ===== SIMULATION HELPERS FOR CLEAR GUARANTEE =====
  
  // Clone a board state (2D array)
  function cloneBoardState(S) {
    return S.map(row => [...row]);
  }

  // Check if a board state has at least one full row or column
  function hasFullLine(boardState, ROWS, COLS) {
    // Check rows
    for (let r = 0; r < ROWS; r++) {
      if (boardState[r].every(v => v === 1)) return true;
    }
    // Check columns
    for (let c = 0; c < COLS; c++) {
      let colFull = true;
      for (let r = 0; r < ROWS; r++) {
        if (boardState[r][c] !== 1) {
          colFull = false;
          break;
        }
      }
      if (colFull) return true;
    }
    return false;
  }

  // Check if a shape can be placed on a board state at position (R, C)
  function canPlaceOnState(boardState, shape, R, C, ROWS, COLS) {
    if (!shape || !shape[0]) return false;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (!shape[r][c]) continue;
        const rr = R + r, cc = C + c;
        if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) return false;
        if (boardState[rr][cc] === 1) return false; // cell already filled
      }
    }
    return true;
  }

  // Simulate placing a shape on a board state (returns new state)
  function simulatePlace(boardState, shape, R, C, ROWS, COLS) {
    const newState = cloneBoardState(boardState);
    if (!shape || !shape[0]) return newState;
    
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (!shape[r][c]) continue;
        const rr = R + r, cc = C + c;
        if (rr >= 0 && cc >= 0 && rr < ROWS && cc < COLS) {
          newState[rr][cc] = 1;
        }
      }
    }
    return newState;
  }

  // Recursively check if 3 pieces can clear at least one row/column
  // Returns true if any sequence of placements results in a full line
  function canClearWithThreePieces(boardState, shapes, ROWS, COLS, depth = 0) {
    // Base case: if we've placed all 3 pieces, check if we have a full line
    if (depth >= shapes.length) {
      return hasFullLine(boardState, ROWS, COLS);
    }

    const currentShape = shapes[depth];
    if (!currentShape || !currentShape[0]) {
      // Skip invalid shapes and continue with next piece
      return canClearWithThreePieces(boardState, shapes, ROWS, COLS, depth + 1);
    }

    // Try all possible placements of the current piece
    for (let R = 0; R < ROWS; R++) {
      for (let C = 0; C < COLS; C++) {
        if (!canPlaceOnState(boardState, currentShape, R, C, ROWS, COLS)) continue;

        // Place the piece and get new board state
        const newState = simulatePlace(boardState, currentShape, R, C, ROWS, COLS);
        
        // Check if this placement alone creates a full line
        if (hasFullLine(newState, ROWS, COLS)) {
          return true;
        }

        // Recursively try placing remaining pieces
        if (canClearWithThreePieces(newState, shapes, ROWS, COLS, depth + 1)) {
          return true;
        }
      }
    }

    // If current piece can't be placed anywhere, try skipping it (shouldn't happen in practice)
    return canClearWithThreePieces(boardState, shapes, ROWS, COLS, depth + 1);
  }

  // Count filled cells in a board state
  function countFilledCells(boardState, ROWS, COLS) {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (boardState[r][c] === 1) count++;
      }
    }
    return count;
  }

  // Count how many lines would be cleared by a board state
  function countClearedLines(boardState, ROWS, COLS) {
    let count = 0;
    // Count full rows
    for (let r = 0; r < ROWS; r++) {
      if (boardState[r].every(v => v === 1)) count++;
    }
    // Count full columns
    for (let c = 0; c < COLS; c++) {
      let colFull = true;
      for (let r = 0; r < ROWS; r++) {
        if (boardState[r][c] !== 1) {
          colFull = false;
          break;
        }
      }
      if (colFull) count++;
    }
    return count;
  }

  // ===== CAVITY / HOLE DETECTION =====
  
  // Get all empty cells in a board state
  function getEmptyCells(boardState, ROWS, COLS) {
    const empty = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (boardState[r][c] === 0) {
          empty.push({ r, c });
        }
      }
    }
    return empty;
  }

  // Find connected empty regions (cavities) using flood fill
  function findCavities(boardState, ROWS, COLS) {
    const visited = Array.from({length: ROWS}, () => Array(COLS).fill(false));
    const cavities = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (boardState[r][c] === 0 && !visited[r][c]) {
          // Found a new empty cell, flood fill to find connected region
          const cavity = [];
          const stack = [{ r, c }];
          visited[r][c] = true;

          while (stack.length > 0) {
            const { r: cr, c: cc } = stack.pop();
            cavity.push({ r: cr, c: cc });

            // Check neighbors (4-directional)
            const neighbors = [
              { r: cr - 1, c: cc },
              { r: cr + 1, c: cc },
              { r: cr, c: cc - 1 },
              { r: cr, c: cc + 1 }
            ];

            for (const n of neighbors) {
              if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS &&
                  boardState[n.r][n.c] === 0 && !visited[n.r][n.c]) {
                visited[n.r][n.c] = true;
                stack.push(n);
              }
            }
          }

          if (cavity.length > 0) {
            cavities.push(cavity);
          }
        }
      }
    }

    return cavities;
  }

  // Check if a shape exactly matches a cavity (same cells)
  function shapeMatchesCavity(shape, shapeR, shapeC, cavity, ROWS, COLS) {
    const shapeCells = new Set();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          const br = shapeR + r;
          const bc = shapeC + c;
          if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
            shapeCells.add(`${br},${bc}`);
          }
        }
      }
    }

    if (shapeCells.size !== cavity.length) return false;

    const cavitySet = new Set(cavity.map(c => `${c.r},${c.c}`));
    for (const cell of shapeCells) {
      if (!cavitySet.has(cell)) return false;
    }

    return true;
  }

  // Check if a shape placement covers a cavity well (at least 80% of cavity cells)
  function shapeCoversCavity(shape, shapeR, shapeC, cavity, ROWS, COLS) {
    const shapeCells = new Set();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          const br = shapeR + r;
          const bc = shapeC + c;
          if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
            shapeCells.add(`${br},${bc}`);
          }
        }
      }
    }

    const cavitySet = new Set(cavity.map(c => `${c.r},${c.c}`));
    let covered = 0;
    for (const cell of shapeCells) {
      if (cavitySet.has(cell)) covered++;
    }

    return covered >= Math.ceil(cavity.length * 0.8); // At least 80% coverage
  }

  // Count isolated single empty cells (bad - indicates awkward gaps)
  function countIsolatedCells(boardState, ROWS, COLS) {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (boardState[r][c] === 0) {
          // Check if this empty cell is isolated (all neighbors are filled)
          const neighbors = [
            { r: r - 1, c },
            { r: r + 1, c },
            { r, c: c - 1 },
            { r, c: c + 1 }
          ];
          let allFilled = true;
          for (const n of neighbors) {
            if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
              if (boardState[n.r][n.c] === 0) {
                allFilled = false;
                break;
              }
            }
          }
          if (allFilled && neighbors.some(n => n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS)) {
            count++;
          }
        }
      }
    }
    return count;
  }

  // ===== GAP PATTERN DETECTION FOR OBVIOUS FITS =====
  
  // Find gaps that would complete a row if filled (prioritize 1-3 cell gaps for obvious fits)
  function findRowCompletionGaps(boardState, ROWS, COLS) {
    const gaps = [];
    for (let r = 0; r < ROWS; r++) {
      const row = boardState[r];
      const emptyCount = row.filter(v => v === 0).length;
      if (emptyCount > 0 && emptyCount <= 6) { // Row is close to full (1-6 empty cells)
        const emptyCells = [];
        for (let c = 0; c < COLS; c++) {
          if (row[c] === 0) emptyCells.push({ r, c });
        }
        // Higher priority for fewer empty cells (1-3 = very obvious, 4-6 = still good)
        const priority = emptyCount <= 3 ? 20 - emptyCount : 10 - emptyCount;
        gaps.push({
          type: 'row',
          row: r,
          cells: emptyCells,
          count: emptyCount,
          priority: priority,
          isNearComplete: emptyCount <= 3 // Flag for very obvious fits
        });
      }
    }
    // Sort by priority (most obvious first)
    return gaps.sort((a, b) => b.priority - a.priority);
  }

  // Find gaps that would complete a column if filled (prioritize 1-3 cell gaps)
  function findColumnCompletionGaps(boardState, ROWS, COLS) {
    const gaps = [];
    for (let c = 0; c < COLS; c++) {
      let emptyCount = 0;
      const emptyCells = [];
      for (let r = 0; r < ROWS; r++) {
        if (boardState[r][c] === 0) {
          emptyCount++;
          emptyCells.push({ r, c });
        }
      }
      if (emptyCount > 0 && emptyCount <= 6) { // Column is close to full
        // Higher priority for fewer empty cells
        const priority = emptyCount <= 3 ? 20 - emptyCount : 10 - emptyCount;
        gaps.push({
          type: 'column',
          col: c,
          cells: emptyCells,
          count: emptyCount,
          priority: priority,
          isNearComplete: emptyCount <= 3
        });
      }
    }
    // Sort by priority
    return gaps.sort((a, b) => b.priority - a.priority);
  }

  // Check if a shape exactly matches a gap pattern (for obvious fits)
  function shapeMatchesGapPattern(shape, shapeR, shapeC, gap, ROWS, COLS) {
    const shapeCells = new Set();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          const br = shapeR + r;
          const bc = shapeC + c;
          if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
            shapeCells.add(`${br},${bc}`);
          }
        }
      }
    }

    if (shapeCells.size !== gap.cells.length) return false;

    const gapSet = new Set(gap.cells.map(c => `${c.r},${c.c}`));
    for (const cell of shapeCells) {
      if (!gapSet.has(cell)) return false;
    }

    return true;
  }

  // Find all line-completion gaps (rows and columns that are close to full)
  function findAllLineCompletionGaps(boardState, ROWS, COLS) {
    const rowGaps = findRowCompletionGaps(boardState, ROWS, COLS);
    const colGaps = findColumnCompletionGaps(boardState, ROWS, COLS);
    // Sort by priority (fewer empty cells = higher priority)
    return [...rowGaps, ...colGaps].sort((a, b) => b.priority - a.priority);
  }

  // Find shapes that match a specific cell count and pattern
  function findShapesByCellCount(allShapes, cellCount) {
    return allShapes.filter(shape => {
      let count = 0;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[0].length; c++) {
          if (shape[r][c]) count++;
        }
      }
      return count === cellCount;
    });
  }

  // Check if a shape is a rectangle (all rows have same width, all columns have same height)
  function isRectangleShape(shape) {
    if (!shape || !shape[0]) return false;
    const width = shape[0].length;
    const height = shape.length;
    let filledCount = 0;
    for (let r = 0; r < height; r++) {
      if (shape[r].length !== width) return false;
      for (let c = 0; c < width; c++) {
        if (shape[r][c]) filledCount++;
      }
    }
    return filledCount === width * height; // All cells are filled
  }

  // Check if a shape is an L-shape
  function isLShape(shape) {
    if (!shape || !shape[0]) return false;
    let filledCount = 0;
    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          filledCount++;
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }
    if (filledCount < 3) return false;
    // L-shape has a corner - check if it forms an L pattern
    const width = maxC - minC + 1;
    const height = maxR - minR + 1;
    // L-shape: either width or height is 2, and total cells is width*height - 1
    return (width === 2 || height === 2) && filledCount === width * height - 1;
  }

  // Check if a shape is a plus/cross shape
  function isPlusShape(shape) {
    if (!shape || !shape[0]) return false;
    const centerR = Math.floor(shape.length / 2);
    const centerC = Math.floor(shape[0].length / 2);
    if (!shape[centerR] || !shape[centerR][centerC]) return false; // Center must be filled
    
    let filledCount = 0;
    // Check if it forms a plus (center + 4 arms)
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          filledCount++;
          // For a plus, cells should be at center or in cross pattern
          const isCenter = (r === centerR && c === centerC);
          const isHorizontal = (r === centerR);
          const isVertical = (c === centerC);
          if (!isCenter && !isHorizontal && !isVertical) return false;
        }
      }
    }
    return filledCount === 5; // Plus shape has 5 cells
  }

  // Build a perfect tray from near-complete lines (the most obvious fits)
  function buildPerfectTrayFromNearCompleteLines(boardState, ROWS, COLS) {
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    if (allShapes.length < 3) return null;

    const lineGaps = findAllLineCompletionGaps(boardState, ROWS, COLS);
    
    // Prioritize gaps that are 1-3 cells away (most obvious)
    const nearCompleteGaps = lineGaps.filter(g => g.isNearComplete && g.count <= 3);
    
    if (nearCompleteGaps.length === 0) return null;

    // SPECIAL CASE: Look for opportunities to clear multiple columns/rows at once
    // (e.g., 3 columns that can be cleared with L-shape + small piece + rectangle)
    const columnGaps = nearCompleteGaps.filter(g => g.type === 'column').slice(0, 3);
    const rowGaps = nearCompleteGaps.filter(g => g.type === 'row').slice(0, 3);
    
    // Try to find a combo that clears 3 columns (like the user's example)
    if (columnGaps.length >= 3) {
      // Find shapes that match these column gaps
      const columnMatches = [];
      for (const gap of columnGaps) {
        for (const shape of allShapes) {
          for (let R = 0; R < ROWS; R++) {
            for (let C = 0; C < COLS; C++) {
              if (shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
                columnMatches.push({ shape, gap });
                break;
              }
            }
            if (columnMatches.some(m => m.shape === shape && m.gap === gap)) break;
          }
        }
      }
      
      if (columnMatches.length >= 3) {
        // Try combinations of 3 shapes that match 3 different columns
        const usedGaps = new Set();
        const candidateShapes = [];
        for (const match of columnMatches) {
          if (!usedGaps.has(match.gap) && !candidateShapes.includes(match.shape)) {
            candidateShapes.push(match.shape);
            usedGaps.add(match.gap);
            if (candidateShapes.length >= 3) break;
          }
        }
        
        if (candidateShapes.length === 3) {
          const result = simulateTrayPlacement(boardState, candidateShapes, ROWS, COLS);
          if (result && result.clearedLines >= 3) {
            return candidateShapes;
          }
        }
      }
    }
    
    // Try to find shapes that exactly match these gaps (must clear at least 1 line)
    const candidateShapes = [];
    const usedGaps = new Set();
    
    for (const gap of nearCompleteGaps.slice(0, 5)) { // Try up to 5 gaps
      if (usedGaps.has(gap)) continue;
      
      // Find shapes that match this gap exactly
      const matchingShapes = [];
      for (const shape of allShapes) {
        if (candidateShapes.includes(shape)) continue;
        for (let R = 0; R < ROWS; R++) {
          for (let C = 0; C < COLS; C++) {
            if (shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
              matchingShapes.push(shape);
              break;
            }
          }
          if (matchingShapes.length > 0) break;
        }
      }
      
      if (matchingShapes.length > 0) {
        candidateShapes.push(matchingShapes[0]); // Use first match
        usedGaps.add(gap);
        if (candidateShapes.length >= 3) break;
      }
    }

    // If we found shapes matching gaps, fill remaining slots intelligently
    if (candidateShapes.length > 0) {
      // Try to complete the tray with shapes that help clear more lines
      while (candidateShapes.length < 3) {
        // Look for shapes that match remaining near-complete gaps
        let foundMatch = false;
        for (const gap of nearCompleteGaps) {
          if (usedGaps.has(gap)) continue;
          for (const shape of allShapes) {
            if (candidateShapes.includes(shape)) continue;
            for (let R = 0; R < ROWS; R++) {
              for (let C = 0; C < COLS; C++) {
                if (shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
                  candidateShapes.push(shape);
                  usedGaps.add(gap);
                  foundMatch = true;
                  break;
                }
              }
              if (foundMatch) break;
            }
            if (foundMatch) break;
          }
          if (foundMatch) break;
        }
        
        if (!foundMatch) {
          // Fill with a random shape that's placeable
          const placeable = allShapes.filter(s => {
            if (candidateShapes.includes(s)) return false;
            for (let R = 0; R < ROWS; R++) {
              for (let C = 0; C < COLS; C++) {
                if (canPlaceOnState(boardState, s, R, C, ROWS, COLS)) return true;
              }
            }
            return false;
          });
          if (placeable.length > 0) {
            candidateShapes.push(placeable[Math.floor(Math.random() * placeable.length)]);
          } else {
            break;
          }
        }
      }

      if (candidateShapes.length === 3) {
        // Verify this tray actually clears at least 1 line (guarantee requirement)
        const result = simulateTrayPlacement(boardState, candidateShapes, ROWS, COLS);
        if (result && result.clearedLines >= 1) {
          // Prefer 2+ line clears, but accept 1+ for near-complete line matches
          if (result.clearedLines >= 2 || result.exactLineGapMatches >= 2) {
            return candidateShapes;
          }
        }
      }
    }

    return null;
  }

  // Build a simple satisfying combo (2 rectangles + square, or similar obvious clears)
  function buildSimpleSatisfyingCombo(boardState, ROWS, COLS) {
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    if (allShapes.length < 3) return null;

    // Look for: 2x 6-block rectangles (horizontal or vertical) + 4-block square
    const rect6Shapes = [];
    for (const s of allShapes) {
      let count = 0;
      let width = 0, height = 0;
      for (let r = 0; r < s.length; r++) {
        for (let c = 0; c < s[0].length; c++) {
          if (s[r][c]) {
            count++;
            width = Math.max(width, c + 1);
            height = Math.max(height, r + 1);
          }
        }
      }
      // Check if it's a solid rectangle of 6 cells
      if (count === 6) {
        // Verify it's actually a rectangle (all cells in the bounding box are filled)
        let isRect = true;
        for (let r = 0; r < height && isRect; r++) {
          for (let c = 0; c < width && isRect; c++) {
            if (!s[r] || !s[r][c]) isRect = false;
          }
        }
        if (isRect && (width === 6 || height === 6)) {
          rect6Shapes.push(s);
        }
      }
    }

    const square4Shapes = [];
    for (const s of allShapes) {
      let count = 0;
      for (let r = 0; r < s.length; r++) {
        for (let c = 0; c < s[0].length; c++) {
          if (s[r][c]) count++;
        }
      }
      // 2x2 square = 4 cells
      if (count === 4 && s.length >= 2 && s[0].length >= 2) {
        // Check if it's actually a square
        let isSquare = true;
        for (let r = 0; r < 2 && isSquare; r++) {
          for (let c = 0; c < 2 && isSquare; c++) {
            if (!s[r] || !s[r][c]) isSquare = false;
          }
        }
        if (isSquare) {
          square4Shapes.push(s);
        }
      }
    }

    if (rect6Shapes.length >= 2 && square4Shapes.length >= 1) {
      // Try combinations of 2 rectangles + 1 square
      for (let i = 0; i < Math.min(10, rect6Shapes.length); i++) {
        for (let j = i + 1; j < Math.min(10, rect6Shapes.length); j++) {
          for (let k = 0; k < Math.min(5, square4Shapes.length); k++) {
            const combo = [rect6Shapes[i], rect6Shapes[j], square4Shapes[k]];
            const result = simulateTrayPlacement(boardState, combo, ROWS, COLS);
            if (result && result.clearedLines >= 2) {
              return combo;
            }
          }
        }
      }
    }

    // Also try: 3 rectangles that together clear lines
    if (rect6Shapes.length >= 3) {
      for (let i = 0; i < Math.min(5, rect6Shapes.length); i++) {
        for (let j = i + 1; j < Math.min(5, rect6Shapes.length); j++) {
          for (let k = j + 1; k < Math.min(5, rect6Shapes.length); k++) {
            const combo = [rect6Shapes[i], rect6Shapes[j], rect6Shapes[k]];
            const result = simulateTrayPlacement(boardState, combo, ROWS, COLS);
            if (result && result.clearedLines >= 2) {
              return combo;
            }
          }
        }
      }
    }

    // Fallback: any 3 shapes that together clear 2+ lines
    for (let attempt = 0; attempt < 50; attempt++) {
      const combo = [];
      for (let i = 0; i < 3; i++) {
        combo.push(allShapes[Math.floor(Math.random() * allShapes.length)]);
      }
      const result = simulateTrayPlacement(boardState, combo, ROWS, COLS);
      if (result && result.clearedLines >= 2) {
        return combo;
      }
    }

    return null;
  }

  // Simulate clearing lines from a board state (returns new state with lines removed)
  function simulateClearLines(boardState, ROWS, COLS) {
    const newState = cloneBoardState(boardState);
    
    // Clear full rows
    for (let r = 0; r < ROWS; r++) {
      if (newState[r].every(v => v === 1)) {
        for (let c = 0; c < COLS; c++) newState[r][c] = 0;
      }
    }
    
    // Clear full columns
    for (let c = 0; c < COLS; c++) {
      let colFull = true;
      for (let r = 0; r < ROWS; r++) {
        if (newState[r][c] !== 1) {
          colFull = false;
          break;
        }
      }
      if (colFull) {
        for (let r = 0; r < ROWS; r++) newState[r][c] = 0;
      }
    }
    
    return newState;
  }

  // Score a single piece placement considering cavity fits, line-completion gaps, and line clears
  function scorePlacement(boardState, shape, R, C, cavities, lineGaps, ROWS, COLS) {
    if (!canPlaceOnState(boardState, shape, R, C, ROWS, COLS)) {
      return { score: -1, clearedLines: 0, cavityMatch: false, completesLine: false, lineGapMatch: false };
    }

    const testState = simulatePlace(boardState, shape, R, C, ROWS, COLS);
    const clearedLines = countClearedLines(testState, ROWS, COLS);
    const completesLine = clearedLines > 0;

    // Check for line-completion gap matches (HIGHEST PRIORITY - these are glaringly obvious)
    let lineGapMatch = false;
    let exactLineGapMatch = false;
    for (const gap of lineGaps) {
      if (shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
        exactLineGapMatch = true;
        lineGapMatch = true;
        break; // Exact match to a line-completion gap is the best possible fit
      }
    }

    // Check for cavity matches
    let cavityMatch = false;
    let exactCavityMatch = false;
    for (const cavity of cavities) {
      if (shapeMatchesCavity(shape, R, C, cavity, ROWS, COLS)) {
        exactCavityMatch = true;
        cavityMatch = true;
        break;
      } else if (shapeCoversCavity(shape, R, C, cavity, ROWS, COLS)) {
        cavityMatch = true;
      }
    }

    // Calculate score with heavy emphasis on obvious fits
    let score = 0;
    
    // MASSIVE bonus for exact line-completion gap matches (these are the most obvious)
    if (exactLineGapMatch) {
      score += 100; // Huge bonus - this is a perfect obvious fit
    }
    
    // Heavy weight for clearing lines
    score += clearedLines * 30; // Increased from 15 to 30
    
    // Big bonus for exact cavity matches
    if (exactCavityMatch) {
      score += 40; // Increased from 25
    } else if (cavityMatch) {
      score += 15; // Increased from 10
    }
    
    // Bonus for completing a line
    if (completesLine) {
      score += 20; // Increased from 5
    }

    return {
      score,
      clearedLines,
      cavityMatch: exactCavityMatch || cavityMatch,
      exactCavityMatch,
      lineGapMatch: exactLineGapMatch || lineGapMatch,
      exactLineGapMatch,
      completesLine,
      placement: { r: R, c: C },
      newState: testState
    };
  }

  // Try all placements for a shape and return top N candidates
  function getTopPlacements(boardState, shape, cavities, lineGaps, ROWS, COLS, topN = 10) {
    const candidates = [];

    for (let R = 0; R < ROWS; R++) {
      for (let C = 0; C < COLS; C++) {
        const result = scorePlacement(boardState, shape, R, C, cavities, lineGaps, ROWS, COLS);
        if (result.score >= 0) {
          candidates.push(result);
        }
      }
    }

    // Sort by score descending - prioritize line gap matches, then high scores
    candidates.sort((a, b) => {
      // Exact line gap matches always come first
      if (a.exactLineGapMatch && !b.exactLineGapMatch) return -1;
      if (!a.exactLineGapMatch && b.exactLineGapMatch) return 1;
      return b.score - a.score;
    });
    return candidates.slice(0, topN);
  }

  // Comprehensive simulation: try all permutations and find best result
  function simulateTrayPlacement(boardState, shapes, ROWS, COLS) {
    const cavities = findCavities(boardState, ROWS, COLS);
    const lineGaps = findAllLineCompletionGaps(boardState, ROWS, COLS); // Find gaps that complete lines
    const initialFilled = countFilledCells(boardState, ROWS, COLS);
    let bestResult = null;
    let bestScore = -1;

    // Generate all 6 permutations of piece order (3! = 6)
    function permute(arr) {
      if (arr.length <= 1) return [arr];
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const perms = permute(rest);
        for (const p of perms) {
          result.push([arr[i], ...p]);
        }
      }
      return result;
    }

    const permutations = permute([0, 1, 2]);

    // Try each permutation
    for (const perm of permutations) {
      const orderedShapes = perm.map(i => shapes[i]);
      let currentState = cloneBoardState(boardState);
      let totalClearedLines = 0;
      let totalScore = 0;
      const placements = [];
      let cavityMatches = 0;
      let lineGapMatches = 0;
      let lineCompletions = 0;
      let valid = true;

      // For each piece in this order, try top placements
      for (let i = 0; i < orderedShapes.length; i++) {
        const shape = orderedShapes[i];
        if (!shape || !shape[0]) continue;

        // Get top placement candidates for this piece
        // Recalculate gaps after each placement (they change as we clear lines)
        const currentCavities = findCavities(currentState, ROWS, COLS);
        const currentLineGaps = findAllLineCompletionGaps(currentState, ROWS, COLS);
        const candidates = getTopPlacements(currentState, shape, currentCavities, currentLineGaps, ROWS, COLS, 12);

        if (candidates.length === 0) {
          valid = false;
          break;
        }

        // Try the best candidate (prioritize line gap matches)
        const bestCandidate = candidates[0];
        placements.push({
          shapeIndex: perm[i],
          placement: bestCandidate.placement,
          clearedLines: bestCandidate.clearedLines,
          cavityMatch: bestCandidate.cavityMatch,
          exactCavityMatch: bestCandidate.exactCavityMatch,
          lineGapMatch: bestCandidate.lineGapMatch,
          exactLineGapMatch: bestCandidate.exactLineGapMatch,
          completesLine: bestCandidate.completesLine
        });

        totalClearedLines += bestCandidate.clearedLines;
        totalScore += bestCandidate.score;
        if (bestCandidate.cavityMatch) cavityMatches++;
        if (bestCandidate.lineGapMatch) lineGapMatches++;
        if (bestCandidate.completesLine) lineCompletions++;

        // Update state after placement and clear lines
        currentState = simulatePlace(currentState, shape, bestCandidate.placement.r, bestCandidate.placement.c, ROWS, COLS);
        if (bestCandidate.clearedLines > 0) {
          currentState = simulateClearLines(currentState, ROWS, COLS);
        }
      }

      if (!valid) continue;

      // Calculate final metrics
      const finalFilled = countFilledCells(currentState, ROWS, COLS);
      const cellsFreed = initialFilled - finalFilled;
      const isolatedCells = countIsolatedCells(currentState, ROWS, COLS);

      // Final score calculation with HEAVY emphasis on 3+ line clears
      let finalScore = totalScore;
      finalScore += cellsFreed * 2; // Points for freeing cells
      finalScore -= isolatedCells * 3; // Penalty for leaving isolated cells

      // MASSIVE bonuses for clearing multiple lines (especially 3+)
      if (totalClearedLines >= 2) finalScore += 50; // Increased from 20
      if (totalClearedLines >= 3) finalScore += 150; // MASSIVE bonus for 3+ lines (increased from 30)
      if (totalClearedLines >= 4) finalScore += 200; // Even bigger for 4+
      if (cellsFreed >= 10) finalScore += 20; // Increased from 15
      
      // Huge bonus for line gap matches (obvious fits)
      finalScore += lineGapMatches * 50; // Each line gap match is worth a lot
      
      // Bonus for exact cavity matches
      finalScore += placements.filter(p => p.exactCavityMatch).length * 30;

      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestResult = {
          placements,
          clearedLines: totalClearedLines,
          cellsFreed,
          cavityMatches,
          lineGapMatches,
          exactLineGapMatches: placements.filter(p => p.exactLineGapMatch).length,
          lineCompletions,
          exactCavityMatches: placements.filter(p => p.exactCavityMatch).length,
          score: finalScore,
          isolatedCells
        };
      }
    }

    return bestResult;
  }

  // Search for a "good tray" - 3 pieces that together clear multiple lines or significantly reduce filled cells
  // Returns array of 3 shapes if found, null otherwise
  function findGoodTray(boardState, ROWS, COLS) {
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    if (allShapes.length < 3) return null;

    const MAX_ATTEMPTS = 400; // Increased for better search
    const fillRatio = getBoardFillRatio();
    
    // FIRST: Aggressively search for 3+ line clears (highest priority)
    // (No logging here to avoid spam)
    for (let attempt = 0; attempt < Math.min(100, MAX_ATTEMPTS / 4); attempt++) {
      const candidateShapes = [];
      for (let i = 0; i < 3; i++) {
        candidateShapes.push(allShapes[Math.floor(Math.random() * allShapes.length)]);
      }
      
      // Quick placeability check
      let allPlaceable = true;
      for (const shape of candidateShapes) {
        let canPlace = false;
        for (let R = 0; R < ROWS && !canPlace; R++) {
          for (let C = 0; C < COLS && !canPlace; C++) {
            if (canPlaceOnState(boardState, shape, R, C, ROWS, COLS)) {
              canPlace = true;
            }
          }
        }
        if (!canPlace) {
          allPlaceable = false;
          break;
        }
      }
      if (!allPlaceable) continue;
      
      const result = simulateTrayPlacement(boardState, candidateShapes, ROWS, COLS);
      if (result && result.clearedLines >= 3) {
        if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
          console.log(`[Perfect Tray] ✅ Found 3+ line clear! ${result.clearedLines} lines cleared`);
        }
        return candidateShapes;
      }
    }
    
    // PRIORITY 1: Build from near-complete lines (1-3 cells away) - MOST OBVIOUS
    const nearCompleteTray = buildPerfectTrayFromNearCompleteLines(boardState, ROWS, COLS);
    if (nearCompleteTray) {
      const result = simulateTrayPlacement(boardState, nearCompleteTray, ROWS, COLS);
      // Must clear at least 1 line (guarantee requirement)
        if (result && result.clearedLines >= 1) {
          if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
            console.log(`[Perfect Tray] ✅ Built from near-complete lines! ${result.clearedLines} lines cleared, ${result.exactLineGapMatches} exact gap matches`);
          }
          return nearCompleteTray;
        }
    }
    
    // PRIORITY 2: Try to find shapes that match line-completion gaps (obvious fits)
    const lineGaps = findAllLineCompletionGaps(boardState, ROWS, COLS);
    if (lineGaps.length > 0) {
      // We have line gaps - try to find shapes that match them
      const gapMatchingShapes = [];
      for (const gap of lineGaps.slice(0, 5)) { // Check top 5 priority gaps
        for (const shape of allShapes) {
          // Try all positions to see if shape matches this gap
          for (let R = 0; R < ROWS; R++) {
            for (let C = 0; C < COLS; C++) {
              if (shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
                gapMatchingShapes.push({ shape, gap });
                break;
              }
            }
            if (gapMatchingShapes.some(m => m.shape === shape && m.gap === gap)) break;
          }
        }
      }
      
      // If we found shapes matching gaps, prioritize trying combinations with them
      if (gapMatchingShapes.length >= 2) {
        // Try combinations that include gap-matching shapes first
        for (let attempt = 0; attempt < Math.min(100, MAX_ATTEMPTS / 3); attempt++) {
          const candidateShapes = [];
          const usedGaps = new Set();
          
          // Pick 2-3 shapes that match gaps
          for (let i = 0; i < Math.min(3, gapMatchingShapes.length); i++) {
            const match = gapMatchingShapes[Math.floor(Math.random() * gapMatchingShapes.length)];
            if (!usedGaps.has(match.gap) && !candidateShapes.includes(match.shape)) {
              candidateShapes.push(match.shape);
              usedGaps.add(match.gap);
            }
          }
          
          // Fill remaining slots with shapes that help complete more lines
          while (candidateShapes.length < 3) {
            // Prefer shapes that match remaining gaps
            let foundMatch = false;
            for (const gap of lineGaps) {
              if (usedGaps.has(gap)) continue;
              for (const shape of allShapes) {
                if (candidateShapes.includes(shape)) continue;
                for (let R = 0; R < ROWS; R++) {
                  for (let C = 0; C < COLS; C++) {
                    if (shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
                      candidateShapes.push(shape);
                      usedGaps.add(gap);
                      foundMatch = true;
                      break;
                    }
                  }
                  if (foundMatch) break;
                }
                if (foundMatch) break;
              }
              if (foundMatch) break;
            }
            if (!foundMatch) {
              candidateShapes.push(allShapes[Math.floor(Math.random() * allShapes.length)]);
            }
          }
          
          const result = simulateTrayPlacement(boardState, candidateShapes, ROWS, COLS);
          if (result && result.clearedLines >= 2) {
            // Check acceptance criteria - MUST clear at least 1 line (guarantee requirement)
            if (result.clearedLines >= 1 && (
                result.clearedLines >= 3 || 
                (result.exactLineGapMatches >= 2 && result.clearedLines >= 2) ||
                (result.exactLineGapMatches >= 1 && result.clearedLines >= 2 && result.score >= 100)
            )) {
              if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
                console.log(`[Perfect Tray] ✅ Found via gap-matching search! ${result.clearedLines} lines, ${result.exactLineGapMatches} gap matches`);
              }
              return candidateShapes;
            }
          }
        }
      }
    }
    
    // PRIORITY 3: Simple satisfying combos (2 rectangles + square, etc.) - always satisfying
    const simpleCombo = buildSimpleSatisfyingCombo(boardState, ROWS, COLS);
    if (simpleCombo) {
      const result = simulateTrayPlacement(boardState, simpleCombo, ROWS, COLS);
      // Must clear at least 1 line (guarantee requirement)
      if (result && result.clearedLines >= 1) {
        if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
          console.log(`[Perfect Tray] ✅ Built simple satisfying combo! ${result.clearedLines} lines cleared`);
        }
        return simpleCombo;
      }
    }
    
    // Stricter thresholds based on board state
    const MIN_CLEARED_LINES = 2; // Must clear at least 2 lines total
    const MIN_CELLS_FREED = fillRatio > 0.5 ? 12 : 10; // Higher threshold for crowded boards
    const MIN_SCORE = 50; // Minimum total score from our scoring system
    const MIN_CAVITY_OR_LINE = 2; // At least 2 pieces must either fill cavity or complete line

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Randomly sample 3 shapes
      const candidateShapes = [];
      for (let i = 0; i < 3; i++) {
        const randomShape = allShapes[Math.floor(Math.random() * allShapes.length)];
        candidateShapes.push(randomShape);
      }

      // Quick check: all 3 shapes must be placeable
      let allPlaceable = true;
      for (const shape of candidateShapes) {
        let canPlace = false;
        for (let R = 0; R < ROWS && !canPlace; R++) {
          for (let C = 0; C < COLS && !canPlace; C++) {
            if (canPlaceOnState(boardState, shape, R, C, ROWS, COLS)) {
              canPlace = true;
            }
          }
        }
        if (!canPlace) {
          allPlaceable = false;
          break;
        }
      }

      if (!allPlaceable) continue;

      // Comprehensive simulation with all permutations
      const result = simulateTrayPlacement(boardState, candidateShapes, ROWS, COLS);
      if (!result) continue;

      // ULTRA-STRICT ACCEPTANCE CRITERIA - prioritize glaringly obvious fits
      const initialFilled = countFilledCells(boardState, ROWS, COLS);
      
      // ULTRA-STRICT: Perfect trays MUST clear at least 1 line (guarantee requirement)
      if (result.clearedLines === 0) {
        continue; // Reject any tray that doesn't clear at least 1 line
      }
      
      // PRIORITY 1: 3+ line clears are ALWAYS accepted (these are the most satisfying)
      if (result.clearedLines >= 3) {
        if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
          console.log(`[Perfect Tray] ✅ Accepted! ${result.clearedLines} lines cleared (3+ line clear - highest priority)`);
        }
        return candidateShapes;
      }
      
      // PRIORITY 2: 2+ line gap matches (obvious fits that complete lines) - these are glaringly obvious
      if (result.exactLineGapMatches >= 2 && result.clearedLines >= 2) {
        if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
          console.log(`[Perfect Tray] ✅ Accepted! ${result.exactLineGapMatches} exact line gap matches, ${result.clearedLines} lines cleared (obvious fits)`);
        }
        return candidateShapes;
      }
      
      // PRIORITY 3: At least 1 line gap match + 2+ lines cleared
      if (result.exactLineGapMatches >= 1 && result.clearedLines >= 2) {
        // Also need good overall fit
        const piecesWithFit = result.lineCompletions + result.cavityMatches + result.lineGapMatches;
        if (piecesWithFit >= 2 && result.score >= 100) {
          if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
            console.log(`[Perfect Tray] ✅ Accepted! ${result.exactLineGapMatches} line gap match, ${result.clearedLines} lines cleared, score: ${result.score.toFixed(1)}`);
          }
          return candidateShapes;
        }
      }
      
      // PRIORITY 4: 2+ lines cleared with obvious fits (line gap matches or exact cavity matches)
      if (result.clearedLines >= 2) {
        const obviousFits = result.exactLineGapMatches + result.exactCavityMatches;
        if (obviousFits >= 2) {
          // At least 2 pieces have obvious fits
          if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
            console.log(`[Perfect Tray] ✅ Accepted! ${result.clearedLines} lines cleared, ${obviousFits} obvious fits (exact matches)`);
          }
          return candidateShapes;
        }
      }
      
      // PRIORITY 5: Standard criteria (2+ lines cleared with good fits) - stricter now
      const clearsEnough = result.clearedLines >= MIN_CLEARED_LINES;
      
      // At least 2 pieces must either complete a line, match a line gap, or match a cavity
      const piecesWithFit = result.lineCompletions + result.cavityMatches + result.lineGapMatches;
      const hasGoodFits = piecesWithFit >= MIN_CAVITY_OR_LINE;
      
      // Higher score threshold for non-obvious fits
      const hasGoodScore = result.score >= 150; // Increased from 120
      
      // Don't leave too many isolated cells
      const notTooMessy = result.isolatedCells <= 2 || result.clearedLines >= 2;

      if (clearsEnough && hasGoodFits && hasGoodScore && notTooMessy) {
        // Log why it was accepted (for debugging) - only in verbose mode
        if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
          const reasons = [];
          if (result.clearedLines >= MIN_CLEARED_LINES) reasons.push(`${result.clearedLines} lines cleared`);
          if (result.cellsFreed >= MIN_CELLS_FREED) reasons.push(`${result.cellsFreed} cells freed`);
          if (result.exactLineGapMatches > 0) reasons.push(`${result.exactLineGapMatches} exact line gap matches`);
          if (result.exactCavityMatches > 0) reasons.push(`${result.exactCavityMatches} exact cavity matches`);
          if (result.cavityMatches > 0) reasons.push(`${result.cavityMatches} cavity fits`);
          if (result.lineCompletions > 0) reasons.push(`${result.lineCompletions} line completions`);
          console.log(`[Perfect Tray] ✅ Accepted! Score: ${result.score.toFixed(1)} | ${reasons.join(', ')}`);
        }
        return candidateShapes;
      }
    }

    // No good tray found within attempts
    if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
      console.log(`[Good Tray] ❌ No good tray found after ${MAX_ATTEMPTS} attempts`);
    }
    return null;
  }

  // ===== NEW PERFECT TRAY SYSTEM (3+3 = 6 pieces to clear board) =====
  
  // Find all cavities (connected empty regions) on the board
  function findAllCavities(boardState, ROWS, COLS) {
    const cavities = findCavities(boardState, ROWS, COLS);
    // Filter to reasonable sizes (1-9 cells) and sort by size (smaller = more obvious)
    return cavities
      .filter(c => c.length >= 1 && c.length <= 9)
      .sort((a, b) => a.length - b.length);
  }

  // Find shapes that EXACTLY match a cavity (same cells, same shape)
  function findExactCavityMatches(allShapes, cavity, boardState, ROWS, COLS) {
    const matches = [];
    const cavityCellSet = new Set(cavity.map(c => `${c.r},${c.c}`));
    
    for (const shape of allShapes) {
      // Get shape cell count
      let shapeCellCount = 0;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[0].length; c++) {
          if (shape[r][c]) shapeCellCount++;
        }
      }
      
      // Quick check: shape must have same number of cells as cavity
      if (shapeCellCount !== cavity.length) continue;
      
      // Try all positions
      for (let R = 0; R < ROWS; R++) {
        for (let C = 0; C < COLS; C++) {
          if (!canPlaceOnState(boardState, shape, R, C, ROWS, COLS)) continue;
          
          // Get shape cells at this position
          const shapeCells = [];
          for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
              if (shape[r][c]) {
                shapeCells.push({ r: R + r, c: C + c });
              }
            }
          }
          
          // Check exact match
          if (shapeCells.length !== cavity.length) continue;
          
          let exactMatch = true;
          for (const cell of shapeCells) {
            if (!cavityCellSet.has(`${cell.r},${cell.c}`)) {
              exactMatch = false;
              break;
            }
          }
          
          if (exactMatch) {
            matches.push({
              shape: shape,
              placement: { r: R, c: C },
              cavity: cavity
            });
          }
        }
      }
    }
    
    return matches;
  }

  // Check if board can be cleared with exactly N more pieces (returns the pieces if possible)
  function canClearBoardWithNPieces(boardState, ROWS, COLS, maxPieces) {
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    if (allShapes.length === 0) return null;
    
    const filledCells = countFilledCells(boardState, ROWS, COLS);
    if (filledCells === 0) return []; // Already clear
    
    // Find all cavities
    const cavities = findAllCavities(boardState, ROWS, COLS);
    if (cavities.length === 0) return null; // No cavities = can't place anything
    
    // For each cavity, find shapes that exactly match it
    const cavityMatches = [];
    for (const cavity of cavities) {
      const matches = findExactCavityMatches(allShapes, cavity, boardState, ROWS, COLS);
      if (matches.length > 0) {
        cavityMatches.push({
          cavity: cavity,
          matches: matches
        });
      }
    }
    
    // Try to find a combination of pieces that clears the board
    // Use greedy approach: pick pieces that fill cavities and clear lines
    function tryFillBoard(state, piecesUsed, maxDepth) {
      if (piecesUsed.length > maxDepth) return null;
      
      const filled = countFilledCells(state, ROWS, COLS);
      if (filled === 0) return piecesUsed; // Success!
      
      // Find current cavities
      const currentCavities = findAllCavities(state, ROWS, COLS);
      if (currentCavities.length === 0) return null;
      
      // Try each cavity with matching shapes
      for (const cavity of currentCavities) {
        const matches = findExactCavityMatches(allShapes, cavity, state, ROWS, COLS);
        for (const match of matches) {
          // Place the piece
          let newState = simulatePlace(state, match.shape, match.placement.r, match.placement.c, ROWS, COLS);
          
          // Clear any lines
          if (countClearedLines(newState, ROWS, COLS) > 0) {
            newState = simulateClearLines(newState, ROWS, COLS);
          }
          
          // Recurse
          const result = tryFillBoard(newState, [...piecesUsed, match.shape], maxDepth);
          if (result) return result;
        }
      }
      
      return null;
    }
    
    return tryFillBoard(boardState, [], maxPieces);
  }

  // Check if board is solvable in 6 pieces (3+3 system)
  // Returns { first3: shapes[], second3: shapes[], boardAfterFirst3: state } or null
  function checkBoardSolvableIn6Pieces(boardState, ROWS, COLS) {
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    if (allShapes.length === 0) return null;
    
    const filledCells = countFilledCells(boardState, ROWS, COLS);
    if (filledCells === 0) return null; // Already clear
    
    // Find all cavities and their matches
    const cavities = findAllCavities(boardState, ROWS, COLS);
    const cavityMatches = [];
    for (const cavity of cavities) {
      const matches = findExactCavityMatches(allShapes, cavity, boardState, ROWS, COLS);
      if (matches.length > 0) {
        cavityMatches.push({ cavity, matches });
      }
    }
    
    if (cavityMatches.length < 3) return null; // Not enough cavities to fill
    
    // Try combinations of first 3 pieces
    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    
    for (let i = 0; i < Math.min(cavityMatches.length, 10) && attempts < MAX_ATTEMPTS; i++) {
      for (let j = i + 1; j < Math.min(cavityMatches.length, 10) && attempts < MAX_ATTEMPTS; j++) {
        for (let k = j + 1; k < Math.min(cavityMatches.length, 10) && attempts < MAX_ATTEMPTS; k++) {
          attempts++;
          
          const match1 = cavityMatches[i].matches[0];
          const match2 = cavityMatches[j].matches[0];
          const match3 = cavityMatches[k].matches[0];
          
          // Ensure different shapes
          if (match1.shape === match2.shape || match1.shape === match3.shape || match2.shape === match3.shape) continue;
          
          const first3 = [match1.shape, match2.shape, match3.shape];
          
          // Simulate placing first 3
          let stateAfterFirst3 = cloneBoardState(boardState);
          const placements = [match1.placement, match2.placement, match3.placement];
          
          for (let idx = 0; idx < 3; idx++) {
            if (!canPlaceOnState(stateAfterFirst3, first3[idx], placements[idx].r, placements[idx].c, ROWS, COLS)) {
              // Placement no longer valid after previous placements - need to recalculate
              let found = false;
              for (let R = 0; R < ROWS && !found; R++) {
                for (let C = 0; C < COLS && !found; C++) {
                  if (canPlaceOnState(stateAfterFirst3, first3[idx], R, C, ROWS, COLS)) {
                    stateAfterFirst3 = simulatePlace(stateAfterFirst3, first3[idx], R, C, ROWS, COLS);
                    found = true;
                  }
                }
              }
              if (!found) break;
            } else {
              stateAfterFirst3 = simulatePlace(stateAfterFirst3, first3[idx], placements[idx].r, placements[idx].c, ROWS, COLS);
            }
            
            if (countClearedLines(stateAfterFirst3, ROWS, COLS) > 0) {
              stateAfterFirst3 = simulateClearLines(stateAfterFirst3, ROWS, COLS);
            }
          }
          
          // Check if remaining board can be cleared with 3 more pieces
          const remainingFilled = countFilledCells(stateAfterFirst3, ROWS, COLS);
          if (remainingFilled === 0) {
            // First 3 cleared everything!
            return { first3, second3: [], boardAfterFirst3: stateAfterFirst3 };
          }
          
          const second3 = canClearBoardWithNPieces(stateAfterFirst3, ROWS, COLS, 3);
          if (second3 && second3.length <= 3) {
            // Found a valid 3+3 solution!
            return { first3, second3, boardAfterFirst3: stateAfterFirst3 };
          }
        }
      }
    }
    
    return null;
  }

  // Find first 3 pieces for perfect tray sequence
  function findPerfectTrayFirst3(boardState, ROWS, COLS) {
    const solution = checkBoardSolvableIn6Pieces(boardState, ROWS, COLS);
    if (!solution) return null;
    
    // Store the solution for later
    gameState.perfectSequence = {
      phase: 1,
      boardAfterFirst3: solution.boardAfterFirst3,
      second3Shapes: solution.second3
    };
    
    return solution.first3;
  }

  // Find second 3 pieces for perfect tray sequence (called after player places first 3)
  function findPerfectTraySecond3(boardState, ROWS, COLS) {
    // Find pieces that clear the remaining board
    const pieces = canClearBoardWithNPieces(boardState, ROWS, COLS, 3);
    if (pieces && pieces.length > 0) {
      // Pad to 3 pieces if needed
      while (pieces.length < 3) {
        const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
        // Add a piece that fits a cavity
        const cavities = findAllCavities(boardState, ROWS, COLS);
        for (const cavity of cavities) {
          const matches = findExactCavityMatches(allShapes, cavity, boardState, ROWS, COLS);
          if (matches.length > 0 && !pieces.includes(matches[0].shape)) {
            pieces.push(matches[0].shape);
            break;
          }
        }
        if (pieces.length < 3) {
          // Fallback: add any placeable shape
          for (const shape of allShapes) {
            if (!pieces.includes(shape)) {
              for (let R = 0; R < ROWS; R++) {
                for (let C = 0; C < COLS; C++) {
                  if (canPlaceOnState(boardState, shape, R, C, ROWS, COLS)) {
                    pieces.push(shape);
                    break;
                  }
                }
                if (pieces.length >= 3) break;
              }
            }
            if (pieces.length >= 3) break;
          }
        }
      }
      return pieces.slice(0, 3);
    }
    return null;
  }

  // ===== NEW GOOD TRAY SYSTEM (all 3 pieces must fit exact gaps) =====
  
  // Score how well a shape fits the board (higher = better fit)
  function scoreShapeFit(shape, boardState, ROWS, COLS) {
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    let bestScore = -1000;
    let bestPlacement = null;
    
    for (let R = 0; R < ROWS; R++) {
      for (let C = 0; C < COLS; C++) {
        if (!canPlaceOnState(boardState, shape, R, C, ROWS, COLS)) continue;
        
        let score = 0;
        
        // Simulate placement
        const testState = simulatePlace(boardState, shape, R, C, ROWS, COLS);
        
        // Lines cleared = huge bonus
        const linesCleared = countClearedLines(testState, ROWS, COLS);
        score += linesCleared * 50;
        
        // Check if it fills a cavity exactly
        const cavities = findAllCavities(boardState, ROWS, COLS);
        for (const cavity of cavities) {
          const matches = findExactCavityMatches([shape], cavity, boardState, ROWS, COLS);
          if (matches.length > 0 && matches[0].placement.r === R && matches[0].placement.c === C) {
            score += 100; // Exact cavity match = huge bonus
            break;
          }
        }
        
        // Check if it completes a line gap
        const lineGaps = findAllLineCompletionGaps(boardState, ROWS, COLS);
        for (const gap of lineGaps) {
          if (shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
            score += 80; // Line gap match = big bonus
            break;
          }
        }
        
        // Penalty for creating isolated cells
        const stateAfterClear = linesCleared > 0 ? simulateClearLines(testState, ROWS, COLS) : testState;
        const isolatedCells = countIsolatedCells(stateAfterClear, ROWS, COLS);
        score -= isolatedCells * 20;
        
        // Bonus for reducing board fill
        const fillBefore = countFilledCells(boardState, ROWS, COLS);
        const fillAfter = countFilledCells(stateAfterClear, ROWS, COLS);
        const reduction = fillBefore - fillAfter;
        score += reduction * 5;
        
        if (score > bestScore) {
          bestScore = score;
          bestPlacement = { r: R, c: C };
        }
      }
    }
    
    return { score: bestScore, placement: bestPlacement };
  }

  // Find a GOOD tray - all 3 pieces must fit exact gaps
  function findGoodTray(boardState, ROWS, COLS) {
    const allShapes = Array.isArray(window.SHAPES) ? window.SHAPES : [];
    if (allShapes.length < 3) return null;
    
    const filledCells = countFilledCells(boardState, ROWS, COLS);
    if (filledCells === 0) return null;
    
    // Find all cavities and line gaps
    const cavities = findAllCavities(boardState, ROWS, COLS);
    const lineGaps = findAllLineCompletionGaps(boardState, ROWS, COLS);
    
    // Find shapes that exactly match cavities
    const exactCavityMatches = [];
    for (const cavity of cavities) {
      const matches = findExactCavityMatches(allShapes, cavity, boardState, ROWS, COLS);
      for (const match of matches) {
        exactCavityMatches.push({
          shape: match.shape,
          placement: match.placement,
          type: 'cavity',
          size: cavity.length,
          score: 100 - cavity.length // Smaller cavities = better
        });
      }
    }
    
    // Find shapes that exactly match line gaps
    const exactLineMatches = [];
    for (const gap of lineGaps) {
      for (const shape of allShapes) {
        for (let R = 0; R < ROWS; R++) {
          for (let C = 0; C < COLS; C++) {
            if (canPlaceOnState(boardState, shape, R, C, ROWS, COLS) &&
                shapeMatchesGapPattern(shape, R, C, gap, ROWS, COLS)) {
              exactLineMatches.push({
                shape: shape,
                placement: { r: R, c: C },
                type: 'line',
                size: gap.count,
                score: 80 - gap.count // Smaller gaps = better
              });
              break;
            }
          }
        }
      }
    }
    
    // Combine all exact matches
    const allExactMatches = [...exactCavityMatches, ...exactLineMatches];
    
    // Sort by score (best fits first)
    allExactMatches.sort((a, b) => b.score - a.score);
    
    // Try to pick 3 different shapes that all have exact matches
    if (allExactMatches.length >= 3) {
      const usedShapes = new Set();
      const selectedShapes = [];
      
      for (const match of allExactMatches) {
        if (!usedShapes.has(match.shape) && selectedShapes.length < 3) {
          usedShapes.add(match.shape);
          selectedShapes.push(match.shape);
        }
      }
      
      if (selectedShapes.length === 3) {
        // Verify all 3 are placeable and score well
        let totalScore = 0;
        let allGood = true;
        
        for (const shape of selectedShapes) {
          const fit = scoreShapeFit(shape, boardState, ROWS, COLS);
          if (fit.score < 20) {
            allGood = false;
            break;
          }
          totalScore += fit.score;
        }
        
        if (allGood && totalScore >= 100) {
          return selectedShapes;
        }
      }
    }
    
    // Fallback: Find 3 shapes with best fit scores (even if not exact matches)
    const shapeScores = [];
    for (const shape of allShapes) {
      const fit = scoreShapeFit(shape, boardState, ROWS, COLS);
      if (fit.score > 0 && fit.placement) {
        shapeScores.push({ shape, score: fit.score, placement: fit.placement });
      }
    }
    
    shapeScores.sort((a, b) => b.score - a.score);
    
    // Pick top 3 different shapes with good scores
    const selected = [];
    const usedShapes = new Set();
    
    for (const item of shapeScores) {
      if (!usedShapes.has(item.shape) && selected.length < 3) {
        // Only accept if score is good (not just "placeable")
        if (item.score >= 30) {
          usedShapes.add(item.shape);
          selected.push(item.shape);
        }
      }
    }
    
    if (selected.length === 3) {
      return selected;
    }
    
    return null;
  }

  // Check if we're in a perfect sequence (phase 2 = waiting for second 3)
  function isInPerfectSequence() {
    return gameState.perfectSequence !== null && gameState.perfectSequence.phase === 2;
  }

  // Wrapper for compatibility
  function findPerfectTray(boardState, ROWS, COLS) {
    return findPerfectTrayFirst3(boardState, ROWS, COLS);
  }

  function refillTrayClassic(){
    const classicTray = document.getElementById('bfTrayClassic');
    if (!classicTray) return;

    const slots = Array.from(classicTray.querySelectorAll('.slot'));

    // How many pieces are already on the tray?
    const existingPieces = classicTray.querySelectorAll('.bfmini-piece').length;
    // Only enforce the guarantee when the tray is fully empty
    const enforceGuarantee = (existingPieces === 0);

    // Get current board state for simulation
    const currentBoardState = Array.from({length: ROWS}, (_,r)=> 
      Array.from({length: COLS}, (_,c)=> 
        cellEls[idx(r,c)].classList.contains('filled') ? 1 : 0
      )
    );

    // ===== PERFECT TRAY SYSTEM (3+3 = 6 pieces to clear board) =====
    let perfectTrayShapes = null;
    let inPerfectSequence = isInPerfectSequence();
    
    if (inPerfectSequence) {
      // Phase 2: Generate the second 3 pieces to finish clearing the board
      perfectTrayShapes = findPerfectTraySecond3(currentBoardState, ROWS, COLS);
      if (perfectTrayShapes) {
        console.log(`🎉 PERFECT TRAY Phase 2! (Tray #${gameState.trayCount + 1}) - Final 3 pieces to clear board!`);
        gameState.perfectSequence = null; // End the sequence
      } else {
        // Couldn't find second 3 - end sequence
        console.log(`[Perfect Tray] ⚠️ Could not find second 3 pieces - ending sequence`);
        gameState.perfectSequence = null;
      }
    } else if (enforceGuarantee) {
      // Check if we should start a new perfect tray sequence
      const phase = getGamePhase();
      const fillRatio = getBoardFillRatio();
      const perfectOpportunityProbability = getPerfectOpportunityProbability(phase, fillRatio);

      // Roll for perfect tray
      const roll = Math.random();
      if (roll < perfectOpportunityProbability) {
        // Try to find first 3 pieces that guarantee board can be cleared in 6 total
        perfectTrayShapes = findPerfectTrayFirst3(currentBoardState, ROWS, COLS);
        
        if (perfectTrayShapes) {
          // First 3 found - sequence started
          gameState.perfectTrayUsed = true;
          gameState.perfectTrayCount++;
          gameState.perfectSequence.phase = 2; // Move to phase 2 for next tray
          console.log(`🎯 PERFECT TRAY Phase 1! (Tray #${gameState.trayCount + 1}) - First 3 pieces of 6 to clear board!`);
        }
      } else {
        // Pure luck chance (0.2%)
        const luckChance = 0.002;
        if (gameState.trayCount >= 5 && Math.random() < luckChance) {
          perfectTrayShapes = findPerfectTrayFirst3(currentBoardState, ROWS, COLS);
          if (perfectTrayShapes) {
            gameState.perfectTrayUsed = true;
            gameState.perfectTrayCount++;
            gameState.perfectSequence.phase = 2;
            console.log(`🍀 LUCKY PERFECT TRAY! (Tray #${gameState.trayCount + 1}) - Pure luck!`);
          }
        }
      }
    }

    // ===== GOOD TRAY SYSTEM (all 3 pieces must fit exact gaps) =====
    // Check if we should try to generate a good tray (only if perfect tray wasn't found)
    let goodTrayShapes = null;
    if (enforceGuarantee && !perfectTrayShapes && !inPerfectSequence) {
      const phase = getGamePhase();
      const fillRatio = getBoardFillRatio();
      const goodTrayProbability = getGoodTrayProbability(phase, fillRatio);

      // DEBUG: Log good tray system state (only when explicitly enabled and verbose mode is on)
      if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
        console.log(`[Good Tray] Tray #${gameState.trayCount + 1} | Phase: ${phase} | Fill: ${(fillRatio * 100).toFixed(1)}% | Probability: ${(goodTrayProbability * 100).toFixed(1)}%`);
      }

      // Roll for good tray
      const roll = Math.random();
      if (roll < goodTrayProbability) {
        if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
          console.log(`[Good Tray] 🎲 Rolled ${(roll * 100).toFixed(1)}% - Attempting to find good tray...`);
        }
        goodTrayShapes = findGoodTray(currentBoardState, ROWS, COLS);
        if (goodTrayShapes) {
          // Always log when a good tray is found (important info)
          console.log(`✅ GOOD TRAY! (Tray #${gameState.trayCount + 1}) - Clears multiple lines!`);
        } else {
          if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
            console.log(`[Good Tray] ❌ No good tray found, using normal generation`);
          }
        }
      } else if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE) {
        console.log(`[Good Tray] 🎲 Rolled ${(roll * 100).toFixed(1)}% - Not triggered (needed < ${(goodTrayProbability * 100).toFixed(1)}%)`);
      }
    }

    let shapesForSlots = new Array(slots.length).fill(null);
    let attempts = 0;
    const MAX_ATTEMPTS = 200; // Safety limit to prevent infinite loops

    // If we have a perfect tray or good tray, verify it meets the guarantee before using it
    let specialTrayShapes = perfectTrayShapes || goodTrayShapes;
    if (specialTrayShapes && specialTrayShapes.length === 3) {
      // Verify all special tray pieces are placeable
      let allPlaceable = true;
      for (let i = 0; i < 3; i++) {
        if (!shapeCanFitAnywhere(specialTrayShapes[i])) {
          allPlaceable = false;
          break;
        }
      }

      // CRITICAL: Also verify the guarantee - special trays MUST clear at least 1 line
      // (Perfect tray always clears everything, so it always passes. Good tray needs checking.)
      if (allPlaceable && enforceGuarantee) {
        let canClear = true;
        
        // Perfect tray always clears the board, so it always meets guarantee
        if (!perfectTrayShapes) {
          // Good tray needs verification
          canClear = canClearWithThreePieces(
            currentBoardState,
            goodTrayShapes,
            ROWS,
            COLS
          );
        }
        
        if (canClear) {
          // Special tray meets guarantee - use it
          shapesForSlots = [...specialTrayShapes];
          if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE && goodTrayShapes) {
            console.log(`[Good Tray] ✅ Verified guarantee - tray can clear at least 1 line`);
          }
          if (window.DEBUG_PERFECT_TRAY && window.DEBUG_PERFECT_TRAY_VERBOSE && isPerfectOpportunityWindow) {
            console.log(`[Perfect Opportunity] ✅ Window tray verified - clears lines`);
          }
        } else {
          // Special tray doesn't meet guarantee - reject it and use normal generation
          if (window.DEBUG_PERFECT_TRAY) {
            if (isPerfectOpportunityWindow) {
              console.warn(`[Perfect Opportunity] ⚠️ Window tray rejected - does not meet guarantee`);
            } else {
              console.warn(`[Good Tray] ⚠️ Rejected - does not meet guarantee (cannot clear any lines)`);
            }
          }
          goodTrayShapes = null;
          perfectTrayShapes = null;
          specialTrayShapes = null;
          // End perfect opportunity window if it was active
          if (isPerfectOpportunityWindow) {
            gameState.perfectOpportunityWindow = null;
          }
        }
      } else if (allPlaceable && !enforceGuarantee) {
        // Not enforcing guarantee (partial refill), use special tray
        shapesForSlots = [...specialTrayShapes];
      } else {
        // Special tray pieces aren't all placeable
        perfectTrayShapes = null;
        goodTrayShapes = null;
        specialTrayShapes = null;
      }
    }

    // Keep re-rolling until both guarantees are met (unless we have a perfect tray or good tray)
    while (attempts < MAX_ATTEMPTS && !specialTrayShapes) {
      attempts++;
    let hasPlayable = false;
      shapesForSlots = new Array(slots.length).fill(null);

      // First pass: pick shapes for empty slots only
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
        } else {
          // Board is completely dead - no shapes can fit anywhere
          // Can't guarantee anything, so break and use whatever we got
          break;
        }
      }

      // NEW: Check if the new pieces together can clear at least one row/column
      if (enforceGuarantee && hasPlayable) {
        // Filter out null shapes (slots that already have pieces)
        const candidateShapes = shapesForSlots.filter(s => s !== null);
        
        // Only check if we have at least one shape to work with
        if (candidateShapes.length > 0) {
          const canClear = canClearWithThreePieces(
            currentBoardState, 
            candidateShapes, 
            ROWS, 
            COLS
          );

          // If we can't clear with these pieces, re-roll
          if (!canClear) {
            continue; // Try again with new random shapes
          }
        } else {
          // No new shapes to check (all slots already filled), break
          break;
        }
      }

      // Both guarantees met (or not enforcing), break out of loop
      break;
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

    // Increment tray count when a new full tray is generated
    if (enforceGuarantee) {
      incrementTrayCount();
    }
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
  
  // Expose tray functions for testing
  window.findPerfectTray = findPerfectTray;
  window.findPerfectTrayFirst3 = findPerfectTrayFirst3;
  window.findPerfectTraySecond3 = findPerfectTraySecond3;
  window.findGoodTray = findGoodTray;
  window.checkBoardSolvableIn6Pieces = checkBoardSolvableIn6Pieces;
  window.simulateTrayPlacement = simulateTrayPlacement;
  window.canClearWithThreePieces = canClearWithThreePieces;
  window.getGamePhase = getGamePhase;
  window.getBoardFillRatio = getBoardFillRatio;
  window.getPerfectOpportunityProbability = getPerfectOpportunityProbability;
  window.getGoodTrayProbability = getGoodTrayProbability;
  window.gameStateClassic = gameState; // Expose game state for testing

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

// Lightweight test function - just shows current state, no heavy searching
// Simple test function - shows tray system status
window.testTrays = function() {
  if (window.gameStateClassic) {
    const state = window.gameStateClassic;
    console.log(`📊 Tray #${state.trayCount} | Perfect trays: ${state.perfectTrayCount}`);
    if (state.perfectSequence) {
      console.log(`   🎯 Perfect sequence active! Phase: ${state.perfectSequence.phase}`);
    }
    if (window.getGamePhase && window.getBoardFillRatio) {
      const phase = window.getGamePhase();
      const fill = window.getBoardFillRatio();
      const perfectProb = window.getPerfectOpportunityProbability ? window.getPerfectOpportunityProbability(phase, fill) : 0;
      const goodProb = window.getGoodTrayProbability ? window.getGoodTrayProbability(phase, fill) : 0;
      console.log(`   Phase: ${phase} | Fill: ${(fill * 100).toFixed(1)}%`);
      console.log(`   Perfect tray prob: ${(perfectProb * 100).toFixed(2)}% | Good tray prob: ${(goodProb * 100).toFixed(1)}%`);
      
      // Check if board is solvable in 6 pieces
      if (window.checkBoardSolvableIn6Pieces) {
        const board = document.getElementById('classicBoard');
        if (board) {
          const cells = Array.from(board.querySelectorAll('.cell'));
          const cs = getComputedStyle(board);
          const COLS = parseInt(cs.getPropertyValue('--cols')) || 8;
          const ROWS = Math.max(1, Math.round(cells.length / COLS));
          const idx = (r,c) => r*COLS + c;
          const boardState = Array.from({length: ROWS}, (_,r)=> 
            Array.from({length: COLS}, (_,c)=> 
              cells[idx(r,c)].classList.contains('filled') ? 1 : 0
            )
          );
          const solution = window.checkBoardSolvableIn6Pieces(boardState, ROWS, COLS);
          console.log(`   Board solvable in 6 pieces: ${solution ? '✅ YES' : '❌ NO'}`);
        }
      }
    }
  } else {
    console.log('⚠️ Game state not available. Make sure you\'re in Classic game.');
  }
};