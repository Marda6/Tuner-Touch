// ENCY Tuner Touch — core: strings, events and the open projects.
// The touch interface works on the projects open in Tuner — the same tabs (sect. 7, item 9); Tuner
// calculates and simulates, this window shows it. Here Tuner is simulated: a calculation runs on a
// timer, the active one faster. Events (TT.on / TT.emit):
//   'projects' — the list or a project changed · 'active' — another tab became current
//   'lang' — language switched · 'viewonly' — the lock changed · 'toast' — a notification to show
window.TT = (function(){
  'use strict';

  function load(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
  function keep(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

  // ——— events ———
  var ev = {};
  function on(n, f){ (ev[n] = ev[n] || []).push(f); }
  function emit(n, d){ (ev[n] || []).slice().forEach(function(f){ f(d); }); }

  // ——— strings: through one table, the languages of Tuner (rule 6.14); English and Russian here ———
  function ruN(n, one, few, many){ var a = n % 10, b = n % 100;
    return n + ' ' + (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many); }
  var STR = {
    en: {
      s_this:'This op', s_upto:'Up to op', s_end:'To end', s_errs:'Errors', s_noErr:'No errors', s_errAt:'{i} / {n}', s_prev:'Previous error', s_next:'Next error',
      s_checks:'Checks', s_reset:'Reset', s_back:'Back', s_play:'Play', s_pause:'Pause', s_step:'Step', s_speed:'Speed',
      c_holder:'Holder collisions', c_machine:'Machine collisions', c_gouge:'Gouges', c_stopErr:'Stop on error', c_smooth:'Smooth motion',
      c_smooth_d:'Off — block by block', t_end:'End of program · {name}', t_noNext:'No more errors ahead', t_noPrev:'No errors before this block',
      t_reset:'Back to the start — the stock is reset', tl_aria:'Simulation timeline',
      pg_start:'Program start', all_shut:'Fold all operations', all_open:'Unfold all operations',
      chl:'Channel', program:'Program', ch:'Channel {n}', follow:'Follow', find:'Find', edit:'Edit', pgUp:'Page up', pgDn:'Page down', ops_t:'Operations',
      m_open:'Open program…', m_open_d:'Replace this channel’s program with a file', m_split:'Split…', m_split_d:'Build the operations of all channels again from the text',
      op_sim:'Simulate this operation', op_upto:'Simulate up to this operation', ln_upto:'Simulate up to this line',
      q_split:'Replace operations and tools from the NC text?', q_split_d:'Tuner deletes the operations of all channels with their tools and builds them again by tool changes, work offsets, comments and spindle. The simulation result is lost — the project will need calculation.',
      b_split:'Replace operations', t_split:'Operations rebuilt from the text — calculate the project', t_notCalc:'Calculate the project first — then it can be simulated',
      t_stopErr:'Stopped on an error · {line}', w_find:'Find', w_edit:'Editing', w_openProg:'The “Open program” screen',
      e_holder:'Holder collision', e_holder_d:'The tool holder hits the part', e_gouge:'Gouge', e_gouge_d:'The tool cuts into the part',
      e_plunge:'Plunge angle', e_plunge_d:'The plunge angle is over the tool’s limit', e_rapid:'Cut at rapid', e_rapid_d:'Material is removed at rapid feed',
      e_machine:'Machine collision', e_machine_d:'Machine nodes collide',
      tuner:'Tuner window', open:'Open', save:'Save', calc:'Calculate', cancel:'Cancel', viewOnly:'View only',
      errors:function(n){ return n + (n === 1 ? ' error' : ' errors'); },
      st_needs:'Needs calculation', st_calculating:'Calculating {p} %', st_calculated:'Calculated', st_simulating:'Simulating',
      st_paused:'Paused', st_simulated:'Simulated',
      m_save:'Save project', m_save_d:'{file} with its NC programs', m_saveCam_d:'A CAM project — the first save makes a .snct', m_saveAs:'Save project as…', m_saveAs_d:'Another folder or name',
      m_progAs:'Save program as…', m_progAs_d:'{prog} · NC file for the machine',
      q_save:'Save changes to “{name}”?', q_save_d:'Otherwise the changes made since it was last saved are lost.',
      b_save:'Save', b_dont:'Don’t save', b_cancel:'Cancel',
      q_calc:'Stop the calculation?', q_calc_d:'“{name}” is being calculated ({p} %). Stop it and close the project?', b_stopClose:'Stop and close',
      q_quit:'Close Tuner?', q_quitCalc_d:'“{name}” is still being calculated. Stop it and close Tuner together with the touch interface?',
      q_quitSim_d:'“{name}” is being simulated. Stop it and close Tuner together with the touch interface?', b_stopQuit:'Stop and close Tuner',
      t_saved:'Saved · {name}', t_calcDone:'Calculated · {name}', t_calcStop:'Calculation stopped · {name}',
      t_viewOn:'View only: editing, replacing the program, Split and saving are off', t_viewOff:'Editing is available again',
      t_firstErr:'First error — the jump is built with the program text (block 2) and the 3D (block 4)',
      t_soon:'{what} — comes in block {n}',
      w_saveAs:'The “Save project as” screen', w_progAs:'The “Save program as” screen', w_open:'The “Open” screen',
      o_title:'Open project', o_text:'The “Open” screen comes in block 7: recent files, folders, USB drives and network folders in 56 px rows.',
      o_demo:'Open the demo projects',
      u_desk:'The touch interface is minimized together with Tuner', u_desk_d:'Tap its button on the taskbar to bring it back — Tuner returns behind it.',
      u_closed:'Tuner is closed', u_closed_d:'The touch interface was closed together with Tuner. On the stand you can start it again.', u_restart:'Start again',
      u_tuner_d:'This is the regular Tuner window (mouse and keyboard) — the same project, the same edits and simulation result.',
      u_tuner_h:'Back to the touch interface: Utilities ▾ → Touch interface', u_utils:'Utilities', u_touch:'Touch interface',
      u_calc:'Calculator', u_logs:'System logs', u_tools:'Tools', u_interp:'Interpreter manager',
      z_left:'Program', z_left_d:'channels · operations inside the NC text · edit and find', z_3d:'3D view', z_3d_d:'gestures · view plates · visibility · Verify Compare',
      z_tl:'Timeline', z_bar:'Simulation console', blk:'block {n}',
      v_rotate:'Rotate', v_pan:'Pan', v_zoom:'Zoom', v_fit:'Fit', v_iso:'Iso', v_top:'Top', v_front:'Front', v_right:'Right', v_views:'View', v_left:'Left', v_back:'Back', v_bottom:'Bottom', v_home:'Home — Iso, fitted', v_ccw:'Turn 90° left', v_cw:'Turn 90° right',
      o_part:'Part', o_stock:'Stock', o_result:'Result', o_holder:'Holder', o_tool:'Tool', o_fixture:'Fixture', o_machine:'Machine', o_path:'Toolpath',
      o_verify:'Verify Compare', o_vis:'Visibility', vc_title:'Deviation from the part', vc_rest:'Rest', vc_ok:'In tolerance', vc_gouge:'Gouge'
    },
    ru: {
      s_this:'Текущая', s_upto:'До текущей', s_end:'До конца', s_errs:'Ошибки', s_noErr:'Ошибок нет', s_errAt:'{i} / {n}', s_prev:'Предыдущая ошибка', s_next:'Следующая ошибка',
      s_checks:'Проверки', s_reset:'Сброс', s_back:'Назад', s_play:'Пуск', s_pause:'Пауза', s_step:'Шаг', s_speed:'Скорость',
      c_holder:'Столкновения державки', c_machine:'Столкновения узлов станка', c_gouge:'Зарезы', c_stopErr:'Остановка на ошибке', c_smooth:'Плавное движение',
      c_smooth_d:'Выключено — по кадрам', t_end:'Конец программы · {name}', t_noNext:'Дальше ошибок нет', t_noPrev:'Раньше ошибок нет',
      t_reset:'В начало — заготовка сброшена', tl_aria:'Шкала моделирования',
      pg_start:'Начало программы', all_shut:'Свернуть все операции', all_open:'Развернуть все операции',
      chl:'Канал', program:'Программа', ch:'Канал {n}', follow:'Следить', find:'Найти', edit:'Править', pgUp:'Страница вверх', pgDn:'Страница вниз', ops_t:'Операции',
      m_open:'Открыть программу…', m_open_d:'Заменить программу этого канала файлом', m_split:'Split…', m_split_d:'Построить операции всех каналов заново по тексту',
      op_sim:'Моделировать эту операцию', op_upto:'Моделировать до этой операции', ln_upto:'Моделировать до этой строки',
      q_split:'Заменить операции и инструменты по тексту УП?', q_split_d:'Tuner удалит операции всех каналов вместе с инструментами и построит их заново — по смене инструмента, системы координат, комментариям и шпинделю. Результат моделирования пропадёт, проекту понадобится расчёт.',
      b_split:'Заменить операции', t_split:'Операции построены заново — рассчитайте проект', t_notCalc:'Сначала рассчитайте проект — потом его можно моделировать',
      t_stopErr:'Стоп на ошибке · {line}', w_find:'Найти', w_edit:'Правка', w_openProg:'Экран «Открыть программу»',
      e_holder:'Столкновение державки', e_holder_d:'Державка задевает деталь', e_gouge:'Зарез', e_gouge_d:'Инструмент врезается в деталь',
      e_plunge:'Угол врезания', e_plunge_d:'Угол врезания больше допустимого для инструмента', e_rapid:'Съём на ускоренной', e_rapid_d:'Материал снимается на ускоренной подаче',
      e_machine:'Столкновение узлов станка', e_machine_d:'Узлы станка сталкиваются',
      tuner:'Окно Tuner', open:'Открыть', save:'Сохранить', calc:'Рассчитать', cancel:'Отмена', viewOnly:'Только просмотр',
      errors:function(n){ return ruN(n, 'ошибка', 'ошибки', 'ошибок'); },
      st_needs:'Нужен расчёт', st_calculating:'Расчёт {p} %', st_calculated:'Рассчитан', st_simulating:'Моделирование',
      st_paused:'Пауза', st_simulated:'Промоделирован',
      m_save:'Сохранить проект', m_save_d:'{file} вместе с программами', m_saveCam_d:'Проект CAM — первое сохранение создаёт .snct', m_saveAs:'Сохранить проект как…', m_saveAs_d:'В другую папку или под другим именем',
      m_progAs:'Сохранить программу как…', m_progAs_d:'{prog} · файл УП для станка',
      q_save:'Сохранить изменения в «{name}»?', q_save_d:'Иначе изменения после последнего сохранения пропадут.',
      b_save:'Сохранить', b_dont:'Не сохранять', b_cancel:'Отмена',
      q_calc:'Прервать расчёт?', q_calc_d:'«{name}» рассчитывается ({p} %). Прервать расчёт и закрыть проект?', b_stopClose:'Прервать и закрыть',
      q_quit:'Закрыть Tuner?', q_quitCalc_d:'«{name}» ещё рассчитывается. Прервать расчёт и закрыть Tuner вместе с сенсорным интерфейсом?',
      q_quitSim_d:'«{name}» моделируется. Остановить и закрыть Tuner вместе с сенсорным интерфейсом?', b_stopQuit:'Прервать и закрыть Tuner',
      t_saved:'Сохранено · {name}', t_calcDone:'Рассчитано · {name}', t_calcStop:'Расчёт прерван · {name}',
      t_viewOn:'Только просмотр: правка, замена программы, Split и сохранение выключены', t_viewOff:'Правка снова доступна',
      t_firstErr:'Первая ошибка — переход появится вместе с текстом программы (блок 2) и 3D (блок 4)',
      t_soon:'{what} — в блоке {n}',
      w_saveAs:'Экран «Сохранить проект как»', w_progAs:'Экран «Сохранить программу как»', w_open:'Экран «Открыть»',
      o_title:'Открыть проект', o_text:'Экран «Открыть» будет в блоке 7: последние файлы, папки, флешки и сетевые папки строками по 56 px.',
      o_demo:'Открыть демо-проекты',
      u_desk:'Сенсорный интерфейс свёрнут вместе с Tuner', u_desk_d:'Коснитесь его кнопки на панели задач — он вернётся, а за ним и Tuner.',
      u_closed:'Tuner закрыт', u_closed_d:'Сенсорный интерфейс закрыт вместе с Tuner. На стенде его можно запустить снова.', u_restart:'Запустить снова',
      u_tuner_d:'Это обычное окно Tuner (мышь и клавиатура) — тот же проект, те же правки и результат моделирования.',
      u_tuner_h:'Назад в сенсорный интерфейс: Утилиты ▾ → Сенсорный интерфейс', u_utils:'Утилиты', u_touch:'Сенсорный интерфейс',
      u_calc:'Калькулятор', u_logs:'Журнал', u_tools:'Инструменты', u_interp:'Менеджер интерпретаторов',
      z_left:'Программа', z_left_d:'каналы · операции внутри текста УП · правка и поиск', z_3d:'3D', z_3d_d:'жесты · плашки вида · видимость · Verify Compare',
      z_tl:'Шкала моделирования', z_bar:'Пульт моделирования', blk:'блок {n}',
      v_rotate:'Вращать', v_pan:'Сдвигать', v_zoom:'Масштаб', v_fit:'Вписать', v_iso:'Изо', v_top:'Сверху', v_front:'Спереди', v_right:'Справа', v_views:'Вид', v_left:'Слева', v_back:'Сзади', v_bottom:'Снизу', v_home:'Домой — изо, вписать', v_ccw:'Повернуть на 90° влево', v_cw:'Повернуть на 90° вправо',
      o_part:'Деталь', o_stock:'Заготовка', o_result:'Результат', o_holder:'Державка', o_tool:'Инструмент', o_fixture:'Оснастка', o_machine:'Станок', o_path:'Траектория',
      o_verify:'Verify Compare', o_vis:'Видимость', vc_title:'Отклонение от детали', vc_rest:'Остаток', vc_ok:'В допуске', vc_gouge:'Зарез'
    }
  };
  // the stand opens in English (Ruslan, 2026-11-19); v2 — earlier saved choices no longer override it
  var lang = load('touch.v2.lang', 'en');
  function t(k, p){
    var s = STR[lang][k];
    if (s == null) return k;
    if (typeof s === 'function') return s(p);
    return s.replace(/\{(\w+)\}/g, function(m, x){ return p && p[x] != null ? p[x] : m; });
  }
  function setLang(l){ lang = l; keep('touch.v2.lang', l); emit('lang', l); }

  // ——— projects ———
  // state: needs · calculating · calculated · simulating · paused · simulated
  // A project holds channels (one program text each); its operations, errors and the simulation
  // are per channel. Lines are addressed by index; data.js names them by text, resolved here.
  var DEMO = window.TT_DEMO || [];
  var CALCULATED = {calculated:1, simulating:1, paused:1, simulated:1};
  function channel(c){
    var L = c.text.slice(), at = function(s){ var i = L.indexOf(s); return i; };
    var ops = c.ops.map(function(o){ return {name:o.name, tool:o.tool, c:o.c, start:at(o.at)}; });
    ops.forEach(function(o, i){ o.end = i + 1 < ops.length ? ops[i + 1].start - 1 : L.length - 1; });
    var truth = {}; (c.errors || []).forEach(function(e){ var i = at(e.at); if (i >= 0) truth[i] = e.type; });
    var simTo = c.simTo ? at(c.simTo) : -1, cur = c.cur ? at(c.cur) : (ops[0] ? ops[0].start : 0);
    return {file:c.file, lines:L, ops:ops, truth:truth, simTo:simTo, cur:cur, view:{scroll:null, follow:true}};
  }
  var list = [], cur = null, seq = 0, viewOnly = false;
  function fresh(d){
    var p = JSON.parse(JSON.stringify(d)); p.id = ++seq;
    p.channels = d.channels.map(channel); p.ch = 0; p.progs = p.channels.map(function(c){ return c.file; });
    recount(p); return p;
  }
  function reset(){ list = DEMO.map(fresh); cur = list[0].id; viewOnly = false; emit('projects'); emit('active', get(cur)); emit('viewonly', viewOnly); }

  // ——— checks and stops (the Checks window, spec sect. 3: no more than 6 switches) ———
  // what a simulation finds depends on them: a holder collision only with its check on, and so on;
  // the plunge angle and cutting at rapid are always checked. Kept across sessions.
  var checks = load('touch.checks', {holder:true, machine:true, gouge:true, stopErr:true, smooth:true});
  function checked(type){ return type in {holder:1, machine:1, gouge:1} ? !!checks[type] : true; }
  function setCheck(k, v){ checks[k] = !!v; keep('touch.checks', checks); list.forEach(recount); emit('projects'); }

  // ——— simulation results (Tuner's; here on a timer — sim.js runs it) ———
  // found errors = the checked truth up to how far a channel is simulated; the top bar counts them
  function found(c){ var f = {}; Object.keys(c.truth).forEach(function(i){ if (+i <= c.simTo && checked(c.truth[i])) f[i] = c.truth[i]; }); return f; }
  function recount(p){ p.errors = p.channels.reduce(function(n, c){ return n + Object.keys(found(c)).length; }, 0); }
  function calculated(p){ return !!CALCULATED[p.state]; }
  // the stock back to its start: all channels, the machine to the first block
  function clearSim(p){ p.channels.forEach(function(c){ c.simTo = -1; }); recount(p); }
  function resetSim(p){ p.channels.forEach(function(c){ c.simTo = -1; c.cur = 0; c.view.scroll = null; }); p.state = 'calculated'; recount(p); emit('projects'); }
  // an operation: err (an error found in it) · done (simulated through) · partial · none
  function opStatus(p, c, o){
    if (!calculated(p) || c.simTo < o.start) return 'none';
    var f = found(c);
    for (var i = o.start; i <= Math.min(o.end, c.simTo); i++) if (f[i]) return 'err';
    return c.simTo >= o.end ? 'done' : 'partial';
  }
  function opAt(c, line){ var r = null; c.ops.forEach(function(o){ if (line >= o.start) r = o; }); return r; }
  function atEnd(p){ return p.channels.every(function(x){ return x.simTo >= x.lines.length - 1; }); }
  // the machine to a line: back — only the cursor moves, the removed stock stays (spec sect. 3);
  // forward past the simulated — Tuner simulates up to it and, with Stop on error, stops on the first
  // new error. Returns the line it stopped at, or -1 if not calculated. `keep` — leave the state as is
  // (a running simulation calls it block by block).
  function goLine(p, ci, line, keepState){
    var c = p.channels[ci]; if (!c) return -1;
    line = Math.max(0, Math.min(line, c.lines.length - 1));
    if (line <= c.simTo){ c.cur = line; emit('projects'); return line; }
    if (!calculated(p)) return -1;
    var stop = line;
    if (checks.stopErr) for (var i = c.simTo + 1; i <= line; i++) if (c.truth[i] && checked(c.truth[i])){ stop = i; break; }
    c.simTo = stop; c.cur = stop;
    if (!keepState) p.state = atEnd(p) ? 'simulated' : 'paused';
    recount(p); emit('projects'); return stop;
  }
  // Split: Tuner deletes the operations of all channels with their tools and builds them again from
  // the text — the result is gone, the project needs calculation (here the same operations come back)
  function split(id){ var p = get(id); if (!p) return; clearSim(p); p.state = 'needs'; p.dirty = true; emit('projects'); }
  function get(id){ for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function active(){ return get(cur); }
  // switching tabs: the simulation of the tab you leave pauses (sect. 3, "Project tabs")
  function select(id){
    if (id === cur || !get(id)) return;
    var was = active(); if (was && was.state === 'simulating') was.state = 'paused';
    cur = id; emit('projects'); emit('active', active());
  }
  function set(id, patch){ var p = get(id); if (!p) return; Object.assign(p, patch); emit('projects'); }
  function remove(id){
    var i = list.findIndex(function(p){ return p.id === id; }); if (i < 0) return;
    list.splice(i, 1);
    if (cur === id){ var n = list[i] || list[i - 1]; cur = n ? n.id : null; emit('active', active()); }
    emit('projects');
  }
  // open the demo projects that are not open (the Open screen comes in block 7)
  function openDemo(){
    DEMO.forEach(function(d){ if (!list.some(function(p){ return p.name === d.name; })) list.push(fresh(d)); });
    if (!cur) cur = list[0].id; emit('projects'); emit('active', active());
  }

  // ——— calculation (Tuner's; here on a timer) ———
  // a new calculation drops the old result; stopping it leaves the project needing one
  function calc(id){ var p = get(id); if (!p || p.state === 'calculating') return; clearSim(p); p.back = 'needs'; p.state = 'calculating'; p.pct = 0; emit('projects'); }
  function stopCalc(id, quiet){
    var p = get(id); if (!p || p.state !== 'calculating') return;
    p.state = p.back || 'needs'; delete p.pct; emit('projects');
    if (!quiet) emit('toast', {text:t('t_calcStop', {name:p.name}), dot:'var(--ec-amber)'});
  }
  setInterval(function(){
    var changed = false;
    list.forEach(function(p){
      if (p.state !== 'calculating') return;
      p.pct = Math.min(100, (p.pct || 0) + (p.id === cur ? 1.4 : 0.3)); changed = true;
      if (p.pct >= 100){ p.state = 'calculated'; clearSim(p); delete p.pct; emit('toast', {text:t('t_calcDone', {name:p.name})}); }
    });
    if (changed) emit('projects');
  }, 100);

  function save(id){ var p = get(id); if (!p) return; p.dirty = false; emit('projects'); emit('toast', {text:t('t_saved', {name:p.name})}); }
  function setViewOnly(v){ viewOnly = !!v; emit('viewonly', viewOnly); emit('toast', {text:t(viewOnly ? 't_viewOn' : 't_viewOff'), dot: viewOnly ? 'var(--ec-green)' : 'var(--ec-fg-48)'}); }

  return {
    on:on, emit:emit, t:t, load:load, keep:keep,
    lang:function(){ return lang; }, setLang:setLang,
    list:function(){ return list; }, get:get, active:active, select:select, set:set, remove:remove, reset:reset, openDemo:openDemo,
    calc:calc, stopCalc:stopCalc, save:save,
    calculated:calculated, found:found, recount:recount, clearSim:clearSim, resetSim:resetSim, opStatus:opStatus, opAt:opAt, goLine:goLine, split:split,
    atEnd:atEnd, checks:function(){ return checks; }, setCheck:setCheck, checked:checked,
    viewOnly:function(){ return viewOnly; }, setViewOnly:setViewOnly,
    scale:1   // the stand's zoom of the screen (stand.js) — to turn screen points into layout pixels
  };
})();
