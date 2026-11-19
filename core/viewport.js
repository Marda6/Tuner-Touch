// ENCY Tuner — chrome of the 3D view (the scene itself is a placeholder):
//   rail on the right — Application toolbar (Smart snap · Measure tool · Geometry measuring ·
//     Verify compare), Visibility (9 objects), Selection filters (6 kinds); folds away
//   bottom — view cube · view tools (zoom extents · display mode · lathe view · section) ·
//     process indicator · coordinate systems · notifications · CPU load
// Sets and descriptions come from the Tuner manual. Shared services for the other blocks:
//   TUNER_VIEW.progress(label, ms) → {done, set(p), cancel} — the process indicator
//   TUNER_VIEW.notify(title, text, kind) — an application event (bell + a pop-up)
//   TUNER_VIEW.menu(anchor, html, onClick) — a menu of the 3D view;  TUNER_VIEW.busy(on)
(function(){
  'use strict';

  var vp = document.querySelector('.viewport'), ws = document.getElementById('ws');
  if (!vp) return;
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function load(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
  function save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

  // ——— icon cells (Dflt row, col of BtnsDarkIconPack.ini) ———
  function view(r, c){ return '<span class="ei ei20 s-view" style="background-position:-' + (c - 1) * 20 + 'px -' + (r - 1) * 20 + 'px"></span>'; }
  function fn(r, c){ return '<span class="ei ei20 s-fn" style="background-position:-' + (c - 1) * 20 + 'px -' + (r - 1) * 20 + 'px"></span>'; }

  var APP = [
    {id:'snap',    t:'Smart snap', d:'Snapping to objects in the graphics window: dock parts and fixtures to the machine nodes, place coordinate systems.', ic: fn(1, 9)},
    {id:'measure', t:'Measure tool', d:'Distances between two points: three orthogonal sizes and the diagonal, in the active coordinate system.', ic: fn(1, 11)},
    {id:'geom',    t:'Geometry measuring', d:'Key dimensions of the selected object — part, workpiece, machining result.', ic: fn(1, 10)},
    {id:'verify',  t:'Verify compare', d:'The machining result against the part as a colour map of deviations: rest material and overcuts.', ic: fn(1, 7)}
  ];
  var VIS = [
    {id:'model', t:'Geometrical model', d:'The 3D model loaded into the project.', ic: view(1, 1)},
    {id:'part', t:'Part', d:'The object chosen on the Part tab.', ic: view(1, 2)},
    {id:'workpiece', t:'Workpiece', d:'The workpiece of the operation.', ic: view(1, 5)},
    {id:'result', t:'Machining result', d:'What the simulation has cut so far.', ic: view(1, 3)},
    {id:'holder', t:'Tool holder', d:'The holder of the operation’s tool.', ic: view(1, 6)},
    {id:'tool', t:'Tool', d:'The cutting tool of the operation.', ic: view(1, 7)},
    {id:'fixtures', t:'Fixtures', d:'The fixtures of the setup.', ic: view(1, 8)},
    {id:'machine', t:'Machine', d:'The machine.', ic: view(1, 9)},
    {id:'toolpath', t:'Tool path', d:'The toolpath of the node selected in the tree.', ic: view(1, 16)}
  ];
  var SEL = [
    {id:'points', t:'Select points', ic: view(1, 10)}, {id:'curves', t:'Select curves', ic: view(1, 11)},
    {id:'surfaces', t:'Select surfaces', ic: view(1, 12)}, {id:'edges', t:'Select edges', ic: view(1, 13)},
    {id:'vertices', t:'Select vertices', ic: view(1, 14)}, {id:'meshes', t:'Select meshes', ic: view(1, 15)}
  ];
  // what is on: kept across sessions (all objects but the raw model; every selection kind)
  var on = load('tuner.vp', {model:false, part:true, workpiece:true, result:true, holder:true, tool:true, fixtures:true, machine:true, toolpath:true,
    points:true, curves:true, surfaces:true, edges:true, vertices:true, meshes:true, snap:false});

  function btns(list, grp){
    return list.map(function(b){
      return '<button class="vbtn' + (on[b.id] ? ' on' : '') + '" data-v="' + b.id + '" data-g="' + grp + '" data-tip="' + esc(b.t) + '"' +
        (b.d ? ' data-tip-d="' + esc(b.d) + '"' : '') + ' aria-pressed="' + !!on[b.id] + '">' + b.ic + '</button>';
    }).join('');
  }
  var I_UP = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 6 4.5l3 3"/></svg>';

  // ——— rail ———
  var rail = document.createElement('div');
  rail.className = 'vrail';
  rail.innerHTML =
    '<button class="vrail-fold" data-tip="Fold the toolbars">' + I_UP + '</button>' +
    '<div class="vrail-grp vglass" aria-label="Application toolbar">' + btns(APP, 'app') + '</div>' +
    '<div class="vrail-grp vglass" aria-label="Visibility">' + btns(VIS, 'vis') + '</div>' +
    '<div class="vrail-grp vglass" aria-label="Selection filter">' + btns(SEL, 'sel') + '</div>';
  vp.appendChild(rail);
  if (load('tuner.railShut', false)) ws.classList.add('rail-shut');
  rail.addEventListener('click', function(e){
    if (e.target.closest('.vrail-fold')){
      var shut = ws.classList.toggle('rail-shut'); save('tuner.railShut', shut);
      window.dispatchEvent(new Event('resize')); return;
    }
    var b = e.target.closest('[data-v]'); if (!b) return;
    var id = b.dataset.v;
    // the measuring modes exclude each other; Smart snap is a switch of its own
    if (b.dataset.g === 'app' && id !== 'snap' && !on[id]) ['measure', 'geom', 'verify'].forEach(function(k){ on[k] = false; });
    on[id] = !on[id];
    rail.querySelectorAll('[data-v]').forEach(function(x){ x.classList.toggle('on', !!on[x.dataset.v]); x.setAttribute('aria-pressed', !!on[x.dataset.v]); });
    var o = {}; for (var k in on) if (k !== 'measure' && k !== 'geom' && k !== 'verify') o[k] = on[k];
    save('tuner.vp', o);
  });

  // ——— bottom: cube · view tools · process · CS · notifications · CPU ———
  // the cube: ENCY_UI's geometry, static for now (front-right-top, X to the right, Y away, Z up)
  var cube = document.createElement('div');
  cube.className = 'vcube';
  cube.innerHTML = '<svg viewBox="0 0 96 96" aria-label="View cube">' +
    '<polygon class="vc-face top" data-face="Top" points="48,14 78,28 48,42 18,28"/>' +
    '<polygon class="vc-face lit" data-face="Front" points="18,28 48,42 48,74 18,60"/>' +
    '<polygon class="vc-face" data-face="Right" points="48,42 78,28 78,60 48,74"/>' +
    '<text class="vc-lbl" x="48" y="28">Top</text><text class="vc-lbl" x="33" y="52" transform="skewY(25 33 52)">Front</text>' +
    '<text class="vc-lbl" x="63" y="52" transform="skewY(-25 63 52)">Right</text>' +
    '<path class="vc-ax x" d="M18 60 L50 75"/><text class="vc-axl x" x="54" y="78">X</text>' +
    '<path class="vc-ax y" d="M18 60 L4 53"/><text class="vc-axl y" x="2" y="49">Y</text>' +
    '<path class="vc-ax z" d="M18 60 L18 24"/><text class="vc-axl z" x="18" y="19">Z</text></svg>';
  vp.appendChild(cube);

  var I = {
    disp: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11"/></svg>',
    cs: '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.3" stroke-linecap="round"><path d="M5 11V3" stroke="var(--th-blue-text)"/><path d="M5 11h8" stroke="var(--th-axis-x)"/><path d="M5 11 2 14" stroke="var(--st-green)"/></svg>',
    bell: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M4 11.5V7.2a4 4 0 0 1 8 0v4.3l1 1H3z"/><path d="M6.6 13.6a1.5 1.5 0 0 0 2.8 0" stroke-linecap="round"/></svg>',
    more: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/></svg>'
  };
  var tools = document.createElement('div');
  tools.className = 'vbar vb-tools';
  tools.innerHTML =
    '<button class="vbtn" data-t="zoom" data-tip="Zoom extents" data-tip-d="Fits every object into the graphics window.">' + view(2, 1) + '</button>' +
    '<button class="vbtn" data-t="disp" data-tip="Display mode" data-tip-d="Shade, Shade plus Wire or Wire; Ambient occlusion.">' + view(2, 6) + '</button>' +
    '<button class="vbtn" data-t="turn" data-tip="Rotational bodies" data-tip-d="Lathe projects: the 3D view, a quarter or a half cut away, or the 2D section.">' + view(2, 2) + '</button>' +
    '<button class="vbtn" data-t="section" data-tip="Section plane" data-tip-d="An infinite plane cuts the objects; the cut-off part is hatched.">' + view(2, 9) + '</button>';
  vp.appendChild(tools);

  var sys = document.createElement('div');
  sys.className = 'vbar vb-sys';
  sys.innerHTML =
    '<button class="vbtn" data-s="newcs" data-tip="New coordinate system" data-tip-d="From selected geometry, in a dialog, by a point and the X and Y axes, or by a point and the view vector.">' +
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg></button>' +
    '<button class="vcs" data-s="cs" data-tip="Active coordinate system" data-tip-d="Sizes and some functions use the active one. Click to switch.">' + I.cs + '<span id="vcsName">Global CS</span></button>' +
    '<span class="vsep"></span>' +
    '<button class="vbtn vbell" data-s="bell" data-tip="Notifications">' + I.bell + '<span class="badge" hidden>0</span></button>' +
    '<span class="vcpu" data-tip="CPU load"><span class="pc">2%</span><span class="meter"><i></i></span></span>';
  vp.appendChild(sys);

  var prog = document.createElement('div');
  prog.className = 'vprog vglass'; prog.hidden = true;
  prog.innerHTML = '<span class="vp-t"></span><span class="vp-track"><i></i></span><span class="vp-pct">0%</span><span class="vp-time">0:00</span>' +
    '<button class="vp-x" title="Cancel">Cancel</button>';
  vp.appendChild(prog);

  // the process indicator spans the room between the view tools and the system group
  function place(){
    vp.style.setProperty('--tools-w', tools.offsetWidth + 'px');
    vp.style.setProperty('--sys-w', sys.offsetWidth + 'px');
  }
  new ResizeObserver(place).observe(tools); new ResizeObserver(place).observe(sys);

  // ——— view tools: display mode, lathe view (lathe machines only), section ———
  var disp = load('tuner.disp', {mode:'Shade', ao:false, turn:'3D'}), section = false;
  function isLathe(){ var p = window.TUNER_PROJECT && TUNER_PROJECT.get(); return !!(p && /lathe|turn/i.test((p.params.machine.kin || '') + ' ' + p.machine)); }
  function syncTools(){
    tools.querySelector('[data-t="turn"]').hidden = !isLathe();
    tools.querySelector('[data-t="disp"]').innerHTML = view(2, {Shade:6, Wire:7, 'Shade + Wire':8}[disp.mode]);
    tools.querySelector('[data-t="turn"]').innerHTML = view(2, {'3D':2, '3/4':3, '1/2':4, '2D':5}[disp.turn]);
    tools.querySelector('[data-t="section"]').classList.toggle('on', section);
  }
  document.addEventListener('tuner:project', syncTools);
  syncTools();
  tools.addEventListener('click', function(e){
    var b = e.target.closest('[data-t]'); if (!b) return;
    var t = b.dataset.t;
    if (t === 'zoom'){ b.classList.add('on'); setTimeout(function(){ b.classList.remove('on'); }, 200); }
    else if (t === 'section'){ section = !section; syncTools(); }
    else if (t === 'disp') menu(b,
      '<div class="vm-head">Display mode</div><div class="vm-seg">' + ['Shade', 'Shade + Wire', 'Wire'].map(function(m){
        return '<button data-m="' + m + '" class="' + (m === disp.mode ? 'cur' : '') + '">' + m + '</button>'; }).join('') + '</div>' +
      '<div class="vm-div"></div><button class="vm-opt" data-ao><span class="ck">' + (disp.ao ? '✓' : '') + '</span>Ambient occlusion</button>',
      function(x){ if (x.dataset.m) disp.mode = x.dataset.m; else if (x.hasAttribute('data-ao')) disp.ao = !disp.ao; save('tuner.disp', disp); syncTools(); return true; });
    else if (t === 'turn') menu(b,
      '<div class="vm-head">Rotational bodies</div><div class="vm-seg">' + ['3D', '3/4', '1/2', '2D'].map(function(m){
        return '<button data-m="' + m + '" class="' + (m === disp.turn ? 'cur' : '') + '">' + m + '</button>'; }).join('') + '</div>',
      function(x){ if (x.dataset.m){ disp.turn = x.dataset.m; save('tuner.disp', disp); syncTools(); } return true; });
  });

  // ——— coordinate systems: Global, then the work offsets of the program ———
  var csName = document.getElementById('vcsName');
  function csList(){
    var p = TUNER_PROJECT.get(), l = ['Global CS'];
    if (p) p.channels.forEach(function(c){ c.ops.forEach(function(o){ if (l.indexOf(o.wcs) < 0) l.push(o.wcs); }); });
    return l;
  }
  sys.addEventListener('click', function(e){
    var b = e.target.closest('[data-s]'); if (!b) return;
    var s = b.dataset.s;
    if (s === 'cs') menu(b, '<div class="vm-head">Coordinate systems</div>' + csList().map(function(c){
        return '<button class="vm-opt' + (c === csName.textContent ? ' cur' : '') + '" data-cs="' + esc(c) + '"><span class="ck">' + (c === csName.textContent ? '✓' : '') + '</span>' + esc(c) + '</button>'; }).join(''),
      function(x){ if (x.dataset.cs) csName.textContent = x.dataset.cs; });
    else if (s === 'newcs') menu(b, '<div class="vm-head">New coordinate system</div>' +
      ['With selected geometry', 'In a dialog…', 'By a point, X and Y axes', 'By a point and the view vector'].map(function(t){
        return '<button class="vm-opt" data-new><span class="ck"></span>' + t + '</button>'; }).join(''),
      function(){ notify('Not built in the prototype', 'Creating coordinate systems comes with the 3D view.', 'info'); });
    else if (s === 'bell') openNotes(b);
  });

  // ——— menus of the 3D view: above their button (the bar is at the bottom) ———
  var openM = null;
  function closeMenu(){ if (openM){ openM._b.classList.remove('open'); openM.remove(); openM = null; } }
  function menu(anchor, html, onPick){
    var was = openM && openM._b === anchor; closeMenu(); if (was) return;
    openM = document.createElement('div');
    openM.className = 'vmenu'; openM._b = anchor; anchor.classList.add('open');
    openM.innerHTML = html;
    document.body.appendChild(openM);
    var r = anchor.getBoundingClientRect(), m = openM.getBoundingClientRect();
    var top = r.top > window.innerHeight / 2 ? r.top - 4 - m.height : r.bottom + 4;
    openM.style.top = Math.max(4, top) + 'px';
    openM.style.left = Math.max(4, Math.min(r.left, innerWidth - m.width - 4)) + 'px';
    openM.addEventListener('click', function(ev){
      var x = ev.target.closest('button'); if (!x) return;
      var keep = onPick && onPick(x);
      if (keep){ var b = openM._b; closeMenu(); b.click(); } else closeMenu();
    });
    openM.addEventListener('input', function(ev){ if (onPick) onPick(ev.target); });
    return openM;
  }
  document.addEventListener('mousedown', function(e){
    if (openM && !openM.contains(e.target) && !openM._b.contains(e.target)) closeMenu();
    if (notes && !notes.contains(e.target) && !e.target.closest('.vbell')) closeNotes();
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ closeMenu(); closeNotes(); } });

  // ——— notifications: a pop-up for a few seconds, the bell keeps the list and counts unread ———
  var events = [], unread = 0, notes = null, badge = sys.querySelector('.badge');
  var NOTE_IC = {error:'assets/tree/st-error.svg', warn:'assets/tree/st-warn.svg', done:'assets/tree/st-done.svg', info:'assets/tree/st-calc.svg'};
  function clock(){ var d = new Date(); return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); }
  function noteHTML(n){
    return '<img src="' + NOTE_IC[n.kind || 'info'] + '" alt=""><span class="vn-t"><b>' + esc(n.title) + '</b>' + esc(n.text || '') + '</span><span class="vn-time">' + n.time + '</span>';
  }
  function notify(title, text, kind){
    var n = {title: title, text: text, kind: kind, time: clock()};
    events.unshift(n); unread++;
    badge.hidden = false; badge.textContent = unread;
    if (notes){ renderNotes(); return; }
    var pop = document.createElement('div');
    pop.className = 'vpop-note vglass out'; pop.innerHTML = noteHTML(n);
    document.body.appendChild(pop);
    var r = sys.getBoundingClientRect();
    pop.style.right = (innerWidth - r.right) + 'px'; pop.style.bottom = (innerHeight - r.top + 8) + 'px';
    setTimeout(function(){ pop.classList.remove('out'); }, 20);
    setTimeout(function(){ pop.classList.add('out'); }, 3200);
    setTimeout(function(){ pop.remove(); }, 3500);
  }
  function renderNotes(){
    notes.innerHTML = '<div class="vn-head">Notifications' + (events.length ? '<button data-clear>Clear</button>' : '') + '</div>' +
      (events.length ? events.map(function(n){ return '<div class="vn">' + noteHTML(n) + '</div>'; }).join('') : '<div class="vn-empty">No notifications</div>');
  }
  function openNotes(b){
    if (notes){ closeNotes(); return; }
    notes = document.createElement('div');
    notes.className = 'vnote-list vglass';
    renderNotes();
    document.body.appendChild(notes);
    var r = b.getBoundingClientRect();
    notes.style.right = Math.max(4, innerWidth - r.right - 40) + 'px'; notes.style.bottom = (innerHeight - r.top + 8) + 'px';
    b.classList.add('open');
    unread = 0; badge.hidden = true;
    notes.addEventListener('click', function(e){ if (e.target.closest('[data-clear]')){ events = []; renderNotes(); } });
  }
  function closeNotes(){ if (notes){ notes.remove(); notes = null; sys.querySelector('.vbell').classList.remove('open'); } }

  // ——— process indicator: label · track · % · time · Cancel (asks once more) ———
  var job = null;
  function progress(label, ms){
    if (job) job.cancel(true);
    var t0 = Date.now(), p = 0, j = {done: null, onCancel: null};
    prog.hidden = false;
    prog.querySelector('.vp-t').innerHTML = label;
    var x = prog.querySelector('.vp-x'); x.classList.remove('ask'); x.textContent = 'Cancel';
    busy(true);
    function paint(){
      var s = Math.round((Date.now() - t0) / 1000);
      prog.querySelector('.vp-track i').style.width = p + '%';
      prog.querySelector('.vp-pct').textContent = Math.round(p) + '%';
      prog.querySelector('.vp-time').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    }
    // a timed job runs by itself (on a timer: frames stop while the window is hidden, the work
    // must not); a job without a time is driven by set()
    var timer = 0;
    function end(){ clearInterval(timer); prog.hidden = true; busy(false); if (job === j) job = null; }
    function tick(){ p = Math.min(100, (Date.now() - t0) / ms * 100); paint(); if (p >= 100){ end(); if (j.done) j.done(); } }
    j.set = function(v){ p = v; paint(); };
    j.finish = function(){ p = 100; paint(); end(); };
    j.cancel = function(quiet){ end(); if (!quiet && j.onCancel) j.onCancel(); };
    job = j;
    paint();
    if (ms) timer = setInterval(tick, 50);
    return j;
  }
  prog.querySelector('.vp-x').addEventListener('click', function(){
    var x = this;
    if (!x.classList.contains('ask')){ x.classList.add('ask'); x.textContent = 'Cancel?'; setTimeout(function(){ x.classList.remove('ask'); x.textContent = 'Cancel'; }, 2500); return; }
    if (job) job.cancel();
  });

  // ——— CPU load: quiet at rest, up while something runs ———
  var cpu = sys.querySelector('.vcpu'), load_ = 2, hot = 0;
  function busy(onoff){ hot = Math.max(0, hot + (onoff ? 1 : -1)); }
  setInterval(function(){
    var target = hot ? 55 + Math.random() * 35 : 1 + Math.random() * 3;
    load_ += (target - load_) * 0.5;
    cpu.querySelector('.pc').textContent = Math.round(load_) + '%';
    cpu.querySelector('.meter i').style.height = Math.round(load_) + '%';
    cpu.classList.toggle('hot', load_ > 80);
  }, 700);

  // ——— tooltip: the name, a line, what it does (ENCY function panel) ———
  var tip = document.createElement('div'), tipT = null;
  tip.className = 'vtip'; tip.hidden = true; document.body.appendChild(tip);
  vp.addEventListener('mouseover', function(e){
    var el = e.target.closest('[data-tip]'); clearTimeout(tipT); tip.hidden = true;
    if (!el || openM) return;
    tipT = setTimeout(function(){
      tip.innerHTML = '<b>' + esc(el.dataset.tip) + '</b>' + (el.dataset.tipD ? '<span>' + esc(el.dataset.tipD) + '</span>' : '');
      tip.hidden = false;
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      // the rail: to its left; the bottom bar: above; the top panel: below
      var left, top;
      if (el.closest('.vrail')){ left = r.left - w - 8; top = r.top + (r.height - h) / 2; }
      else if (el.closest('.simpanel')){ left = r.left + (r.width - w) / 2; top = r.bottom + 8; }
      else { left = r.left + (r.width - w) / 2; top = r.top - h - 8; }
      tip.style.left = Math.max(4, Math.min(left, innerWidth - w - 4)) + 'px';
      tip.style.top = Math.max(4, Math.min(top, innerHeight - h - 4)) + 'px';
    }, 450);
  });
  vp.addEventListener('mouseleave', function(){ clearTimeout(tipT); tip.hidden = true; }, true);
  vp.addEventListener('mousedown', function(){ clearTimeout(tipT); tip.hidden = true; });

  window.TUNER_VIEW = {progress: progress, notify: notify, menu: menu, closeMenu: closeMenu, busy: busy};
})();
