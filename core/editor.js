// ENCY Tuner — NC code editor of one channel.
// A transparent <textarea> lies over the coloured text, so typing, paste, selection and the
// native undo work as in any editor while colours and markers are drawn underneath.
//   gutter: the operation's colour as a band along its blocks, a green flag on its first block,
//           a status per motion block — • not simulated, ✓ simulated, — idle (no stock removed),
//           the error's own icon (hint on hover)
//   text:   coloured like ENCY Tuner — rapid red, linear green, arcs blue, M / S violet, comments quiet
// Editing keeps operations attached to their blocks: an edited operation drops back to
// "not calculated". Split builds the operations from the text (a new tool or work offset starts one).
// Events on document: `tuner:ops` (the channel's operations changed), `tuner:cursor` (line / operation).
(function(){
  'use strict';

  // line height, px; the touch mode (Tuner Touch, variant 3) — the spec's 32 at font 16, in the same share
  var LH = window.TOUCH ? Math.round(32 * TOUCH.kf) : 16;
  var ERR = {
    gouge:  {t:'Gouging the part',               c:'mk-gouge'},
    holder: {t:'Toolholder collision',           c:'mk-holder'},
    plunge: {t:'Plunge angle over the tool limit', c:'mk-plunge'},
    rapid:  {t:'Stock removal at rapid feed',    c:'mk-rapid'},
    machine:{t:'Collision of machine nodes',     c:'mk-err'},
    other:  {t:'Simulation error',               c:'mk-err'}
  };
  var STATUS_T = {none:'', calculated:'Not simulated', simulated:'Simulated without errors', idle:'Idle — no stock removed'};

  function esc(s){ return s.replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  // ——— block classes: colour + whether it moves the tool (gets a status marker) ———
  // the motion mode is modal: a block without G0–G3 keeps the colour of the last one
  function classify(lines){
    var mode = '', out = [];
    lines.forEach(function(l){
      var t = l.trim();
      if (!t){ out.push({c:'', move:false}); return; }
      if (/^[(;<%]/.test(t)){ out.push({c: t[0] === '%' ? '' : 'c-com', move:false}); return; }
      var code = t.replace(/\([^)]*\)/g, '').replace(/;.*$/, '').toUpperCase().replace(/^N\d+\s*/, '');
      var gs = code.match(/G\d+(\.\d+)?/g) || [];
      gs.forEach(function(g){
        var n = parseFloat(g.slice(1));
        if (n === 0) mode = 'rapid'; else if (n === 1 || n === 33) mode = 'feed';
        else if (n === 2 || n === 3) mode = 'arc'; else if (n >= 73 && n <= 89 && n !== 80) mode = 'feed';
      });
      var axis = /(^|[^A-Z])[XYZABCUVW]\s*[-+.=\d]/.test(code);
      var tool = /(^|[^A-Z])T\d/.test(code), mach = /G53(?![.\d])/.test(code);
      var aux = /(^|[^A-Z])[MS]\s*\d/.test(code);
      var c;
      if (tool || mach) c = '';
      else if (axis) c = mode ? 'c-' + mode : '';
      else if (aux) c = 'c-aux';
      else c = mode ? 'c-' + mode : '';
      out.push({c: c, move: axis && !mach, rapid: mode === 'rapid'});
    });
    return out;
  }

  // ——— Split: a new tool or work offset starts an operation; changes with no motion between
  // them belong to one operation (Tuner: "a tool change and zero offset next to each other") ———
  function splitOps(lines){
    var ops = [], tool = null, wcs = null, cur = null, moved = true, cls = classify(lines);
    lines.forEach(function(l, i){
      var code = l.replace(/\([^)]*\)/g, '').replace(/;.*$/, '').toUpperCase();
      var t = code.match(/(?:^|[^A-Z])T(\d+)/), w = code.match(/G5[4-9](\.1P\d+)?/);
      var nt = t ? +t[1] : tool, nw = w ? w[0] : wcs;
      if ((t && nt !== tool) || (w && nw !== wcs)){
        if (cur && !moved){ cur.tool = nt; cur.wcs = nw || cur.wcs; }
        else {
          // the operation is named after a comment right above it, if there is one
          var name = null, start = i;
          for (var k = i - 1; k >= Math.max(0, i - 4); k--){
            var m = lines[k].trim().match(/^\(\s*(.+?)\s*\)$|^;\s*(.+)$/);
            if (m && !/TOOLS LIST|^T\d/.test(m[1] || m[2])){ name = m[1] || m[2]; start = k; break; }
          }
          if (cur && start <= cur.start) start = i;
          // CAM comments come in capitals (TOP PLANE → Top plane); mixed case stays as written
          if (name && name === name.toUpperCase()) name = name.charAt(0) + name.slice(1).toLowerCase();
          name = name || 'Operation ' + (ops.length + 1);
          cur = {name: name, start: start, tool: nt, wcs: nw || 'G54'};
          ops.push(cur); moved = false;
        }
      }
      tool = nt; wcs = nw;
      if (cls[i].move) moved = true;
    });
    return ops;
  }

  window.TunerNC = {classify: classify};

  window.TunerEditor = function(channel){
    var el = document.createElement('div');
    el.className = 'ed';
    el.innerHTML =
      '<div class="ed-scroll">' +
        '<div class="ed-gut"></div>' +
        '<div class="ed-code"><div class="ed-cur" hidden></div><div class="ed-sim" hidden></div><div class="ed-hl"></div>' +
          '<textarea class="ed-ta" spellcheck="false" wrap="off" autocomplete="off" ' +
            'placeholder="Paste or type the NC program"></textarea>' +
          '<span class="ed-measure"></span></div>' +
      '</div>' +
      '<div class="ed-find" hidden>' +
        '<div class="ef-row"><span class="ef-t">Find</span>' +
          '<div class="ef-seg"><button class="on" data-mode="text">Text</button><button data-mode="cmd" title="Whole words: G54 does not match G540">Command</button></div>' +
          '<button class="ef-btn" data-act="close" title="Close (Esc)">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg></button></div>' +
        '<div class="ef-row"><input class="ef-in" type="text" placeholder="G54, T2, X40…" spellcheck="false">' +
          '<span class="ef-count"></span>' +
          '<button class="ef-btn" data-act="prev" title="Previous (Shift+Enter)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10l3.5-3.5 3.5 3.5"/></svg></button>' +
          '<button class="ef-btn" data-act="next" title="Next (Enter)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6l3.5 3.5 3.5-3.5"/></svg></button></div>' +
      '</div>';

    var scroll = el.querySelector('.ed-scroll'), gut = el.querySelector('.ed-gut'),
        hl = el.querySelector('.ed-hl'), ta = el.querySelector('.ed-ta'), curBand = el.querySelector('.ed-cur'),
        measure = el.querySelector('.ed-measure'), simBand = el.querySelector('.ed-sim'), findBar = el.querySelector('.ed-find'),
        fin = el.querySelector('.ef-in'), fcount = el.querySelector('.ef-count');
    var lines = [], cls = [], last = channel.text, curLine = -1, quiet = false, find = {q:'', mode:'text', hits:[], i:-1};
    var pv = null;   // Stream editor preview: the lines a pending edit would change

    ta.value = channel.text;
    // touch: the text is read until "Edit" (spec sect. 3) — a tap puts the cursor and the machine on a block
    if (window.TOUCH) ta.readOnly = !TOUCH.editing;

    // ——— model helpers ———
    function ops(){ return channel.ops; }
    function opAt(line){ var r = null; ops().forEach(function(o){ if (o.start <= line) r = o; }); return r; }
    function opIndex(o){ return ops().indexOf(o); }
    function opEnd(o){ var n = ops()[opIndex(o) + 1]; return n ? n.start : lines.length; }
    function sortOps(){ channel.ops.sort(function(a, b){ return a.start - b.start; }); }
    function changed(){ document.dispatchEvent(new CustomEvent('tuner:ops', {detail: channel})); }

    // ——— render ———
    function render(){
      lines = ta.value.split('\n');
      cls = classify(lines);
      var hits = {};
      find.hits.forEach(function(h, k){ (hits[h.line] = hits[h.line] || []).push({s:h.s, e:h.e, cur:k === find.i}); });
      hl.innerHTML = lines.map(function(l, i){
        var txt = l;
        if (hits[i]){
          var out = '', p = 0;
          hits[i].forEach(function(h){ out += esc(txt.slice(p, h.s)) + '<mark class="fm' + (h.cur ? ' cur' : '') + '">' + esc(txt.slice(h.s, h.e)) + '</mark>'; p = h.e; });
          txt = out + esc(txt.slice(p));
        } else txt = esc(txt);
        return '<div class="ln ' + cls[i].c + (pv && pv[i] ? ' pv' : '') + '">' + (txt || ' ') + '</div>';
      }).join('');
      renderGutter();
    }

    function renderGutter(){
      var html = '', o = ops();
      o.forEach(function(op, k){
        var end = o[k + 1] ? o[k + 1].start : lines.length;
        html += '<i class="band" style="top:' + op.start * LH + 'px;height:' + (end - op.start) * LH + 'px;background:var(' + op.color + ')"></i>';
        html += '<i class="mk mk-flag" style="top:' + op.start * LH + 'px" title="' + esc(op.name) + ' — start"></i>';
        // simulated (fully, partly or with errors) — or passed by the simulation running now
        var done = op.status === 'simulated' || op.status === 'partial' || op.status === 'error';
        for (var i = op.start + 1; i < end; i++){
          if (!cls[i] || !cls[i].move) continue;
          var passed = done || (op.simTo != null && i <= op.simTo);
          var e = passed ? op.errors[i] : null, m = null, t = '';
          if (e){ m = (ERR[e] || ERR.other).c; t = (ERR[e] || ERR.other).t; }
          else if (passed){ m = cls[i].rapid ? 'mk-idle' : 'mk-ok'; t = STATUS_T[cls[i].rapid ? 'idle' : 'simulated']; }
          else if (op.status !== 'none'){ m = 'mk-dot'; t = STATUS_T.calculated; }
          if (m) html += '<i class="mk ' + m + '" style="top:' + i * LH + 'px" title="' + t + '"></i>';
        }
      });
      gut.innerHTML = html;
    }

    // ——— caret: current line band, the operation under the caret, keep the caret in view ———
    function lineOf(pos){ return ta.value.slice(0, pos).split('\n').length - 1; }
    function caret(){
      var line = lineOf(ta.selectionStart);
      curBand.style.top = line * LH + 'px';
      if (line !== curLine){
        curLine = line;
        var op = opAt(line);
        document.dispatchEvent(new CustomEvent('tuner:cursor', {detail: {channel: channel, line: line, op: op}}));
      }
      reveal(line, ta.selectionEnd);
    }
    function reveal(line, pos){
      var top = line * LH, h = scroll.clientHeight;
      if (top < scroll.scrollTop) scroll.scrollTop = top - LH;
      else if (top + LH > scroll.scrollTop + h) scroll.scrollTop = top + 2 * LH - h;
      if (pos == null) return;
      var start = ta.value.lastIndexOf('\n', pos - 1) + 1;
      measure.textContent = ta.value.slice(start, pos);
      var x = measure.offsetWidth + gut.offsetWidth, w = scroll.clientWidth;
      if (x < scroll.scrollLeft + gut.offsetWidth + 8) scroll.scrollLeft = Math.max(0, x - gut.offsetWidth - 40);
      else if (x > scroll.scrollLeft + w - 16) scroll.scrollLeft = x - w + 48;
    }

    // ——— edits keep operations on their blocks; edited operations become "not calculated" ———
    // A whole-program edit (Stream editor) comes with a map old line → new line (−1: removed), and
    // so do its undo and redo (kept in bulkLog), so every operation follows its own block.
    var pending = null, bulkLog = [];
    function viaMap(a, b, map){
      var seen = {};
      channel.ops = ops().filter(function(o){
        var end = opEndIn(a, o), touched = false, k = o.start, ns = map[k];
        while (ns < 0 && k < a.length - 1) ns = map[++k];
        for (var i = o.start; i < end && !touched; i++) if (map[i] < 0 || a[i] !== b[map[i]]) touched = true;
        if (!touched && end < a.length && map[end] - ns !== end - o.start) touched = true;   // lines added inside
        if (touched){ o.status = 'none'; o.errors = {}; }
        else { var e = {}; for (var l in o.errors) if (map[l] >= 0) e[map[l]] = o.errors[l]; o.errors = e; }
        o.start = ns == null || ns < 0 ? b.length : ns;
        if (o.start >= b.length || seen[o.start]) return false;
        return (seen[o.start] = true);
      });
    }
    ta.addEventListener('input', function(){
      var a = last.split('\n'), b = ta.value.split('\n'), p = 0, s = 0, map = null, fromBulk = !!pending;
      if (pending){ map = pending.map; pending = null; }
      else bulkLog.forEach(function(x){
        if (last === x.after && ta.value === x.before) map = x.inv;       // undo of a bulk edit
        else if (last === x.before && ta.value === x.after) map = x.map;  // its redo
      });
      if (map){
        viaMap(a, b, map);
        last = ta.value; channel.text = ta.value;
        if (find.q) runFind(false);
        render(); if (!fromBulk) caret(); changed();
        return;
      }
      // the same number of lines (a block changed in place): nothing moves, only what changed is out of date
      if (a.length === b.length){
        ops().forEach(function(o){
          var end = opEndIn(a, o);
          for (var i = o.start; i < end; i++) if (a[i] !== b[i]){ o.status = 'none'; o.errors = {}; break; }
        });
        last = ta.value; channel.text = ta.value;
        if (find.q) runFind(false);
        render(); caret(); changed();
        return;
      }
      while (p < a.length && p < b.length && a[p] === b[p]) p++;
      while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
      var oldEnd = a.length - s, delta = b.length - a.length, seen = {};
      channel.ops = ops().filter(function(o){
        // `quiet`: a whole operation was removed on purpose — its neighbours keep their status
        var touched = !quiet && o.start <= Math.max(p, oldEnd - 1) && opEndIn(a, o) > p;
        if (o.start >= oldEnd) o.start += delta;
        else if (o.start > p) o.start = p;   // its first block went: it starts where the edit is
        if (touched){ o.status = 'none'; o.errors = {}; }
        else if (delta) o.errors = shiftErrors(o.errors, oldEnd, delta);
        if (o.start >= b.length || seen[o.start]) return false;   // two on one block: the later merges in
        return (seen[o.start] = true);
      });
      quiet = false;
      last = ta.value; channel.text = ta.value;
      if (find.q) runFind(false);
      render(); caret(); changed();
    });
    function opEndIn(a, o){ var n = ops()[opIndex(o) + 1]; return n ? n.start : a.length; }
    function shiftErrors(err, from, d){
      var out = {}; for (var k in err) out[+k >= from ? +k + d : k] = err[k]; return out;
    }

    ['click', 'keyup', 'select'].forEach(function(t){ ta.addEventListener(t, caret); });
    ta.addEventListener('focus', function(){ curBand.hidden = false; el.dispatchEvent(new CustomEvent('ed:focus', {bubbles:true})); caret(); });
    ta.addEventListener('blur', function(){ curBand.hidden = true; });
    ta.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f'){ e.preventDefault(); openFind(); }
      // Tab inserts spaces, as NC editors do, instead of leaving the field
      if (e.key === 'Tab' && !e.ctrlKey){ e.preventDefault(); document.execCommand('insertText', false, '  '); }
    });

    // ——— Find: text, or whole NC words (Command); Enter / Shift+Enter walk the matches ———
    function runFind(jump){
      find.hits = []; find.i = -1;
      var q = find.q.trim();
      if (q){
        // Command = whole NC words. Words run together (G01X40.99, N5G54), so a word may follow a
        // digit; only the number must not run on: G54 ≠ G540, X40. ≠ X40.99
        var body = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var rx = find.mode === 'cmd'
          ? new RegExp((/^[\d.]/.test(q) ? '(?<![\\d.])' : '') + body + (/\.$/.test(q) ? '(?!\\d)' : /\d$/.test(q) ? '(?![\\d.])' : ''), 'gi')
          : new RegExp(body, 'gi');
        ta.value.split('\n').forEach(function(l, i){
          var m; rx.lastIndex = 0;
          while ((m = rx.exec(l))){ find.hits.push({line:i, s:m.index, e:m.index + m[0].length}); if (!m[0].length) rx.lastIndex++; }
        });
        // start from the caret
        if (find.hits.length){
          var cl = lineOf(ta.selectionStart);
          find.i = Math.max(0, find.hits.findIndex(function(h){ return h.line >= cl; }));
        }
      }
      fcount.textContent = !q ? '' : find.hits.length ? (find.i + 1) + ' / ' + find.hits.length : 'No matches';
      fcount.classList.toggle('none', !!q && !find.hits.length);
      render();
      if (jump !== false && find.i >= 0) reveal(find.hits[find.i].line);
    }
    function step(d){
      if (!find.hits.length) return;
      find.i = (find.i + d + find.hits.length) % find.hits.length;
      fcount.textContent = (find.i + 1) + ' / ' + find.hits.length;
      render(); reveal(find.hits[find.i].line);
    }
    function openFind(){
      findBar.hidden = false;
      var sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (sel && sel.indexOf('\n') < 0){ fin.value = sel; find.q = sel; }
      fin.focus(); fin.select(); runFind();
      el.dispatchEvent(new CustomEvent('ed:find', {bubbles:true, detail:true}));
    }
    function closeFind(){
      findBar.hidden = true;
      var h = find.hits[find.i];
      find.q = ''; find.hits = []; find.i = -1; render();
      ta.focus({preventScroll: true});
      if (h){ var pos = posOf(h.line) + h.s; ta.setSelectionRange(pos, pos + (h.e - h.s)); caret(); }
      el.dispatchEvent(new CustomEvent('ed:find', {bubbles:true, detail:false}));
    }
    function posOf(line){ var a = ta.value.split('\n'), p = 0; for (var i = 0; i < line; i++) p += a[i].length + 1; return p; }
    fin.addEventListener('input', function(){ find.q = fin.value; runFind(); });
    fin.addEventListener('keydown', function(e){
      if (e.key === 'Enter'){ e.preventDefault(); step(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape'){ e.preventDefault(); closeFind(); }
    });
    findBar.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mode){
        find.mode = b.dataset.mode;
        findBar.querySelectorAll('.ef-seg button').forEach(function(x){ x.classList.toggle('on', x === b); });
        runFind(); fin.focus();
      } else if (b.dataset.act === 'close') closeFind();
      else if (b.dataset.act === 'next') step(1);
      else if (b.dataset.act === 'prev') step(-1);
    });

    // ——— operation commands (context menu) ———
    function newOp(line, from){
      var prev = opAt(line), name = 'Operation ' + (ops().length + 1);
      var o = window.TUNER_OP({name: name, tool: prev ? prev.tool : null, toolName: prev ? prev.toolName : '', wcs: prev ? prev.wcs : 'G54'}, line);
      if (prev){ prev.status = 'none'; prev.errors = {}; }
      channel.ops.push(o); sortOps();
    }
    var cmd = {
      beginCurrent: function(line){ var o = opAt(line); o.start = line; o.status = 'none'; o.errors = {}; var p = ops()[opIndex(o) - 1]; if (p){ p.status = 'none'; p.errors = {}; } },
      beginNext: function(line){ var c = opAt(line), n = ops()[c ? opIndex(c) + 1 : 0]; n.start = line; n.status = 'none'; n.errors = {}; if (c){ c.status = 'none'; c.errors = {}; } },
      newOp: function(line){ newOp(line); },
      mergePrev: function(line){ var o = opAt(line), p = ops()[opIndex(o) - 1]; p.status = 'none'; p.errors = {}; channel.ops.splice(opIndex(o), 1); },
      mergeNext: function(line){ var o = opAt(line), n = ops()[opIndex(o) + 1]; o.status = 'none'; o.errors = {}; channel.ops.splice(opIndex(n), 1); },
      deleteOp: function(line){
        // removes the operation with its blocks (Tuner: "also removes the control program of that operation")
        var o = opAt(line), a = posOf(o.start), b = opEnd(o) >= lines.length ? ta.value.length : posOf(opEnd(o));
        channel.ops.splice(opIndex(o), 1);
        quiet = true;
        ta.focus({preventScroll: true}); ta.setSelectionRange(a, b); document.execCommand('delete');
        return true;
      }
    };
    function run(name){
      var line = lineOf(ta.selectionStart);
      if (!cmd[name](line)){ render(); changed(); }
      ta.focus({preventScroll: true}); caret();
    }

    // ——— context menu: clipboard · Set begin of · Add new operation · Merge with · Delete ———
    var menu = null, menuAt = 0, keep = null;
    function closeMenu(){ if (menu){ menu.remove(); menu = null; } }
    // the view stays where it was through a right click: Chrome scrolls a focused textarea's caret
    // into view on its own, and that scroll would close the menu at once
    function hold(){ if (keep){ scroll.scrollTop = keep.t; scroll.scrollLeft = keep.l; } }
    // a right click acts on the block under the pointer: outside the selection it moves the caret
    // there first (Chrome leaves the caret where it was)
    ta.addEventListener('mousedown', function(e){
      if (e.button !== 2) return;
      e.preventDefault();
      keep = {t: scroll.scrollTop, l: scroll.scrollLeft};
      var line = Math.max(0, Math.min(lines.length - 1, Math.floor((e.clientY - hl.getBoundingClientRect().top) / LH)));
      var a = lineOf(ta.selectionStart), b = lineOf(ta.selectionEnd);
      ta.focus({preventScroll: true});
      if (ta.selectionStart === ta.selectionEnd || line < a || line > b){
        var p = posOf(line); ta.setSelectionRange(p, p); caret();
      }
      hold(); requestAnimationFrame(hold);
    });
    ta.addEventListener('contextmenu', function(e){
      e.preventDefault(); closeMenu();
      menuAt = Date.now(); hold(); requestAnimationFrame(function(){ hold(); keep = null; });
      var line = lineOf(ta.selectionStart), o = opAt(line), i = o ? opIndex(o) : -1,
          next = ops()[i + 1], sel = ta.selectionEnd > ta.selectionStart, isStart = o && o.start === line;
      // [label, action, enabled, kind]: kind 'sub' — an item under a section head, 'danger' — destructive
      // touch (spec sect. 3): a long press on a block — "Simulate up to this block"; while editing — the
      // clipboard; the operation boundaries stay in the desktop Tuner
      var items = window.TOUCH ? (ta.readOnly ? [['Simulate up to this block', 'simTo', !!(o && o.status !== 'none')]]
        : [['Cut', 'cut', sel], ['Copy', 'copy', sel], ['Paste', 'paste', true], ['Select all', 'all', true]]) : [
        ['Cut', 'cut', sel], ['Copy', 'copy', sel], ['Paste', 'paste', true], ['Delete', 'del', sel], ['Select all', 'all', true],
        '-', 'Set begin of',
        ['current operation', 'beginCurrent', o && !isStart, 'sub'],
        ['next operation', 'beginNext', !!next && !isStart, 'sub'],
        ['next NC-related operation', 'beginNext', !!next && !isStart, 'sub'],
        ['new operation', 'newOp', !isStart && lines[line] !== undefined, 'sub'],
        '-', 'Add new operation',
        ['G-code based', 'newOp', !isStart, 'sub'],
        '-', 'Merge with',
        ['previous operation', 'mergePrev', i > 0, 'sub'],
        ['next operation', 'mergeNext', !!next && !!o, 'sub'],
        '-',
        ['Delete current operation', 'deleteOp', !!o, 'danger']
      ];
      menu = document.createElement('div');
      menu.className = 'cmenu';
      menu.innerHTML = items.map(function(it){
        if (it === '-') return '<div class="cm-div"></div>';
        if (typeof it === 'string') return '<div class="cm-head">' + it + '</div>';
        return '<button class="cm-opt' + (it[3] ? ' ' + it[3] : '') + '" data-a="' + it[1] + '"' + (it[2] ? '' : ' disabled') + '>' + it[0] + '</button>';
      }).join('');
      document.body.appendChild(menu);
      var x = Math.min(e.clientX, innerWidth - menu.offsetWidth - 4),
          y = e.clientY + menu.offsetHeight > innerHeight - 4 ? Math.max(4, e.clientY - menu.offsetHeight) : e.clientY;
      menu.style.left = x + 'px'; menu.style.top = y + 'px';
      menu.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
      menu.addEventListener('click', function(ev){
        var b = ev.target.closest('.cm-opt'); if (!b || b.disabled) return;
        var a = b.dataset.a; closeMenu();
        if (a === 'simTo'){ if (window.TUNER_SIM) TUNER_SIM.toLine(channel.index, lineOf(ta.selectionStart)); return; }
        ta.focus({preventScroll: true});
        if (a === 'cut' || a === 'copy') document.execCommand(a);
        else if (a === 'del') document.execCommand('delete');
        else if (a === 'all') ta.select();
        else if (a === 'paste'){
          if (navigator.clipboard && navigator.clipboard.readText)
            navigator.clipboard.readText().then(function(t){ ta.focus({preventScroll: true}); document.execCommand('insertText', false, t); }).catch(function(){});
        }
        else run(a);
      });
    });
    document.addEventListener('mousedown', function(e){ if (menu && !menu.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
    // the user scrolling closes the menu; the browser's own scroll right after opening does not
    scroll.addEventListener('scroll', function(){ if (Date.now() - menuAt > 300) closeMenu(); });

    render();

    return {
      el: el,
      channel: channel,
      focus: function(){ ta.focus({preventScroll: true}); },
      // the tree picked an operation: its first block goes near the top and stays marked;
      // `focus` puts the caret there for typing (double click in the tree)
      goto: function(line, focus){
        var p = posOf(line);
        ta.setSelectionRange(p, p);
        curLine = line;
        curBand.style.top = line * LH + 'px'; curBand.hidden = false;
        scroll.scrollTop = Math.max(0, (line - 2) * LH); scroll.scrollLeft = 0;
        if (focus) ta.focus({preventScroll: true});
      },
      undo: function(){ ta.focus({preventScroll: true}); document.execCommand('undo'); },
      redo: function(){ ta.focus({preventScroll: true}); document.execCommand('redo'); },
      find: function(){ if (findBar.hidden) openFind(); else closeFind(); },
      findOpen: function(){ return !findBar.hidden; },
      // Split: operations from the text; existing ones are replaced (the caller asks first)
      split: function(){
        var found = splitOps(ta.value.split('\n'));
        channel.ops = found.map(function(f){ return window.TUNER_OP({name:f.name, tool:f.tool, wcs:f.wcs}, f.start); });
        render(); changed();
        return channel.ops.length;
      },
      count: function(){ return splitOps(ta.value.split('\n')).length; },
      // ——— for the Stream editor ———
      text: function(){ return ta.value; },
      // the selected blocks (first, last line), or null when nothing is selected
      selection: function(){
        if (ta.selectionStart === ta.selectionEnd) return null;
        var e = ta.selectionEnd - (ta.value.charAt(ta.selectionEnd - 1) === '\n' ? 1 : 0);
        return {a: lineOf(ta.selectionStart), b: lineOf(e)};
      },
      // mark the lines an edit would change ({line: true}), or clear the marks; the first goes into view
      preview: function(set){
        pv = set; render();
        var first = set ? Object.keys(set).map(Number).sort(function(x, y){ return x - y; })[0] : null;
        if (first != null && (first * LH < scroll.scrollTop || first * LH > scroll.scrollTop + scroll.clientHeight - 2 * LH))
          scroll.scrollTop = Math.max(0, (first - 3) * LH);
      },
      // replace the whole program in one undoable step; `map` takes each old line to its new one
      bulk: function(text, map){
        if (text === ta.value) return;
        var inv = text.split('\n').map(function(){ return -1; });
        map.forEach(function(j, i){ if (j >= 0) inv[j] = i; });
        bulkLog.push({before: ta.value, after: text, map: map, inv: inv});
        if (bulkLog.length > 20) bulkLog.shift();
        var keepTop = scroll.scrollTop, keepLine = Math.min(lineOf(ta.selectionStart), text.split('\n').length - 1);
        pending = {map: map};
        ta.focus({preventScroll: true}); ta.select();
        document.execCommand('insertText', false, text);
        var p = posOf(keepLine); ta.setSelectionRange(p, p);
        scroll.scrollTop = keepTop; curLine = -1; caret();
      },
      // the block the simulation is on: marked, and kept in view (centred when it runs off)
      simLine: function(line){
        simBand.hidden = line == null;
        if (line == null) return;
        simBand.style.top = line * LH + 'px';
        // touch: the text follows only while "Follow" is on
        if (window.TOUCH && TOUCH.follow === false) return;
        var top = line * LH, h = scroll.clientHeight;
        if (top < scroll.scrollTop + LH || top + 2 * LH > scroll.scrollTop + h) scroll.scrollTop = Math.max(0, top - h / 2);
      },
      refresh: function(){ render(); }
    };
  };
})();
