// ENCY Tuner — the Parameters inspector: the tabs of the level selected in the tree and their rows.
// Rows follow ENCY's Inspector Row; the parameters follow the Tuner manual ("Parameters" of the
// Project Setup panel). Where the manual lists them they are its own (Setup, Machine setup,
// Strategy, Check for gouges, the error-related tool limits); the rest is a plausible filler like
// ENCY_UI's until the real lists come. Feeds and speeds are read from the operation's own blocks.
// A change re-states what it outdates: an operation's own parameter → "not calculated";
// a machine / setup parameter → simulated operations go back to "calculated".
(function(){
  'use strict';

  var body = document.querySelector('[data-body="params"]');
  if (!body) return;
  var rail = body.querySelector('[data-rail]'), titleEl = body.querySelector('[data-title]'),
      nodeEl = document.getElementById('inspNode'), rows = document.getElementById('irows'),
      wrap = document.getElementById('iwrap');
  var A = 'assets/insp/';
  var I_DOTS = '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/></svg>';

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  // ——— tabs per level (manual: Setup on every level, Machine setup at the machine, Strategy /
  // Parameters / Tool / Feeds-Speeds at an operation, Part · Workpiece · Fixtures · Model) ———
  var ICON = {'Setup':'i-p-setup', 'Machine setup':'i-p-mach', 'Strategy':'i-p-strat', 'Parameters':'i-p-par',
    'Tool':'i-p-tool', 'Feeds/Speeds':'i-p-speed', 'Part':'i-p-part', 'Workpiece':'i-p-wp', 'Fixtures':'i-p-fix', 'Model':null};
  var SETS = {
    machine: ['Setup', 'Machine setup', 'Part', 'Workpiece', 'Fixtures', 'Model'],
    channel: ['Setup', 'Machine setup', 'Part', 'Workpiece', 'Fixtures', 'Model'],
    group:   ['Setup', 'Part', 'Workpiece', 'Fixtures', 'Model'],
    op:      ['Setup', 'Strategy', 'Parameters', 'Tool', 'Feeds/Speeds', 'Part', 'Workpiece', 'Fixtures']
  };
  var MAIN = {machine:'Machine setup', channel:'Machine setup', group:'Setup', op:'Parameters'};
  var OP_TABS = {'Strategy':1, 'Parameters':1, 'Tool':1, 'Feeds/Speeds':1};
  var INTERPRETERS = ['Fanuc30i_Mill', 'Fanuc_Mill_Custom', 'HaasVF2_Mill', 'Heidenhain_iTNC530_Mill', 'Mill',
    'Sinumerik840D_Mill', 'Sinumerik840D_TurnMill', 'Tormach_PCNC_Mach3', 'TurnMill'];

  var cur = {kind:'machine', op:null, tab:'Machine setup'}, closed = {}, selKey = null;

  // ——— an operation's own parameters, made from its blocks the first time they are needed ———
  // the operation's blocks, and everything before them: G94 / G95, G96 / G97, S and F are modal,
  // so a value set by an earlier operation still holds
  function opBlocks(p, op){
    var r = {own: '', before: ''};
    p.channels.forEach(function(c){
      var i = c.ops.indexOf(op); if (i < 0) return;
      var t = c.text.split('\n').map(function(l){ return l.replace(/\([^)]*\)/g, '').replace(/;.*$/, '').toUpperCase(); }),
          end = c.ops[i + 1] ? c.ops[i + 1].start : t.length;
      r.own = t.slice(op.start, end).join('\n'); r.before = t.slice(0, op.start).join('\n');
    });
    return r;
  }
  function word(code, rx){ var m = code.match(rx); return m ? m[1] : null; }
  // the last of a modal pair in force at the end of the operation
  function modal(all, a, b){ var ia = all.lastIndexOf(a), ib = all.lastIndexOf(b); return ia > ib; }
  function last(code, rx){ var m, v = null; rx.lastIndex = 0; while ((m = rx.exec(code))) v = m[1]; return v; }
  function derive(p, op){
    var B = opBlocks(p, op), code = B.own, all = B.before + '\n' + B.own, name = op.toolName || '';
    // ISO turning inserts (CNMG 12 04 08): no diameter; the last pair is the nose radius in tenths
    var iso = name.match(/^[A-Z]{4}\s*\d\d\s*\d\d\s*(\d\d)/i);
    var d = iso ? '—' : (word(name, /([\d.]+)\s*MM/i) || (op.tool ? '10' : '—'));
    var drill = /drill/i.test(name), lathe = !!iso || /G18|G9[56]|LIMS|G50/.test(all);
    var css = modal(all, 'G96', 'G97'), rev = modal(all, 'G95', 'G94');
    var S = /(?:^|[^A-Z])S\s*(\d+(?:\.\d+)?)/gm, F = /(?:^|[^A-Z])F\s*(\d*\.?\d+)/gm;
    var s = word(code, /(?:^|[^A-Z])S\s*(\d+(?:\.\d+)?)/m) || last(B.before, S),
        f = word(code, /(?:^|[^A-Z])F\s*(\d*\.?\d+)/m) || last(B.before, F),
        lim = last(all, /LIMS\s*=\s*(\d+)/g) || (css ? last(all, /G50\s*S\s*(\d+)/g) : null);
    return {
      strategy: {adv:false, step:'0.1', comp:'Tool radius', delta:'0', custom: d === '—' ? (iso ? String(+iso[1] / 10) : '0') : String(+d / 2)},
      params:   {gouges:true, tol:'0.01', allow:'0'},
      tool:     {num: op.tool != null ? 'T#' + op.tool : '—', dia: d === '—' ? '—' : d + ' mm',
                 r: iso ? +iso[1] / 10 + ' mm' : drill ? '—' : '0 mm', rLabel: iso ? 'Nose radius' : 'Corner radius',
                 len: lathe ? '—' : (drill ? '120' : '150'), plunge: drill ? '90' : (lathe ? '—' : '15'),
                 h: word(code, /G43\s*H\s*(\d+)/) || word(code, /(?:^|[^A-Z])H(\d+)/m) || '—',
                 dcomp: word(code, /(?:^|[^A-Z])D(\d+)/m) || '—',
                 dir: /M0?4(?!\d)/.test(code) ? 'CCW (M4)' : 'CW (M3)'},
      feeds:    {spindle: s ? (css ? s + ' m/min' : s + ' rpm') : '—', css: css, lim: lim ? lim + ' rpm' : null,
                 feed: f ? f + (rev ? ' mm/rev' : ' mm/min') : '—', cool: /M0?8(?!\d)/.test(code) ? 'On (M8)' : 'Off'}
    };
  }
  function opParams(p, op){
    if (!op.params){ op.params = derive(p, op); op.defaults = JSON.parse(JSON.stringify(op.params)); }
    else {
      // what is read from the blocks follows the code as it is edited
      var d = derive(p, op);
      op.params.feeds = d.feeds; op.params.tool.h = d.tool.h; op.params.tool.dia = d.tool.dia; op.params.tool.r = d.tool.r; op.params.tool.rLabel = d.tool.rLabel; op.params.tool.dcomp = d.tool.dcomp; op.params.tool.num = d.tool.num;
    }
    return op.params;
  }
  function machineDefaults(p){ return p.defaults || (p.defaults = JSON.parse(JSON.stringify(p.params))); }

  // ——— the rows of each tab ———
  // c: dd (list) · num (number + unit) · tgl (switch) · ro (read-only) · pick (opens a window) ·
  // file (a file, browse…); g: a group head; i: indent; when / off: shown / greyed out by other values
  function tabRows(tab, p, op){
    var P = p.params, O = op ? opParams(p, op) : null, has = function(k){ return P.setup[k] != null; };
    switch (tab){
      case 'Setup': return [
        {g:'Setup and tooling', id:'sat'},
        {k:'setup.wpSetup', l:'Workpiece setup', c:'pick', i:1, gr:'sat', d:'Where the part sits: its geometry CS relative to the machine CS. Opens the Workpiece setup window.'},
        {k:'setup.wpCS', l:'Workpiece CS', c:'pick', i:1, gr:'sat', d:'The work offset (G54…G59) the program runs in, and where it is on the machine.'},
        {g:'Rotary axis', id:'rot', v:'Click to pick', when: has('C') || has('B')},
        {k:'setup.C', l:'C (Axis C Position)', c:'num', u:'°', i:1, gr:'rot', when: has('C')},
        {k:'setup.B', l:'B (Axis B Position)', c:'num', u:'°', i:1, gr:'rot', when: has('B')},
        {g:'Linear axis', id:'lin'},
        {k:'setup.X', l:'X (Axis X Position)', c:'num', u:'mm', i:1, gr:'lin'},
        {k:'setup.Y', l:'Y (Axis Y Position)', c:'num', u:'mm', i:1, gr:'lin', when: has('Y')},
        {k:'setup.Z', l:'Z (Axis Z Position)', c:'num', u:'mm', i:1, gr:'lin'},
        {k:'setup.axesMap', l:'Axes map', c:'tgl', d:'Shows the positions of the machine axes along the program.'}
      ];
      case 'Machine setup': return [
        {g:'Description', id:'desc'},
        {k:'$machine', l:'Machine', c:'file', i:1, gr:'desc', d:'The machine the program runs on: its kinematics, axes and limits.'},
        {k:'$interpreter', l:'Interpreter file', c:'dd', o:INTERPRETERS, i:1, gr:'desc', d:'Translates the NC program into operations and CLDATA. Pick the one for your control; Split uses it.'},
        {k:'machine.post', l:'Postprocessor file', c:'file', i:1, gr:'desc', d:'Turns the edited operations back into NC code — for this control or another one.'},
        {g:'Kinematics', id:'kin'},
        {k:'machine.kin', l:'Scheme', c:'ro', i:1, gr:'kin'},
        {k:'machine.limits', l:'Check axis limits', c:'tgl', i:1, gr:'kin', d:'Axis travel over the limits is an error during simulation.'}
      ];
      case 'Strategy': return [
        {k:'strategy.adv', l:'Use advanced toolpath transformation', c:'tgl', d:'Converts the NC toolpath from machine to geometric, so it can be divided again with the step below. Off: the toolpath repeats the NC program as closely as possible.'},
        {k:'strategy.step', l:'Step of physic movement dividing', c:'num', u:'mm', i:1, off: !O.strategy.adv, d:'Machine movements are rasterized with this step: the smaller, the closer to the original toolpath. Only with the advanced transformation.'},
        {k:'strategy.comp', l:'Radius compensation mode', c:'dd', o:['Off', 'Tool radius', 'Tool radius delta', 'Custom value'], d:'Off ignores G40 / G41 / G42; Tool radius uses the tool (nose) radius; Delta adds an offset to it; Custom sets any value.'},
        {k:'strategy.delta', l:'Tool radius delta', c:'num', u:'mm', i:1, when: O.strategy.comp === 'Tool radius delta', d:'Added to the tool radius: the total offset is the radius plus this value.'},
        {k:'strategy.custom', l:'Compensation value', c:'num', u:'mm', i:1, when: O.strategy.comp === 'Custom value', d:'Any value; by default the tool radius — 50 % of the diameter.'}
      ];
      case 'Parameters': return [
        {k:'params.gouges', l:'Check for gouges', c:'tgl', d:'Tool–part intersections are marked as errors on the blocks where they happen.'},
        {k:'params.allow', l:'Gouge allowance', c:'num', u:'mm', i:1, off: !O.params.gouges, d:'Stock that may stay on the part without counting as a gouge.'},
        {k:'params.tol', l:'Toolpath tolerance', c:'num', u:'mm', d:'How closely the calculated toolpath follows the NC blocks.'}
      ];
      case 'Tool': return [
        {k:'tool.num', l:'Tool number', c:'ro'},
        {k:'$tool', l:'Tool', c:'dd', o: toolNames(p), d:'The tool of the operation; Tools (Utilities) holds the project list and libraries.'},
        {g:'Geometry', id:'tg'},
        {k:'tool.dia', l:'Diameter', c:'ro', i:1, gr:'tg', when: O.tool.dia !== '—'},
        {k:'tool.r', l: O.tool.rLabel || 'Corner radius', c:'ro', i:1, gr:'tg', when: O.tool.r !== '—'},
        {k:'tool.len', l:'Overhang', c:'num', u:'mm', i:1, gr:'tg', when: O.tool.len !== '—', d:'Tool length out of the holder; the holder is checked for collisions above it.'},
        {k:'tool.plunge', l:'Max plunge angle', c:'num', u:'°', i:1, gr:'tg', when: O.tool.plunge !== '—', d:'Plunges steeper than this are marked as errors.'},
        {g:'From the program', id:'tp'},
        {k:'tool.h', l:'Length offset (H)', c:'ro', i:1, gr:'tp'},
        {k:'tool.dcomp', l:'Radius offset (D)', c:'ro', i:1, gr:'tp'},
        {k:'tool.dir', l:'Rotation', c:'dd', o:['CW (M3)', 'CCW (M4)'], i:1, gr:'tp', d:'The spindle and the tool must turn the same way: a mismatch is an error.'}
      ];
      case 'Feeds/Speeds': return [
        {k:'feeds.spindle', l: O.feeds.css ? 'Cutting speed (G96)' : 'Spindle speed', c:'ro'},
        {k:'feeds.lim', l:'Max spindle speed', c:'ro', i:1, when: !!O.feeds.lim},
        {k:'feeds.feed', l:'Cutting feed', c:'ro'},
        {k:'feeds.cool', l:'Coolant', c:'ro'},
        {note:'Read from the operation’s blocks. Change them in the code or with the Stream editor.'}
      ];
      case 'Part': return [
        {k:'part.model', l:'Part', c:'file', d:'Geometry that defines where to check for gouges. A 3D model can be imported directly (Add surfaces).'},
        {k:'part.faces', l:'Faces', c:'ro', i:1},
        {k:'part.check', l:'Check gouges against it', c:'tgl', i:1}
      ];
      case 'Workpiece': return [
        {k:'workpiece.type', l:'Workpiece', c:'dd', o:['Not set', 'Box', 'Cylinder', 'From model', 'Result of the previous operation'],
          d:'The material to be machined — the initial shape the part is cut from.'},
        {k:'workpiece.size', l:'Size', c:'ro', i:1},
        {k:'workpiece.offset', l:'Offset', c:'num', u:'mm', i:1}
      ];
      case 'Fixtures': return [
        {k:'fixture.name', l:'Fixture', c:'dd', o:['None', 'Vise 160', '3-jaw chuck', 'Clamping plate'], d:'Fixtures with their kinematics; the simulation checks collisions with them.'},
        {k:'fixture.attach', l:'Attached to', c:'ro', i:1},
        {k:'fixture.pos', l:'Position', c:'pick', i:1, d:'Place the fixture on the machine; Smart snap helps to dock it to the machine nodes.'}
      ];
      case 'Model':
        var m = P.model.map(function(x, i){ return {k:'model.' + i + '.n', l: x.f, c:'ro'}; });
        return m.concat(m.length ? [] : [{note:'No geometry yet. Import a 3D model of the part, workpiece or fixture.'}],
          [{k:'$import', l:'Import model', c:'file'}]);
    }
    return [];
  }
  function toolNames(p){
    var n = [];
    p.channels.forEach(function(c){ c.ops.forEach(function(o){ if (o.toolName && n.indexOf(o.toolName) < 0) n.push(o.toolName); }); });
    return n.length ? n : ['—'];
  }

  // ——— values: machine-level keys live in project.params, an operation's in op.params;
  // $-keys are fields of the project / operation themselves ———
  function scopeOf(r){ return OP_TABS[cur.tab] ? 'op' : 'machine'; }
  function get(r){
    var p = TUNER_PROJECT.get(), op = cur.op;
    if (r.k === '$machine') return p.machine || 'Not set';
    if (r.k === '$interpreter') return p.interpreter || 'Not set';
    if (r.k === '$tool') return op.toolName || '—';
    if (r.k === '$import') return '…';
    var o = scopeOf(r) === 'op' ? opParams(p, op) : p.params;
    return r.k.split('.').reduce(function(a, k){ return a == null ? a : a[k]; }, o);
  }
  function deflt(r){
    var p = TUNER_PROJECT.get();
    if (r.k.charAt(0) === '$') return undefined;
    var o = scopeOf(r) === 'op' ? cur.op.defaults : machineDefaults(p);
    return r.k.split('.').reduce(function(a, k){ return a == null ? a : a[k]; }, o);
  }
  function set(r, v){
    var p = TUNER_PROJECT.get(), op = cur.op;
    machineDefaults(p);
    if (r.k === '$interpreter') p.interpreter = v;
    else if (r.k === '$tool') op.toolName = v;
    else {
      var o = scopeOf(r) === 'op' ? opParams(p, op) : p.params, ks = r.k.split('.');
      ks.slice(0, -1).forEach(function(k){ o = o[k]; });
      o[ks[ks.length - 1]] = v;
    }
    outdate(r);
    render();
  }
  // what a change outdates (see the header)
  function outdate(r){
    var p = TUNER_PROJECT.get();
    if (r.k === '$interpreter') p.channels.forEach(function(c){ c.ops.forEach(function(o){ o.status = 'none'; o.errors = {}; }); });
    else if (scopeOf(r) === 'op' || r.k === '$tool'){ cur.op.status = 'none'; cur.op.errors = {}; }
    else p.channels.forEach(function(c){ c.ops.forEach(function(o){ if (o.status === 'simulated' || o.status === 'error'){ o.status = 'calculated'; o.errors = {}; } }); });
    p.channels.forEach(function(c){ document.dispatchEvent(new CustomEvent('tuner:ops', {detail: c})); });
  }

  // ——— render ———
  function renderRail(){
    var set = SETS[cur.kind] || SETS.machine;
    rail.innerHTML = set.map(function(t){
      return '<button class="rbtn' + (t === cur.tab ? ' active' : '') + '" data-t="' + t + '" title="' + t + '">' +
        (ICON[t] ? '<span class="ei ei20 s-insp ' + ICON[t] + '"></span>' : '<span class="opic"></span>') + '</button>';
    }).join('');
  }
  function ctl(r, v){
    if (r.c === 'dd') return '<span class="dropdown" data-dd><span class="v">' + esc(v) + '</span><img src="assets/dd-chev.svg" alt=""></span>';
    if (r.c === 'num') return '<span class="input" data-num><span class="v">' + esc(v) + '</span>' + (r.u ? '<span class="u">' + r.u + '</span>' : '') + '</span>';
    if (r.c === 'tgl') return '<img class="tgl" data-tgl src="' + A + (v ? 'toggle-on' : 'toggle-off') + '.svg" alt="">';
    if (r.c === 'pick') return '<span class="roval" title="Opens a window — not built in the prototype">' + esc(v) + '</span>';
    if (r.c === 'file') return '<span class="roval">' + esc(v) + '</span><button class="rowbtn" title="Browse — not built in the prototype">' + I_DOTS + '</button>';
    return '<span class="roval">' + esc(v) + '</span>';
  }
  function render(){
    var p = TUNER_PROJECT.get();
    if (!p){ rows.innerHTML = ''; return; }
    if (cur.op && !p.channels.some(function(c){ return c.ops.indexOf(cur.op) >= 0; })){ cur = {kind:'machine', op:null, tab:'Machine setup'}; }
    renderRail();
    if (query.trim()) railHits();
    titleEl.textContent = cur.tab;
    nodeEl.textContent = cur.op ? cur.op.name : cur.kind === 'machine' || cur.kind === 'channel' ? (p.machine || 'Machine') : 'Setup';
    var list = tabRows(cur.tab, p, cur.op), html = '', q = query.trim().toLowerCase(), hits = 0;
    // searching: only the parameters whose name matches, under their group heads (unfolded)
    var match = function(r){ return !q || (r.l && r.l.toLowerCase().indexOf(q) >= 0); };
    var groupHit = {};
    if (q) list.forEach(function(r){ if (r.gr && r.when !== false && match(r)) groupHit[r.gr] = true; });
    list.forEach(function(r, n){
      if (r.when === false) return;
      if (r.note){ if (!q) html += '<div class="inote">' + esc(r.note) + '</div>'; return; }
      var key = cur.tab + ':' + (r.k || r.id);
      if (q){ if (r.g ? !groupHit[r.id] : !match(r)) return; if (!r.g) hits++; }
      else if (r.gr && closed[cur.tab + ':' + r.gr]) return;
      if (r.g){
        var shut = !q && closed[key];
        html += '<div class="irow head' + (shut ? ' shut' : '') + (selKey === key ? ' sel' : '') + '" data-n="' + n + '" data-fold="' + key + '">' +
          '<div class="ilbl"><span class="hint"></span><div class="itl"><img class="shev" src="' + A + 'chevron.svg" alt="">' +
          '<span class="rlabel"><span>' + r.g + '</span></span></div></div>' +
          (r.v ? '<div class="ictl"><span class="roval" title="Pick on the machine — not built in the prototype">' + r.v + '</span></div>' : '') + '</div>';
        return;
      }
      var v = get(r), changed = deflt(r) !== undefined && String(deflt(r)) !== String(v);
      html += '<div class="irow' + (r.off ? ' off' : '') + (selKey === key ? ' sel' : '') + '" data-n="' + n + '" data-key="' + key + '">' +
        '<div class="ilbl"><img class="hint" src="' + A + 'hint.svg" alt=""' + (r.d ? ' data-tip="' + esc(r.l) + '" data-tip-d="' + esc(r.d) + '"' : '') + '>' +
          '<div class="itl" style="padding-left:' + (r.i || 0) * 8 + 'px"><span class="shev"></span>' +
          '<span class="rlabel"><span>' + mark(r.l, q) + '</span></span></div></div>' +
        '<div class="ictl' + (r.c === 'tgl' ? ' between' : '') + '">' + ctl(r, v) +
          (r.c === 'ro' || r.c === 'pick' || r.c === 'file' ? '' : '<img class="imore" data-more' + (changed ? ' data-changed' : '') + ' src="' + A + 'more.svg" alt="" title="More">') +
        '</div></div>';
    });
    if (q && !hits) html += '<div class="inote">No “' + esc(query.trim()) + '” on this tab' + (railHits() ? ' — the marked tabs have it' : '') + '</div>';
    rows.innerHTML = html;
    rows._list = list;
    sCount.textContent = q ? (hits ? hits + (hits > 1 ? ' found' : ' found') : 'None here') : '';
    resetBtn.disabled = !changedRows().length;
  }
  function mark(label, q){
    var i = q ? label.toLowerCase().indexOf(q) : -1;
    return i < 0 ? esc(label) : esc(label.slice(0, i)) + '<mark class="fm">' + esc(label.slice(i, i + q.length)) + '</mark>' + esc(label.slice(i + q.length));
  }
  // the other tabs of the level that have a match: a dot on their rail button
  function railHits(){
    var p = TUNER_PROJECT.get(), q = query.trim().toLowerCase(), n = 0;
    rail.querySelectorAll('.rbtn').forEach(function(b){
      var t = b.dataset.t, hit = false;
      if (q && t !== cur.tab) hit = tabRows(t, p, cur.op).some(function(r){ return r.when !== false && r.l && r.l.toLowerCase().indexOf(q) >= 0; });
      b.classList.toggle('hit', hit); if (hit) n++;
    });
    return n;
  }
  // the parameters of this tab that differ from their defaults (what ↺ resets)
  function changedRows(){
    var p = TUNER_PROJECT.get(); if (!p) return [];
    return tabRows(cur.tab, p, cur.op).filter(function(r){
      if (!r.k || r.k.charAt(0) === '$' || r.c === 'ro' || r.c === 'pick' || r.c === 'file' || r.when === false) return false;
      var d = deflt(r); return d !== undefined && String(d) !== String(get(r));
    });
  }

  // ——— head buttons of the Parameters mode: search · reset the tab · more ———
  var I_SEARCH = '<span class="ei ei16 s-st i-search"></span>', I_RESET = '<span class="ei ei16 s-st i-reset"></span>', I_MORE = '<span class="ei ei16 s-mac i-dots"></span>';
  var acts = document.querySelector('[data-acts="params"]');
  acts.innerHTML =
    '<button class="ibtn" data-h="search" title="Find a parameter (Ctrl+F)">' + I_SEARCH + '</button>' +
    '<button class="ibtn" data-h="reset" title="Reset the changed parameters of this tab">' + I_RESET + '</button>' +
    '<button class="ibtn" data-h="more" title="More">' + I_MORE + '</button>';
  var searchBtn = acts.querySelector('[data-h="search"]'), resetBtn = acts.querySelector('[data-h="reset"]');
  // the search row under the title (the code panel's Find field)
  var query = '', sRow = document.createElement('div');
  sRow.className = 'isearch'; sRow.hidden = true;
  sRow.innerHTML = '<input class="ef-in" type="text" placeholder="Find a parameter" spellcheck="false"><span class="ef-count"></span>' +
    '<button class="ef-btn" title="Close (Esc)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg></button>';
  body.querySelector('.title-row').after(sRow);
  var sInput = sRow.querySelector('input'), sCount = sRow.querySelector('.ef-count');
  function openSearch(){ sRow.hidden = false; searchBtn.classList.add('on'); sInput.focus(); sInput.select(); }
  function closeSearch(){ sRow.hidden = true; searchBtn.classList.remove('on'); query = ''; sInput.value = ''; railHits(); render(); }
  sInput.addEventListener('input', function(){ query = sInput.value; render(); railHits(); });
  sInput.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ e.preventDefault(); closeSearch(); } });
  sRow.querySelector('.ef-btn').addEventListener('click', closeSearch);
  body.addEventListener('keydown', function(e){ if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f'){ e.preventDefault(); openSearch(); } });

  var clip = null;   // parameters copied from an operation
  acts.addEventListener('click', function(e){
    var b = e.target.closest('[data-h]'); if (!b) return;
    var h = b.dataset.h, p = TUNER_PROJECT.get();
    if (h === 'search'){ if (sRow.hidden) openSearch(); else closeSearch(); }
    else if (h === 'reset'){
      var list = changedRows(); if (!list.length) return;
      list.forEach(function(r){ var o = scopeOf(r) === 'op' ? opParams(p, cur.op) : p.params, ks = r.k.split('.'); ks.slice(0, -1).forEach(function(k){ o = o[k]; }); o[ks[ks.length - 1]] = deflt(r); });
      outdate(list[0]); render();
      if (window.TUNER_VIEW) TUNER_VIEW.notify('Parameters reset', list.length + (list.length > 1 ? ' parameters' : ' parameter') + ' of ' + cur.tab + ' back to default.', 'info');
    }
    else if (h === 'more'){
      var tabs = tabRows(cur.tab, p, cur.op).filter(function(r){ return r.g; });
      openMenu(b, [
        {t: 'Copy parameters', off: !cur.op},
        {t: 'Paste parameters' + (clip ? ' from ' + clip.name : ''), off: !cur.op || !clip || clip.op === cur.op},
        {t: 'Expand all groups', off: !tabs.length},
        {t: 'Collapse all groups', off: !tabs.length}
      ], function(i){
        if (i === 0){ var o = opParams(p, cur.op); clip = {op: cur.op, name: cur.op.name, v: JSON.parse(JSON.stringify({strategy: o.strategy, params: o.params, tool: {len: o.tool.len, plunge: o.tool.plunge, dir: o.tool.dir}}))}; }
        else if (i === 1){
          var t = opParams(p, cur.op);
          t.strategy = JSON.parse(JSON.stringify(clip.v.strategy)); t.params = JSON.parse(JSON.stringify(clip.v.params));
          if (t.tool.len !== '—') t.tool.len = clip.v.tool.len; if (t.tool.plunge !== '—') t.tool.plunge = clip.v.tool.plunge; t.tool.dir = clip.v.tool.dir;
          outdate({k: '$tool'}); render();   // an operation's own change: it is no longer calculated
          if (window.TUNER_VIEW) TUNER_VIEW.notify('Parameters pasted', 'Strategy, parameters and tool limits of ' + clip.name + ' → ' + cur.op.name + '.', 'info');
        }
        else tabs.forEach(function(r){ closed[cur.tab + ':' + r.id] = i === 3; }), render();
      });
    }
  });

  // ——— selection from the tree ———
  document.addEventListener('tuner:select', function(e){
    var d = e.detail, set = SETS[d.kind] || SETS.machine;
    // the open tab stays open when the new level has it; otherwise the level's main tab
    cur = {kind: d.kind, op: d.op || null, tab: set.indexOf(cur.tab) >= 0 ? cur.tab : MAIN[d.kind]};
    selKey = null;
    render();
  });
  document.addEventListener('tuner:project', function(){ cur = {kind:'machine', op:null, tab:'Machine setup'}; render(); });
  // the program changed (typing, Split, Run): values read from it and statuses may have moved —
  // but a number being typed in here is left alone
  document.addEventListener('tuner:ops', function(){ if (!rows.querySelector('.editing')) render(); });
  rail.addEventListener('click', function(e){
    var b = e.target.closest('.rbtn'); if (!b) return;
    cur.tab = b.dataset.t; selKey = null; render();
  });

  // ——— rows: select · fold · list · number · switch · reset ———
  var menu = null;
  function closeMenu(){ if (menu){ if (menu._owner) menu._owner.classList.remove('dd-open'); menu.remove(); menu = null; } }
  function openMenu(owner, items, pick){
    closeMenu();
    menu = document.createElement('div');
    menu.className = 'dd-menu'; menu._owner = owner; owner.classList.add('dd-open');
    menu.innerHTML = items.map(function(it, i){
      return '<button class="dd-opt' + (it.cur ? ' cur' : '') + '" data-i="' + i + '"' + (it.off ? ' disabled' : '') + '>' +
        '<span class="dd-ck">' + (it.cur ? '✓' : '') + '</span>' + esc(it.t) + '</button>';
    }).join('');
    document.body.appendChild(menu);
    var r = owner.getBoundingClientRect();
    menu.style.minWidth = Math.max(120, r.width) + 'px';
    menu.style.left = Math.max(4, Math.min(r.left, innerWidth - menu.offsetWidth - 4)) + 'px';
    // below the control; at the bottom of the screen it opens upwards
    menu.style.top = (r.bottom + 2 + menu.offsetHeight > innerHeight - 4 ? Math.max(4, r.top - 2 - menu.offsetHeight) : r.bottom + 2) + 'px';
    menu.addEventListener('click', function(e){
      var b = e.target.closest('.dd-opt'); if (!b || b.disabled) return;
      closeMenu(); pick(+b.dataset.i);
    });
  }
  document.addEventListener('mousedown', function(e){ if (menu && !menu.contains(e.target) && !e.target.closest('.dd-open')) closeMenu(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
  rows.addEventListener('scroll', closeMenu);

  function editNum(row, r){
    var box = row.querySelector('[data-num]'), old = String(get(r));
    if (box.classList.contains('editing')) return;
    box.classList.add('editing');
    box.querySelector('.v').outerHTML = '<input type="text" value="' + esc(old) + '" spellcheck="false">';
    var inp = box.querySelector('input'), done = false;
    inp.focus(); inp.select();
    function finish(ok){
      if (done) return; done = true;
      var v = inp.value.trim().replace(',', '.');
      // a number, or the value stays as it was
      if (ok && v !== old && /^[-+]?\d*\.?\d+$/.test(v)) set(r, String(+v)); else render();
    }
    inp.addEventListener('keydown', function(e){
      if (e.key === 'Enter'){ e.preventDefault(); finish(true); }
      if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    inp.addEventListener('blur', function(){ finish(true); });
  }

  rows.addEventListener('click', function(e){
    var row = e.target.closest('.irow'); if (!row) return;
    var r = rows._list[+row.dataset.n];
    if (row.dataset.fold){ closed[row.dataset.fold] = !closed[row.dataset.fold]; selKey = row.dataset.fold; render(); return; }
    if (row.classList.contains('off')) return;
    if (selKey !== row.dataset.key){ selKey = row.dataset.key; rows.querySelectorAll('.irow.sel').forEach(function(x){ x.classList.remove('sel'); }); row.classList.add('sel'); }
    if (e.target.closest('[data-more]')){
      var d = deflt(r);
      openMenu(e.target.closest('[data-more]'), [{t:'Reset to default', off: d === undefined || String(d) === String(get(r))}], function(){ set(r, d); });
      return;
    }
    if (r.c === 'dd' && e.target.closest('[data-dd]')){
      var v = get(r), opts = r.o;
      openMenu(e.target.closest('[data-dd]'), opts.map(function(o){ return {t:o, cur: o === v}; }), function(i){ if (opts[i] !== v) set(r, opts[i]); });
    }
    else if (r.c === 'num' && e.target.closest('[data-num]')) editNum(row, r);
    else if (r.c === 'tgl') set(r, !get(r));
  });

  // ——— hint: after a short hover on the "i", the parameter's name and what it does ———
  var tip = document.createElement('div'), tipTimer = null;
  tip.className = 'itip'; tip.hidden = true; document.body.appendChild(tip);
  // the whole inspector: the Parameters rows and the Stream editor's
  var panel = document.getElementById('panelInsp');
  panel.addEventListener('mouseover', function(e){
    var h = e.target.closest('.hint[data-tip]');
    clearTimeout(tipTimer); tip.hidden = true;
    if (!h) return;
    tipTimer = setTimeout(function(){
      tip.innerHTML = '<b>' + esc(h.dataset.tip) + '</b><span>' + esc(h.dataset.tipD) + '</span>';
      tip.hidden = false;
      var b = h.getBoundingClientRect();
      tip.style.left = Math.max(4, Math.min(b.left, innerWidth - tip.offsetWidth - 4)) + 'px';
      tip.style.top = (b.bottom + 4 + tip.offsetHeight > innerHeight - 4 ? b.top - 4 - tip.offsetHeight : b.bottom + 4) + 'px';
    }, 350);
  });
  panel.addEventListener('mouseleave', function(){ clearTimeout(tipTimer); tip.hidden = true; });

  // ——— the label | control divider: 25–75 % of the width, kept ———
  var split = +(localStorage.getItem('tuner.inspSplit') || 0);
  if (split) wrap.style.setProperty('--insp-split', split + '%');
  document.getElementById('isplit').addEventListener('mousedown', function(e){
    e.preventDefault();
    wrap.classList.add('splitting');
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    function move(ev){
      var b = wrap.getBoundingClientRect();
      split = Math.round(Math.max(25, Math.min(75, (ev.clientX - b.left) / b.width * 100)));
      wrap.style.setProperty('--insp-split', split + '%');
    }
    function up(){
      wrap.classList.remove('splitting');
      document.body.style.cursor = document.body.style.userSelect = '';
      document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
      try { localStorage.setItem('tuner.inspSplit', split); } catch(err){}
    }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  });

  // the Stream editor uses the same dropdown list
  window.TUNER_INSP = {menu: openMenu, closeMenu: closeMenu};

  render();
})();
