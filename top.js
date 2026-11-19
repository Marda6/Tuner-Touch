// ENCY Tuner Touch — block 1: the header, by levels from the top down (Ruslan, 2026-11-18):
//   1 — the window and its projects (#ttTabs): ← back to Tuner | project tabs · Open … | — ✕
//   2 — the current project (#ttTop): its machine and control | Channel 1 | 2 | 3 · the channel's program ▾
//       … Save ▾ · View only (the errors moved to the console)
// The machine belongs to a project and the channels to the machine, so each sits under what holds it.
// The program's state and Calculate live on the simulation console, right before Play (sim.js).
// Tabs: one project — one tab, as in Tuner; a tap switches (Tuner switches too), ✕ closes with the
// questions Tuner asks, "Open" lands on the Open screen. Both rows re-render only when their shape
// changes — a running calculation updates its numbers in place, so a press is never lost.
(function(){
  'use strict';
  var top = document.getElementById('ttTop'), tabsEl = document.getElementById('ttTabs');
  if (!top) return;
  var t = TT.t, ui = TT.ui, esc = ui.esc;
  var DIV = '<span class="tk-vdiv"></span>';

  // ——— level 2: the current project ———
  var topShape = '';
  function renderTop(){
    var p = TT.active(), vo = TT.viewOnly();
    var errs = p ? p.channels.map(function(c){ return Object.keys(TT.found(c)).length; }) : [];
    var shape = [TT.lang(), TT.variant(), vo, p ? [p.id, p.ch, p.channels.length, errs.join(','), p.errors, p.state, p.dirty, p.machine, p.channels[p.ch].file].join(':') : '-'].join('|');
    if (shape === topShape){ pct(p); return; }
    topShape = shape;
    if (!p){ top.innerHTML = ''; return; }
    if (TT.isTuner()){ renderTopTuner(p, vo); return; }
    // Channel 1 | 2 | 3 — one switch, its title inside the tray (a multichannel machine only); a channel
    // with errors found carries a small red square in its corner — the count is on the console, for the shown channel
    var chs = p.channels.length > 1 ? DIV + '<div class="pg-seg" role="tablist"><span class="pg-lbl">' + esc(t('chl')) + '</span>' + p.channels.map(function(x, i){
      return '<div class="pg-seg-b' + (i === p.ch ? ' cur' : '') + (errs[i] ? ' err' : '') + '" role="tab" data-ch="' + i + '"' +
        (errs[i] ? ' aria-label="' + esc(t('chl') + ' ' + (i + 1) + ' · ' + t('errors', errs[i])) + '"' : '') + '><span>' + (i + 1) + '</span></div>';
    }).join('') + '</div>' : '';
    // the chain of the project: machine | channel → its program (the file is a dropdown with the program's
    // menu: Open program… · Split… · Save program as… — prog.js) … saving. The errors are not here: their
    // count and the way through them are on the console, by Checks (Ruslan, 2026-11-18; spec sect. 7 had a
    // badge here)
    var file = '<button class="pg-dd" data-act="prog" aria-haspopup="menu" aria-label="' + esc(t('program')) + '"><span>' + esc(p.channels[p.ch].file) + '</span>' + ui.ic('chev') + '</button>';
    top.innerHTML = '<div class="tt-mach"><b>' + esc(p.machine) + '</b><span>' + esc(p.control) + '</span></div>' + (chs || DIV) + file +
      '<span class="tk-sp"></span>' +
      '<div class="tt-grp"><div class="tk-split" data-split="save">' +
        ui.btn({act:'save', label:t('save'), icon:ui.spr('menu', 1, 5), cls:p.dirty ? 'on' : '', dis:vo}) +
        ui.btn({act:'savemenu', icon:ui.spr('menu', 7, 1), cls:p.dirty ? 'on' : '', dis:vo, aria:t('save') + ' ▾'}) + '</div>' +
        (vo ? ui.btn({act:'lock', label:t('viewOnly'), icon:ui.ic('lock'), cls:'on'})
            : ui.btn({act:'lock', icon:ui.ic('lockOpen'), cls:'ghost sq', aria:t('viewOnly')})) + '</div>';
  }

  // the variant from Tuner's components (spec sect. 4 — the top bar of the draft): machine and control …
  // the errors badge (a tap — the first error) | the program's state and "▶ Calculate" (always here, coloured
  // when a calculation is needed; while calculating — the percentage, a bar and Cancel) | Save ▾ · View only.
  // The channels and the program's file sit on the program panel, as in the spec (prog.js)
  function renderTopTuner(p, vo){
    var s = p.state, cls = s === 'needs' ? 'amber' : s === 'calculating' ? 'busy' : (s === 'simulating' || s === 'simulated') ? 'green' : '';
    var calc = s === 'calculating' ? ui.btn({act:'stopcalc', label:t('cancel'), icon:ui.ic('stop')})
             : ui.btn({act:'calc', label:t('calc'), icon:ui.spr('macros', 1, 1), cls:s === 'needs' ? 'pri' : '', dis:vo});
    top.innerHTML = '<div class="tt-mach"><b>' + esc(p.machine) + '</b><span>' + esc(p.control) + '</span></div>' +
      '<span class="tk-sp"></span>' +
      (p.errors > 0 ? ui.btn({act:'errors', label:t('errors', p.errors), icon:ui.spr('status', 1, 9), cls:'tk-badge'}) + DIV : '') +
      '<div class="tk-state ' + cls + '"><span class="tk-st-l"><span data-pct-text>' + esc(t('st_' + s, {p:Math.floor(p.pct || 0)})) + '</span>' +
        (s === 'calculating' ? '<i data-pct-bar style="--p:' + (p.pct || 0) + '%"></i>' : '') + '</span>' + calc + '</div>' + DIV +
      '<div class="tt-grp"><div class="tk-split" data-split="save">' +
        ui.btn({act:'save', label:t('save'), icon:ui.spr('menu', 1, 5), cls:p.dirty ? 'on' : '', dis:vo}) +
        ui.btn({act:'savemenu', icon:ui.spr('menu', 7, 1), cls:p.dirty ? 'on' : '', dis:vo, aria:t('save') + ' ▾'}) + '</div>' +
        (vo ? ui.btn({act:'lock', label:t('viewOnly'), icon:ui.ic('lock'), cls:'on'})
            : ui.btn({act:'lock', icon:ui.ic('lockOpen'), cls:'ghost sq', aria:t('viewOnly')})) + '</div>';
  }
  // a running calculation: its words and bar change in place
  function pct(p){
    if (!p || p.state !== 'calculating' || !TT.isTuner()) return;
    var tx = top.querySelector('[data-pct-text]'), pb = top.querySelector('[data-pct-bar]');
    if (tx) tx.textContent = t('st_calculating', {p:Math.floor(p.pct)});
    if (pb) pb.style.setProperty('--p', p.pct + '%');
  }

  // ——— level 1: the window and its projects ———
  var tabsShape = '', strip = null;
  function renderTabs(){
    var list = TT.list(), cur = TT.active();
    var shape = TT.lang() + '|' + list.map(function(p){ return [p.id, p.name, p.dirty, p.state === 'calculating', cur && cur.id === p.id].join(':'); }).join(',');
    if (shape === tabsShape){
      list.forEach(function(p){
        if (p.state !== 'calculating') return;
        var tab = strip.querySelector('[data-tab="' + p.id + '"]');
        tab.querySelector('.tt-tab-p').textContent = Math.floor(p.pct) + ' %'; tab.style.setProperty('--p', p.pct + '%');
      });
      return;
    }
    tabsShape = shape;
    var keep = strip ? strip.scrollLeft : 0;
    // ENCY Tuner's mark (Tuner's own logo.svg) — the app's sign and a tap back to the Tuner window
    // (its long-press tip — block 8) | tabs · Open … | — ✕
    // a tab being calculated: the percentage next to the name, its border filling amber (--p)
    tabsEl.innerHTML = ui.btn({act:'tuner', icon:'<img src="assets/ency/logo.svg" alt="">', cls:'ghost sq tt-back tt-logo', aria:t('tuner')}) + DIV +
      '<div class="tt-tabs-in" role="tablist">' + list.map(function(p){
        var calc = p.state === 'calculating', isCur = cur && cur.id === p.id;
        return '<div class="tt-tab' + (isCur ? ' cur' : '') + (calc ? ' calc' : '') + '" role="tab" aria-selected="' + !!isCur + '" data-tab="' + p.id + '"' +
          (calc ? ' style="--p:' + p.pct + '%"' : '') + '>' +
          '<span class="tt-tab-n">' + esc(p.name) + '</span>' +
          (calc ? '<span class="tt-tab-p">' + Math.floor(p.pct) + ' %</span>' : '') + (p.dirty ? '<span class="tt-tab-d" title="unsaved"></span>' : '') +
          '<button class="tt-tab-x" data-close="' + p.id + '" aria-label="Close ' + esc(p.name) + '">' + ui.ic('x') + '</button></div>';
      }).join('') + '</div>' + ui.btn({act:'open', label:t('open'), icon:ui.spr('menu', 1, 4), cls:'ghost tt-open'}) +
      '<span class="tk-sp"></span>' + DIV +
      '<div class="tt-grp tt-win">' + ui.btn({act:'min', icon:ui.spr('menu', 1, 6), cls:'ghost sq', aria:'Minimize'}) +
        ui.btn({act:'quit', icon:ui.spr('menu', 1, 8), cls:'ghost sq', aria:'Close'}) + '</div>';
    strip = tabsEl.querySelector('.tt-tabs-in');
    strip.scrollLeft = keep;
    ui.dragScroll(strip, 'x');
    strip.addEventListener('scroll', edges);
    showCurrent(); edges();
  }
  // the current tab is always in view (sect. 3); soft edges tell there are more tabs
  function showCurrent(){
    var c = strip && strip.querySelector('.tt-tab.cur'); if (!c) return;
    var l = c.offsetLeft - 12, r = c.offsetLeft + c.offsetWidth + 12;
    if (l < strip.scrollLeft) strip.scrollLeft = l; else if (r > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = r - strip.clientWidth;
  }
  function edges(){
    if (!strip) return;
    strip.classList.toggle('more-l', strip.scrollLeft > 2);
    strip.classList.toggle('more-r', strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2);
  }

  // ——— closing a project: the questions Tuner asks, big buttons, Cancel keeps everything ———
  function askSave(p){
    return ui.ask({title:t('q_save', {name:p.name}), text:t('q_save_d'), buttons:[
      {key:'dont', label:t('b_dont'), cls:'danger', left:true}, {key:'cancel', label:t('b_cancel')}, {key:'save', label:t('b_save'), cls:'pri'}]});
  }
  function closeProject(id){
    var p = TT.get(id); if (!p) return;
    var chain = Promise.resolve(true);
    if (p.state === 'calculating') chain = chain.then(function(){
      return ui.ask({title:t('q_calc'), text:t('q_calc_d', {name:p.name, p:Math.floor(p.pct)}), buttons:[
        {key:'cancel', label:t('b_cancel')}, {key:'stop', label:t('b_stopClose'), cls:'pri'}]}).then(function(k){
        if (k !== 'stop') return false; TT.stopCalc(id, true); return true;
      });
    });
    chain.then(function(go){
      if (!go) return false;
      if (!p.dirty) return true;
      return askSave(p).then(function(k){ if (k === 'save'){ TT.save(id); return true; } return k === 'dont'; });
    }).then(function(go){ if (go) TT.remove(id); });
  }
  TT.flow = {askSave:askSave};

  // ——— actions ———
  top.addEventListener('click', function(e){
    var p = TT.active(); if (!p) return;
    var ch = e.target.closest('[data-ch]');
    if (ch){ p.ch = +ch.getAttribute('data-ch'); TT.emit('projects'); return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'prog') TT.emit('progMenu', b);
    else if (a === 'errors') TT.emit('firstError');
    else if (a === 'calc') TT.calc(p.id);
    else if (a === 'stopcalc') TT.stopCalc(p.id);
    else if (a === 'lock') TT.setViewOnly(!TT.viewOnly());
    else if (a === 'save') save(p);
    else if (a === 'savemenu') saveMenu(b, p);
  });
  // a CAM project (.stcp) is first saved as a Tuner project — "Save project as" (sect. 3)
  function save(p){ if (p.cam) ui.toast(t('t_soon', {what:t('w_saveAs'), n:7}), 'var(--ec-fg-48)'); else TT.save(p.id); }
  function saveMenu(b, p){
    var prog = p.channels[p.ch].file;
    ui.menu(b.closest('.tk-split'), [
      {key:'save', icon:ui.spr('menu', 1, 5), label:t('m_save'), desc:p.cam ? t('m_saveCam_d') : t('m_save_d', {file:p.file})},
      {key:'saveAs', icon:ui.spr('add', 2, 14), label:t('m_saveAs'), desc:t('m_saveAs_d')},
      '-',
      {key:'progAs', icon:ui.spr('add', 2, 1), label:t('m_progAs'), desc:t('m_progAs_d', {prog:prog})}
    ]).then(function(k){
      if (k === 'save') save(p);
      else if (k === 'saveAs') ui.toast(t('t_soon', {what:t('w_saveAs'), n:7}), 'var(--ec-fg-48)');
      else if (k === 'progAs') ui.toast(t('t_soon', {what:t('w_progAs'), n:7}), 'var(--ec-fg-48)');
    });
  }
  tabsEl.addEventListener('click', function(e){
    var x = e.target.closest('[data-close]');
    if (x){ closeProject(+x.getAttribute('data-close')); return; }
    var tab = e.target.closest('[data-tab]');
    if (tab){ TT.select(+tab.getAttribute('data-tab')); return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'open') TT.emit('screen', 'open');
    else if (a === 'tuner') TT.emit('under', 'tuner');
    else if (a === 'min') TT.emit('under', 'desk');
    else if (a === 'quit') TT.emit('quit');
  });

  function all(){ renderTop(); renderTabs(); }
  TT.on('projects', all);
  TT.on('active', function(){ all(); showCurrent(); edges(); });
  TT.on('lang', function(){ topShape = tabsShape = ''; all(); });
  TT.on('viewonly', function(){ topShape = ''; renderTop(); });
  TT.on('variant', function(){ topShape = ''; renderTop(); });
  TT.on('resize', function(){ showCurrent(); edges(); });
})();
