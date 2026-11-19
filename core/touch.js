// Tuner Touch, variant 3 — the desktop Tuner's ENCY Core panels laid out by the spec (TZ v12, sect. 3–4), only
// html.touch. Nothing is drawn anew where Core has it: the panels, the Setup tree, the NC editor with its marks,
// the visibility column and the simulation panel are the desktop ones, moved and sized for a finger; their
// logic stays theirs (Run program, Split, Find, the checks, the fast simulation, the errors).
//   top bar    ◀ Tuner window · Open | the project ▾ (its projects — Ruslan's proposal in place of the tabs row)
//              … errors · state · Calculate | Save ▾ · View only | — ✕
//   left 460   Setup: channels (or its name) · Split | Operations | Axes | the operations of the channel
//              NC code: the file · Open program · Follow | the text 16 / 32 | Page up · Page down · Find … Edit
//   3D         left: the finger's mode · Fit · Iso · Top · Front · Right · Measure; right: visibility + Verify
//              Compare; under it the timeline (Core has none — drawn here in Core's frame and op palette)
//   bottom 72  the simulation panel in Tuner's order, captioned keys of 56, speed to the edge
// Not in sect. 3, so not on screen: the inspector, the Stream editor, the header's utilities, the selection
// filters, the cube and the 3D's bottom bar.
(function(){
  'use strict';
  var R = document.documentElement;
  if (!R.classList.contains('touch')) return;
  var app = document.getElementById('app'), ws = document.getElementById('ws');
  var dock = document.getElementById('dock'), codecol = document.getElementById('codecol');
  var panelTree = document.getElementById('panelTree'), treeEl = document.getElementById('tree');
  var chTabs = document.getElementById('chTabs'), vp = document.querySelector('.viewport');
  var V = window.TUNER_VIEW, H = window.TUNER_HEADER, P = window.TUNER_PROJECT, EX = window.TUNER_EXAMPLES || {};
  if (!app || !ws || !V || !H || !P) return;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function load(k, d){ try { var v = localStorage.getItem('touch.core.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function keep(k, v){ try { localStorage.setItem('touch.core.' + k, JSON.stringify(v)); } catch (e) {} }
  function sim(){ return window.TUNER_SIM; }

  // fixed columns (rule 11): what the desk folded comes back
  [dock, codecol].forEach(function(el){ if (el) el.classList.remove('shut', 'peek'); });
  ws.classList.remove('dock-shut', 'code-shut', 'rail-shut');

  // ——— glyphs Tuner has no sprite for (stroke, 24) and Core's sprite cells ———
  function svg(d, sw){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.6) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
  function view(r, c){ return '<span class="ei ei20 s-view" style="background-position:-' + (c - 1) * 20 + 'px -' + (r - 1) * 20 + 'px"></span>'; }
  function fn(r, c){ return '<span class="ei ei20 s-fn" style="background-position:-' + (c - 1) * 20 + 'px -' + (r - 1) * 20 + 'px"></span>'; }
  var CHEV = svg('<path d="m7 10 5 5 5-5"/>', 1.8);
  var G = {
    lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>'),
    lockOpen: svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2"/>'),
    x: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    min: svg('<path d="M6 12h12"/>'),
    stop: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/></svg>',
    check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 2),
    split: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="7.4" width="10" height="1.2" rx=".6"/><circle cx="8" cy="4.2" r="1.2"/><circle cx="8" cy="11.8" r="1.2"/></svg>',
    pgUp: svg('<path d="M6 11.5l6-6 6 6M6 18.5l6-6 6 6"/>'),
    pgDn: svg('<path d="M6 5.5l6 6 6-6M6 12.5l6 6 6-6"/>'),
    edit: svg('<path d="M14.5 5.5l4 4L8 20H4v-4z"/><path d="M12.5 7.5l4 4"/>'),
    pan: svg('<path d="M12 3.5v17M3.5 12h17"/><path d="m9.5 6 2.5-2.5L14.5 6M9.5 18l2.5 2.5 2.5-2.5M6 9.5 3.5 12 6 14.5M18 9.5l2.5 2.5-2.5 2.5"/>'),
    zoom: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/>'),
    follow: svg('<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>'),
    dots: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>'
  };
  function cube(face){
    var top = 'M12 3.5 19.5 7.5 12 11.5 4.5 7.5Z', lf = 'M4.5 7.5 12 11.5V20.5L4.5 16.5Z', rt = 'M19.5 7.5 12 11.5V20.5L19.5 16.5Z';
    var f = function(d){ return '<path d="' + d + '" fill="currentColor" fill-opacity=".45" stroke="none"/>'; };
    return svg((face === 'iso' ? f(top) + f(lf) + f(rt) : face === 'top' ? f(top) : face === 'front' ? f(lf) : f(rt)) +
      '<path d="' + top + '"/><path d="M4.5 7.5V16.5L12 20.5 19.5 16.5V7.5M12 11.5V20.5"/>', 1.4);
  }
  // a Core button at the touch size: icon + label; `cap` — the caption under the icon
  function btn(a, icon, label, cls, dis, cap){
    return '<button class="t-b' + (cap ? ' t-cap' : '') + (cls ? ' ' + cls : '') + '" data-a="' + a + '"' + (dis ? ' disabled' : '') +
      (label ? '' : ' aria-label="' + esc(a) + '"') + '>' + (icon || '') + (label ? '<span>' + esc(label) + '</span>' : '') + '</button>';
  }

  // ——— what Core's services say, as the spec wants it: no notifications about errors (they are at the blocks),
  // a calculation's progress in the top bar (its Cancel there too) ———
  var notify0 = V.notify;
  V.notify = function(title, text, kind){ if (kind === 'error') return; notify0(title, text, kind); };
  var progEl = document.querySelector('.vprog'), job = null, watchT = 0;
  var progress0 = V.progress;
  V.progress = function(label, ms){
    var j = progress0(label, ms), p = P.get();
    var rec = {kind: /calculation/i.test(label) ? 'calc' : 'sim', t0: Date.now(), ms: ms, p: 0, j: j, pid: p ? p.id : null};
    var set0 = j.set; j.set = function(v){ rec.p = v; set0(v); };
    job = rec;
    clearInterval(watchT);
    watchT = setInterval(function(){
      if (job && progEl && !progEl.hidden){ inPlace(); return; }
      job = null; clearInterval(watchT); all();
    }, 100);
    all();
    return j;
  };
  function pct(){ return !job ? 0 : job.ms ? Math.min(100, (Date.now() - job.t0) / job.ms * 100) : job.p; }

  // ——— the project's facts ———
  var dirty = {}, viewOnly = false;
  function opsOf(p){ var a = []; p.channels.forEach(function(c){ a = a.concat(c.ops); }); return a; }
  function found(o){ return (o.status === 'error' || o.simTo != null) ? Object.keys(o.errors).length : 0; }
  function errCount(p){ return opsOf(p).reduce(function(n, o){ return n + found(o); }, 0); }
  function state(p){
    if (job && job.kind === 'calc' && job.pid === p.id) return 'calc';
    if ((sim() && sim().playing()) || (job && job.kind === 'sim' && job.ms)) return 'sim';
    var ops = opsOf(p);
    return !ops.length || ops.some(function(o){ return o.status === 'none'; }) ? 'needs' : 'done';
  }
  var ST = {needs: ['st-none', 'Needs calculation'], calc: ['st-prog', 'Calculating'], sim: ['st-prog', 'Simulating'], done: ['st-calc', 'Calculated']};
  function stText(s){ return s === 'calc' ? 'Calculating ' + Math.floor(pct()) + ' %' : ST[s][1]; }
  function metaOf(t){
    var p = P.get(), ex = EX[t.name] || {};
    if (p && p.id === t.id) return [p.machine, p.interpreter, p.file];
    return [ex.machine || 'No machine', ex.interpreter, ex.file || 'New program'];
  }

  // ═══ 1. Top bar ═══
  var top = document.createElement('header');
  top.className = 'topbar t-top';
  app.insertBefore(top, ws);
  var topShape = '', pmenu = null;
  function renderTop(){
    var p = P.get(), list = H.list(), s = p ? state(p) : '', n = p ? errCount(p) : 0, vo = viewOnly;
    var shape = [p ? p.id : '-', list.length, s, n, vo, p && dirty[p.id], !!pmenu].join('|');
    if (shape === topShape){ inPlace(); return; }
    topShape = shape;
    top.innerHTML =
      btn('tuner', '<img src="assets/header/logo.svg" alt="">', 'Tuner window', 't-win') +
      btn('open', '<img src="assets/header/open.svg" alt="">', 'Open', 't-open') +
      '<span class="hdiv"></span>' +
      (p ? '<button class="t-proj' + (pmenu ? ' open' : '') + '" data-a="projects" aria-haspopup="menu"><span class="t-proj-tx"><b>' + esc(p.name) + '</b><span>' +
          esc(metaOf({id: p.id, name: p.name}).slice(0, 2).filter(Boolean).join(' · ')) + '</span></span>' +
          '<span class="t-proj-n" aria-label="' + list.length + (list.length === 1 ? ' project open' : ' projects open') + '">' + list.length + '</span><span class="t-proj-chev">' + CHEV + '</span></button>'
         : '<span class="t-proj-tx"><span>No project open</span></span>') +
      '<span class="t-sp"></span>' +
      // the errors' place is kept when there are none: the keys right of it never move
      '<button class="t-b t-err' + (n ? '' : ' none') + '" data-a="errors"' + (n ? '' : ' disabled') + '><img src="assets/tree/st-error.svg" alt=""><span>' + n +
        '<span class="w">' + (n === 1 ? ' error' : ' errors') + '</span></span></button>' +
      // the state belongs to Calculate (Ruslan): a divider parts it from the errors, it stands against the key
      '<span class="hdiv"></span>' +
      (p ? '<span class="t-state ' + s + '"><img src="assets/tree/' + ST[s][0] + '.svg" alt=""><span class="t-st-tx"><span data-st>' + esc(stText(s)) + '</span>' +
          (s === 'calc' ? '<i data-bar style="--p:' + pct() + '%"></i>' : '') + '</span></span>' : '') +
      (s === 'calc' ? btn('cancel', G.stop, 'Cancel')
                    : btn('calc', '<span class="ei ei16 s-mac i-run"></span>', 'Calculate', s === 'needs' ? 'pri' : 'run', !p)) +
      '<span class="hdiv"></span>' +
      '<div class="t-split' + (p && dirty[p.id] ? ' dirty' : '') + '">' + btn('save', '<img src="assets/header/save.svg" alt="">', 'Save', '', vo || !p) +
        btn('savemenu', CHEV, '', '', vo || !p) + '</div>' +
      (vo ? btn('lock', G.lock, 'View only', 'lock on') : btn('lock', G.lockOpen, '', 'lock sq ghost')) +
      '<span class="hdiv"></span>' +
      btn('min', G.min, '', 'sq ghost') + btn('quit', G.x, '', 'sq ghost');
    top.querySelectorAll('.t-b > img[src*="header/"]').forEach(function(i){ i.style.width = i.style.height = 'calc(30px * var(--ki))'; });
    compactTop();
  }
  // the numbers of a running calculation change in place: a press is never lost to a re-render
  function inPlace(){
    var p = P.get(); if (!p) return;
    var st = top.querySelector('[data-st]'), bar = top.querySelector('[data-bar]');
    if (st && state(p) === 'calc') st.textContent = stText('calc');
    if (bar) bar.style.setProperty('--p', pct() + '%');
    if (pmenu) pmenu.querySelectorAll('[data-pct]').forEach(function(x){ x.textContent = 'Calculating ' + Math.floor(pct()) + ' %'; });
  }
  // the project's name must read: while its block is squeezed below 300 (Font), first Tuner window and Open
  // keep their icons (Tuner's logo and the folder), then the state keeps its status icon
  function compactTop(){
    top.classList.remove('c1', 'c2', 'c3');
    var pr = top.querySelector('.t-proj'), sp = top.querySelector('.t-sp');
    if (!pr) return;
    // the room the project's words have: the button's text part and the spacer (the count and ▾ apart), counted as if
    // the state said its longest words — so the steps are the same for every project and state, the bar never changes
    // its steps between projects (the errors' place is kept too). c2 below 300 for the name (Font), c1 below 200
    var st = top.querySelector('.t-st-tx'), longest = 0;
    if (st){
      var probe = st.cloneNode(false); probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
      ['Needs calculation', 'Calculating 100 %'].forEach(function(w){ probe.textContent = w; top.appendChild(probe); longest = Math.max(longest, probe.offsetWidth); probe.remove(); });
    }
    var spare = st && st.offsetWidth ? Math.max(0, longest - st.offsetWidth) : 0;
    function room(){ return pr.querySelector('.t-proj-tx').offsetWidth + sp.offsetWidth - spare; }
    if (room() < 300 * TOUCH.kf) top.classList.add('c2');
    if (room() < 200 * TOUCH.kf) top.classList.add('c1');
    // c3 (large settings on 1280): the counts without their words, Calculate and Save as their icons
    if (room() < 160 * TOUCH.kf || top.scrollWidth > top.clientWidth + 1) top.classList.add('c3');
  }
  top.addEventListener('click', function(e){
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.dataset.a, p = P.get();
    if (a === 'projects') projMenu(b);
    else if (a === 'tuner') V.notify('ENCY Tuner window', 'The touch interface closes; Tuner shows this project with the edits and the simulation.', 'info');
    else if (a === 'open' || a === 'openproj') V.notify('Open', 'The Open screen (projects, flash drives, network folders) — block 7.', 'info');
    else if (a === 'errors'){ if (sim()) sim().firstError(); }
    else if (a === 'calc'){ var run = document.querySelector('.panel-tree [data-act="run"]'); if (run) run.click(); }
    else if (a === 'cancel'){ if (job) job.j.cancel(); }
    else if (a === 'save') save(p);
    else if (a === 'savemenu') saveMenu(b);
    else if (a === 'lock'){ viewOnly = !viewOnly; R.classList.toggle('t-vo', viewOnly); if (viewOnly) setEdit(false); else renderKeys(); all(); }
    else if (a === 'min') V.notify('Minimize', 'The touch interface and Tuner go to the taskbar.', 'info');
    else if (a === 'quit') V.notify('Close', 'Closes the touch interface with Tuner — asking about unsaved projects first.', 'info');
  });
  function save(p){ if (!p) return; dirty[p.id] = false; all(); V.notify('Saved', p.name + ' — the project with its programs.', 'done'); }

  // ——— menus of the bars: Core's popover at the touch size, under (or over) its button ———
  var menuEl = null;
  function closeMenu(){ if (menuEl){ var b = menuEl._b; menuEl.remove(); menuEl = null; if (b) b.classList.remove('open'); } if (pmenu){ pmenu = null; topShape = ''; renderTop(); } }
  function openMenu(anchor, html, cls, onClick){
    var was = menuEl && menuEl._b === anchor; closeMenu(); if (was) return null;
    menuEl = document.createElement('div');
    menuEl.className = 't-menu' + (cls ? ' ' + cls : ''); menuEl._b = anchor; anchor.classList.add('open');
    menuEl.innerHTML = html;
    document.body.appendChild(menuEl);
    var r = anchor.getBoundingClientRect(), m = menuEl.getBoundingClientRect();
    menuEl.style.left = Math.max(8, Math.min(r.left, innerWidth - m.width - 8)) + 'px';
    menuEl.style.top = (r.top > innerHeight / 2 ? r.top - 6 - m.height : r.bottom + 6) + 'px';
    menuEl.addEventListener('click', onClick);
    return menuEl;
  }
  document.addEventListener('pointerdown', function(e){
    if (menuEl && !menuEl.contains(e.target) && !menuEl._b.contains(e.target)) closeMenu();
  }, true);
  function saveMenu(b){
    var p = P.get(); if (!p) return;
    var c = p.channels[p.view.channel] || p.channels[0];
    openMenu(b, '<button class="t-menu-o" data-k="as"><img src="assets/header/save.svg" alt="">Save project as…</button>' +
      '<button class="t-menu-o" data-k="prog"><img src="assets/header/export.svg" alt="">Save program as… <span style="color:var(--ec-fg-56)">' + esc(c.name) + '</span></button>', '', function(e){
      var o = e.target.closest('[data-k]'); if (!o) return;
      closeMenu(); V.notify(o.dataset.k === 'as' ? 'Save project as' : 'Save program as', 'The Save as screen — block 7.', 'info');
    });
  }

  // ——— the projects: in place of the tabs row (Ruslan's proposal) — the project's name is a button, a tap lists
  // the open projects: the name alone (● unsaved; Ruslan — no machine here), a calculation's progress, ✕; Open project… ———
  function projMenu(b){
    var list = H.list(), cur = H.current();
    var m = openMenu(b, list.map(function(t){   // no title: the count is on the button (Ruslan)
        var calc = job && job.kind === 'calc' && job.pid === t.id;
        return '<div class="t-pm-r' + (cur && cur.id === t.id ? ' cur' : '') + '" data-pid="' + t.id + '" role="menuitem">' +
          '<span class="t-pm-tx"><b>' + esc(t.name) + (dirty[t.id] ? '<i title="Unsaved changes"></i>' : '') + '</b></span>' +
          (calc ? '<span class="t-pm-st" data-pct>Calculating ' + Math.floor(pct()) + ' %</span>' : '') +
          '<button class="t-pm-x" data-x="' + t.id + '" aria-label="Close ' + esc(t.name) + '">' + G.x + '</button></div>';
      }).join('') + '<div class="t-menu-d"></div><button class="t-menu-o" data-a="openproj"><img src="assets/header/open.svg" alt="">Open project…</button>',
      't-pm', function(e){
        var x = e.target.closest('[data-x]');
        if (x){ e.stopPropagation(); closeProject(+x.dataset.x); return; }
        var r = e.target.closest('[data-pid]');
        if (r){ closeMenu(); H.select(+r.dataset.pid); return; }
        if (e.target.closest('[data-a="openproj"]')){ closeMenu(); V.notify('Open', 'The Open screen (projects, flash drives, network folders) — block 7.', 'info'); }
      });
    if (m){ pmenu = m; topShape = ''; renderTop(); menuEl._b = top.querySelector('.t-proj') || b; }
  }
  // closing asks what Tuner asks (spec sect. 3), in the middle of the screen with big buttons
  function ask(title, text, buttons){
    return new Promise(function(done){
      var s = document.createElement('div');
      s.className = 't-scrim';
      s.innerHTML = '<div class="t-ask" role="dialog"><div class="pop-t">' + esc(title) + '</div><div class="pop-d">' + esc(text) + '</div><div class="pop-acts">' +
        buttons.map(function(x){ return '<button class="pbtn' + (x.cls ? ' ' + x.cls : '') + '" data-k="' + x.k + '">' + esc(x.t) + '</button>'; }).join('') + '</div></div>';
      document.body.appendChild(s);
      s.addEventListener('click', function(e){ var k = e.target.closest('[data-k]'); if (k){ s.remove(); done(k.dataset.k); } });
    });
  }
  function closeProject(id){
    var t = H.list().filter(function(x){ return x.id === id; })[0]; if (!t) return;
    var chain = Promise.resolve(true);
    if (job && job.kind === 'calc' && job.pid === id) chain = chain.then(function(){
      return ask('Stop the calculation?', t.name + ' is being calculated (' + Math.floor(pct()) + ' %).', [{k: 'cancel', t: 'Cancel'}, {k: 'stop', t: 'Stop and close', cls: 'primary'}])
        .then(function(k){ if (k !== 'stop') return false; if (job) job.j.cancel(); return true; });
    });
    chain.then(function(go){
      if (!go || !dirty[id]) return go;
      return ask('Save changes to “' + t.name + '”?', 'The project and its programs have unsaved edits.',
        [{k: 'dont', t: 'Don’t save', cls: 'danger left'}, {k: 'cancel', t: 'Cancel'}, {k: 'save', t: 'Save', cls: 'primary'}])
        .then(function(k){ if (k === 'save'){ dirty[id] = false; return true; } return k === 'dont'; });
    }).then(function(go){
      if (!go) return;
      delete dirty[id];
      closeMenu(); H.close(id);
      if (!H.list().length) V.notify('No project open', 'The last project is closed — the Open screen comes up (block 7).', 'info');
    });
  }

  // ═══ 2. Left column ═══
  // --- the Setup panel: one row on its frame (Ruslan, 2026-11-19) — Operations | Axes, Core's Mode tabs (the
  // selected one takes the inset's colour), and on a multichannel machine the channel switch at the right: one
  // tray, its title inside, 1 | 2 (a channel with errors found — a red square in its corner). Split lives in the
  // program's menu (the file ▾ of the code panel). The operations in the inset (tree.js draws them as a list) ---
  var head = document.createElement('div');
  head.className = 't-head';
  panelTree.insertBefore(head, panelTree.firstChild);
  var modes = document.createElement('div');
  modes.className = 'tabs t-modes'; modes.setAttribute('role', 'tablist');
  modes.innerHTML = '<button class="seg" role="tab" data-m="ops">Operations</button><button class="seg" role="tab" data-m="axes">Axes</button>';
  head.appendChild(modes);
  head.insertAdjacentHTML('beforeend', '<span class="t-sp"></span><div class="t-chsw" role="tablist" hidden></div>');
  var chsw = head.querySelector('.t-chsw'), chShape = '';
  // ——— Axes (spec sect. 3, list B, fig. 7): the machine's axes jogged by hand — for each axis − and + (64×60,
  // Icons), the axis, its value: where the program has it at the machine's block plus the jog (amber while off the
  // program; mm, ° for A / B / C). Step — Hold (moves while held, faster after a moment) · 1 · 0.1 per tap … Back
  // to program. The simulation moving on brings the machine back too; while it plays the keys rest. In the desktop
  // Tuner it is the Machine control panel of the simulation panel ———
  var axes = document.createElement('div');
  axes.className = 't-axes'; axes.hidden = true;
  treeEl.parentNode.appendChild(axes);
  var jog = {at: '', off: {}}, jogMode = load('jogMode', 'hold'), axShape = '', jogT = 0;
  var AXG = {minus: svg('<path d="M6 12h12"/>', 2), plus: svg('<path d="M6 12h12M12 6v12"/>', 2),
    back: svg('<path d="M5 9.5A7.5 7.5 0 1 1 4.6 14"/><path d="M4.5 4.5v5h5"/>')};
  // the axes by the machine's kinematics: a lathe X Z (+ C), a mill X Y Z and the rotary axes it names
  function axList(p){
    var kin = ((p.params && p.params.machine && p.params.machine.kin) || '') + ' ' + (p.machine || '');
    var lathe = /lathe|turn/i.test(kin), rot = (kin.match(/\b[ABC]\b/g) || []).filter(function(x, i, a){ return a.indexOf(x) === i; });
    return (lathe ? ['X', 'Z'] : ['X', 'Y', 'Z']).concat(rot.length ? rot : lathe ? ['C'] : []);
  }
  // where the machine stands: the simulation's block; no run — the end of what is simulated, else the start
  function machineAt(p){
    var info = sim() ? sim().info() : {blocks: []}, b = null;
    if (info.run) b = info.blocks[info.pos];
    else info.blocks.forEach(function(x){ if (x.op.status === 'simulated' || x.op.status === 'partial' || x.op.status === 'error') b = x; });
    return b ? {ch: b.ch, line: b.line} : {ch: p.view.channel, line: 0};
  }
  // the modal axis words of the program up to that block (a lathe's X — the diameter, as programmed)
  function posAt(lines, line){
    var v = {};
    for (var i = 0; i <= line && i < lines.length; i++){
      var t = lines[i].replace(/\([^)]*\)/g, '').replace(/;.*$/, '').toUpperCase(), re = /(^|[^A-Z])([XYZABC])\s*(-?\d*\.?\d+)/g, m;
      while ((m = re.exec(t))) v[m[2]] = parseFloat(m[3]);
    }
    return v;
  }
  function axState(){
    var p = P.get(); if (!p) return [];
    var m = machineAt(p), c = p.channels[m.ch] || p.channels[0], at = posAt(c.text.split('\n'), m.line), key = p.id + ':' + m.ch + ':' + m.line;
    if (jog.at !== key) jog = {at: key, off: {}};
    return axList(p).map(function(k){ var o = jog.off[k] || 0; return {k: k, rot: /[ABC]/.test(k), off: o, v: (at[k] || 0) + o}; });
  }
  function axFmt(a){ return a.v.toFixed(3) + (a.rot ? '°' : ''); }
  function renderAxes(){
    if (axes.hidden) return;
    var ax = axState(), busy = !!(sim() && sim().playing()), any = ax.some(function(a){ return a.off; });
    var sh = ax.map(function(a){ return a.k; }).join('');
    if (sh !== axShape){
      axShape = sh;
      axes.innerHTML = '<div class="t-ax-rows">' + ax.map(function(a){
        return '<div class="t-ax-r"><button class="t-b t-ax-k" data-jog="' + a.k + '" data-d="-1" aria-label="' + a.k + ' −">' + AXG.minus + '</button>' +
          '<b class="t-ax-n">' + a.k + '</b><span class="t-ax-v" data-axv="' + a.k + '"></span>' +
          '<button class="t-b t-ax-k" data-jog="' + a.k + '" data-d="1" aria-label="' + a.k + ' +">' + AXG.plus + '</button></div>';
      }).join('') + '</div><div class="t-ax-foot"><span class="t-ax-l">Step</span><div class="ef-seg t-ax-seg" role="radiogroup">' +
        [['hold', 'Hold'], ['1', '1'], ['0.1', '0.1']].map(function(m){ return '<button data-jm="' + m[0] + '" role="radio">' + m[1] + '</button>'; }).join('') +
        '</div><span class="t-sp"></span><button class="t-b t-ax-back" data-a="jogback" aria-label="Back to program">' + AXG.back + '<span>Back to program</span></button></div>';
    }
    ax.forEach(function(a){ var v = axes.querySelector('[data-axv="' + a.k + '"]'); if (v){ v.textContent = axFmt(a); v.classList.toggle('off', !!a.off); } });
    axes.querySelectorAll('[data-jog]').forEach(function(b){ b.disabled = busy; });
    axes.querySelectorAll('[data-jm]').forEach(function(b){ var on = b.dataset.jm === jogMode; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    axes.querySelector('[data-a="jogback"]').disabled = !any;
    hint();
  }
  function jogBy(k, d){ jog.off[k] = Math.round(((jog.off[k] || 0) + d) * 1000) / 1000; renderAxes(); }
  axes.addEventListener('pointerdown', function(e){
    var b = e.target.closest('[data-jog]'); if (!b || b.disabled) return;
    e.preventDefault();
    var k = b.dataset.jog, d = +b.dataset.d, rot = /[ABC]/.test(k);
    try { b.setPointerCapture(e.pointerId); } catch (er) {}
    b.classList.add('on'); clearInterval(jogT);
    if (jogMode !== 'hold') jogBy(k, d * +jogMode);
    else {
      var t0 = performance.now(), last = t0;
      jogT = setInterval(function(){
        var now = performance.now(), dt = (now - last) / 1000, held = (now - t0) / 1000; last = now;
        jogBy(k, d * (rot ? 15 : 5) * (1 + Math.min(5, held * 3)) * dt);   // 5 mm/s (15 °/s), up to ×6 after 1.7 s
      }, 30);
    }
    function up(){ clearInterval(jogT); b.classList.remove('on'); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(n){ b.removeEventListener(n, up); }); }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(n){ b.addEventListener(n, up); });
  });
  axes.addEventListener('click', function(e){
    var m = e.target.closest('[data-jm]');
    if (m){ jogMode = m.dataset.jm; keep('jogMode', jogMode); renderAxes(); return; }
    if (e.target.closest('[data-a="jogback"]')){ jog.off = {}; renderAxes(); }
  });
  var mode = load('mode', 'ops');
  function setMode(m){
    mode = m; keep('mode', m);
    modes.querySelectorAll('.seg').forEach(function(s){ var on = s.dataset.m === m; s.classList.toggle('active', on); s.setAttribute('aria-selected', on); });
    treeEl.hidden = m !== 'ops'; axes.hidden = m === 'ops';
    renderAxes();
  }
  setMode(mode);
  modes.addEventListener('click', function(e){ var s = e.target.closest('[data-m]'); if (s) setMode(s.dataset.m); });
  // a tap on a channel shows its operations and its program (as Core's channel tabs do)
  chsw.addEventListener('click', function(e){
    var b = e.target.closest('[data-ch]'); if (!b) return;
    P.setView({split: false, channel: +b.dataset.ch});
  });
  function syncHead(){
    var p = P.get(), multi = !!(p && p.channels.length > 1);
    var sh = multi ? p.id + ':' + p.view.channel + ':' + p.channels.map(function(c){ return c.ops.some(found) ? 1 : 0; }).join('') : '';
    if (sh === chShape) return;
    chShape = sh; chsw.hidden = !multi;
    if (!multi){ chsw.innerHTML = ''; return; }
    chsw.innerHTML = '<span class="t-chl">Channel</span>' + p.channels.map(function(c, i){
      var on = i === p.view.channel, err = c.ops.some(found);
      return '<button class="t-chb' + (on ? ' cur' : '') + (err ? ' err' : '') + '" role="tab" aria-selected="' + on + '" data-ch="' + i + '"' +
        (err ? ' aria-label="' + esc(c.name) + ' · errors found"' : '') + '>' + (i + 1) + '</button>';
    }).join('');
  }

  // --- the NC code panel: one row on its frame (Ruslan, 2026-11-19: the head and the foot in one row, the keys as
  // icons — Core's panel toolbar, ghost buttons): the program's file ▾ … Page up · Page down · Find · Edit | Follow
  // (on — Core's selected plate). The file is Core's program dropdown (fname) and holds the program's menu, as the
  // new design's: Open program… · Split… · Save program as… (Ruslan). Editing: the file … Undo · Redo · Find | Done.
  // The keys' names — for the reader and the long-press tip (block 8) ---
  var chead = codecol.querySelector('.chead');
  TOUCH.follow = load('follow', true);
  function ik(a, icon, label, cls, dis){
    return '<button class="t-b sq ghost t-ik' + (cls ? ' ' + cls : '') + '" data-a="' + a + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"' + (dis ? ' disabled' : '') + '>' + icon + '</button>';
  }
  var I_FIND = '<span class="ei ei16 s-st i-search"></span>';
  chead.insertAdjacentHTML('beforeend', '<span class="t-sp"></span>');
  var fnameEl = chead.querySelector('.fname');
  fnameEl.setAttribute('aria-haspopup', 'menu');
  var keys = document.createElement('div');
  keys.className = 't-hk';
  chead.appendChild(keys);
  TOUCH.editing = false;
  function renderKeys(){
    var vo = viewOnly;
    keys.innerHTML = TOUCH.editing
      ? ik('undo', '<span class="ei ei20 s-add i-undo"></span>', 'Undo') + ik('redo', '<span class="ei ei20 s-add i-redo"></span>', 'Redo') +
        ik('find', I_FIND, 'Find') + '<span class="hdiv"></span>' + btn('edit', G.check, 'Done', 'pri t-done')
      : ik('pgup', G.pgUp, 'Page up') + ik('pgdn', G.pgDn, 'Page down') + ik('find', I_FIND, 'Find') + ik('edit', G.edit, 'Edit', '', vo) +
        '<span class="hdiv"></span>' + ik('follow', G.follow, 'Follow', 't-follow' + (TOUCH.follow ? ' on' : ''));
    if (typeof fitHead === 'function') fitHead();
  }
  function edScroll(){ var ed = window.TUNER_CODE && TUNER_CODE.active(); return ed ? ed.el.querySelector('.ed-scroll') : null; }
  // the program's menu: Open program… (the Open screen, block 7) · Split… (Core's, with its question) | Save program
  // as… (block 7); editing or View only close what would replace the program or the operations
  function progMenu(anchor){
    var p = P.get(); if (!p) return;
    var lock = TOUCH.editing || viewOnly;
    function item(k, icon, label, desc, dis){
      return '<button class="t-menu-o t-mo2" data-k="' + k + '"' + (dis ? ' disabled' : '') + '>' + icon + '<span class="t-mo-tx"><b>' + esc(label) + '</b><small>' + esc(desc) + '</small></span></button>';
    }
    openMenu(anchor, item('open', '<img src="assets/header/open.svg" alt="">', 'Open program…', 'Replace this channel’s program with a file', lock) +
      item('split', G.split, 'Split…', 'Build the operations of all channels again from the text', lock) + '<div class="t-menu-d"></div>' +
      item('saveAs', '<img src="assets/header/export.svg" alt="">', 'Save program as…', p.file + ' · NC file for the machine', viewOnly), 't-pg', function(ev){
      var o = ev.target.closest('[data-k]'); if (!o || o.disabled) return;
      closeMenu();
      if (o.dataset.k === 'open') V.notify('Open program', 'The Open screen with the NC files; the file replaces the channel’s program — block 7.', 'info');
      else if (o.dataset.k === 'saveAs') V.notify('Save program as', 'The Save as screen — block 7.', 'info');
      else { setMode('ops'); var sb = codecol.querySelector('.chead [data-act="split"]'); if (sb) sb.click(); }
    });
  }
  chead.addEventListener('click', function(e){
    if (e.target.closest('.fname')){ progMenu(fnameEl); return; }
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.dataset.a, ed = window.TUNER_CODE && TUNER_CODE.active(), sc = edScroll();
    if (a === 'follow'){ TOUCH.follow = !TOUCH.follow; keep('follow', TOUCH.follow); b.classList.toggle('on', TOUCH.follow); return; }
    if ((a === 'pgup' || a === 'pgdn') && sc){ var lh = Math.round(32 * TOUCH.kf); sc.scrollBy({top: (a === 'pgup' ? -1 : 1) * (Math.floor(sc.clientHeight / lh) - 1) * lh, behavior: 'smooth'}); }
    else if (a === 'find' && ed) ed.find();
    else if (a === 'undo' && ed) ed.undo();
    else if (a === 'redo' && ed) ed.redo();
    else if (a === 'edit') setEdit(!TOUCH.editing);
  });
  // editing (spec sect. 3–4): the panel shows only the text; a tap puts the cursor in, the keyboard comes by itself
  function setEdit(on){
    TOUCH.editing = on && !viewOnly;
    ws.classList.toggle('t-edit', TOUCH.editing);
    document.querySelectorAll('.ed-ta').forEach(function(t){ t.readOnly = !TOUCH.editing; if (!TOUCH.editing) t.blur(); });
    if (TOUCH.editing){ var ed = window.TUNER_CODE && TUNER_CODE.active(); if (ed) ed.focus(); }
    renderKeys(); fitCols();
  }
  renderKeys();
  // edits leave the project unsaved
  document.addEventListener('input', function(e){
    if (!e.target.classList || !e.target.classList.contains('ed-ta')) return;
    var p = P.get(); if (p && !dirty[p.id]){ dirty[p.id] = true; renderTop(); }
  });
  // a tap on a block (not editing) — the cursor and the machine go there (spec sect. 3)
  var tapAt = 0;
  codecol.addEventListener('pointerup', function(e){ if (e.target.classList.contains('ed-ta') && !TOUCH.editing) tapAt = Date.now(); });
  document.addEventListener('tuner:cursor', function(e){
    if (Date.now() - tapAt > 400 || !sim()) return;
    tapAt = 0;
    var d = e.detail;
    if (d.op && d.op.status !== 'none') sim().toLine(d.channel.index, d.line);
  });

  // the operations get 6 rows, or 4 when the text would keep fewer than 8 (spec sect. 4)
  function fitCols(){
    if (TOUCH.editing) return;
    var rowH = Math.max(44, 48 * TOUCH.kf), lh = Math.round(32 * TOUCH.kf), H0 = ws.clientHeight;
    ws.style.setProperty('--t-dock-h', '50%');
    var chromeT = panelTree.offsetHeight - (mode === 'ops' ? treeEl.offsetHeight : axes.offsetHeight);
    var sc = edScroll(), chromeC = sc ? codecol.offsetHeight - sc.clientHeight : 160;
    var n = 6, h;
    for (; n >= 4; n--){
      h = Math.ceil(chromeT + n * rowH + (n - 1) * 2);
      if ((H0 - 24 - h - chromeC) / lh >= 8) break;
    }
    var dock = Math.ceil(chromeT + Math.max(n, 4) * rowH + (Math.max(n, 4) - 1) * 2);
    // the Axes tab needs its rows at 44 and the step row: the panel takes the larger of the two tabs (both tabs one
    // height — switching moves nothing), as long as the text keeps 8 rows; more than that — the axes scroll
    var p = P.get(), na = p ? axList(p).length : 3, gk = 6 * TOUCH.ki, foot = Math.max(44, 44 * TOUCH.ki);
    var axNeed = Math.ceil(chromeT + na * 44 + (na - 1) * gk + 8 * TOUCH.ki + foot);
    var axMax = Math.floor(H0 - 24 - chromeC - 8 * lh);
    if (axNeed > dock) dock = Math.max(dock, Math.min(axNeed, axMax));
    ws.style.setProperty('--t-dock-h', dock + 'px');
  }

  // ═══ 3. The 3D ═══
  // --- left: the finger's mode (Rotate · Pan · Zoom), Fit, the four views, Measure — every key captioned ---
  var finger = load('finger', 'rotate'), curView = 'Iso', VIEWS = ['Iso', 'Top', 'Front', 'Right'];
  var vk = document.createElement('div');
  vk.className = 't-vkeys';
  function vbtn(attrs, icon, cap, cls){ return '<button class="vbtn' + (cls ? ' ' + cls : '') + '" ' + attrs + '>' + icon + '<span>' + esc(cap) + '</span></button>'; }
  function renderVk(){
    vk.innerHTML =
      '<div class="vrail-grp vglass" role="radiogroup">' +
        vbtn('data-k="rotate" role="radio"', view(2, 16), 'Rotate', finger === 'rotate' ? 'on' : '') +
        vbtn('data-k="pan" role="radio"', G.pan, 'Pan', finger === 'pan' ? 'on' : '') +
        vbtn('data-k="zoom" role="radio"', G.zoom, 'Zoom', finger === 'zoom' ? 'on' : '') + '</div>' +
      '<div class="vrail-grp vglass">' + vbtn('data-k="fit"', view(2, 1), 'Fit') + '</div>' +
      '<div class="vrail-grp vglass t-views">' + VIEWS.map(function(v){ return vbtn('data-view="' + v + '"', cube(v.toLowerCase()), v); }).join('') + '</div>' +
      // short of height: the four views fold into one key (its icon — the view now), a tap lists them
      '<div class="vrail-grp vglass t-views-c">' + vbtn('data-k="views" aria-haspopup="menu"', cube(curView.toLowerCase()), 'View') + '</div>' +
      '<div class="vrail-grp vglass">' + vbtn('data-k="measure"', fn(1, 11), 'Measure', measureOn() ? 'on' : '') + '</div>';
  }
  function measureOn(){ var m = document.querySelector('.vrail [data-v="measure"]'); return !!(m && m.classList.contains('on')); }
  function hint(){
    var h = vp.querySelector('.vp-hint'); if (!h) return;
    var j = Object.keys(jog.off).filter(function(k){ return jog.off[k]; }).map(function(k){ return k + (jog.off[k] > 0 ? ' +' : ' ') + jog.off[k].toFixed(3); });
    h.textContent = '3D view · ' + curView + ' · one finger: ' + finger + (j.length ? ' · jogged ' + j.join(' ') : '');
  }
  renderVk(); vp.appendChild(vk); hint();
  vk.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    var k = b.dataset.k;
    if (k === 'rotate' || k === 'pan' || k === 'zoom'){ finger = k; keep('finger', k); }
    else if (k === 'fit'){ var z = document.querySelector('.vb-tools [data-t="zoom"]'); if (z) z.click(); b.classList.add('on'); setTimeout(function(){ b.classList.remove('on'); }, 200); return; }
    else if (k === 'measure'){ var m = document.querySelector('.vrail [data-v="measure"]'); if (m) m.click(); }
    else if (b.dataset.view){ curView = b.dataset.view; }
    else if (k === 'views'){
      openMenu(b, VIEWS.map(function(v){ return '<button class="t-menu-o' + (v === curView ? ' cur' : '') + '" data-view="' + v + '">' + cube(v.toLowerCase()) + v + '</button>'; }).join(''), 't-vm', function(ev){
        var o = ev.target.closest('[data-view]'); if (!o) return; closeMenu(); curView = o.dataset.view; renderVk(); hint(); fold();
      });
      return;
    }
    renderVk(); hint(); fold();
  });
  // --- right: Core's visibility column, captioned; Verify Compare joins it (the spec's column) ---
  var rail = vp.querySelector('.vrail'), visG = rail && rail.querySelector('[aria-label="Visibility"]');
  var CAP = {part: 'Part', workpiece: 'Stock', result: 'Result', holder: 'Holder', tool: 'Tool', fixtures: 'Fixture', machine: 'Machine', toolpath: 'Path'};
  if (visG){
    visG.querySelectorAll('[data-v]').forEach(function(b){ if (CAP[b.dataset.v]) b.insertAdjacentHTML('beforeend', '<span>' + CAP[b.dataset.v] + '</span>'); });
    var ver = rail.querySelector('[data-v="verify"]');
    if (ver){
      var g2 = document.createElement('div'); g2.className = 'vrail-grp vglass'; g2.setAttribute('aria-label', 'Verify Compare');
      ver.insertAdjacentHTML('beforeend', '<span>Verify</span>'); g2.appendChild(ver); rail.appendChild(g2);
    }
  }
  // short of height (large settings): Core's visibility column folds into one key — a tap lists the objects
  // with their switches (the desk's buttons stay the ones that act)
  if (rail){
    var visC = document.createElement('div');
    visC.className = 'vrail-grp vglass t-vis-c';
    visC.innerHTML = vbtn('data-k="vis" aria-haspopup="menu"', view(1, 2), 'Visibility');
    rail.insertBefore(visC, rail.firstChild);
    visC.addEventListener('click', function(e){
      var b = e.target.closest('[data-k="vis"]'); if (!b) return;
      function rows(){ return [].map.call(visG.querySelectorAll('[data-v]'), function(x){
        if (x.dataset.v === 'model') return '';
        return '<button class="t-menu-o" data-vis="' + x.dataset.v + '">' + x.querySelector('.ei').outerHTML + '<span style="flex:1 1 auto">' + esc(x.dataset.tip) + '</span>' +
          '<img class="tg" src="assets/insp/toggle-' + (x.classList.contains('on') ? 'on' : 'off') + '.svg" alt=""></button>'; }).join(''); }
      var m = openMenu(b, rows(), 't-vis', function(ev){
        var o = ev.target.closest('[data-vis]'); if (!o) return;
        var src = visG.querySelector('[data-v="' + o.dataset.vis + '"]'); if (src) src.click();
        m.innerHTML = rows();
      });
    });
  }
  function fold(){
    vk.classList.remove('c'); if (vk.scrollHeight > vk.clientHeight + 1) vk.classList.add('c');
    if (rail){ rail.classList.remove('c'); if (rail.scrollHeight > rail.clientHeight + 1) rail.classList.add('c'); }
    railW();
  }
  // the columns' widths decide where the free view starts and ends
  function railW(){
    ws.style.setProperty('--t-vk-w', vk.offsetWidth + 'px');
    if (rail) ws.style.setProperty('--t-rail-w', rail.offsetWidth + 'px');
  }

  // --- the timeline under the 3D (spec sect. 3): the blocks of the channel on screen; operations in their
  // colour, the simulated part bright; a tap or a drag takes the machine there (forward — simulated at once) ---
  var tl = document.createElement('div');
  tl.className = 'panel t-tl';
  tl.innerHTML = '<div class="inner"></div>';
  ws.appendChild(tl);
  var tlIn = tl.firstChild, tlMap = [], tlRaf = 0;
  function tlRender(){
    tlRaf = 0;
    var p = P.get(), s = sim(); if (!p || !s){ tlIn.innerHTML = ''; return; }
    var ch = p.view.channel, info = s.info(), list = [];
    info.blocks.forEach(function(b, i){ if (b.ch === ch) list.push({i: i, op: b.op}); });
    tlMap = list.map(function(x){ return x.i; });
    if (!list.length){ tlIn.innerHTML = '<div class="t-tl-none">' + (opsOf(p).length ? 'Calculate the program — the timeline shows its blocks' : 'No operations — Split the program') + '</div>'; return; }
    var segs = [], n = list.length;
    list.forEach(function(x){ var l = segs[segs.length - 1]; if (l && l.op === x.op) l.n++; else segs.push({op: x.op, n: 1}); });
    var seg = segs.map(function(g){ return '<i style="flex:' + g.n + ' 0 0;--c:var(' + g.op.color + ')"></i>'; }).join('');
    // where the machine is and how far the material got: the run's numbers, or (no run) what is simulated
    var at = -1, reach = -1;
    if (info.run){
      list.forEach(function(x, k){ if (x.i <= info.pos) at = k; if (x.i <= info.reach) reach = k; });
    } else list.forEach(function(x, k){ if (x.op.status === 'simulated' || x.op.status === 'partial' || x.op.status === 'error') reach = k; });
    if (at < 0 && !info.run) at = reach;
    var x = n > 1 ? Math.max(0, at) / (n - 1) : 0, r = reach < 0 ? 0 : n > 1 ? (reach / (n - 1)) * 100 : 100;
    tlIn.innerHTML = '<div class="t-tl-tr base">' + seg + '</div><div class="t-tl-tr done" style="--r:' + r + '%">' + seg + '</div>' +
      '<div class="t-tl-h" style="--x:' + x + '"></div>';
  }
  function tlLater(){ if (!tlRaf) tlRaf = requestAnimationFrame(tlRender); }
  var drag = null, seekT = 0;
  function tlAt(e){
    var r = tlIn.getBoundingClientRect(), pad = 22 * TOUCH.ki, w = r.width - 2 * pad;
    var f = Math.max(0, Math.min(1, (e.clientX - r.left - pad) / w));
    return tlMap.length ? tlMap[Math.round(f * (tlMap.length - 1))] : -1;
  }
  function tlSeek(e, now){
    var k = tlAt(e); if (k < 0 || !sim()) return;
    clearTimeout(seekT);
    if (now) sim().seek(k); else seekT = setTimeout(function(){ sim().seek(k); }, 30);
  }
  tlIn.addEventListener('pointerdown', function(e){
    if (!tlMap.length) return;
    drag = e.pointerId; tlIn.setPointerCapture(e.pointerId); tl.classList.add('drag'); tlSeek(e, true);
  });
  tlIn.addEventListener('pointermove', function(e){ if (drag === e.pointerId) tlSeek(e); });
  function tlUp(e){ if (drag !== e.pointerId) return; drag = null; tl.classList.remove('drag'); tlSeek(e, true); }
  tlIn.addEventListener('pointerup', tlUp); tlIn.addEventListener('pointercancel', function(){ drag = null; tl.classList.remove('drag'); });

  // ═══ 4. The simulation bar ═══
  // Core's panel joins the timeline's panel under the 3D (Ruslan, 2026-11-19: the simulation under the view, so the
  // NC code runs the whole height on the left; the spec has a bar across the screen): the timeline in the inset,
  // the keys on the frame under it — ghost keys on one plate, as Core's simulation panel, Play the one accent; in
  // Tuner's order with the spec's two changes (next error first; Stop — the red square — to the start with the
  // workpiece reset: Core's Reset). Keys as icons, 56 square (Ruslan: compact, everything in sight — the fast keys and
  // the errors' paging too; their names for the reader and the long-press tip, block 8); the speed a short slider
  // at the right end, no caption
  var bar = document.createElement('div');
  bar.className = 't-simk';
  tl.appendChild(bar);
  var S = vp.querySelector('.simpanel');
  if (S){
    bar.appendChild(S);
    var NAMES = {cur: 'This operation', tocur: 'Up to this operation', all: 'All operations', nextErr: 'Next error', prevErr: 'Previous error',
      checks: 'Checks', reset: 'Stop — to the start, the workpiece reset', back: 'Step back', play: 'Play / Pause', fwd: 'Step forward'};
    function key(a){ return S.querySelector('[data-a="' + a + '"]'); }
    function sep(cls){ var s = document.createElement('span'); s.className = 'vsep t-sep' + (cls ? ' ' + cls : ''); return s; }
    Object.keys(NAMES).forEach(function(a){ var b = key(a); if (b){ b.setAttribute('aria-label', NAMES[a]); b.title = NAMES[a]; } });
    var rs = key('reset'); if (rs){ var ic = rs.querySelector('svg'); if (ic) ic.outerHTML = G.stop; }
    var more = document.createElement('button');
    more.className = 'vbtn t-more'; more.innerHTML = G.dots; more.setAttribute('aria-label', 'Fast simulation'); more.title = 'Fast simulation';
    var speed = document.createElement('div');
    speed.className = 't-speed';
    var sp = S.querySelector('.sspeed');
    if (sp){ speed.appendChild(sp); speed.setAttribute('aria-label', 'Speed'); }
    var gapEl = document.createElement('span'); gapEl.className = 't-sp';
    [more, key('cur'), key('tocur'), key('all'), sep('s1'), key('nextErr'), key('prevErr'), sep(), key('checks'), sep(),
      key('reset'), key('back'), key('play'), key('fwd'), gapEl, speed].forEach(function(n){ if (n) S.appendChild(n); });
    // ⋯ — the fast simulation keys when the bar is short (spec sect. 4)
    more.addEventListener('click', function(){
      openMenu(more, ['cur', 'tocur', 'all'].map(function(a){
        var b = key(a); return '<button class="t-menu-o" data-k="' + a + '">' + (b.querySelector('img') ? b.querySelector('img').outerHTML : '') + esc(b.dataset.tip) + '</button>';
      }).join(''), '', function(e){ var o = e.target.closest('[data-k]'); if (!o) return; closeMenu(); key(o.dataset.k).click(); });
    });
    // Core's slider listens to the mouse: a finger's drag is handed to it as the mouse it expects
    if (sp) sp.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'mouse') return;
      e.preventDefault(); sp.setPointerCapture(e.pointerId);
      function m(type, ev){ (type === 'mousedown' ? sp : document).dispatchEvent(new MouseEvent(type, {bubbles: true, clientX: ev.clientX, clientY: ev.clientY, button: 0})); }
      m('mousedown', e);
      function mv(ev){ m('mousemove', ev); }
      function up(ev){ m('mouseup', ev); sp.removeEventListener('pointermove', mv); sp.removeEventListener('pointerup', up); sp.removeEventListener('pointercancel', up); }
      sp.addEventListener('pointermove', mv); sp.addEventListener('pointerup', up); sp.addEventListener('pointercancel', up);
    });
  }
  // short of width under the 3D: the fast keys step into ⋯ (spec sect. 4); still short (large settings on 1280) —
  // the keys take a second row and the panel grows; the 3D's keys and the notifications stand above it
  function compactSim(){
    if (!S) return;
    S.classList.remove('c1', 'c2');
    if (S.scrollWidth > S.clientWidth + 1) S.classList.add('c1');
    // two rows anyway: then every key shows, the fast ones too
    if (S.scrollWidth > S.clientWidth + 1){ S.classList.remove('c1'); S.classList.add('c2'); }
    R.style.setProperty('--t-simp', tl.offsetHeight + 'px');
  }

  // ═══ everything follows the project ═══
  function all(){ renderTop(); syncHead(); tlLater(); renderAxes(); }
  document.addEventListener('tuner:project', function(){ closeMenu(); setEdit(false); all(); requestAnimationFrame(fitCols); });
  document.addEventListener('tuner:view', function(){ all(); });
  document.addEventListener('tuner:ops', function(){ all(); });
  // the simulation's play / pause and the projects' list change the top bar too
  if (S) new MutationObserver(function(){ renderTop(); }).observe(S, {attributes: true, attributeFilter: ['class']});
  // the code panel's row: on a narrow column (small settings) the keys take a second row under the file's name,
  // when the name would keep less than 100 (Font) — measured without the name, so it is the same for every program
  function fitHead(){
    chead.classList.remove('c1');
    var gap = parseFloat(getComputedStyle(chead).columnGap) || 8;
    var room = chead.clientWidth - 4 - keys.offsetWidth - 2 * gap;     // the file's dropdown: its ▾ and padding + the name
    if (room < 100 * TOUCH.kf + 40 * TOUCH.ki) chead.classList.add('c1');
  }
  function onResize(){ compactTop(); compactSim(); fold(); fitHead(); fitCols(); }
  window.addEventListener('resize', onResize);
  new ResizeObserver(onResize).observe(ws);
  all(); fold(); compactSim(); fitHead(); requestAnimationFrame(fitCols);
})();
