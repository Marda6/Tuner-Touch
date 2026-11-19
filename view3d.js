// ENCY Tuner Touch — block 4: the 3D view (spec sect. 3; rules 6.4–6.5). three.js (vendor/three, MIT).
// Tuner draws the real machine; here a stand-in built from the shown channel's NC text, so the view
// behaves like Tuner's: the tool stands where the machine is (the current block), the machining result
// is what the feed moves cut up to the simulated block, the part — what all of them cut without the
// gouging ones, so Verify Compare shows rest material, the tolerance and the gouge. Turning (X — a
// diameter, Z — the axis) is revolved; the 5-axis mill is a height map (A / C are not turned).
//   gestures: one finger — by the mode (Rotate · Pan · Zoom), two — pan, pinch — zoom, double tap — Fit
//   left plate: the finger's mode | Fit | Iso · Top · Front · Right; right plate: visibility | Verify Compare
//   an error under the machine: the camera flies to the tool and the holder, a red ring marks the place
// Each tab keeps its own view (spec sect. 3). Rendered on demand — still, it costs nothing.
import * as THREE from './vendor/three/three.module.js';

const TT = window.TT;
const host = document.getElementById('tt3d');
if (TT && host) init();

function init(){
  const t = TT.t, ui = TT.ui, esc = ui.esc;
  const css = getComputedStyle(document.getElementById('tt'));
  const cv = name => (css.getPropertyValue(name) || '#888').trim();

  // ——— the stage ———
  const root = document.createElement('div'); root.className = 'v3';
  host.appendChild(root);
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(cv('--th-base'));
  root.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x30373a, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(0.6, 1, 0.8); camera.add(key); camera.add(key.target);
  key.target.position.set(0, 0, -1);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(-1, 0.4, -0.6); scene.add(fill);

  // ——— materials (Tuner-like: grey metal result, translucent stock, green part, gold inserts) ———
  const M = {
    result: new THREE.MeshStandardMaterial({color:0xaab2b5, roughness:0.5, metalness:0.25, side:THREE.DoubleSide}),
    resultVC: new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.6, metalness:0.05, side:THREE.DoubleSide}),
    stock: new THREE.MeshStandardMaterial({color:0xd5dcdf, transparent:true, opacity:0.14, depthWrite:false, side:THREE.DoubleSide}),
    part: new THREE.MeshStandardMaterial({color:0x36c48a, transparent:true, opacity:0.32, depthWrite:false, side:THREE.DoubleSide}),
    holder: new THREE.MeshStandardMaterial({color:0x5f686c, roughness:0.45, metalness:0.5}),
    insert: new THREE.MeshStandardMaterial({color:0xe2b84c, roughness:0.35, metalness:0.6}),
    drill: new THREE.MeshStandardMaterial({color:0xc9d0d3, roughness:0.3, metalness:0.7}),
    fixture: new THREE.MeshStandardMaterial({color:0x7c8a8f, roughness:0.5, metalness:0.4}),
    machine: new THREE.MeshStandardMaterial({color:0x3b4346, roughness:0.7, metalness:0.2}),
    machine2: new THREE.MeshStandardMaterial({color:0x2d3437, roughness:0.8, metalness:0.1}),
    cap: new THREE.MeshStandardMaterial({color:0x8e979b, roughness:0.85, metalness:0, side:THREE.DoubleSide}),
    rapid: new THREE.LineDashedMaterial({color:0xf5f5f5, transparent:true, opacity:0.28, dashSize:4, gapSize:3}),
    feed: new THREE.LineBasicMaterial({vertexColors:true, transparent:true, opacity:0.95}),
    ring: new THREE.MeshBasicMaterial({color:cv('--th-red') || 0xff5c5e, transparent:true, opacity:0.95, depthTest:false, side:THREE.DoubleSide})
  };
  const VC = {rest:new THREE.Color('#4c9aff'), ok:new THREE.Color(cv('--ec-green') || '#00a36d'), gouge:new THREE.Color('#ff5c5e')};
  const TOL = 0.05;

  // ——— the NC text as moves: modal G0–G3, X Y Z; G81 holes until G80 ———
  function num(l, a){ const m = l.match(new RegExp('(?:^|[\\s])' + a + '(-?\\d*\\.?\\d+)')); return m ? parseFloat(m[1]) : null; }
  function parse(c){
    const pos = {x:null, y:0, z:null}, out = [], at = new Array(c.lines.length);
    let g = 0, cyc = null;
    c.lines.forEach((raw, i) => {
      const l = raw.replace(/\(.*?\)|;.*$/g, ' ');
      const gm = l.match(/G0*([0-3]|80|81)(?!\d)/g);
      if (gm) gm.forEach(s => { const n = +s.slice(1); if (n <= 3) g = n; else if (n === 81) cyc = {z:null}; else if (n === 80) cyc = null; });
      const X = num(l, 'X'), Y = num(l, 'Y'), Z = num(l, 'Z');
      if (cyc){
        if (/G81/.test(l) && Z != null) cyc.z = Z;
        if (X != null) pos.x = X; if (Y != null) pos.y = Y;
        if ((X != null || Y != null) && cyc.z != null) out.push({i, hole:true, x:pos.x, y:pos.y, z:cyc.z});
      } else if (X != null || Y != null || Z != null){
        const from = {x:pos.x, y:pos.y, z:pos.z};
        if (X != null) pos.x = X; if (Y != null) pos.y = Y; if (Z != null) pos.z = Z;
        if (from.x != null && from.z != null && pos.x != null && pos.z != null) out.push({i, g, from, to:{x:pos.x, y:pos.y, z:pos.z}});
      }
      at[i] = {x:pos.x, y:pos.y, z:pos.z};
    });
    return {moves:out, at};
  }
  const isMill = p => p.channels.some(c => c.lines.some(l => /(^|\s)Y-?\d/.test(l)));
  function opOf(c, i){ return TT.opAt(c, i) || c.ops[0]; }
  function toolKind(o){
    const s = (o ? o.name + ' ' + o.tool : '');
    if (/transfer|sub spindle/i.test(s)) return 'none';
    if (/drill/i.test(s)) return 'drill';
    if (/groov|part off|cut-off/i.test(s)) return /^ID/i.test(o.name) ? 'bore-groove' : 'groove';
    if (/^ID|bor/i.test(o.name)) return 'bore';
    return 'turn';
  }
  function halfWidth(o){
    const s = o ? o.name + ' ' + o.tool : '', m = s.match(/La(\d+(?:\.\d+)?)|Cut-off (\d+(?:\.\d+)?)/i);
    return m ? parseFloat(m[1] || m[2]) / 2 : 0.4;
  }
  function millR(o){ const m = (o ? o.name + ' ' + o.tool : '').match(/D(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) / 2 : 5; }

  // ——— turning: a profile sampled along Z — outer and inner radius ———
  const DZ = 0.5;
  function latheSetup(c, P){
    let rMax = 0, rIn = Infinity, zMin = 0;
    P.moves.forEach(m => {
      if (Math.abs(m.to.z) < 290) zMin = Math.min(zMin, m.to.z);
      const k = toolKind(opOf(c, m.i)); if (m.g === 0 || k === 'none' || k === 'drill') return;
      const r = Math.max(m.from.x, m.to.x) / 2;
      if (k === 'bore' || k === 'bore-groove') rIn = Math.min(rIn, Math.min(m.from.x, m.to.x) / 2);
      else if (r < 300) rMax = Math.max(rMax, r);
    });
    const R = Math.ceil(rMax + 2), Rb = rIn === Infinity ? 0 : Math.max(0, Math.floor(rIn - 1));
    const z0 = 0, z1 = Math.floor(zMin - 15), n = Math.round((z0 - z1) / DZ) + 1;
    return {R, Rb, z0, z1, n};
  }
  function latheCut(c, P, S, upto, skip){
    const out = new Float32Array(S.n).fill(S.R), inn = new Float32Array(S.n).fill(S.Rb);
    P.moves.forEach(m => {
      if (m.i > upto || m.g === 0 || skip[m.i]) return;
      const o = opOf(c, m.i), k = toolKind(o); if (k === 'none' || k === 'drill') return;
      const side = /bore/.test(k) ? 'in' : 'out', hw = halfWidth(o);
      const r0 = m.from.x / 2, r1 = m.to.x / 2, a = m.from.z, b = m.to.z;
      const lo = Math.min(a, b) - hw, hi = Math.max(a, b) + hw;
      const i0 = Math.max(0, Math.ceil((S.z0 - hi) / DZ)), i1 = Math.min(S.n - 1, Math.floor((S.z0 - lo) / DZ));
      for (let i = i0; i <= i1; i++){
        const z = S.z0 - i * DZ;
        let r;
        if (Math.abs(b - a) < 1e-6) r = side === 'out' ? Math.min(r0, r1) : Math.max(r0, r1);
        else { const tt = Math.max(0, Math.min(1, (z - a) / (b - a))); r = r0 + (r1 - r0) * tt; }
        if (side === 'out') out[i] = Math.min(out[i], Math.max(0, r)); else inn[i] = Math.max(inn[i], r);
      }
    });
    for (let i = 0; i < S.n; i++) if (inn[i] > out[i]) inn[i] = out[i];
    return {out, inn};
  }
  // a revolved body from the profile (the closed section: inner → outer along Z), axis along world x.
  // Every profile point goes in twice: LatheGeometry then gives each its segment's own normal — sharp
  // edges between the faces, as a turned part has, smooth only around the axis
  function latheGeo(S, pr, sl){
    const pts = [], n = S.n, keep = (a, i) => i === 0 || i === n - 1 || a[i] !== a[i - 1] || a[i] !== a[i + 1];
    const add = (r, z) => { pts.push(new THREE.Vector2(r, z)); pts.push(new THREE.Vector2(r, z)); };
    for (let i = 0; i < n; i++) if (keep(pr.out, i)) add(pr.out[i], S.z0 - i * DZ);
    for (let i = n - 1; i >= 0; i--) if (keep(pr.inn, i)) add(pr.inn[i], S.z0 - i * DZ);
    add(pts[0].x, pts[0].y);
    const g = sl ? new THREE.LatheGeometry(pts, 54, sl.start, sl.len) : new THREE.LatheGeometry(pts, 72);
    g.rotateZ(-Math.PI / 2);
    return g;
  }
  // a quarter cut away on the camera's side, so an error inside the bore can be seen (spec: "the place
  // is visible"). A lathe point at angle φ lies at (z, −r·sinφ, r·cosφ); the quarter facing a camera
  // that looks from direction (dy, dz) is centred at φ = atan2(−dy, dz)
  // the two faces of the cut — the section itself (the profile as a flat shape), a plain grey like a CAD section
  function latheCaps(S, pr, sl){
    const pts = [], n = S.n, keep = (a, i) => i === 0 || i === n - 1 || a[i] !== a[i - 1] || a[i] !== a[i + 1];
    for (let i = 0; i < n; i++) if (keep(pr.out, i)) pts.push(new THREE.Vector2(pr.out[i], S.z0 - i * DZ));
    for (let i = n - 1; i >= 0; i--) if (keep(pr.inn, i)) pts.push(new THREE.Vector2(pr.inn[i], S.z0 - i * DZ));
    const g = new THREE.Group();
    [sl.start, sl.start + sl.len].forEach(phi => {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
      geo.rotateY(phi - Math.PI / 2); geo.rotateZ(-Math.PI / 2);
      g.add(new THREE.Mesh(geo, M.cap));
    });
    return g;
  }
  function sliceFor(v, half){
    const dy = Math.sin(v.pitch), dz = Math.cos(v.pitch) * Math.cos(v.yaw), c = Math.atan2(-dy, dz);
    return half ? {start:c + Math.PI / 2, len:Math.PI} : {start:c + Math.PI / 4, len:Math.PI * 1.5};
  }
  function latheColors(geo, S, res, part){
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let v = 0; v < p.count; v++){
      const x = p.getX(v), r = Math.hypot(p.getY(v), p.getZ(v));
      const i = Math.max(0, Math.min(S.n - 1, Math.round((S.z0 - x) / DZ)));
      let d = 0;
      if (Math.abs(r - res.out[i]) <= Math.abs(r - res.inn[i])){ if (r > res.inn[i] + 0.3 || res.inn[i] === 0) d = res.out[i] - part.out[i]; }
      else d = part.inn[i] - res.inn[i];
      if (r < res.out[i] - 0.3 && r > res.inn[i] + 0.3) d = 0;   // the faces
      cc.copy(d > TOL ? VC.rest : d < -TOL ? VC.gouge : VC.ok);
      col[v * 3] = cc.r; col[v * 3 + 1] = cc.g; col[v * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  // ——— milling: a height map over the stock, 1 mm cells ———
  const MC = 1;
  function millSetup(P){
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zb = 0;
    P.moves.forEach(m => {
      const pts = m.hole ? [m] : [m.from, m.to];
      pts.forEach(q => { if (q.z != null && q.z < 40){ x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); zb = Math.min(zb, q.z); } });
    });
    const X0 = Math.floor(x0 - 12), X1 = Math.ceil(x1 + 12), Y0 = Math.floor(y0 - 14), Y1 = Math.ceil(y1 + 14);
    return {X0, X1, Y0, Y1, top:1, bot:Math.floor(zb - 15), nx:Math.round((X1 - X0) / MC), ny:Math.round((Y1 - Y0) / MC)};
  }
  function millCut(c, P, S, upto, skip){
    const H = new Float32Array(S.nx * S.ny).fill(S.top);
    const dig = (cx, cy, z) => { const k = cy * S.nx + cx; if (z < H[k]) H[k] = z; };
    P.moves.forEach(m => {
      if (m.i > upto || skip[m.i]) return;
      const R = millR(opOf(c, m.i));
      if (m.hole){
        for (let cy = 0; cy < S.ny; cy++) for (let cx = 0; cx < S.nx; cx++){
          const px = S.X0 + (cx + 0.5) * MC, py = S.Y0 + (cy + 0.5) * MC;
          if (Math.hypot(px - m.x, py - m.y) <= R) dig(cx, cy, m.z);
        }
        return;
      }
      if (m.g === 0) return;
      const a = m.from, b = m.to, dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
      const cx0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - R - S.X0) / MC)), cx1 = Math.min(S.nx - 1, Math.ceil((Math.max(a.x, b.x) + R - S.X0) / MC));
      const cy0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - R - S.Y0) / MC)), cy1 = Math.min(S.ny - 1, Math.ceil((Math.max(a.y, b.y) + R - S.Y0) / MC));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++){
        const px = S.X0 + (cx + 0.5) * MC, py = S.Y0 + (cy + 0.5) * MC;
        const tt = L2 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / L2)) : 0;
        if (Math.hypot(px - (a.x + dx * tt), py - (a.y + dy * tt)) <= R) dig(cx, cy, a.z + (b.z - a.z) * tt);
      }
    });
    return H;
  }
  // the block: the top as a grid (a corner takes the lowest cell around it), the walls down to the bottom
  function millGeo(S, H){
    const W = S.nx + 1, D = S.ny + 1, pos = [], idx = [];
    const hAt = (vx, vy) => { let h = Infinity; for (let j = vy - 1; j <= vy; j++) for (let i = vx - 1; i <= vx; i++) if (i >= 0 && j >= 0 && i < S.nx && j < S.ny) h = Math.min(h, H[j * S.nx + i]); return h; };
    for (let vy = 0; vy < D; vy++) for (let vx = 0; vx < W; vx++) pos.push(S.X0 + vx * MC, hAt(vx, vy), -(S.Y0 + vy * MC));
    for (let vy = 0; vy < S.ny; vy++) for (let vx = 0; vx < S.nx; vx++){ const a = vy * W + vx, b = a + 1, c2 = a + W, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
    const wall = list => { const base = pos.length / 3; list.forEach(k => { pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2], pos[k * 3], S.bot, pos[k * 3 + 2]); });
      for (let s = 0; s < list.length - 1; s++){ const a = base + s * 2, b = a + 1, c2 = a + 2, d = a + 3; idx.push(a, b, c2, c2, b, d); } };
    const edge = []; for (let vx = 0; vx < W; vx++) edge.push(vx); wall(edge);
    const e2 = []; for (let vx = 0; vx < W; vx++) e2.push((D - 1) * W + vx); wall(e2);
    const e3 = []; for (let vy = 0; vy < D; vy++) e3.push(vy * W); wall(e3);
    const e4 = []; for (let vy = 0; vy < D; vy++) e4.push(vy * W + W - 1); wall(e4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.userData.top = W * D;
    return g;
  }
  function millColors(geo, S, res, part){
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let v = 0; v < p.count; v++){
      let d = 0;
      if (v < geo.userData.top){
        const cx = Math.max(0, Math.min(S.nx - 1, Math.round((p.getX(v) - S.X0) / MC - 0.5))), cy = Math.max(0, Math.min(S.ny - 1, Math.round((-p.getZ(v) - S.Y0) / MC - 0.5)));
        d = res[cy * S.nx + cx] - part[cy * S.nx + cx];
      }
      cc.copy(d > TOL ? VC.rest : d < -TOL ? VC.gouge : VC.ok);
      col[v * 3] = cc.r; col[v * 3 + 1] = cc.g; col[v * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  // ——— the scene of one channel ———
  const G = {stock:new THREE.Group(), part:new THREE.Group(), result:new THREE.Group(), holder:new THREE.Group(), tool:new THREE.Group(),
             fixture:new THREE.Group(), machine:new THREE.Group(), path:new THREE.Group()};
  const head = new THREE.Group();            // the tool, its holder and the turret / spindle — moves with the machine
  Object.keys(G).forEach(k => (k === 'holder' || k === 'tool' ? head : scene).add(G[k]));
  scene.add(head);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 64), M.ring); ring.renderOrder = 10; ring.visible = false; scene.add(ring);
  const headMachine = new THREE.Group(); head.add(headMachine);

  function clear(g){ g.children.slice().forEach(o => { g.remove(o); o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }); }
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 32), m);

  let S = null, P = null, mill = false, built = '', cutTo = null, part = null, res = null, resGeo = null;
  function build(p, c){
    Object.keys(G).forEach(k => clear(G[k])); clear(headMachine);
    P = parse(c); mill = isMill(p);
    // the cube's axes are the machine's: turning — Z along the spindle, X up (a radius); milling — Z up
    axes = mill ? [{d:[1, 0, 0], l:'X', c:'x'}, {d:[0, 1, 0], l:'Z', c:'z'}, {d:[0, 0, -1], l:'Y', c:'y'}]
                : [{d:[1, 0, 0], l:'Z', c:'z'}, {d:[0, 1, 0], l:'X', c:'x'}, {d:[0, 0, 1], l:'Y', c:'y'}];
    cubeKey = '';
    const skip = {}; Object.keys(c.truth).forEach(i => { if (c.truth[i] === 'gouge') skip[i] = true; });
    if (mill){
      S = millSetup(P);
      part = millCut(c, P, S, Infinity, skip);
      const st = box(S.X1 - S.X0, S.top - S.bot, S.Y1 - S.Y0, M.stock); st.position.set((S.X0 + S.X1) / 2, (S.top + S.bot) / 2, -(S.Y0 + S.Y1) / 2); G.stock.add(st);
      G.part.add(new THREE.Mesh(millGeo(S, part), M.part));
      // vise jaws and the table
      const L = S.X1 - S.X0 + 20, cxm = (S.X0 + S.X1) / 2, h = 30;
      [S.Y0 - 9, S.Y1 + 9].forEach(y => { const j = box(L * 0.7, h, 18, M.fixture); j.position.set(cxm, S.bot + h / 2 - 6, -y); G.fixture.add(j); });
      const tb = box(L + 220, 26, S.Y1 - S.Y0 + 180, M.machine); tb.position.set(cxm, S.bot - 19, -(S.Y0 + S.Y1) / 2); G.machine.add(tb);
    } else {
      S = latheSetup(c, P);
      part = latheCut(c, P, S, Infinity, skip);
      const full = {out:new Float32Array(S.n).fill(S.R), inn:new Float32Array(S.n).fill(S.Rb)};
      G.stock.add(new THREE.Mesh(latheGeo(S, full), M.stock));
      G.part.add(new THREE.Mesh(latheGeo(S, part), M.part));
      // the chuck with three jaws at the far end, the headstock and the bed
      const cr = S.R * 1.55, cl = 64, x = S.z1 - cl / 2;
      const ch = cyl(cr, cl, M.machine, 48); ch.rotation.z = Math.PI / 2; ch.position.x = x; G.machine.add(ch);
      const hs = box(150, cr * 2.6, cr * 2.6, M.machine2); hs.position.x = S.z1 - cl - 75; G.machine.add(hs);
      const bed = box(S.z0 - S.z1 + 520, 40, cr * 3, M.machine2); bed.position.set((S.z0 + S.z1) / 2 + 60, -cr * 1.45, 0); G.machine.add(bed);
      for (let k = 0; k < 3; k++){
        const a = k * Math.PI * 2 / 3, jg = new THREE.Group(), j = box(36, cr - S.R, 26, M.fixture);
        j.position.set(S.z1 + 6, S.R + (cr - S.R) / 2, 0); jg.add(j); jg.rotation.x = a; G.fixture.add(jg);
      }
    }
    // the toolpath: feed moves in their operation's colour, rapids dashed
    const fp = [], fc = [], rp = [], col = new THREE.Color();
    const W = q => mill ? [q.x, q.z, -q.y] : [q.z, q.x / 2, 0];
    P.moves.forEach(m => {
      if (m.hole) return;
      const a = W(m.from), b = W(m.to);
      if (m.g === 0){ rp.push(...a, ...b); return; }
      col.set(cv((opOf(c, m.i) || {}).c || '--op-blue')); fp.push(...a, ...b); fc.push(col.r, col.g, col.b, col.r, col.g, col.b);
    });
    if (fp.length){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3)); G.path.add(new THREE.LineSegments(g, M.feed)); }
    if (rp.length){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); const ls = new THREE.LineSegments(g, M.rapid); ls.computeLineDistances(); G.path.add(ls); }
    cutTo = null; toolOf = null;
    if (typeof renderPlates === 'function') renderPlates();   // the turning keys come and go with the machine
  }
  let slice = null, sliceKey = '';
  function cut(c){
    const upto = c.simTo == null ? -1 : c.simTo;
    if (upto === cutTo && resGeo) return;
    cutTo = upto;
    res = mill ? millCut(c, P, S, upto, {}) : latheCut(c, P, S, upto, {});
    resMesh();
  }
  function resMesh(){
    clear(G.result);
    resGeo = mill ? millGeo(S, res) : latheGeo(S, res, slice);
    (mill ? millColors : latheColors)(resGeo, S, res, part);
    G.result.add(new THREE.Mesh(resGeo, vis.vc ? M.resultVC : M.result));
    if (slice && !mill) G.result.add(latheCaps(S, res, slice));
  }

  // ——— the tool on the machine: built per tool, placed at the current block ———
  let toolOf = null;
  function buildTool(o){
    clear(G.holder); clear(G.tool); clear(headMachine);
    const k = mill ? 'mill' : toolKind(o);
    if (k === 'mill'){
      const R = millR(o), tl = cyl(R, 34 + R, M.drill, 24); tl.position.y = (34 + R) / 2; G.tool.add(tl);
      const hd = cyl(Math.max(R + 6, 16), 46, M.holder); hd.position.y = 34 + R + 23; G.holder.add(hd);
      const sp = cyl(42, 90, M.machine); sp.position.y = 34 + R + 46 + 45; headMachine.add(sp);
      const sh = box(150, 160, 150, M.machine2); sh.position.y = 34 + R + 46 + 90 + 80; headMachine.add(sh);
    } else if (k === 'bore' || k === 'bore-groove'){
      const r = Math.max(4, Math.min(12, (S.Rb || 10) * 0.55)), L = 150;
      const bar = cyl(r, L, M.holder, 24); bar.rotation.z = Math.PI / 2; bar.position.set(L / 2, r * 0.6, 0); G.holder.add(bar);
      const ins = box(k === 'bore' ? 7 : halfWidth(o) * 2, 7, 6, M.insert); ins.position.set(3, 3.5, 0); G.tool.add(ins);
      const tb = box(70, 70, 90, M.machine); tb.position.set(L + 35, r * 0.6, 0); headMachine.add(tb);
    } else if (k === 'drill'){
      const d = cyl(5, 50, M.drill, 20); d.position.y = 25; G.tool.add(d);
      const hd = box(34, 60, 34, M.holder); hd.position.y = 50 + 30; G.holder.add(hd);
      const tb = box(90, 70, 90, M.machine); tb.position.y = 50 + 60 + 35; headMachine.add(tb);
    } else if (k === 'none'){
      // the sub spindle's transfer: no cutting tool
    } else {
      const w = k === 'groove' ? halfWidth(o) * 2 : 9;
      const ins = box(w, k === 'groove' ? 22 : 8, k === 'groove' ? 4 : 9, M.insert); ins.position.set(w / 2 - 0.4, k === 'groove' ? 11 : 4, 0);
      if (k !== 'groove') ins.rotation.z = Math.PI / 4;
      G.tool.add(ins);
      const hd = box(24, 70, 24, M.holder); hd.position.set(12, (k === 'groove' ? 22 : 8) + 35, 0); G.holder.add(hd);
      const tb = box(90, 70, 90, M.machine); tb.position.set(30, (k === 'groove' ? 22 : 8) + 70 + 35, 0); headMachine.add(tb);
    }
  }
  function tipAt(c, i){
    const q = P.at[Math.max(0, Math.min(P.at.length - 1, i))] || {};
    if (q.x == null || q.z == null) return mill ? new THREE.Vector3(0, 120, 0) : new THREE.Vector3(150, 200, 0);
    return mill ? new THREE.Vector3(q.x, q.z, -(q.y || 0)) : new THREE.Vector3(q.z, q.x / 2, 0);
  }

  // ——— camera: around a target — yaw, pitch, distance; tweened ———
  const cam = {yaw:0.7, pitch:0.5, dist:600, target:new THREE.Vector3()};
  let tw = null;
  function place(){
    const cp = Math.cos(cam.pitch);
    camera.position.set(cam.target.x + cam.dist * cp * Math.sin(cam.yaw), cam.target.y + cam.dist * Math.sin(cam.pitch), cam.target.z + cam.dist * cp * Math.cos(cam.yaw));
    camera.near = Math.max(0.5, cam.dist / 200); camera.far = cam.dist * 40; camera.updateProjectionMatrix();
    camera.lookAt(cam.target);
  }
  function go(to, ms){
    const from = {yaw:cam.yaw, pitch:cam.pitch, dist:cam.dist, target:cam.target.clone()};
    let dy = (to.yaw == null ? cam.yaw : to.yaw) - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    tw = {t0:performance.now(), ms:ms || 380, from, to:{yaw:cam.yaw + dy, pitch:to.pitch == null ? cam.pitch : to.pitch, dist:to.dist || cam.dist, target:to.target || cam.target.clone()}};
    req();
  }
  function stepTween(now){
    if (!tw) return false;
    let k = Math.min(1, (now - tw.t0) / tw.ms); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    cam.yaw = tw.from.yaw + (tw.to.yaw - tw.from.yaw) * e; cam.pitch = tw.from.pitch + (tw.to.pitch - tw.from.pitch) * e;
    cam.dist = tw.from.dist * Math.pow(tw.to.dist / tw.from.dist, e); cam.target.lerpVectors(tw.from.target, tw.to.target, e);
    if (k >= 1) tw = null;
    return true;
  }
  const VIEWS = {iso:{yaw:Math.PI / 4, pitch:0.6155}, top:{yaw:0, pitch:Math.PI / 2 - 0.001}, front:{yaw:0, pitch:0}, right:{yaw:Math.PI / 2, pitch:0}};
  function bounds(){
    const b = new THREE.Box3();
    [G.result, G.stock, G.fixture].forEach(g => { if (g.children.length) b.expandByObject(g); });
    if (b.isEmpty()) b.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(200, 200, 200));
    return b;
  }
  // Fit: into the free part of the view — left of the visibility column, above the cube and its row
  function fitTo(view, ms){
    const sph = bounds().getBoundingSphere(new THREE.Sphere());
    // the free part: left of the visibility column, above the cube
    const W = host.clientWidth || 1, H = host.clientHeight || 1, rw = right.offsetWidth + 12, bh = cubeEl.offsetHeight * 0.6;
    const L = 12;
    const fw = Math.max(80, W - rw - L), fh = Math.max(80, H - bh), t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const dist = sph.radius * H / (Math.min(fw, fh) * t) * 1.04;
    const yaw = view && view.yaw != null ? view.yaw : cam.yaw, pitch = view && view.pitch != null ? view.pitch : cam.pitch, per = 2 * dist * t / H;
    const dx = (L - rw) / 2, dy = -bh / 2;          // where the free middle is, from the view's centre (px, y down)
    const rx = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const up = new THREE.Vector3(-Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.cos(yaw));
    const target = sph.center.clone().addScaledVector(rx, -dx * per).addScaledVector(up, dy * per);
    go(Object.assign({dist, target}, view || {}), ms);
  }

  // ——— the error under the machine: fly to the tool and its holder, the place ringed ———
  const FLY = {mill:{yaw:0.65, pitch:0.55}, inner:{yaw:0.95, pitch:0.38}, outer:{yaw:0.45, pitch:0.42}};
  const innerAt = (c, i) => !mill && /bore/.test(toolKind(opOf(c, i)));
  function flyToError(tip){
    const v = mill ? FLY.mill : innerAt(curC, curC.cur) ? FLY.inner : FLY.outer;
    go(Object.assign({dist:mill ? 380 : 440, target:tip.clone()}, v), 520);
  }

  // ——— the frame ———
  let raf = 0, tipFrom = null, tipTo = new THREE.Vector3(), tipT0 = 0;
  function req(){ if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now){
    raf = 0;
    let more = stepTween(now);
    if (tipFrom){
      const k = Math.min(1, (now - tipT0) / 110); head.position.lerpVectors(tipFrom, tipTo, k);
      if (k >= 1) tipFrom = null; else more = true;
    }
    place(); drawCube();
    if (ring.visible){ ring.position.copy(head.position); ring.quaternion.copy(camera.quaternion); const s = cam.dist * 0.055; ring.scale.set(s, s, s); }
    renderer.render(scene, camera);
    if (more) req();
  }
  function resize(){
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; compactPlates(); req();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);

  // ——— following the app: the shown project and channel, how far it is simulated, where the machine is ———
  const views = {};                 // each tab keeps its view
  let shownId = null, curC = null, lastCur = null;
  function sync(){
    const p = TT.active();
    if (!p){ root.style.visibility = 'hidden'; return; }
    root.style.visibility = '';
    const c = p.channels[p.ch]; curC = c;
    const id = p.id + ':' + p.ch + ':' + c.lines.length, same = shownId != null && shownId.split(':')[0] === String(p.id);
    if (shownId != null && !same) views[shownId.split(':')[0]] = {yaw:cam.yaw, pitch:cam.pitch, dist:cam.dist, target:cam.target.clone()};
    if (id !== built){
      build(p, c); built = id; cut(c);
      // another tab — its own view (or Iso, fitted, the first time); another channel of the same machine — the view stays
      if (!same){
        const v = views[p.id];
        if (v){ Object.assign(cam, {yaw:v.yaw, pitch:v.pitch, dist:v.dist}); cam.target.copy(v.target); tw = null; } else { tw = null; fitTo(VIEWS.iso, 1); }
      }
      lastCur = null;
    }
    shownId = id;
    cut(c);
    const cur = c.cur == null ? 0 : c.cur, o = opOf(c, cur);
    if (toolOf !== o){ buildTool(o); toolOf = o; }
    const tip = tipAt(c, cur);
    // one block on: Smooth motion — the tool glides there; off ("block by block") — it jumps
    if (lastCur == null || Math.abs(cur - lastCur) > 1 || !TT.checks().smooth){ head.position.copy(tip); tipFrom = null; }
    else if (!tip.equals(tipTo)){ tipFrom = head.position.clone(); tipT0 = performance.now(); }
    tipTo.copy(tip);
    const err = TT.calculated(p) && TT.found(c)[cur];
    ring.visible = !!err;
    // an error inside the bore — a quarter of the result cut away on the camera's side while the machine stands there
    const want = err && innerAt(c, cur) ? sliceFor(FLY.inner) : null;
    const wk = want ? want.start.toFixed(3) + ':' + want.len.toFixed(3) : '';
    if (wk !== sliceKey){ slice = want; sliceKey = wk; if (res) resMesh(); }
    if (err && cur !== lastCur) flyToError(tip);
    lastCur = cur;
    applyVis(); req();
  }

  // ——— visibility (Tuner's set, spec sect. 3) and Verify Compare ———
  const OBJ = [['part', 2], ['stock', 5], ['result', 3], ['holder', 6], ['tool', 7], ['fixture', 8], ['machine', 9], ['path', 16]];
  const vis = TT.load('touch.vis', {part:false, stock:false, result:true, holder:true, tool:true, fixture:true, machine:true, path:true, vc:false});
  function applyVis(){
    OBJ.forEach(o => { G[o[0]].visible = !!vis[o[0]]; });
    headMachine.visible = !!vis.machine;
    G.result.children.forEach(m => { if (m.isMesh) m.material = vis.vc ? M.resultVC : M.result; });
    root.classList.toggle('vc', !!vis.vc); host.classList.toggle('vc', !!vis.vc);
  }
  function setVis(k, v){ vis[k] = v; TT.keep('touch.vis', vis); applyVis(); renderPlates(); req(); }

  // ——— the plates ———
  const IC = {
    rotate:'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    pan:'<path d="M12 3.5v17M3.5 12h17"/><path d="m9.5 6 2.5-2.5L14.5 6M9.5 18l2.5 2.5 2.5-2.5M6 9.5 3.5 12 6 14.5M18 9.5l2.5 2.5-2.5 2.5"/>',
    zoom:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/>',
    fit:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/>'
  };
  const svg = d => '<svg class="tk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  // a square key, the icon alone (Ruslan: narrower plates); its name for the reader and the desk's hover,
  // the long-press tip — block 8
  const Q = (attrs, icon, label, cls) => '<button class="v3-k sq' + (cls ? ' ' + cls : '') + '" ' + attrs + ' aria-label="' + esc(label) + '" title="' + esc(label) + '">' + icon + '</button>';
  // a view's icon — a cube with the face it looks at filled
  function cube(face){
    const top = 'M12 3.5 19.5 7.5 12 11.5 4.5 7.5Z', lf = 'M4.5 7.5 12 11.5V20.5L4.5 16.5Z', rt = 'M19.5 7.5 12 11.5V20.5L19.5 16.5Z';
    const f = d => '<path d="' + d + '" fill="currentColor" fill-opacity=".45" stroke="none"/>';
    return (face === 'iso' ? f(top) + f(lf) + f(rt) : face === 'top' ? f(top) : face === 'front' ? f(lf) : f(rt)) +
      '<path d="' + top + '"/><path d="M4.5 7.5V16.5L12 20.5 19.5 16.5V7.5M12 11.5V20.5"/>';
  }
  let finger = TT.load('touch.finger', 'rotate');
  const tools = document.createElement('div'), right = document.createElement('div'), keyEl = document.createElement('div'), cubeEl = document.createElement('div');
  tools.className = 'v3-p v3-tools'; right.className = 'v3-p v3-r'; keyEl.className = 'v3-key'; cubeEl.className = 'v3-cube';
  root.appendChild(cubeEl); root.appendChild(tools); root.appendChild(right); root.appendChild(keyEl);
  // ——— the view cube, bottom left (as ENCY's): a tap on a face — the view from that side, a drag — orbit;
  // Home — Iso, fitted; ↺ ↻ — a quarter turn. Drawn from the camera itself, so it always agrees with the scene.
  // Faces are the targets (big enough for a finger); the axes are the machine's (turning: Z along the spindle)
  const CR = 30, FACES = [
    {n:[0, 1, 0], k:'top'}, {n:[0, -1, 0], k:'bottom'}, {n:[0, 0, 1], k:'front'},
    {n:[0, 0, -1], k:'back'}, {n:[1, 0, 0], k:'right'}, {n:[-1, 0, 0], k:'left'}];
  let axes = [];
  const cubeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  cubeSvg.setAttribute('viewBox', '-60 -60 120 120'); cubeEl.appendChild(cubeSvg);
  const TURN = '<path d="M5.5 12a6.5 6.5 0 1 0 1.9-4.6"/><path d="M7 3.5v4h4"/>';
  const HOME = '<path d="M4 11.5 12 4.5l8 7"/><path d="M6.5 9.5V19.5h11V9.5"/>';
  cubeEl.insertAdjacentHTML('beforeend',
    '<button class="vc-btn vc-home" data-c="home"></button><button class="vc-btn vc-ccw" data-c="ccw"></button><button class="vc-btn vc-cw" data-c="cw"></button>');
  let cubeKey = '';
  function drawCube(){
    const k = cam.yaw.toFixed(4) + cam.pitch.toFixed(4) + t('v_top'); if (k === cubeKey) return; cubeKey = k;
    const inv = camera.quaternion.clone().invert(), P = a => { const v = new THREE.Vector3(a[0], a[1], a[2]).applyQuaternion(inv); return [v.x, -v.y, v.z]; };
    const pt = a => { const p = P(a); return p[0].toFixed(1) + ',' + p[1].toFixed(1); };
    let h = '';
    const o = [0, 1, 2].map(i => -CR * axes.reduce((s, a) => s + a.d[i], 0));
    axes.forEach(a => { const e = P(o.map((v, i) => v + a.d[i] * (2 * CR + 6))), s = P(o); h += '<line class="vc-ax ' + a.c + '" x1="' + s[0].toFixed(1) + '" y1="' + s[1].toFixed(1) + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>'; });
    FACES.map(f => ({f, z:P(f.n)[2]})).filter(x => x.z > 0.02).sort((a, b) => a.z - b.z).forEach(x => {
      const n = x.f.n, u = n[1] ? [1, 0, 0] : [0, 1, 0], v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const q = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(s => pt([0, 1, 2].map(i => CR * (n[i] + u[i] * s[0] + v[i] * s[1]))));
      h += '<polygon class="vc-face' + (x.f.k === 'top' ? ' top' : '') + (x.z > 0.995 ? ' cur' : x.z > 0.55 ? ' lit' : '') + '" data-f="' + x.f.k + '" points="' + q.join(' ') + '"/>';
      if (x.z > 0.4){ const c = P(n.map(v2 => v2 * CR)); h += '<text class="vc-lbl" x="' + c[0].toFixed(1) + '" y="' + c[1].toFixed(1) + '">' + esc(t('v_' + x.f.k)) + '</text>'; }
    });
    axes.forEach(a => { const e = P(o.map((v, i) => v + a.d[i] * (2 * CR + 14))); h += '<text class="vc-axl ' + a.c + '" x="' + e[0].toFixed(1) + '" y="' + e[1].toFixed(1) + '">' + a.l + '</text>'; });
    cubeSvg.innerHTML = h;
  }
  function viewFrom(k){
    const n = FACES.find(f => f.k === k).n;
    if (n[1]) go({pitch:n[1] * (Math.PI / 2 - 0.001)}); else go({yaw:Math.atan2(n[0], n[2]), pitch:0});
  }
  let cd = null;
  cubeEl.addEventListener('pointerdown', e => {
    if (e.target.closest('.vc-btn')) return;
    cd = {x:e.clientX, y:e.clientY, f:e.target.getAttribute && e.target.getAttribute('data-f'), moved:false};
    try { cubeEl.setPointerCapture(e.pointerId); } catch (x) {}
    if (cd.f){ const el = cubeSvg.querySelector('[data-f="' + cd.f + '"]'); if (el) el.classList.add('press'); }
  });
  cubeEl.addEventListener('pointermove', e => {
    if (!cd) return;
    const dx = (e.clientX - cd.x) / (TT.scale || 1), dy = (e.clientY - cd.y) / (TT.scale || 1);
    if (!cd.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    cd.moved = true; tw = null;
    cam.yaw -= dx * 0.012; cam.pitch = Math.max(-1.55, Math.min(1.55, cam.pitch + dy * 0.01)); cd.x = e.clientX; cd.y = e.clientY; req();
  });
  function cubeUp(){ if (!cd) return; const c = cd; cd = null; cubeKey = ''; req(); if (!c.moved && c.f) viewFrom(c.f); }
  cubeEl.addEventListener('pointerup', cubeUp); cubeEl.addEventListener('pointercancel', () => { cd = null; cubeKey = ''; req(); });
  cubeEl.addEventListener('click', e => {
    const b = e.target.closest('.vc-btn'); if (!b) return;
    if (b.dataset.c === 'home') fitTo(VIEWS.iso);
    else go({yaw:cam.yaw + (b.dataset.c === 'cw' ? 1 : -1) * Math.PI / 2});
  });

  function renderPlates(){
    tools.innerHTML = Q('data-v="fit"', svg(IC.fit), t('v_fit')) + '<span class="v3-div"></span>' +
      '<div class="v3-g" role="radiogroup">' + ['rotate', 'pan', 'zoom'].map(m =>
        Q('data-mode="' + m + '" role="radio" aria-checked="' + (finger === m) + '"', svg(IC[m]), t('v_' + m), finger === m ? 'cur' : '')).join('') + '</div>';
    const cb = cubeEl.querySelectorAll('.vc-btn');
    [['home', HOME, t('v_home')], ['ccw', TURN, t('v_ccw')], ['cw', TURN, t('v_cw')]].forEach((b, i) => {
      cb[i].innerHTML = svg(b[1]); cb[i].setAttribute('aria-label', b[2]); cb[i].title = b[2]; });
    cubeKey = '';
    right.innerHTML = '<div class="v3-g v3-vis">' + OBJ.map(o =>
        Q('data-vis="' + o[0] + '" role="switch" aria-checked="' + !!vis[o[0]] + '"', ui.spr('view', 1, o[1]), t('o_' + o[0]), 'vis' + (vis[o[0]] ? ' on' : ''))).join('') + '</div>' +
      Q('data-v="vis" aria-haspopup="dialog"', ui.spr('view', 1, 1), t('o_vis'), 'more') +
      '<span class="v3-div"></span>' +
      Q('data-vis="vc" role="switch" aria-checked="' + !!vis.vc + '"', ui.spr('fn', 1, 7), t('o_verify'), 'vc' + (vis.vc ? ' on' : ''));
    keyEl.innerHTML = '<b>' + esc(t('vc_title')) + '</b>' + [['rest', VC.rest], ['ok', VC.ok], ['gouge', VC.gouge]].map(k =>
      '<span><i style="--c:#' + k[1].getHexString() + '"></i>' + esc(t('vc_' + k[0])) + '</span>').join('');
    compactPlates();
  }
  // the corners share the view: the colour key (Verify Compare on) sits bottom right, or above the cube's
  // height when the row next to the cube reaches under it; the visibility column folds into one key
  // ("Visibility" → tiles) when it would come down onto the key or past the view
  function compactPlates(){
    const W = host.clientWidth, H = host.clientHeight, m = parseFloat(getComputedStyle(cubeEl).left) || 12;
    keyEl.classList.remove('up'); right.classList.remove('c');
    let low = 0;
    if (vis.vc){
      const kw = keyEl.offsetWidth, kh = keyEl.offsetHeight, rowEnd = tools.offsetLeft + tools.offsetWidth;
      if (rowEnd + 8 > W - m - kw){ keyEl.classList.add('up'); low = cubeEl.offsetHeight + 8 + kh + 8; } else low = kh + 8;
    }
    if (right.offsetHeight > H - 2 * m - low) right.classList.add('c');
  }
  tools.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode){ finger = b.dataset.mode; TT.keep('touch.finger', finger); renderPlates(); }
    else if (b.dataset.v === 'fit') fitTo();
  });
  right.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.vis) setVis(b.dataset.vis, !vis[b.dataset.vis]);
    else if (b.dataset.v === 'vis') visPop(b);
  });
  // the folded visibility: the same toggles as tiles (the checks' tiles)
  function visPop(anchor){
    const tile = o => '<button class="sm-ck-t' + (vis[o[0]] ? ' on' : '') + '" role="switch" aria-checked="' + !!vis[o[0]] + '" data-vk="' + o[0] + '">' +
      ui.spr('view', 1, o[1]) + '<i class="sm-ck-m"></i><b><span>' + esc(t('o_' + o[0])) + '</span></b></button>';
    ui.pop(anchor, '<div class="tk-mh">' + esc(t('o_vis')) + '</div><div class="sm-ck">' + OBJ.map(tile).join('') + '</div>', (e) => {
      const el = e.target.closest('[data-vk]'); if (!el) return;
      const k = el.dataset.vk; vis[k] = !vis[k]; TT.keep('touch.vis', vis); el.classList.toggle('on', vis[k]); el.setAttribute('aria-checked', vis[k]); applyVis(); req();
    }, 'v3-vpop');
  }

  // ——— gestures: one finger by the mode, two — pan and pinch, double tap — Fit; the wheel on a desk ———
  const cnv = renderer.domElement, pts = new Map();
  let g0 = null, lastTap = 0, lastTapAt = null, moved = 0;
  const sc = () => TT.scale || 1;
  function panBy(dx, dy){
    const k = 2 * cam.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / host.clientHeight;
    const r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    cam.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k);
  }
  function zoomBy(f){ cam.dist = Math.max(20, Math.min(20000, cam.dist * f)); }
  cnv.addEventListener('pointerdown', e => {
    try { cnv.setPointerCapture(e.pointerId); } catch (x) {} pts.set(e.pointerId, {x:e.clientX / sc(), y:e.clientY / sc()}); tw = null; cnv.classList.add('drag');
    if (pts.size === 1){ moved = 0; g0 = {t:performance.now()}; }
    if (pts.size > 2) return;
  });
  cnv.addEventListener('pointermove', e => {
    const q = pts.get(e.pointerId); if (!q) return;
    const x = e.clientX / sc(), y = e.clientY / sc(), dx = x - q.x, dy = y - q.y;
    if (pts.size === 1){
      moved += Math.abs(dx) + Math.abs(dy);
      if (finger === 'rotate'){ cam.yaw -= dx * 0.008; cam.pitch = Math.max(-1.5, Math.min(1.5, cam.pitch + dy * 0.008)); }
      else if (finger === 'pan') panBy(dx, dy);
      else zoomBy(Math.exp(dy * 0.006));
    } else if (pts.size === 2){
      const [a, b] = [...pts.values()], ca = {x:(a.x + b.x) / 2, y:(a.y + b.y) / 2}, d0 = Math.hypot(a.x - b.x, a.y - b.y);
      q.x = x; q.y = y;
      const [a2, b2] = [...pts.values()], cb = {x:(a2.x + b2.x) / 2, y:(a2.y + b2.y) / 2}, d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y);
      panBy(cb.x - ca.x, cb.y - ca.y); if (d0 > 10 && d1 > 10) zoomBy(d0 / d1);
      moved += 99; req(); return;
    }
    q.x = x; q.y = y; req();
  });
  function up(e){
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId); if (!pts.size) cnv.classList.remove('drag');
    if (pts.size || !g0) return;
    const now = performance.now();
    if (moved < 10 && now - g0.t < 300){
      const at = {x:e.clientX / sc(), y:e.clientY / sc()};
      if (now - lastTap < 320 && lastTapAt && Math.hypot(at.x - lastTapAt.x, at.y - lastTapAt.y) < 30){ fitTo(); lastTap = 0; }
      else { lastTap = now; lastTapAt = at; }
    }
    g0 = null;
  }
  cnv.addEventListener('pointerup', up); cnv.addEventListener('pointercancel', up);
  cnv.addEventListener('wheel', e => { e.preventDefault(); tw = null; zoomBy(Math.exp(e.deltaY * 0.0012)); req(); }, {passive:false});

  TT.on('projects', sync); TT.on('active', sync);
  TT.on('lang', renderPlates);
  TT.on('variant', () => { renderPlates(); resize(); sync(); });
  TT.on('resize', resize);
  renderPlates(); resize(); sync();
  // for the stand and its checks: the view, the camera, the visibility, and how the result is coloured
  TT.view3d = {fit:() => fitTo(), view:k => fitTo(VIEWS[k]), cam, vis, setVis, draw:() => { frame(performance.now() + 1e5); },   // a frame at once, tweens finished (a hidden tab gets no animation frames)
    colours:() => { const a = resGeo && resGeo.attributes.color; if (!a) return null; const n = {rest:0, ok:0, gouge:0};
      for (let v = 0; v < a.count; v++){ const r = a.getX(v), g = a.getY(v); n[r > 0.8 && g < 0.5 ? 'gouge' : g > r && a.getZ(v) > 0.8 ? 'rest' : 'ok']++; } return n; }};
}
