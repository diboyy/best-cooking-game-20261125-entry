// world.js — the whole game state and its rules: orders, the pan, the wok,
// plating, serving, combos, the day clock and game over. render.js only draws
// what this file owns; input.js only calls the actions exported here.
import {
  DAY_LENGTH_SECONDS,
  MAX_ACTIVE_ORDERS,
  MAX_MISSED_ORDERS,
  RECIPES,
  RECIPE_BY_ID,
  FRY_RATE,
  FRY_PERFECT_FROM,
  FRY_PERFECT_TO,
  FRY_BURNT_AT,
  COMBO_WINDOW_SECONDS,
  SCORE_TIME_BONUS_PER_SECOND_LEFT,
  spawnIntervalSeconds,
  orderLifetimeSeconds,
} from './config.js';

let nextOrderId = 1;

export function createWorld() {
  return {
    phase: 'title', // title | playing | over
    elapsed: 0, // seconds since the day started
    timeLeft: DAY_LENGTH_SECONDS,
    score: 0,
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    lastServeAt: -999,
    spawnIn: 1.2, // first customer walks in quickly
    orders: [], // {id, recipeId, timeLeft, total, state: 'waiting'|'served'|'expired'}
    pan: emptyPan(),
    plate: null, // {recipeId, perfect, quality} once plated, else null
    frying: false,
    message: '',
    messageAt: -999,
    messageKind: 'info',
    floats: [], // {x, y, text, color, born, life}
    particles: [], // {x, y, vx, vy, color, born, life, size}
    shake: 0,
    servedLog: [],
    muted: false,
  };
}

export function emptyPan() {
  return { rice: false, counts: {}, fry: 0, cooked: false, burnt: false };
}

export function panIngredientCount(pan, id) {
  return pan.counts[id] || 0;
}

export function panTotalIngredients(pan) {
  return Object.values(pan.counts).reduce((a, b) => a + b, 0);
}

// Does the pan hold exactly the recipe's ingredients (plus rice)?
export function panMatchesRecipe(pan, recipe) {
  if (!pan.rice) return false;
  const ids = new Set([...Object.keys(pan.counts), ...Object.keys(recipe.needs)]);
  for (const id of ids) {
    if ((pan.counts[id] || 0) !== (recipe.needs[id] || 0)) return false;
  }
  return true;
}

export function findMatchingRecipe(pan) {
  if (!pan.rice || !pan.cooked || pan.burnt) return null;
  return RECIPES.find((r) => panMatchesRecipe(pan, r)) || null;
}

function showMessage(world, text, kind = 'info') {
  world.message = text;
  world.messageAt = world.elapsed;
  world.messageKind = kind;
}

export function addFloat(world, x, y, text, color) {
  world.floats.push({ x, y, text, color, born: world.elapsed, life: 1.1 });
}

export function addBurst(world, x, y, color, n = 14, speed = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
      color, born: world.elapsed, life: 0.6 + Math.random() * 0.4, size: 3 + Math.random() * 4,
    });
  }
}

function pickRecipeId(world) {
  // Early day: simple recipes only. Spesial and Pedas join once the kitchen warms up.
  const pool = world.elapsed < 45
    ? ['biasa', 'ayam', 'sayur']
    : world.elapsed < 100
      ? ['biasa', 'ayam', 'sayur', 'pedas']
      : RECIPES.map((r) => r.id);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function spawnOrder(world) {
  const recipeId = pickRecipeId(world);
  const lifetime = orderLifetimeSeconds(world.elapsed);
  world.orders.push({
    id: nextOrderId++,
    recipeId,
    timeLeft: lifetime,
    total: lifetime,
    state: 'waiting',
  });
}

export function startDay(world) {
  const fresh = createWorld();
  Object.assign(world, fresh, { phase: 'playing' });
  spawnOrder(world);
  spawnOrder(world);
}

function endDay(world, reason) {
  world.phase = 'over';
  world.endReason = reason;
}

// --- Player actions (called by input.js) -----------------------------------

export function takeRice(world) {
  if (world.phase !== 'playing') return 'idle';
  if (world.pan.rice) return 'denied';
  if (world.frying) return 'denied';
  world.pan.rice = true;
  addBurst(world, 131, 380, '#fff8e7', 10, 70);
  return 'rice';
}

export function addIngredient(world, id) {
  if (world.phase !== 'playing') return 'idle';
  if (!world.pan.rice) {
    showMessage(world, 'Take rice first! [1]', 'warn');
    return 'denied';
  }
  if (world.frying || world.pan.cooked || world.pan.burnt) {
    showMessage(world, 'Too late — it is already in the wok!', 'warn');
    return 'denied';
  }
  if (panTotalIngredients(world.pan) >= 6) {
    showMessage(world, 'The pan is full — fry it or trash it.', 'warn');
    return 'denied';
  }
  world.pan.counts[id] = (world.pan.counts[id] || 0) + 1;
  return 'chop';
}

export function toggleWok(world) {
  if (world.phase !== 'playing') return 'idle';
  if (world.frying) return stopFrying(world);
  if (!world.pan.rice) {
    showMessage(world, 'The wok is empty — take rice first! [1]', 'warn');
    return 'denied';
  }
  if (world.pan.cooked) {
    showMessage(world, 'Already cooked — plate it! [P]', 'warn');
    return 'denied';
  }
  if (world.pan.burnt) {
    showMessage(world, 'Burnt! Trash it [T] and start over.', 'bad');
    return 'denied';
  }
  world.frying = true;
  return 'sizzle';
}

function stopFrying(world) {
  world.frying = false;
  if (world.pan.fry >= FRY_BURNT_AT) {
    world.pan.burnt = true;
    showMessage(world, 'Burnt to a crisp!', 'bad');
    return 'burnt';
  }
  world.pan.cooked = true;
  const perfect = world.pan.fry >= FRY_PERFECT_FROM && world.pan.fry <= FRY_PERFECT_TO;
  world.pan.perfect = perfect;
  if (perfect) showMessage(world, 'Perfect fry!', 'good');
  else if (world.pan.fry < FRY_PERFECT_FROM) showMessage(world, 'Undercooked — still edible, but plain.', 'warn');
  return perfect ? 'perfect-fry' : 'cooked';
}

export function plateDish(world) {
  if (world.phase !== 'playing') return 'idle';
  if (world.plate) {
    showMessage(world, 'The plate is already full — serve it first!', 'warn');
    return 'denied';
  }
  if (!world.pan.cooked || world.pan.burnt) {
    showMessage(world, 'Nothing cooked to plate yet.', 'warn');
    return 'denied';
  }
  const recipe = findMatchingRecipe(world.pan);
  world.plate = {
    recipeId: recipe ? recipe.id : null,
    perfect: !!world.pan.perfect,
    mystery: !recipe,
  };
  world.pan = emptyPan();
  // Auto-serve the moment a matching ticket is waiting — the rush never waits.
  const served = tryAutoServe(world);
  return served ? 'served' : 'plate';
}

export function trashPan(world) {
  if (world.phase !== 'playing') return 'idle';
  if (world.frying) world.frying = false;
  const hadSomething = world.pan.rice || panTotalIngredients(world.pan) > 0 || world.plate;
  world.pan = emptyPan();
  world.plate = null;
  if (hadSomething) showMessage(world, 'Trashed. Fresh pan!', 'info');
  return hadSomething ? 'trash' : 'idle';
}

// Serve the plated dish to the matching ticket. Returns the serve result.
export function tryAutoServe(world) {
  if (!world.plate || !world.plate.recipeId) return false;
  const idx = world.orders.findIndex((o) => o.state === 'waiting' && o.recipeId === world.plate.recipeId);
  if (idx === -1) {
    showMessage(world, 'No ticket wants this dish — trash it or wait for an order.', 'warn');
    return false;
  }
  const order = world.orders[idx];
  const recipe = RECIPE_BY_ID[order.recipeId];
  const timeBonus = Math.round(order.timeLeft * SCORE_TIME_BONUS_PER_SECOND_LEFT);
  const inComboWindow = world.elapsed - world.lastServeAt <= COMBO_WINDOW_SECONDS;
  world.combo = inComboWindow ? world.combo + 1 : 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.lastServeAt = world.elapsed;
  const comboMult = 1 + 0.25 * (world.combo - 1);
  const points = Math.round((recipe.price + timeBonus) * comboMult);
  const perfectBonus = world.plate.perfect ? 50 : 0;
  world.score += points + perfectBonus;
  world.coins += recipe.price + (world.plate.perfect ? 20 : 0);
  world.served += 1;
  order.state = 'served';
  world.orders.splice(idx, 1);
  world.servedLog.push({ recipeId: recipe.id, points: points + perfectBonus, combo: world.combo });
  addFloat(world, 1096, 430, `+${points + perfectBonus}`, world.plate.perfect ? '#ffd94d' : '#7fd069');
  addBurst(world, 1096, 420, '#ffd94d', 18, 160);
  if (world.plate.perfect && world.combo >= 2) {
    showMessage(world, `PERFECT x${world.combo} COMBO! +${points + perfectBonus}`, 'good');
  } else if (world.plate.perfect) {
    showMessage(world, `Perfect serve! +${points + perfectBonus}`, 'good');
  } else {
    showMessage(world, `Served ${recipe.name}! +${points + perfectBonus}`, 'good');
  }
  world.plate = null;
  world.shake = 0;
  return true;
}

// --- Simulation -------------------------------------------------------------

export function tickWorld(world, dt) {
  // Particles and floats always age, even on the title screen.
  world.floats = world.floats.filter((f) => world.elapsed - f.born < f.life);
  world.particles = world.particles.filter((p) => world.elapsed - p.born < p.life);
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 3);

  if (world.phase !== 'playing') return;

  world.elapsed += dt;
  world.timeLeft = Math.max(0, DAY_LENGTH_SECONDS - world.elapsed);

  // Frying advances while the pan sits on the wok.
  if (world.frying) {
    world.pan.fry = Math.min(1.15, world.pan.fry + FRY_RATE * dt);
    if (Math.random() < dt * 8) {
      addBurst(world, 799, 360, '#ffb020', 2, 60);
    }
    if (world.pan.fry >= FRY_BURNT_AT && !world.pan.burnt) {
      world.pan.burnt = true;
      world.frying = false;
      showMessage(world, 'It burnt! Trash it [T].', 'bad');
    }
  }

  // New customers walk in.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0 && world.orders.length < MAX_ACTIVE_ORDERS) {
    spawnOrder(world);
    world.spawnIn = spawnIntervalSeconds(world.elapsed) * (0.85 + Math.random() * 0.3);
  }

  // Order timers run down; an expired ticket is a missed order.
  for (const order of world.orders) {
    if (order.state !== 'waiting') continue;
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) {
      order.state = 'expired';
      world.missed += 1;
      world.combo = 0;
      world.shake = 1;
      showMessage(world, `Too slow — a ${RECIPE_BY_ID[order.recipeId].name} walked out!`, 'bad');
      if (world.missed >= MAX_MISSED_ORDERS) {
        world.orders = world.orders.filter((o) => o.state === 'waiting');
        endDay(world, 'missed');
        return;
      }
    }
  }
  world.orders = world.orders.filter((o) => o.state === 'waiting');

  if (world.timeLeft <= 0) {
    endDay(world, 'closing');
  }
}

export function dayProgress(world) {
  return Math.min(1, world.elapsed / DAY_LENGTH_SECONDS);
}

export function rushLevel(world) {
  // 0 = calm open, 1 = closing-time rush. Drives the "RUSH HOUR" banner.
  return Math.min(1, world.elapsed / DAY_LENGTH_SECONDS);
}
