// ENCY Tuner — the open projects, one per header tab: machine, channels and the view state of
// the code column. The model follows Tuner's own: a project holds one program text split into
// channel sections (TunerProjectSchema.xml: Channels → StartIndex / StartLine), and every
// operation belongs to a channel. Fires `tuner:project` with the active project (null if none).
(function(){
  'use strict';

  // the header tabs open Tuner 3's shipped examples (examples.js); a new tab is a blank
  // single-channel project
  var EXAMPLES = window.TUNER_EXAMPLES || {};
  // operation colours (Core op palette), handed out in order like ENCY does
  var OP_COLORS = ['--op-blue', '--op-green', '--op-yellow', '--op-coral', '--op-violet'];
  var projects = {}, cur = null, opSeq = 0;

  // an operation: its first block (line index), tool, work offset, status and the blocks with errors
  function op(o, start){
    return {id: ++opSeq, name: o.name, start: start, tool: o.tool || null, toolName: o.toolName || '',
      wcs: o.wcs || 'G54', status: o.status || 'none', color: o.color || OP_COLORS[(opSeq - 1) % OP_COLORS.length],
      errors: o.errors || {},
      // the demo truth: what a simulation finds on this operation (errors above are what is shown)
      truth: JSON.parse(JSON.stringify(o.truth || o.errors || {}))};
  }

  // demo channels: operations and errors point at their blocks by text
  function channel(c, i){
    var lines = c.text || [];
    var ops = (c.ops || []).map(function(o){
      var s = lines.indexOf(o.at), err = {};
      (o.errors || []).forEach(function(e){ var l = lines.indexOf(e.at, s); if (l >= 0) err[l] = e.type; });
      return op({name:o.name, tool:o.tool, toolName:o.toolName, wcs:o.wcs, status:o.status, errors:err}, s);
    }).filter(function(o){ return o.start >= 0; });
    return {index: i, name: 'Channel ' + (i + 1), text: lines.join('\n'), ops: ops};
  }

  // machine-level parameters of a new project: the last machine's setup would load in Tuner;
  // here a neutral set
  var BLANK = {
    setup: {wpSetup:'Global CS', wpCS:'G54(X0 Y0 Z0)', C:'0', B:'0', X:'0', Y:'0', Z:'0', axesMap:false},
    machine: {kin:'Not set', post:'Not set', limits:true},
    part: {model:'Not set', faces:'0', check:false},
    workpiece: {type:'Not set', size:'—', offset:'0'},
    fixture: {name:'None', attach:'Table', pos:'Click to pick'},
    model: []
  };

  function make(tab){
    var ex = EXAMPLES[tab.name] || {machine:'', file:'Program file name 1', channels:[{}]};
    return {
      id: tab.id, name: tab.name, machine: ex.machine, interpreter: ex.interpreter || '', file: ex.file,
      params: JSON.parse(JSON.stringify(ex.params || BLANK)),
      channels: ex.channels.map(channel),
      // code column: the channel on screen (or in focus, side by side) and the side-by-side mode
      view: {channel: 0, split: false}
    };
  }
  window.TUNER_OP = op;

  function open(tab){
    cur = tab ? (projects[tab.id] || (projects[tab.id] = make(tab))) : null;
    document.dispatchEvent(new CustomEvent('tuner:project', {detail: cur}));
  }

  window.TUNER_PROJECT = {
    get: function(){ return cur; },
    // change the code column view of the active project and tell everyone
    setView: function(v){
      if (!cur) return;
      for (var k in v) cur.view[k] = v[k];
      document.dispatchEvent(new CustomEvent('tuner:view', {detail: cur}));
    }
  };

  document.addEventListener('tuner:tab', function(e){ open(e.detail); });
  // the header is built before this script: start from its active tab
  open(window.TUNER_HEADER ? window.TUNER_HEADER.current() : null);
})();
