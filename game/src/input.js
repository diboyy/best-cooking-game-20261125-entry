// input.js — mouse clicks and keyboard shortcuts, translated into world
// actions. Hit-testing uses the station rectangles from config.js, so the
// clickable area is always exactly the drawn area.
import { STATIONS, INGREDIENTS, binRect } from './config.js';
import {
  takeRice,
  addIngredient,
  toggleWok,
  plateDish,
  trashPan,
  startDay,
} from './world.js';
import { sfx, unlockAudio, toggleMute } from './audio.js';

function playResult(result) {
  switch (result) {
    case 'rice': sfx.scoopRice(); break;
    case 'chop': sfx.chop(); break;
    case 'sizzle': sfx.sizzleStart(); break;
    case 'cooked': sfx.toss(); break;
    case 'perfect-fry': sfx.toss(); break;
    case 'plate': sfx.plate(); break;
    case 'served': sfx.serveGood(); break;
    case 'burnt': sfx.burnt(); break;
    case 'denied': sfx.denied(); break;
    default: break;
  }
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function handleAction(world, result) {
  playResult(result);
  return result;
}

export function clickAt(world, px, py) {
  unlockAudio();
  if (world.phase === 'title' || world.phase === 'over') {
    // Any click on the title / results screen starts (or restarts) the day.
    if (world.phase === 'title') { startDay(world); sfx.serveGood(); }
    else if (py > 480) { startDay(world); sfx.serveGood(); }
    return;
  }
  // Ingredient bins first — they sit inside the counter station.
  for (let i = 0; i < INGREDIENTS.length; i++) {
    if (pointInRect(px, py, binRect(i))) {
      handleAction(world, addIngredient(world, INGREDIENTS[i].id));
      return;
    }
  }
  if (pointInRect(px, py, STATIONS.rice)) { handleAction(world, takeRice(world)); return; }
  if (pointInRect(px, py, STATIONS.wok)) { handleAction(world, toggleWok(world)); return; }
  if (pointInRect(px, py, STATIONS.plate)) { handleAction(world, plateDish(world)); return; }
  if (pointInRect(px, py, STATIONS.trash)) { handleAction(world, trashPan(world)); return; }
  if (pointInRect(px, py, STATIONS.serve)) {
    // The serve window just reminds the player; plating auto-serves a match.
    handleAction(world, plateDish(world));
  }
}

export function keyDown(world, event) {
  unlockAudio();
  const key = event.key.toLowerCase();
  if (world.phase === 'title' || world.phase === 'over') {
    if (key === 'enter' || key === ' ') {
      startDay(world);
      sfx.serveGood();
      event.preventDefault();
    }
    return;
  }
  if (key === '1') handleAction(world, takeRice(world));
  else if (key >= '2' && key <= '6') {
    const ing = INGREDIENTS[Number(key) - 2];
    if (ing) handleAction(world, addIngredient(world, ing.id));
  } else if (key === 'w') handleAction(world, toggleWok(world));
  else if (key === 'p') handleAction(world, plateDish(world));
  else if (key === 't') handleAction(world, trashPan(world));
  else if (key === 'm') toggleMute();
  else if (key === ' ') event.preventDefault();
}

export function attachInput(canvas, world) {
  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(canvas, event);
    clickAt(world, p.x, p.y);
  });
  window.addEventListener('keydown', (event) => keyDown(world, event));
}
