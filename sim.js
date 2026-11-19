// ENCY Tuner Touch — block 5: the simulation console, the timeline under the 3D and the simulation
// itself. Tuner simulates; here it is a timer that moves the machine block by block through the shown
// channel's text: the blocks it passes become simulated, an error the checks look for is found on its
// block, Stop on error halts there (core.js: goLine, the truth of each channel, the checks).
//   console, three zones by meaning, Play in the middle (Ruslan, 2026-11-18):
//            This op · Up to op · To end (fast — at once) … | Reset · Calculate (no state words)
//            ‖ Back · Play / Pause · Step (hold — continuously) | speed (no icons, no numbers) ‖
//            Checks | ‹ ❗ errors found › … (the count lives here, not in the top bar)
//   timeline: the shown channel by blocks; operations as coloured runs with their names, the simulated
//            part brighter; no error marks (spec sect. 7). A tap moves the machine there, a drag takes
//            it along: back — only the machine and the cursor (the stock stays), forward past the
//            simulated — simulated on the way, stopping on a new error.
(function(){
  'use strict';
  var bar = document.getElementById('ttBar'), tlHost = document.getElementById('ttTl');
  if (!bar || !tlHost) return;
  var t = TT.t, ui = TT.ui;
  var speed = TT.load('touch.speed', 50), timer = 0, runId = null;

  function act(){ var p = TT.active(); return p ? {p:p, c:p.channels[p.ch]} : null; }
  function last(c){ return c.lines.length - 1; }
  function errs(c){ return Object.keys(TT.found(c)).map(Number).sort(function(a, b){ return a - b; }); }
  // blocks a second: from a slow walk to a run; block by block (Smooth off) — half of it
  function rate(){ var r = 1.5 + Math.pow(speed / 100, 1.6) * 30; return TT.checks().smooth ? r : r / 2; }

  // ——— running ———
  function stopTimer(){ clearInterval(timer); timer = 0; runId = null; }
  function restart(){ clearInterval(timer); timer = setInterval(tick, 1000 / rate()); }
  function play(){
    var a = act(); if (!a) return;
    if (!TT.calculated(a.p)){ ui.toast(t('t_notCalc'), 'var(--ec-amber)'); return; }
    if (a.c.cur >= last(a.c)){ ui.toast(t('t_end', {name:a.p.name}), 'var(--ec-fg-48)'); return; }
    a.p.state = 'simulating'; runId = a.p.id; restart(); TT.emit('projects');
  }
  function pause(){ var a = act(); stopTimer(); if (a && a.p.state === 'simulating'){ a.p.state = 'paused'; TT.emit('projects'); } }
  function tick(){
    var p = TT.get(runId);
    if (!p || p !== TT.active() || p.state !== 'simulating'){ stopTimer(); return; }
    var c = p.channels[p.ch], before = errs(c).length;
    var r = TT.goLine(p, p.ch, c.cur + 1, true);
    if (TT.found(c)[r] && errs(c).length > before && TT.checks().stopErr){
      stopTimer(); p.state = 'paused'; TT.emit('projects');
      ui.toast(t('t_stopErr', {line:c.lines[r].trim()}), 'var(--th-red)'); return;
    }
    if (r >= last(c)){ stopTimer(); p.state = TT.atEnd(p) ? 'simulated' : 'paused'; TT.emit('projects'); ui.toast(t('t_end', {name:p.name})); }
  }
  // the machine to a block at once (fast simulation, errors, the timeline); a new error on the way —
  // a notification; the text shows the block (prog.js: 'reveal')
  function jump(line, quiet){
    var a = act(); if (!a) return -1;
    if (a.p.state === 'simulating') pause();
    if (!TT.calculated(a.p)){ ui.toast(t('t_notCalc'), 'var(--ec-amber)'); return -1; }
    var before = errs(a.c).length, r = TT.goLine(a.p, a.p.ch, line);
    if (r < line && errs(a.c).length > before) ui.toast(t('t_stopErr', {line:a.c.lines[r].trim()}), 'var(--th-red)');
    if (!quiet) TT.emit('reveal', r);
    return r;
  }
  function step(dir){
    var a = act(); if (!a) return;
    if (a.p.state === 'simulating') pause();
    if (dir < 0){ if (a.c.cur > 0){ a.c.cur--; TT.emit('projects'); TT.emit('reveal', a.c.cur); } return; }
    if (a.c.cur < last(a.c)) jump(a.c.cur + 1);
  }
  function selOp(c){ var k = c.sel != null ? c.sel : c.ops.indexOf(TT.opAt(c, c.cur)); return c.ops[Math.max(0, k)]; }
  function fast(kind){
    var a = act(); if (!a) return;
    var o = selOp(a.c);
    if (kind === 'this') jump(o.end); else if (kind === 'upto') jump(o.start); else jump(last(a.c));
  }
  function nextErr(){
    var a = act(); if (!a) return;
    var e = errs(a.c).filter(function(i){ return i > a.c.cur; });
    if (e.length){ jump(e[0]); return; }
    // none found ahead: Tuner simulates on to the next one
    if (TT.calculated(a.p) && a.c.simTo < last(a.c)){
      var before = errs(a.c).length, r = jump(last(a.c));
      if (errs(a.c).length === before && r >= last(a.c)) ui.toast(t('t_noNext'), 'var(--ec-fg-48)');
    } else ui.toast(t('t_noNext'), 'var(--ec-fg-48)');
  }
  function prevErr(){
    var a = act(); if (!a) return;
    var e = errs(a.c).filter(function(i){ return i < a.c.cur; });
    if (e.length) jump(e[e.length - 1]); else ui.toast(t('t_noPrev'), 'var(--ec-fg-48)');
  }
  function reset(){ var a = act(); if (!a) return; stopTimer(); TT.resetSim(a.p); ui.toast(t('t_reset'), 'var(--ec-fg-48)'); TT.emit('reveal', 0); }

  // ——— the console ———
  // alt — the key's other caption (Calculate / Cancel, Play / Pause): the key keeps the width of the longer
  // one, so the console never jumps when the state changes (sim.css [data-alt])
  function B(act, label, icon, cls, dis, aria, alt, attrs){
    return ui.btn({act:act, label:label, icon:icon, cls:cls || '', dis:dis, aria:aria || label,
      attrs:(alt ? ' data-alt="' + ui.esc(alt) + '"' : '') + (attrs || '')});
  }
  var shape = '';
  // no state words on the console (Ruslan, 2026-11-18) — the keys tell it: needs calculation — Calculate
  // is the green one; calculating — Cancel, filling amber like the calculating tab (its number is on the
  // tab); calculated — Calculate goes quiet and Play turns green
  function calcBtn(p){
    if (p.state === 'calculating')
      return B('stopcalc', t('cancel'), ui.ic('stop'), 'sm-busy', false, '', t('calc'), ' data-pct-bar style="--p:' + (p.pct || 0) + '%"');
    return B('calc', t('calc'), ui.spr('macros', 1, 1), p.state === 'needs' ? 'pri' : '', false, '', t('cancel'));
  }
  // the errors found in the shown channel (the count moved here from the top bar — Ruslan, 2026-11-18):
  // none — a grey key; found — a red key in one red block with its arrows, a tap — the list of them (one
  // error — straight to its block in the text);
  // the biggest settings — the count without its caption
  function errKey(list, pos){
    var n = list.length, esc = ui.esc;
    // none: the same key, grey and still — "0" over "Errors", the same width, so the console never moves
    if (!n) return '<div class="sm-errb none" aria-label="' + esc(t('s_noErr')) + '"><span class="sm-errt"><span class="l">0</span></span><span class="c">' + esc(t('s_errs')) + '</span></div>';
    // a console key like the others, no icon (the red says it): the count over its caption, centred —
    // always which one of how many (Ruslan): "2 / 3" — the last error at or before the machine; "– / 3"
    // before the first; one error — just "1". The count keeps the width of the longest ("n / n", .a unseen)
    var cnt = n === 1 ? '1' : t('s_errAt', {i:pos || '–', n:n});
    return '<button class="tk-b sm-errb" data-act="errs" aria-label="' + esc(t('errors', n) + ' · ' + cnt) + '">' +
      '<span class="sm-errt"><span class="l">' + esc(cnt) + '</span><span class="a" aria-hidden="true">' + esc(t('s_errAt', {i:n, n:n})) + '</span></span>' +
      '<span class="c">' + esc(t('s_errs')) + '</span></button>';
  }
  // a running calculation: the fill grows in place (no rebuild, so a press is never lost)
  function pct(a){
    if (!a || a.p.state !== 'calculating') return;
    var pb = bar.querySelector('[data-pct-bar]');
    if (pb) pb.style.setProperty('--p', a.p.pct + '%');
  }
  function render(){
    var a = act(), calc = !!(a && TT.calculated(a.p)), run = !!(a && a.p.state === 'simulating');
    var list = a ? errs(a.c) : [], pos = a ? list.filter(function(i){ return i <= a.c.cur; }).length : 0;
    var atStart = !a || a.c.cur <= 0, atEnd = !a || a.c.cur >= last(a.c), fresh = !a || a.p.channels.every(function(c){ return c.simTo < 0 && c.cur === 0; });
    var state = a ? a.p.state : '-';
    var sh = [TT.lang(), TT.variant(), a ? a.p.id + ':' + a.p.ch : '-', state, list.join(','), pos, a && list.indexOf(a.c.cur), atStart, atEnd, fresh].join('|');
    if (sh === shape){ pct(a); return; }
    shape = sh;
    // ‹ — an error found behind the machine; › — one found ahead. One error, or the last one — › is off: there
    // is nowhere to go (Ruslan; Play with Stop on error finds the ones not simulated yet)
    var prevOk = calc && list.some(function(i){ return a && i < a.c.cur; });
    var nextOk = calc && list.some(function(i){ return i > a.c.cur; });
    var DIV = '<span class="tk-vdiv"></span>';
    // the variant from Tuner's components: Tuner's simulation panel in its order (spec sect. 3) — This op ·
    // Up to op · To end | Next error · Previous error | Checks | Stop (the red square — to the start, the
    // workpiece reset) · Back · Play / Pause · Step | speed to the right edge. Every key with its caption;
    // Calculate and the errors' count are on the top bar (top.js)
    if (TT.isTuner()){
      bar.innerHTML = '<div class="sm sm-t">' +
        B('more', '', ui.spr('macros', 1, 5), 'sm-more', !calc, t('s_this') + ' · ' + t('s_upto') + ' · ' + t('s_end')) +
        '<div class="sm-g">' + B('this', t('s_this'), '<img src="assets/sim/scope-current.svg" alt="">', '', !calc) +
          B('upto', t('s_upto'), '<img src="assets/sim/scope-tocur.svg" alt="">', '', !calc) +
          B('end', t('s_end'), '<img src="assets/sim/scope-all.svg" alt="">', '', !calc || atEnd) + '</div>' + DIV +
        B('next', t('s_nextE'), ui.ic('chevR'), '', !nextOk) + B('prev', t('s_prevE'), ui.ic('chevL'), '', !prevOk) + DIV +
        B('checks', t('s_checks'), '<img src="assets/sim/st-stop.svg" alt="">') + DIV +
        B('reset', t('s_stop'), ui.ic('resetSq'), 'sm-reset', !calc || fresh) +
        B('back', t('s_back'), ui.ic('stepB'), '', atStart) +
        B('play', t(run ? 's_pause' : 's_play'), ui.spr('macros', 1, run ? 3 : 1), calc ? 'pri' : '', !calc || (atEnd && !run), '', t(run ? 's_play' : 's_pause')) +
        B('step', t('s_step'), ui.ic('stepF'), '', !calc || atEnd) + DIV +
        '<div class="sm-speed" style="--v:' + speed + '%" role="slider" aria-label="' + t('s_speed') +
          '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + speed + '"><i></i><span>' + t('s_speed') + '</span></div>' +
        '</div>';
      compactTuner();
      return;
    }
    bar.innerHTML = '<div class="sm">' +
      // ——— left, packed against the left edge: fast simulation | Reset · Calculate, right before Play:
      // Calculate → Play, Calculate between Reset and Back (Reset away from them — rule 6.10). The green
      // moves along: needs calculation — Calculate; calculated — Play
      '<div class="sm-z sm-l">' +
        // only the biggest Font / Icons settings: fast simulation goes into ⋯ (spec sect. 4, "if they do not fit")
        B('more', '', ui.spr('macros', 1, 5), 'sm-more', !calc, t('s_this') + ' · ' + t('s_upto') + ' · ' + t('s_end')) +
        '<div class="sm-g">' + B('this', t('s_this'), '<img src="assets/sim/scope-current.svg" alt="">', '', !calc) +
          B('upto', t('s_upto'), '<img src="assets/sim/scope-tocur.svg" alt="">', '', !calc) +
          B('end', t('s_end'), '<img src="assets/sim/scope-all.svg" alt="">', '', !calc || atEnd) + '</div>' + DIV +
        B('reset', t('s_reset'), ui.ic('resetSq'), 'sm-reset', !calc || fresh) + (a ? calcBtn(a.p) : '') +
      '</div>' +
      // ——— centre: one island in the middle of the console — Back · Play · Step | speed; air around it, no
      // dividers at its edges (a divider in the air reads as stray spacing)
      '<div class="sm-z sm-c">' +
        B('back', t('s_back'), ui.ic('stepB'), '', atStart) +
        B('play', t(run ? 's_pause' : 's_play'), ui.spr('macros', 1, run ? 3 : 1), calc ? 'pri' : '', !calc || (atEnd && !run), '', t(run ? 's_play' : 's_pause')) +
        B('step', t('s_step'), ui.ic('stepF'), '', !calc || atEnd) + DIV +
        // speed: a full-height bar filling from the left, its name inside — the whole bar is the target
        '<div class="sm-speed" style="--v:' + speed + '%" role="slider" aria-label="' + t('s_speed') +
          '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + speed + '"><i></i><span>' + t('s_speed') + '</span></div>' +
      '</div>' +
      // ——— right, packed against the right edge: the errors, one group — Checks (which ones are looked for;
      // always there) · ‹ the ones found › (found — one red block, the arrows too)
      '<div class="sm-z sm-r">' +
        B('checks', t('s_checks'), '<img src="assets/sim/st-stop.svg" alt="">') +
        '<div class="sm-err' + (list.length ? ' on' : '') + '">' + B('prev', '', ui.ic('chevL'), '', !prevOk, t('s_prev')) + errKey(list, pos) +
          B('next', '', ui.ic('chevR'), '', !nextOk, t('s_next')) + '</div>' +
      '</div>' +
      '</div>';
    compact();
  }
  // the layout settles in steps, never with smaller keys:
  //   eq — a side is wider than its half (1280): the island leaves the exact middle, the air on its two
  //        sides stays equal instead (sim.css .eq);
  //   k1 — still too wide: a shorter speed bar, less air;
  //   c1 — fast simulation into ⋯ (spec sect. 4, "if they do not fit" — the biggest settings only);
  //   c2 — Checks and Reset keep their icons; c3, c4 — Back, Step and the errors keep theirs too, the speed
  //        bar and the air at their least
  function compact(){
    var sm = bar.querySelector('.sm'); if (!sm) return;
    sm.classList.remove('eq', 'k1', 'c1', 'c2', 'c3', 'c4');
    function over(){
      if (sm.scrollWidth > sm.clientWidth + 1) return true;
      return [].some.call(sm.children, function(z){ return z.scrollWidth > z.clientWidth + 1; });
    }
    function aside(){
      var c = sm.querySelector('.sm-c'); if (!c) return false;
      var r = sm.getBoundingClientRect(), b = c.getBoundingClientRect();
      return Math.abs(b.left + b.width / 2 - r.left - r.width / 2) / (TT.scale || 1) > 2;
    }
    if (over() || aside()) sm.classList.add('eq');
    ['k1', 'c1', 'c2', 'c3', 'c4'].forEach(function(c){ if (over()) sm.classList.add(c); });
  }
  // Tuner's panel gives way the same way: fast simulation into ⋯, then the captions of the rarer keys
  function compactTuner(){
    var sm = bar.querySelector('.sm'); if (!sm) return;
    sm.classList.remove('c1', 'c2', 'c3');
    ['c1', 'c2', 'c3'].forEach(function(c){ if (sm.scrollWidth > sm.clientWidth + 1) sm.classList.add(c); });
  }
  function fastMenu(b){
    ui.menu(b, [{key:'this', icon:'<img src="assets/sim/scope-current.svg" alt="">', label:t('s_this')},
                {key:'upto', icon:'<img src="assets/sim/scope-tocur.svg" alt="">', label:t('s_upto')},
                {key:'end', icon:'<img src="assets/sim/scope-all.svg" alt="">', label:t('s_end')}]).then(function(k){ if (k) fast(k); });
  }
  bar.addEventListener('click', function(e){
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'play'){ var s = act(); if (s && s.p.state === 'simulating') pause(); else play(); }
    else if (a === 'back') step(-1);
    else if (a === 'this' || a === 'upto' || a === 'end') fast(a);
    else if (a === 'next') nextErr();
    else if (a === 'errs'){ var s3 = act(), l3 = s3 ? errs(s3.c) : []; if (l3.length === 1) jump(l3[0]); else errList(b); }
    else if (a === 'prev') prevErr();
    else if (a === 'reset') reset();
    else if (a === 'checks'){ if (TT.isTuner()) checksWindow(b); else checksPanel(b); }
    else if (a === 'more') fastMenu(b);
    else if (a === 'calc'){ var s1 = act(); if (s1){ stopTimer(); TT.calc(s1.p.id); } }
    else if (a === 'stopcalc'){ var s2 = act(); if (s2) TT.stopCalc(s2.p.id); }
    // Step works on pointerdown (held — continuously), its click does nothing more
  });
  // Step: a press is one block; held — continuously (spec sect. 3)
  var hold = 0, holdRep = 0;
  bar.addEventListener('pointerdown', function(e){
    var b = e.target.closest('[data-act="step"]'); if (!b || b.disabled) return;
    step(1);
    hold = setTimeout(function(){ holdRep = setInterval(function(){ var a = act(); if (!a || a.c.cur >= last(a.c)){ release(); return; } step(1); }, 1000 / Math.max(6, rate())); }, 420);
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
  });
  function release(){ clearTimeout(hold); clearInterval(holdRep); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); }
  // speed: a tap or a drag anywhere on the bar
  bar.addEventListener('pointerdown', function(e){
    var tr = e.target.closest('.sm-speed'); if (!tr) return;
    e.preventDefault(); tr.classList.add('drag');
    function set(ev){
      var r = tr.getBoundingClientRect(); speed = Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 100);
      tr.style.setProperty('--v', speed + '%'); tr.setAttribute('aria-valuenow', speed);
    }
    function up(){ tr.classList.remove('drag'); TT.keep('touch.speed', speed); if (timer) restart(); window.removeEventListener('pointermove', set); window.removeEventListener('pointerup', up); }
    set(e); window.addEventListener('pointermove', set); window.addEventListener('pointerup', up);
  });

  // ——— the errors list: a panel over the console from the count key, two errors or more — for when there
  // are many; one error — the key takes the machine straight to its block, the text shows it (Ruslan,
  // 2026-11-18; spec sect. 7 had no list — the marks at the blocks stay). Rows 56: number · Tuner's mark ·
  // kind and operation · the block. The current one is lit; a tap — the machine to that error (it is
  // already simulated: the cursor goes back or forth, nothing is recalculated), the panel closes ———
  var MK = {gouge:[1, 11], holder:[1, 12], plunge:[1, 13], rapid:[1, 14], machine:[1, 7]};
  function errList(anchor){
    var a = act(); if (!a) return;
    var f = TT.found(a.c), list = errs(a.c), esc = ui.esc;
    var html = '<div class="tk-mh">' + esc(t('s_errs') + ' · ' + list.length) + '</div><div class="sm-el">' + list.map(function(i, k){
      var o = TT.opAt(a.c, i), m = MK[f[i]] || MK.machine;
      return '<button class="sm-el-r' + (i === a.c.cur ? ' cur' : '') + '" data-el="' + i + '">' +
        '<span class="sm-el-n">' + (k + 1) + '</span>' + ui.spr('status', m[0], m[1]) +
        '<span class="sm-el-t"><b>' + esc(t('e_' + f[i])) + '</b>' + (o ? '<small>' + esc(o.name + ' · ' + o.tool) + '</small>' : '') + '</span>' +
        '<code>' + esc(a.c.lines[i].trim()) + '</code></button>';
    }).join('') + '</div>';
    var el = ui.pop(anchor, html, function(e){
      var r = e.target.closest('[data-el]'); if (!r) return;
      ui.closeMenu(); jump(+r.getAttribute('data-el'));
    }, 'sm-elist');
    var box = el.querySelector('.sm-el'), cur = box.querySelector('.cur');
    if (cur) box.scrollTop = cur.offsetTop - box.clientHeight / 2 + cur.offsetHeight / 2;
    ui.dragScroll(box, 'y');
  }

  // ——— Checks: a panel over the console — tiles, the whole tile is the target, a tap turns it on or off
  // (switches are fiddly under a finger — Ruslan, 2026-11-18). Spec sect. 3: holder and machine
  // collisions, gouges, stop on error, smooth / block by block — no more than 6. A 2 × 3 grid of equal
  // tiles, the sixth cell empty (Ruslan) ———
  var SMOOTH = '<svg class="tk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 17c4.5 0 4.5-10 9-10s4.5 10 9 10"/></svg>';
  var TILES = [['holder', 'st-holder'], ['machine', 'st-machine'], ['gouge', 'st-gouge'], ['stopErr', 'st-stop'], ['smooth', '']];
  function tile(r, on){
    return '<button class="sm-ck-t' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-ck="' + r[0] + '">' +
      (r[1] ? '<img src="assets/sim/' + r[1] + '.svg" alt="">' : SMOOTH) + '<i class="sm-ck-m"></i>' +
      '<b><span>' + t('c_' + r[0]) + '</span></b></button>';
  }
  function checksPanel(anchor){
    var ch = TT.checks();
    var html = '<div class="tk-mh">' + t('s_checks') + '</div><div class="sm-ck">' +
      TILES.map(function(r){ return tile(r, !!ch[r[0]]); }).join('') + '</div>';
    ui.pop(anchor, html, function(e){
      var el = e.target.closest('[data-ck]'); if (!el) return;
      var k = el.getAttribute('data-ck'), v = !TT.checks()[k];
      TT.setCheck(k, v); el.classList.toggle('on', v); el.setAttribute('aria-checked', v);
      if (k === 'smooth' && timer) restart();
    }, 'sm-checks');
  }
  // the variant from Tuner's components: Tuner's "Checks and Stops" window — rows of switches, the
  // whole 56 row is the target (Smooth sits here per the spec, sect. 3)
  function checksWindow(anchor){
    var ch = TT.checks();
    ui.pop(anchor, '<div class="tk-mh">' + t('s_checks') + '</div>' + TILES.map(function(r){
      return '<div class="tk-mi" role="switch" aria-checked="' + !!ch[r[0]] + '" data-ck="' + r[0] + '">' +
        (r[1] ? '<img src="assets/sim/' + r[1] + '.svg" alt="">' : SMOOTH) +
        '<span><b>' + t('c_' + r[0]) + '</b>' + (r[0] === 'smooth' ? '<small>' + t('c_smooth_d') + '</small>' : '') + '</span>' +
        '<i class="tk-sw' + (ch[r[0]] ? ' on' : '') + '"></i></div>';
    }).join(''), function(e){
      var el = e.target.closest('[data-ck]'); if (!el) return;
      var k = el.getAttribute('data-ck'), v = !TT.checks()[k];
      TT.setCheck(k, v); el.querySelector('.tk-sw').classList.toggle('on', v); el.setAttribute('aria-checked', v);
      if (k === 'smooth' && timer) restart();
    }, 'sm-checks-w');
  }

  // ——— the timeline ———
  var tlShape = '', segs = [];
  function sections(c){
    var s = [];
    if (c.ops.length && c.ops[0].start > 0) s.push({from:0, to:c.ops[0].start - 1, name:t('pg_start'), col:'--ec-fg-24'});
    c.ops.forEach(function(o){ s.push({from:o.start, to:o.end, name:o.name, col:o.c}); });
    if (!s.length) s.push({from:0, to:last(c), name:'', col:'--ec-fg-24'});
    return s;
  }
  function renderTl(){
    var a = act();
    if (!a){ tlHost.innerHTML = ''; tlShape = ''; return; }
    var c = a.c, calc = TT.calculated(a.p), sh = [TT.lang(), a.p.id, a.p.ch, calc].join('|');
    if (sh !== tlShape){
      tlShape = sh; segs = sections(c);
      tlHost.innerHTML = '<div class="tl' + (calc ? '' : ' off') + '"><div class="tl-tr" role="slider" aria-label="' + t('tl_aria') + '" aria-valuemin="0" aria-valuemax="' + last(c) + '">' +
        segs.map(function(s){ return '<div class="tl-seg" style="flex-grow:' + (s.to - s.from + 1) + ';--c:var(' + s.col + ')"><i></i><span>' + ui.esc(s.name) + '</span></div>'; }).join('') +
        '<span class="tl-thumb"></span></div></div>';
    }
    // the simulated part of each run and the machine's place
    var tr = tlHost.querySelector('.tl-tr'), els = tr.querySelectorAll('.tl-seg');
    segs.forEach(function(s, i){ var d = Math.max(0, Math.min(1, (c.simTo - s.from + 1) / (s.to - s.from + 1))); els[i].style.setProperty('--d', d * 100 + '%'); });
    var k = segs.findIndex(function(s){ return c.cur >= s.from && c.cur <= s.to; }), el = els[Math.max(0, k)], s = segs[Math.max(0, k)];
    var x = el.offsetLeft + el.offsetWidth * (c.cur - s.from + 0.5) / (s.to - s.from + 1);
    tr.querySelector('.tl-thumb').style.setProperty('--x', x + 'px');
    tr.setAttribute('aria-valuenow', c.cur);
  }
  // a point of the track → its block
  function lineAt(tr, clientX){
    var k = TT.scale || 1, x = (clientX - tr.getBoundingClientRect().left) / k, els = tr.querySelectorAll('.tl-seg');
    for (var i = 0; i < els.length; i++){
      var el = els[i], s = segs[i];
      if (x <= el.offsetLeft + el.offsetWidth || i === els.length - 1){
        var f = Math.max(0, Math.min(0.999, (x - el.offsetLeft) / el.offsetWidth));
        return s.from + Math.floor(f * (s.to - s.from + 1));
      }
    }
    return 0;
  }
  tlHost.addEventListener('pointerdown', function(e){
    var tr = e.target.closest('.tl-tr'); if (!tr) return;
    var a = act(); if (!a) return;
    if (!TT.calculated(a.p)){ ui.toast(t('t_notCalc'), 'var(--ec-amber)'); return; }
    e.preventDefault(); tr.classList.add('drag');
    var frozen = false, raf = 0, lastX = e.clientX;
    // back — the machine and the cursor only; forward — simulated on the way, a new error stops the drag
    function seek(){
      raf = 0; if (frozen) return;
      var s = act(); if (!s) return;
      var line = lineAt(tr, lastX);
      if (line === s.c.cur) return;
      var before = errs(s.c).length, r = jump(line, true);
      if (r < line && errs(s.c).length > before) frozen = true;
    }
    function mv(ev){ lastX = ev.clientX; if (!raf) raf = requestAnimationFrame(seek); }
    function up(){
      tr.classList.remove('drag'); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      var s = act(); if (s) TT.emit('reveal', s.c.cur);
    }
    seek(); window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });

  function all(){ render(); renderTl(); }
  TT.on('projects', all);
  TT.on('active', function(){ stopTimer(); all(); });
  TT.on('lang', function(){ shape = tlShape = ''; all(); });
  TT.on('resize', function(){ tlShape = ''; renderTl(); if (TT.isTuner()) compactTuner(); else compact(); });
  TT.on('variant', function(){ shape = tlShape = ''; all(); });
  TT.sim = {play:play, pause:pause, jump:jump};
})();
