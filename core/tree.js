// ENCY Tuner — the Setup tree: the project's structure built from the program.
//   Machine (interpreter · status)
//     [Channel N — only on a multichannel machine]
//       Part 1 / Setup N (work offset)  — one per run of the same G54…G59
//         operations: work offset · T# · tool · colour · status
// It reads the same model as the code editor and follows it: a click on an operation puts the
// editor on its first block, the caret in the editor selects its operation here. Statuses roll up
// (an error inside marks every branch above it). Run program calculates what is not calculated.
// Fires `tuner:select` ({kind: machine | channel | group | op, op}) for the inspector.
(function(){
  'use strict';

  var host = document.getElementById('tree');
  if (!host) return;
  var A = 'assets/tree/';
  var ST = {none:'st-none', calculated:'st-calc', partial:'st-partial', simulated:'st-done', error:'st-error', running:'st-prog'};
  var ST_T = {none:'Not calculated', calculated:'Calculated, not simulated', partial:'Partially simulated',
    simulated:'Simulated without errors', error:'Errors found while simulating', running:'Running'};
  // per project: what is selected and which branches are folded
  var state = {};

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function st(p){ return state[p.id] || (state[p.id] = {sel: {kind:'machine'}, closed: {}}); }

  // one status per row: an error anywhere inside wins, then the weakest state of the rest
  function roll(ops){
    if (!ops.length) return 'none';
    if (ops.some(function(o){ return o.status === 'error'; })) return 'error';
    if (ops.every(function(o){ return o.status === 'simulated'; })) return 'simulated';
    if (ops.every(function(o){ return o.status !== 'none'; }))
      return ops.some(function(o){ return o.status === 'simulated' || o.status === 'partial'; }) ? 'partial' : 'calculated';
    return 'none';
  }
  // groups: a run of operations on one work offset; a single one reads "Part 1" (a part on the
  // table), several read "Setup N" — what Split makes of G54 / G55 in the manual
  function groups(ch){
    var out = [], cur = null;
    ch.ops.forEach(function(o){
      if (!cur || cur.wcs !== o.wcs){ cur = {wcs: o.wcs, ops: []}; out.push(cur); }
      cur.ops.push(o);
    });
    out.forEach(function(g, i){ g.name = out.length === 1 ? 'Part 1' : 'Setup ' + (i + 1); g.key = ch.index + ':' + i; });
    return out;
  }

  // rows above the operations keep the same columns, so every value sits under its own head
  var EMPTY_RING = '<span class="ring none"></span>', EMPTY_FACTS = '<span class="toolno"></span><span class="tl"></span>' + EMPTY_RING;
  function status(s){ return '<img class="st" src="' + A + ST[s] + '.svg" alt="" title="' + ST_T[s] + '">'; }
  function shev(key, closed){
    return key ? '<img class="shev exp' + (closed ? ' shut' : '') + '" data-fold="' + key + '" src="' + A + 'chevron.svg" alt="">' : '<span class="shev"></span>';
  }

  function render(){
    var p = window.TUNER_PROJECT.get();
    if (!p){ host.innerHTML = ''; return; }
    var S = st(p), multi = p.channels.length > 1, all = [], html = '';
    p.channels.forEach(function(c){ all = all.concat(c.ops); });
    function sel(kind, id){ return S.sel.kind === kind && S.sel.id === id ? ' tsel' : ''; }

    html += '<div class="trow' + sel('machine') + '" data-kind="machine">' +
      '<div class="tlayer"><img class="micn" src="' + A + 'machine.svg" alt=""><span class="rlabel"><span>' + esc(p.machine || 'Machine') + '</span></span></div>' +
      '<div class="pslot"><span class="interp' + (p.interpreter ? '' : ' none') + '" title="Interpreter">' + esc(p.interpreter || 'Select interpreter') + '</span>' + EMPTY_RING + status(roll(all)) + '</div></div>';

    p.channels.forEach(function(c){
      var d = 0, ck = 'ch' + c.index;
      if (multi){
        html += '<div class="trow' + sel('channel', c.index) + '" data-kind="channel" data-ch="' + c.index + '">' +
          '<div class="tlayer">' + shev(ck, S.closed[ck]) + '<span class="opic"></span><span class="rlabel"><span>' + esc(c.name) + '</span></span></div>' +
          '<div class="pslot">' + EMPTY_RING + status(roll(c.ops)) + '</div></div>';
        if (S.closed[ck]) return;
        d = 1;
      }
      groups(c).forEach(function(g){
        var gk = 'g' + g.key;
        html += '<div class="trow' + sel('group', g.key) + '" data-kind="group" data-ch="' + c.index + '" data-g="' + g.key + '" data-line="' + g.ops[0].start + '">' +
          '<div class="tlayer" style="padding-left:' + d * 8 + 'px">' + shev(gk, S.closed[gk]) +
            (g.name === 'Part 1' ? '<img class="micn" src="' + A + 'part.svg" alt="">' : '<span class="opic"></span>') +
            '<span class="rlabel"><span>' + g.name + '</span></span></div>' +
          '<div class="pslot"><span class="cwcs">' + esc(g.wcs) + '</span>' + EMPTY_FACTS + status(roll(g.ops)) + '</div></div>';
        if (S.closed[gk]) return;
        g.ops.forEach(function(o){
          html += '<div class="trow op' + sel('op', o.id) + '" data-kind="op" data-ch="' + c.index + '" data-op="' + o.id + '" data-line="' + o.start + '">' +
            '<div class="tlayer" style="padding-left:' + (d + 1) * 8 + 'px"><span class="shev"></span><span class="opic"></span>' +
              '<span class="rlabel"><span>' + esc(o.name) + '</span></span></div>' +
            '<div class="pslot"><span class="cwcs">' + esc(o.wcs) + '</span>' +
              '<span class="toolno">' + (o.tool != null ? 'T#' + o.tool : '') + '</span>' +
              '<span class="tl" title="' + esc(o.toolName) + '">' + esc(o.toolName) + '</span>' +
              '<span class="ring" style="--cc:var(' + o.color + ')"></span>' + status(o.running ? 'running' : o.status) + '</div></div>';
        });
      });
    });
    if (!all.length)
      html += '<div class="tempty"><b>No operations yet</b>Paste the NC program and press Split in the code panel — the operations appear here</div>';
    host.innerHTML = html;
    var cur = host.querySelector('.tsel');
    if (cur) cur.scrollIntoView({block: 'nearest'});
  }

  function select(kind, id, op){
    var p = TUNER_PROJECT.get(); if (!p) return;
    st(p).sel = {kind: kind, id: id};
    render();
    document.dispatchEvent(new CustomEvent('tuner:select', {detail: {kind: kind, op: op || null}}));
  }
  function find(p, id){
    var r = null; p.channels.forEach(function(c){ c.ops.forEach(function(o){ if (o.id === id) r = o; }); }); return r;
  }

  host.addEventListener('click', function(e){
    var p = TUNER_PROJECT.get(); if (!p) return;
    var f = e.target.closest('[data-fold]');
    if (f){ var c = st(p).closed; c[f.dataset.fold] = !c[f.dataset.fold]; render(); return; }
    var r = e.target.closest('.trow'); if (!r) return;
    var k = r.dataset.kind, ch = +r.dataset.ch;
    if (k === 'machine') select('machine');
    else if (k === 'channel'){ select('channel', ch); window.TUNER_CODE.show(ch); }
    else if (k === 'group'){ select('group', r.dataset.g); window.TUNER_CODE.goto(ch, +r.dataset.line); }
    else { var id = +r.dataset.op; select('op', id, find(p, id)); window.TUNER_CODE.goto(ch, +r.dataset.line); }
  });
  // double click on an operation: into the code, caret on its first block
  host.addEventListener('dblclick', function(e){
    var r = e.target.closest('.trow[data-line]'); if (r) window.TUNER_CODE.goto(+r.dataset.ch, +r.dataset.line, true);
  });

  // the caret in the editor selects its operation (quietly: no jump back into the code)
  document.addEventListener('tuner:cursor', function(e){
    var p = TUNER_PROJECT.get(), d = e.detail; if (!p || !d.op) return;
    if (st(p).sel.kind === 'op' && st(p).sel.id === d.op.id) return;
    st(p).sel = {kind: 'op', id: d.op.id};
    render();
    document.dispatchEvent(new CustomEvent('tuner:select', {detail: {kind: 'op', op: d.op}}));
  });
  document.addEventListener('tuner:ops', render);
  // another project: its tree comes with its own selection, and the inspector follows it
  document.addEventListener('tuner:project', function(){
    render();
    var p = TUNER_PROJECT.get(); if (!p) return;
    var s = st(p).sel, op = s.kind === 'op' ? find(p, s.id) : null;
    document.dispatchEvent(new CustomEvent('tuner:select', {detail: {kind: op || s.kind !== 'op' ? s.kind : 'machine', op: op}}));
  });

  // ——— Run program: calculates the operations that are not calculated yet, behind the process
  // indicator; Cancel leaves them as they were ———
  var run = document.querySelector('[data-act="run"]');
  if (run) run.addEventListener('click', function(){
    var p = TUNER_PROJECT.get(); if (!p) return;
    var todo = [];
    p.channels.forEach(function(c){ c.ops.forEach(function(o){ if (o.status === 'none') todo.push(o); }); });
    var V = window.TUNER_VIEW;
    function emit(){ p.channels.forEach(function(c){ document.dispatchEvent(new CustomEvent('tuner:ops', {detail: c})); }); }
    if (!todo.length){ if (V) V.notify('Nothing to calculate', p.channels.some(function(c){ return c.ops.length; }) ? 'Every operation is calculated.' : 'There are no operations — Split the program.', 'info'); return; }
    todo.forEach(function(o){ o.running = true; }); emit();
    var j = V.progress('<b>Toolpath calculation</b> · ' + todo.length + (todo.length > 1 ? ' operations' : ' operation'), 400 + todo.length * 140);
    j.done = function(){ todo.forEach(function(o){ o.running = false; o.status = 'calculated'; }); emit(); V.notify('Calculation finished', todo.length + (todo.length > 1 ? ' operations' : ' operation') + ' calculated.', 'done'); };
    j.onCancel = function(){ todo.forEach(function(o){ o.running = false; }); emit(); V.notify('Calculation cancelled', '', 'warn'); };
  });

  render();
})();
