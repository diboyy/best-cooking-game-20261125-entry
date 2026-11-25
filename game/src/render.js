// render.js — every pixel of Nasi Goreng Rush is drawn here with canvas
// shapes: the night kitchen, the order board, the tickets, the stations, the
// food in the wok and on the plate. No images, no fonts from the network.
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PALETTE,
  STATIONS,
  ORDER_BOARD,
  TICKET_WIDTH,
  TICKET_GAP,
  INGREDIENTS,
  INGREDIENT_BY_ID,
  RECIPE_BY_ID,
  binRect,
  FRY_PERFECT_FROM,
  FRY_PERFECT_TO,
} from './config.js';
import { panMatchesRecipe, panTotalIngredients, dayProgress, rushLevel } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function drawWall(ctx, world) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, PALETTE.wallTop);
  grad.addColorStop(0.55, PALETTE.wallBottom);
  grad.addColorStop(0.55, PALETTE.floor);
  grad.addColorStop(1, '#241209');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // Hanging lamps, kept clear of the centred title.
  for (const lx of [180, 880]) {
    ctx.strokeStyle = '#120a06';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 34); ctx.stroke();
    ctx.fillStyle = '#ffca6a';
    ctx.beginPath(); ctx.arc(lx, 44, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 200, 106, 0.12)';
    ctx.beginPath(); ctx.arc(lx, 44, 46, 0, Math.PI * 2); ctx.fill();
  }
  // Menu chalkboard strip on the wall.
  ctx.fillStyle = '#1d2b1a';
  roundRect(ctx, 36, 8, 400, 52, 8);
  ctx.fill();
  ctx.strokeStyle = '#4a6b43';
  ctx.lineWidth = 2;
  roundRect(ctx, 36, 8, 400, 52, 8);
  ctx.stroke();
  text(ctx, 'WARUNG DIBOYY  •  NASI GORENG', 52, 42, 18, '#cfe8c0');
  // Wok-fire glow behind the wok station.
  const glow = ctx.createRadialGradient(799, 395, 10, 799, 395, 190);
  glow.addColorStop(0, 'rgba(255, 140, 46, 0.20)');
  glow.addColorStop(1, 'rgba(255, 140, 46, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(600, 220, 400, 320);
}

function drawTopBar(ctx, world) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 64, CANVAS_WIDTH, 2);
  // Title centred; stats live in the strip at the bottom so nothing collides.
  text(ctx, 'NASI GORENG RUSH', CANVAS_WIDTH / 2, 42, 28, PALETTE.cream, 'center');
  // Day clock — big, readable, colour shifts as closing nears.
  const urgent = world.timeLeft <= 30 && world.phase === 'playing';
  const clockColor = urgent ? PALETTE.bad : PALETTE.cream;
  text(ctx, `DAY ${formatClock(world.timeLeft)}`, 1244, 40, 26, clockColor, 'right');
  // Day progress bar under the clock.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 1060, 50, 184, 8, 4); ctx.fill();
  ctx.fillStyle = urgent ? PALETTE.bad : PALETTE.accent;
  roundRect(ctx, 1060, 50, 184 * dayProgress(world), 8, 4); ctx.fill();
}

function drawStatsStrip(ctx, world) {
  // One centred line under the stations: score, coins, served, missed, combo.
  const parts = [
    `SCORE ${world.score}`,
    `COINS ${world.coins}`,
    `SERVED ${world.served}`,
    `MISSED ${world.missed}/3`,
  ];
  if (world.combo >= 2) parts.push(`COMBO x${world.combo}`);
  const line = parts.join('    •    ');
  text(ctx, line, CANVAS_WIDTH / 2, 640, 19, '#ffd9a0', 'center');
}

function drawTicket(ctx, order, x, y) {
  const recipe = RECIPE_BY_ID[order.recipeId];
  const frac = Math.max(0, order.timeLeft / order.total);
  const urgent = frac < 0.35;
  ctx.save();
  if (urgent && Math.floor(order.timeLeft * 2) % 2 === 0) ctx.translate(0, 1);
  ctx.fillStyle = PALETTE.ticket;
  roundRect(ctx, x, y, TICKET_WIDTH, 168, 10);
  ctx.fill();
  ctx.strokeStyle = urgent ? PALETTE.bad : PALETTE.ticketEdge;
  ctx.lineWidth = urgent ? 4 : 2;
  roundRect(ctx, x, y, TICKET_WIDTH, 168, 10);
  ctx.stroke();
  // Ticket header.
  ctx.fillStyle = recipe.color;
  roundRect(ctx, x, y, TICKET_WIDTH, 34, 10);
  ctx.fill();
  ctx.fillRect(x, y + 24, TICKET_WIDTH, 10);
  text(ctx, `#${order.id}  ${recipe.short.toUpperCase()}`, x + 12, y + 23, 16, PALETTE.ink);
  text(ctx, recipe.name, x + 12, y + 58, 15, PALETTE.ink);
  // Ingredient dots the ticket needs.
  let dx = x + 12;
  const needs = { ...recipe.needs };
  for (const [id, count] of Object.entries(needs)) {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = INGREDIENT_BY_ID[id].dot;
      ctx.beginPath(); ctx.arc(dx + 9, y + 84, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(dx + 9, y + 84, 9, 0, Math.PI * 2); ctx.stroke();
      dx += 22;
    }
  }
  text(ctx, '+ rice', x + 12, y + 112, 13, '#7a5a34');
  text(ctx, `${recipe.price} coins`, x + TICKET_WIDTH - 12, y + 112, 13, '#7a5a34', 'right');
  // Countdown bar + seconds.
  ctx.fillStyle = '#e8d5ae';
  roundRect(ctx, x + 12, y + 126, TICKET_WIDTH - 24, 14, 7); ctx.fill();
  ctx.fillStyle = frac > 0.5 ? PALETTE.good : frac > 0.25 ? PALETTE.warn : PALETTE.bad;
  roundRect(ctx, x + 12, y + 126, (TICKET_WIDTH - 24) * frac, 14, 7); ctx.fill();
  text(ctx, `${Math.ceil(order.timeLeft)}s`, x + TICKET_WIDTH - 12, y + 160, 15, urgent ? PALETTE.bad : PALETTE.ink, 'right');
  ctx.restore();
}

function drawOrderBoard(ctx, world) {
  ctx.fillStyle = PALETTE.board;
  roundRect(ctx, ORDER_BOARD.x, ORDER_BOARD.y, ORDER_BOARD.w, ORDER_BOARD.h, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.boardEdge;
  ctx.lineWidth = 3;
  roundRect(ctx, ORDER_BOARD.x, ORDER_BOARD.y, ORDER_BOARD.w, ORDER_BOARD.h, 12);
  ctx.stroke();
  text(ctx, 'ORDER BOARD', ORDER_BOARD.x + 16, ORDER_BOARD.y + 26, 15, '#c9a37e');
  const rush = rushLevel(world);
  if (world.phase === 'playing' && rush > 0.66) {
    text(ctx, 'RUSH HOUR!', ORDER_BOARD.x + ORDER_BOARD.w - 16, ORDER_BOARD.y + 26, 15, PALETTE.accentHot, 'right');
  }
  if (world.orders.length === 0) {
    text(ctx, 'No orders — the next customer is on the way…', ORDER_BOARD.x + 16, ORDER_BOARD.y + 120, 20, '#8a6a4a');
    return;
  }
  world.orders.slice(0, MAX_TICKETS_SHOWN).forEach((order, i) => {
    const x = ORDER_BOARD.x + 16 + i * (TICKET_WIDTH + TICKET_GAP);
    drawTicket(ctx, order, x, ORDER_BOARD.y + 36);
  });
}

const MAX_TICKETS_SHOWN = 5;

function drawStationShell(ctx, rect, label, hint, active) {
  ctx.fillStyle = PALETTE.counterTop;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fill();
  ctx.strokeStyle = active ? PALETTE.accent : PALETTE.counterEdge;
  ctx.lineWidth = active ? 4 : 2;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
  ctx.stroke();
  ctx.fillStyle = PALETTE.counterFront;
  roundRect(ctx, rect.x, rect.y + rect.h - 34, rect.w, 34, 12);
  ctx.fill();
  text(ctx, label, rect.x + 14, rect.y + 26, 17, PALETTE.cream);
  text(ctx, hint, rect.x + rect.w - 14, rect.y + 26, 12, '#d9b98c', 'right');
}

function drawRiceCooker(ctx, world) {
  const r = STATIONS.rice;
  drawStationShell(ctx, r, 'Rice Cooker', 'click / [1]', world.pan.rice);
  const cx = r.x + r.w / 2;
  // Pot body.
  ctx.fillStyle = '#c8ccd4';
  roundRect(ctx, cx - 58, r.y + 62, 116, 78, 12);
  ctx.fill();
  ctx.strokeStyle = '#8a8f99';
  ctx.lineWidth = 2;
  roundRect(ctx, cx - 58, r.y + 62, 116, 78, 12);
  ctx.stroke();
  // Lid, slightly ajar when rice was taken.
  ctx.fillStyle = '#e8ebf0';
  ctx.beginPath();
  ctx.ellipse(cx, r.y + 62, 62, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9aa0ab';
  ctx.beginPath(); ctx.arc(cx, r.y + 54, 8, 0, Math.PI * 2); ctx.fill();
  // Steaming rice inside.
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath();
  ctx.ellipse(cx, r.y + 66, 46, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (world.pan.rice) {
    text(ctx, '✓ rice in pan', cx, r.y + 168, 15, PALETTE.good, 'center');
  } else {
    text(ctx, 'fluffy rice, ready', cx, r.y + 168, 14, '#d9b98c', 'center');
  }
  // Steam wisps.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  for (const [sx, ph] of [[-24, 0], [0, 0.7], [24, 1.4]]) {
    const t = (world.elapsed + ph) % 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + sx, r.y + 52 - t * 18);
    ctx.quadraticCurveTo(cx + sx + 6, r.y + 44 - t * 18, cx + sx - 4, r.y + 36 - t * 18);
    ctx.stroke();
  }
}

function drawIngredientBin(ctx, index, world) {
  const ing = INGREDIENTS[index];
  const r = binRect(index);
  const count = world.pan.counts[ing.id] || 0;
  ctx.fillStyle = '#2e1c10';
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = count > 0 ? PALETTE.accent : '#6b4a2f';
  ctx.lineWidth = count > 0 ? 3 : 2;
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.stroke();
  // The ingredient itself, drawn in code.
  const cx = r.x + r.w / 2;
  const cy = r.y + 34;
  if (ing.id === 'egg') {
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath(); ctx.ellipse(cx, cy, 20, 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.arc(cx, cy + 4, 8, 0, Math.PI * 2); ctx.fill();
  } else if (ing.id === 'chicken') {
    ctx.fillStyle = '#f2b28c';
    ctx.beginPath(); ctx.ellipse(cx, cy, 22, 15, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath(); ctx.arc(cx + 20, cy - 12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8dcc8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + 20, cy - 12); ctx.lineTo(cx + 30, cy - 24); ctx.stroke();
  } else if (ing.id === 'veg') {
    ctx.fillStyle = '#4caf50';
    for (const [ox, oy] of [[-12, 4], [0, -6], [12, 4]]) {
      ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, 11, 15, ox * 0.02, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.arc(cx, cy + 12, 5, 0, Math.PI * 2); ctx.fill();
  } else if (ing.id === 'sauce') {
    ctx.fillStyle = '#5d3a17';
    roundRect(ctx, cx - 11, cy - 20, 22, 40, 6); ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    roundRect(ctx, cx - 7, cy - 28, 14, 10, 3); ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.fillRect(cx - 11, cy - 4, 22, 12);
  } else if (ing.id === 'chili') {
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 6);
    ctx.quadraticCurveTo(cx, cy + 26, cx + 20, cy - 14);
    ctx.quadraticCurveTo(cx + 4, cy + 6, cx - 18, cy - 6);
    ctx.fill();
    ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx + 18, cy - 12); ctx.quadraticCurveTo(cx + 26, cy - 22, cx + 30, cy - 26); ctx.stroke();
  }
  text(ctx, ing.name, cx, r.y + 74, 13, PALETTE.cream, 'center');
  text(ctx, `[${ing.key}]`, cx, r.y + 90, 11, '#c9a37e', 'center');
  if (count > 0) {
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath(); ctx.arc(r.x + r.w - 12, r.y + 12, 13, 0, Math.PI * 2); ctx.fill();
    text(ctx, `x${count}`, r.x + r.w - 12, r.y + 17, 13, '#1a0f0a', 'center');
  }
}

function drawCounter(ctx, world) {
  const r = STATIONS.counter;
  drawStationShell(ctx, r, 'Ingredient Counter', 'click a bin / [2–6]', panTotalIngredients(world.pan) > 0);
  INGREDIENTS.forEach((_, i) => drawIngredientBin(ctx, i, world));
}

function drawFriedRiceMound(ctx, cx, cy, scale, burnt, perfect) {
  // A mound of fried rice with visible egg, veg and chicken bits.
  ctx.fillStyle = burnt ? '#2b2018' : '#e8b64c';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 52 * scale, 26 * scale, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = burnt ? '#1a130c' : '#d99a2b';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6 * scale, 34 * scale, 16 * scale, 0, Math.PI, 0);
  ctx.fill();
  if (!burnt) {
    const bits = [
      ['#f7c948', -22, -8], ['#9ed67a', 4, -14], ['#f2b28c', 20, -6],
      ['#ff6b5e', -6, -4], ['#fff3d6', 12, -16], ['#4caf50', -28, -2],
    ];
    for (const [color, ox, oy] of bits) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx + ox * scale, cy + oy * scale, 4 * scale, 0, Math.PI * 2); ctx.fill();
    }
    if (perfect) {
      ctx.fillStyle = 'rgba(255, 217, 77, 0.85)';
      ctx.beginPath(); ctx.arc(cx + 30 * scale, cy - 26 * scale, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawWok(ctx, world) {
  const r = STATIONS.wok;
  const active = world.frying || world.pan.cooked;
  drawStationShell(ctx, r, 'Wok', world.frying ? 'click / [W] to stop' : 'click / [W] to fry', active);
  const cx = r.x + r.w / 2;
  const cy = r.y + 118;
  // Flames under the wok while frying.
  if (world.frying) {
    for (const [fx, fh] of [[-46, 26], [-16, 36], [16, 30], [46, 22]]) {
      const flick = Math.sin(world.elapsed * 14 + fx) * 4;
      ctx.fillStyle = PALETTE.flame;
      ctx.beginPath();
      ctx.moveTo(cx + fx - 12, cy + 22);
      ctx.quadraticCurveTo(cx + fx, cy - fh - flick, cx + fx + 12, cy + 22);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Wok bowl.
  ctx.fillStyle = PALETTE.wokIron;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 88, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2a32';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 4, 78, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Handle.
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(cx + 84, cy - 6); ctx.lineTo(cx + 112, cy - 22); ctx.stroke();
  if (world.pan.rice) {
    drawFriedRiceMound(ctx, cx, cy - 6, 0.85, world.pan.burnt, world.pan.perfect);
  } else {
    text(ctx, 'empty wok', cx, cy - 8, 14, '#8a8f99', 'center');
  }
  // Fry progress band: green = perfect, red = burnt.
  if (world.frying || (world.pan.cooked && !world.pan.burnt)) {
    const bar = { x: r.x + 20, y: r.y + 158, w: r.w - 40, h: 12 };
    ctx.fillStyle = '#241610';
    roundRect(ctx, bar.x, bar.y, bar.w, bar.h, 6); ctx.fill();
    ctx.fillStyle = 'rgba(127, 208, 105, 0.35)';
    roundRect(ctx, bar.x + bar.w * FRY_PERFECT_FROM, bar.y, bar.w * (FRY_PERFECT_TO - FRY_PERFECT_FROM), bar.h, 6); ctx.fill();
    const frac = Math.min(1, world.pan.fry);
    ctx.fillStyle = frac >= 1 ? PALETTE.bad : frac >= FRY_PERFECT_FROM ? PALETTE.good : PALETTE.accent;
    roundRect(ctx, bar.x, bar.y, bar.w * frac, bar.h, 6); ctx.fill();
    text(ctx, world.frying ? 'FRYING…' : world.pan.perfect ? 'PERFECT FRY!' : 'cooked', cx, r.y + 148, 12, PALETTE.cream, 'center');
  }
  if (world.pan.burnt) {
    text(ctx, 'BURNT! [T] to trash', cx, r.y + 168, 14, PALETTE.bad, 'center');
  }
}

function drawPlateStation(ctx, world) {
  const r = STATIONS.plate;
  const hasDish = !!world.plate;
  drawStationShell(ctx, r, 'Plating', 'click / [P] to plate', hasDish);
  const cx = r.x + r.w / 2;
  const cy = r.y + 118;
  // Plate.
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath(); ctx.ellipse(cx, cy, 92, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9b98a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, 92, 30, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, 62, 18, 0, 0, Math.PI * 2); ctx.stroke();
  if (world.plate) {
    const recipe = world.plate.recipeId ? RECIPE_BY_ID[world.plate.recipeId] : null;
    drawFriedRiceMound(ctx, cx, cy - 4, 1.0, false, world.plate.perfect);
    // Garnish: a fried egg on top for a finished plate.
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath(); ctx.ellipse(cx + 34, cy - 22, 16, 11, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.arc(cx + 34, cy - 22, 6, 0, Math.PI * 2); ctx.fill();
    if (recipe) {
      text(ctx, recipe.name, cx, r.y + 168, 15, PALETTE.good, 'center');
      text(ctx, world.plate.perfect ? '★ perfect — serving!' : 'ready to serve', cx, r.y + 186, 12, '#d9b98c', 'center');
    } else {
      text(ctx, 'Mystery mix — no ticket wants this!', cx, r.y + 168, 14, PALETTE.warn, 'center');
    }
  } else if (world.pan.cooked) {
    text(ctx, 'cooked — plate it! [P]', cx, r.y + 168, 14, PALETTE.accent, 'center');
  } else {
    text(ctx, 'an empty plate waits', cx, r.y + 168, 14, '#d9b98c', 'center');
  }
}

function drawTrashAndServe(ctx, world) {
  const t = STATIONS.trash;
  ctx.fillStyle = '#3a3f4a';
  roundRect(ctx, t.x, t.y, t.w, t.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#6a7080';
  ctx.lineWidth = 2;
  roundRect(ctx, t.x, t.y, t.w, t.h, 12);
  ctx.stroke();
  text(ctx, '🗑 TRASH', t.x + t.w / 2, t.y + 40, 16, '#e8ebf0', 'center');
  text(ctx, '[T] clear pan', t.x + t.w / 2, t.y + 66, 12, '#aab0bc', 'center');

  const s = STATIONS.serve;
  ctx.fillStyle = '#4a2c14';
  roundRect(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 2;
  roundRect(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.stroke();
  text(ctx, 'SERVE WINDOW', s.x + 16, s.y + 34, 16, PALETTE.cream);
  text(ctx, 'a matching dish serves itself', s.x + 16, s.y + 62, 13, '#d9b98c');
  text(ctx, `served today: ${world.served}   •   best combo x${world.bestCombo}`, s.x + 16, s.y + 82, 13, '#d9b98c');
}

function drawPanStatus(ctx, world) {
  // The pan's current contents, readable at a glance under the stations.
  const x = 180;
  const y = 520;
  text(ctx, 'YOUR PAN:', x, y + 30, 15, '#c9a37e');
  const parts = [];
  if (world.pan.rice) parts.push('rice');
  for (const [id, count] of Object.entries(world.pan.counts)) {
    parts.push(`${INGREDIENT_BY_ID[id].name} x${count}`);
  }
  if (world.pan.cooked) parts.push(world.pan.burnt ? 'BURNT' : world.pan.perfect ? 'perfect fry' : 'cooked');
  if (world.frying) parts.push('frying…');
  text(ctx, parts.length ? parts.join('  +  ') : '(empty — take rice [1])', x + 110, y + 30, 16, PALETTE.cream);
  // Recipe hints: what each ticket needs, as a cheat-sheet line. Kept short
  // on purpose so it ends before the serve window box at x=948.
  text(ctx, 'RECIPES: Biasa telur+kecap  •  Ayam ayam+kecap  •  Sayur sayur+telur  •  Pedas cabai x2+ayam  •  Spesial +semua', x, y + 62, 12, '#8a6a4a');
}

function drawMessage(ctx, world) {
  if (!world.message) return;
  const age = world.elapsed - world.messageAt;
  if (age > 3.5) return;
  const colors = { info: PALETTE.cream, good: PALETTE.good, warn: PALETTE.warn, bad: PALETTE.bad };
  ctx.globalAlpha = age > 2.5 ? Math.max(0, 1 - (age - 2.5)) : 1;
  text(ctx, world.message, CANVAS_WIDTH / 2, 688, 22, colors[world.messageKind] || PALETTE.cream, 'center');
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, world) {
  for (const f of world.floats) {
    const age = world.elapsed - f.born;
    ctx.globalAlpha = Math.max(0, 1 - age / f.life);
    text(ctx, f.text, f.x, f.y - age * 46, 26, f.color, 'center');
  }
  ctx.globalAlpha = 1;
  for (const p of world.particles) {
    const age = world.elapsed - p.born;
    ctx.globalAlpha = Math.max(0, 1 - age / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(10, 5, 3, 0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  text(ctx, 'NASI GORENG RUSH', CANVAS_WIDTH / 2, 220, 64, PALETTE.accent, 'center');
  text(ctx, 'a wok-station arcade cook  •  Warung Diboyy', CANVAS_WIDTH / 2, 268, 24, PALETTE.cream, 'center');
  drawFriedRiceMound(ctx, CANVAS_WIDTH / 2, 380, 1.6, false, true);
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath(); ctx.ellipse(CANVAS_WIDTH / 2, 392, 150, 40, 0, 0, Math.PI * 2); ctx.fill();
  drawFriedRiceMound(ctx, CANVAS_WIDTH / 2, 388, 1.6, false, true);
  text(ctx, 'Take rice, chop in the ingredients, fry it golden, plate it, serve it before the ticket runs out.', CANVAS_WIDTH / 2, 480, 20, PALETTE.cream, 'center');
  text(ctx, '3 missed orders ends the day  •  the day lasts 3 minutes  •  perfect fries build combos', CANVAS_WIDTH / 2, 512, 17, '#d9b98c', 'center');
  const blink = Math.floor(world.elapsed * 2) % 2 === 0;
  if (blink) text(ctx, 'CLICK OR PRESS ENTER TO OPEN THE WARUNG', CANVAS_WIDTH / 2, 580, 22, '#ffd94d', 'center');
  text(ctx, 'mouse + keys 1–6, W, P, T  •  M mutes', CANVAS_WIDTH / 2, 620, 15, '#8a6a4a', 'center');
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(10, 5, 3, 0.78)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const title = world.endReason === 'missed' ? 'THE WARUNG CLOSED EARLY' : 'CLOSING TIME!';
  text(ctx, title, CANVAS_WIDTH / 2, 200, 52, PALETTE.accent, 'center');
  text(ctx, world.endReason === 'missed'
    ? 'Three customers walked out hungry.'
    : 'The day is done — the wok is cooling.', CANVAS_WIDTH / 2, 248, 22, PALETTE.cream, 'center');
  text(ctx, `SCORE  ${world.score}`, CANVAS_WIDTH / 2, 330, 34, '#ffd94d', 'center');
  text(ctx, `Dishes served: ${world.served}    •    Coins earned: ${world.coins}    •    Best combo: x${world.bestCombo}`, CANVAS_WIDTH / 2, 380, 20, PALETTE.cream, 'center');
  const best = world.servedLog.slice(-3).reverse();
  if (best.length) {
    text(ctx, 'Last serves:', CANVAS_WIDTH / 2, 430, 16, '#d9b98c', 'center');
    best.forEach((s, i) => {
      text(ctx, `${RECIPE_BY_ID[s.recipeId].name}  +${s.points}  (combo x${s.combo})`, CANVAS_WIDTH / 2, 460 + i * 26, 16, PALETTE.cream, 'center');
    });
  }
  const rank = world.score >= 4000 ? '⭐ LEGENDARY COOK!' : world.score >= 2500 ? '⭐ HEAD CHEF!' : world.score >= 1200 ? 'Solid line cook.' : 'The wok forgives — try again!';
  text(ctx, rank, CANVAS_WIDTH / 2, 560, 24, PALETTE.good, 'center');
  const blink = Math.floor(world.elapsed * 2) % 2 === 0;
  if (blink) text(ctx, 'CLICK OR PRESS ENTER TO COOK AGAIN', CANVAS_WIDTH / 2, 620, 20, '#ffd94d', 'center');
}

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake * 8, (Math.random() - 0.5) * world.shake * 8);
  }
  drawWall(ctx, world);
  drawTopBar(ctx, world);
  drawOrderBoard(ctx, world);
  drawRiceCooker(ctx, world);
  drawCounter(ctx, world);
  drawWok(ctx, world);
  drawPlateStation(ctx, world);
  drawTrashAndServe(ctx, world);
  drawPanStatus(ctx, world);
  drawStatsStrip(ctx, world);
  drawMessage(ctx, world);
  drawFloats(ctx, world);
  if (world.phase === 'title') drawTitle(ctx, world);
  if (world.phase === 'over') drawGameOver(ctx, world);
  ctx.restore();
}
