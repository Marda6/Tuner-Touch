// ENCY Tuner — window header: builds the title bar into #app and runs the project tabs.
// Tabs: click selects, ✕ or middle click closes (the neighbour takes over), "+" opens a new
// project. Every switch fires `tuner:tab` on document ({id, name} or null when none is left).
(function(){
  'use strict';

  var ICN = 'assets/header/';

  // left actions — the ENCY Tuner main window set (docs, "Main panel")
  var ACTIONS = [
    {id:'menu',   icon:'menu.svg',   t:'Menu'},
    {id:'new',    icon:'new.svg',    t:'New project'},
    {id:'open',   icon:'open.svg',   t:'Open project'},
    {id:'save',   icon:'save.svg',   t:'Save project'},
    {id:'export', icon:'export.svg', t:'Export NC code', d:'Export the full NC program'}
  ];
  var WINDOW = [
    {id:'more',  icon:'more.svg',  t:'More'},
    {id:'min',   icon:'min.svg',   t:'Minimize'},
    {id:'max',   icon:'max.svg',   t:'Restore down'},
    {id:'close', icon:'close.svg', t:'Close'}
  ];

  var tabs = [
    {id:1, name:'3+2'},
    {id:2, name:'Multichannel'},
    {id:3, name:'Pawn'}
  ];
  var active = 1, seq = tabs.length, untitled = 0;

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function btn(o, size){
    return '<button class="hbtn" data-act="' + o.id + '" data-tip="' + esc(o.t) + '"' +
      (o.d ? ' data-tip-d="' + esc(o.d) + '"' : '') + ' aria-label="' + esc(o.t) + '">' +
      '<img class="hicn' + size + '" src="' + ICN + o.icon + '" alt=""></button>';
  }

  function tabHTML(t){
    return '<div class="htab' + (t.id === active ? ' active' : '') + '" data-tab="' + t.id + '"' +
      ' role="tab" tabindex="0" aria-selected="' + (t.id === active) + '" data-tip="' + esc(t.name) + '">' +
      '<span class="htab-t">' + esc(t.name) + '</span>' +
      '<button class="htab-x" data-close="' + t.id + '" aria-label="Close ' + esc(t.name) + '" tabindex="-1">' +
        '<img src="' + ICN + 'tab-close.svg" alt=""></button>' +
    '</div>';
  }

  function renderTabs(){
    strip.innerHTML = tabs.map(tabHTML).join('') +
      '<button class="hbtn" data-act="add" data-tip="New tab" aria-label="New tab">' +
        '<img class="hicn12" src="' + ICN + 'plus.svg" alt=""></button>';
  }

  function current(){ return tabs.filter(function(x){ return x.id === active; })[0] || null; }
  function emit(){ document.dispatchEvent(new CustomEvent('tuner:tab', {detail: current()})); }
  // scripts loaded after the header read the active tab from here, then follow `tuner:tab`
  // (Tuner Touch, variant 3, switches the projects from its own top bar: list · select · close · add)
  window.TUNER_HEADER = {current: current, list: function(){ return tabs.slice(); },
    select: function(id){ select(id); }, close: function(id){ close(id); }, add: function(){ add(); }};

  function select(id){
    if (id === active) return;
    active = id; renderTabs(); emit();
  }

  function close(id){
    var i = tabs.map(function(x){ return x.id; }).indexOf(id);
    if (i < 0) return;
    tabs.splice(i, 1);
    // the closed tab was active → the right neighbour takes over, else the left one
    if (id === active){
      var next = tabs[i] || tabs[i - 1];
      active = next ? next.id : null;
      renderTabs(); emit();
    } else renderTabs();
  }

  function add(){
    var t = {id: ++seq, name: 'New project ' + (++untitled)};
    tabs.push(t); active = t.id;
    renderTabs(); emit();
    strip.querySelector('.htab.active').scrollIntoView({inline:'nearest'});
  }

  // ——— build ———
  var app = document.getElementById('app');
  if (!app) return;
  app.insertAdjacentHTML('afterbegin',
    '<header class="topbar">' +
      '<button class="hbtn" data-act="logo" data-tip="ENCY Tuner" aria-label="ENCY Tuner">' +
        '<img class="hicn30" src="' + ICN + 'logo.svg" alt=""></button>' +
      '<div class="hdiv"></div>' +
      '<div class="hgroup">' + ACTIONS.map(function(o){ return btn(o, 30); }).join('') + '</div>' +
      '<div class="hdiv"></div>' +
      '<div class="htabs" role="tablist"></div>' +
      '<div class="hgroup">' + WINDOW.map(function(o){ return btn(o, 32); }).join('') + '</div>' +
    '</header>');
  var bar = app.querySelector('.topbar'), strip = bar.querySelector('.htabs');
  renderTabs();

  // ——— tabs ———
  strip.addEventListener('click', function(e){
    var x = e.target.closest('[data-close]');
    if (x){ e.stopPropagation(); close(+x.dataset.close); return; }
    if (e.target.closest('[data-act="add"]')){ add(); return; }
    var t = e.target.closest('.htab');
    if (t) select(+t.dataset.tab);
  });
  // middle click closes, as in any tabbed app
  strip.addEventListener('auxclick', function(e){
    var t = e.button === 1 && e.target.closest('.htab');
    if (t){ e.preventDefault(); close(+t.dataset.tab); }
  });
  strip.addEventListener('mousedown', function(e){ if (e.button === 1) e.preventDefault(); });
  strip.addEventListener('keydown', function(e){
    var t = e.target.closest('.htab');
    if (t && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); select(+t.dataset.tab); }
  });

  // ——— rich tooltip: one overlay for every header button, after a short hover ———
  // The owner is tracked by key, not by node: tabs re-render under the pointer, and a click
  // mutes the tooltip until the pointer moves to another button
  var tip = document.createElement('div'), timer = null, owner = null;
  tip.className = 'htip';
  document.body.appendChild(tip);
  function keyOf(el){ return el ? (el.dataset.tab ? 'tab' + el.dataset.tab : el.dataset.act) : null; }
  function hideTip(){ clearTimeout(timer); tip.classList.remove('show'); }
  function showTip(el){
    // a tab shows its name only when it is cut
    var label = el.classList.contains('htab') && el.querySelector('.htab-t');
    if (label && label.scrollWidth <= label.clientWidth) return;
    tip.innerHTML = '<div class="htip-t">' + esc(el.dataset.tip) + '</div>' +
      (el.dataset.tipD ? '<div class="htip-d">' + esc(el.dataset.tipD) + '</div>' : '');
    // under the button, left edges aligned; kept 4px inside the window
    var r = el.getBoundingClientRect();
    tip.style.left = Math.max(4, Math.min(r.left, innerWidth - tip.offsetWidth - 4)) + 'px';
    tip.style.top = (r.bottom + 6) + 'px';
    tip.classList.add('show');
  }
  // a gap between buttons hides the tooltip but keeps the owner: a re-render passes the pointer
  // through the bare strip for a moment, and the same tab must not ask again
  bar.addEventListener('mouseover', function(e){
    var el = e.target.closest('[data-tip]'), key = keyOf(el);
    if (!el){ hideTip(); return; }
    if (key === owner) return;
    hideTip();
    owner = key;
    timer = setTimeout(function(){ showTip(el); }, 500);
  });
  bar.addEventListener('mouseleave', function(){ hideTip(); owner = null; });

  // ——— themes: data-theme on <html>, kept across sessions (index.html sets it before the first
  // paint). Graphite is Core's default; Experimental is the playground for a new look (themes.css)
  var THEMES = [
    {id:'',    t:'Graphite',     g:'Themes',       base:'#0e1010'},
    {id:'exp', t:'Experimental', g:'Experimental', base:'#c6c8c4'}
  ];
  var root = document.documentElement;
  function theme(){ return root.getAttribute('data-theme') || ''; }
  function setTheme(id){
    if (id) root.setAttribute('data-theme', id); else root.removeAttribute('data-theme');
    try { localStorage.setItem('tuner.theme', id); } catch(e){}
    document.dispatchEvent(new CustomEvent('tuner:theme', {detail: id}));
  }
  window.TUNER_THEMES = {list: THEMES, get: theme, set: setTheme};

  // ——— logo menu (Tuner manual, "System and user setting"): Settings · Theme › | About ·
  // License manager | User manual · Support request · Updates. Icons: Dark_Menu.svg cells (row, col) ———
  var ITEMS = [
    {id:'settings', t:'Settings', ic:[5, 9]}, {id:'theme', t:'Theme'}, '-',
    {id:'about', t:'About', ic:[6, 2]}, {id:'lm', t:'License manager', ic:[6, 1]}, '-',
    {id:'manual', t:'User manual', ic:[3, 4]}, {id:'support', t:'Support request', ic:[3, 6]}, {id:'updates', t:'Updates', ic:[3, 9]}
  ];
  var ARR = '<svg class="hm-arr" viewBox="0 0 16 16" fill="none"><path d="M6.5 5L9.5 8L6.5 11" stroke="currentColor"/></svg>';
  var logo = bar.querySelector('[data-act="logo"]'), menu = null, sub = null;
  function curTheme(){ var id = theme(); return THEMES.filter(function(o){ return o.id === id; })[0] || THEMES[0]; }
  function closeSub(){ if (sub){ sub.remove(); sub = null; } if (menu){ var r = menu.querySelector('.hm-opt.open'); if (r) r.classList.remove('open'); } }
  function closeMenu(){ closeSub(); if (menu){ menu.remove(); menu = null; logo.classList.remove('open'); } }
  function openSub(row){
    if (sub) return;
    var id = theme();
    sub = document.createElement('div');
    sub.className = 'hmenu hm-sub';
    sub.innerHTML = THEMES.map(function(o, i){
      return (i && THEMES[i - 1].g === o.g ? '' : '<div class="hm-head">' + o.g + '</div>') +
        '<button class="hm-opt' + (o.id === id ? ' cur' : '') + '" data-th="' + o.id + '"><span class="hm-ck">' + (o.id === id ? '✓' : '') + '</span>' +
        '<i class="hm-sw" style="background:' + o.base + '"></i>' + o.t + '</button>';
    }).join('');
    sub.addEventListener('click', function(ev){
      ev.stopPropagation();
      var o = ev.target.closest('[data-th]'); if (!o) return;
      setTheme(o.dataset.th); closeMenu();
    });
    document.body.appendChild(sub);
    row.classList.add('open');
    // the first option level with the Theme row
    var r = row.getBoundingClientRect(), m = menu.getBoundingClientRect(), first = sub.querySelector('.hm-opt');
    var dy = first.getBoundingClientRect().top - sub.getBoundingClientRect().top;
    sub.style.left = (m.right + 2) + 'px';
    sub.style.top = Math.max(4, Math.min(r.top - dy, innerHeight - sub.offsetHeight - 4)) + 'px';
  }
  logo.addEventListener('click', function(e){
    e.stopPropagation(); hideTip();
    if (menu){ closeMenu(); return; }
    var th = curTheme();
    menu = document.createElement('div');
    menu.className = 'hmenu hm-main';
    menu.innerHTML = ITEMS.map(function(o){
      if (o === '-') return '<div class="hm-div"></div>';
      var ic = o.id === 'theme' ? '<span class="hm-ic"><i class="hm-sw" style="background:' + th.base + '"></i></span>'
        : '<span class="hm-ic hm-spr" style="background-position:-' + (o.ic[1] - 1) * 20 + 'px -' + (o.ic[0] - 1) * 20 + 'px"></span>';
      return '<button class="hm-opt" data-m="' + o.id + '">' + ic + '<span class="hm-t">' + o.t + '</span>' +
        (o.id === 'theme' ? '<span class="hm-val">' + th.t + '</span>' + ARR : '') + '</button>';
    }).join('');
    // the Theme list follows the pointer: it opens over its row and closes over any other
    menu.addEventListener('mouseover', function(ev){
      var row = ev.target.closest('.hm-opt'); if (!row) return;
      if (row.dataset.m === 'theme') openSub(row); else closeSub();
    });
    menu.addEventListener('click', function(ev){
      ev.stopPropagation();
      var row = ev.target.closest('.hm-opt'); if (!row) return;
      if (row.dataset.m === 'theme'){ if (sub) closeSub(); else openSub(row); return; }
      closeMenu();
      if (window.TUNER_VIEW) TUNER_VIEW.notify('Not built in the prototype', row.querySelector('.hm-t').textContent + ' opens from here in ENCY Tuner.', 'info');
    });
    document.body.appendChild(menu);
    var r = logo.getBoundingClientRect();
    menu.style.left = r.left + 'px'; menu.style.top = (r.bottom + 4) + 'px';
    logo.classList.add('open');
  });
  document.addEventListener('click', function(e){ if (menu && !menu.contains(e.target) && !(sub && sub.contains(e.target))) closeMenu(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
  bar.addEventListener('mousedown', function(e){ hideTip(); owner = keyOf(e.target.closest('[data-tip]')); });
})();
