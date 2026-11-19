// ENCY Tuner — window layout B: column widths, the tree / inspector split and the inspector tabs.
// Widths and the split are kept across sessions (localStorage tuner.*).
(function(){
  'use strict';

  var ws = document.getElementById('ws'),
      dock = document.getElementById('dock'),
      codecol = document.getElementById('codecol'),
      tree = document.getElementById('panelTree'),
      insp = document.getElementById('panelInsp');
  if (!ws) return;

  function load(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function save(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  // ——— column widths ———
  // the dock as in ENCY (300–600), the code column wide enough for a long block;
  // the 3D view always keeps at least 240px. Gaps: 8 | dock | 8 | code | 8 | view.
  // `want` is the user's choice (kept); a narrow window lays out less — the code column gives
  // way first, then the dock — and the chosen widths come back once there is room again
  // Channels side by side (a multichannel project, ⫴ in the code column) is a wider column with
  // a width of its own: two editors of ~350 each; one channel goes back to the single width
  var DOCK  = {min:300, max:600,  v:'--dock-w', key:'tuner.dockW',  want:300},
      CODE  = {min:320, max:720,  v:'--code-w', key:'tuner.codeW',  want:420},
      CODE2 = {min:560, max:1040, v:'--code-w', key:'tuner.codeW2', want:720},
      VIEW_MIN = 240, GAPS = 24;
  function split(){ var p = window.TUNER_PROJECT && TUNER_PROJECT.get(); return !!(p && p.view.split); }
  function code(){ return split() ? CODE2 : CODE; }
  function cur(c){ return parseFloat(getComputedStyle(ws).getPropertyValue(c.v)); }
  function put(c, w){ ws.style.setProperty(c.v, Math.round(w) + 'px'); }
  function clamp(c, w){ return Math.max(c.min, Math.min(c.max, w)); }
  // a folded column takes the strip's 32px; its panel keeps its width for the peek (--*-fw)
  var STRIP = 32, shut = {dock: load('tuner.dockShut') === '1', code: load('tuner.codeShut') === '1'};
  function fit(){
    var C = code(), d = clamp(DOCK, DOCK.want), c = clamp(C, C.want),
        dw = shut.dock ? STRIP : d, cw = shut.code ? STRIP : c,
        over = dw + cw + GAPS + VIEW_MIN - ws.clientWidth;
    if (!shut.code && over > 0){ var c2 = Math.max(C.min, c - over); over -= c - c2; c = cw = c2; }
    if (!shut.dock && over > 0) d = dw = Math.max(DOCK.min, d - over);
    put(DOCK, dw); put(C, cw);
    // a peeked panel stays inside the window: 8 | strip | 8 | panel | 8
    ws.style.setProperty('--dock-fw', Math.round(Math.min(d, ws.clientWidth - (shut.code ? 96 : 56))) + 'px');
    ws.style.setProperty('--code-fw', Math.round(Math.min(c, ws.clientWidth - dw - 64)) + 'px');
  }
  [DOCK, CODE, CODE2].forEach(function(c){ var w = +load(c.key); if (w) c.want = w; });
  fit();
  window.addEventListener('resize', fit);
  // the side-by-side mode is per project: switching it or the project re-lays the columns
  document.addEventListener('tuner:view', fit);
  document.addEventListener('tuner:project', fit);

  // `c` / `other` are functions: the code column's limits depend on its mode at drag time
  function grip(el, getC, getOther){
    el.addEventListener('mousedown', function(e){
      e.preventDefault();
      var c = getC(), other = getOther(), x0 = e.clientX, w0 = cur(c), w = w0;
      el.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      // a drag sets the choice within what fits next to the other column right now
      function move(ev){
        w = Math.round(Math.max(c.min, Math.min(c.max, ws.clientWidth - GAPS - VIEW_MIN - cur(other), w0 + ev.clientX - x0)));
        c.want = w; put(c, w);
      }
      function up(){
        el.classList.remove('dragging');
        document.body.style.cursor = document.body.style.userSelect = '';
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        save(c.key, w);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }
  grip(document.getElementById('dockGrip'), function(){ return DOCK; }, code);
  grip(document.getElementById('codeGrip'), code, function(){ return DOCK; });

  // ——— tree / inspector split: either panel keeps at least 140px; kept as the tree's share ———
  var MIN_PANEL = 140, rez = document.getElementById('dockResizer');
  function setShare(s){ tree.style.flex = '0 0 ' + (s * 100) + '%'; insp.style.flex = '1 1 0'; }
  var share = +load('tuner.treeShare'); if (share) setShare(share);
  rez.addEventListener('mousedown', function(e){
    e.preventDefault();
    rez.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    function move(ev){
      var r = dock.querySelector('.colbody').getBoundingClientRect(), h = rez.offsetHeight, avail = r.height - h;
      var t = Math.max(MIN_PANEL, Math.min(avail - MIN_PANEL, ev.clientY - r.top - h / 2));
      share = t / r.height;
      setShare(share);
    }
    function up(){
      rez.classList.remove('dragging');
      document.body.style.cursor = document.body.style.userSelect = '';
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (share) save('tuner.treeShare', share);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // ——— inspector: a combobox picks the mode (Parameters | Stream editor); each mode brings its
  // own buttons to the right of it (inspector.js / streamedit.js fill them) ———
  var streamBtn = document.getElementById('streamBtn'), sw = document.getElementById('inspSwitch');
  var MODES = [{id:'params', t:'Parameters'}, {id:'stream', t:'Stream editor'}], mode = 'params';
  function showInsp(id){
    mode = id;
    sw.querySelector('span').textContent = MODES.filter(function(m){ return m.id === id; })[0].t;
    insp.querySelectorAll('.ibody').forEach(function(b){ b.hidden = b.dataset.body !== id; });
    insp.querySelectorAll('[data-acts]').forEach(function(g){ g.hidden = g.dataset.acts !== id; });
    // fx in the code column reads "on" while the Stream editor is open
    streamBtn.classList.toggle('on', id === 'stream');
    save('tuner.inspTab', id);
  }
  sw.addEventListener('click', function(){
    if (sw.classList.contains('dd-open')){ TUNER_INSP.closeMenu(); return; }
    TUNER_INSP.menu(sw, MODES.map(function(m){ return {t: m.t, cur: m.id === mode}; }), function(i){ showInsp(MODES[i].id); });
  });
  // fx opens the Stream editor in the inspector; pressed again, it goes back to Parameters
  streamBtn.addEventListener('click', function(){
    showInsp(streamBtn.classList.contains('on') ? 'params' : 'stream');
  });
  showInsp(load('tuner.inspTab') === 'stream' ? 'stream' : 'params');

  // ——— folding the columns, so the simulation gets the window ———
  // A column folds into its strip (the collapse button left of its name) and the 3D view takes the
  // room. The name on the strip shows the panel over the view for a moment — pick another operation,
  // read the code at a collision — and a click on the view, Esc or the name again puts it away; the
  // button on the strip docks it back. Simulation view (the sim panel, Ctrl+\) folds both columns
  // and, pressed again, brings back what was open. Fires `tuner:layout` ({dock, code, peek}).
  var COLS = {dock: dock, code: codecol}, peek = null, before = null, labels = document.getElementById('codeLabels');
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  // the names are built once per project and then only re-marked: a click that starts on a name
  // must end on the same element (a mousedown elsewhere re-marks them while the click is under way)
  var labelsKey = '';
  function paintLabels(){
    var p = window.TUNER_PROJECT && TUNER_PROJECT.get();
    if (!p){ labels.innerHTML = labelsKey = ''; return; }
    var multi = p.channels.length > 1,
        key = p.id + '|' + (multi ? p.channels.map(function(c){ return c.name; }).join('|') : p.file);
    // one name per channel on a multichannel machine (it opens that channel), else the file
    if (key !== labelsKey){
      labelsKey = key;
      labels.innerHTML = multi
        ? p.channels.map(function(c, i){
            return '<button class="vlabel" data-peek="code" data-ch="' + i + '" title="' + esc(c.name) + ' — show the code over the 3D view">' + esc(c.name) + '</button>';
          }).join('')
        : '<button class="vlabel" data-peek="code" title="' + esc(p.file) + ' — show the code over the 3D view">' + esc(p.file) + '</button>';
    }
    labels.querySelectorAll('.vlabel').forEach(function(b){
      var on = b.dataset.ch == null || +b.dataset.ch === p.view.channel;
      b.classList.toggle('cur', multi && on);
      b.classList.toggle('open', peek === 'code' && (on || p.view.split));
    });
    dock.querySelector('[data-peek="dock"]').classList.toggle('open', peek === 'dock');
  }
  function apply(){
    ws.classList.toggle('dock-shut', shut.dock); ws.classList.toggle('code-shut', shut.code);
    for (var k in COLS){
      COLS[k].classList.toggle('shut', shut[k]);
      COLS[k].classList.toggle('peek', peek === k);
      COLS[k].querySelectorAll('.pcol').forEach(function(b){
        b.title = shut[b.dataset.col] ? 'Dock the panel back' : 'Collapse the panel — the 3D view takes its place';
      });
    }
    paintLabels(); fit();
    // the simulation panel, the cube and the bottom bar follow the free view
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new CustomEvent('tuner:layout', {detail: {dock: shut.dock, code: shut.code, peek: peek}}));
  }
  function setShut(k, v){
    shut[k] = v; if (peek === k) peek = null; before = null;
    save(k === 'dock' ? 'tuner.dockShut' : 'tuner.codeShut', v ? '1' : '');
  }
  function focusView(){
    if (shut.dock && shut.code){ var b = before || {dock: false, code: false}; setShut('dock', b.dock); setShut('code', b.code); }
    else { var was = {dock: shut.dock, code: shut.code}; setShut('dock', true); setShut('code', true); before = was; }
    peek = null; apply();
  }
  ws.addEventListener('click', function(e){
    var b = e.target.closest('.pcol');
    if (b){ setShut(b.dataset.col, !shut[b.dataset.col]); apply(); return; }
    var l = e.target.closest('[data-peek]'); if (!l) return;
    var k = l.dataset.peek, p = TUNER_PROJECT.get(), ch = l.dataset.ch;
    // a channel's name: that channel; the open one again (or the open panel's name) puts it away
    if (ch != null && p && +ch !== p.view.channel){ window.TUNER_CODE.show(+ch); peek = k; }
    else peek = peek === k ? null : k;
    apply();
  });
  // a click anywhere outside the peeked panel (the view, the header) puts it away; its own menus,
  // tooltips and pop-ups live on <body> and do not count
  document.addEventListener('mousedown', function(e){
    if (!peek || COLS[peek].contains(e.target)) return;
    if (e.target.closest('.dd-menu, .cmenu, .hmenu, .vmenu, .pop, .toast, .itip, .vtip, .htip')) return;
    peek = null; apply();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === '\\' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); focusView(); return; }
    if (e.key === 'Escape' && peek && !document.querySelector('.dd-menu, .cmenu, .hmenu, .vmenu, .pop')){ peek = null; apply(); }
  });
  document.addEventListener('tuner:project', paintLabels);
  document.addEventListener('tuner:view', paintLabels);
  window.TUNER_LAYOUT = {
    focus: focusView,
    state: function(){ return {dock: shut.dock, code: shut.code, peek: peek}; }
  };
  apply();
})();
