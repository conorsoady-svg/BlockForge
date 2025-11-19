/* ===== SHARED.JS - Common code used by multiple screens ===== */

// ---------- Shorthands ----------
window.$ = id => document.getElementById(id);
window.randi = n => Math.floor(Math.random() * n);
window.cellSize = () => {
  const b = window.$('board');
  const v = b ? parseInt(getComputedStyle(b).getPropertyValue('--cell'), 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell'), 10);
};
window.pad = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pad'));
window.gap = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));

// ---------- Shape utilities ----------
window.copyShape = s => s.map(r => r.slice());

// ---------- Shapes array ----------
window.SHAPES = [
  // Single (1 block)
  [[1]],
  // Square (2x2)
  [[1,1],
   [1,1]],
  //Horizontal 2 (2 blocks)
  [[1,1]],
  // Vertical 2 (2 blocks)
  [[1],
   [1]],
  // Horizontal 3 (3 blocks)
  [[1,1,1]], 
  // Vertical 3 (3 blocks)
  [[1],
   [1],
   [1]],
  // Broken  (4 blocks)
  [[1,1,0],
   [0,1,1]], 
  [[0,1,1],
   [1,1,0]],
  [[1,0],
   [1,1],
   [0,1]],
  [[0,1],
   [1,1],
   [1,0]],
  // T Shape (4 blocks)
  [[1,1,1],
   [0,1,0]], 
  // Upside Down T (4 blocks)
  [[0,1,0],
   [1,1,1]],
  // Sideways T (4 blocks)
  [[1,0],
   [1,1],
   [1,0]],
  [[0,1],
   [1,1],
   [0,1]],
  // Small Ls (3 blocks)
  [[1,0],
   [1,1]],
  [[0,1],
   [1,1]],
  [[1,1],
   [1,0]],
  [[1,1],
   [0,1]],
  //Medium Ls (4 blocks)
  [[1,0,0],
   [1,1,1]],
  [[0,0,1], 
   [1,1,1]],
  [[1,1,1],
   [1,0,0]],
  [[1,1,1],
   [0,0,1]],
  [[1,0,],
   [1,0,],
   [1,1]],
  [[0,1,],
   [0,1,],
   [1,1]],
  [[1,1,],
   [1,0,],
   [1,0,]],
  [[1,1,],
   [0,1,],
   [0,1,]],
  // plus (5 blocks)
  [[0,1,0],
   [1,1,1],
   [0,1,0]],
  // Big Ls (5 blocks)
  [[1,0,0],
   [1,0,0],
   [1,1,1]],
  [[0,0,1],
   [0,0,1],
   [1,1,1]],
  [[1,1,1],
   [0,0,1],
   [0,0,1]],
  [[1,1,1],
   [1,0,0],
   [1,0,0]],
  // Rectangle (6 blocks)
  [[1,1,1],
   [1,1,1]],
  [[1,1],
   [1,1],
   [1,1]],
  // Full Square (9 blocks)
  [[1,1,1],
   [1,1,1],
   [1,1,1]],
  // Long 4 (4 blocks)
  [[1,1,1,1]],
  [[1],
   [1],
   [1],
   [1]],
  // Long 5 (5 blocks)
  [[1,1,1,1,1]],
  [[1],
   [1],
   [1],
   [1],
   [1]],
  // Diagonal 2 (2 blocks)
  [[1,0],
   [0,1]],
  [[0,1],
   [1,0]],
  // Diagonal 3 (3 blocks)
  [[1,0,0],
   [0,1,0],
   [0,0,1]],
  [[0,0,1],
   [0,1,0],
   [1,0,0]],
];

// ---------- Color palette ----------
if (!window.PALETTE) {
  window.PALETTE = [
    {
      fill: 'linear-gradient(180deg, #7bf5ff, #00B5E5)',
      stroke: 'rgba(123,245,255,.45)',
      glow: 'rgba(123,245,255,.35)',
      glowInset: 'rgba(0,0,0,.45)'
    },
    {
      fill: 'linear-gradient(180deg, #FF31F4, #9F0BDB)',
      stroke: 'rgba(255,49,244,.45)',
      glow: 'rgba(255,49,244,.35)',
      glowInset: 'rgba(0,0,0,.45)'
    },
    {
      fill: 'linear-gradient(180deg, #FEA019, #CD7317)',
      stroke: 'rgba(254,160,25,.45)',
      glow: 'rgba(254,160,25,.35)',
      glowInset: 'rgba(0,0,0,.45)'
    },
    {
      fill: 'linear-gradient(180deg, #ff0000, #CB040A)',
      stroke: 'rgba(255,0,0,.45)',
      glow: 'rgba(255,0,0,.35)',
      glowInset: 'rgba(0,0,0,.45)'
    },
    {
      fill: 'linear-gradient(180deg, #7A5CFF, #7c82ff)',
      stroke: 'rgba(122,92,255,.45)',
      glow: 'rgba(122,92,255,.35)',
      glowInset: 'rgba(0,0,0,.45)'
    },
    {
      fill: 'linear-gradient(180deg, #9AFF00, #4bb630)',
      stroke: 'rgba(154,255,0,.45)',
      glow: 'rgba(154,255,0,.35)',
      glowInset: 'rgba(0,0,0,.45)'
    }
  ];
}

// ---------- Color queue system ----------
let colorQueue = [];
function shuffledPalette() {
  return [...window.PALETTE].sort(() => Math.random() - 0.5);
}

if (!window.nextColor) {
  window.nextColor = function() {
    if (!colorQueue.length) colorQueue = shuffledPalette();
    return colorQueue.pop();
  };
}

// ---------- Safe color getter (universal fallback) ----------
window.safeNextColor = function(){
  try {
    if (typeof window.nextColor === 'function') {
      return window.nextColor();
    }
    // fallback palette if nextColor() isn't defined yet
    const palette = [
      { fill: 'linear-gradient(180deg,#7bf5ff,#00B5E5)', stroke: 'rgba(123,245,255,.45)', glow: 'rgba(123,245,255,.35)', glowInset: 'rgba(0,0,0,.45)' },
      { fill: 'linear-gradient(180deg,#FF31F4,#9F0BDB)', stroke: 'rgba(255,49,244,.45)',  glow: 'rgba(255,49,244,.35)',  glowInset: 'rgba(0,0,0,.45)' },
      { fill: 'linear-gradient(180deg,#FEA019,#CD7317)', stroke: 'rgba(254,160,25,.45)',  glow: 'rgba(254,160,25,.35)',  glowInset: 'rgba(0,0,0,.45)' },
      { fill: 'linear-gradient(180deg,#ff0000,#CB040A)', stroke: 'rgba(255,0,0,.45)',     glow: 'rgba(255,0,0,.35)',     glowInset: 'rgba(0,0,0,.45)' },
      { fill: 'linear-gradient(180deg,#7A5CFF,#7c82ff)', stroke: 'rgba(122,92,255,.45)',  glow: 'rgba(122,92,255,.35)',  glowInset: 'rgba(0,0,0,.45)' },
      { fill: 'linear-gradient(180deg,#9AFF00,#4bb630)', stroke: 'rgba(154,255,0,.45)',   glow: 'rgba(154,255,0,.35)',   glowInset: 'rgba(0,0,0,.45)' }
    ];
    window.safeNextColor._i = (window.safeNextColor._i || 0) + 1;
    return palette[window.safeNextColor._i % palette.length];
  } catch (e) {
    return { fill: 'var(--c-cyan)', stroke: 'var(--c-cyan)', glow: 'var(--c-cyan)', glowInset: 'rgba(0,0,0,.35)' };
  }
};

// ---------- Weighted random shape picker ----------
(function(){
  if (window.weightedRandomShape) return; // avoid redefining

  // === Explicit tier mapping (Easy / Medium / Hard) ===
  (function(){
    function trim(shape){
      let s = shape.map(r=>r.slice());
      while (s.length && s[0].every(v=>!v)) s.shift();
      while (s.length && s[s.length-1].every(v=>!v)) s.pop();
      if (!s.length) return [[]];
      let L=0, R=s[0].length-1;
      for (; L<=R && s.every(r=>!r[L]); L++);
      for (; R>=L && s.every(r=>!r[R]); R--);
      return s.map(r=>r.slice(L, R+1));
    }
    const key = (shape)=> trim(shape).map(r=>r.join('')).join(';');

    const EASY = [
      // Single (1 block)
      [[1]],
      // Square (2x2)
      [[1,1],
       [1,1]],
      //Horizontal 2 (2 blocks)
      [[1,1]],
      // Verical 2 (2 blocks)
      [[1],
       [1]],
      // Horizontal 3 (3 blocks)
      [[1,1,1]], 
      // Vertical 3 (3 blocks)
      [[1],
       [1],
       [1]],
      // Small Ls (3 blocks)
      [[1,0],
       [1,1]],
      [[0,1],
       [1,1]],
      [[1,1],
       [1,0]],
      [[1,1],
       [0,1]],
      // Diagonal 2 (2 blocks)
      [[1,0],
       [0,1]],
      [[0,1],
       [1,0]],
    ];

    const MEDIUM = [
      // Broken  (4 blocks)
      [[1,1,0],
       [0,1,1]], 
      [[0,1,1],
       [1,1,0]],
      [[1,0],
       [1,1],
       [0,1]],
      [[0,1],
       [1,1],
       [1,0]],
      // T Shape (4 blocks)
      [[1,1,1],
       [0,1,0]], 
      // Upside Down T (4 blocks)
      [[0,1,0],
       [1,1,1]],
      // Sideways T (4 blocks)
      [[1,0],
       [1,1],
       [1,0]],
      [[0,1],
       [1,1],
       [0,1]],
      // Long 4 (4 blocks)
      [[1,1,1,1]],
      [[1],
       [1],
       [1],
       [1]],
      // Rectangle (6 blocks)
      [[1,1,1],
       [1,1,1]],
      [[1,1],
       [1,1],
       [1,1]],
      //Medium Ls (4 blocks)
      [[1,0,0],
       [1,1,1]],
      [[0,0,1], 
       [1,1,1]],
      [[1,1,1],
       [1,0,0]],
      [[1,1,1],
       [0,0,1]],
      [[1,0,],
       [1,0,],
       [1,1]],
      [[0,1,],
       [0,1,],
       [1,1]],
      [[1,1,],
       [1,0,],
       [1,0,]],
      [[1,1,],
       [0,1,],
       [0,1,]],
    ];

    const HARD = [
      // Diagonal 3 (3 blocks)
      [[1,0,0],
       [0,1,0],
       [0,0,1]],
      [[0,0,1],
       [0,1,0],
       [1,0,0]],
      // Full Square (9 blocks)
      [[1,1,1],
       [1,1,1],
       [1,1,1]],
      // Long 5 (5 blocks)
      [[1,1,1,1,1]],
      [[1],
       [1],
       [1],
       [1],
       [1]],
      // plus (5 blocks)
      [[0,1,0],
       [1,1,1],
       [0,1,0]],
      // Big Ls (5 blocks)
      [[1,0,0],
       [1,0,0],
       [1,1,1]],
      [[0,0,1],
       [0,0,1],
       [1,1,1]],
      [[1,1,1],
       [0,0,1],
       [0,0,1]],
      [[1,1,1],
       [1,0,0],
       [1,0,0]],
    ];

    const EASY_SET   = new Set(EASY.map(key));
    const MEDIUM_SET = new Set(MEDIUM.map(key));
    const HARD_SET   = new Set(HARD.map(key));

    function tierOfExact(shape){
      const k = key(shape);
      if (EASY_SET.has(k))   return 'easy';
      if (MEDIUM_SET.has(k)) return 'medium';
      if (HARD_SET.has(k))   return 'hard';
      return 'hard';
    }
    window.tierOf = tierOfExact;

    const TIER_INDICES = { easy:[], medium:[], hard:[] };
    for (let i=0;i<window.SHAPES.length;i++){
      TIER_INDICES[tierOfExact(window.SHAPES[i])].push(i);
    }

    window.TIER_INDICES = TIER_INDICES;

    // 40/35/25 with renormalization if a bucket is empty
    window.weightedRandomShape = function(){
      const weights = { easy:40, medium:35, hard:25 };
      const live = Object.entries(TIER_INDICES).filter(([,arr])=>arr.length);
      const total = live.reduce((s,[k])=>s+weights[k],0);
      let r = Math.random()*total;
      for (const [bucket, pool] of live){
        r -= weights[bucket];
        if (r < 0){
          const idx = pool[(Math.random()*pool.length)|0];
          return window.SHAPES[idx];
        }
      }
      return window.SHAPES[(Math.random()*window.SHAPES.length)|0];
    };
  })();
})();

// ---------- Auto scale helper ----------
window.autoScaleForShape = function(shape){
  const w = shape[0].length, h = shape.length;
  const longest = Math.max(w, h);
  if (longest >= 5) return 0.7;
  if (longest >= 4) return 0.75;
  return 0.9;
};

// ---------- Helper: rgba from hex ----------
window.rgbaFromHex = function(hex, a){
  const h = hex.replace('#','').trim();
  const n = h.length===3 ? h.split('').map(s=>s+s).join('') : h;
  const r = parseInt(n.slice(0,2),16), g = parseInt(n.slice(2,4),16), b = parseInt(n.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
};

// ---------- Helper: gradient color object ----------
window.grad = function(fillStart, fillEnd){
  const stroke = window.rgbaFromHex(fillStart, .45);
  const glow   = window.rgbaFromHex(fillStart, .35);
  const glowIn = window.rgbaFromHex(fillStart, .45);
  return {
    fill: `linear-gradient(180deg, ${fillStart}, ${fillEnd})`,
    stroke: stroke,
    glow: glow,
    glowInset: glowIn
  };
};

// ---------- Utility functions: show/hide ----------
// ---------- Utility functions: show/hide ----------
window.show = function show(el){
  if (!el) return;

  // If it's a NodeList/array, apply to each element
  if (!el.classList && (el.length || el.forEach)) {
    Array.from(el).forEach(show);
    return;
  }

  if (el.classList) {
    el.classList.remove('hidden');
  }
  if (el.setAttribute) {
    el.setAttribute('aria-hidden', 'false');
  }
  if (el.style) {
    el.style.display = 'block';
  }
};

window.hide = function hide(el){
  if (!el) return;

  // If it's a NodeList/array, apply to each element
  if (!el.classList && (el.length || el.forEach)) {
    Array.from(el).forEach(hide);
    return;
  }

  if (el.classList) {
    el.classList.add('hidden');
  }
  if (el.setAttribute) {
    el.setAttribute('aria-hidden', 'true');
  }
  if (el.style) {
    el.style.display = 'none';
  }
};

// ---------- Viewport height helper ----------
(function(){
  function setVH(){
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-h', (vh*100) + 'px');
  }
  setVH();
  addEventListener('resize', setVH);
  addEventListener('orientationchange', setVH);
})();

// ---------- Settings button (placeholder) ----------
window.openSettings = window.openSettings || function () {
  alert('6 7');
};

