// config.js — every constant that shapes Nasi Goreng Rush: canvas size, palette,
// station layout, ingredients, recipes and difficulty tuning. No logic lives here;
// world.js reads these values and render.js draws them.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const DAY_LENGTH_SECONDS = 180;
export const MAX_MISSED_ORDERS = 3;
export const MAX_ACTIVE_ORDERS = 5;

// Warm night-kitchen palette. Dark wood, hot wok orange, cream paper tickets.
export const PALETTE = {
  wallTop: '#2b1a12',
  wallBottom: '#1a0f0a',
  floor: '#3a2418',
  counterTop: '#7a4a2b',
  counterFront: '#5d3620',
  counterEdge: '#a06a3f',
  board: '#241610',
  boardEdge: '#8a5a33',
  ticket: '#fff3d6',
  ticketEdge: '#d9b36c',
  ink: '#2e1c10',
  accent: '#ff8c2e',
  accentHot: '#ff5a1f',
  good: '#7fd069',
  warn: '#ffc53d',
  bad: '#ff4d3d',
  cream: '#fff8e7',
  wokIron: '#3c3c46',
  flame: '#ffb020',
};

export const INGREDIENTS = [
  { id: 'egg', name: 'Telur', key: '2', color: '#ffe9a8', dot: '#f7c948' },
  { id: 'chicken', name: 'Ayam', key: '3', color: '#f2b28c', dot: '#d97b4f' },
  { id: 'veg', name: 'Sayur', key: '4', color: '#9ed67a', dot: '#4caf50' },
  { id: 'sauce', name: 'Kecap', key: '5', color: '#8a5a2b', dot: '#5d3a17' },
  { id: 'chili', name: 'Cabai', key: '6', color: '#ff6b5e', dot: '#e53935' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// A recipe is rice plus a multiset of ingredients. The pan must hold exactly
// these counts (extra ingredients spoil the dish) before the wok can cook it.
export const RECIPES = [
  {
    id: 'biasa',
    name: 'Nasi Goreng Biasa',
    short: 'Biasa',
    needs: { egg: 1, sauce: 1 },
    price: 120,
    color: '#f7c948',
  },
  {
    id: 'ayam',
    name: 'Nasi Goreng Ayam',
    short: 'Ayam',
    needs: { chicken: 1, sauce: 1 },
    price: 150,
    color: '#f2b28c',
  },
  {
    id: 'sayur',
    name: 'Nasi Goreng Sayur',
    short: 'Sayur',
    needs: { veg: 1, egg: 1 },
    price: 140,
    color: '#9ed67a',
  },
  {
    id: 'pedas',
    name: 'Nasi Goreng Pedas',
    short: 'Pedas',
    needs: { chili: 2, chicken: 1 },
    price: 180,
    color: '#ff6b5e',
  },
  {
    id: 'spesial',
    name: 'Nasi Goreng Spesial',
    short: 'Spesial',
    needs: { egg: 1, chicken: 1, veg: 1, sauce: 1 },
    price: 240,
    color: '#ff8c2e',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// Station rectangles on the 1280x720 canvas. input.js hit-tests these;
// render.js draws them. One source of truth for both.
export const STATIONS = {
  rice: { x: 36, y: 300, w: 190, h: 190, label: 'Rice Cooker', hint: 'click / [1]' },
  counter: { x: 250, y: 300, w: 400, h: 190, label: 'Ingredient Counter', hint: 'click a bin / [2-6]' },
  wok: { x: 674, y: 300, w: 250, h: 190, label: 'Wok', hint: 'click / [W] to fry' },
  plate: { x: 948, y: 300, w: 296, h: 190, label: 'Plating', hint: 'click / [P] to plate' },
  trash: { x: 36, y: 520, w: 120, h: 90, label: 'Trash', hint: '[T]' },
  serve: { x: 948, y: 520, w: 296, h: 90, label: 'Serve Window', hint: 'auto-serves a match' },
};

// Ingredient bins sit inside the counter station, five across.
export const BIN_WIDTH = 72;
export const BIN_GAP = 6;
export function binRect(index) {
  const total = INGREDIENTS.length * BIN_WIDTH + (INGREDIENTS.length - 1) * BIN_GAP;
  const x0 = STATIONS.counter.x + (STATIONS.counter.w - total) / 2;
  return { x: x0 + index * (BIN_WIDTH + BIN_GAP), y: STATIONS.counter.y + 52, w: BIN_WIDTH, h: 96 };
}

export const ORDER_BOARD = { x: 36, y: 76, w: 1208, h: 196 };
export const TICKET_WIDTH = 224;
export const TICKET_GAP = 14;

// Difficulty: orders arrive faster and live shorter as the day goes on.
export function spawnIntervalSeconds(elapsed) {
  const t = Math.min(1, elapsed / DAY_LENGTH_SECONDS);
  return 15 - 8 * t; // 15s at open, 7s by closing
}
export function orderLifetimeSeconds(elapsed) {
  const t = Math.min(1, elapsed / DAY_LENGTH_SECONDS);
  return 62 - 22 * t; // 62s at open, 40s by closing
}

// Frying: the pan cooks while on the wok. Stop inside the green band for a
// perfect fry; let it run past the red line and the dish burns.
export const FRY_RATE = 0.28; // progress per second on the wok (~2s to the green band)
export const FRY_PERFECT_FROM = 0.55;
export const FRY_PERFECT_TO = 0.92;
export const FRY_BURNT_AT = 1.0;

export const COMBO_WINDOW_SECONDS = 12;
export const SCORE_TIME_BONUS_PER_SECOND_LEFT = 2;
