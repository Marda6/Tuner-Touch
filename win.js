// ENCY Tuner Touch — the window and what lies under it (block 1):
//   "Tuner window" — the touch window closes, the regular Tuner shows the same tab; Utilities ▾ →
//     Touch interface brings it back (the app menu, next to Calculator and System logs — sect. 3)
//   "—" — both windows go to the taskbar; its button brings them back
//   "✕" — Tuner closes with the touch interface: a running calculation or simulation is asked about
//     first, then every project with unsaved changes — Save / Don't save / Cancel (Cancel keeps all)
//   no project left — the Open screen (built in block 7; here it can bring the demo projects back)
//   zones of the later blocks — placeholders with their live size
(function(){
  'use strict';
  var root = document.getElementById('tt'), t = TT.t, ui = TT.ui, esc = ui.esc;
  var layer = null;
  function clear(){ if (layer){ layer.remove(); layer = null; } }

  function clock(){ var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + '<br>' + d.toLocaleDateString('ru-RU'); }
  function under(kind){
    clear(); ui.closeMenu();
    layer = document.createElement('div');
    if (kind === 'desk'){
      layer.className = 'tt-under desk';
      layer.innerHTML = '<div class="tt-under-body"><h2>' + t('u_desk') + '</h2><p>' + t('u_desk_d') + '</p></div>' +
        '<div class="tt-task"><span class="tt-task-start"><b></b><b></b><b></b><b></b></span>' +
        '<span class="tt-task-app" data-back><i>T</i>ENCY Tuner — ' + esc(t('u_touch')) + '</span>' +
        '<span class="tt-task-clock">' + clock() + '</span></div>';
    } else if (kind === 'tuner'){
      var list = TT.list(), cur = TT.active();
      layer.className = 'tt-under tuner';
      layer.innerHTML = '<div class="tt-tw-top"><span class="tt-tw-b" data-utils>≡ ' + esc(t('u_utils')) + ' ▾</span>' +
        list.map(function(p){ return '<span class="tt-tw-tab' + (cur && p.id === cur.id ? ' cur' : '') + '" data-tw="' + p.id + '">' + esc(p.name) + (p.dirty ? ' ●' : '') + '</span>'; }).join('') +
        '</div><div class="tt-tw-body"><b>ENCY Tuner · ' + esc(cur ? cur.name : '—') + '</b><span>' + t('u_tuner_d') + '</span><span>' + t('u_tuner_h') + '</span></div>';
    } else if (kind === 'closed'){
      layer.className = 'tt-under desk';
      layer.innerHTML = '<div class="tt-under-body"><h2>' + t('u_closed') + '</h2><p>' + t('u_closed_d') + '</p>' +
        '<button class="tk-b pri big" data-restart>' + t('u_restart') + '</button></div>' +
        '<div class="tt-task"><span class="tt-task-start"><b></b><b></b><b></b><b></b></span><span class="tt-task-clock">' + clock() + '</span></div>';
    }
    root.appendChild(layer);
  }
  root.addEventListener('click', function(e){
    if (!layer || !layer.contains(e.target)) return;
    if (e.target.closest('[data-back]')) clear();
    else if (e.target.closest('[data-restart]')){ clear(); TT.reset(); }
    else if (e.target.closest('[data-tw]')){ TT.select(+e.target.closest('[data-tw]').getAttribute('data-tw')); under('tuner'); }
    else if (e.target.closest('[data-utils]')){
      var top = layer.querySelector('.tt-tw-top'), m = top.querySelector('.tt-tw-menu');
      if (m){ m.remove(); return; }
      m = document.createElement('div'); m.className = 'tt-tw-menu';
      m.style.left = e.target.closest('[data-utils]').offsetLeft + 'px';
      m.innerHTML = '<span class="tt-tw-mi off">' + t('u_tools') + '</span><span class="tt-tw-mi off">' + t('u_interp') + '</span>' +
        '<span class="tt-tw-mi off">' + t('u_calc') + '</span><span class="tt-tw-mi off">' + t('u_logs') + '</span>' +
        '<span class="tt-tw-mi hl" data-back>' + t('u_touch') + '</span>';
      top.appendChild(m);
    }
  });
  TT.on('under', under);

  // ——— closing Tuner with the touch interface ———
  TT.on('quit', function(){
    var busy = TT.list().filter(function(p){ return p.state === 'calculating' || p.state === 'simulating'; })[0];
    var chain = Promise.resolve(true);
    if (busy) chain = ui.ask({title:t('q_quit'), text:t(busy.state === 'calculating' ? 'q_quitCalc_d' : 'q_quitSim_d', {name:busy.name}), buttons:[
      {key:'cancel', label:t('b_cancel')}, {key:'stop', label:t('b_stopQuit'), cls:'pri'}]}).then(function(k){
        if (k !== 'stop') return false;
        TT.list().forEach(function(p){ if (p.state === 'calculating') TT.stopCalc(p.id, true); else if (p.state === 'simulating') TT.set(p.id, {state:'paused'}); });
        return true;
      });
    // every project with unsaved changes, in its own tab — the operator sees which one is asked about
    TT.list().filter(function(p){ return p.dirty; }).forEach(function(p){
      chain = chain.then(function(go){
        if (!go) return false;
        TT.select(p.id);
        return TT.flow.askSave(p).then(function(k){ if (k === 'save'){ TT.save(p.id); return true; } return k === 'dont'; });
      });
    });
    chain.then(function(go){ if (go) under('closed'); });
  });

  // ——— the Open screen: no project left, or "Open" (block 7 builds it) ———
  var screen = null;
  function openScreen(show){
    if (screen){ screen.remove(); screen = null; }
    if (!show) return;
    var any = TT.list().length > 0;
    screen = document.createElement('div'); screen.className = 'tt-screen';
    screen.innerHTML = '<div class="tt-screen-top">' + (any ? ui.btn({act:'close', label:t('cancel'), icon:ui.ic('x'), cls:'ghost'}) : '') +
      '<h2>' + t('o_title') + '</h2>' + (any ? '' : '<span class="tk-vdiv"></span>' + ui.btn({act:'min', icon:ui.spr('menu', 1, 6), cls:'ghost sq'}) +
      ui.btn({act:'quit', icon:ui.spr('menu', 1, 8), cls:'ghost sq'})) + '</div>' +
      '<div class="tt-screen-body"><p>' + t('o_text') + '</p>' + ui.btn({act:'demo', label:t('o_demo'), icon:ui.spr('menu', 1, 4), cls:'pri big'}) + '</div>';
    root.appendChild(screen);
  }
  root.addEventListener('click', function(e){
    if (!screen || !screen.contains(e.target)) return;
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'close') openScreen(false);
    else if (a === 'demo'){ openScreen(false); TT.openDemo(); }
    else if (a === 'min') under('desk');
    else if (a === 'quit') TT.emit('quit');
  });
  TT.on('screen', function(k){ openScreen(k === 'open'); });
  TT.on('projects', function(){ if (!TT.list().length && !screen) openScreen(true); });
  TT.on('lang', function(){ if (screen) openScreen(true); if (layer && layer.classList.contains('tuner')) under('tuner'); });

  // ——— zones of the later blocks: what will be there, live size ———
  var ZONES = [];   // the 3D (block 4) is built — view3d.js
  function zones(){
    ZONES.forEach(function(z){
      var el = document.getElementById(z[0]); if (!el) return;
      var ph = el.querySelector('.tt-ph'); if (!ph){ ph = document.createElement('div'); ph.className = 'tt-ph'; el.appendChild(ph); }
      ph.innerHTML = '<b>' + t(z[1]) + '</b>' + (z[2] ? '<span>' + t(z[2]) + '</span>' : '') +
        '<i>' + el.offsetWidth + ' × ' + el.offsetHeight + ' · ' + t('blk', {n:z[3]}) + '</i>';
    });
  }
  TT.on('lang', zones); TT.on('resize', zones);
  if (window.ResizeObserver) new ResizeObserver(zones).observe(root);
})();
