// main.ts — hands Nasi Goreng Rush in to make.fun (Node 22, stdlib only).
//
// The game is plain static files under game/ (index.html plus ES modules in
// game/src, no libraries, no network requests), and screenshots/ holds four
// real renders of the game taken in a headless browser during the build.
// This program copies both trees beside this file into /output and writes
// /output/dossier.json with buildDossier from the vendored make.fun library.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice: both runs must write identical bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer refuses more than four screenshots or one over 256 KiB, so
// check our own screenshots first and fail loudly instead of handing in
// an entry the scorer would reject.
const shotsDir = join(here, 'screenshots');
const shotNames = existsSync(shotsDir) ? readdirSync(shotsDir).sort() : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}

const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing — nothing playable to hand in');
}
const gameFiles = readdirSync(gameDir);
if (gameFiles.length === 0) throw new Error('game/ is empty');

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`handed in: game/ (${gameFiles.length} top-level entries) + ${shotNames.length} screenshots -> ${out}`);
