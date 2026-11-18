// ENCY Tuner Touch — shared UI services of the touch kit (kit.css):
//   TT.ui.spr(sheet, row, col)  — a Tuner sprite icon      TT.ui.ic(name) — a stroke glyph Tuner has no sprite for
//   TT.ui.btn({…})              — a kit button's HTML      TT.ui.toast(text, dot) — a notification at the bottom of the 3D
//   TT.ui.ask({…}) → Promise    — a question (modal)       TT.ui.menu(anchor, items) → Promise — a menu under a button
//   TT.ui.dragScroll(el)        — finger scrolling with inertia for a row or a list (rule 6.6)
(function(){
  'use strict';
  var root = document.getElementById('tt');
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]; }); }

  // Tuner sprites: sheet → class (kit.css); row / col are 1-based like BtnsDarkIconPack.ini
  function spr(sheet, r, c, cls){ return '<i class="tk-spr s-' + sheet + (cls ? ' ' + cls : '') + '" style="--r:' + r + ';--c:' + c + '"></i>'; }
  var GL = {
    back:'<path d="M20 12H5M11 6l-6 6 6 6"/>',
    lockOpen:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2"/>',
    lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
    x:'<path d="M7 7l10 10M17 7L7 17"/>',
    stop:'<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none"/>',
    chev:'<path d="M7 10l5 5 5-5"/>',
    chevL:'<path d="M14.5 6l-6 6 6 6"/>', chevR:'<path d="M9.5 6l6 6-6 6"/>',
    stepB:'<path d="M18.5 5.5v13L9 12z" fill="currentColor" stroke="none"/><rect x="5" y="5.5" width="2.6" height="13" rx="1" fill="currentColor" stroke="none"/>',
    stepF:'<path d="M5.5 5.5v13L15 12z" fill="currentColor" stroke="none"/><rect x="16.4" y="5.5" width="2.6" height="13" rx="1" fill="currentColor" stroke="none"/>',
    resetSq:'<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
    shutAll:'<path d="M7 4.5l5 5 5-5M7 19.5l5-5 5 5"/>',
    openAll:'<path d="M7 9.5l5-5 5 5M7 14.5l5 5 5-5"/>',
    follow:'<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    pgUp:'<path d="M7 12.5l5-5 5 5M7 18l5-5 5 5"/><path d="M6 5h12"/>',
    pgDn:'<path d="M7 11.5l5 5 5-5M7 6l5 5 5-5"/><path d="M6 19h12"/>',
    split:'<path d="M5 12h14"/><circle cx="12" cy="6.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="17.5" r="1.6" fill="currentColor" stroke="none"/>'
  };
  function ic(n){ return '<svg class="tk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + GL[n] + '</svg>'; }
  // o: {act, label, icon (html), cls, dis, attrs}
  function btn(o){
    return '<button class="tk-b ' + (o.cls || '') + '"' + (o.act ? ' data-act="' + o.act + '"' : '') + (o.dis ? ' disabled' : '') +
      (o.attrs || '') + (o.label ? '' : ' aria-label="' + esc(o.aria || '') + '"') + '>' + (o.icon || '') + (o.label ? '<span>' + esc(o.label) + '</span>' : '') + '</button>';
  }

  // ——— notification: one line at the bottom of the 3D view, no OK, gone after 3 s (spec sect. 3) ———
  var host3d = function(){ return document.getElementById('tt3d') || root; }, toastEl = null, toastT = 0;
  function toast(text, dot){
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div'); toastEl.className = 'tk-toast';
    toastEl.style.bottom = 'calc(16px * var(--ki))'; if (dot) toastEl.style.setProperty('--dot', dot);
    toastEl.textContent = text; host3d().appendChild(toastEl);
    clearTimeout(toastT); toastT = setTimeout(function(){ if (toastEl){ toastEl.remove(); toastEl = null; } }, 3000);
  }
  TT.on('toast', function(d){ toast(d.text, d.dot); });

  // ——— question: {title, text, buttons:[{key, label, cls, left}]} → Promise(key); Cancel = null ———
  function ask(o){
    return new Promise(function(done){
      var s = document.createElement('div'); s.className = 'tk-scrim';
      var left = o.buttons.filter(function(b){ return b.left; }), right = o.buttons.filter(function(b){ return !b.left; });
      function bh(b){ return btn({act:b.key, label:b.label, cls:'big ' + (b.cls || '')}); }
      s.innerHTML = '<div class="tk-dlg" role="dialog" aria-modal="true"><h3>' + esc(o.title) + '</h3>' + (o.text ? '<p>' + esc(o.text) + '</p>' : '') +
        '<div class="tk-dlg-b">' + left.map(bh).join('') + '<span class="sp"></span>' + right.map(bh).join('') + '</div></div>';
      root.appendChild(s);
      s.addEventListener('click', function(e){
        var b = e.target.closest('[data-act]'); if (!b) return;
        s.remove(); var k = b.getAttribute('data-act'); done(k === 'cancel' ? null : k);
      });
    });
  }

  // ——— where an overlay opens (layout pixels — the stand may zoom the screen) ———
  // by a button: under it (above it near the bottom of the screen); a button in the left half opens it
  // from its left edge, in the right half — from its right edge. By a point (a long press): by the finger.
  function place(el, anchor){
    var rr = root.getBoundingClientRect(), k = TT.scale || 1, W = rr.width / k, H = rr.height / k, mw = el.offsetWidth, mh = el.offsetHeight;
    if (isEl(anchor)){
      var ar = anchor.getBoundingClientRect();
      if ((ar.left + ar.right) / 2 - rr.left < rr.width / 2) el.style.left = Math.max(8, (ar.left - rr.left) / k) + 'px';
      else el.style.right = Math.max(8, (rr.right - ar.right) / k) + 'px';
      var below = (ar.bottom - rr.top) / k + 6, above = (ar.top - rr.top) / k - 6 - mh;
      el.style.top = (below + mh > H - 8 && above > 8 ? above : below) + 'px';
      anchor.classList.add('open');
    } else {
      var x = (anchor.x - rr.left) / k, y = (anchor.y - rr.top) / k + 12;
      if (y + mh > H - 8) y = Math.max(8, y - mh - 24);
      el.style.left = Math.max(8, Math.min(x - 24, W - mw - 8)) + 'px'; el.style.top = y + 'px';
    }
  }

  // ——— menu under a button: items [{key, icon, label, desc, dis} | '-'] → Promise(key | null) ———
  var openMenu = null;
  function isEl(a){ return a && a.nodeType === 1; }
  function closeMenu(){ if (openMenu){ openMenu.el.remove(); if (isEl(openMenu.anchor)) openMenu.anchor.classList.remove('open'); var d = openMenu.done; openMenu = null; d(null); } }
  // anchor: a button (the menu opens under it, right edges aligned) or a point {x, y} in client
  // coordinates (a long press: the menu opens by the finger, kept inside the screen); head — its title line
  function menu(anchor, items, head){
    closeMenu();
    return new Promise(function(done){
      var el = document.createElement('div'); el.className = 'tk-menu'; el.setAttribute('role', 'menu');
      el.innerHTML = (head ? '<div class="tk-mh">' + esc(head) + '</div>' : '') + items.map(function(it){
        if (it === '-') return '<div class="tk-mdiv"></div>';
        return '<div class="tk-mi" role="menuitem" data-key="' + it.key + '"' + (it.dis ? ' disabled' : '') + '>' + (it.icon || '') +
          '<span><b>' + esc(it.label) + '</b>' + (it.desc ? '<small>' + esc(it.desc) + '</small>' : '') + '</span></div>';
      }).join('');
      root.appendChild(el);
      place(el, anchor);
      openMenu = {el:el, anchor:anchor, done:done};
      el.addEventListener('click', function(e){
        var it = e.target.closest('.tk-mi'); if (!it || it.hasAttribute('disabled')) return;
        var key = it.getAttribute('data-key'); el.remove(); if (isEl(anchor)) anchor.classList.remove('open'); openMenu = null; done(key);
      });
    });
  }
  // ——— a panel by a button that stays open while you work in it (switches): html → its element;
  // onTap(e, el) gets the taps inside; a tap outside closes it, like a menu ———
  function pop(anchor, html, onTap, cls){
    closeMenu();
    var el = document.createElement('div'); el.className = 'tk-menu tk-pop ' + (cls || ''); el.innerHTML = html;
    root.appendChild(el); place(el, anchor);
    openMenu = {el:el, anchor:anchor, done:function(){}};
    el.addEventListener('click', function(e){ onTap(e, el); });
    return el;
  }
  // a tap outside closes the menu (and is not passed on — the first tap only closes)
  root.addEventListener('pointerdown', function(e){
    if (openMenu && !openMenu.el.contains(e.target) && !(isEl(openMenu.anchor) && openMenu.anchor.contains(e.target))){
      closeMenu(); e.stopPropagation();
      function eat(ev){ ev.stopPropagation(); ev.preventDefault(); }
      root.addEventListener('click', eat, true);
      window.addEventListener('pointerup', function(){ setTimeout(function(){ root.removeEventListener('click', eat, true); }, 0); }, {once:true});
    }
  }, true);

  // ——— finger scrolling with inertia (mouse drag works the same); a drag never becomes a tap ———
  // onUser — called when a person scrolls (a drag or the wheel), not the program: e.g. Follow lets go
  function dragScroll(el, axis, onUser){
    var x = axis !== 'y', start = 0, pos = 0, moved = false, down = false, last = 0, lt = 0, v = 0, raf = 0;
    function cur(e){ return (x ? e.clientX : e.clientY) / (TT.scale || 1); }
    // window listeners live only while a finger is down — re-rendered rows don't pile them up
    el.addEventListener('pointerdown', function(e){
      cancelAnimationFrame(raf); down = true; moved = false; start = cur(e); pos = x ? el.scrollLeft : el.scrollTop; last = start; lt = performance.now(); v = 0;
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    });
    function move(e){
      if (!down) return;
      var c = cur(e), d = c - start;
      if (!moved && Math.abs(d) > 8){ moved = true; if (onUser) onUser(); }
      if (!moved) return;
      if (x) el.scrollLeft = pos - d; else el.scrollTop = pos - d;
      var now = performance.now(); v = (c - last) / Math.max(1, now - lt); last = c; lt = now;
      el.dispatchEvent(new Event('scroll'));
    }
    function up(){
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (!down) return; down = false;
      if (!moved) return;
      // the click that ends a drag is swallowed; the guard lives one task only, so no later tap is lost
      function eat(ev){ ev.stopPropagation(); ev.preventDefault(); }
      el.addEventListener('click', eat, true); setTimeout(function(){ el.removeEventListener('click', eat, true); }, 0);
      var vel = -v * 16;
      (function step(){
        if (Math.abs(vel) < 0.5) return;
        if (x) el.scrollLeft += vel; else el.scrollTop += vel;
        vel *= 0.93; el.dispatchEvent(new Event('scroll')); raf = requestAnimationFrame(step);
      })();
    }
    // a mouse wheel scrolls too (never the only way — rule 6.3)
    el.addEventListener('wheel', function(e){ if (onUser) onUser(); if (x){ el.scrollLeft += e.deltaY + e.deltaX; e.preventDefault(); } }, {passive:false});
  }

  // ——— long press, 0.5 s: where Tuner has the right mouse button (rule 6.3) ———
  // fn(el, {x, y}) fires while the finger is still down; the click that ends the press is eaten.
  // Moving more than 8 px (a scroll) cancels it.
  function longPress(scope, selector, fn){
    var timer = 0, sx = 0, sy = 0, target = null;
    function cancel(){ clearTimeout(timer); timer = 0; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', cancel); window.removeEventListener('pointercancel', cancel); }
    function mv(e){ if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) cancel(); }
    scope.addEventListener('pointerdown', function(e){
      target = e.target.closest(selector); if (!target || !scope.contains(target)) return;
      sx = e.clientX; sy = e.clientY;
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', cancel); window.addEventListener('pointercancel', cancel);
      timer = setTimeout(function(){
        cancel();
        function eat(ev){ ev.stopPropagation(); ev.preventDefault(); }
        scope.addEventListener('click', eat, true);
        window.addEventListener('pointerup', function(){ setTimeout(function(){ scope.removeEventListener('click', eat, true); }, 0); }, {once:true});
        fn(target, {x:sx, y:sy});
      }, 500);
    });
  }

  // no browser context menu or text selection on the screen: a long press is the app's own (rule 6.3)
  root.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  TT.ui = {esc:esc, spr:spr, ic:ic, btn:btn, toast:toast, ask:ask, menu:menu, pop:pop, closeMenu:closeMenu, dragScroll:dragScroll, longPress:longPress};
})();
