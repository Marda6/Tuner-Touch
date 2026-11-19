// Tuner Touch, variant 3 — what the desktop panels need to live under a finger (only html.touch):
//   the lower half of the left column switches between the NC code and Parameters (the inspector), by a
//   two-tab strip over it (Core's tabs); folded columns from the desktop are unfolded (the columns are
//   fixed here, rule 11).
(function(){
  'use strict';
  if (!document.documentElement.classList.contains('touch')) return;
  var ws = document.getElementById('ws');
  if (!ws) return;
  ['dock', 'codecol'].forEach(function(id){ var el = document.getElementById(id); if (el) el.classList.remove('shut', 'peek'); });
  ws.classList.remove('dock-shut', 'code-shut');

  var sw = document.createElement('div');
  sw.className = 't-sw'; sw.setAttribute('role', 'tablist');
  sw.innerHTML = '<button role="tab" data-t="code">NC code</button><button role="tab" data-t="params">Parameters</button>';
  ws.appendChild(sw);
  function show(k){
    ws.classList.toggle('t-params', k === 'params');
    sw.querySelectorAll('button').forEach(function(b){ var on = b.getAttribute('data-t') === k; b.classList.toggle('cur', on); b.setAttribute('aria-selected', on); });
    try { localStorage.setItem('touch.core.lower', k); } catch (e) {}
    window.dispatchEvent(new Event('resize'));
  }
  sw.addEventListener('click', function(e){ var b = e.target.closest('[data-t]'); if (b) show(b.getAttribute('data-t')); });
  var k0 = 'code'; try { k0 = localStorage.getItem('touch.core.lower') || 'code'; } catch (e) {}
  show(k0);
})();
