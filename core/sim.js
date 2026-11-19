// ENCY Tuner — the Simulation panel on the 3D view, after the manual's "Simulation Panel":
//   Simulate current operation · up to current · all · Delete chips
//   | previous / next error · Checks and stops
//   | Machine control panel · Graph of the axes · Simulation parameters
//   | Reset · Step backward · Run / Pause · Stop · Step forward | speed | ⁘ more
// Fast simulation (the first three) runs the scope at once behind the process indicator.
// Run plays block by block: the code follows (the block is marked), the tree shows the running
// operation, block markers turn from • to ✓ / — as the blocks pass, an error stops it (Stop on
// error). What the simulation finds depends on the checks: a holder collision is only found with
// Check for holder collisions on; without machine collision control an operation is "partially"
// simulated. Operations that are not calculated are skipped (Run program first).
(function(){
  'use strict';

  var vp = document.querySelector('.viewport');
  if (!vp || !window.TUNER_VIEW) return;
  var V = window.TUNER_VIEW;
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function load(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : Object.assign({}, d, JSON.parse(v)); } catch(e){ return d; } }
  function save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

  var cfg = load('tuner.sim', {gouges:true, holder:true, machine:true, stopOp:false, stopOpt:false, stopErr:true,
    speed:50, smooth:true, rapid:60, comp:false, type:'Voxel 5D', accuracy:60, copies:true});
  var ERR_T = {holder:'Toolholder collision', gouge:'Gouging the part', machine:'Collision of machine nodes', plunge:'Plunge angle over the limit', rapid:'Stock removal at rapid'};

  function fn(r, c){ return '<span class="ei ei20 s-fn" style="background-position:-' + (c - 1) * 20 + 'px -' + (r - 1) * 20 + 'px"></span>'; }
  var G = {
    prev: '<svg viewBox="0 0 16 16"><path d="M5 9.5 8 6.5l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="11" y="1.6" width="3.2" height="3.2" rx=".6" transform="rotate(45 12.6 3.2)" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 16 16"><path d="M5 6.5 8 9.5l3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="11" y="11.2" width="3.2" height="3.2" rx=".6" transform="rotate(45 12.6 12.8)" fill="currentColor"/></svg>',
    reset: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 6.6A5.2 5.2 0 1 1 2.8 9.4"/><path d="M3 3.4v3.4h3.4"/></svg>',
    back: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="4" width="1.8" height="8" rx=".9"/><path d="M13 4v8l-6.4-4z"/></svg>',
    play: '<svg class="p-play" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8l8.5 5.2-8.5 5.2z"/></svg><svg class="p-pause" viewBox="0 0 16 16" fill="currentColor"><rect x="3.6" y="3" width="3.2" height="10" rx="1"/><rect x="9.2" y="3" width="3.2" height="10" rx="1"/></svg>',
    stop: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/></svg>',
    fwd: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 4v8l6.4-4z"/><rect x="11.2" y="4" width="1.8" height="8" rx=".9"/></svg>'
  };
  function b(id, tip, d, inner, cls){
    return '<button class="vbtn' + (cls ? ' ' + cls : '') + '" data-a="' + id + '" data-tip="' + esc(tip) + '"' + (d ? ' data-tip-d="' + esc(d) + '"' : '') + '>' + inner + '</button>';
  }

  var P = document.createElement('div');
  P.className = 'simpanel vglass';
  P.innerHTML =
    // Simulation view: the columns fold away and the part gets the window (layout.js)
    b('focus', 'Simulation view', 'Folds the panels so the part gets the window; pressed again, brings them back. Ctrl+\\',
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>') +
    '<span class="vsep"></span>' +
    b('cur','Simulate current operation', 'All blocks of the selected operation, at once.', '<img src="assets/sim/scope-current.svg" alt="">', 'scope') +
    b('tocur', 'Simulate up to current operation', 'From the start of the process to the selected operation, at once.', '<img src="assets/sim/scope-tocur.svg" alt="">', 'scope') +
    b('all', 'Simulate all operations', 'The whole process, at once.', '<img src="assets/sim/scope-all.svg" alt="">', 'scope') +
    b('chips', 'Delete chips', 'Removes the pieces of the workpiece that hold no part geometry.', fn(2, 10)) +
    '<span class="vsep"></span>' +
    b('prevErr', 'Previous error', 'Jump to the block with the previous error.', G.prev, 'err') +
    b('nextErr', 'Next error', 'Jump to the block with the next error.', G.next, 'err') +
    b('checks', 'Checks and stops', 'Which errors are checked and when the simulation stops.', '<img src="assets/sim/st-stop.svg" alt=""><span class="cnt"></span>') +
    '<span class="vsep"></span>' +
    b('machine', 'Machine control panel', 'See and change the machine state.', fn(1, 4)) +
    b('axes', 'Graph of the axes', 'Axis values, speed and material removal rate over the operation.', fn(1, 6)) +
    b('params', 'Simulation parameters', 'Accuracy of toolpath and model rendering; one model for all part copies; the model type.', '<span class="ei ei20 s-insp i-p-par"></span>') +
    '<span class="vsep"></span>' +
    b('reset', 'Reset', 'The workpiece back to its initial state; simulation results dropped.', G.reset) +
    b('back', 'Step backward', 'To the previous block.', G.back) +
    b('play', 'Run', 'Block by block to the end; the code follows.', G.play, 'play') +
    b('stop', 'Stop', 'Stops the simulation.', G.stop, 'stop') +
    b('fwd', 'Step forward', 'To the next motion block.', G.fwd) +
    '<span class="vsep sp-speedsep"></span>' +
    '<span class="sspeed" data-tip="Speed" data-tip-d="How fast the tool moves on screen."><span class="tr"></span><span class="fi"></span><span class="kn"></span><span class="tp"></span></span>' +
    b('more', 'More', 'Smooth simulation, rapid motion speed, compensation curve, model type.', fn(2, 8));
  vp.appendChild(P);

  // ——— the operation in focus: the tree's selection or the caret's operation ———
  var curOp = null, caret = {ch: 0, line: 0};
  document.addEventListener('tuner:select', function(e){ if (e.detail.op) curOp = e.detail.op; });
  document.addEventListener('tuner:cursor', function(e){ caret = {ch: e.detail.channel.index, line: e.detail.line}; if (e.detail.op) curOp = e.detail.op; });
  document.addEventListener('tuner:project', function(){ stop(true); curOp = null; });

  function proj(){ return window.TUNER_PROJECT && TUNER_PROJECT.get(); }
  function allOps(p){ var a = []; p.channels.forEach(function(c){ c.ops.forEach(function(o){ a.push({ch: c.index, op: o}); }); }); return a; }
  function emit(p){ p.channels.forEach(function(c){ document.dispatchEvent(new CustomEvent('tuner:ops', {detail: c})); }); }
  function inProject(p, o){ return o && allOps(p).some(function(x){ return x.op === o; }); }

  // what the simulation finds on an operation with the checks as they are now
  function found(o){
    var e = {};
    for (var l in o.truth){
      var t = o.truth[l];
      if ((t === 'holder' && cfg.holder) || (t === 'machine' && cfg.machine) ||
          (t === 'gouge' && cfg.gouges && !(o.params && o.params.params && o.params.params.gouges === false)) ||
          t === 'plunge' || t === 'rapid') e[l] = t;
    }
    return e;
  }
  function finished(o){
    o.running = false; o.simTo = null;
    o.status = Object.keys(o.errors).length ? 'error' : cfg.machine ? 'simulated' : 'partial';
  }
  function report(ran, skipped){
    var errs = [];
    ran.forEach(function(o){ for (var l in o.errors) errs.push(o.name + ': ' + (ERR_T[o.errors[l]] || 'error')); });
    var note = skipped ? ' ' + skipped + ' not calculated — Run program first.' : '';
    if (errs.length) V.notify('Simulation: ' + errs.length + (errs.length > 1 ? ' errors' : ' error'), errs.slice(0, 3).join(' · ') + note, 'error');
    else V.notify('Simulation finished', ran.length + (ran.length > 1 ? ' operations' : ' operation') + ' without errors.' + note, skipped ? 'warn' : 'done');
  }

  // ——— fast simulation of a scope ———
  function fast(scope){
    var p = proj(); if (!p) return;
    stop(true);
    var ops = allOps(p).map(function(x){ return x.op; });
    if (!inProject(p, curOp)) curOp = ops[0] || null;
    var i = ops.indexOf(curOp);
    var list = scope === 'cur' ? (curOp ? [curOp] : []) : scope === 'tocur' ? ops.slice(0, i + 1) : ops;
    var run = list.filter(function(o){ return o.status !== 'none'; }), skipped = list.length - run.length;
    if (!run.length){ V.notify('Nothing to simulate', list.length ? 'The operations are not calculated — Run program first.' : 'There are no operations — Split the program.', 'warn'); return; }
    run.forEach(function(o){ o.running = true; });
    emit(p);
    var label = scope === 'cur' ? '<b>Machining simulation</b> · ' + esc(curOp.name) : scope === 'tocur' ? '<b>Machining simulation</b> · up to ' + esc(curOp.name) : '<b>Machining simulation</b> · all operations';
    var j = V.progress(label, 500 + run.length * 160);
    j.done = function(){ run.forEach(function(o){ o.errors = found(o); finished(o); }); emit(p); report(run, skipped); };
    j.onCancel = function(){ run.forEach(function(o){ o.running = false; }); emit(p); V.notify('Simulation cancelled', '', 'warn'); };
  }

  // ——— block by block ———
  var blocks = [], pos = -1, timer = 0, job = null, playing = false;
  function build(p){
    var out = [];
    p.channels.forEach(function(c){
      var lines = c.text.split('\n'), cls = window.TunerNC.classify(lines);
      c.ops.forEach(function(o, k){
        if (o.status === 'none') return;
        var end = c.ops[k + 1] ? c.ops[k + 1].start : lines.length;
        for (var l = o.start; l < end; l++) if (cls[l].move) out.push({ch: c.index, op: o, line: l});
      });
    });
    return out;
  }
  function interval(){ return Math.round(520 * Math.pow(1 - cfg.speed / 100, 1.6) + 22); }
  function show(){
    var p = proj(), bl = blocks[pos];
    window.TUNER_CODE.simLine(bl ? bl.ch : 0, bl ? bl.line : null);
    if (job) job.set(blocks.length ? (pos + 1) / blocks.length * 100 : 0);
    emit(p);
  }
  // one block on: the operation it belongs to is being simulated anew; leaving one finishes it
  function advance(){
    var p = proj(), prev = blocks[pos], bl = blocks[pos + 1];
    if (!bl){ end(true); return false; }
    pos++;
    if (!prev || prev.op !== bl.op){
      if (prev) finished(prev.op);
      bl.op.status = 'calculated'; bl.op.errors = {}; bl.op.running = true;
      if (prev && cfg.stopOp && playing){ show(); pause(); V.notify('Stopped after an operation', prev.op.name + ' finished.', 'info'); return false; }
    }
    bl.op.simTo = bl.line;
    var f = found(bl.op);
    if (f[bl.line]){
      bl.op.errors[bl.line] = f[bl.line];
      if (cfg.stopErr && playing){ show(); pause(); V.notify('Stopped on an error', bl.op.name + ': ' + (ERR_T[f[bl.line]] || 'error') + '.', 'error'); return false; }
    }
    show();
    return true;
  }
  function loop(){ if (!playing) return; if (advance()) timer = setTimeout(loop, interval()); }
  function play(){
    var p = proj(); if (!p) return;
    if (playing){ pause(); return; }
    if (pos < 0 || pos >= blocks.length - 1){
      blocks = build(p); pos = -1;
      if (!blocks.length){ V.notify('Nothing to simulate', allOps(p).length ? 'The operations are not calculated — Run program first.' : 'There are no operations — Split the program.', 'warn'); return; }
    }
    playing = true; P.classList.add('playing');
    if (!job){ job = V.progress('<b>Machining simulation</b>', 0); job.onCancel = function(){ job = null; stop(); }; }
    loop();
  }
  function pause(){ playing = false; clearTimeout(timer); P.classList.remove('playing'); }
  function end(done){
    var p = proj(), last = blocks[pos];
    pause();
    if (last && done) finished(last.op);
    if (job){ var j = job; job = null; j.finish(); }
    if (done){
      var ran = []; blocks.forEach(function(x){ if (ran.indexOf(x.op) < 0) ran.push(x.op); });
      report(ran, allOps(p).filter(function(x){ return x.op.status === 'none'; }).length);
    }
    blocks = []; pos = -1;
    window.TUNER_CODE.simLine(0, null);
    if (p) emit(p);
  }
  // Stop: the run ends where it is; what was not reached keeps its status
  function stop(quiet){
    var p = proj();
    pause();
    blocks.forEach(function(x){ x.op.running = false; x.op.simTo = null; });
    if (job){ var j = job; job = null; j.cancel(true); }
    blocks = []; pos = -1;
    if (window.TUNER_CODE) window.TUNER_CODE.simLine(0, null);
    if (p && !quiet) emit(p);
  }
  function step(d){
    var p = proj(); if (!p) return;
    pause();
    if (d > 0){
      if (pos < 0){ blocks = build(p); pos = -1; if (!blocks.length){ V.notify('Nothing to simulate', 'Run program first.', 'warn'); return; }
        if (!job){ job = V.progress('<b>Machining simulation</b> · step by step', 0); job.onCancel = function(){ job = null; stop(); }; } }
      advance();
    } else if (pos > 0){ pos--; show(); }
  }
  function reset(){
    var p = proj(); if (!p) return;
    stop(true);
    allOps(p).forEach(function(x){ var o = x.op; if (o.status === 'simulated' || o.status === 'partial' || o.status === 'error'){ o.status = 'calculated'; } o.errors = {}; });
    emit(p);
    V.notify('Workpiece reset', 'Simulation results dropped.', 'info');
  }

  // ——— errors: previous / next from the caret, across channels ———
  function errNav(d){
    var p = proj(); if (!p) return;
    var list = [];
    allOps(p).forEach(function(x){ for (var l in x.op.errors) if (x.op.status === 'error' || x.op.simTo != null) list.push({ch: x.ch, line: +l, op: x.op}); });
    if (!list.length){ V.notify('No errors', 'Nothing was found by the simulation so far.', 'info'); return; }
    list.sort(function(a, b){ return a.ch - b.ch || a.line - b.line; });
    var k = d > 0 ? list.findIndex(function(e){ return e.ch > caret.ch || (e.ch === caret.ch && e.line > caret.line); })
                  : (function(){ for (var i = list.length - 1; i >= 0; i--) if (list[i].ch < caret.ch || (list[i].ch === caret.ch && list[i].line < caret.line)) return i; return -1; })();
    var e = list[k < 0 ? (d > 0 ? 0 : list.length - 1) : k];
    window.TUNER_CODE.goto(e.ch, e.line);
    caret = {ch: e.ch, line: e.line};
    // the tree and the inspector follow, as they do for the caret
    document.dispatchEvent(new CustomEvent('tuner:cursor', {detail: {channel: p.channels[e.ch], line: e.line, op: e.op}}));
  }

  // ——— menus: checks and stops · parameters · more ———
  function tg(v){ return '<img class="tg" src="assets/insp/' + (v ? 'toggle-on' : 'toggle-off') + '.svg" alt="">'; }
  function opt(k, t, ic){ return '<button class="vm-opt" data-k="' + k + '">' + (ic ? '<img src="assets/sim/' + ic + '.svg" alt="">' : '<span class="vm-ic"></span>') + t + tg(cfg[k]) + '</button>'; }
  // the menus show at once with their icons: load them up front
  ['st-gouge', 'st-holder', 'st-machine', 'st-stop', 'st-optstop'].forEach(function(n){ new Image().src = 'assets/sim/' + n + '.svg'; });
  ['toggle-on', 'toggle-off'].forEach(function(n){ new Image().src = 'assets/insp/' + n + '.svg'; });
  function seg(k, list){ return '<div class="vm-seg">' + list.map(function(x){ return '<button data-seg="' + k + '" data-v="' + x + '" class="' + (cfg[k] === x ? 'cur' : '') + '">' + x + '</button>'; }).join('') + '</div>'; }
  function range(k, l, r){ return '<div class="vm-range">' + l + '<input type="range" min="0" max="100" value="' + cfg[k] + '" data-r="' + k + '">' + r + '</div>'; }
  function pick(x){
    if (x.dataset.k){ cfg[x.dataset.k] = !cfg[x.dataset.k]; save('tuner.sim', cfg); syncChecks(); return true; }
    if (x.dataset.seg){ cfg[x.dataset.seg] = x.dataset.v; save('tuner.sim', cfg); return true; }
    if (x.dataset.r){ cfg[x.dataset.r] = +x.value; save('tuner.sim', cfg); if (x.dataset.r === 'speed') paintSpeed(); return false; }
  }
  var MENUS = {
    checks: function(){ return '<div class="vm-head">Checks</div>' + opt('gouges', 'Check for gouges', 'st-gouge') + opt('holder', 'Check for holder collisions', 'st-holder') +
      opt('machine', 'Check for machine collisions', 'st-machine') + '<div class="vm-div"></div><div class="vm-head">Stops</div>' +
      opt('stopOp', 'Stop after each operation', 'st-stop') + opt('stopOpt', 'Optional stop (M00 / M01)', 'st-optstop') + opt('stopErr', 'Stop on error'); },
    params: function(){ return '<div class="vm-head">Simulation accuracy</div>' + range('accuracy', 'Low', 'High') +
      opt('copies', 'One model for all part copies') + '<div class="vm-div"></div><div class="vm-head">Model type</div>' + seg('type', ['Voxel 3D', 'Voxel 5D', 'Solid']); },
    more: function(){ return opt('smooth', 'Smooth simulation') + '<div class="vm-head">Rapid motion speed</div>' + range('rapid', 'Slow', 'Fast') +
      opt('comp', 'Compensation curve') + (P.classList.contains('compact') ? '<div class="vm-div"></div><div class="vm-head">Speed</div>' + range('speed', 'Slow', 'Fast') : ''); }
  };
  function syncChecks(){ var n = ['gouges', 'holder', 'machine'].filter(function(k){ return cfg[k]; }).length; P.querySelector('[data-a="checks"] .cnt').textContent = n; }

  P.addEventListener('click', function(e){
    var x = e.target.closest('[data-a]'); if (!x) return;
    var a = x.dataset.a;
    if (a === 'focus'){ if (window.TUNER_LAYOUT) TUNER_LAYOUT.focus(); }
    else if (a === 'cur' || a === 'tocur' || a === 'all') fast(a);
    else if (a === 'chips') V.notify('Chips deleted', 'Pieces without part geometry removed from the workpiece.', 'info');
    else if (a === 'prevErr') errNav(-1);
    else if (a === 'nextErr') errNav(1);
    else if (MENUS[a]) V.menu(x, MENUS[a](), pick);
    else if (a === 'machine' || a === 'axes') V.notify('Not built in the prototype', (a === 'machine' ? 'Machine control panel' : 'Graph of the axes') + ' comes with the 3D view.', 'info');
    else if (a === 'reset') reset();
    else if (a === 'back') step(-1);
    else if (a === 'play') play();
    else if (a === 'stop') stop();
    else if (a === 'fwd') step(1);
  });

  // ——— speed slider ———
  var sp = P.querySelector('.sspeed');
  function paintSpeed(){ sp.querySelector('.fi').style.width = cfg.speed + '%'; sp.querySelector('.kn').style.left = cfg.speed + '%'; var t = sp.querySelector('.tp'); t.style.left = cfg.speed + '%'; t.textContent = cfg.speed + '%'; }
  sp.addEventListener('mousedown', function(e){
    e.preventDefault(); sp.classList.add('dragging');
    function at(ev){ var r = sp.getBoundingClientRect(); cfg.speed = Math.round(Math.max(1, Math.min(100, (ev.clientX - r.left) / r.width * 100))); paintSpeed(); }
    function up(){ sp.classList.remove('dragging'); save('tuner.sim', cfg); document.removeEventListener('mousemove', at); document.removeEventListener('mouseup', up); }
    at(e); document.addEventListener('mousemove', at); document.addEventListener('mouseup', up);
  });
  paintSpeed(); syncChecks();

  // ——— a narrow free view: the speed steps into ⁘ ———
  function fit(){
    var ws = document.getElementById('ws'), cs = getComputedStyle(ws);
    var free = ws.clientWidth - parseFloat(cs.getPropertyValue('--dock-w')) - parseFloat(cs.getPropertyValue('--code-w')) - 24 - parseFloat(cs.getPropertyValue('--free-r'));
    // its width on one row (the cap lifted for a moment); narrower than that, the speed goes into ⁘,
    // and if it still does not fit, the panel wraps (viewport.css)
    P.classList.remove('compact'); P.style.maxWidth = 'none';
    var w = P.offsetWidth; P.style.maxWidth = '';
    P.classList.toggle('compact', w > free - 16);
  }
  new ResizeObserver(fit).observe(document.getElementById('ws'));
  window.addEventListener('resize', fit);
  // Simulation view reads "on" while both columns are folded
  function syncFocus(s){ P.querySelector('[data-a="focus"]').classList.toggle('on', !!(s && s.dock && s.code)); }
  document.addEventListener('tuner:layout', function(e){ syncFocus(e.detail); });
  syncFocus(window.TUNER_LAYOUT && TUNER_LAYOUT.state());
  document.addEventListener('keydown', function(e){
    // Space plays / pauses when no field has the keyboard
    if (e.key === ' ' && !e.target.closest('input, textarea, button, [contenteditable]')){ e.preventDefault(); play(); }
  });
  fit();
})();
