/* ===== HOME.JS - Home overlay (#homeOverlay) logic ===== */

// Build the framed grid + decorative blocks + mini cards to match the reference
function initHomeArt(){
  const grid = document.getElementById('hfGrid');
  if (!grid || grid.dataset.built) return;

  const COLS = 6, ROWS = 8;

  // 1) dark grid cells
  for (let i = 0; i < COLS*ROWS; i++){
    const s = document.createElement('i');
    s.className = 'hf-cell';
    grid.appendChild(s);
  }

  // 2) center dark '+' cluster (like the mock)
  const ghost = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  // plus centered roughly midframe
  ghost(5,7); ghost(4,7); ghost(6,7); ghost(5,6); ghost(5,8);

  // Other bright ghosts apart from the +
  const ghost2 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost2';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost2(4,8); ghost2(4,9);

  const ghost3 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost3';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost3(4,10);

  const ghost4 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost4';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost4(3,10); ghost4(5,10);

  const ghost5 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost5';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost5(2,10);

  const ghost6 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost6';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost6(6,10);

  const ghost7 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost7';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost7(5,9);

  const ghost8 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost8';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost8(6,9);

  const ghost9 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost9';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost9(1,2);

  const ghost10 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost10';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost10(2,3); ghost10(2,4);

  const ghost11 = (c,r) => {
    const g = document.createElement('i');
    g.className = 'hf-ghost11';
    g.style.gridColumn = String(c);
    g.style.gridRow    = String(r);
    grid.appendChild(g);
  };
  ghost11(1,1); ghost11(3,1); ghost11(4,1); ghost11(2,2); ghost11(3,2); ghost11(4,2); ghost11(3,3); ghost11(4,3); ghost11(5,2); ghost11(2,1); ghost11(3,4);

  //3) colored blocks in fixed spots (pixel-matched layout)
  const drop = (c,r,cls) => {
    const b = document.createElement('b');
    b.className = 'hf-block ' + cls;
    b.style.gridColumn = String(c);
    b.style.gridRow    = String(r);
    grid.appendChild(b);
  };

  // cyan singles (left/top & mid-left)
  drop(1,3,'hf-cyan');
  drop(1,4,'hf-cyan');
  drop(2,7,'hf-cyan');

  // magenta vertical stacks on right (top & lower)
  [4,5].forEach(r => drop(8,r,'hf-magenta'));
  [8,9].forEach(r => drop(8,r,'hf-magenta'));
  [10].forEach(r => drop(7,r,'hf-magenta'));

  // bottom-left and bottom-right corner singles (magenta)
  drop(1,12,'hf-magenta');
  drop(8,12,'hf-magenta');
  drop(1,10,'hf-magenta');

  // orange L near bottom-left
  drop(2,9,'hf-orange');
  drop(3,9,'hf-orange');
  drop(3,8,'hf-orange');

  grid.dataset.built = '1';

  // 4) mini cards — draw shapes
  const cards = document.querySelectorAll('#homeOverlay .hf-card');
  if (cards.length === 3){
    // helper to place small blocks on a 4×3 mini grid
    const mini = (el, coords, cls) => {
      const m = document.createElement('div'); m.className = 'hf-mini';
      // 4 cols × 3 rows grid space
      const index = (x,y)=> y*4 + x;
      for(let i=0;i<12;i++){
        const d=document.createElement('i'); d.className='b'; m.appendChild(d);
      }
      coords.forEach(([x,y])=>{
        const cell = m.children[index(x,y)];
        if(cell) cell.classList.add(cls);
      });
      el.innerHTML=''; el.appendChild(m);
    };
    // Left card: magenta little L (3 blocks)
    mini(cards[0], [[1,1],[2,0]], 'mag');
    // Middle card: violet T (4 blocks)
    mini(cards[1], [[1,2],[0,1],[1,1],[2,1]], 'vio');
    // Right card: orange 3 horizontal
    mini(cards[2], [[0,1],[1,1],[2,1]], 'orn');
  }
}

// show/hide overlay (keeps your existing nav)
function showHomeOverlay(){ document.getElementById('homeOverlay')?.classList.add('show'); }
function hideHomeOverlay(){ document.getElementById('homeOverlay')?.classList.remove('show'); }

// Fit the portrait card into the real viewport (handles toolbars/URL bars)
function fitHomeOverlay(){
  const overlay = document.getElementById('homeOverlay');
  const phone   = overlay?.querySelector('.hf-phone');
  if (!overlay || !phone) return;

  // Reset to natural size to measure
  phone.style.transform = 'none';
  phone.style.marginTop = phone.style.marginBottom = '0px';

  // Prefer visualViewport (excludes browser UI), fall back to window
  const vw = (window.visualViewport?.width  ?? window.innerWidth);
  const vh = (window.visualViewport?.height ?? window.innerHeight);

  // Padding budget so it never kisses the edges
  const pad = 24;
  const availW = Math.max(280, vw - pad * 2);
  const availH = Math.max(360, vh - pad * 2);

  const rect = phone.getBoundingClientRect();
  const scale = Math.min(1, availW / rect.width, availH / rect.height);

  phone.style.transform       = `scale(${scale})`;
  phone.style.transformOrigin = 'top center';

  // Center vertically after scaling
  const usedH = rect.height * scale;
  const margin = Math.max(0, (availH - usedH) / 2);
  phone.style.marginTop    = `${margin}px`;
  phone.style.marginBottom = `${margin}px`;
}

// Wrap home overlay in fitstage/fitbox
(function wrapHomeOverlay(){
  function wrapHome(){
    const home = document.getElementById('homeOverlay');
    if (!home) return console.warn('fitstage: #homeOverlay not found');

    // Already wrapped? exit.
    if (home.closest('.fitstage')) return;

    // Create wrappers
    const stage = document.createElement('div');
    stage.className = 'fitstage';
    const box = document.createElement('div');
    box.className = 'fitbox';

    // Insert stage where #homeOverlay currently sits
    const parent = home.parentNode;
    parent.insertBefore(stage, home);
    stage.appendChild(box);
    box.appendChild(home); // move your existing overlay inside the fitbox
  }

  // run after DOM is parsed
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', wrapHome, { once:true })
    : wrapHome();
})();

// Initialize home overlay on DOMContentLoaded
window.addEventListener('DOMContentLoaded', ()=>{
  initHomeArt();
  showHomeOverlay();
  fitHomeOverlay();
  requestAnimationFrame(fitHomeOverlay); // wait one frame for CSS to apply
  setTimeout(fitHomeOverlay, 250); // in case fonts/images load late
  document.getElementById('hfPlay')?.addEventListener('click', ()=>{
    hideHomeOverlay();
  });
  // Also call showHome if it exists (from tetris.js)
  if(typeof showHome === 'function') showHome();
});

window.addEventListener('resize', fitHomeOverlay, { passive:true });
window.addEventListener('orientationchange', () => setTimeout(fitHomeOverlay, 50), { passive:true });
document.fonts?.ready?.then?.(fitHomeOverlay);
window.visualViewport?.addEventListener?.('resize', fitHomeOverlay, { passive: true });

// Re-fit if the inside card reflows (only if the element exists)
document.addEventListener('DOMContentLoaded', () => {
  const phone = document.querySelector('#homeOverlay .hf-phone');
  if (phone && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(() => fitHomeOverlay());
    ro.observe(phone);
  }
});

// Expose functions globally
window.showHomeOverlay = showHomeOverlay;
window.hideHomeOverlay = hideHomeOverlay;
window.fitHomeOverlay = fitHomeOverlay;

