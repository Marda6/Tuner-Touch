// ENCY Tuner Touch — block 2: the program panel, concept B «Лента программы».
//   head:  Channel 1 | 2 | 3 (one shown — its operations and its program, spec sect. 3) · the program's
//          file · ⋯ its menu: Open program… · Split… · Save program as… (all that replaces sits
//          behind a tap and a question — rule 6.10)
//   text:  one scroll, an accordion: every operation is a section header in the text; a tap on the
//          whole header folds or unfolds that operation alone (▾ / ▸, rule 6.6). Folded all — the
//          text is the list of operations; unfold the one you need. The header on top stays pinned.
//          Marks column (Tuner's): operation start, simulated, idle, the error by type. Colours:
//          after calculation by what a block does, before it — Tuner's syntax colours.
//   foot:  page up / down · fold all / unfold all · Find · Edit
//   Follow is on by default: a scroll by hand lets go, a "Follow" chip brings the machine back.
//   taps:  a block — the cursor and the machine go there (back: only the cursor; forward past the
//          simulated: Tuner simulates up to it, stops on a new error). The machine going into a
//          folded operation unfolds it.
//   long press (0.5 s): an operation — Simulate this / up to this; a block — Simulate up to this line
(function(){
  'use strict';
  var host = document.getElementById('ttLeft');
  if (!host) return;
  var t = TT.t, ui = TT.ui, esc = ui.esc;

  // Tuner's marks: cells of the status sprite (as packages/tuner/editor.css)
  var MK = {flag:[1, 8], ok:[3, 1], idle:[3, 2], gouge:[1, 11], holder:[1, 12], plunge:[1, 13], rapid:[1, 14], machine:[1, 7]};
  function mark(k){ var c = MK[k] || MK.machine; return ui.spr('status', c[0], c[1]); }
  var ST = {done:'st-done', err:'st-error', partial:'st-partial', none:'st-none'};

  // ——— block classes (the rules of packages/tuner/editor.js): motion is modal — a block without
  // G0–G3 keeps the last one; a block moves the tool when it has an axis word ———
  function classify(lines){
    var mode = '';
    return lines.map(function(l){
      var s = l.trim();
      if (!s || s === '%') return {k:'plain', move:false};
      if (/^[(;]/.test(s)) return {k:'com', move:false};
      var code = s.replace(/\([^)]*\)/g, '').replace(/;.*$/, '').toUpperCase().replace(/^N\d+\s*/, '');
      (code.match(/G\d+(\.\d+)?/g) || []).forEach(function(g){
        var n = parseFloat(g.slice(1));
        if (n === 0) mode = 'rapid'; else if (n === 1 || n === 33) mode = 'feed';
        else if (n === 2 || n === 3) mode = 'arc'; else if (n >= 73 && n <= 89 && n !== 80) mode = 'feed';
      });
      var axis = /(^|[^A-Z])[XYZABCUVW]\s*[-+.=\d]/.test(code), tool = /(^|[^A-Z])T\d/.test(code);
      var aux = /(^|[^A-Z])([MS]\d|S\d=|SPOS|SB=)/.test(code) || /SPOS/.test(code);
      var k = tool ? 'plain' : axis && !/SPOS/.test(code) ? (mode || 'plain') : aux ? 'aux' : (mode || 'plain');
      return {k:k, move:axis && !/SPOS/.test(code), rapid:mode === 'rapid'};
    });
  }
  // before calculation: block numbers, words and numbers, comments — each its own colour
  function syntax(l){
    var s = l.trim();
    if (/^[(;]/.test(s)) return '<span class="y-com">' + esc(l) + '</span>';
    return esc(l).replace(/(\([^)]*\))/g, '<span class="y-com">$1</span>')
      .replace(/^(N\d+)/, '<span class="pg-n">$1</span>')
      .replace(/(-?\d+(?:\.\d+)?)(?![^<]*>)/g, '<span class="y-num">$1</span>');
  }
  // after calculation: the block number quiet, the rest in the colour of what the block does
  function coloured(l, k){
    var m = l.match(/^(N\d+)(.*)$/);
    return m ? '<span class="pg-n">' + m[1] + '</span><span class="k-' + k + '">' + esc(m[2]) + '</span>' : '<span class="k-' + k + '">' + esc(l) + '</span>';
  }

  // ——— sections: -1 is the program's start (blocks before the first operation), then the operations ———
  function chan(p){ return p.channels[p.ch]; }
  function shut(c){ return c.view.shut || (c.view.shut = {}); }
  function secOf(c, line){ var o = TT.opAt(c, line); return o ? c.ops.indexOf(o) : -1; }
  function hasStart(c){ return c.ops.length && c.ops[0].start > 0; }
  function sections(c){ var s = c.ops.map(function(o, k){ return k; }); return hasStart(c) ? [-1].concat(s) : s; }
  function openFor(c, line){ delete shut(c)[secOf(c, line)]; }   // the machine goes there — its operation unfolds
  function selOp(c){ if (c.sel == null) c.sel = Math.max(0, secOf(c, c.cur)); return c.sel; }

  function opHead(p, c, k){
    var folded = !!shut(c)[k], o = k >= 0 ? c.ops[k] : null;
    var name = o ? o.name : t('pg_start'), tool = o ? o.tool : '', col = o ? 'var(' + o.c + ')' : 'var(--ec-fg-24)';
    var st = o ? '<img class="pg-op-s" src="assets/tree/' + ST[TT.opStatus(p, c, o)] + '.svg" alt="">' : '';
    return '<div class="pg-op' + (k === selOp(c) && o ? ' sel' : '') + (folded ? ' shut' : '') + '" data-op="' + k + '" role="button" aria-expanded="' + !folded + '" style="--c:' + col + '">' +
      '<span class="pg-op-c"></span><span class="pg-op-t"><b>' + esc(name) + '</b>' + (tool ? '<span>' + esc(tool) + '</span>' : '') + '</span>' +
      st + '<span class="pg-op-x">' + ui.ic('chev') + '</span></div>';
  }
  function errCard(c, i, type){
    var o = TT.opAt(c, i);
    return '<div class="pg-err"><b>' + esc(t('e_' + type)) + '</b>' + (o ? ' · ' + esc(o.name) + ' · ' + esc(o.tool) : '') +
      '<div>' + esc(t('e_' + type + '_d')) + '</div></div>';
  }
  // flat — the variant from Tuner's components: Tuner's editor, one text, an operation's start by its
  // flag mark and a hairline above it (no headers, no folding)
  function textHTML(p, c, flat){
    var calc = TT.calculated(p), cls = classify(c.lines), f = calc ? TT.found(c) : {}, starts = {}, sh = shut(c);
    c.ops.forEach(function(o, k){ starts[o.start] = k; });
    var h = '', open = false;
    function begin(k){ if (open) h += '</div></div>'; h += '<div class="pg-sec' + (sh[k] ? ' shut' : '') + '" data-sec="' + k + '">' + opHead(p, c, k) + '<div class="pg-lines">'; open = true; }
    c.lines.forEach(function(l, i){
      if (!flat){ if (i in starts) begin(starts[i]); else if (i === 0) begin(-1); }
      var m = '';
      if (i in starts) m = mark('flag');
      if (f[i]) m = mark(f[i]);
      else if (calc && i <= c.simTo && cls[i].move) m = mark(cls[i].rapid ? 'idle' : 'ok');
      h += '<div class="pg-ln' + (i === c.cur ? ' cur' : '') + (flat && (i in starts) && i > 0 ? ' op0' : '') + '" data-i="' + i + '"><span class="pg-mk">' + m + '</span>' +
        '<span class="pg-tx">' + (calc ? coloured(l, cls[i].k) : syntax(l)) + '</span></div>';
      if (i === c.cur && f[i]) h += errCard(c, i, f[i]);
    });
    return h + (open ? '</div></div>' : '');
  }

  // ——— the panel of the variant from Tuner's components (spec sect. 4, the draft's left panel):
  //   Channel 1 | 2 · Split — Operations, Tuner's setup tree as a list (status · name · tool; a tap
  //   selects it and brings its start up; the status of an operation with errors — Tuner's operation
  //   status panel) — the program's file ▾ · Open program · Follow — the text with Tuner's marks —
  //   Page up · Page down · Find · Edit, with captions ———
  function olRow(p, c, o, k){
    var st = TT.opStatus(p, c, o);
    return '<div class="pg-olr' + (k === selOp(c) ? ' sel' : '') + '" data-olr="' + k + '" role="button" style="--c:var(' + o.c + ')">' +
      '<span class="pg-olr-c"></span><img class="pg-olr-s' + (st === 'err' ? ' err' : '') + '" data-ols="' + k + '" src="assets/tree/' + ST[st] + '.svg" alt="">' +
      '<b>' + esc(o.name) + '</b><span>' + esc(o.tool) + '</span></div>';
  }
  function panelTuner(p, c, vo){
    var chs = p.channels.length > 1 ? '<div class="pg-seg" role="tablist"><span class="pg-lbl">' + esc(t('chl')) + '</span>' + p.channels.map(function(x, i){
      return '<div class="pg-seg-b' + (i === p.ch ? ' cur' : '') + '" role="tab" data-ch="' + i + '"><span>' + (i + 1) + '</span></div>';
    }).join('') + '</div>' : '<span class="pg-one">' + esc(t('ch', {n:1})) + '</span>';
    return '<div class="pg pg-t">' +
      '<div class="pg-tools">' + chs + '<span class="tk-sp"></span>' + ui.btn({act:'split', label:t('split_b'), icon:ui.ic('split'), dis:vo}) + '</div>' +
      '<div class="pg-olh"><span class="cur">' + esc(t('ops_t')) + '</span><span class="dis">' + esc(t('axes_t')) + '</span></div>' +
      '<div class="pg-ol">' + c.ops.map(function(o, k){ return olRow(p, c, o, k); }).join('') + '</div>' +
      '<div class="pg-tools pg-file"><button class="pg-dd" data-act="prog" aria-haspopup="menu" aria-label="' + esc(t('program')) + '"><span>' + esc(c.file) + '</span>' + ui.ic('chev') + '</button>' +
        '<span class="tk-sp"></span>' + ui.btn({act:'openprog', icon:ui.spr('menu', 1, 4), cls:'sq', aria:t('open_prog'), dis:vo}) +
        ui.btn({act:'follow', label:t('follow'), icon:ui.ic('follow'), cls:c.view.follow ? 'on' : ''}) + '</div>' +
      '<div class="pg-body"><div class="pg-text">' + textHTML(p, c, true) + '</div><div class="pg-track"><div class="pg-thumb"></div></div></div>' +
      '<div class="pg-tools pg-foot">' + ui.btn({act:'pgup', label:t('pgUp'), icon:ui.ic('pgUp'), cls:'ghost'}) + ui.btn({act:'pgdn', label:t('pgDn'), icon:ui.ic('pgDn'), cls:'ghost'}) +
        '<span class="tk-sp"></span>' + ui.btn({act:'find', label:t('find'), icon:ui.spr('status', 3, 7), cls:'ghost'}) +
        ui.btn({act:'edit', label:t('edit'), icon:ui.spr('add', 2, 15), cls:'ghost', dis:vo}) + '</div></div>';
  }
  // Tuner's operation status panel: the errors of one operation, a tap — the machine to that block
  function opStatusPanel(anchor, p, c, k){
    var o = c.ops[k], f = TT.found(c);
    var list = Object.keys(f).map(Number).filter(function(i){ return i >= o.start && i <= o.end; }).sort(function(a, b){ return a - b; });
    if (!list.length) return false;
    ui.pop(anchor, '<div class="tk-mh">' + esc(o.name + ' · ' + o.tool) + '</div>' + list.map(function(i){
      return '<div class="tk-mi" data-ei="' + i + '" role="button">' + mark(f[i]) + '<span><b>' + esc(t('e_' + f[i])) + '</b><small>' + esc(c.lines[i].trim()) + '</small></span></div>';
    }).join(''), function(e){ var r = e.target.closest('[data-ei]'); if (!r) return; ui.closeMenu(); go(p, +r.getAttribute('data-ei')); }, 'pg-opst');
    return true;
  }
  function pickOp(p, c, k){
    c.sel = k; c.view.follow = false; render();
    var ln = text && text.querySelector('[data-i="' + c.ops[k].start + '"]'); if (ln) text.scrollTop = Math.max(0, topOf(ln) - 4);
  }

  // ——— render: the whole panel only when its frame changes; a moving machine (cursor, simulated
  // blocks, found errors) only patches the text — a running simulation never rebuilds it, so a
  // finger scrolling the text is never interrupted ———
  var shape = '', text = null, shown = null, lastCur = {}, dyn = null;
  function errKey(c){ return Object.keys(TT.found(c)).join(','); }
  function render(){
    var p = TT.active();
    if (!p){ host.innerHTML = ''; shape = ''; text = null; shown = null; dyn = null; return; }
    var c = chan(p), vo = TT.viewOnly(), key = p.id + ':' + p.ch;
    // Follow: the machine moved into a folded operation — it unfolds
    if (c.view.follow && lastCur[key] != null && lastCur[key] !== c.cur) openFor(c, c.cur);
    var tuner = TT.isTuner();
    var sh = [TT.lang(), TT.variant(), p.id, p.ch, TT.calculated(p), vo, c.view.follow, tuner ? selOp(c) : Object.keys(shut(c)).sort().join(','), p.channels.length].join('|');
    if (sh === shape){ patch(p, c, key); return; }
    shape = sh;
    if (text && shown) shown.view.scroll = text.scrollTop;
    var anyOpen = sections(c).some(function(k){ return !shut(c)[k]; });
    // the panel: its tools over the text (fold / unfold all · page up · page down … Find · Edit), then
    // the text. The channel switch and the program's file ▾ sit on the project's row above (top.js):
    // channel → its program is the next link of the chain project → machine → channel
    host.innerHTML = tuner ? panelTuner(p, c, vo) : '<div class="pg">' +
      '<div class="pg-tools">' + ui.btn({act:'all', icon:ui.ic(anyOpen ? 'shutAll' : 'openAll'), cls:'sq', aria:t(anyOpen ? 'all_shut' : 'all_open')}) +
        ui.btn({act:'pgup', icon:ui.ic('pgUp'), cls:'sq', aria:t('pgUp')}) + ui.btn({act:'pgdn', icon:ui.ic('pgDn'), cls:'sq', aria:t('pgDn')}) +
        '<span class="tk-sp"></span>' + ui.btn({act:'find', label:t('find'), icon:ui.spr('status', 3, 7)}) +
        ui.btn({act:'edit', label:t('edit'), icon:ui.spr('add', 2, 15), dis:vo}) + '</div>' +
      '<div class="pg-body"><div class="pg-text">' + textHTML(p, c) + '</div>' +
        '<div class="pg-track"><div class="pg-thumb"></div></div>' +
        (c.view.follow ? '' : ui.btn({act:'follow', label:t('follow'), icon:ui.ic('follow'), cls:'pg-follow'})) + '</div></div>';
    text = host.querySelector('.pg-text'); shown = c;
    var ol = host.querySelector('.pg-ol');   // the operations list (Tuner's variant): a finger scrolls it; the selected one in view
    if (ol){ ui.dragScroll(ol, 'y'); var so = ol.querySelector('.pg-olr.sel'); if (so && (so.offsetTop < ol.scrollTop || so.offsetTop + so.offsetHeight > ol.scrollTop + ol.clientHeight)) ol.scrollTop = so.offsetTop - ol.clientHeight / 2 + so.offsetHeight / 2; }
    ui.dragScroll(text, 'y', letGo);
    text.addEventListener('scroll', function(){ if (shown) shown.view.scroll = text.scrollTop; thumb(); stuck(); moving(); });
    // where to stand: the kept scroll of this channel; with Follow on, a moved machine comes into view
    if (c.view.scroll != null) text.scrollTop = c.view.scroll; else reveal(c.cur);
    if (c.view.follow && lastCur[key] != null && lastCur[key] !== c.cur) reveal(c.cur);
    lastCur[key] = c.cur;
    dyn = {key:key, cur:c.cur, simTo:c.simTo, sel:selOp(c), errs:errKey(c)};
    sizeList(); thumb(); stuck();
  }
  // the machine moved: the current block, the marks of the newly simulated blocks, the error card, the
  // operations' statuses — in place
  function patch(p, c, key){
    if (!text || !dyn || dyn.key !== key) return;
    var ek = errKey(c);
    if (dyn.cur === c.cur && dyn.simTo === c.simTo && dyn.sel === selOp(c) && dyn.errs === ek) return;
    var calc = TT.calculated(p), cls = classify(c.lines), f = calc ? TT.found(c) : {}, starts = {};
    c.ops.forEach(function(o){ starts[o.start] = 1; });
    function markOf(i){
      if (f[i]) return mark(f[i]);
      if (calc && i <= c.simTo && cls[i].move) return mark(cls[i].rapid ? 'idle' : 'ok');
      return i in starts ? mark('flag') : '';
    }
    // marks: the blocks between the old and the new simulated end; all of them when the errors changed
    var a = dyn.errs === ek ? Math.min(dyn.simTo, c.simTo) + 1 : 0, b = dyn.errs === ek ? Math.max(dyn.simTo, c.simTo) : c.lines.length - 1;
    for (var i = Math.max(0, a); i <= b; i++){ var mk = text.querySelector('[data-i="' + i + '"] .pg-mk'); if (mk) mk.innerHTML = markOf(i); }
    // the current block and its error card
    var old = text.querySelector('.pg-ln.cur'); if (old) old.classList.remove('cur');
    var ln = text.querySelector('[data-i="' + c.cur + '"]'); if (ln) ln.classList.add('cur');
    var card = text.querySelector('.pg-err'); if (card) card.remove();
    if (ln && f[c.cur]) ln.insertAdjacentHTML('afterend', errCard(c, c.cur, f[c.cur]));
    // the operations list (the variant from Tuner's components): status and the selected one
    host.querySelectorAll('.pg-olr').forEach(function(r){
      var k = +r.getAttribute('data-olr'), st = TT.opStatus(p, c, c.ops[k]), img = r.querySelector('.pg-olr-s');
      img.src = 'assets/tree/' + ST[st] + '.svg'; img.classList.toggle('err', st === 'err'); r.classList.toggle('sel', k === selOp(c));
    });
    // operations: status and the selected one
    text.querySelectorAll('.pg-op').forEach(function(h){
      var k = +h.getAttribute('data-op'); if (k < 0) return;
      var img = h.querySelector('.pg-op-s'); if (img) img.src = 'assets/tree/' + ST[TT.opStatus(p, c, c.ops[k])] + '.svg';
      h.classList.toggle('sel', k === selOp(c));
    });
    if (c.view.follow && dyn.cur !== c.cur) reveal(c.cur);
    lastCur[key] = c.cur;
    dyn = {key:key, cur:c.cur, simTo:c.simTo, sel:selOp(c), errs:ek};
    thumb(); stuck();
  }
  // the header of the section on top is pinned (it gets a shadow)
  function stuck(){
    if (!text) return; var y = text.scrollTop;
    text.querySelectorAll('.pg-sec').forEach(function(sec){
      var h = sec.querySelector(':scope > .pg-op'); if (!h) return;
      h.classList.toggle('stuck', !sec.classList.contains('shut') && sec.offsetTop <= y + 0.5 && y < sec.offsetTop + sec.offsetHeight - h.offsetHeight);
    });
  }

  // ——— scrolling ———
  function letGo(){ var p = TT.active(); if (p && chan(p).view.follow){ chan(p).view.follow = false; render(); } }
  function topOf(el){ var k = TT.scale || 1; return (el.getBoundingClientRect().top - text.getBoundingClientRect().top) / k + text.scrollTop; }
  // a block into view — only if it is not in view already (below the pinned header, above the
  // bottom): then at about a third of the height. A tap on a visible block never scrolls.
  function reveal(i){
    if (!text) return; var ln = text.querySelector('[data-i="' + i + '"]'); if (!ln || !ln.offsetParent) return;
    var y = topOf(ln) - text.scrollTop, rowH = ln.offsetHeight, pin = TT.isTuner() ? 0 : 48 * (parseFloat(getComputedStyle(host).getPropertyValue('--kf')) || 1);
    if (y >= pin && y + rowH * 2 <= text.clientHeight - rowH) return;
    text.scrollTop = Math.max(0, topOf(ln) - text.clientHeight * 0.32);
  }
  function showOp(k){ if (!text) return; var s = text.querySelector('[data-sec="' + k + '"]'); if (s) text.scrollTop = s.offsetTop; }
  // the position indicator follows the text; its thumb drags it (in a 44 px zone)
  function thumb(){
    var tr = host.querySelector('.pg-track'), th = host.querySelector('.pg-thumb'); if (!tr || !text) return;
    var H = text.clientHeight, S = text.scrollHeight, T = tr.clientHeight;
    tr.style.display = S <= H + 1 ? 'none' : '';
    var h = Math.max(44, T * H / S); th.style.height = h + 'px';
    th.style.top = ((T - h) * text.scrollTop / Math.max(1, S - H)) + 'px';
  }
  // while the text moves the thin indicator shows up a little, then calms down
  var calm = 0;
  function moving(){
    var tr = host.querySelector('.pg-track'); if (!tr) return;
    tr.classList.add('moving'); clearTimeout(calm); calm = setTimeout(function(){ tr.classList.remove('moving'); }, 700);
  }
  host.addEventListener('pointerdown', function(e){
    var th = e.target.closest('.pg-thumb'); if (!th) return;
    e.preventDefault(); e.stopPropagation(); letGo();
    var k = TT.scale || 1, y0 = e.clientY, s0 = text.scrollTop, tr = host.querySelector('.pg-track');
    var range = (text.scrollHeight - text.clientHeight) / Math.max(1, tr.clientHeight - th.offsetHeight);
    th.classList.add('drag');
    var moved = false;
    function mv(ev){ if (Math.abs(ev.clientY - y0) > 4) moved = true; text.scrollTop = s0 + (ev.clientY - y0) / k * range; }
    // a tap on the thumb without a drag goes to what lies under it (a header's ▾, a block)
    function up(ev){
      th.classList.remove('drag'); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      if (moved) return;
      th.style.pointerEvents = 'none'; var under = document.elementFromPoint(ev.clientX, ev.clientY); th.style.pointerEvents = '';
      if (under && host.contains(under)) under.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));   // SVG has no .click()
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });

  // ——— the machine to a block ———
  function go(p, i){
    var c = chan(p), r = TT.goLine(p, p.ch, i);
    if (r === -1){ c.cur = i; TT.emit('projects'); return; }           // not calculated: just the cursor
    c.sel = Math.max(0, secOf(c, r)); openFor(c, r);
    if (r !== i) ui.toast(t('t_stopErr', {line:c.lines[r].trim()}), 'var(--th-red)');
    TT.emit('projects'); reveal(r);
  }
  function simulate(p, i){ if (!TT.calculated(p)){ ui.toast(t('t_notCalc'), 'var(--ec-amber)'); return; } go(p, i); }

  // ——— taps ———
  host.addEventListener('click', function(e){
    var p = TT.active(); if (!p) return;
    var c = chan(p), b;
    if ((b = e.target.closest('[data-ch]'))){ p.ch = +b.getAttribute('data-ch'); TT.emit('projects'); return; }
    if ((b = e.target.closest('[data-act]'))){
      var a = b.getAttribute('data-act');
      if (a === 'prog') progMenu(b, p, c);
      else if (a === 'follow' && TT.isTuner() && c.view.follow){ c.view.follow = false; render(); }   // Tuner's toggle: on / off
      else if (a === 'follow'){ c.view.follow = true; openFor(c, c.cur); render(); reveal(c.cur); }
      else if (a === 'split') askSplit(p);
      else if (a === 'openprog') ui.toast(t('t_soon', {what:t('w_openProg'), n:7}), 'var(--ec-fg-48)');
      else if (a === 'find') ui.toast(t('t_soon', {what:t('w_find'), n:6}), 'var(--ec-fg-48)');
      else if (a === 'edit') ui.toast(t('t_soon', {what:t('w_edit'), n:6}), 'var(--ec-fg-48)');
      else if (a === 'pgup' || a === 'pgdn'){ letGo(); text.scrollBy({top:(a === 'pgup' ? -1 : 1) * (text.clientHeight - 96), behavior:'smooth'}); }
      else if (a === 'all') foldAll(c);
      return;
    }
    if ((b = e.target.closest('[data-ols]')) && opStatusPanel(b, p, c, +b.getAttribute('data-ols'))) return;
    if ((b = e.target.closest('[data-olr]'))){ pickOp(p, c, +b.getAttribute('data-olr')); return; }
    if ((b = e.target.closest('[data-op]'))){ fold(c, +b.getAttribute('data-op'), b.classList.contains('stuck')); return; }
    if ((b = e.target.closest('.pg-ln'))) go(p, +b.getAttribute('data-i'));
  });
  // one operation: a tap on its whole header folds or unfolds it. Unfolded — it is selected and its
  // start comes up; folded while pinned on top — its header stays where the text was
  function fold(c, k, pinned){
    var sh = shut(c), opening = !!sh[k];
    if (opening){ delete sh[k]; if (k >= 0) c.sel = k; } else sh[k] = true;
    letGo(); render();
    if (opening || pinned) showOp(k);
  }
  // all: any unfolded — fold all (the text becomes the list of operations, from the top);
  // all folded — unfold all, the machine's block in view
  function foldAll(c){
    var sh = shut(c), secs = sections(c), anyOpen = secs.some(function(k){ return !sh[k]; });
    if (anyOpen) secs.forEach(function(k){ sh[k] = true; }); else c.view.shut = {};
    letGo(); render();
    if (anyOpen) text.scrollTop = 0; else reveal(c.cur);
  }

  // ——— long press ———
  ui.longPress(host, '.pg-op, .pg-olr, .pg-ln', function(el, pt){
    var p = TT.active(); if (!p) return;
    var c = chan(p);
    if (el.classList.contains('pg-op') || el.classList.contains('pg-olr')){
      var k = +(el.getAttribute('data-op') || el.getAttribute('data-olr')); if (k < 0) return;
      var o = c.ops[k];
      ui.menu(pt, [{key:'this', label:t('op_sim')}, {key:'upto', label:t('op_upto')}], o.name + ' · ' + o.tool).then(function(r){
        if (r === 'this') simulate(p, o.end); else if (r === 'upto') simulate(p, o.start);
      });
    } else {
      var i = +el.getAttribute('data-i');
      ui.menu(pt, [{key:'upto', label:t('ln_upto')}], c.lines[i].trim()).then(function(r){ if (r === 'upto') simulate(p, i); });
    }
  });

  // ——— the program menu: all that replaces, behind a tap and a question ———
  function progMenu(b, p, c){
    var vo = TT.viewOnly();
    ui.menu(b, [
      {key:'open', icon:ui.spr('menu', 1, 4), label:t('m_open'), desc:t('m_open_d'), dis:vo},
      {key:'split', icon:ui.ic('split'), label:t('m_split'), desc:t('m_split_d'), dis:vo},
      '-',
      {key:'progAs', icon:ui.spr('add', 2, 1), label:t('m_progAs'), desc:t('m_progAs_d', {prog:c.file}), dis:vo}
    ]).then(function(k){
      if (k === 'open') ui.toast(t('t_soon', {what:t('w_openProg'), n:7}), 'var(--ec-fg-48)');
      else if (k === 'progAs') ui.toast(t('t_soon', {what:t('w_progAs'), n:7}), 'var(--ec-fg-48)');
      else if (k === 'split') askSplit(p);
    });
  }
  function askSplit(p){
    ui.ask({title:t('q_split'), text:t('q_split_d'), buttons:[
        {key:'split', label:t('b_split'), cls:'danger', left:true}, {key:'cancel', label:t('b_cancel')}]}).then(function(r){
      if (r === 'split'){ TT.split(p.id); ui.toast(t('t_split'), 'var(--ec-amber)'); }
    });
  }

  // the errors badge of the console: to the first error found — in the shown channel, or else in the
  // first channel that has one (unfolded)
  TT.on('firstError', function(){
    var p = TT.active(); if (!p) return;
    var best = null, own = Object.keys(TT.found(chan(p))).map(Number).sort(function(a, b){ return a - b; });
    if (own.length) best = {ci:p.ch, i:own[0]};
    else p.channels.forEach(function(c, ci){ Object.keys(TT.found(c)).forEach(function(i){ i = +i; if (!best || ci < best.ci || (ci === best.ci && i < best.i)) best = {ci:ci, i:i}; }); });
    if (!best) return;
    p.ch = best.ci; var c = chan(p); c.cur = best.i; c.sel = Math.max(0, secOf(c, best.i)); openFor(c, best.i);
    TT.emit('projects'); reveal(best.i);
  });

  TT.on('projects', render);
  TT.on('active', render);
  // the program's file ▾ on the project's row opens the program's menu
  TT.on('progMenu', function(b){ var p = TT.active(); if (p) progMenu(b, p, chan(p)); });
  // the console or the timeline moved the machine on purpose: its block into view, unfolded
  TT.on('reveal', function(line){
    var p = TT.active(); if (!p) return;
    var c = chan(p); if (shut(c)[secOf(c, line)]){ openFor(c, line); render(); }
    reveal(line);
  });
  TT.on('lang', function(){ shape = ''; render(); });
  TT.on('variant', function(){ shape = ''; render(); });
  TT.on('viewonly', function(){ shape = ''; render(); });
  // the operations list (Tuner's variant) gives way to the text: 6 rows, down to 4 when the text would show
  // fewer than 8 blocks (spec sect. 4: "not fewer than 4 rows in the operations list, the rest — the NC text")
  function sizeList(){
    var ol = host.querySelector('.pg-ol'), pg = host.querySelector('.pg'), body = host.querySelector('.pg-body'); if (!ol || !pg || !body) return;
    var r0 = ol.querySelector('.pg-olr'); if (!r0) return;
    var row = r0.offsetHeight, code = (host.querySelector('.pg-ln') || {}).offsetHeight || 32;
    ol.style.maxHeight = '';
    var fixed = pg.clientHeight - body.offsetHeight - ol.offsetHeight;
    var room = pg.clientHeight - fixed - 8 * code;
    ol.style.maxHeight = Math.max(4 * row, Math.min(6 * row, room)) + 'px';
    thumb();
  }
  TT.on('resize', function(){ sizeList(); thumb(); });
})();
