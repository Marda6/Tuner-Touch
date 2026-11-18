// ENCY Tuner Touch — layout concepts A / B / C on one stand (low-fi, real touch sizes).
// One demo state of the project "Pipe bound" (Mori Seiki NL 2500 · Sinumerik 840D, two channels)
// in three moments: simulation stopped on an error · needs calculation after an edit · editing.
// The three concepts are assembled from the same parts, so they differ only in structure:
//   A «Порядок»          — the spec's structure, put in order (hierarchy, groups, plates on 3D)
//   B «Лента программы»  — operations become section headers inside the NC text
//   C «Пульт снизу»      — top = projects and files, bottom = the work; one key shows the next step
(function(){
  'use strict';

  // ——— stand state ———
  var S = {c:'A', res:'1280', st:'error', lang:'en', ann:true};
  try { Object.assign(S, JSON.parse(localStorage.getItem('touch.concepts') || '{}')); } catch(e){}
  function keep(){ try { localStorage.setItem('touch.concepts', JSON.stringify(S)); } catch(e){} }
  // screen + default touch settings per resolution (spec sect. 3: 16/32 and 19/38)
  var RES = {'1280': {w:1280, h:1024, font:16, icons:32}, '1920': {w:1920, h:1080, font:19, icons:38}};

  // ——— strings (the product speaks the Tuner languages; notes are for us, in Russian) ———
  function ruErr(n){ var a = n % 10, b = n % 100;
    return n + ' ' + (a === 1 && b !== 11 ? 'ошибка' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'ошибки' : 'ошибок'); }
  var STR = {
    en: {tuner:'Tuner window', open:'Open', calc:'Calculate', save:'Save', errors:function(n){ return n + (n === 1 ? ' error' : ' errors'); },
      paused:'Paused', needs:'Needs calculation', editing:'Editing', ch1:'Channel 1', ch2:'Channel 2', program:'Program',
      follow:'Follow', find:'Find', edit:'Edit', thisop:'This op', upto:'Up to op', all:'All ops', errs:'Errors', checks:'Checks',
      reset:'Reset', back:'Back', play:'Play', step:'Step', speed:'Speed', rotate:'Rotate', pan:'Pan', zoom:'Zoom', fit:'Fit',
      iso:'Iso', top:'Top', front:'Front', right:'Right', measure:'Measure', show:'Show', verify:'Verify compare',
      undo:'Undo', redo:'Redo', done:'Done', cancel:'Cancel', simOff:'Simulation is off while you edit',
      errT:'Holder collision', errD:'The tool holder hits the part', atErr:'Stopped on error', changed:'Program changed',
      editT:'Editing', editH:'Long press in the text: Cut · Copy · Paste'},
    ru: {tuner:'Окно Tuner', open:'Открыть', calc:'Рассчитать', save:'Сохранить', errors:ruErr,
      paused:'Пауза', needs:'Нужен расчёт', editing:'Правка', ch1:'Канал 1', ch2:'Канал 2', program:'Программа',
      follow:'Следить', find:'Найти', edit:'Править', thisop:'Текущая', upto:'До текущей', all:'Все', errs:'Ошибки', checks:'Проверки',
      reset:'Сброс', back:'Назад', play:'Пуск', step:'Шаг', speed:'Скорость', rotate:'Вращать', pan:'Сдвиг', zoom:'Масштаб', fit:'Вписать',
      iso:'Изо', top:'Сверху', front:'Спереди', right:'Справа', measure:'Измерить', show:'Показать', verify:'Verify Compare',
      undo:'Отменить', redo:'Повторить', done:'Готово', cancel:'Отмена', simOff:'Моделирование недоступно во время правки',
      errT:'Столкновение державки', errD:'Державка задевает деталь', atErr:'Стоп на ошибке', changed:'Программа изменена',
      editT:'Правка', editH:'Долгое нажатие в тексте: вырезать · копировать · вставить'}
  };
  var T = STR.en;

  // ——— icons: low-fi glyphs on a 24 grid (the build will take Tuner's sprites) ———
  var P = {
    tuner:'<path d="M20 12H5M11 6l-6 6 6 6"/>', plus:'<path d="M12 5v14M5 12h14"/>', chevD:'<path d="M7 10l5 5 5-5"/>',
    save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8.5 4v4.5h6.5V4M8 20v-6h8v6"/>', lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2"/>',
    min:'<path d="M6 12h12"/>', close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', x:'<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>',
    calc:'<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>', play:'<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    back:'<path d="M18.5 5v14L8.5 12z" fill="currentColor" stroke="none"/><rect x="5" y="5" width="2.6" height="14" rx="1" fill="currentColor" stroke="none"/>',
    step:'<path d="M5.5 5v14l10-7z" fill="currentColor" stroke="none"/><rect x="16.4" y="5" width="2.6" height="14" rx="1" fill="currentColor" stroke="none"/>',
    reset:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4h4"/><rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" stroke="none"/>',
    thisop:'<path d="M4 6h16" opacity=".4"/><rect x="4" y="10" width="16" height="5" rx="1.5"/><path d="M4 19h16" opacity=".4"/>',
    upto:'<path d="M4 5.5h16M4 10h16"/><rect x="4" y="14" width="16" height="5" rx="1.5"/>', all:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevL:'<path d="M14.5 6l-6 6 6 6"/>', chevR:'<path d="M9.5 6l6 6-6 6"/>', checks:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.3v.2"/>',
    rotate:'<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19.5 4.5v4h-4"/>',
    pan:'<path d="M12 3v18M3 12h18M9.5 5.5L12 3l2.5 2.5M9.5 18.5L12 21l2.5-2.5M5.5 9.5L3 12l2.5 2.5M18.5 9.5L21 12l-2.5 2.5"/>',
    zoom:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20M10.5 7.5v6M7.5 10.5h6"/>', fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    iso:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    top:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16"/><rect x="5" y="5" width="14" height="4" fill="currentColor" stroke="none" opacity=".5"/>',
    front:'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="7.5" y="7.5" width="9" height="9" fill="currentColor" stroke="none" opacity=".5"/>',
    right:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M14 4v16"/><rect x="15" y="5" width="4" height="14" fill="currentColor" stroke="none" opacity=".5"/>',
    measure:'<path d="M3.5 16.5l13-13 4 4-13 13z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    verify:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" opacity=".6"/>',
    find:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>', edit:'<path d="M15 4.5l4.5 4.5L9 19.5H4.5V15z"/><path d="M13 6.5l4.5 4.5"/>',
    follow:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    undo:'<path d="M8.5 6.5L4 11l4.5 4.5"/><path d="M4.5 11H15a5 5 0 0 1 0 10h-3"/>', redo:'<path d="M15.5 6.5L20 11l-4.5 4.5"/><path d="M19.5 11H9a5 5 0 0 0 0 10h3"/>',
    pgUp:'<path d="M7 12l5-5 5 5M7 18l5-5 5 5"/>', pgDn:'<path d="M7 6l5 5 5-5M7 12l5 5 5-5"/>', done:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    sDone:'<circle cx="12" cy="12" r="10" fill="rgba(0,203,154,.18)" stroke="none"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#00cb9a"/>',
    sErr:'<circle cx="12" cy="12" r="10" fill="#ff5c5e" stroke="none"/><path d="M12 6.8v6.4" stroke="#fff" stroke-width="2.4"/><circle cx="12" cy="17" r="1.4" fill="#fff" stroke="none"/>',
    sNone:'<circle cx="12" cy="12" r="9" stroke="rgba(245,245,245,.32)"/><path d="M8.5 12h7" stroke="rgba(245,245,245,.4)"/>',
    mOp:'<path d="M7 3.5h10v17l-5-4-5 4z" fill="#00cb9a" stroke="none"/>', mTick:'<path d="M5 12.5l4.5 4.5L19 7.5" stroke="#00cb9a" stroke-width="2.2"/>',
    mIdle:'<path d="M6 12h12" stroke="#00cb9a" stroke-width="2.4"/>', mChg:'<circle cx="12" cy="12" r="4.5" fill="#ebc14a" stroke="none"/>',
    mGouge:'<path d="M12 2.5l10 17.5H2z" fill="#ff7a4d" stroke="none"/><path d="M12 9v5" stroke="#1a0a00" stroke-width="2.4"/><circle cx="12" cy="17" r="1.3" fill="#1a0a00" stroke="none"/>'
  };
  function ic(n, cls){ return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + P[n] + '</svg>'; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]; }); }
  // a button: label, icon, extra classes, annotation number
  function B(label, icon, cls, n){
    return '<button class="b ' + (cls || '') + '"' + (n ? ' data-n="' + n + '"' : '') + '>' + (icon ? ic(icon) : '') + (label ? '<span>' + esc(label) + '</span>' : '') + '</button>';
  }
  function N(n){ return n ? ' data-n="' + n + '"' : ''; }

  // ——— the demo project: channel 1 of "Pipe bound" ———
  var OPS = [
    {n:'OD grooving',     tool:'T6 · La4 Re0.2',      c:'--op-blue',   st:'done', f:18},
    {n:'OD finishing',    tool:'T10 · CNMG-12',       c:'--op-green',  st:'done', f:22},
    {n:'ID roughing',     tool:'T4 · Custom',         c:'--op-coral',  st:'err',  f:26},
    {n:'Hole chamfer 5D', tool:'T7 · Drill L50, D10', c:'--op-violet', st:'err',  f:20},
    {n:'2D contouring',   tool:'T1 · Cylindrical',    c:'--op-yellow', st:'none', f:16},
    {n:'ID grooving',     tool:'T8 · Custom',         c:'--op-blue',   st:'none', f:12}
  ];
  var CUR_OP = 3, CUR_AT = 0.36;   // simulation stands in op 4 at 36 % of it (the holder collision)
  var TEXT = [
    [2, 'N3170G0X160Z2'], [2, 'N3175G1X150F0.15'], [2, 'N3180Z-80'], [2, 'N3185G0X200Z50M5'],
    [3, ';ID roughing'], [3, 'N3200T4D1'], [3, 'N3205G96S180M4'], [3, 'N3210G0X38Z5'], [3, 'N3215G1Z-62F0.25'], [3, 'N3220X42'],
    [3, 'N3225G0Z5'], [3, 'N3230X44'], [3, 'N3235G1Z-62F0.25'], [3, 'N3240X48', 'gouge'], [3, 'N3245G0Z5'], [3, 'N3250X50'],
    [3, 'N3255G1Z-48F0.25'], [3, 'N3260G0X40Z10'], [3, 'N3265M5'],
    [4, ';Hole chamfer 5D'], [4, 'N3290T7'], [4, 'N3295G97S3=10600M3=3'], [4, 'N3300G0SPOS[1]=IC(-240)'], [4, 'N3305Z10'], [4, 'N3310X148'],
    [4, 'N3315Z-159.787', 'holder'], [4, 'N3320SPOS[1]=210'], [4, 'N3325X112.04'], [4, 'N3330X94.04'], [4, 'N3335G1X89.984M8F200'],
    [4, 'N3340G0X112.04'], [4, 'N3345Z-120.5'], [4, 'N3350X96.2'], [4, 'N3355G1X92.1F150'], [4, 'N3360G0X148'], [4, 'N3365Z10M9'],
    [5, ';2D contouring'], [5, 'N3370T1D1'], [5, 'N3375G96S220M4'], [5, 'N3380G0X152Z2'], [5, 'N3385G1X140F0.2'], [5, 'N3390Z-40'],
    [5, 'N3395G2X150Z-45CR=5'], [5, 'N3400G1X160'], [5, 'N3405G0X200Z50'],
    [6, ';ID grooving'], [6, 'N3410T8D1'], [6, 'N3415G96S120M4'], [6, 'N3420G0X40Z5'], [6, 'N3425Z-30'], [6, 'N3430G1X46F0.08'],
    [6, 'N3435G0X40'], [6, 'N3440Z5M9'], [6, 'N3445M30']
  ];
  var CUR_LINE = 25;   // N3315 — stopped on the holder collision
  // after calculation Tuner colours a block by what it does (rapid / feed / arc / spindle and aux / quiet)
  function kinds(){
    var m = 0;
    return TEXT.map(function(r){
      var t = r[1];
      if (t[0] === ';') return 'cmt';
      var g = t.match(/G0?([0-3])(?![0-9])/); if (g) m = +g[1];
      if (/SPOS|M\d|S\d|T\d/.test(t) && !/[XZ]-?\d/.test(t)) return 'aux';
      if (/[XZ]-?\d/.test(t)) return m === 0 ? 'rapid' : m === 1 ? 'feed' : 'arc';
      return 'aux';
    });
  }
  var KIND = kinds();
  // before calculation — like Tuner before calculation: numbers, words and comments in their own colours
  function syntax(t){
    if (t[0] === ';') return '<span class="y-cmt">' + esc(t) + '</span>';
    return esc(t).replace(/^(N\d+)/, '<span class="y-n">$1</span>')
      .replace(/(-?\d+(?:\.\d+)?)(?![^<]*>)/g, '<span class="y-num">$1</span>');
  }

  // ——— parts ———
  function stateBlock(st, n){
    if (st === 'needs') return '<div class="state amber"' + N(n) + '><span>' + T.needs + '</span>' + B(T.calc, 'calc', 'pri') + '</div>';
    if (st === 'edit')  return '<div class="state amber"' + N(n) + '><span>' + T.editing + '</span>' + B(T.calc, 'calc') + '</div>';
    return '<div class="state"' + N(n) + '><span>' + T.paused + '</span>' + B(T.calc, 'calc') + '</div>';
  }
  function errBadge(st, n){ return st === 'error' ? B(T.errors(2), 'sErr', 'warn', n) : ''; }
  function saveSplit(st){
    var on = st !== 'error' ? ' on' : '';
    return '<div class="split">' + B(T.save, 'save', 'split-l' + on) + B('', 'chevD', 'split-r' + on) + '</div>';
  }
  function windowBtns(){ return '<span class="vdiv"></span>' + B('', 'min', 'ghost sq') + B('', 'close', 'ghost sq'); }

  var TABS = [{n:'Pipe bound', cur:true}, {n:'Shaft flange', s:'45 %'}, {n:'Housing 5-axis', d:true}];
  function tabs(st){
    return TABS.map(function(t){
      var dirty = t.d || (t.cur && st !== 'error');
      return '<div class="tab' + (t.cur ? ' cur' : '') + '"><span class="tab-n">' + esc(t.n) + '</span>' +
        (t.s ? '<span class="tab-s">' + t.s + '</span>' : '') + (dirty ? '<span class="tab-d"></span>' : '') +
        '<span class="tab-x">' + ic('x') + '</span></div>';
    }).join('');
  }

  function top(c, st){
    var h = B(T.tuner, 'tuner', 'ghost');
    if (c === 'C'){
      h += '<div class="tabs-in"' + N(1) + '>' + tabs(st) + '</div>' + B('', 'plus', 'ghost sq') + '<span class="sp"></span>' + errBadge(st, 2);
    } else {
      h += '<div class="title"><b>Pipe bound</b><span>Mori Seiki NL 2500 · Sinumerik 840D</span></div>' +
        errBadge(st, c === 'A' ? 3 : 0) + stateBlock(st, c === 'A' ? 2 : 0);
    }
    return '<header class="cx-top">' + h + saveSplit(st) + B('', 'lock', 'ghost sq') + windowBtns() + '</header>';
  }
  function tabsRow(c, st){ return '<nav class="cx-tabs">' + tabs(st) + B(T.open, 'plus', 'ghost tab-add', c === 'A' ? 1 : 0) + '</nav>'; }

  // statuses come from the last simulation: once the program changed, every operation is "not simulated"
  var SIM_VALID = true;
  function opRow(o, i, cls, extra){
    var st = SIM_VALID ? o.st : 'none';
    return '<div class="op' + (cls ? ' ' + cls : '') + '" style="--c:var(' + o.c + ')"><span class="op-c"></span>' +
      '<span class="op-t"><b>' + esc(o.n) + '</b><span>' + esc(o.tool) + '</span></span>' + (extra || '') +
      ic(st === 'done' ? 'sDone' : st === 'err' ? 'sErr' : 'sNone', 'op-s') + '</div>';
  }
  function opsList(n){
    // five rows visible, scrolled by one so the current operation shows; the indicator tells there is more
    return '<div class="ops"' + N(n) + ' style="height:calc(var(--t-row) * 5)"><div style="transform:translateY(calc(var(--t-row) * -1))">' +
      OPS.map(function(o, i){ return opRow(o, i, i === CUR_OP ? 'sel' : ''); }).join('') +
      '</div><span class="track"><i style="top:16.7%;height:83.3%"></i></span></div>';
  }
  // channels, then the program of the channel: its file name is the button of the program menu —
  // everything in that menu acts on this file (open another one instead, Split, save as)
  function panelHead(c, n){
    return '<div class="ph"><div class="grp">' + B(T.ch1, '', 'on') + B(T.ch2, '') + '</div><span class="sp"></span>' +
      B('PipeBound_ch1.mpf', 'chevD', 'trail', n) + '</div>';
  }
  function codeHead(n){
    return '<div class="ph"' + N(n) + '>' + B(T.follow, 'follow', 'on') + '<span class="sp"></span>' + B(T.find, 'find') + B(T.edit, 'edit') + '</div>';
  }
  function editHead(){
    return '<div class="ph edit"><div class="ph-file"><b>' + T.editT + '</b>PipeBound_ch1.mpf</div>' + B(T.cancel, '') + B(T.done, 'done', 'pri') + '</div>' +
      '<div class="ph" style="height:auto;padding-top:6px;padding-bottom:6px">' + B(T.undo, 'undo') + B(T.redo, 'redo', 'dis') +
      '<span class="ph-file" style="white-space:normal">' + T.editH + '</span></div>';
  }

  // the NC text: marks column + text; `ops` true puts operation headers into the text (B)
  function code(st, opsInText, nPager){
    var after = st === 'error', h = '', anchor = false;
    TEXT.forEach(function(r, i){
      var op = r[0], t = r[1], err = r[2], k = KIND[i];
      if (opsInText && t[0] === ';'){
        var o = OPS[op - 1];
        h += '<div' + (op - 1 === CUR_OP ? ' data-anchor="top"' : '') + (op - 1 === CUR_OP + 1 ? ' data-n="2"' : '') + '>' +
          opRow(o, op - 1, 'hdr' + (after && op - 1 === CUR_OP ? ' sel' : '')) + '</div>';
      }
      var simulated = after && (op - 1 < CUR_OP || (op - 1 === CUR_OP && i <= CUR_LINE));
      var mk = '', cls = '', txt;
      if (after){
        if (t[0] === ';') mk = ic('mOp');
        else if (err === 'holder' && i <= CUR_LINE) mk = '<svg viewBox="0 0 24 24">' + P.sErr + '</svg>';
        else if (err === 'gouge' && simulated) mk = '<svg viewBox="0 0 24 24">' + P.mGouge + '</svg>';
        else if (simulated) mk = ic(k === 'rapid' ? 'mIdle' : 'mTick');
        txt = '<span class="k-' + k + '">' + esc(t) + '</span>';
      } else {
        if (t[0] === ';') mk = ic('mOp');
        if (i === CUR_LINE){ t = 'N3315Z-155.'; mk = '<svg viewBox="0 0 24 24">' + P.mChg + '</svg>'; cls = ' chg'; }
        txt = syntax(t) + (st === 'edit' && i === CUR_LINE ? '<span class="caret"></span>' : '');
      }
      if (after && i === CUR_LINE) cls = ' cur';
      var isAnchor = !opsInText && i === CUR_LINE;
      h += '<div class="ln' + cls + '"' + (isAnchor ? ' data-anchor="cur"' : '') + '><span class="mk">' + mk + '</span>' + txt + '</div>';
      if (after && i === CUR_LINE)
        h += '<div class="edesc"><div><b>' + T.errT + '</b> · Hole chamfer 5D · T7 Drill L50, D10</div><div>' + T.errD + '</div></div>';
    });
    var pin = opsInText && st !== 'edit'
      ? '<div class="pinbox" data-n="1">' + opRow(OPS[CUR_OP], CUR_OP, 'hdr pinned' + (after ? ' sel' : ''), '<span class="op-more">' + (CUR_OP + 1) + ' / ' + OPS.length + ' ▾</span>') + '</div>' : '';
    return '<div class="code">' + pin + '<div class="code-in">' + h + '</div>' +
      '<span class="track"><i style="top:71%;height:7%"></i></span>' +
      '<div class="pager"' + N(nPager) + '>' + B('', 'pgUp', 'sq') + B('', 'pgDn', 'sq') + '</div></div>';
  }

  function left(c, st){
    var h = '';
    if (st === 'edit') h = editHead() + code(st, false);
    else if (c === 'B') h = panelHead(c, 4) + codeHead() + code(st, true);
    else {
      if (c === 'C') h += '<div class="ph-info"' + N(6) + '>Mori Seiki NL 2500 · Sinumerik 840D · Pipe bound.snct</div>';
      h += panelHead(c, c === 'A' ? 4 : 0) + opsList(c === 'A' ? 5 : 0) + codeHead(c === 'A' ? 6 : 0) + code(st, false, c === 'A' ? 7 : 0);
    }
    return '<section class="cx-left">' + h + '</section>';
  }

  // a schematic lathe: chuck, bar, turret with the drill, tailstock; the ring marks the error place
  function scene(st){
    var f = 'rgba(245,245,245,', h = '<svg class="scene" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice">';
    for (var i = 0; i < 14; i++) h += '<path d="M' + (i * 90 - 120) + ' 800L' + (300 + i * 40) + ' 380" stroke="' + f + '.05)"/>';
    for (var j = 0; j < 6; j++) h += '<path d="M0 ' + (470 + j * 60) + 'H1000" stroke="' + f + '.05)"/>';
    h += '<path d="M120 560L880 560L960 690L60 690z" fill="' + f + '.06)" stroke="' + f + '.12)"/>' +
      '<rect x="150" y="290" width="150" height="250" rx="18" fill="' + f + '.16)" stroke="' + f + '.24)"/>' +
      '<rect x="285" y="330" width="30" height="40" fill="' + f + '.24)"/><rect x="285" y="460" width="30" height="40" fill="' + f + '.24)"/>' +
      '<rect x="300" y="370" width="330" height="90" fill="' + f + '.20)" stroke="' + f + '.3)"/><ellipse cx="630" cy="415" rx="16" ry="45" fill="' + f + '.26)"/>' +
      '<path d="M760 450L900 450L920 560L740 560z" fill="' + f + '.14)" stroke="' + f + '.22)"/><path d="M690 415L760 395L760 435z" fill="' + f + '.24)"/>' +
      '<path d="M470 110L610 110L660 170L660 250L610 300L470 300L420 250L420 170z" fill="' + f + '.14)" stroke="' + f + '.24)"/>' +
      '<rect x="525" y="295" width="36" height="58" fill="' + f + '.28)"/><rect x="537" y="350" width="12" height="40" fill="' + f + '.45)"/>';
    if (st === 'error'){
      h += '<path d="M760 230L620 300L548 382" fill="none" stroke="#ff8384" stroke-width="3" stroke-dasharray="10 8" opacity=".8"/>' +
        '<circle cx="545" cy="368" r="62" fill="none" stroke="#ff5c5e" stroke-width="5"/><circle cx="545" cy="368" r="62" fill="none" stroke="#ff5c5e" stroke-width="16" opacity=".18"/>';
    }
    return h + '</svg>';
  }
  function view(c, st){
    var h = '<div class="v3d">' + scene(st);
    if (st === 'edit') h += '<div class="dim">' + T.simOff + '</div>';
    else h +=
      '<div class="ov at-tl"' + N(c === 'A' ? 8 : 0) + '>' + B(T.rotate, 'rotate', 'vb on') + B(T.pan, 'pan', 'vb') + B(T.zoom, 'zoom', 'vb') + '</div>' +
      '<div class="ov at-tr">' + B(T.show, 'eye', 'vb') + B(T.verify, 'verify', 'vb tgl') + '</div>' +
      '<div class="ov at-bl">' + B(T.fit, 'fit', 'vb') + '<span class="sep"></span>' + B(T.iso, 'iso', 'vb') + B(T.top, 'top', 'vb') +
        B(T.front, 'front', 'vb') + B(T.right, 'right', 'vb') + '</div>' +
      '<div class="ov at-br">' + B(T.measure, 'measure', 'vb') + '</div>';
    h += '</div>';
    // the timeline: operations by blocks, names inside, the simulated part brighter
    var total = OPS.reduce(function(a, o){ return a + o.f; }, 0), before = 0, segs = '';
    OPS.forEach(function(o, i){
      var cls = 'seg', inner = '';
      if (st === 'error'){ if (i < CUR_OP) cls += ' done'; else if (i === CUR_OP) inner = '<i style="width:' + CUR_AT * 100 + '%"></i>'; }
      segs += '<div class="' + cls + '" style="flex:' + o.f + ';--c:var(' + o.c + ')">' + inner + '<span>' + esc(o.n) + '</span></div>';
      if (i < CUR_OP) before += o.f;
    });
    var pos = st === 'error' ? (before + OPS[CUR_OP].f * CUR_AT) / total * 100 : 0;
    h += '<div class="tl' + (st === 'error' ? '' : ' off') + '"' + N(c === 'A' ? 9 : c === 'B' ? 3 : 0) + '><div class="tl-tr">' + segs +
      '<span class="thumb" style="left:' + pos + '%"></span></div></div>';
    return '<section class="cx-view">' + h + '</section>';
  }

  function enav(off){
    return '<div class="enav">' + B('', 'chevL', 'st sq' + off) + '<div class="enav-c"><b>' + (off ? '—' : '1 / 2') + '</b><span>' + T.errs + '</span></div>' +
      B('', 'chevR', 'st sq' + off) + '</div>';
  }
  function fast(off){ return '<div class="grp">' + B(T.thisop, 'thisop', 'st' + off) + B(T.upto, 'upto', 'st' + off) + B(T.all, 'all', 'st' + off) + '</div>'; }
  function speed(off){ return '<div class="speed' + (off ? ' b dis' : '') + '" style="' + (off ? 'background:none;height:auto;padding:0' : '') + '"><span>' + T.speed +
    '</span><div class="speed-tr"><i style="width:55%"></i><b style="left:55%"></b></div></div>'; }
  function bar(c, st){
    if (st === 'edit') return keyboard();
    var off = st === 'error' ? '' : ' dis';
    if (c === 'C'){
      var cs = st === 'error'
        ? '<div class="cstate red" style="--c:var(--th-red)"' + N(3) + '><b>' + T.atErr + '</b><span>N3315 · Hole chamfer 5D</span></div>'
        : '<div class="cstate amber" style="--c:var(--ec-amber)"' + N(3) + '><b>' + T.needs + '</b><span>' + T.changed + '</span></div>';
      return '<footer class="cx-bar">' + cs +
        (st === 'error' ? B(T.play, 'play', 'st pri play', 4) : B(T.calc, 'calc', 'st pri play', 4)) +
        B(T.back, 'back', 'st' + off) + B(T.step, 'step', 'st' + off) + enav(off) + fast(off) + speed(off) + B(T.checks, 'checks', 'st') +
        '<span class="sp"></span>' + B(T.reset, 'reset', 'st' + off, 5) + '</footer>';
    }
    var a = c === 'A';
    // Tuner's order (fast · errors · checks · reset · back play step · speed), but Reset — it throws the
    // simulated stock away — stays with the rare ones on the left, the free space keeps it off Back
    return '<footer class="cx-bar">' + fast(off) + '<div' + N(a ? 12 : 0) + '>' + enav(off) + '</div>' + B(T.checks, 'checks', 'st') +
      B(T.reset, 'reset', 'st' + off, a ? 11 : 0) + '<span class="sp"></span>' +
      '<div style="display:flex;gap:var(--t-gap)">' + B(T.back, 'back', 'st' + off) + B(T.play, 'play', 'st pri play' + off, a ? 10 : 0) + B(T.step, 'step', 'st' + off) + '</div>' +
      speed(off) + '</footer>';
  }
  function keyboard(){
    var rows = [['Esc','`','1','2','3','4','5','6','7','8','9','0','-','=','⌫'], ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
      ['Caps','a','s','d','f','g','h','j','k','l',';','\'','Enter'], ['Shift','z','x','c','v','b','n','m',',','.','/','↑','Shift'],
      ['Fn','Ctrl','⊞','Alt','','Alt','Ctrl','←','↓','→']];
    return '<div class="kbd">' + rows.map(function(r){
      return '<div class="kbd-r">' + r.map(function(k){
        var cls = k === '' ? 'w6' : k === 'Enter' ? 'ent w2' : k.length > 1 && k !== '⌫' ? 'w2' : '';
        return '<i class="' + cls + '">' + esc(k) + '</i>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }

  // ——— notes (for the review, in Russian) ———
  var NOTES = {
    A: {name:'A · «Порядок»',
      lead:'Структура ТЗ остаётся — она знакома по Tuner и понятна согласующим. Меняется иерархия: что главное, что рядом, что опасное.',
      items:[
        '«Открыть» стало «+ Open» после вкладок: открыть проект — значит открыть вкладку. Из верхней полосы ушла кнопка.',
        'Состояние и «Рассчитать» — одним блоком: слово о том, что с программой, и действие с ней рядом. Когда нужен расчёт, блок жёлтый, а «Рассчитать» — единственная зелёная кнопка наверху.',
        'Счётчик ошибок — наверху (разд. 7, п. 5), касание — первая ошибка.',
        'Имя файла программы канала — это кнопка её меню «▾»: «Открыть программу…», «Split…», «Сохранить программу как…». Всё, что заменяет, — здесь, за лишним касанием и с подтверждением (правило 10); переключатель каналов рядом ничего не ломает.',
        'Операции — 5 строк по 48 с указателем положения; текущая выделена.',
        'Над текстом: «Следить» слева, «Найти» и «Править» справа — с подписями. «Править» больше не стоит в углу один.',
        'Страница вверх/вниз — у правого края текста, рядом с указателем положения.',
        'Инструменты вида — плашками по углам 3D (режим пальца · вписать и виды · показать и Verify Compare · измерить). Два столбца кнопок ушли, середина сцены свободна.',
        'Шкала подписана операциями; меток ошибок на ней нет (разд. 7).',
        '«Пуск» — единственная зелёная кнопка пульта и шире остальных.',
        '«Сброс» (в начало со сбросом заготовки) — среди редких кнопок слева; от «Назад» и «Пуска» его отделяет свободное место.',
        'Навигатор ошибок «‹ 1 / 2 ›» вместо двух красных кнопок: видно, на какой ошибке стоишь. Не красный — это переход, а не опасное действие.'],
      pro:'Минимум споров при согласовании; порядок пульта как у панели Tuner.',
      con:'В одной колонке две прокрутки (операции и текст); текста видно меньше, чем в B.'},
    B: {name:'B · «Лента программы»',
      lead:'Операции — это участки программы. Вместо отдельного списка — заголовки операций прямо в тексте УП и подписанная шкала. Остальное — как в A.',
      items:[
        'Заголовок текущей операции прилипает к верху текста: имя, инструмент, состояние, «4 / 6 ▾». Касание — список всех операций поверх текста (выбрать, долгое нажатие — «Моделировать эту / до этой»).',
        'Следующие операции — такими же заголовками в тексте: видно, где кончается одна и начинается другая.',
        'Шкала подписана операциями и служит обзором программы: касание участка — к началу операции.',
        'Меню программы (имя файла ▾) — как в A.'],
      pro:'Одна прокрутка вместо двух; текста видно заметно больше — контекст ошибки целиком; операция и её строки рядом.',
      con:'Состояния всех операций сразу не видны — только на шкале и в списке по касанию. Для десктопа ты такой вариант отклонял — на таче место дороже, поэтому показываю.'},
    C: {name:'C · «Пульт снизу»',
      lead:'Экран делится по смыслу: верх — проекты и окно, низ — работа с программой. Главная кнопка пульта показывает следующий шаг: «Рассчитать» → «Отмена 45 %» → «Пуск» / «Пауза». Левая панель — как в A.',
      items:[
        'Вкладки проектов — в верхней полосе (как в обычном Tuner), «+» — открыть. Строка вкладок ушла: +48 px на работу.',
        'Счётчик ошибок остаётся наверху (разд. 7, п. 5).',
        'Состояние программы — слева на пульте: одним взглядом от руки понятно, что происходит и что делать.',
        'Одна главная кнопка на месте «Пуска»: нужен расчёт — она «Рассчитать», идёт расчёт — «Отмена», рассчитано — «Пуск».',
        '«Сброс» — в дальнем правом углу, далеко от «Пуска».',
        'Станок, стойка и файл проекта — строкой над каналами: верхняя полоса освободилась под вкладки.'],
      pro:'Спокойная верхняя полоса; больше места под текст и 3D; состояние и действие — в одном месте у руки.',
      con:'«Рассчитать» не в верхней полосе (в ТЗ разд. 3 — «всегда»; здесь — всегда на пульте, это надо согласовать); порядок пульта отличается от панели Tuner; при многих проектах вкладки сжимаются.'}
  };
  var COMMON = [
    'Кнопки без рамок: кнопку выдаёт заливка, нажатие — заливка сильнее. Зелёная заливка — только у главного действия зоны.',
    'Подписи 15 px у всех значков (правило 2 и 9) — в макетах ТЗ они 11 px.',
    'Скорость — короткий тонкий ползунок без чисел; на шкалу не похож.',
    'Ошибка: строка с её значком, описание под строкой, кольцо в 3D (разд. 7, п. 5).',
    'Цвета — слои Graphite из Core; значки здесь условные, в сборке — спрайты Tuner.'
  ];
  function notes(){
    var n = NOTES[S.c];
    return '<h2>' + n.name + '</h2><p class="lead">' + n.lead + '</p><div class="metrics" id="metrics"></div>' +
      '<h3>Что здесь сделано</h3><ol>' + n.items.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ol>' +
      '<p class="pro"><b>Плюсы.</b> ' + n.pro + '</p><p class="con"><b>Минусы.</b> ' + n.con + '</p>' +
      '<h3>Общее для всех трёх</h3><ul>' + COMMON.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }

  // ——— render ———
  var screen = document.getElementById('screen'), box = document.getElementById('stageBox'),
      stage = document.getElementById('stage'), notesEl = document.getElementById('notes'), scale = 1;

  function render(){
    T = STR[S.lang];
    var r = RES[S.res], st = S.st, c = S.c;
    SIM_VALID = st === 'error';
    screen.innerHTML = '<div class="tt cx" data-c="' + c + '" data-s="' + st + '" style="--kf:' + r.font / 16 + ';--ki:' + r.icons / 32 + '">' +
      top(c, st) + (c === 'C' ? '' : tabsRow(c, st)) + left(c, st) + view(c, st) + bar(c, st) + '</div>';
    screen.style.width = r.w + 'px'; screen.style.height = r.h + 'px';
    notesEl.innerHTML = notes();
    fit();
    placeCode();
    badges();
    metrics();
    document.querySelectorAll('[data-set]').forEach(function(b){
      var kv = b.getAttribute('data-set').split('='); b.classList.toggle('on', String(S[kv[0]]) === kv[1]);
    });
    document.getElementById('annBtn').classList.toggle('on', S.ann);
  }
  // the text stands so the current line is at ~30 % of the height (B: the current section starts under its pinned header)
  function placeCode(){
    screen.querySelectorAll('.code').forEach(function(code){
      var inn = code.querySelector('.code-in'), a = inn.querySelector('[data-anchor]'), H = code.clientHeight;
      if (!a) return;
      var t = a.getAttribute('data-anchor') === 'top' ? a.offsetTop : a.offsetTop - Math.round(H * 0.3);
      inn.style.top = -Math.max(0, Math.min(t, inn.scrollHeight - H)) + 'px';
    });
  }
  function fit(){
    var r = RES[S.res], aw = stage.clientWidth - 32, ah = stage.clientHeight - 32;
    scale = Math.min(1, aw / r.w, ah / r.h);
    screen.style.transform = 'scale(' + scale + ')';
    box.style.width = Math.round(r.w * scale) + 'px'; box.style.height = Math.round(r.h * scale) + 'px';
    document.getElementById('zoom').textContent = Math.round(scale * 100) + ' %';
  }
  function badges(){
    screen.querySelectorAll('.n-badge').forEach(function(b){ b.remove(); });
    if (!S.ann) return;
    var sr = screen.getBoundingClientRect();
    screen.querySelectorAll('[data-n]').forEach(function(el){
      var r = el.getBoundingClientRect(), b = document.createElement('span');
      b.className = 'n-badge'; b.textContent = el.getAttribute('data-n');
      b.style.left = (r.left - sr.left) / scale + 'px'; b.style.top = (r.top - sr.top) / scale + 'px';
      screen.appendChild(b);
    });
  }
  function metrics(){
    var m = document.getElementById('metrics'), q = function(s){ return screen.querySelector(s); };
    var code = q('.code'), v = q('.v3d'), row = q('.ln'), ops = q('.ops');
    var rows = code && row ? Math.floor((code.clientHeight - (q('.code .pinbox') ? q('.code .pinbox').offsetHeight : 0)) / row.offsetHeight) : 0;
    m.innerHTML = '<span>Текст УП</span><b>' + rows + ' строк</b>' +
      '<span>Операции</span><b>' + (ops ? Math.round(ops.clientHeight / q('.op').offsetHeight) + ' строк списком' : S.c === 'B' && S.st !== 'edit' ? 'заголовками в тексте' : '—') + '</b>' +
      '<span>3D</span><b>' + v.clientWidth + ' × ' + v.clientHeight + ' px</b>' +
      '<span>Экран</span><b>' + RES[S.res].w + ' × ' + RES[S.res].h + ', шрифт ' + RES[S.res].font + ' · значки ' + RES[S.res].icons + '</b>';
  }

  document.querySelector('.dev').addEventListener('click', function(e){
    var b = e.target.closest('[data-set]');
    if (b){ var kv = b.getAttribute('data-set').split('='); S[kv[0]] = kv[1]; keep(); render(); return; }
    if (e.target.closest('#annBtn')){ S.ann = !S.ann; keep(); render(); }
  });
  window.addEventListener('resize', function(){ fit(); badges(); });
  // fonts can arrive after the first layout — place the text and badges again
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ placeCode(); badges(); metrics(); });
  render();
})();
