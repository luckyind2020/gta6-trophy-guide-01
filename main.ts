// Leonida Legend — the handoff program for gta6-trophy-guide-01 (Node 22, stdlib only).
// The guide itself is plain static files under app/ (index.html, app.js, style.css, data/),
// and the screenshots live under screenshots/. This program gathers both into the
// grader's output directory and writes dossier.json there, using the kit's vendored
// make.fun library to build it — leave vendor/makefun-frontend.ts untouched, because
// the scorer rebuilds the dossier with its own copy and compares the two byte for byte.
//
// Run it locally with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the scorer's gate, so a build that passes here will not
// trip the gate for size: at most 4 screenshots of 256 KiB each, app/ within
// 993 files and 48 MiB, and the dossier text within 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
