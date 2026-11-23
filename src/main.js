import './ui/hud.css';
import * as E from './engine/engine.js';

(function(){
  var W = E.W, H = E.H;
  var scene = E.buildScene();
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var img = ctx.createImageData(W, H), fb = new Uint32Array(img.data.buffer), zb = new Float32Array(W * H);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SAMPLE = [
    ['Spirited Away','Arrival','Paddington 2','Perfect Days'],
    ['Severance','Andor','Fleabag','The Bear'],
    ['Dune','La sombra del viento','Piranesi','Klara y el Sol'],
    ['Rumours','Discovery','Blonde','Vespertine'],
    ['Catan','Azul','Pandemic','Carcassonne'],
    ['Hades','Celeste','It Takes Two','Outer Wilds']
  ];
  var DONE = ['VISTA','VISTA','LEÍDO','ESCUCHADO','JUGADO','JUGADO'];
  var WANT = ['QUIERO VER','QUIERO VER','QUIERO LEER','QUIERO OÍR','QUIERO JUGAR','QUIERO JUGAR'];

  var state = { shelf: 1, cell: 0, overview: false };
  var cam = { x: 0, y: 1.85, z: 0.8, yaw: 0, pitch: 0.02 };
  var mx = 0, my = 0;

  var secsEl = document.getElementById('secs');
  var secBtns = scene.sections.map(function(label, i){
    var li = document.createElement('li'), b = document.createElement('button');
    b.className = 'sec'; b.textContent = label;
    b.addEventListener('click', function(){ state.cell = i; state.overview = false; sync(); });
    li.appendChild(b); secsEl.appendChild(li); return b;
  });
  var tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab[data-shelf]'));
  tabBtns.forEach(function(b){ b.addEventListener('click', function(){ state.shelf = +b.dataset.shelf; state.overview = false; sync(); }); });
  var ovBtn = document.getElementById('ov');
  ovBtn.addEventListener('click', function(){ state.overview = !state.overview; sync(); });

  function moveShelf(d){ state.shelf = (state.shelf + d + 3) % 3; state.overview = false; sync(); }
  function moveCell(d){ state.cell = (state.cell + d + 6) % 6; state.overview = false; sync(); }
  document.getElementById('pL').addEventListener('click', function(){ moveShelf(-1); });
  document.getElementById('pR').addEventListener('click', function(){ moveShelf(1); });
  document.getElementById('pU').addEventListener('click', function(){ moveCell(-1); });
  document.getElementById('pD').addEventListener('click', function(){ moveCell(1); });
  document.addEventListener('keydown', function(e){
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    var k = e.key;
    if (k === 'ArrowLeft') moveShelf(-1);
    else if (k === 'ArrowRight') moveShelf(1);
    else if (k === 'ArrowUp') { moveCell(-1); e.preventDefault(); }
    else if (k === 'ArrowDown') { moveCell(1); e.preventDefault(); }
    else if (k === 'v' || k === 'V') { state.overview = !state.overview; sync(); }
  });
  document.getElementById('stage').addEventListener('pointermove', function(e){
    var r = this.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });

  function sync(){
    tabBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(!state.overview && +b.dataset.shelf === state.shelf)); });
    ovBtn.setAttribute('aria-pressed', String(state.overview));
    secBtns.forEach(function(b, i){ if (i === state.cell) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    document.getElementById('shelfName').textContent = scene.shelfNames[state.shelf];
    document.getElementById('secName').textContent = scene.sections[state.cell];
    var ent = document.getElementById('ent'); ent.innerHTML = '';
    for (var k = 0; k < 3; k++) {
      var li = document.createElement('li'), t = document.createElement('span'), c = document.createElement('span');
      var want = (k + state.shelf) % 2 === 1;
      t.textContent = SAMPLE[state.cell][(state.shelf + k) % 4];
      c.className = 'chip' + (want ? ' want' : ''); c.textContent = want ? WANT[state.cell] : DONE[state.cell];
      li.appendChild(t); li.appendChild(c); ent.appendChild(li);
    }
  }
  sync();

  var last = 0, t0 = performance.now();
  function frame(ts){
    requestAnimationFrame(frame);
    if (ts - last < 33) return;
    last = ts;
    var tx, ty, tz;
    if (state.overview) { tx = 0; ty = 2.1; tz = 2.9; }
    else { tx = scene.shelfX[state.shelf] * 0.85; ty = 1.85; tz = 0.8; }
    var k = 0.12;
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
    var amp = reduce ? 0 : 1;
    var yaw = -mx * 0.05 * amp, pitch = 0.02 + my * 0.03 * amp;
    cam.yaw += (yaw - cam.yaw) * 0.1; cam.pitch += (pitch - cam.pitch) * 0.1;
    var t = (ts - t0) / 1000;
    E.render(fb, zb, scene, cam, { overview: state.overview, shelf: state.shelf, cell: state.cell, t: reduce ? 0 : t });
    ctx.putImageData(img, 0, 0);
  }
  requestAnimationFrame(frame);
})();
