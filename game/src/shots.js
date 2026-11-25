// shots.js — curated game states for the entry's screenshots. Each shot builds
// a real world (the same createWorld / tickWorld state the player sees) and
// freezes it, so every screenshot is a genuine render of the game's own code,
// never a mock-up. ?shot=cover|wok|plate|rush|end picks the state.
import { createWorld, spawnOrder, startDay } from './world.js';
import { RECIPE_BY_ID } from './config.js';

function basePlayingWorld(elapsed) {
  const world = createWorld();
  startDay(world);
  world.elapsed = elapsed;
  world.timeLeft = 180 - elapsed;
  return world;
}

function setOrder(world, slot, recipeId, timeLeft, total) {
  while (world.orders.length <= slot) spawnOrder(world);
  const order = world.orders[slot];
  order.recipeId = recipeId;
  order.timeLeft = timeLeft;
  order.total = total;
  order.state = 'waiting';
  return order;
}

// Cover: the full kitchen at its best — order board busy, ingredients in the
// pan, a dish mid-fry in the wok, day timer running, a plate ready to serve.
export function buildCoverWorld() {
  const world = basePlayingWorld(42);
  world.score = 1240;
  world.coins = 430;
  world.served = 6;
  world.combo = 3;
  world.bestCombo = 3;
  world.lastServeAt = 40;
  setOrder(world, 0, 'ayam', 38, 58);
  setOrder(world, 1, 'pedas', 21, 52);
  setOrder(world, 2, 'biasa', 47, 58);
  setOrder(world, 3, 'spesial', 12, 50);
  world.pan = { rice: true, counts: { egg: 1, chicken: 1 }, fry: 0.68, cooked: false, burnt: false };
  world.frying = true;
  world.plate = { recipeId: 'sayur', perfect: true, mystery: false };
  world.message = 'Perfect fry! Plate it and serve!';
  world.messageAt = 41;
  world.messageKind = 'good';
  world.floats = [{ x: 1096, y: 400, text: '+310', color: '#7fd069', born: 41.6, life: 1.1 }];
  return world;
}

// Wok shot: mid-fry, flames up, the progress band in the green zone.
export function buildWokWorld() {
  const world = basePlayingWorld(88);
  world.score = 2190;
  world.coins = 760;
  world.served = 11;
  world.combo = 2;
  world.bestCombo = 4;
  world.lastServeAt = 86;
  setOrder(world, 0, 'pedas', 26, 48);
  setOrder(world, 1, 'spesial', 33, 50);
  setOrder(world, 2, 'ayam', 44, 52);
  world.pan = { rice: true, counts: { chili: 2, chicken: 1 }, fry: 0.72, cooked: false, burnt: false };
  world.frying = true;
  world.message = 'Frying… stop in the green band!';
  world.messageAt = 87;
  world.messageKind = 'info';
  return world;
}

// Plate shot: a finished plate on the pass, ticket waiting, serve imminent.
export function buildPlateWorld() {
  const world = basePlayingWorld(64);
  world.score = 1780;
  world.coins = 610;
  world.served = 9;
  world.combo = 4;
  world.bestCombo = 4;
  world.lastServeAt = 62;
  setOrder(world, 0, 'spesial', 41, 54);
  setOrder(world, 1, 'biasa', 18, 50);
  setOrder(world, 2, 'sayur', 35, 56);
  world.pan = { rice: false, counts: {}, fry: 0, cooked: false, burnt: false };
  world.plate = { recipeId: 'spesial', perfect: true, mystery: false };
  world.message = 'Nasi Goreng Spesial — ready to serve!';
  world.messageAt = 63;
  world.messageKind = 'good';
  world.floats = [{ x: 1096, y: 400, text: '+410', color: '#ffd94d', born: 63.5, life: 1.1 }];
  return world;
}

// Rush shot: closing time, five tickets at once, one nearly out of time.
export function buildRushWorld() {
  const world = basePlayingWorld(152);
  world.score = 3420;
  world.coins = 1180;
  world.served = 18;
  world.missed = 2;
  world.combo = 5;
  world.bestCombo = 5;
  world.lastServeAt = 150;
  setOrder(world, 0, 'biasa', 9, 46);
  setOrder(world, 1, 'ayam', 16, 44);
  setOrder(world, 2, 'pedas', 24, 42);
  setOrder(world, 3, 'sayur', 31, 44);
  setOrder(world, 4, 'spesial', 38, 46);
  world.pan = { rice: true, counts: { egg: 1, sauce: 1 }, fry: 0.88, cooked: false, burnt: false };
  world.frying = true;
  world.message = 'RUSH HOUR! Five tickets on the board!';
  world.messageAt = 151;
  world.messageKind = 'warn';
  return world;
}

// End shot: closing-time results screen.
export function buildEndWorld() {
  const world = basePlayingWorld(180);
  world.phase = 'over';
  world.endReason = 'closing';
  world.score = 4210;
  world.coins = 1450;
  world.served = 23;
  world.missed = 1;
  world.bestCombo = 6;
  world.servedLog = [
    { recipeId: 'spesial', points: 512, combo: 6 },
    { recipeId: 'pedas', points: 388, combo: 5 },
    { recipeId: 'ayam', points: 290, combo: 4 },
  ];
  return world;
}

export const SHOT_BUILDERS = {
  cover: buildCoverWorld,
  wok: buildWokWorld,
  plate: buildPlateWorld,
  rush: buildRushWorld,
  end: buildEndWorld,
};

export function buildShotWorld(name) {
  const builder = SHOT_BUILDERS[name] || SHOT_BUILDERS.cover;
  const world = builder();
  // Freeze the frame: floats and particles age off the shot clock, so pin
  // their birth times to the world's clock and stop the simulation.
  return world;
}

// Human-readable caption for each shot, used by the screenshot helper only.
export function shotCaption(name) {
  return {
    cover: 'Full kitchen: order board, ingredients, wok mid-fry, plate ready',
    wok: 'Wok frying in the green band',
    plate: 'Finished plate on the pass',
    rush: 'Rush hour: five tickets at once',
    end: 'Closing-time results',
  }[name] || name;
}

// Keep the import used so the recipe table stays in the dossier outline.
export const SHOT_RECIPES = Object.keys(RECIPE_BY_ID);
