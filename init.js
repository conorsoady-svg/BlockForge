/* ===== INIT.JS - Initialization and Service Worker setup ===== */

// Fullscreen helper (Chrome/Android, most browsers)
function goFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req && !document.fullscreenElement) {
    req.call(el).catch(()=>{ /* ignore */ });
  }
}

// Trigger on the FIRST user tap anywhere
window.addEventListener('pointerdown', function onFirstTap() {
  goFullscreen();
  // remove after first successful gesture so it won't re-fire
  window.removeEventListener('pointerdown', onFirstTap);
}, { once: true });

// (Optional) if user exits fullscreen, re-arm on next tap
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    window.addEventListener('pointerdown', function onTap() {
      goFullscreen();
      window.removeEventListener('pointerdown', onTap);
    }, { once: true });
  }
});

// --- Disable wheel/trackpad scroll (desktop) ---
window.addEventListener('wheel', (e) => {
  e.preventDefault();
}, { passive: false });

// --- Disable touch scrolling (mobile) ---
window.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

// --- iOS Safari: block pinch zoom ---
window.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// --- iOS: block double-tap zoom ---
let __lastTouchEnd = 0;
window.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - __lastTouchEnd <= 300) {
    e.preventDefault();
  }
  __lastTouchEnd = now;
}, { passive: false });

// --- Desktop: block double-click zoom (some browsers/extensions) ---
window.addEventListener('dblclick', (e) => {
  e.preventDefault();
});

// Ctrl+Alt+R -> clear SW caches and hard-reload (dev only)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_CACHES' });
    setTimeout(() => location.reload(true), 80);
  }
});

/* Disable SW + caches on localhost so changes show instantly */
if (/(^localhost$|^127\.0\.0\.1$)/.test(location.hostname)) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(rs => rs.forEach(r => r.unregister()));
  }
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}

/* iOS viewport nudge */
(function(){
  const setVh=()=>document.documentElement.style.setProperty('--vh', window.innerHeight*0.01+'px');
  window.addEventListener('resize', setVh, {passive:true});
  setVh();
})();

/* Unlock audio once the user taps/clicks */
let audioOK = false;
window.addEventListener('pointerdown', () => { audioOK = true; }, { once:true });

/* ===== Service Worker: update prompt flow ===== */
(function setupSWUpdatePrompt(){
  if (!('serviceWorker' in navigator)) return;

  let newWorkerWaiting = null;
  let refreshing = false;

  function showToast(){
    const el = document.getElementById('updateToast');
    if(!el) return;
    el.classList.add('show');
    const later = document.getElementById('updateLaterBtn');
    const now   = document.getElementById('updateNowBtn');

    // Hide only
    later.onclick = () => el.classList.remove('show');

    // Ask waiting worker to become active, then page will reload once
    now.onclick = () => {
      if (newWorkerWaiting) {
        newWorkerWaiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };
  }

  // When controller changes, the new SW took control -> safe to reload once
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    // If you want to protect in-play sessions, you could persist state here first.
    location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      // If a new service worker is found
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          // When the new SW is installed and we already have a controller,
          // it means an update is ready (waiting) rather than first install.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            newWorkerWaiting = reg.waiting;
            showToast();
          }
        });
      });

      // Also handle the case where the new worker is already waiting (fast check)
      if (reg.waiting && navigator.serviceWorker.controller) {
        newWorkerWaiting = reg.waiting;
        showToast();
      }
    } catch (err) {
      console.error('SW registration failed', err);
    }
  });
})();

// Additional Service Worker registration (instant updates)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register sw.js at the project root scope
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('[SW] Registered:', reg.scope);

      // Periodically ask for updates while the page is open
      setInterval(() => reg.update(), 30_000);

      // If a new SW is found, tell it to activate right away
      function enableInstantUpdates(swReg) {
        if (!swReg) return;

        // If a new worker is already waiting, tell it to take over
        if (swReg.waiting) {
          swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // When a new worker appears, skip waiting after it's installed
        swReg.addEventListener('updatefound', () => {
          const installing = swReg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }
      enableInstantUpdates(reg);
    } catch (err) {
      console.error('[SW] registration failed:', err);
    }
  });
}

