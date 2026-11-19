// ENCY Tuner — the NC code column: the program of the active project, by channel.
// A multichannel machine gets Mode tabs on the panel frame — one per channel plus ⫴ (channels
// side by side); a single-channel one shows no tabs at all. Every channel has its own editor
// (editor.js); side by side, the toolbar acts on the channel in focus (click into a pane).
(function(){
  'use strict';

  var col = document.getElementById('codecol'),
      tabs = document.getElementById('chTabs'),
      panes = document.getElementById('cpanes'),
      fname = document.getElementById('fileName');
  if (!col) return;

  var I_SPLIT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2.1" y="3.1" width="11.8" height="9.8" rx="1.4"/><path d="M8 3.4v9.2"/></svg>';

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  var shape = '';
  function render(){
    var p = window.TUNER_PROJECT.get(), multi = !!(p && p.channels.length > 1), v = p ? p.view : null;
    // side by side, a focus change only moves the bright name: rebuilding would steal the caret
    var sh = p ? p.id + (multi && v.split ? ':split' : ':' + v.channel) : '';
    if (sh === shape && p && multi && v.split){
      panes.querySelectorAll('.cpane').forEach(function(x){ x.classList.toggle('focus', +x.dataset.pane === v.channel); });
      syncFindBtn();
      return;
    }
    shape = sh;
    col.classList.toggle('split', !!(multi && v.split));
    fname.textContent = p ? p.file : '—';

    tabs.hidden = !multi;
    if (multi){
      tabs.innerHTML = p.channels.map(function(c){
        var on = !v.split && v.channel === c.index;
        return '<button class="seg' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-ch="' + c.index + '">' + esc(c.name) + '</button>';
      }).join('') +
      '<button class="seg seg-ic' + (v.split ? ' active' : '') + '" role="tab" aria-selected="' + v.split + '" data-split title="Channels side by side" aria-label="Channels side by side">' + I_SPLIT + '</button>';
    }

    if (!p){
      panes.innerHTML = '<div class="pempty"><b>No project open</b>Open a project or start a new one with + in the header</div>';
      return;
    }
    var shown = multi && v.split ? p.channels : [p.channels[v.channel] || p.channels[0]];
    panes.innerHTML = shown.map(function(c){
      var focus = multi && v.split && c.index === v.channel;
      return '<div class="cpane' + (focus ? ' focus' : '') + '" data-pane="' + c.index + '">' +
        (multi && v.split ? '<div class="cp-head">' + esc(c.name) + '</div>' : '') +
      '</div>';
    }).join('');
    // one editor per channel, kept while the project is open: switching views keeps the text,
    // the scroll position and the undo history
    shown.forEach(function(c){
      var pane = panes.querySelector('[data-pane="' + c.index + '"]');
      pane.appendChild(editor(p, c).el);
      editor(p, c).refresh();
    });
    syncFindBtn();
  }

  // ——— editors ———
  var editors = {};
  function editor(p, c){
    var k = p.id + ':' + c.index;
    return editors[k] || (editors[k] = window.TunerEditor(c));
  }
  // the editor the toolbar acts on: the channel on screen, or the one in focus side by side
  function active(){
    var p = window.TUNER_PROJECT.get(); if (!p) return null;
    return editor(p, p.channels[p.view.channel] || p.channels[0]);
  }
  // the tree drives the code: show a channel, or go to a block of it (switching the channel on
  // screen when the code column shows one channel only)
  function show(ch){
    var p = TUNER_PROJECT.get(); if (!p) return;
    if (p.view.channel !== ch) TUNER_PROJECT.setView({channel: ch});
  }
  window.TUNER_CODE = {
    show: show,
    // the editor the toolbar acts on (the Stream editor works on it too)
    active: function(){ return active(); },
    // the simulation's block in a channel (null clears it); the column shows that channel
    simLine: function(ch, line){
      var p = TUNER_PROJECT.get(); if (!p) return;
      p.channels.forEach(function(c){ if (editors[p.id + ':' + c.index]) editors[p.id + ':' + c.index].simLine(c.index === ch ? line : null); });
      if (line != null && !p.view.split && p.view.channel !== ch) show(ch);
      if (line != null) editor(p, p.channels[ch]).simLine(line);
    },
    goto: function(ch, line, focus){
      var p = TUNER_PROJECT.get(); if (!p) return;
      show(ch);
      editor(p, p.channels[ch]).goto(line, focus);
    }
  };
  // statuses changed outside the editor (Run program): redraw that channel's markers
  document.addEventListener('tuner:ops', function(e){
    var p = TUNER_PROJECT.get(), k = p && e.detail ? p.id + ':' + e.detail.index : null;
    if (k && editors[k]) editors[k].refresh();
  });

  // a click in an editor side by side focuses its channel
  panes.addEventListener('ed:focus', function(e){
    var pane = e.target.closest('.cpane'), p = TUNER_PROJECT.get();
    if (pane && p && p.view.split && +pane.dataset.pane !== p.view.channel) TUNER_PROJECT.setView({channel: +pane.dataset.pane});
  });

  // ——— toolbar: Undo · Redo · Find · Split ———
  var tool = col.querySelector('.ptool'), findBtn = tool.querySelector('[data-act="find"]');
  function syncFindBtn(){ var ed = active(); findBtn.classList.toggle('on', !!(ed && ed.findOpen())); }
  panes.addEventListener('ed:find', syncFindBtn);
  tool.addEventListener('click', function(e){
    var b = e.target.closest('[data-act]'), ed = active();
    if (!b || !ed) return;
    var a = b.dataset.act;
    if (a === 'undo') ed.undo();
    else if (a === 'redo') ed.redo();
    else if (a === 'find') ed.find();
    else if (a === 'split') split(ed, b);
  });

  // Split builds operations from the text. Existing ones would be lost — ask first.
  // (Tuner offers Yes = replace / No = keep and re-link; only "replace" is built so far.)
  var pop = null;
  function closePop(){ if (pop){ pop.remove(); pop = null; } }
  function split(ed, btn){
    closePop();
    var have = ed.channel.ops.length, found = ed.count();
    if (!found){ toast(btn, 'No tool or work offset changes in the program'); return; }
    if (!have){ toast(btn, 'Split: ' + ed.split() + ' operations'); return; }
    pop = document.createElement('div');
    pop.className = 'pop';
    pop.innerHTML = '<div class="pop-t">Replace the operations?</div>' +
      '<div class="pop-d">The ' + have + ' operations of ' + esc(ed.channel.name) + ' will be replaced by ' + found +
        ' found in the program. Their statuses are reset.</div>' +
      '<div class="pop-acts"><button class="pbtn" data-a="no">Cancel</button><button class="pbtn primary" data-a="yes">Replace</button></div>';
    document.body.appendChild(pop);
    place(pop, btn);
    pop.addEventListener('click', function(e){
      var a = e.target.closest('[data-a]'); if (!a) return;
      closePop();
      if (a.dataset.a === 'yes') toast(btn, 'Split: ' + ed.split() + ' operations');
    });
    pop.querySelector('.primary').focus();
  }
  document.addEventListener('mousedown', function(e){ if (pop && !pop.contains(e.target) && !e.target.closest('[data-act="split"]')) closePop(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePop(); });

  // under the button, right edges aligned, kept inside the window
  function place(box, btn){
    var r = btn.getBoundingClientRect();
    box.style.left = Math.max(4, Math.min(r.right - box.offsetWidth, innerWidth - box.offsetWidth - 4)) + 'px';
    box.style.top = (r.bottom + 4) + 'px';
  }
  function toast(btn, text){
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    document.body.appendChild(t); place(t, btn);
    setTimeout(function(){ t.style.opacity = '0'; }, 1600);
    setTimeout(function(){ t.remove(); }, 1900);
  }

  tabs.addEventListener('click', function(e){
    var s = e.target.closest('.seg'); if (!s) return;
    if (s.hasAttribute('data-split')) TUNER_PROJECT.setView({split: true});
    else TUNER_PROJECT.setView({split: false, channel: +s.dataset.ch});
  });
  document.addEventListener('tuner:project', render);
  document.addEventListener('tuner:view', render);
  render();
})();
