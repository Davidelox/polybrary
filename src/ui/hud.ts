import './hud.css';
import { DONE, SAMPLE, WANT } from '../demo/sample';
import type { Scene } from '../engine/types';

export interface HudState {
  shelf: number;
  cell: number;
  overview: boolean;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function createHud(scene: Scene): HudState {
  const state: HudState = { shelf: 1, cell: 0, overview: false };

  const secsEl = $('secs');
  const secBtns = scene.sections.map(function (label, i) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.className = 'sec'; b.textContent = label;
    b.addEventListener('click', function () { state.cell = i; state.overview = false; sync(); });
    li.appendChild(b); secsEl.appendChild(li); return b;
  });
  const tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab[data-shelf]')) as HTMLButtonElement[];
  tabBtns.forEach(function (b) { b.addEventListener('click', function () { state.shelf = +b.dataset.shelf!; state.overview = false; sync(); }); });
  const ovBtn = $('ov');
  ovBtn.addEventListener('click', function () { state.overview = !state.overview; sync(); });

  function moveShelf(d: number) { state.shelf = (state.shelf + d + 3) % 3; state.overview = false; sync(); }
  function moveCell(d: number) { state.cell = (state.cell + d + 6) % 6; state.overview = false; sync(); }
  $('pL').addEventListener('click', function () { moveShelf(-1); });
  $('pR').addEventListener('click', function () { moveShelf(1); });
  $('pU').addEventListener('click', function () { moveCell(-1); });
  $('pD').addEventListener('click', function () { moveCell(1); });
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target as HTMLElement).tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    const k = e.key;
    if (k === 'ArrowLeft') moveShelf(-1);
    else if (k === 'ArrowRight') moveShelf(1);
    else if (k === 'ArrowUp') { moveCell(-1); e.preventDefault(); }
    else if (k === 'ArrowDown') { moveCell(1); e.preventDefault(); }
    else if (k === 'v' || k === 'V') { state.overview = !state.overview; sync(); }
  });

  function sync() {
    tabBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(!state.overview && +b.dataset.shelf! === state.shelf)); });
    ovBtn.setAttribute('aria-pressed', String(state.overview));
    secBtns.forEach(function (b, i) { if (i === state.cell) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    $('shelfName').textContent = scene.shelfNames[state.shelf];
    $('secName').textContent = scene.sections[state.cell];
    const ent = $('ent'); ent.innerHTML = '';
    for (let k = 0; k < 3; k++) {
      const li = document.createElement('li'), t = document.createElement('span'), c = document.createElement('span');
      const want = (k + state.shelf) % 2 === 1;
      t.textContent = SAMPLE[state.cell][(state.shelf + k) % 4];
      c.className = 'chip' + (want ? ' want' : ''); c.textContent = want ? WANT[state.cell] : DONE[state.cell];
      li.appendChild(t); li.appendChild(c); ent.appendChild(li);
    }
  }
  sync();
  return state;
}
