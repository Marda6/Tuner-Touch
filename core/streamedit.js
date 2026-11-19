// ENCY Tuner — Stream editor: bulk edits of the active program, as the manual lists them.
//   Block numbers: Add · Remove · Renumber      Strings: Insert · Remove · Change case
//   Skips: Block skips · Spaces · Comments · Empty lines
//   Change register: Address · Value · Info · Remove      Transform: Move · Rotate · Mirror · Equidistant
// The panel: the group on the rail, its functions as tabs, the rows of the function, and a footer
// with what the edit changes and Reset / Apply. Beyond Tuner: a live preview — the blocks the edit
// would change are tinted in the code before Apply, and the footer counts them. Apply is one
// undoable step (Ctrl+Z); operations follow their blocks. With blocks selected in the code the
// edit is limited to them (the manual: "Selecting one block or a blocks sequence limits the action").
(function(){
  'use strict';

  var body = document.querySelector('[data-body="stream"]');
  if (!body) return;
  var rail = body.querySelector('[data-rail]'), inner = body.querySelector('.inner');
  var A = 'assets/insp/';
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  // ——— NC text helpers ———
  // a line in code and comment pieces: ( … ) and ; to the end are comments, left alone
  function pieces(line){
    var out = [], cur = '', i = 0;
    while (i < line.length){
      var ch = line[i];
      if (ch === '('){ if (cur) out.push({c: cur}); var j = line.indexOf(')', i); j = j < 0 ? line.length : j + 1; out.push({m: line.slice(i, j)}); cur = ''; i = j; continue; }
      if (ch === ';'){ if (cur) out.push({c: cur}); out.push({m: line.slice(i)}); cur = ''; i = line.length; continue; }
      cur += ch; i++;
    }
    if (cur) out.push({c: cur});
    return out;
  }
  function onCode(line, fn){ return pieces(line).map(function(p){ return p.c != null ? fn(p.c) : p.m; }).join(''); }
  function rx(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function word(addr){ return new RegExp('(^|[^A-Z])(' + rx(addr) + ')\\s*([-+]?\\d*\\.?\\d+\\.?)', 'gi'); }
  // a number in the style of the one it replaces, to 3 decimals without trailing zeros:
  // X40. → X50.  X40.99 → X41.01  F200 → F220 (a whole number keeps the dot only if it had one)
  function like(orig, v){
    var s = String(Number(v.toFixed(3)));
    if (s.indexOf('.') < 0 && orig.indexOf('.') >= 0) s += '.';
    if (s === '-0' || s === '-0.') s = s.slice(1);
    return s;
  }
  function blank(l){ return !l.trim(); }
  function starts(l, list){ var t = l.trim(); return list.split(/\s+/).filter(Boolean).some(function(x){ return t.indexOf(x) === 0; }); }
  function num(v){ return v === '' || v == null ? null : Number(v); }
  function pad(n, d, lead){ var s = String(n); return lead ? ('0000000000' + s).slice(-Math.max(d, s.length)) : s; }

  // one function: lines in, lines out (+ map old → new); `sc` = {a, b} the lines it may touch
  function sameMap(n){ var m = []; for (var i = 0; i < n; i++) m.push(i); return m; }
  function perLine(lines, sc, fn){ return {lines: lines.map(function(l, i){ return i >= sc.a && i <= sc.b ? fn(l, i) : l; }), map: sameMap(lines.length)}; }
  function withInserts(lines, sc, fn){
    // fn(line, i) → array of lines in its place (empty = removed)
    var out = [], map = [];
    lines.forEach(function(l, i){
      var rep = i >= sc.a && i <= sc.b ? fn(l, i) : [l], at = -1;
      rep.forEach(function(x){ if (x === l && at < 0) at = out.length; out.push(x); });
      if (at < 0 && rep.length) at = out.length - rep.length;
      map.push(rep.length ? at : -1);
    });
    return {lines: out, map: map};
  }
  // blocks that are not toolpath points: machine moves, reference returns, offsets, plane definitions
  var SKIPPED = /G53(?![.\d])|G28|G30|G92|G10(?!\d)|G68|G43\.4|G52/i;

  // modal X / Y and the absolute / incremental mode, for the transforms
  function planar(lines, sc, v, fn){
    var x = 0, y = 0, inc = v.mode === 'Incremental (G91)';
    return perLine(lines, {a: 0, b: lines.length - 1}, function(l, i){
      var code = onCode(l, function(c){ return c; });
      if (/G91(?!\d)/i.test(code)) inc = true; if (/G90(?!\d)/i.test(code)) inc = false;
      var mx = /(^|[^A-Z])X\s*([-+]?\d*\.?\d+\.?)/i.exec(code), my = /(^|[^A-Z])Y\s*([-+]?\d*\.?\d+\.?)/i.exec(code);
      if (!mx && !my) return l;
      var nx = mx ? parseFloat(mx[2]) : x, ny = my ? parseFloat(my[2]) : y;
      x = nx; y = ny;
      if (i < sc.a || i > sc.b || inc || SKIPPED.test(code)) return l;
      var r = fn(nx, ny), ox = mx ? mx[2] : '0.', oy = my ? my[2] : '0.';
      return onCode(l, function(c){
        var hasX = /(^|[^A-Z])X\s*[-+]?\d*\.?\d+\.?/i.test(c), hasY = /(^|[^A-Z])Y\s*[-+]?\d*\.?\d+\.?/i.test(c);
        c = c.replace(/(^|[^A-Z])X\s*([-+]?\d*\.?\d+\.?)/i, function(m, a){ return a + 'X' + like(ox, r.x); });
        c = c.replace(/(^|[^A-Z])Y\s*([-+]?\d*\.?\d+\.?)/i, function(m, a){ return a + 'Y' + like(oy, r.y); });
        // both coordinates are written once the point turns: the missing one goes next to the other
        if (hasX && !hasY) c = c.replace(/(X[-+]?\d*\.?\d+\.?)/i, '$1Y' + like(ox, r.y));
        if (hasY && !hasX) c = c.replace(/((^|[^A-Z]))(Y[-+]?\d*\.?\d+\.?)/i, function(m, a){ return a + 'X' + like(oy, r.x) + m.slice(a.length); });
        // arc centres (I, J relative to the start) turn as vectors
        if (r.vec){
          var mi = /(^|[^A-Z])I\s*([-+]?\d*\.?\d+\.?)/i.exec(c), mj = /(^|[^A-Z])J\s*([-+]?\d*\.?\d+\.?)/i.exec(c);
          if (mi || mj){
            var vi = mi ? parseFloat(mi[2]) : 0, vj = mj ? parseFloat(mj[2]) : 0, w = r.vec(vi, vj);
            c = c.replace(/(^|[^A-Z])I\s*([-+]?\d*\.?\d+\.?)/i, function(m, a, o){ return a + 'I' + like(o, w.x); });
            c = c.replace(/(^|[^A-Z])J\s*([-+]?\d*\.?\d+\.?)/i, function(m, a, o){ return a + 'J' + like(o, w.y); });
            if (mi && !mj) c = c.replace(/(I[-+]?\d*\.?\d+\.?)/i, '$1J' + like(mi[2], w.y));
            if (mj && !mi) c = c.replace(/((^|[^A-Z]))(J[-+]?\d*\.?\d+\.?)/i, function(m, a){ return a + 'I' + like(mj[2], w.x) + m.slice(a.length); });
          }
        }
        if (r.swapArcs) c = c.replace(/G0?([23])(?!\d)/gi, function(m, n){ return m.replace(n, n === '2' ? '3' : '2'); });
        return c;
      });
    });
  }

  // ——— groups, functions and their rows (Tuner manual, "Stream Editor") ———
  var SKIP_ROWS = [
    {g:'Skip', id:'skip'},
    {k:'skipStart', l:'Lines starting with', c:'text', i:1, gr:'skip', d:'Lines that begin with one of these (space-separated) get no number. Spaces before them count: remove them first (Skips › Spaces).'},
    {k:'skipContain', l:'Lines containing', c:'text', i:1, gr:'skip', d:'Lines that contain this get no number.'}
  ];
  var NUM_ROWS = [
    {k:'addr', l:'Address', c:'text', d:'The block number address, N by default.'},
    {k:'start', l:'Start', c:'num', d:'The first block number.'},
    {k:'inc', l:'Increment', c:'num', d:'The step to the next number.'},
    {k:'lead', l:'Leading zeros', c:'tgl', d:'Zeros before the number up to the digits below.'},
    {k:'digits', l:'Digits', c:'num', i:1, off: function(v){ return !v.lead; }},
    {k:'after', l:'Spaces after the number', c:'num', d:'Spaces between the number and the block (Indent › After).'},
    {k:'empty', l:'Number empty lines', c:'tgl', d:'Empty lines get a number too.'}
  ];
  var TF = [
    {k:'mode', l:'Start interpolation type', c:'dd', o:['Absolute (G90)', 'Incremental (G91)'], d:'How coordinates are read where the program does not say: absolute (G90) or incremental (G91). Incremental blocks are left as they are.'},
    {k:'arc', l:'Arc center type', c:'dd', o:['Autodetect', 'Relative to start', 'Relative to end', 'Absolute'], d:'How I, J, K of arcs are read. The prototype treats them as relative to the start.'}
  ];

  var GROUPS = [
    {id:'numbers', t:'Block numbers', fns:[
      {id:'add', t:'Add', rows: NUM_ROWS.concat(SKIP_ROWS),
        v:{addr:'N', start:'10', inc:'10', lead:false, digits:'4', after:'1', empty:false, skipStart:'% ( O < ;', skipContain:''},
        run: function(L, sc, v){
          var n = +v.start, re = new RegExp('^\\s*' + rx(v.addr) + '\\d');
          return perLine(L, sc, function(l){
            if ((blank(l) && !v.empty) || starts(l, v.skipStart) || (v.skipContain && l.indexOf(v.skipContain) >= 0) || re.test(l)) return l;
            var s = v.addr + pad(n, +v.digits, v.lead) + new Array(+v.after + 1).join(' ') + l; n += +v.inc; return s;
          });
        }},
      {id:'remove', t:'Remove', act:'Remove', rows:[{k:'addr', l:'Remove register', c:'text', d:'Numbers at this address are removed from the blocks.'}], v:{addr:'N'},
        run: function(L, sc, v){ var re = new RegExp('^(\\s*)' + rx(v.addr) + '\\d+\\s?', 'i'); return perLine(L, sc, function(l){ return l.replace(re, '$1'); }); }},
      {id:'renumber', t:'Renumber', rows:[
          {k:'old', l:'Delete register', c:'text', d:'The address of the numbers to replace.'},
          {k:'addr', l:'New register', c:'text', d:'The address of the new numbers.'}].concat(NUM_ROWS.slice(1, 6), [
          {k:'only', l:'Lines without numbers keep none', c:'tgl', d:'Blocks without a number stay without one.'},
          {k:'refs', l:'Update related registers', c:'tgl', d:'References to block numbers follow: P and Q of G70–G73 cycles (G70 P100 Q200 → P11 Q22).'}], SKIP_ROWS),
        v:{old:'N', addr:'N', start:'10', inc:'10', lead:false, digits:'4', after:'1', only:true, refs:true, skipStart:'% ( O < ;', skipContain:''},
        run: function(L, sc, v){
          var n = +v.start, re = new RegExp('^(\\s*)' + rx(v.old) + '(\\d+)\\s*'), nums = {}, out;
          out = perLine(L, sc, function(l){
            var m = re.exec(l);
            if (!m && (v.only || blank(l) || starts(l, v.skipStart) || (v.skipContain && l.indexOf(v.skipContain) >= 0))) return l;
            var nn = v.addr + pad(n, +v.digits, v.lead) + new Array(+v.after + 1).join(' ');
            if (m) nums[m[2]] = pad(n, +v.digits, v.lead);
            n += +v.inc;
            return m ? m[1] + nn + l.slice(m[0].length) : nn + l;
          });
          if (v.refs) out.lines = out.lines.map(function(l){
            return /G7[0-3](?!\d)/i.test(l) ? onCode(l, function(c){ return c.replace(/([PQ])(\d+)/gi, function(m0, a, k){ return nums[k] != null ? a + nums[k] : m0; }); }) : l;
          });
          return out;
        }}
    ]},
    {id:'strings', t:'Strings', fns:[
      {id:'insert', t:'Insert', rows:[
          {k:'where', l:'Where', c:'dd', o:['At start of line', 'At end of line', 'After block number', 'Replace matched string', 'Before matched string', 'After matched string',
            'On new line after current', 'On new line before matched string', 'On new line after matched string'], d:'Where the string goes. "Matched" places use the text below.'},
          {k:'match', l:'On line matching', c:'text', when: function(v){ return /matched/i.test(v.where); }, d:'The text in the program to replace or insert next to.'},
          {k:'regex', l:'Regular expression', c:'tgl', i:1, when: function(v){ return /matched/i.test(v.where); }, d:'Read the text above as a regular expression.'},
          {k:'value', l:'String value', c:'text', d:'The characters to insert.'}],
        v:{where:'At end of line', match:'', regex:false, value:''},
        run: function(L, sc, v){
          var val = v.value, test = function(l){ if (!v.match) return false; if (v.regex){ try { return new RegExp(v.match).test(l); } catch(e){ return false; } } return l.indexOf(v.match) >= 0; };
          var re = v.match ? (v.regex ? (function(){ try { return new RegExp(v.match, 'g'); } catch(e){ return null; } })() : new RegExp(rx(v.match), 'g')) : null;
          if (!val && !/Replace/.test(v.where)) return {lines: L.slice(), map: sameMap(L.length)};
          switch (v.where){
            case 'At start of line': return perLine(L, sc, function(l){ return blank(l) ? l : val + l; });
            case 'At end of line': return perLine(L, sc, function(l){ return blank(l) ? l : l + val; });
            case 'After block number': return perLine(L, sc, function(l){ return l.replace(/^(\s*N\d+)/i, '$1' + val); });
            case 'Replace matched string': return perLine(L, sc, function(l){ return re ? l.replace(re, val) : l; });
            case 'Before matched string': return perLine(L, sc, function(l){ return re ? l.replace(re, function(m){ return val + m; }) : l; });
            case 'After matched string': return perLine(L, sc, function(l){ return re ? l.replace(re, function(m){ return m + val; }) : l; });
            case 'On new line after current': return withInserts(L, sc, function(l){ return [l, val]; });
            case 'On new line before matched string': return withInserts(L, sc, function(l){ return test(l) ? [val, l] : [l]; });
            case 'On new line after matched string': return withInserts(L, sc, function(l){ return test(l) ? [l, val] : [l]; });
          }
        }},
      {id:'removeStr', t:'Remove', act:'Remove', rows:[
          {k:'where', l:'Where', c:'dd', o:['At start of line', 'At end of line', 'After block number', 'Everywhere'], d:'Where the string is removed from.'},
          {k:'value', l:'String value', c:'text', d:'The characters to remove.'}],
        v:{where:'Everywhere', value:''},
        run: function(L, sc, v){
          var s = v.value; if (!s) return {lines: L.slice(), map: sameMap(L.length)};
          return perLine(L, sc, function(l){
            if (v.where === 'At start of line') return l.indexOf(s) === 0 ? l.slice(s.length) : l;
            if (v.where === 'At end of line') return l.slice(-s.length) === s ? l.slice(0, -s.length) : l;
            if (v.where === 'After block number') return l.replace(new RegExp('^(\\s*N\\d+)' + rx(s), 'i'), '$1');
            return l.split(s).join('');
          });
        }},
      {id:'case', t:'Change case', rows:[
          {k:'to', l:'Char case', c:'dd', o:['Upper', 'Lower'], d:'Characters of the program become upper or lower case.'},
          {k:'keep', l:'Ignore comments', c:'tgl', d:'Comments keep their case.'}],
        v:{to:'Upper', keep:true},
        run: function(L, sc, v){
          var f = v.to === 'Upper' ? function(s){ return s.toUpperCase(); } : function(s){ return s.toLowerCase(); };
          return perLine(L, sc, function(l){ return v.keep ? onCode(l, f) : f(l); });
        }}
    ]},
    {id:'skips', t:'Skips', fns:[
      {id:'skip', t:'Block skips', act2:'Remove', rows:[{k:'sym', l:'Values', c:'text', d:'The block skip symbol of the control. Apply adds it, Remove takes it away.'}], v:{sym:'/'},
        run: function(L, sc, v, act){
          return perLine(L, sc, function(l){
            if (act === 'Remove') return l.indexOf(v.sym) === 0 ? l.slice(v.sym.length) : l;
            return blank(l) || starts(l, '% O') || l.indexOf(v.sym) === 0 ? l : v.sym + l;
          });
        }},
      {id:'spaces', t:'Spaces', act2:'Remove', rows:[{k:'keep', l:'Ignore comments', c:'tgl', d:'Spaces inside comments stay as they are.'}], v:{keep:true},
        run: function(L, sc, v, act){
          var f = act === 'Remove' ? function(c){ return c.replace(/[ \t]+/g, ''); }
            // a space before every address that carries a number (I=AC(…) and the like stay whole)
            : function(c){ return c.replace(/[ \t]+/g, '').replace(/([^A-Z=])([A-Z](?=[-+.\d]))/gi, '$1 $2'); };
          return perLine(L, sc, function(l){ return v.keep ? onCode(l, f) : f(l); });
        }},
      {id:'comments', t:'Comments', rows:[{k:'open', l:'Open comment', c:'text'}, {k:'close', l:'Close comment', c:'text', d:'Comments between these symbols are removed; a line left empty stays.'}], v:{open:'(', close:')'},
        run: function(L, sc, v){
          var re = new RegExp(rx(v.open) + '[^' + rx(v.close) + ']*' + (v.close ? rx(v.close) : '$'), 'g');
          return perLine(L, sc, function(l){ var r = l.replace(re, ''); return r.trim() ? r.replace(/\s+$/, '') : (l.trim() ? '' : l); });
        }},
      {id:'lines', t:'Lines', rows:[{k:'empty', l:'Remove empty lines', c:'tgl', d:'Lines without characters are deleted.'}], v:{empty:true},
        run: function(L, sc, v){ return withInserts(L, sc, function(l){ return v.empty && blank(l) ? [] : [l]; }); }}
    ]},
    {id:'register', t:'Change register', fns:[
      {id:'address', t:'Address', rows:[{k:'from', l:'Old address', c:'text', d:'The address to replace.'}, {k:'to', l:'New address', c:'text', d:'The address in its place.'}], v:{from:'X', to:'U'},
        run: function(L, sc, v){
          if (!v.from || !v.to) return {lines: L.slice(), map: sameMap(L.length)};
          var re = new RegExp('(^|[^A-Z])' + rx(v.from) + '(?=\\s*[-+.\\d])', 'gi');
          return perLine(L, sc, function(l){ return onCode(l, function(c){ return c.replace(re, '$1' + v.to); }); });
        }},
      {id:'value', t:'Value', rows:[
          {k:'reg', l:'Register', c:'text', d:'The address whose values change.'},
          {k:'op', l:'Operation', c:'dd', o:['Add', 'Sub', 'Mul', 'Div'], d:'New value = old value + − × ÷ the value below.'},
          {k:'val', l:'Value', c:'num'},
          {g:'Limits', id:'lim'},
          {k:'min', l:'Minimum', c:'num', i:1, gr:'lim', opt:true, d:'A result below it becomes this value.'},
          {k:'max', l:'Maximum', c:'num', i:1, gr:'lim', opt:true, d:'A result above it becomes this value.'},
          {k:'ge', l:'When equal or greater than', c:'num', i:1, gr:'lim', opt:true, d:'Only values at least this one change.'},
          {k:'le', l:'When equal or less than', c:'num', i:1, gr:'lim', opt:true, d:'Only values at most this one change.'}],
        v:{reg:'F', op:'Mul', val:'1.1', min:'', max:'', ge:'', le:''},
        run: function(L, sc, v){
          var k = +v.val, mn = num(v.min), mx = num(v.max), ge = num(v.ge), le = num(v.le);
          return perLine(L, sc, function(l){ return onCode(l, function(c){ return c.replace(word(v.reg), function(m, a, ad, o){
            var x = parseFloat(o); if ((ge != null && x < ge) || (le != null && x > le)) return m;
            var y = v.op === 'Add' ? x + k : v.op === 'Sub' ? x - k : v.op === 'Mul' ? x * k : (k ? x / k : x);
            if (mn != null) y = Math.max(mn, y); if (mx != null) y = Math.min(mx, y);
            return a + ad + like(o, y);
          }); }); });
        }},
      {id:'info', t:'Info', act:'Show', rows:[{k:'reg', l:'Register', c:'text', d:'The address to look up: Show finds its smallest and largest value.'}], v:{reg:'X'},
        info: function(L, sc, v){
          var lo = null, hi = null, n = 0;
          L.forEach(function(l, i){ if (i < sc.a || i > sc.b) return; onCode(l, function(c){ c.replace(word(v.reg), function(m, a, ad, o){ var x = parseFloat(o); n++; lo = lo == null ? x : Math.min(lo, x); hi = hi == null ? x : Math.max(hi, x); return m; }); return c; }); });
          return n ? v.reg.toUpperCase() + ': min ' + lo + ' · max ' + hi + ' · ' + n + ' values' : 'No ' + v.reg.toUpperCase() + ' in the program';
        }},
      {id:'removeReg', t:'Remove', act:'Remove', rows:[{k:'reg', l:'Address', c:'text', d:'Words at this address are removed from the blocks.'}], v:{reg:'M08'},
        run: function(L, sc, v){
          var m = /^([A-Z]+)(.*)$/i.exec(v.reg || ''); if (!m) return {lines: L.slice(), map: sameMap(L.length)};
          var re = m[2] ? new RegExp('(^|[^A-Z])' + rx(m[1]) + '0*' + rx(m[2].replace(/^0+/, '')) + '(?![\\d.])\\s?', 'gi') : new RegExp('(^|[^A-Z])' + rx(m[1]) + '\\s*[-+]?\\d*\\.?\\d+\\.?\\s?', 'gi');
          return perLine(L, sc, function(l){ return onCode(l, function(c){ return c.replace(re, '$1'); }); });
        }}
    ]},
    {id:'transform', t:'Transform', fns:[
      {id:'move', t:'Move', rows: TF.concat([{g:'Register', id:'reg'}, {k:'X', l:'X', c:'num', u:'mm', i:1, gr:'reg'}, {k:'Y', l:'Y', c:'num', u:'mm', i:1, gr:'reg'}, {k:'Z', l:'Z', c:'num', u:'mm', i:1, gr:'reg', d:'Added to every coordinate of this address, with its sign.'}]),
        v:{mode:'Absolute (G90)', arc:'Autodetect', X:'0', Y:'0', Z:'5'},
        run: function(L, sc, v){
          var inc = v.mode === 'Incremental (G91)';
          return perLine(L, {a: 0, b: L.length - 1}, function(l, i){
            var code = onCode(l, function(c){ return c; });
            if (/G91(?!\d)/i.test(code)) inc = true; if (/G90(?!\d)/i.test(code)) inc = false;
            if (i < sc.a || i > sc.b || inc || SKIPPED.test(code)) return l;
            return onCode(l, function(c){ ['X', 'Y', 'Z'].forEach(function(ax){ var d = +v[ax]; if (d) c = c.replace(word(ax), function(m, a, ad, o){ return a + ad + like(o, parseFloat(o) + d); }); }); return c; });
          });
        }},
      {id:'rotate', t:'Rotate', rows: TF.concat([{g:'Register', id:'reg'}, {k:'cx', l:'Center X', c:'num', u:'mm', i:1, gr:'reg'}, {k:'cy', l:'Center Y', c:'num', u:'mm', i:1, gr:'reg'}, {k:'ang', l:'Angle', c:'num', u:'°', d:'The points turn around the centre by this angle (counter-clockwise positive).'}]),
        v:{mode:'Absolute (G90)', arc:'Autodetect', cx:'0', cy:'0', ang:'90'},
        run: function(L, sc, v){
          var a = +v.ang * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), cx = +v.cx, cy = +v.cy;
          if (!+v.ang) return {lines: L.slice(), map: sameMap(L.length)};
          return planar(L, sc, v, function(x, y){ var dx = x - cx, dy = y - cy;
            return {x: cx + dx * co - dy * si, y: cy + dx * si + dy * co, vec: function(i, j){ return {x: i * co - j * si, y: i * si + j * co}; }}; });
        }},
      {id:'mirror', t:'Mirror', rows: TF.concat([{g:'Register', id:'reg'}, {k:'ox', l:'Axis origin X', c:'num', u:'mm', i:1, gr:'reg'}, {k:'oy', l:'Axis origin Y', c:'num', u:'mm', i:1, gr:'reg'}, {k:'ang', l:'Angle', c:'num', u:'°', d:'The direction of the mirror axis through the origin (0° — along X). Arcs change direction: G2 ⇄ G3.'}]),
        v:{mode:'Absolute (G90)', arc:'Autodetect', ox:'0', oy:'0', ang:'0'},
        run: function(L, sc, v){
          var a = +v.ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), ox = +v.ox, oy = +v.oy;
          function refl(dx, dy){ var d = dx * ux + dy * uy; return {x: 2 * d * ux - dx, y: 2 * d * uy - dy}; }
          return planar(L, sc, v, function(x, y){ var r = refl(x - ox, y - oy);
            return {x: ox + r.x, y: oy + r.y, vec: function(i, j){ return refl(i, j); }, swapArcs: true}; });
        }},
      {id:'equidistant', t:'Equidistant', rows: TF.concat([{k:'off', l:'Offset', c:'num', u:'mm', d:'The toolpath is replaced by one at this distance.'}]), v:{mode:'Absolute (G90)', arc:'Autodetect', off:'1'},
        todo: 'Offsetting a toolpath needs the geometry kernel — not built in the prototype.'}
    ]}
  ];

  // ——— state: the group, the function in each group, the values of each function ———
  var cur = {g: 0, f: [0, 0, 0, 0, 0]}, vals = {}, closed = {}, sel = null;
  GROUPS.forEach(function(g){ g.fns.forEach(function(f){ vals[f.id] = JSON.parse(JSON.stringify(f.v)); }); });
  function G(){ return GROUPS[cur.g]; }
  function F(){ return G().fns[cur.f[cur.g]]; }
  function editor(){ return window.TUNER_CODE && TUNER_CODE.active(); }
  function scope(ed){
    // a selection of everything (as an undo leaves it) is the whole program
    var n = ed.text().split('\n').length, s = ed.selection();
    return limit && s && !(s.a === 0 && s.b >= n - 1) ? {a: s.a, b: s.b, sel: true} : {a: 0, b: n - 1, sel: false};
  }

  // ——— render ———
  function ctl(r, v){
    var val = v[r.k];
    if (r.c === 'dd') return '<span class="dropdown" data-dd><span class="v">' + esc(val) + '</span><img src="assets/dd-chev.svg" alt=""></span>';
    if (r.c === 'tgl') return '<img class="tgl" data-tgl src="' + A + (val ? 'toggle-on' : 'toggle-off') + '.svg" alt="">';
    return '<span class="input" data-edit><span class="v">' + (val === '' ? '<i class="ph">' + (r.opt ? 'Not set' : 'Empty') + '</i>' : esc(val)) + '</span>' + (r.u ? '<span class="u">' + r.u + '</span>' : '') + '</span>';
  }
  function render(){
    var g = G(), f = F(), v = vals[f.id];
    rail.querySelectorAll('.rbtn').forEach(function(b, i){ b.classList.toggle('active', i === cur.g); });
    var html = '<div class="title-row"><span class="t">' + g.t + '</span><span class="tnode" id="seScope"></span></div>' +
      '<div class="se-fns">' + g.fns.map(function(x, i){ return '<button class="' + (i === cur.f[cur.g] ? 'on' : '') + '" data-fn="' + i + '">' + x.t + '</button>'; }).join('') + '</div>' +
      '<div class="irows se-rows" id="seRows">';
    f.rows.forEach(function(r, n){
      if (r.when && !r.when(v)) return;
      var key = f.id + ':' + (r.k || r.id);
      if (r.gr && closed[f.id + ':' + r.gr]) return;
      if (r.g){
        html += '<div class="irow head' + (closed[key] ? ' shut' : '') + '" data-fold="' + key + '"><div class="ilbl"><span class="hint"></span><div class="itl">' +
          '<img class="shev" src="' + A + 'chevron.svg" alt=""><span class="rlabel"><span>' + r.g + '</span></span></div></div></div>';
        return;
      }
      var off = r.off && r.off(v);
      html += '<div class="irow' + (off ? ' off' : '') + (sel === key ? ' sel' : '') + '" data-n="' + n + '" data-key="' + key + '">' +
        '<div class="ilbl"><img class="hint" src="' + A + 'hint.svg" alt=""' + (r.d ? ' data-tip="' + esc(r.l) + '" data-tip-d="' + esc(r.d) + '"' : '') + '>' +
        '<div class="itl" style="padding-left:' + (r.i || 0) * 8 + 'px"><span class="shev"></span><span class="rlabel"><span>' + esc(r.l) + '</span></span></div></div>' +
        '<div class="ictl' + (r.c === 'tgl' ? ' between' : '') + '">' + ctl(r, v) + '</div></div>';
    });
    html += '</div><div class="se-foot"><span class="se-note" id="seNote"></span>' +
      (f.act2 ? '<button class="tact" data-act="act2">' + f.act2 + '</button>' : '') +
      '<button class="tact apply" data-act="apply">' + (f.act || 'Apply') + '</button></div>';
    inner.innerHTML = html;
    inner._rows = f.rows;
    syncReset();
    preview();
  }

  // ——— preview: what the edit would change, counted and tinted in the code ———
  var pvTimer = 0, pvResult = null;
  function preview(){
    clearTimeout(pvTimer);
    pvTimer = setTimeout(function(){
      var ed = editor(), f = F(), note = document.getElementById('seNote'), apply = inner.querySelector('[data-act="apply"]'), scopeEl = document.getElementById('seScope');
      if (!note) return;
      if (!ed){ note.textContent = 'No program'; apply.disabled = true; return; }
      var sc = scope(ed), L = ed.text().split('\n');
      var multi = TUNER_PROJECT.get().channels.length > 1;
      scopeEl.textContent = (sc.sel ? 'Blocks ' + (sc.a + 1) + '–' + (sc.b + 1) + ' (selected)' : 'Whole program') + (multi ? ' · ' + ed.channel.name : '');
      pvResult = null;
      if (f.todo){ note.textContent = f.todo; note.className = 'se-note todo'; apply.disabled = true; ed.preview(null); return; }
      if (f.info){ note.textContent = 'Show finds the smallest and largest value'; note.className = 'se-note'; apply.disabled = false; ed.preview(null); return; }
      var r = f.run(L, sc, vals[f.id], 'Apply'), set = {}, n = 0, gone = 0;
      r.map.forEach(function(j, i){ if (j < 0){ set[i] = true; gone++; } else if (r.lines[j] !== L[i]){ set[i] = true; n++; } });
      var added = r.lines.length - (L.length - r.map.filter(function(j){ return j < 0; }).length);
      // inserted lines show on the block they come next to
      if (added > 0) r.map.forEach(function(j, i){ var nx = r.map[i + 1]; if (j >= 0 && nx != null && nx - j > 1) set[i] = true; if (i === r.map.length - 1 && r.lines.length - 1 > j) set[i] = true; });
      pvResult = r;
      var parts = [];
      if (n) parts.push(n + (n > 1 ? ' blocks change' : ' block changes'));
      if (added > 0) parts.push(added + (added > 1 ? ' lines added' : ' line added'));
      if (gone) parts.push(gone + (gone > 1 ? ' lines removed' : ' line removed'));
      note.textContent = parts.length ? parts.join(' · ') : (f.act2 ? 'Apply adds, ' + f.act2 + ' takes away' : 'No changes');
      note.className = 'se-note' + (parts.length ? ' has' : '');
      apply.disabled = !parts.length && !f.act2;
      ed.preview(parts.length && pvOn ? set : null);
    }, 80);
  }

  function apply(act){
    var ed = editor(), f = F(); if (!ed || f.todo) return;
    var sc = scope(ed), L = ed.text().split('\n');
    if (f.info){ var t = f.info(L, sc, vals[f.id]); document.getElementById('seNote').textContent = t; document.getElementById('seNote').className = 'se-note has'; return; }
    var r = f.run(L, sc, vals[f.id], act);
    var changed = r.map.filter(function(j, i){ return j < 0 || r.lines[j] !== L[i]; }).length + Math.max(0, r.lines.length - L.length);
    if (!changed){ if (window.TUNER_VIEW) TUNER_VIEW.notify('Stream editor: nothing to change', G().t + ' › ' + f.t + ' found nothing to edit.', 'info'); return; }
    ed.preview(null);
    ed.bulk(r.lines.join('\n'), r.map);
    if (window.TUNER_VIEW) TUNER_VIEW.notify('Stream editor: ' + f.t + (act && act !== 'Apply' ? ' (' + act + ')' : ''), changed + (changed > 1 ? ' blocks changed' : ' block changed') + (sc.sel ? ' in the selection' : '') + '. Ctrl+Z undoes it.', 'done');
    preview();
  }

  // ——— head buttons of the Stream editor mode: preview · reset the function · more ———
  var pvOn = true, limit = true;
  var acts = document.querySelector('[data-acts="stream"]');
  acts.innerHTML =
    '<button class="ibtn on" data-h="preview" title="Preview in the code: tint the blocks the edit changes"><span class="ei ei20 s-insp i-eye"></span></button>' +
    '<button class="ibtn" data-h="reset" title="Default values of this function"><span class="ei ei16 s-st i-reset"></span></button>' +
    '<button class="ibtn" data-h="more" title="More"><span class="ei ei16 s-mac i-dots"></span></button>';
  acts.addEventListener('click', function(e){
    var b = e.target.closest('[data-h]'); if (!b) return;
    if (b.dataset.h === 'preview'){ pvOn = !pvOn; b.classList.toggle('on', pvOn); preview(); }
    else if (b.dataset.h === 'reset'){ vals[F().id] = JSON.parse(JSON.stringify(F().v)); render(); }
    else TUNER_INSP.menu(b, [{t: 'Only the selected blocks', cur: limit}, {t: 'Reset all functions'}], function(i){
      if (i === 0){ limit = !limit; preview(); }
      else { GROUPS.forEach(function(g){ g.fns.forEach(function(f){ vals[f.id] = JSON.parse(JSON.stringify(f.v)); }); }); render(); }
    });
  });
  // ↺ is live only when the function's values differ from its defaults
  function syncReset(){ var f = F(); acts.querySelector('[data-h="reset"]').disabled = JSON.stringify(vals[f.id]) === JSON.stringify(f.v); }

  // ——— interactions ———
  rail.addEventListener('click', function(e){
    var b = e.target.closest('.rbtn'); if (!b) return;
    cur.g = [].indexOf.call(rail.querySelectorAll('.rbtn'), b); sel = null; render();
  });
  inner.addEventListener('click', function(e){
    var fnb = e.target.closest('[data-fn]');
    if (fnb){ cur.f[cur.g] = +fnb.dataset.fn; sel = null; render(); return; }
    var a = e.target.closest('[data-act]');
    if (a){
      if (a.dataset.act === 'reset'){ vals[F().id] = JSON.parse(JSON.stringify(F().v)); render(); }
      else if (a.dataset.act === 'apply') apply(F().act || 'Apply');
      else apply(F().act2);
      return;
    }
    var row = e.target.closest('.irow'); if (!row) return;
    if (row.dataset.fold){ closed[row.dataset.fold] = !closed[row.dataset.fold]; render(); return; }
    if (row.classList.contains('off')) return;
    var r = inner._rows[+row.dataset.n], v = vals[F().id];
    if (sel !== row.dataset.key){ sel = row.dataset.key; inner.querySelectorAll('.irow.sel').forEach(function(x){ x.classList.remove('sel'); }); row.classList.add('sel'); }
    if (r.c === 'tgl'){ v[r.k] = !v[r.k]; render(); }
    else if (r.c === 'dd' && e.target.closest('[data-dd]'))
      TUNER_INSP.menu(e.target.closest('[data-dd]'), r.o.map(function(o){ return {t:o, cur: o === v[r.k]}; }), function(i){ v[r.k] = r.o[i]; render(); });
    else if (e.target.closest('[data-edit]')) edit(row, r, v);
  });
  // a value: typed in place; numbers must be numbers (an optional one may be left empty)
  function edit(row, r, v){
    var box = row.querySelector('[data-edit]'); if (box.classList.contains('editing')) return;
    var old = String(v[r.k]);
    box.classList.add('editing');
    box.querySelector('.v').outerHTML = '<input type="text" value="' + esc(old) + '" spellcheck="false">';
    var inp = box.querySelector('input'), done = false;
    inp.focus(); inp.select();
    inp.addEventListener('input', function(){ if (r.c !== 'num' || /^[-+]?\d*\.?\d*$/.test(inp.value.replace(',', '.'))){ v[r.k] = r.c === 'num' ? inp.value.replace(',', '.') : inp.value; preview(); } });
    function finish(ok){
      if (done) return; done = true;
      var x = inp.value.trim().replace(',', '.');
      if (!ok) v[r.k] = old;
      else if (r.c === 'num' && !(x === '' && r.opt) && !/^[-+]?\d*\.?\d+$/.test(x)) v[r.k] = old;
      else v[r.k] = r.c === 'num' ? (x === '' ? '' : String(+x)) : inp.value;
      render();
    }
    inp.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); finish(true); } if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); finish(false); } });
    inp.addEventListener('blur', function(){ finish(true); });
  }

  // the preview follows the program, the selection in it and the channel in focus
  function visible(){ return !body.hidden; }
  document.addEventListener('tuner:ops', function(){ if (visible() && !inner.querySelector('.editing')) preview(); });
  document.addEventListener('tuner:cursor', function(){ if (visible()) preview(); });
  document.addEventListener('tuner:view', function(){ if (visible()) preview(); });
  // a selection made in the code limits the edit: follow it as it is made
  ['mouseup', 'keyup'].forEach(function(t){ document.addEventListener(t, function(e){ if (visible() && e.target.classList && e.target.classList.contains('ed-ta')) preview(); }); });
  // leaving the Stream editor clears the tint
  new MutationObserver(function(){ var ed = editor(); if (!visible() && ed) ed.preview(null); else if (visible()) preview(); }).observe(body, {attributes: true, attributeFilter: ['hidden']});

  render();
})();
